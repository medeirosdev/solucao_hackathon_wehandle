from db.connection import get_db
from services import log_service


async def get_company_data(cnpj: str) -> dict:
    """
    Retorna todos os dados necessários para o score.
    cnpj: 14 dígitos sem formatação.
    Retorna {} se o BD estiver inacessível.
    """
    basico = cnpj[:8]

    try:
        async with get_db() as db:
            empresa = await _fetch_empresa(db, basico)
            estab = await _fetch_estabelecimento(db, basico)
            socios = await _fetch_socios(db, basico)
            simples = await _fetch_simples(db, basico)
            cnae_desc = await _fetch_cnae(db, estab.get("cnae_fiscal_principal", ""))
            municipio_desc = await _fetch_municipio(db, estab.get("municipio", ""))

        return {
            "cnpj_basico": basico,
            **empresa,
            **estab,
            "socios": socios,
            "simples": simples,
            "cnae_descricao": cnae_desc,
            "municipio_descricao": municipio_desc,
        }
    except Exception as exc:
        await log_service.error("cnpj_service", "get_company_data", exc, cnpj)
        return {}


async def _fetch_empresa(db, basico: str) -> dict:
    cursor = await db.execute(
        "SELECT cnpj_basico, razao_social, natureza_juridica, qualificacao_responsavel,"
        " porte_empresa, ente_federativo_responsavel, capital_social"
        " FROM empresas WHERE cnpj_basico = ?",
        (basico,),
    )
    row = await cursor.fetchone()
    if row is None:
        return {}
    return dict(row)


async def _fetch_estabelecimento(db, basico: str) -> dict:
    # Tenta a matriz (matriz_filial = '1'); cai para qualquer estabelecimento se não achar
    cursor = await db.execute(
        "SELECT cnpj_basico, cnpj_ordem, cnpj_dv, matriz_filial, nome_fantasia,"
        " situacao_cadastral, data_situacao_cadastral, motivo_situacao_cadastral,"
        " data_inicio_atividades, cnae_fiscal, cnae_fiscal_secundaria,"
        " tipo_logradouro, logradouro, numero, complemento, bairro, cep, uf, municipio,"
        " ddd1, telefone1, ddd2, telefone2, correio_eletronico,"
        " situacao_especial, data_situacao_especial"
        " FROM estabelecimento"
        " WHERE cnpj_basico = ? AND matriz_filial = '1'"
        " LIMIT 1",
        (basico,),
    )
    row = await cursor.fetchone()

    if row is None:
        cursor = await db.execute(
            "SELECT cnpj_basico, cnpj_ordem, cnpj_dv, matriz_filial, nome_fantasia,"
            " situacao_cadastral, data_situacao_cadastral, motivo_situacao_cadastral,"
            " data_inicio_atividades, cnae_fiscal, cnae_fiscal_secundaria,"
            " tipo_logradouro, logradouro, numero, complemento, bairro, cep, uf, municipio,"
            " ddd1, telefone1, ddd2, telefone2, correio_eletronico,"
            " situacao_especial, data_situacao_especial"
            " FROM estabelecimento"
            " WHERE cnpj_basico = ?"
            " LIMIT 1",
            (basico,),
        )
        row = await cursor.fetchone()

    if row is None:
        return {}

    raw = dict(row)
    # remapeia colunas do DB para os nomes esperados pelo score_service / ai_service
    return {
        "cnpj_basico":               raw.get("cnpj_basico", "") or "",
        "cnpj_ordem":                raw.get("cnpj_ordem", "") or "",
        "cnpj_dv":                   raw.get("cnpj_dv", "") or "",
        "matriz_filial":             raw.get("matriz_filial", "") or "",
        "nome_fantasia":             raw.get("nome_fantasia", "") or "",
        "situacao_cadastral":        raw.get("situacao_cadastral", "") or "",
        "data_situacao_cadastral":   raw.get("data_situacao_cadastral", "") or "",
        "motivo_situacao_cadastral": raw.get("motivo_situacao_cadastral", "") or "",
        # data_inicio_atividades → data_inicio_atividade (nome usado em score/ai/analyze)
        "data_inicio_atividade":     raw.get("data_inicio_atividades", "") or "",
        # cnae_fiscal → cnae_fiscal_principal
        "cnae_fiscal_principal":     raw.get("cnae_fiscal", "") or "",
        "cnae_fiscal_secundaria":    raw.get("cnae_fiscal_secundaria", "") or "",
        "tipo_logradouro":           raw.get("tipo_logradouro", "") or "",
        "logradouro":                raw.get("logradouro", "") or "",
        "numero":                    raw.get("numero", "") or "",
        "complemento":               raw.get("complemento", "") or "",
        "bairro":                    raw.get("bairro", "") or "",
        "cep":                       raw.get("cep", "") or "",
        "uf":                        raw.get("uf", "") or "",
        "municipio":                 raw.get("municipio", "") or "",
        # ddd1/telefone1 → ddd_1/telefone_1
        "ddd_1":                     raw.get("ddd1", "") or "",
        "telefone_1":                raw.get("telefone1", "") or "",
        "ddd_2":                     raw.get("ddd2", "") or "",
        "telefone_2":                raw.get("telefone2", "") or "",
        "correio_eletronico":        raw.get("correio_eletronico", "") or "",
        "situacao_especial":         raw.get("situacao_especial", "") or "",
        "data_situacao_especial":    raw.get("data_situacao_especial", "") or "",
    }


async def _fetch_socios(db, basico: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT identificador_de_socio, nome_socio, cnpj_cpf_socio,"
        " qualificacao_socio, data_entrada_sociedade, pais, faixa_etaria"
        " FROM socios WHERE cnpj_basico = ?",
        (basico,),
    )
    rows = await cursor.fetchall()
    result = []
    for r in rows:
        raw = dict(r)
        result.append({
            # identificador_de_socio → identificador_socio
            "identificador_socio":    raw.get("identificador_de_socio", "") or "",
            "nome_socio":             raw.get("nome_socio", "") or "",
            "cnpj_cpf_socio":         raw.get("cnpj_cpf_socio", "") or "",
            "qualificacao_socio":     raw.get("qualificacao_socio", "") or "",
            "data_entrada_sociedade": raw.get("data_entrada_sociedade", "") or "",
            "pais":                   raw.get("pais", "") or "",
            "faixa_etaria":           raw.get("faixa_etaria", "") or "",
        })
    return result


async def _fetch_simples(db, basico: str) -> dict:
    cursor = await db.execute(
        "SELECT opcao_simples, data_opcao_simples, data_exclusao_simples,"
        " opcao_mei, data_opcao_mei, data_exclusao_mei"
        " FROM simples WHERE cnpj_basico = ?",
        (basico,),
    )
    row = await cursor.fetchone()
    if row is None:
        return {}
    raw = dict(row)
    return {
        # opcao_simples → opcao_pelo_simples
        "opcao_pelo_simples":    raw.get("opcao_simples", "N") or "N",
        "data_opcao_simples":    raw.get("data_opcao_simples", "") or "",
        "data_exclusao_simples": raw.get("data_exclusao_simples", "") or "",
        # opcao_mei → opcao_pelo_mei
        "opcao_pelo_mei":        raw.get("opcao_mei", "N") or "N",
        "data_opcao_mei":        raw.get("data_opcao_mei", "") or "",
        "data_exclusao_mei":     raw.get("data_exclusao_mei", "") or "",
    }


async def _fetch_cnae(db, codigo: str) -> str:
    if not codigo:
        return ""
    cursor = await db.execute(
        "SELECT descricao FROM cnae WHERE codigo = ?", (codigo,)
    )
    row = await cursor.fetchone()
    return row["descricao"] if row else ""


async def _fetch_municipio(db, codigo: str) -> str:
    if not codigo:
        return ""
    cursor = await db.execute(
        "SELECT descricao FROM municipio WHERE codigo = ?", (codigo,)
    )
    row = await cursor.fetchone()
    return row["descricao"] if row else codigo
