from typing import Literal
from pydantic import BaseModel


class DimensionScore(BaseModel):
    id: str
    label: str
    score: float
    max_score: float
    detail: str


class HardGate(BaseModel):
    id: str
    label: str
    triggered: bool
    multiplier: float
    detail: str


class RedFlag(BaseModel):
    severity: Literal["critical", "warning", "info"]
    message: str
    source: str


class DocumentRedFlag(BaseModel):
    severity: Literal["critical", "warning", "info"]
    message: str
    source: str


class DocumentAnalysis(BaseModel):
    file_name: str
    tipo: str
    resumo: str
    insights: list[str]
    red_flags: list[DocumentRedFlag]
    confiabilidade: int
    compatibilidade: int
    score_documento: int


class AnalyzeResponse(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: str
    situacao_cadastral: str
    uf: str
    municipio: str
    cnae: str
    cnae_descricao: str
    porte: str
    data_abertura_atividade: str
    score_formula: float
    score_ia: float
    dimensions: list[DimensionScore]
    hard_gates: list[HardGate]
    red_flags: list[RedFlag]
    parecer_ia: str
    conflito_cnae: str | None
    fontes_dados: list[str]
    documents: list[DocumentAnalysis] = []
