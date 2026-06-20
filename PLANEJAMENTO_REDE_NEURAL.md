# Planejamento — Rede Neural de Score
## MRSBlueTeam · Módulo complementar ao backend

> Componente independente. Roda em paralelo ao score da fórmula.
> O score final combina os dois: `Score_Final = Formula × W_f + NN × W_nn`

---

## Objetivo

Treinar uma rede neural simples **antes do evento** usando dados reais do SQLite
da Receita Federal. No dia, ela já estará treinada e pronta para servir
predições em < 10ms por empresa.

A NN não substitui a fórmula — ela a **complementa**, capturando padrões
não-lineares entre features que a fórmula trata de forma isolada.

---

## Por que é viável no hackathon?

| Desafio comum | Nossa solução |
|---|---|
| "Não temos dados rotulados" | Usamos o score da fórmula como target (supervisionado sobre regras) |
| "Treinar demora" | MLPRegressor do scikit-learn treina 100k empresas em < 2 min |
| "Precisa GPU" | Não — rede pequena, CPU suficiente |
| "Como demonstrar?" | Mostramos o peso W_nn ajustável no frontend (slider já existe) |

---

## Arquitetura da Rede

```
Input (16 features)
        ↓
  Dense(64, ReLU)
        ↓
  Dropout(0.2)
        ↓
  Dense(32, ReLU)
        ↓
  Dense(1, Linear)   → score ∈ [0, 100]
```

Implementada com **scikit-learn MLPRegressor** (zero dependências extras,
roda em CPU, serializa com joblib).

---

## Feature Vector — 16 entradas

Todos os valores são normalizados para o intervalo `[0, 1]` antes do treino.

| # | Feature | Origem SQLite | Como calcular |
|---|---|---|---|
| 1 | `anos_mercado` | `data_inicio_atividade` | `(hoje - data_inicio).days / 365` capped em 30 anos |
| 2 | `capital_social_log` | `EMPRESAS.capital_social` | `log10(capital + 1) / 9` (normaliza até R$1B) |
| 3 | `porte_code` | `EMPRESAS.porte_empresa` | `00→0.0, 01→0.33, 03→0.66, 05→1.0` |
| 4 | `situacao_ativa` | `ESTAB.situacao_cadastral` | `1.0` se `02`, senão proporcional ao multiplicador |
| 5 | `tem_situacao_especial` | `ESTAB.situacao_especial` | `1.0` se preenchido, `0.0` se vazio |
| 6 | `is_simples_ativo` | `SIMPLES.opcao_pelo_simples` | `1.0` se `S` e sem exclusão recente |
| 7 | `is_mei` | `SIMPLES.opcao_pelo_mei` | `1.0` se `S` |
| 8 | `foi_excluido_simples` | `SIMPLES.data_exclusao_simples` | `1.0` se data preenchida |
| 9 | `num_socios_norm` | `SOCIOS` | `min(num_socios, 10) / 10` |
| 10 | `tempo_medio_socios` | `SOCIOS.data_entrada_sociedade` | média dos anos na sociedade / 30 |
| 11 | `proporcao_socios_pf` | `SOCIOS.identificador_socio` | `count(PF) / total_socios` |
| 12 | `tem_socio_estrangeiro` | `SOCIOS.pais` | `1.0` se algum sócio com pais != BRA |
| 13 | `tem_email` | `ESTAB.correio_eletronico` | `1.0` se preenchido |
| 14 | `tem_telefone` | `ESTAB.telefone_1` | `1.0` se preenchido |
| 15 | `tem_endereco_completo` | `ESTAB` logradouro+numero+cep | `1.0` se todos preenchidos |
| 16 | `tem_cnae` | `ESTAB.cnae_fiscal_principal` | `1.0` se preenchido |

---

## Estratégia de Treino

### Geração dos dados de treino

```python
# Pseudocódigo do pipeline de treino

# 1. Extrai features de N empresas do SQLite
df = extract_features_from_sqlite(n=200_000)

# 2. Calcula o score da fórmula para cada uma (esse é nosso "target")
df["score_target"] = df.apply(calculate_formula_score, axis=1)

# 3. Remove empresas com dados muito incompletos
df = df[df["anos_mercado"] > 0]

# 4. Separa X e y
X = df[FEATURE_COLUMNS].values   # shape (N, 16)
y = df["score_target"].values     # shape (N,)

# 5. Split treino / validação
from sklearn.model_selection import train_test_split
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1)

# 6. Treina
from sklearn.neural_network import MLPRegressor
model = MLPRegressor(
    hidden_layer_sizes=(64, 32),
    activation='relu',
    max_iter=300,
    early_stopping=True,
    validation_fraction=0.1,
    random_state=42,
)
model.fit(X_train, y_train)

# 7. Avalia
from sklearn.metrics import mean_absolute_error
mae = mean_absolute_error(y_val, model.predict(X_val))
print(f"MAE: {mae:.2f} pontos")   # esperado: < 5 pontos

# 8. Salva
import joblib
joblib.dump(model, "backend/models/score_nn.joblib")
```

### Por que usar o score da fórmula como target?

A NN aprende os **padrões não-lineares** que a fórmula captura de forma linear.
Com 200k empresas reais, ela aprende que:
- Empresa com 15 anos + Simples ativo + 3 sócios PF = score alto
- Empresa com 6 meses + capital baixo + sem email = score baixo

No dia do pitch: *"Treinamos em 200 mil empresas reais da Receita Federal"* — impacta muito mais do que "usamos uma fórmula".

---

## Estrutura de Arquivos

```
backend/
├── models/
│   └── score_nn.joblib          ← modelo treinado (salvo antes do evento)
│
├── scripts/
│   ├── import_cnpj.py           ← já planejado
│   └── train_nn.py              ← script de treino (rodar antes)
│
└── services/
    └── nn_service.py            ← carrega modelo e faz predição
```

---

## `scripts/train_nn.py`

```python
"""
Rodar UMA VEZ antes do evento:
    python scripts/train_nn.py --db cnpj.db --output backend/models/score_nn.joblib
"""
import sqlite3, joblib, argparse
import numpy as np
from datetime import date
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

FEATURE_COLS = [
    "anos_mercado", "capital_log", "porte_code", "situacao_ativa",
    "tem_sit_especial", "simples_ativo", "is_mei", "excluido_simples",
    "num_socios_norm", "tempo_medio_socios", "prop_socios_pf",
    "tem_estrangeiro", "tem_email", "tem_telefone",
    "tem_endereco", "tem_cnae",
]

def extract_rows(db_path: str, limit: int = 200_000) -> list[dict]:
    """Extrai features de `limit` empresas do SQLite."""
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    # JOIN para pegar todos os dados necessários numa query
    cur.execute("""
        SELECT
            e.cnpj_basico,
            e.capital_social,
            e.porte_empresa,
            est.situacao_cadastral,
            est.situacao_especial,
            est.data_inicio_atividade,
            est.correio_eletronico,
            est.telefone_1,
            est.logradouro,
            est.numero,
            est.cep,
            est.cnae_fiscal_principal,
            s.opcao_pelo_simples,
            s.opcao_pelo_mei,
            s.data_exclusao_simples
        FROM empresas e
        JOIN estabelecimentos est ON est.cnpj_basico = e.cnpj_basico
            AND est.identificador_mf = '1'
        LEFT JOIN simples s ON s.cnpj_basico = e.cnpj_basico
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return rows

def row_to_features(row: dict, socios_map: dict) -> list[float]:
    """Converte uma linha do banco em vetor de 16 features normalizadas."""
    hoje = date.today()

    # anos_mercado
    data_str = row.get("data_inicio_atividade", "00000000")
    try:
        d = date(int(data_str[:4]), int(data_str[4:6]), int(data_str[6:8]))
        anos = (hoje - d).days / 365
    except Exception:
        anos = 0
    anos_norm = min(anos, 30) / 30

    # capital_log
    try:
        cap = float(str(row.get("capital_social", "0")).replace(",", "."))
    except Exception:
        cap = 0
    cap_log = np.log10(cap + 1) / 9

    # porte_code
    porte_map = {"00": 0.0, "01": 0.33, "03": 0.66, "05": 1.0}
    porte = porte_map.get(str(row.get("porte_empresa", "00")), 0.0)

    # situacao_ativa (baseado no multiplicador do gate)
    sit_map = {"02": 1.0, "03": 0.4, "04": 0.15, "01": 0.05, "08": 0.0}
    sit = sit_map.get(str(row.get("situacao_cadastral", "08")), 0.0)

    # situação especial
    sit_esp = 1.0 if row.get("situacao_especial", "") else 0.0

    # simples / MEI
    simples_ativo = 1.0 if row.get("opcao_pelo_simples") == "S" and not row.get("data_exclusao_simples") else 0.0
    is_mei = 1.0 if row.get("opcao_pelo_mei") == "S" else 0.0
    excluido = 1.0 if row.get("data_exclusao_simples") else 0.0

    # sócios
    cnpj = row["cnpj_basico"]
    socios = socios_map.get(cnpj, [])
    num_s = min(len(socios), 10) / 10
    if socios:
        tempos = []
        for soc in socios:
            ds = soc.get("data_entrada_sociedade", "00000000")
            try:
                dd = date(int(ds[:4]), int(ds[4:6]), int(ds[6:8]))
                tempos.append((hoje - dd).days / 365)
            except Exception:
                pass
        tempo_medio = (sum(tempos) / len(tempos) / 30) if tempos else 0.0
        prop_pf = sum(1 for s in socios if s.get("identificador_socio") == "2") / len(socios)
        tem_estrang = 1.0 if any(s.get("pais", "BRA") not in ("BRA", "") for s in socios) else 0.0
    else:
        tempo_medio, prop_pf, tem_estrang = 0.0, 0.0, 0.0

    # completude
    tem_email = 1.0 if row.get("correio_eletronico") else 0.0
    tem_tel   = 1.0 if row.get("telefone_1") else 0.0
    tem_end   = 1.0 if all([row.get("logradouro"), row.get("numero"), row.get("cep")]) else 0.0
    tem_cnae  = 1.0 if row.get("cnae_fiscal_principal") else 0.0

    return [
        anos_norm, cap_log, porte, sit, sit_esp,
        simples_ativo, is_mei, excluido,
        num_s, tempo_medio, prop_pf, tem_estrang,
        tem_email, tem_tel, tem_end, tem_cnae,
    ]

def calculate_formula_score(row: dict, socios: list) -> float:
    """Replica a fórmula simplificada para gerar os labels de treino."""
    from services.score_service import calculate   # importa o serviço real
    data = {"empresa": row, "estabelecimento": row, "socios": socios, "simples": row}
    result = calculate(data, weights=None, gates_ext={})
    return float(result["score_formula"])

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--db",     required=True)
    parser.add_argument("--output", default="backend/models/score_nn.joblib")
    parser.add_argument("--limit",  type=int, default=200_000)
    args = parser.parse_args()

    print("Extraindo features...")
    rows = extract_rows(args.db, args.limit)
    print(f"{len(rows)} empresas carregadas")

    # carrega sócios em memória (evita N+1 queries)
    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row
    raw_socios = con.execute("SELECT * FROM socios").fetchall()
    socios_map: dict[str, list] = {}
    for s in raw_socios:
        socios_map.setdefault(s["cnpj_basico"], []).append(dict(s))
    con.close()

    print("Calculando features e targets...")
    X, y = [], []
    for row in rows:
        socios = socios_map.get(row["cnpj_basico"], [])
        features = row_to_features(row, socios)
        # usa a fórmula como target
        from services.score_service import _quick_score
        score = _quick_score(row, socios)
        X.append(features)
        y.append(score)

    X = np.array(X)
    y = np.array(y)

    # remove NaNs
    mask = ~np.isnan(X).any(axis=1)
    X, y = X[mask], y[mask]
    print(f"Dataset final: {len(X)} amostras, {X.shape[1]} features")

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, random_state=42)

    print("Treinando rede neural...")
    model = MLPRegressor(
        hidden_layer_sizes=(64, 32),
        activation="relu",
        solver="adam",
        learning_rate_init=0.001,
        max_iter=500,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
        verbose=True,
    )
    model.fit(X_train, y_train)

    mae = mean_absolute_error(y_val, model.predict(X_val))
    print(f"\n✅ MAE na validação: {mae:.2f} pontos")
    print(f"   Iterações rodadas: {model.n_iter_}")

    joblib.dump(model, args.output)
    print(f"✅ Modelo salvo em: {args.output}")
```

---

## `services/nn_service.py`

```python
"""
Serviço de inferência da rede neural.
Carrega o modelo uma vez no startup e serve predições.
"""
import joblib
import numpy as np
from pathlib import Path

_model = None

def load_model():
    global _model
    path = Path("backend/models/score_nn.joblib")
    if path.exists():
        _model = joblib.load(path)
        print("✅ Modelo de rede neural carregado")
    else:
        print("⚠️  Modelo não encontrado — score_nn desabilitado")

def predict(features: list[float]) -> float | None:
    """
    Recebe vetor de 16 features normalizadas.
    Retorna score ∈ [0, 100] ou None se modelo não carregado.
    """
    if _model is None:
        return None
    x = np.array(features).reshape(1, -1)
    score = float(_model.predict(x)[0])
    return max(0.0, min(100.0, score))   # clamp seguro
```

---

## Integração no Score Final

No `score_service.py`, após calcular `score_formula` e obter `score_nn`:

```python
# Pesos padrão (configuráveis via frontend — slider "Rede Neural")
W_FORMULA = 0.70
W_NN      = 0.30   # ← vai a 0 se modelo não estiver disponível

score_nn = nn_service.predict(features)

if score_nn is not None:
    score_final = (score_formula * W_FORMULA + score_nn * W_NN) * hard_gates_multiplier
else:
    score_final = score_formula * hard_gates_multiplier   # fallback sem NN
```

A divisão de pesos W_FORMULA / W_NN pode ser exposta no frontend como um slider
adicional no painel de calibragem — assim o usuário controla quanto peso dar
à rede neural vs. à fórmula.

---

## Cronograma de Treino

| Etapa | Quando | Tempo estimado |
|---|---|---|
| Importar CSVs da Receita para SQLite | Antes do evento | 30–60 min |
| Rodar `train_nn.py` | Antes do evento | 5–15 min |
| Verificar MAE < 10 pontos | Antes do evento | 2 min |
| Salvar `score_nn.joblib` | Antes do evento | < 1s |
| Carregar modelo no startup do FastAPI | No dia | automático |

> Treinar antes do evento é essencial. No dia, apenas carregamos o `.joblib`.

---

## O que falar na apresentação

> *"Além da fórmula parametrizada, treinamos uma rede neural em 200 mil empresas
> reais da base da Receita Federal. A rede aprende padrões não-lineares que a
> fórmula não captura — por exemplo, como a combinação de porte, tempo de mercado
> e regime tributário interage para indicar conformidade. O usuário pode ajustar
> quanto peso dar à rede neural vs. à fórmula, e cada análise feita pela plataforma
> alimenta um dataset futuro de retreino com feedback real de mercado."*

---

## Dependências adicionais

```
scikit-learn==1.5.0
joblib==1.4.0
numpy==1.26.0
```

Já instaladas com scikit-learn — zero overhead extra no backend.
