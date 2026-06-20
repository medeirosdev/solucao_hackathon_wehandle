import re
from pydantic import BaseModel, field_validator


class DimensionWeight(BaseModel):
    id: str
    label: str
    weight: float
    enabled: bool


class AnalyzeRequest(BaseModel):
    cnpj: str
    context: str = ""
    weights: list[DimensionWeight]

    @field_validator("cnpj")
    @classmethod
    def clean_cnpj(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        return digits
