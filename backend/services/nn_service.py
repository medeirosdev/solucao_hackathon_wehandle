"""
Rede neural feedforward simples para scoring de conformidade.
Pesos pré-definidos (sem treinamento online) — apenas math, sem dependências extras.
Contribuição: 1% do score final. Nunca bloqueia a aplicação.
"""
import logging
import math
from datetime import date, datetime

logger = logging.getLogger(__name__)

# ── Arquitetura: 8 entradas → 5 neurônios ocultos (ReLU) → 1 saída (sigmoid) ─

# Camada 1 — pesos [neurônio][feature]
# Cada neurônio captura um conceito de conformidade:
# h0: longevidade + capital social
# h1: situação cadastral ativa + sem situação especial
# h2: completude cadastral (email, telefone, endereço/porte)
# h3: porte + quadro societário
# h4: sinal geral combinado
_W1 = [
    [1.2, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.8, 0.0, 0.0, 0.0, 1.2],
    [0.0, 0.0, 0.0, 0.0, 0.5, 0.9, 0.7, 0.0],
    [0.0, 0.4, 0.6, 0.0, 0.8, 0.0, 0.0, 0.0],
    [0.5, 0.3, 0.2, 0.6, 0.3, 0.4, 0.3, 0.5],
]
_b1 = [-0.4, -0.6, -0.5, -0.4, -1.0]

# Camada 2 — pesos da camada oculta para saída
_W2 = [0.8, 1.5, 0.7, 0.6, 1.0]
_b2 = -3.5


def predict(data: dict) -> float | None:
    """Retorna score 0–100 ou None se qualquer erro ocorrer."""
    try:
        features = _extract_features(data)
        return _forward(features)
    except Exception as exc:
        logger.warning("nn_service.predict falhou: %s", exc)
        return None


# ── Extração de features ──────────────────────────────────────────────────────

def _extract_features(data: dict) -> list[float]:
    return [
        _feat_anos(data),
        _feat_capital(data),
        _feat_socios(data),
        _feat_situacao_ativa(data),
        _feat_porte(data),
        _feat_email(data),
        _feat_telefone(data),
        _feat_sem_situacao_especial(data),
    ]


def _feat_anos(data: dict) -> float:
    inicio = data.get("data_inicio_atividade", "") or ""
    if not inicio or inicio == "00000000":
        return 0.0
    try:
        dt = datetime.strptime(inicio, "%Y%m%d").date()
        anos = (date.today() - dt).days / 365.25
        return min(anos / 20.0, 1.0)
    except ValueError:
        return 0.0


def _feat_capital(data: dict) -> float:
    try:
        capital = float((data.get("capital_social") or "0").replace(",", "."))
        if capital <= 0:
            return 0.0
        return min(math.log10(capital) / 9.0, 1.0)  # log10(1B) = 9
    except (ValueError, AttributeError):
        return 0.0


def _feat_socios(data: dict) -> float:
    return min(len(data.get("socios") or []) / 10.0, 1.0)


def _feat_situacao_ativa(data: dict) -> float:
    return 1.0 if data.get("situacao_cadastral", "") == "02" else 0.0


def _feat_porte(data: dict) -> float:
    return {"00": 0.0, "01": 0.33, "03": 0.66, "05": 1.0}.get(
        data.get("porte_empresa", ""), 0.0
    )


def _feat_email(data: dict) -> float:
    email = data.get("correio_eletronico", "") or ""
    return 1.0 if email.strip() else 0.0


def _feat_telefone(data: dict) -> float:
    return 1.0 if (data.get("ddd_1") and data.get("telefone_1")) else 0.0


def _feat_sem_situacao_especial(data: dict) -> float:
    especial = data.get("situacao_especial", "") or ""
    return 0.0 if especial.strip() else 1.0


# ── Propagação forward ────────────────────────────────────────────────────────

def _relu(x: float) -> float:
    return x if x > 0 else 0.0


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


def _forward(features: list[float]) -> float:
    # Camada oculta
    hidden = [
        _relu(sum(w * f for w, f in zip(row, features)) + b)
        for row, b in zip(_W1, _b1)
    ]
    # Saída
    z_out = sum(w * h for w, h in zip(_W2, hidden)) + _b2
    return round(_sigmoid(z_out) * 100.0, 1)
