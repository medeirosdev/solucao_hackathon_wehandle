# Planejamento Backend — Score de Conformidade
## MRSBlueTeam · Hackathon wehandle · 20/06/2025

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| Banco de dados | SQLite (arquivo local, zero configuração) |
| ORM / queries | aiosqlite + queries SQL puras |
| IA | DeepSeek via SDK da OpenAI (base_url customizado) |
| Variáveis de ambiente | python-dotenv |
| Validação | Pydantic v2 |
| HTTP externo | httpx (async) |
| CORS | FastAPI CORSMiddleware |

---

## Estrutura de Pastas

```
backend/
├── main.py                  # App FastAPI, CORS, rotas
├── .env                     # Chaves de API (não committar)
├── requirements.txt
│
├── routers/
│   └── analyze.py           # POST /analyze
│
├── services/
│   ├── cnpj_service.py      # Lê dados do SQLite (empresas, estab., sócios, simples)
│   ├── score_service.py     # Fórmula: D1-D5 + Hard Gates
│   ├── ai_service.py        # DeepSeek — score semântico + parecer
│   ├── transparency_service.py  # CEIS / CNEP (Portal da Transparência)
│   └── enrichment_service.py    # BrasilAPI, CEP, IBGE (opcional)
│
├── models/
│   ├── request.py           # Pydantic: AnalyzeRequest
│   └── response.py          # Pydantic: AnalyzeResponse
│
├── db/
│   ├── connection.py        # Singleton de conexão aiosqlite
│   └── schema.sql           # CREATE TABLE IF NOT EXISTS
│
└── scripts/
    └── import_cnpj.py       # Importa os CSVs da Receita Federal para o SQLite
```

---

## Banco de Dados (SQLite)

### Por que SQLite?
- Zero setup — um único arquivo `.db`
- Suporta os volumes do CNPJ sem problema para consultas por CNPJ específico
- Índice em `cnpj_basico` torna cada query < 50ms

### Tabelas principais

```sql
-- 4 tabelas de dados
CREATE TABLE IF NOT EXISTS empresas (
    cnpj_basico              TEXT PRIMARY KEY,
    razao_social             TEXT,
    natureza_juridica        TEXT,
    qualificacao_responsavel TEXT,
    capital_social           TEXT,   -- manter como texto (vírgula decimal)
    porte_empresa            TEXT,
    ente_federativo          TEXT
);

CREATE TABLE IF NOT EXISTS estabelecimentos (
    cnpj_basico              TEXT,
    cnpj_ordem               TEXT,
    cnpj_dv                  TEXT,
    identificador_mf         TEXT,   -- 1=Matriz, 2=Filial
    nome_fantasia            TEXT,
    situacao_cadastral       TEXT,
    data_situacao_cadastral  TEXT,
    motivo_situacao_cadastral TEXT,
    data_inicio_atividade    TEXT,
    cnae_fiscal_principal    TEXT,
    cnae_fiscal_secundaria   TEXT,
    logradouro               TEXT,
    numero                   TEXT,
    cep                      TEXT,
    bairro                   TEXT,
    municipio                TEXT,
    uf                       TEXT,
    ddd_1                    TEXT,
    telefone_1               TEXT,
    ddd_2                    TEXT,
    telefone_2               TEXT,
    correio_eletronico       TEXT,
    situacao_especial        TEXT,
    data_situacao_especial   TEXT,
    PRIMARY KEY (cnpj_basico, cnpj_ordem, cnpj_dv)
);

CREATE TABLE IF NOT EXISTS socios (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj_basico              TEXT,
    identificador_socio      TEXT,   -- 1=PJ, 2=PF, 3=Estrangeiro
    nome_socio               TEXT,
    qualificacao_socio       TEXT,
    data_entrada_sociedade   TEXT,
    pais                     TEXT,
    faixa_etaria             TEXT
);

CREATE TABLE IF NOT EXISTS simples (
    cnpj_basico              TEXT PRIMARY KEY,
    opcao_pelo_simples       TEXT,
    data_opcao_simples       TEXT,
    data_exclusao_simples    TEXT,
    opcao_pelo_mei           TEXT,
    data_opcao_mei           TEXT,
    data_exclusao_mei        TEXT
);

-- Tabelas de domínio (lookup)
CREATE TABLE IF NOT EXISTS cnaes       (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS municipios  (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS naturezas   (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS paises      (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS qualificacoes (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS motivos     (codigo TEXT PRIMARY KEY, descricao TEXT);

-- Índices (criar APÓS a carga)
CREATE INDEX IF NOT EXISTS idx_estab_cnpj   ON estabelecimentos (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_socios_cnpj  ON socios (cnpj_basico);
```

> **Atenção na importação:** arquivos CSV da Receita Federal são Latin-1,
> separador `;`, sem cabeçalho, capital_social usa vírgula decimal.

---

## Script de Importação (`scripts/import_cnpj.py`)

```
Ordem de importação:
1. Tabelas de domínio (pequenas, rápidas):
   Cnaes → Motivos → Municipios → Naturezas → Paises → Qualificacoes
2. Empresas
3. Estabelecimentos   ← maior arquivo, usar INSERT em batches de 10.000
4. Simples
5. Sócios
6. Criar índices por último (muito mais rápido)
```

Uso:
```bash
python scripts/import_cnpj.py --data-dir /caminho/para/csvs/
```

---

## Modelos Pydantic

### Request — `POST /analyze`

```python
class DimensionWeight(BaseModel):
    id: str
    label: str
    weight: float        # 0–100
    enabled: bool

class AnalyzeRequest(BaseModel):
    cnpj: str            # 14 dígitos sem formatação
    context: str = ""    # texto da contratação
    weights: list[DimensionWeight]
    # documentos vêm via multipart/form-data separadamente
```

### Response

```python
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
    score_formula: float        # 0–100
    score_ia: float             # 0–100
    dimensions: list[DimensionScore]
    hard_gates: list[HardGate]
    red_flags: list[RedFlag]
    parecer_ia: str
    conflito_cnae: str | None
    fontes_dados: list[str]
```

---

## Fluxo do Endpoint `POST /analyze`

```
1. Recebe: cnpj (str), context (str), weights (list), documents (UploadFile[])
       ↓
2. Valida e limpa CNPJ (14 dígitos)
       ↓
3. [PARALELO] Dispara 3 corrotinas ao mesmo tempo:
   ├── cnpj_service.get_company_data(cnpj)      → dados do SQLite
   ├── transparency_service.check_ceis(cnpj)    → CEIS + CNEP (API)
   └── transparency_service.check_lista_suja(cnpj) → MTE CSV
       ↓
4. score_service.calculate(company_data, weights, ceis_result)
   → retorna score_formula + dimensions + hard_gates + red_flags
       ↓
5. ai_service.analyze(company_data, context, score_formula, documents)
   → retorna score_ia + parecer_ia + conflito_cnae
       ↓
6. Monta AnalyzeResponse e retorna
```

Tempo estimado total: **3–8 segundos** (dominado pelo DeepSeek)

---

## Serviços

### `cnpj_service.py`

```python
async def get_company_data(cnpj: str) -> dict:
    """
    Busca no SQLite:
    - empresas WHERE cnpj_basico = cnpj[:8]
    - estabelecimentos WHERE cnpj_basico = cnpj[:8] AND identificador_mf = '1'
      (somente a matriz)
    - socios WHERE cnpj_basico = cnpj[:8]
    - simples WHERE cnpj_basico = cnpj[:8]
    - JOIN com cnaes, municipios, naturezas para obter descrições
    Retorna dict com todos os campos necessários.
    """
```

### `score_service.py`

```python
def calculate(data: dict, weights: list[DimensionWeight], gates_ext: dict) -> dict:
    """
    1. Calcula D1–D5 (0–100 cada)
    2. Aplica os pesos configurados pelo usuário
    3. Aplica multiplicadores dos Hard Gates
    4. Gera lista de red_flags
    Retorna: score_formula, dimensions, hard_gates, red_flags
    """

# D1 — Longevidade
def _d1_longevidade(data_inicio: str) -> tuple[float, str]: ...

# D2 — Porte + Capital
def _d2_porte_capital(porte: str, capital: str) -> tuple[float, str]: ...

# D3 — Estabilidade Societária
def _d3_estabilidade(socios: list) -> tuple[float, str]: ...

# D4 — Regularidade Tributária
def _d4_tributaria(simples: dict, porte: str) -> tuple[float, str]: ...

# D5 — Completude Cadastral
def _d5_completude(estab: dict) -> tuple[float, str]: ...

# Hard Gates
def _gate_situacao(situacao: str) -> float: ...      # multiplier
def _gate_especial(situacao_especial: str) -> float: ...
def _gate_ceis(ceis: dict) -> float: ...             # vem do serviço externo
def _gate_lista_suja(mte: dict) -> float: ...
```

### `ai_service.py`

```python
async def analyze(data: dict, context: str, score_formula: float, docs: list) -> dict:
    """
    Monta o prompt com todos os dados da empresa + contexto da contratação.
    Chama o DeepSeek.
    Extrai: score_ia (int 0-100), parecer (texto), conflito_cnae (str | None).
    """
```

**Prompt estruturado para o DeepSeek:**

```
Você é um analista de conformidade corporativa. Analise a empresa abaixo
e retorne um JSON com os campos: score_ia (0-100), parecer (texto curto em
português, máx 3 frases), conflito_cnae (string ou null).

=== DADOS DA EMPRESA ===
Razão Social: {razao_social}
CNPJ: {cnpj_formatado}
Situação Cadastral: {situacao}
CNAE Principal: {cnae_codigo} — {cnae_descricao}
CNAEs Secundários: {cnaes_secundarios}
Porte: {porte} | Capital Social: R$ {capital}
Município: {municipio} — {uf}
Abertura: {data_abertura} ({anos} anos de mercado)
Sócios: {lista_socios}
Simples Nacional: {simples_status}
Situação Especial: {situacao_especial or "Nenhuma"}
Score Analítico (fórmula): {score_formula}/100

=== CONTEXTO DA CONTRATAÇÃO ===
{context}

=== INSTRUÇÕES ===
- score_ia: avalie aderência do perfil da empresa ao contexto da contratação,
  considerando CNAE, porte, tempo de mercado e quaisquer inconsistências
- parecer: 2–3 frases explicando o raciocínio
- conflito_cnae: se o CNAE da empresa conflita com o contexto, descreva o
  conflito em 1 frase; caso contrário retorne null

Responda APENAS com JSON válido, sem markdown:
{"score_ia": 0, "parecer": "...", "conflito_cnae": null}
```

### `transparency_service.py`

```python
async def check_ceis(cnpj: str) -> dict:
    """
    GET https://api.portaldatransparencia.gov.br/api-de-dados/ceis
        ?cnpjSancionado={cnpj}&pagina=1
    Header: chave-de-api: {TRANSPARENCIA_API_KEY}
    Retorna: { triggered: bool, detail: str, multiplier: float }
    """

async def check_cnep(cnpj: str) -> dict:
    """
    GET https://api.portaldatransparencia.gov.br/api-de-dados/cnep
        ?cnpjSancionado={cnpj}&pagina=1
    """

async def check_lista_suja(cnpj: str) -> dict:
    """
    Verifica no CSV da Lista Suja do MTE pré-carregado em memória.
    (arquivo pequeno, carregado no startup da aplicação)
    """
```

---

## `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze
from db.connection import init_db

app = FastAPI(title="Score de Conformidade API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://localhost:5175", "http://localhost:5200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()

app.include_router(analyze.router)
```

---

## `.env`

```env
DEEPSEEK_API_KEY=sk-...
TRANSPARENCIA_API_KEY=...
DB_PATH=./cnpj.db
LISTA_SUJA_CSV=./data/lista_suja_mte.csv
```

---

## `requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
aiosqlite==0.20.0
pydantic==2.7.0
python-dotenv==1.0.1
httpx==0.27.0
openai==1.40.0          # SDK compatível com DeepSeek
python-multipart==0.0.9 # upload de arquivos
```

---

## Prioridade de Implementação (ordem para o hackathon)

| # | O que | Por quê |
|---|---|---|
| 1 | `main.py` + CORS + rota POST /analyze mockada | Frontend conecta imediatamente |
| 2 | `scripts/import_cnpj.py` + schema do banco | Base de tudo |
| 3 | `cnpj_service.py` | Dados reais no endpoint |
| 4 | `score_service.py` | Score da fórmula funcionando |
| 5 | `ai_service.py` (DeepSeek) | Diferencial principal |
| 6 | `transparency_service.py` (CEIS/CNEP) | Hard gates externos |
| 7 | Upload e leitura de documentos | Diferencial bônus |

---

## Divisão de Trabalho Sugerida

| Pessoa | Tarefa |
|---|---|
| Dev 1 | `import_cnpj.py` + schema + `cnpj_service.py` |
| Dev 2 | `score_service.py` (toda a fórmula D1–D5 + gates) |
| Dev 3 | `ai_service.py` (DeepSeek prompt + parse) + `main.py` |
| Dev 4 | Frontend (já pronto) + integração + `transparency_service.py` |

---

## Resposta esperada pelo frontend (exemplo real)

```json
{
  "cnpj": "11222333000181",
  "razao_social": "CONSTRUTORA ALFA LTDA",
  "nome_fantasia": "Alfa Construções",
  "situacao_cadastral": "02 - Ativa",
  "uf": "SP",
  "municipio": "Campinas",
  "cnae": "4120400",
  "cnae_descricao": "Construção de edifícios",
  "porte": "EPP",
  "data_abertura_atividade": "20150310",
  "score_formula": 81.3,
  "score_ia": 74.0,
  "dimensions": [
    { "id": "longevidade", "label": "Longevidade", "score": 24, "max_score": 30, "detail": "10 anos de mercado" },
    { "id": "porte_capital", "label": "Porte + Capital", "score": 15, "max_score": 20, "detail": "EPP · R$ 250.000" },
    { "id": "estabilidade_societaria", "label": "Estabilidade Societária", "score": 17, "max_score": 20, "detail": "2 sócios PF, média 8 anos" },
    { "id": "regularidade_tributaria", "label": "Regularidade Tributária", "score": 15, "max_score": 15, "detail": "Simples ativo" },
    { "id": "completude_cadastral", "label": "Completude Cadastral", "score": 10, "max_score": 15, "detail": "Email e endereço presentes" }
  ],
  "hard_gates": [
    { "id": "situacao_cadastral", "label": "Situação Cadastral", "triggered": false, "multiplier": 1.0, "detail": "Empresa ATIVA" },
    { "id": "ceis", "label": "CEIS / CNEP", "triggered": false, "multiplier": 1.0, "detail": "Sem sanções federais" },
    { "id": "lista_suja", "label": "Lista Suja MTE", "triggered": false, "multiplier": 1.0, "detail": "Sem autuações MTE" }
  ],
  "red_flags": [
    { "severity": "info", "message": "Capital social de R$ 250.000 — adequado para EPP.", "source": "Receita Federal" }
  ],
  "parecer_ia": "Empresa com perfil sólido no setor de construção civil...",
  "conflito_cnae": null,
  "fontes_dados": ["Receita Federal", "Portal da Transparência", "MTE — Lista Suja"]
}
```

---

## Observações Técnicas Importantes

| Atenção | Detalhe |
|---|---|
| Encoding dos CSVs | Latin-1 → usar `encoding='latin-1'` no `open()` |
| Capital social | Substituir `,` por `.` antes de `float()` |
| CNPJ como texto | Nunca converter para `int` — zeros à esquerda são significativos |
| `cnpj_basico` | São os 8 primeiros dígitos do CNPJ de 14 |
| Matriz vs Filial | Filtrar `identificador_mf = '1'` para pegar só a matriz |
| Datas | Formato `AAAAMMDD`, `00000000` = não informada |
| API Transparência | Requer header `chave-de-api` + cadastro gratuito |
| DeepSeek timeout | Definir `timeout=30s` — respostas podem demorar |
| Paralelismo | Usar `asyncio.gather()` para rodar consultas externas juntas |
