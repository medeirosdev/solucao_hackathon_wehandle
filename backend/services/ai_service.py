import json
import os
from datetime import datetime, date

from openai import AsyncOpenAI
from services import log_service

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY", ""),
            base_url="https://api.deepseek.com",
            timeout=30.0,
        )
    return _client


async def analyze(data: dict, context: str, score_formula: float, docs: list) -> dict:
    prompt = _build_prompt(data, context, score_formula, docs)

    try:
        response = await _get_client().chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=512,
        )
        content = response.choices[0].message.content or ""
        return _parse_response(content)
    except Exception as exc:
        cnpj = data.get("cnpj_basico", "")
        await log_service.error("ai_service", "analyze", exc, cnpj)
        return {
            "score_ia": score_formula,
            "parecer_ia": f"Análise de IA indisponível: {exc}",
            "conflito_cnae": None,
        }


def _build_prompt(data: dict, context: str, score_formula: float, docs: list) -> str:
    razao = data.get("razao_social", "Não informado")
    cnpj = data.get("cnpj_basico", "")
    situacao = data.get("situacao_cadastral", "")
    cnae_cod = data.get("cnae_fiscal_principal", "")
    cnae_desc = data.get("cnae_descricao", "")
    cnae_sec = data.get("cnae_fiscal_secundaria", "")
    porte = data.get("porte_empresa", "")
    capital = data.get("capital_social", "0")
    municipio = data.get("municipio_descricao") or data.get("municipio", "")
    uf = data.get("uf", "")
    data_inicio = data.get("data_inicio_atividade", "")
    sit_especial = data.get("situacao_especial", "") or "Nenhuma"

    anos_str = ""
    if data_inicio and data_inicio != "00000000":
        try:
            dt = datetime.strptime(data_inicio, "%Y%m%d").date()
            anos = (date.today() - dt).days / 365.25
            anos_str = f"{anos:.1f} anos de mercado"
        except ValueError:
            pass

    socios_list = data.get("socios", [])
    socios_str = ""
    for s in socios_list[:5]:
        nome = s.get("nome_socio", "Não informado")
        tipo = {"1": "PJ", "2": "PF", "3": "Estrangeiro"}.get(s.get("identificador_socio", ""), "?")
        socios_str += f"  - {nome} ({tipo})\n"
    if not socios_str:
        socios_str = "  - Nenhum sócio localizado\n"

    simples = data.get("simples", {})
    if simples:
        if simples.get("opcao_pelo_mei") == "S":
            simples_status = "MEI ativo"
        elif simples.get("opcao_pelo_simples") == "S":
            simples_status = "Simples Nacional ativo"
        elif simples.get("data_exclusao_simples"):
            simples_status = "Excluído do Simples"
        else:
            simples_status = "Não optante"
    else:
        simples_status = "Sem registro"

    docs_info = ""
    if docs:
        docs_info = f"\n=== DOCUMENTOS ENVIADOS ===\n{len(docs)} documento(s) anexado(s) pelo analista.\n"

    return f"""Você é um analista de conformidade corporativa. Analise a empresa abaixo \
e retorne um JSON com os campos: score_ia (0-100), parecer (texto curto em português, máx 3 frases), \
conflito_cnae (string ou null).

=== DADOS DA EMPRESA ===
Razão Social: {razao}
CNPJ (basico): {cnpj}
Situação Cadastral: {situacao}
CNAE Principal: {cnae_cod} — {cnae_desc}
CNAEs Secundários: {cnae_sec or "Nenhum"}
Porte: {porte} | Capital Social: R$ {capital}
Município: {municipio} — {uf}
Abertura: {data_inicio} ({anos_str})
Sócios:
{socios_str}Simples Nacional: {simples_status}
Situação Especial: {sit_especial}
Score Analítico (fórmula): {score_formula}/100
{docs_info}
=== CONTEXTO DA CONTRATAÇÃO ===
{context or "Nenhum contexto informado"}

=== INSTRUÇÕES ===
- score_ia: avalie aderência do perfil da empresa ao contexto da contratação, \
considerando CNAE, porte, tempo de mercado e quaisquer inconsistências
- parecer: 2–3 frases explicando o raciocínio
- conflito_cnae: se o CNAE da empresa conflita com o contexto, descreva o \
conflito em 1 frase; caso contrário retorne null

Responda APENAS com JSON válido, sem markdown:
{{"score_ia": 0, "parecer": "...", "conflito_cnae": null}}"""


def _parse_response(content: str) -> dict:
    # remove possível bloco markdown
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        cleaned = "\n".join(lines)

    try:
        parsed = json.loads(cleaned)
        return {
            "score_ia": float(parsed.get("score_ia", 50)),
            "parecer_ia": str(parsed.get("parecer", "")),
            "conflito_cnae": parsed.get("conflito_cnae") or None,
        }
    except (json.JSONDecodeError, KeyError, ValueError):
        return {
            "score_ia": 50.0,
            "parecer_ia": content[:500],
            "conflito_cnae": None,
        }
