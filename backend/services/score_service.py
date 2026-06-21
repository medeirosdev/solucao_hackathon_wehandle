from datetime import date, datetime
from models.request import DimensionWeight
from models.response import DimensionScore, HardGate, RedFlag
from services import nn_service

_SITUACAO_LABELS = {
    "01": "Nula",
    "02": "Ativa",
    "03": "Suspensa",
    "04": "Inapta",
    "08": "Baixada",
}

_PORTE_LABELS = {
    "00": "Não informado",
    "01": "Micro Empresa (ME)",
    "03": "Empresa de Pequeno Porte (EPP)",
    "05": "Demais (Médio/Grande)",
}


def calculate(data: dict, weights: list[DimensionWeight], gates_ext: dict) -> dict:
    d1, d1_detail = _d1_longevidade(data.get("data_inicio_atividade", ""))
    d2, d2_detail = _d2_porte_capital(data.get("porte_empresa", ""), data.get("capital_social", ""))
    d3, d3_detail = _d3_estabilidade(data.get("socios", []))
    d4, d4_detail = _d4_tributaria(data.get("simples", {}), data.get("porte_empresa", ""))
    d5, d5_detail = _d5_completude(data)

    raw_scores = {
        "longevidade": d1,
        "porte_capital": d2,
        "estabilidade_societaria": d3,
        "regularidade_tributaria": d4,
        "completude_cadastral": d5,
    }
    details = {
        "longevidade": d1_detail,
        "porte_capital": d2_detail,
        "estabilidade_societaria": d3_detail,
        "regularidade_tributaria": d4_detail,
        "completude_cadastral": d5_detail,
    }
    labels = {
        "longevidade": "Longevidade",
        "porte_capital": "Porte + Capital",
        "estabilidade_societaria": "Estabilidade Societária",
        "regularidade_tributaria": "Regularidade Tributária",
        "completude_cadastral": "Completude Cadastral",
    }

    # normaliza pesos (apenas os enabled)
    total_weight = sum(w.weight for w in weights if w.enabled)
    dimensions: list[DimensionScore] = []
    score_dimensoes = 0.0

    for w in weights:
        raw = raw_scores.get(w.id, 0.0)
        effective_weight = (w.weight / total_weight) if (w.enabled and total_weight > 0) else 0.0
        contribution = raw * effective_weight
        score_dimensoes += contribution
        dimensions.append(DimensionScore(
            id=w.id,
            label=w.label or labels.get(w.id, w.id),
            score=round(contribution, 2),
            max_score=round(effective_weight * 100, 2),
            detail=details.get(w.id, ""),
        ))

    # Hard Gates
    mult_situacao, gate_sit = _gate_situacao(data.get("situacao_cadastral", ""))
    mult_especial, gate_esp = _gate_especial(data.get("situacao_especial", ""))
    mult_ceis, gate_ceis = _gate_ceis(gates_ext.get("ceis", {}))
    mult_cnep, gate_cnep = _gate_cnep(gates_ext.get("cnep", {}))
    mult_lista, gate_lista = _gate_lista_suja(gates_ext.get("lista_suja", {}))

    hard_gates = [gate_sit, gate_esp, gate_ceis, gate_cnep, gate_lista]
    total_mult = mult_situacao * mult_especial * mult_ceis * mult_cnep * mult_lista

    # Rede neural — 1% do score base; nunca bloqueia se falhar
    score_nn = nn_service.predict(data)
    if score_nn is not None:
        blended = score_dimensoes * 0.99 + score_nn * 0.01
        nn_detail = f"Score rede neural: {score_nn:.1f}/100"
    else:
        blended = score_dimensoes
        nn_detail = "Rede neural indisponível — score sem impacto"

    dimensions.append(DimensionScore(
        id="rede_neural",
        label="Rede Neural",
        score=round((score_nn or 0.0) * 0.01, 2),
        max_score=1.0,
        detail=nn_detail,
    ))

    score_formula = round(blended * total_mult, 1)
    score_formula = max(0.0, min(100.0, score_formula))

    red_flags = _build_red_flags(data, gates_ext)

    return {
        "score_formula": score_formula,
        "dimensions": dimensions,
        "hard_gates": hard_gates,
        "red_flags": red_flags,
    }


# ── D1 — Longevidade ─────────────────────────────────────────────────────────

def _d1_longevidade(data_inicio: str) -> tuple[float, str]:
    if not data_inicio or data_inicio == "00000000":
        return 0.0, "Data de abertura não informada"

    try:
        dt = datetime.strptime(data_inicio, "%Y%m%d").date()
    except ValueError:
        return 0.0, "Data de abertura inválida"

    anos = (date.today() - dt).days / 365.25

    if anos < 1:
        score = 5.0
    elif anos < 2:
        score = 15.0
    elif anos < 5:
        score = 40.0
    elif anos < 10:
        score = 65.0
    elif anos < 20:
        score = 85.0
    else:
        score = 100.0

    return score, f"{anos:.1f} anos de mercado"


# ── D2 — Porte + Capital ─────────────────────────────────────────────────────

def _d2_porte_capital(porte: str, capital_raw: str) -> tuple[float, str]:
    porte_scores = {"01": 20, "03": 40, "05": 50, "00": 10}
    sub_a = porte_scores.get(porte, 10)

    try:
        capital = float(capital_raw.replace(",", ".").replace(" ", ""))
    except (ValueError, AttributeError):
        capital = 0.0

    if capital < 1_000:
        sub_b = 5
    elif capital < 10_000:
        sub_b = 15
    elif capital < 100_000:
        sub_b = 30
    elif capital < 1_000_000:
        sub_b = 40
    else:
        sub_b = 50

    score = float(sub_a + sub_b)
    porte_label = _PORTE_LABELS.get(porte, "Não informado")
    capital_fmt = f"R$ {capital:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return score, f"{porte_label} · {capital_fmt}"


# ── D3 — Estabilidade Societária ─────────────────────────────────────────────

def _d3_estabilidade(socios: list[dict]) -> tuple[float, str]:
    if not socios:
        return 0.0, "Nenhum sócio localizado na base pública"

    tempos: list[float] = []
    for s in socios:
        entrada = s.get("data_entrada_sociedade", "")
        if entrada and entrada != "00000000":
            try:
                dt = datetime.strptime(entrada, "%Y%m%d").date()
                tempos.append((date.today() - dt).days / 365.25)
            except ValueError:
                pass

    if tempos:
        media = sum(tempos) / len(tempos)
        if media < 1:
            sub_a = 10
        elif media < 2:
            sub_a = 20
        elif media < 5:
            sub_a = 35
        elif media < 10:
            sub_a = 50
        else:
            sub_a = 60
    else:
        sub_a = 10
        media = 0.0

    ids = {s.get("identificador_socio", "") for s in socios}
    paises = {s.get("pais", "105") for s in socios}  # 105 = Brasil
    tem_pf = "2" in ids
    tem_pj = "1" in ids
    tem_estrangeiro = "3" in ids or any(p not in ("105", "", None) for p in paises)

    if tem_estrangeiro:
        sub_b = 20
        composicao = "Sócios estrangeiros presentes"
    elif tem_pf and tem_pj:
        sub_b = 30
        composicao = "Mix PF + PJ nacionais"
    elif tem_pf and not tem_pj:
        sub_b = 40
        composicao = "Apenas PF brasileiros"
    elif tem_pj and not tem_pf:
        sub_b = 15
        composicao = "Apenas PJ (sem PF)"
    else:
        sub_b = 20
        composicao = "Composição não identificada"

    score = float(sub_a + sub_b)
    detail = f"{len(socios)} sócio(s) · média {media:.1f} anos · {composicao}"
    return score, detail


# ── D4 — Regularidade Tributária ─────────────────────────────────────────────

def _d4_tributaria(simples: dict, porte: str) -> tuple[float, str]:
    if not simples:
        return 40.0, "Sem registro no Simples Nacional"

    opcao_simples = simples.get("opcao_pelo_simples", "N") or "N"
    opcao_mei = simples.get("opcao_pelo_mei", "N") or "N"
    data_exclusao = simples.get("data_exclusao_simples", "") or ""
    data_opcao = simples.get("data_opcao_simples", "") or ""

    # dado inconsistente
    if data_exclusao and not data_opcao:
        return 15.0, "Dado inconsistente: exclusão sem opção registrada"

    if opcao_mei == "S":
        return 45.0, "MEI ativo"

    if opcao_simples == "S" and not _exclusao_recente(data_exclusao):
        return 100.0, "Simples Nacional ativo"

    if data_exclusao:
        anos_exclusao = _anos_desde(data_exclusao)
        if anos_exclusao is not None and anos_exclusao < 2:
            return 30.0, f"Excluído do Simples há {anos_exclusao:.1f} anos"
        return 20.0, "Excluído do Simples há 2+ anos"

    if porte == "05":
        return 100.0, "Grande empresa — fora do Simples por porte"

    if porte in ("01", "03"):
        return 50.0, "Porte ME/EPP sem adesão ao Simples"

    return 40.0, "Sem registro no Simples Nacional"


def _exclusao_recente(data_exclusao: str) -> bool:
    if not data_exclusao or data_exclusao == "00000000":
        return False
    anos = _anos_desde(data_exclusao)
    return anos is not None and anos < 2


def _anos_desde(data_str: str) -> float | None:
    if not data_str or data_str == "00000000":
        return None
    try:
        dt = datetime.strptime(data_str, "%Y%m%d").date()
        return (date.today() - dt).days / 365.25
    except ValueError:
        return None


# ── D5 — Completude Cadastral ─────────────────────────────────────────────────

def _d5_completude(data: dict) -> tuple[float, str]:
    score = 0
    campos_presentes = []

    if _preenchido(data.get("correio_eletronico")):
        score += 25
        campos_presentes.append("email")

    if _preenchido(data.get("ddd_1")) and _preenchido(data.get("telefone_1")):
        score += 15
        campos_presentes.append("telefone")

    if (
        _preenchido(data.get("logradouro"))
        and _preenchido(data.get("numero"))
        and _preenchido(data.get("cep"))
    ):
        score += 25
        campos_presentes.append("endereço")

    if _preenchido(data.get("cnae_fiscal_principal")):
        score += 20
        campos_presentes.append("CNAE")

    if _preenchido(data.get("nome_fantasia")):
        score += 10
        campos_presentes.append("nome fantasia")

    if _preenchido(data.get("ddd_2")) or _preenchido(data.get("telefone_2")):
        score += 5
        campos_presentes.append("telefone 2")

    detail = ", ".join(campos_presentes) if campos_presentes else "Cadastro incompleto"
    return float(score), detail


def _preenchido(valor) -> bool:
    return bool(valor and str(valor).strip())


# ── Hard Gates ────────────────────────────────────────────────────────────────

def _gate_situacao(situacao: str) -> tuple[float, HardGate]:
    multipliers = {"08": 0.0, "01": 0.05, "04": 0.15, "03": 0.40, "02": 1.0}
    mult = multipliers.get(situacao, 1.0)
    label = _SITUACAO_LABELS.get(situacao, situacao or "Não informada")
    triggered = mult < 1.0
    detail = f"Situação cadastral: {label}" + (" — penalidade aplicada" if triggered else "")
    return mult, HardGate(
        id="situacao_cadastral",
        label="Situação Cadastral",
        triggered=triggered,
        multiplier=mult,
        detail=detail,
    )


def _gate_especial(situacao_especial: str) -> tuple[float, HardGate]:
    if not situacao_especial or not situacao_especial.strip():
        return 1.0, HardGate(
            id="situacao_especial",
            label="Situação Especial",
            triggered=False,
            multiplier=1.0,
            detail="Sem situação especial",
        )

    lower = situacao_especial.lower()
    if "falência" in lower or "falencia" in lower:
        mult = 0.05
    elif "recuperação" in lower or "recuperacao" in lower:
        mult = 0.45
    else:
        mult = 0.70

    return mult, HardGate(
        id="situacao_especial",
        label="Situação Especial",
        triggered=True,
        multiplier=mult,
        detail=f"Situação especial: {situacao_especial}",
    )


def _gate_ceis(result: dict) -> tuple[float, HardGate]:
    triggered = result.get("triggered", False)
    mult = 0.0 if triggered else 1.0
    detail = result.get("detail", "Sem sanções no CEIS")
    return mult, HardGate(
        id="ceis",
        label="CEIS / CNEP",
        triggered=triggered,
        multiplier=mult,
        detail=detail,
    )


def _gate_cnep(result: dict) -> tuple[float, HardGate]:
    triggered = result.get("triggered", False)
    mult = 0.0 if triggered else 1.0
    detail = result.get("detail", "Sem sanções no CNEP")
    return mult, HardGate(
        id="cnep",
        label="CNEP",
        triggered=triggered,
        multiplier=mult,
        detail=detail,
    )


def _gate_lista_suja(result: dict) -> tuple[float, HardGate]:
    triggered = result.get("triggered", False)
    mult = 0.0 if triggered else 1.0
    detail = result.get("detail", "Sem autuações MTE")
    return mult, HardGate(
        id="lista_suja",
        label="Lista Suja MTE",
        triggered=triggered,
        multiplier=mult,
        detail=detail,
    )


# ── Red Flags ─────────────────────────────────────────────────────────────────

def _build_red_flags(data: dict, gates_ext: dict) -> list[RedFlag]:
    flags: list[RedFlag] = []

    situacao = data.get("situacao_cadastral", "")
    if situacao and situacao != "02":
        flags.append(RedFlag(
            severity="critical",
            message=f"Empresa não está ATIVA na Receita Federal (situação: {_SITUACAO_LABELS.get(situacao, situacao)})",
            source="Receita Federal",
        ))

    sit_especial = data.get("situacao_especial", "")
    if sit_especial and sit_especial.strip():
        flags.append(RedFlag(
            severity="critical",
            message=f"Empresa em situação especial: {sit_especial}",
            source="Receita Federal",
        ))

    data_inicio = data.get("data_inicio_atividade", "")
    if data_inicio and data_inicio != "00000000":
        anos = _anos_desde(data_inicio)
        if anos is not None and anos < 1:
            flags.append(RedFlag(
                severity="warning",
                message="Empresa recém-constituída — menos de 1 ano de operação",
                source="Receita Federal",
            ))

    try:
        capital = float((data.get("capital_social") or "0").replace(",", "."))
        if capital < 1_000:
            flags.append(RedFlag(
                severity="warning",
                message=f"Capital social muito baixo (R$ {capital:,.2f})",
                source="Receita Federal",
            ))
    except (ValueError, AttributeError):
        pass

    simples = data.get("simples", {})
    if simples and simples.get("opcao_pelo_mei") == "S":
        flags.append(RedFlag(
            severity="info",
            message="Empresa cadastrada como MEI — verificar capacidade para contratos de grande porte",
            source="Receita Federal",
        ))

    if not data.get("socios"):
        flags.append(RedFlag(
            severity="warning",
            message="Quadro societário não localizado na base pública",
            source="Receita Federal",
        ))
    else:
        socios = data["socios"]
        tempos = []
        for s in socios:
            entrada = s.get("data_entrada_sociedade", "")
            if entrada and entrada != "00000000":
                anos = _anos_desde(entrada)
                if anos is not None:
                    tempos.append(anos)
        if tempos and (sum(tempos) / len(tempos)) < 1:
            flags.append(RedFlag(
                severity="warning",
                message="Quadro societário recente — possível mudança de controle",
                source="Receita Federal",
            ))

    if not _preenchido(data.get("correio_eletronico")):
        flags.append(RedFlag(
            severity="info",
            message="Sem e-mail cadastrado na Receita Federal",
            source="Receita Federal",
        ))

    if gates_ext.get("ceis", {}).get("triggered"):
        flags.append(RedFlag(
            severity="critical",
            message="Empresa sancionada no CEIS (Cadastro de Empresas Inidôneas e Suspensas)",
            source="Portal da Transparência",
        ))

    if gates_ext.get("cnep", {}).get("triggered"):
        flags.append(RedFlag(
            severity="critical",
            message="Empresa sancionada no CNEP (Cadastro Nacional de Empresas Punidas)",
            source="Portal da Transparência",
        ))

    if gates_ext.get("lista_suja", {}).get("triggered"):
        flags.append(RedFlag(
            severity="critical",
            message="Empresa na Lista Suja do MTE — autuada por trabalho análogo à escravidão",
            source="MTE",
        ))

    return flags
