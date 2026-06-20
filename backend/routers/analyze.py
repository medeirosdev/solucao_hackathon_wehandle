import asyncio
import json

from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from models.request import AnalyzeRequest, DimensionWeight
from models.response import AnalyzeResponse, DocumentAnalysis, DocumentRedFlag
from services import cnpj_service, score_service, ai_service, transparency_service, document_service

router = APIRouter()

_PORTE_LABELS = {
    "00": "Não informado",
    "01": "Micro Empresa (ME)",
    "03": "Empresa de Pequeno Porte (EPP)",
    "05": "Demais (Médio/Grande)",
    "": "Não informado",
}

_SITUACAO_LABELS = {
    "01": "01 - Nula",
    "02": "02 - Ativa",
    "03": "03 - Suspensa",
    "04": "04 - Inapta",
    "08": "08 - Baixada",
}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_company(
    data: str = Form(...),
    documents: list[UploadFile] = File(default=[]),
):
    try:
        raw = json.loads(data)
        request = AnalyzeRequest(
            cnpj=raw["cnpj"],
            context=raw.get("context", ""),
            weights=[DimensionWeight(**w) for w in raw.get("weights", [])],
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    cnpj = request.cnpj

    # Busca paralela: dados CNPJ + checagens externas
    company_data, ceis_result, cnep_result, lista_suja_result = await asyncio.gather(
        cnpj_service.get_company_data(cnpj),
        transparency_service.check_ceis(cnpj),
        transparency_service.check_cnep(cnpj),
        transparency_service.check_lista_suja(cnpj),
    )

    empresa_encontrada = bool(company_data.get("razao_social") or company_data.get("situacao_cadastral"))
    if not empresa_encontrada:
        raise HTTPException(status_code=404, detail="CNPJ não encontrado na base da Receita Federal")

    gates_ext = {
        "ceis": ceis_result,
        "cnep": cnep_result,
        "lista_suja": lista_suja_result,
    }

    score_result = score_service.calculate(company_data, request.weights, gates_ext)

    doc_files = [(f.filename or f"arquivo_{i}", await f.read()) for i, f in enumerate(documents)] if documents else []
    doc_bytes = [content for _, content in doc_files]

    ai_result, doc_analyses = await asyncio.gather(
        ai_service.analyze(company_data, request.context, score_result["score_formula"], doc_bytes),
        document_service.analyze_documents(
            files=doc_files,
            cnpj=cnpj,
            razao_social=company_data.get("razao_social", ""),
            context=request.context,
        ),
    )

    fontes = ["Receita Federal"]
    if ceis_result.get("triggered") or cnep_result.get("triggered"):
        fontes.append("Portal da Transparência")
    elif ceis_result.get("detail") != "CEIS indisponível":
        fontes.append("Portal da Transparência")
    if lista_suja_result.get("detail") != "Lista Suja MTE indisponível":
        fontes.append("MTE — Lista Suja")

    response = AnalyzeResponse(
        cnpj=cnpj,
        razao_social=company_data.get("razao_social") or "Não informado",
        nome_fantasia=company_data.get("nome_fantasia") or "",
        situacao_cadastral=_SITUACAO_LABELS.get(
            company_data.get("situacao_cadastral", ""), company_data.get("situacao_cadastral", "")
        ),
        uf=company_data.get("uf") or "",
        municipio=company_data.get("municipio_descricao") or company_data.get("municipio") or "",
        cnae=company_data.get("cnae_fiscal_principal") or "",
        cnae_descricao=company_data.get("cnae_descricao") or "",
        porte=_PORTE_LABELS.get(company_data.get("porte_empresa", ""), "Não informado"),
        data_abertura_atividade=company_data.get("data_inicio_atividade") or "",
        score_formula=score_result["score_formula"],
        score_ia=ai_result["score_ia"],
        dimensions=score_result["dimensions"],
        hard_gates=score_result["hard_gates"],
        red_flags=score_result["red_flags"],
        parecer_ia=ai_result["parecer_ia"],
        conflito_cnae=ai_result.get("conflito_cnae"),
        fontes_dados=list(dict.fromkeys(fontes)),
        documents=[
            _to_doc_model(d) for d in doc_analyses
        ],
    )

    return response


def _to_doc_model(d: dict) -> DocumentAnalysis:
    return DocumentAnalysis(
        file_name=d.get("fileName", ""),
        tipo=d.get("tipo", "Documento"),
        resumo=d.get("resumo", ""),
        insights=d.get("insights", []),
        red_flags=[
            DocumentRedFlag(
                severity=r.get("severity", "info"),
                message=r.get("message", ""),
                source=r.get("source", ""),
            )
            for r in d.get("redFlags", [])
        ],
        confiabilidade=d.get("confiabilidade", 0),
        compatibilidade=d.get("compatibilidade", 0),
        score_documento=d.get("scoreDocumento", 0),
    )
