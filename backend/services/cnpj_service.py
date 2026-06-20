from db.connection import get_db


async def get_company_data(cnpj: str) -> dict:
    """
    Retorna todos os dados necessários para o score.
    cnpj: 14 dígitos sem formatação.
    """
    basico = cnpj[:8]

    async with get_db() as db:
        empresa = await _fetch_empresa(db, basico)
        estab = await _fetch_estabelecimento(db, basico)
        socios = await _fetch_socios(db, basico)
        simples = await _fetch_simples(db, basico)
        cnae_desc = await _fetch_cnae(db, estab.get("cnae_fiscal_principal", ""))
        municipio_desc = await _fetch_municipio(db, estab.get("municipio", ""))

    return {
        **empresa,
        **estab,
        "socios": socios,
        "simples": simples,
        "cnae_descricao": cnae_desc,
        "municipio_descricao": municipio_desc,
    }


async def _fetch_empresa(db, basico: str) -> dict:
    cursor = await db.execute(
        "SELECT * FROM empresas WHERE cnpj_basico = ?", (basico,)
    )
    row = await cursor.fetchone()
    if row is None:
        return {}
    return dict(row)


async def _fetch_estabelecimento(db, basico: str) -> dict:
    cursor = await db.execute(
        """
        SELECT * FROM estabelecimentos
        WHERE cnpj_basico = ? AND identificador_mf = '1'
        LIMIT 1
        """,
        (basico,),
    )
    row = await cursor.fetchone()
    if row is None:
        # fallback: pega qualquer estabelecimento
        cursor = await db.execute(
            "SELECT * FROM estabelecimentos WHERE cnpj_basico = ? LIMIT 1",
            (basico,),
        )
        row = await cursor.fetchone()
    return dict(row) if row else {}


async def _fetch_socios(db, basico: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT * FROM socios WHERE cnpj_basico = ?", (basico,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def _fetch_simples(db, basico: str) -> dict:
    cursor = await db.execute(
        "SELECT * FROM simples WHERE cnpj_basico = ?", (basico,)
    )
    row = await cursor.fetchone()
    return dict(row) if row else {}


async def _fetch_cnae(db, codigo: str) -> str:
    if not codigo:
        return ""
    cursor = await db.execute(
        "SELECT descricao FROM cnaes WHERE codigo = ?", (codigo,)
    )
    row = await cursor.fetchone()
    return row["descricao"] if row else ""


async def _fetch_municipio(db, codigo: str) -> str:
    if not codigo:
        return ""
    cursor = await db.execute(
        "SELECT descricao FROM municipios WHERE codigo = ?", (codigo,)
    )
    row = await cursor.fetchone()
    return row["descricao"] if row else codigo
