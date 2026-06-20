# Campos do CNPJ Receita Federal — Referência de Uso

> Mapeamento de todos os campos das 4 tabelas principais + domínios,
> com indicação de uso no score, exibição na UI ou input para o LLM.

---

## EMPRESAS (`*.EMPRECSV`) — 7 colunas

| Campo | Tipo | Usado para | Dimensão |
|---|---|---|---|
| `cnpj_basico` | texto(8) | Chave de join com todas as tabelas | — |
| `razao_social` | texto | Exibição do nome da empresa | UI |
| `natureza_juridica` | texto(4) | Exibição via tabela Naturezas | UI |
| `capital_social` | numérico | Cálculo do score | **D2** |
| `porte_empresa` | texto(2) | Cálculo do score | **D2** |
| `qualificacao_responsavel` | texto(2) | Não utilizado | — |
| `ente_federativo_responsavel` | texto | Não utilizado | — |

**Valores de `porte_empresa`:**
- `00` = Não informado
- `01` = Micro Empresa (ME)
- `03` = Empresa de Pequeno Porte (EPP)
- `05` = Demais (Médio/Grande)

---

## ESTABELECIMENTOS (`*.ESTABELE`) — 30 colunas

| Campo | Tipo | Usado para | Dimensão |
|---|---|---|---|
| `cnpj_basico` | texto(8) | FK → join com Empresas | — |
| `cnpj_ordem` | texto(4) | Montar CNPJ completo 14 dígitos | UI |
| `cnpj_dv` | texto(2) | Montar CNPJ completo 14 dígitos | UI |
| `identificador_matriz_filial` | texto(1) | Filtrar somente a matriz (`1`) para o score | Filtro |
| `nome_fantasia` | texto | Exibição + pontuação se preenchido | D5 + UI |
| `situacao_cadastral` | texto(2) | **HARD GATE 1** — multiplica o score inteiro | Gate |
| `data_situacao_cadastral` | data | Exibição do evento da situação | UI |
| `motivo_situacao_cadastral` | texto(2) | Exibição via tabela Motivos (red flag) | UI |
| `nome_cidade_exterior` | texto | Não utilizado | — |
| `pais` (estabelecimento) | texto(3) | Não utilizado | — |
| `data_inicio_atividade` | data | **Campo mais importante do score** | **D1** |
| `cnae_fiscal_principal` | texto(7) | Pontuação + exibição via tabela Cnaes | D5 + UI |
| `cnae_fiscal_secundaria` | texto | Exibição das atividades secundárias | UI |
| `tipo_logradouro` | texto | Não utilizado | — |
| `logradouro` | texto | Parte do endereço completo | **D5** |
| `numero` | texto | Parte do endereço completo | **D5** |
| `complemento` | texto | Não utilizado | — |
| `bairro` | texto | Exibição | UI |
| `cep` | texto(8) | Parte do endereço completo | **D5** |
| `uf` | texto(2) | Exibição + filtro geográfico | UI |
| `municipio` | texto(4) | Exibição via tabela Municipios | UI |
| `ddd_1` | texto | Pontuação se preenchido (com telefone_1) | **D5** |
| `telefone_1` | texto | Pontuação se preenchido | **D5** |
| `ddd_2` | texto | Exibição | UI |
| `telefone_2` | texto | Exibição | UI |
| `ddd_fax` | texto | Não utilizado | — |
| `fax` | texto | Não utilizado | — |
| `correio_eletronico` | texto | Pontuação se preenchido | **D5** |
| `situacao_especial` | texto | **HARD GATE 2** — multiplica o score inteiro | Gate |
| `data_situacao_especial` | data | Exibição do red flag | UI |

**Valores de `situacao_cadastral`:**
- `01` = Nula → multiplicador `× 0.05`
- `02` = Ativa → multiplicador `× 1.00`
- `03` = Suspensa → multiplicador `× 0.40`
- `04` = Inapta → multiplicador `× 0.15`
- `08` = Baixada → multiplicador `× 0.00` (score = 0)

**Valores de `identificador_matriz_filial`:**
- `1` = Matriz
- `2` = Filial

> O CNPJ completo de 14 dígitos é construído concatenando:
> `cnpj_basico` + `cnpj_ordem` + `cnpj_dv`

---

## SÓCIOS (`*.SOCIOCSV`) — 11 colunas

| Campo | Tipo | Usado para | Dimensão |
|---|---|---|---|
| `cnpj_basico` | texto(8) | FK → join com Empresas | — |
| `identificador_socio` | texto(1) | Composição societária (PF/PJ/Estrangeiro) | **D3** |
| `nome_socio_razao_social` | texto | Exibição da lista de sócios | UI |
| `cnpj_cpf_socio` | texto | Não utilizado (CPF mascarado por LGPD) | — |
| `qualificacao_socio` | texto(2) | Exibição via tabela Qualificacoes | UI |
| `data_entrada_sociedade` | data | Tempo médio dos sócios na empresa | **D3** |
| `pais` (sócio) | texto(3) | Detecção de sócios estrangeiros | **D3** |
| `representante_legal` | texto | Não utilizado (CPF mascarado) | — |
| `nome_representante` | texto | Não utilizado | — |
| `qualificacao_representante_legal` | texto(2) | Não utilizado | — |
| `faixa_etaria` | texto(1) | Exibição / input para o LLM | UI/LLM |

**Valores de `identificador_socio`:**
- `1` = Pessoa Jurídica
- `2` = Pessoa Física
- `3` = Estrangeiro

**Valores de `faixa_etaria`:**
- `0` = Não se aplica
- `1` = 0–12 anos
- `2` = 13–20 anos
- `3` = 21–30 anos
- `4` = 31–40 anos
- `5` = 41–50 anos
- `6` = 51–60 anos
- `7` = 61–70 anos
- `8` = 71–80 anos
- `9` = acima de 80 anos

---

## SIMPLES NACIONAL (`*.SIMPLES.CSV`) — 7 colunas

| Campo | Tipo | Usado para | Dimensão |
|---|---|---|---|
| `cnpj_basico` | texto(8) | FK → join com Empresas | — |
| `opcao_pelo_simples` | texto(1) | Optante ativo pelo Simples | **D4** |
| `data_opcao_simples` | data | Consistência do registro | **D4** |
| `data_exclusao_simples` | data | Exclusão recente = red flag | **D4** |
| `opcao_pelo_mei` | texto(1) | Penalidade para contratos B2B grandes | **D4** |
| `data_opcao_mei` | data | Exibição | UI |
| `data_exclusao_mei` | data | Exibição | UI |

**Valores de `opcao_pelo_simples`:**
- `S` = Optante
- `N` = Não optante
- vazio = outros / não se aplica

**Valores de `opcao_pelo_mei`:**
- `S` = Optante MEI
- `N` = Não é MEI

---

## Tabelas de Domínio (tradução de códigos)

Cada tabela tem exatamente 2 colunas: `codigo` (texto) e `descricao` (texto).

| Arquivo | Traduz | Campo(s) que usa |
|---|---|---|
| `*.CNAECSV` | Código CNAE (7 dígitos) → descrição da atividade econômica | `cnae_fiscal_principal`, `cnae_fiscal_secundaria` |
| `*.MOTICSV` | Código → motivo da situação cadastral | `motivo_situacao_cadastral` |
| `*.MUNICCSV` | Código RF (4 dígitos) → nome do município | `municipio` |
| `*.NATJUCSV` | Código (4 dígitos) → natureza jurídica | `natureza_juridica` |
| `*.PAISCSV` | Código (3 dígitos) → nome do país | `pais` (sócios) |
| `*.QUALSCSV` | Código (2 dígitos) → qualificação de sócio/responsável | `qualificacao_socio` |

> **Atenção:** o código de `municipio` é o código próprio da Receita Federal, **diferente do código IBGE**.
> Para cruzar com bases geográficas do IBGE é necessária uma tabela de-para adicional.

---

## Resumo consolidado por uso

### Entram no cálculo do score

| Campo | Tabela | Dimensão |
|---|---|---|
| `situacao_cadastral` | ESTABELECIMENTOS | Hard Gate 1 |
| `situacao_especial` | ESTABELECIMENTOS | Hard Gate 2 |
| `data_inicio_atividade` | ESTABELECIMENTOS | D1 — Longevidade |
| `capital_social` | EMPRESAS | D2 — Porte e Capital |
| `porte_empresa` | EMPRESAS | D2 — Porte e Capital |
| `identificador_socio` | SÓCIOS | D3 — Estabilidade Societária |
| `data_entrada_sociedade` | SÓCIOS | D3 — Estabilidade Societária |
| `pais` | SÓCIOS | D3 — Estabilidade Societária |
| `opcao_pelo_simples` | SIMPLES | D4 — Regularidade Tributária |
| `opcao_pelo_mei` | SIMPLES | D4 — Regularidade Tributária |
| `data_exclusao_simples` | SIMPLES | D4 — Regularidade Tributária |
| `data_opcao_simples` | SIMPLES | D4 — Regularidade Tributária |
| `correio_eletronico` | ESTABELECIMENTOS | D5 — Completude Cadastral |
| `ddd_1` + `telefone_1` | ESTABELECIMENTOS | D5 — Completude Cadastral |
| `logradouro` + `numero` + `cep` | ESTABELECIMENTOS | D5 — Completude Cadastral |
| `cnae_fiscal_principal` | ESTABELECIMENTOS | D5 — Completude Cadastral |
| `nome_fantasia` | ESTABELECIMENTOS | D5 — Completude Cadastral |

### Entram na exibição (UI + input para o LLM)

| Campo | Tabela | Onde aparece |
|---|---|---|
| `razao_social` | EMPRESAS | Header do resultado |
| `natureza_juridica` | EMPRESAS | Card de informações (via Naturezas) |
| `cnpj_ordem` + `cnpj_dv` | ESTABELECIMENTOS | CNPJ formatado (XX.XXX.XXX/XXXX-XX) |
| `data_situacao_cadastral` | ESTABELECIMENTOS | Linha do tempo da empresa |
| `motivo_situacao_cadastral` | ESTABELECIMENTOS | Red flag detalhado (via Motivos) |
| `cnae_fiscal_principal` | ESTABELECIMENTOS | Atividade principal (via Cnaes) |
| `cnae_fiscal_secundaria` | ESTABELECIMENTOS | Atividades secundárias |
| `bairro`, `uf`, `municipio` | ESTABELECIMENTOS | Endereço completo (via Municipios) |
| `ddd_2` + `telefone_2` | ESTABELECIMENTOS | Contatos adicionais |
| `data_situacao_especial` | ESTABELECIMENTOS | Alerta de situação especial |
| `nome_socio_razao_social` | SÓCIOS | Lista de sócios |
| `qualificacao_socio` | SÓCIOS | Cargo do sócio (via Qualificacoes) |
| `faixa_etaria` | SÓCIOS | Perfil etário dos sócios |
| `data_opcao_mei` | SIMPLES | Histórico MEI |

---

## Observações técnicas de implementação

| Atenção | Detalhe |
|---|---|
| Encoding | Todos os arquivos são **ISO-8859-1 / Latin-1**, não UTF-8 — converter na leitura |
| Separador | `;` (ponto e vírgula), **não** vírgula |
| Cabeçalho | **Nenhum arquivo tem linha de cabeçalho** — mapear colunas por posição |
| Códigos como texto | CNPJ, CNAE, município e todos os códigos devem ser lidos como `string` — têm zeros à esquerda |
| Capital social | Usar vírgula como separador decimal — substituir por ponto antes de converter para float |
| Datas | Formato `AAAAMMDD` (string). Valor `00000000` = data não informada/vazia |
| Arquivos particionados | Empresas, Estabelecimentos, Simples e Sócios vêm em múltiplos volumes numerados — concatenar tudo antes de usar |
| Município ≠ IBGE | O código de município da RF é diferente do IBGE — não cruzar diretamente com dados geográficos |
| CPF mascarado | `cnpj_cpf_socio` e `representante_legal` vêm como `***NNNNNN**` — não usar para identificação |
