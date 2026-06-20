CREATE TABLE IF NOT EXISTS empresas (
    cnpj_basico              TEXT PRIMARY KEY,
    razao_social             TEXT,
    natureza_juridica        TEXT,
    qualificacao_responsavel TEXT,
    capital_social           TEXT,
    porte_empresa            TEXT,
    ente_federativo          TEXT
);

CREATE TABLE IF NOT EXISTS estabelecimentos (
    cnpj_basico              TEXT,
    cnpj_ordem               TEXT,
    cnpj_dv                  TEXT,
    identificador_mf         TEXT,
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
    identificador_socio      TEXT,
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

CREATE TABLE IF NOT EXISTS cnaes       (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS municipios  (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS naturezas   (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS paises      (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS qualificacoes (codigo TEXT PRIMARY KEY, descricao TEXT);
CREATE TABLE IF NOT EXISTS motivos     (codigo TEXT PRIMARY KEY, descricao TEXT);

CREATE TABLE IF NOT EXISTS logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT    NOT NULL,          -- ISO-8601 UTC
    level       TEXT    NOT NULL,          -- error | warning | info
    service     TEXT    NOT NULL,          -- ai_service | cnpj_service | etc.
    operation   TEXT    NOT NULL,          -- nome da função/operação
    cnpj        TEXT,                      -- CNPJ sendo analisado (pode ser NULL)
    message     TEXT    NOT NULL,
    traceback   TEXT                       -- traceback completo (só em errors)
);

CREATE INDEX IF NOT EXISTS idx_estab_cnpj  ON estabelecimentos (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_socios_cnpj ON socios (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_logs_ts     ON logs (ts DESC);
