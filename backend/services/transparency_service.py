import csv
import os
from pathlib import Path

import httpx
from services import log_service

_TRANSPARENCIA_URL = "https://api.portaldatransparencia.gov.br/api-de-dados"
_lista_suja_cnpjs: set[str] = set()  # Cadastro de Empregadores (trabalho escravo)
_ceac_cnpjs:       set[str] = set()  # CEAC — Ajustamento de Conduta


def load_lista_suja() -> None:
    """Carrega os cadastros MTE em memória no startup."""
    _load_csv_cnpjs(Path(os.getenv("LISTA_SUJA_CSV", "")), _lista_suja_cnpjs)
    _load_csv_cnpjs(Path(os.getenv("CEAC_CSV", "")),       _ceac_cnpjs)


def _load_csv_cnpjs(csv_path: Path, target: set[str]) -> None:
    if not csv_path or not csv_path.exists():
        return
    with open(csv_path, encoding="latin-1") as f:
        reader = csv.reader(f, delimiter=";")
        next(reader, None)  # pula cabeçalho
        for row in reader:
            if len(row) < 5:
                continue
            digits = "".join(c for c in row[4] if c.isdigit())
            if len(digits) == 14:  # ignora CPF (11 dígitos)
                target.add(digits)


async def check_ceis(cnpj: str) -> dict:
    return await _check_transparencia("ceis", cnpj, "CEIS")


async def check_cnep(cnpj: str) -> dict:
    return await _check_transparencia("cnep", cnpj, "CNEP")


async def check_lista_suja(cnpj: str) -> dict:
    if cnpj in _lista_suja_cnpjs:
        return {
            "triggered": True,
            "detail": "Empresa no Cadastro de Empregadores MTE (trabalho escravo)",
            "multiplier": 0.0,
        }
    if cnpj in _ceac_cnpjs:
        return {
            "triggered": True,
            "detail": "Empresa no CEAC — Ajustamento de Conduta (MTE)",
            "multiplier": 0.0,
        }
    return {
        "triggered": False,
        "detail": "Sem autuações nas listas do MTE",
        "multiplier": 1.0,
    }


async def _check_transparencia(endpoint: str, cnpj: str, label: str) -> dict:
    api_key = os.getenv("TRANSPARENCIA_API_KEY", "")
    url = f"{_TRANSPARENCIA_URL}/{endpoint}"
    params = {"cnpjSancionado": cnpj, "pagina": 1}
    headers = {"chave-de-api": api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            razao = first.get("nomeRazaoSocial") or first.get("razaoSocialCadastroRFB", "")
            return {
                "triggered": True,
                "detail": f"Sancionada no {label}: {razao}",
                "multiplier": 0.0,
            }
        return {
            "triggered": False,
            "detail": f"Sem sanções no {label}",
            "multiplier": 1.0,
        }
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return {"triggered": False, "detail": f"Sem sanções no {label}", "multiplier": 1.0}
        await log_service.warning("transparency_service", f"check:{endpoint}", f"HTTP {exc.response.status_code} — {label}", cnpj)
        return {"triggered": False, "detail": f"{label} indisponível", "multiplier": 1.0}
    except Exception as exc:
        await log_service.error("transparency_service", f"check:{endpoint}", exc, cnpj)
        return {"triggered": False, "detail": f"{label} indisponível", "multiplier": 1.0}
