import io
import json
import os

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


def extract_text(filename: str, content: bytes) -> str:
    """Extrai texto de PDF ou arquivo de texto."""
    name_lower = filename.lower()

    if name_lower.endswith(".pdf"):
        return _extract_pdf(content)

    # tenta decodificar como texto
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            return content.decode(enc)
        except UnicodeDecodeError:
            continue

    return ""


def _extract_pdf(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n".join(parts)
    except Exception:
        return ""


async def analyze_documents(
    files: list[tuple[str, bytes]],
    cnpj: str,
    razao_social: str,
    context: str,
) -> list[dict]:
    results = []
    for filename, content in files:
        text = extract_text(filename, content)
        if not text.strip():
            await log_service.warning(
                "document_service", "extract_text",
                f"Sem texto extraído de '{filename}' ({len(content)} bytes)",
            )
            results.append(_fallback(filename, "Não foi possível extrair texto do documento"))
            continue

        analysis = await _analyze_single(filename, text[:4000], cnpj, razao_social, context)
        results.append(analysis)

    return results


async def _analyze_single(
    filename: str,
    text: str,
    cnpj: str,
    razao_social: str,
    context: str,
) -> dict:
    prompt = f"""Você é um analista de conformidade corporativa. Analise o documento abaixo e retorne um JSON.

=== EMPRESA ANALISADA ===
Razão Social: {razao_social}
CNPJ: {cnpj}

=== CONTEXTO DA CONTRATAÇÃO ===
{context or "Não informado"}

=== DOCUMENTO: {filename} ===
{text}

=== INSTRUÇÕES ===
Retorne JSON com:
- tipo: tipo do documento (ex: "Contrato de Prestação de Serviços", "Balanço Patrimonial", "Certidão Negativa de Débitos", "Proposta Comercial", etc.)
- resumo: 1-2 frases descrevendo o conteúdo principal do documento
- insights: lista de 3 a 5 pontos relevantes encontrados (strings)
- red_flags: lista de problemas ou inconsistências (cada item: {{"severity": "critical"|"warning"|"info", "message": "...", "source": "Documento — {filename}"}})
- confiabilidade: 0-100 (qualidade e consistência interna do documento)
- compatibilidade: 0-100 (coerência com a empresa analisada e o contexto da contratação)
- score_documento: 0-100 (avaliação geral de risco documental — considera confiabilidade, compatibilidade, presença de cláusulas problemáticas e ausência de itens esperados para este tipo de documento)

Responda APENAS com JSON válido, sem markdown:
{{"tipo": "...", "resumo": "...", "insights": [], "red_flags": [], "confiabilidade": 0, "compatibilidade": 0, "score_documento": 0}}"""

    try:
        response = await _get_client().chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=700,
        )
        content = response.choices[0].message.content or ""
        return _parse(filename, content)
    except Exception as exc:
        await log_service.error("document_service", f"analyze:{filename}", exc)
        return _fallback(filename, f"Erro na análise: {exc}")


def _parse(filename: str, content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = [l for l in cleaned.split("\n") if not l.startswith("```")]
        cleaned = "\n".join(lines)

    try:
        parsed = json.loads(cleaned)
        return {
            "fileName": filename,
            "tipo": str(parsed.get("tipo", "Documento")),
            "resumo": str(parsed.get("resumo", "")),
            "insights": [str(i) for i in parsed.get("insights", [])],
            "redFlags": [
                {
                    "severity": r.get("severity", "info"),
                    "message": str(r.get("message", "")),
                    "source": str(r.get("source", f"Documento — {filename}")),
                }
                for r in parsed.get("red_flags", [])
            ],
            "confiabilidade": int(parsed.get("confiabilidade", 50)),
            "compatibilidade": int(parsed.get("compatibilidade", 50)),
            "scoreDocumento": int(parsed.get("score_documento", 50)),
        }
    except (json.JSONDecodeError, KeyError, ValueError):
        return _fallback(filename, content[:200])


def _fallback(filename: str, detail: str) -> dict:
    return {
        "fileName": filename,
        "tipo": "Documento",
        "resumo": detail,
        "insights": [],
        "redFlags": [],
        "confiabilidade": 0,
        "compatibilidade": 0,
        "scoreDocumento": 0,
    }
