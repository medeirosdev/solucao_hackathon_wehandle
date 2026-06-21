"""Rastreia consumo de tokens e custo das chamadas à API DeepSeek."""
from datetime import datetime, timezone

from db.connection import get_db

# Preços DeepSeek-V3 (deepseek-chat) em dólares por token
_PRICES: dict[str, dict[str, float]] = {
    "deepseek-chat": {
        "input":  0.27 / 1_000_000,   # $0.27 / 1M tokens
        "output": 1.10 / 1_000_000,   # $1.10 / 1M tokens
    },
}


def calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    p = _PRICES.get(model, _PRICES["deepseek-chat"])
    return prompt_tokens * p["input"] + completion_tokens * p["output"]


async def record(
    service: str,
    operation: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cnpj: str = "",
) -> float:
    """Grava uma chamada de API e retorna o custo calculado em USD."""
    cost = calc_cost(model, prompt_tokens, completion_tokens)
    ts   = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    try:
        async with get_db() as db:
            await db.execute(
                """INSERT INTO usage
                   (ts, service, operation, cnpj, model,
                    prompt_tokens, completion_tokens, total_tokens, cost_usd)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (ts, service, operation, cnpj or "", model,
                 prompt_tokens, completion_tokens,
                 prompt_tokens + completion_tokens, cost),
            )
            await db.commit()
    except Exception:
        pass  # nunca bloqueia o fluxo principal
    return cost


async def get_stats() -> dict:
    async with get_db() as db:
        # totais gerais
        cur = await db.execute(
            "SELECT COUNT(*) calls, SUM(prompt_tokens) pt, "
            "SUM(completion_tokens) ct, SUM(total_tokens) tt, SUM(cost_usd) cost "
            "FROM usage"
        )
        row = dict(await cur.fetchone())

        # por serviço
        cur = await db.execute(
            "SELECT service, COUNT(*) calls, SUM(total_tokens) tokens, SUM(cost_usd) cost "
            "FROM usage GROUP BY service ORDER BY cost DESC"
        )
        by_service = [dict(r) for r in await cur.fetchall()]

        # por dia (últimos 30 dias)
        cur = await db.execute(
            "SELECT substr(ts,1,10) day, COUNT(*) calls, "
            "SUM(total_tokens) tokens, SUM(cost_usd) cost "
            "FROM usage WHERE ts >= datetime('now','-30 days') "
            "GROUP BY day ORDER BY day"
        )
        by_day = [dict(r) for r in await cur.fetchall()]

        return {
            "total_calls":             row["calls"] or 0,
            "total_prompt_tokens":     row["pt"]    or 0,
            "total_completion_tokens": row["ct"]    or 0,
            "total_tokens":            row["tt"]    or 0,
            "total_cost_usd":          round(row["cost"] or 0, 8),
            "by_service":              by_service,
            "by_day":                  by_day,
            "prices":                  _PRICES.get("deepseek-chat", {}),
        }


async def get_history(limit: int = 100) -> list[dict]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM usage ORDER BY ts DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in await cur.fetchall()]
