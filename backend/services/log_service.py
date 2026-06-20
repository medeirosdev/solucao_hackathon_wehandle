import os
import traceback as tb
from datetime import datetime, timezone

import aiosqlite

_db_path: str = os.getenv("DB_PATH", "./cnpj.db")


async def error(service: str, operation: str, exc: Exception, cnpj: str = "") -> None:
    await _write("error", service, operation, str(exc), cnpj, tb.format_exc())


async def warning(service: str, operation: str, message: str, cnpj: str = "") -> None:
    await _write("warning", service, operation, message, cnpj, None)


async def info(service: str, operation: str, message: str, cnpj: str = "") -> None:
    await _write("info", service, operation, message, cnpj, None)


async def get_logs(level: str | None = None, limit: int = 100) -> list[dict]:
    async with aiosqlite.connect(_db_path) as db:
        db.row_factory = aiosqlite.Row
        if level:
            cursor = await db.execute(
                "SELECT * FROM logs WHERE level = ? ORDER BY ts DESC LIMIT ?",
                (level, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM logs ORDER BY ts DESC LIMIT ?", (limit,)
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def _write(
    level: str,
    service: str,
    operation: str,
    message: str,
    cnpj: str,
    traceback: str | None,
) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    try:
        async with aiosqlite.connect(_db_path) as db:
            await db.execute(
                """
                INSERT INTO logs (ts, level, service, operation, cnpj, message, traceback)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (ts, level, service, operation, cnpj or None, message, traceback),
            )
            await db.commit()
    except Exception:
        pass  # logging nunca deve derrubar a aplicação
