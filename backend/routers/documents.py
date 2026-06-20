import asyncio

from fastapi import APIRouter, File, Form, UploadFile

from services import document_service

router = APIRouter()


@router.post("/validate-documents")
async def validate_documents(
    cnpj: str = Form(default=""),
    razao_social: str = Form(default=""),
    context: str = Form(default=""),
    documents: list[UploadFile] = File(default=[]),
):
    if not documents:
        return {"documents": []}

    files = [(f.filename or f"arquivo_{i}", await f.read()) for i, f in enumerate(documents)]

    results = await document_service.analyze_documents(
        files=files,
        cnpj=cnpj,
        razao_social=razao_social,
        context=context,
    )

    return {"documents": results}
