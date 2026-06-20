import csv
import os
from pathlib import Path

import httpx

_TRANSPARENCIA_URL = "https://api.portaldatransparencia.gov.br/api-de-dados"
_lista_suja_cnpjs: set[str] = set()


def load_lista_suja() -> None:
    """Carrega o CSV da Lista Suja do MTE em memória no startup."""
    csv_path = Path(os.getenv("LISTA_SUJA_CSV", "./data/lista_suja_mte.csv"))
    if not csv_path.exists():
        return

    with open(csv_path, encoding="latin-1") as f:
        reader = csv.reader(f, delimiter=";")
        for row in reader:
            if not row:
                continue
            # CNPJ pode estar na 1ª ou 2ª coluna dependendo da versão do CSV
            for cell in row[:3]:
                digits = "".join(c for c in cell if c.isdigit())
                if len(digits) == 14:
                    _lista_suja_cnpjs.add(digits)
                    break


async def check_ceis(cnpj: str) -> dict:
    return await _check_transparencia("ceis", cnpj, "CEIS")


async def check_cnep(cnpj: str) -> dict:
    return await _check_transparencia("cnep", cnpj, "CNEP")


async def check_lista_suja(cnpj: str) -> dict:
    triggered = cnpj in _lista_suja_cnpjs
    return {
        "triggered": triggered,
        "detail": "Empresa na Lista Suja do MTE" if triggered else "Sem autuações MTE",
        "multiplier": 0.0 if triggered else 1.0,
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
        return {"triggered": False, "detail": f"{label} indisponível", "multiplier": 1.0}
    except Exception:
        return {"triggered": False, "detail": f"{label} indisponível", "multiplier": 1.0}
