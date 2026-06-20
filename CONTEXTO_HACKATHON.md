# Hackathon de IA — Liga de TI PUC-Campinas × wehandle

> **Data: 20/06/2025 (HOJE) · 9h–19h · Av. Alan Turing, 776, 3º Andar, Prédio Núcleo – Unicamp, Campinas/SP**

---

## Equipe: MRSBlueTeam (Equipe #1)

| Integrante | Papel |
|---|---|
| Guilherme de Medeiros | **Líder** |
| Daniel Vieira Fernandes | Membro |
| Thiago Severo | Membro |
| Vinicius De Medeiros Ellena | Membro |

---

## Cronograma do Dia

| Horário | Atividade |
|---|---|
| 09h00–09h30 | Credenciamento + brindes |
| 09h30–10h00 | Abertura oficial (Liga de TI + wehandle) |
| **10h00–10h30** | **Tema oficial revelado aqui** |
| 10h30–13h00 | Desenvolvimento – Bloco 1 |
| 13h00–14h00 | Almoço (preencher formulário obrigatório no link fornecido) |
| 14h00–17h00 | Desenvolvimento – Bloco 2 |
| **17h00** | **FREEZE DE CÓDIGO — nenhum commit após esse horário** |
| 17h00–17h15 | Envio do formulário final (commit hash + links) |
| **17h15–17h30** | **Apresentação MRSBlueTeam (VOCÊS — PRIMEIROS!)** |
| 17h30–18h45 | Apresentações Equipes 2–6 |
| 18h45–19h00 | Fechamento de notas, deliberação e premiação |

> A versão avaliada pelos jurados é **obrigatoriamente o commit hash enviado no formulário até 17h15**.

---

## Critérios de Avaliação (100 pts)

| Critério | Pontos | O que avaliam |
|---|---|---|
| Aderência ao Desafio | 20 | Responde diretamente à dor do briefing; problema bem compreendido |
| Uso de IA | 20 | IA no centro da solução; modelos, prompts, automações, raciocínio assistido |
| Funcionalidade e Demo | 20 | App funciona, demo estável, fluxo principal testável; além do conceitual |
| Impacto e Negócio | 15 | Valor real, viabilidade de mercado, público-alvo claro, escalabilidade |
| Inovação | 15 | Originalidade, criatividade, uso diferenciado das tecnologias |
| Apresentação | 10 | Clareza, didática, objetividade, controle do tempo |

**Desempate (nessa ordem):** Uso de IA > Funcionalidade e Demo > Aderência ao Desafio > decisão conjunta da banca.

---

## Apresentação: Estrutura dos 15 Minutos

- **10 min** — Pitch: problema, proposta de valor + demo ao vivo funcionando
- **3 min** — Perguntas da banca avaliadora
- **2 min** — Transição técnica (troca de equipe, ajustes)

> Controle de tempo **rígido** — ao completar 10 min a equipe deve encerrar imediatamente.

---

## Premiações

### 1º Lugar
- Acesso direto à **etapa final do processo seletivo de estágio** na wehandle (possibilidade de contratação imediata)
- **Kit de Destaque Exclusivo** para cada integrante
- **Mentoria de 3 meses com um CTO** (1 sessão/mês)
- **Assinatura Claude PRO subsidiada** (para integrantes aprovados no estágio)

### Todos os participantes
- Certificado oficial de conclusão do Hackathon de IA

---

## Infraestrutura Fornecida

- Créditos de IA da wehandle (1 membro da equipe recebe acesso direto)
- Coffee break durante todo o evento + almoço no Kairos
- Wi-Fi dedicado de alta velocidade
- Pontos de energia nas bancadas
- Auditório com projetor e som para as apresentações
- Crachás de identificação para todos os integrantes

## O Que Levar (Obrigatório)
- Notebook + carregador e adaptadores
- Documento de identidade original com foto (RG, CNH ou Passaporte)
- Comprovante de aprovação da plataforma do evento

---

---

# Dicionário de Dados — CNPJ Receita Federal

> Fonte: **Receita Federal do Brasil** (dados abertos, atualização mensal)
> Documentação técnica wehandle · 19/06/2026

---

## Características Gerais dos Arquivos

| Característica | Valor |
|---|---|
| Formato | CSV texto, **sem linha de cabeçalho** |
| Separador de campos | `;` (ponto e vírgula) |
| Delimitador de texto | `"` (aspas duplas em todos os campos) |
| Encoding | **ISO-8859-1 / Latin-1** (não é UTF-8) |
| Separador decimal | `,` (vírgula) — ex.: `120000000000,00` |
| Datas | Texto `AAAAMMDD` (ex.: `20170210`). Valor `00000000` = data não informada |
| Compactação | `.zip` (cada zip contém 1 arquivo sem extensão `.csv` explícita) |

### Pontos de Atenção Críticos
- **Todos os códigos** (CNPJ, CNAE, município, natureza jurídica) devem ser tratados como **texto** — possuem zeros à esquerda significativos
- **Encoding Latin-1**: converter antes de processar para evitar corrupção de caracteres acentuados
- **Capital social usa vírgula** como separador decimal — tratar antes de operações numéricas
- CPFs dos sócios vêm **mascarados** (ex.: `***240659**`) por proteção à LGPD

### Convenção de Nomes dos Arquivos
```
K3241.K03200Y1.D60613.EMPRECSV
                ↑ data (AA MM DD = 2026-06-13)
                              ↑ tipo do arquivo
```
Sufixos: `EMPRECSV` (Empresas), `ESTABELE` (Estabelecimentos), `SOCIOCSV` (Sócios), `SIMPLES.CSV` (Simples), `CNAECSV`, `MOTICSV`, `MUNICCSV`, `NATJUCSV`, `PAISCSV`, `QUALSCSV`

Os conjuntos **Empresas, Estabelecimentos, Simples e Sócios** são particionados em vários volumes (ex.: `Empresas0.zip` ... `Empresas9.zip`) — layout idêntico entre todos; basta concatenar após a carga.

---

## Ordem Recomendada de Carga

1. **Tabelas de domínio** (pequenas): Cnaes, Motivos, Municipios, Naturezas, Paises, Qualificacoes
2. **Entidades principais**: Empresas → Estabelecimentos → Simples → Sócios
3. **Criar índices** sobre `cnpj_basico` em todas as tabelas *após* a carga

> Para grandes volumes (Estabelecimentos e Simples são os maiores), usar banco relacional ou engine analítica — não carregar tudo em memória.

---

## Arquivos Principais (Entidades)

### 4.1 EMPRESAS — `*.EMPRECSV` (7 colunas)
> Dados ao nível da **matriz/raiz do CNPJ** (8 primeiros dígitos). Uma linha por empresa.

| # | Coluna | Tipo | Descrição |
|---|---|---|---|
| 1 | `cnpj_basico` | texto(8) | Raiz do CNPJ (8 dígitos). **Chave principal (PK)** |
| 2 | `razao_social` | texto | Nome empresarial / razão social |
| 3 | `natureza_juridica` | texto(4) | Código → tabela **Naturezas** |
| 4 | `qualificacao_responsavel` | texto(2) | Qualificação da pessoa física responsável → tabela **Qualificacoes** |
| 5 | `capital_social` | numérico | Capital social (decimal com vírgula) |
| 6 | `porte_empresa` | texto(2) | `00`=Não informado, `01`=ME, `03`=EPP, `05`=Demais |
| 7 | `ente_federativo_responsavel` | texto | Preenchido para órgãos públicos; em geral vazio |

---

### 4.2 ESTABELECIMENTOS — `*.ESTABELE` (30 colunas)
> O arquivo mais rico. Uma linha por **estabelecimento** (matriz e cada filial).
> **CNPJ completo 14 dígitos** = `cnpj_basico` + `cnpj_ordem` + `cnpj_dv`

| # | Coluna | Tipo | Descrição |
|---|---|---|---|
| 1 | `cnpj_basico` | texto(8) | Raiz do CNPJ. **FK → Empresas** |
| 2 | `cnpj_ordem` | texto(4) | Número de ordem (`0001`=matriz) |
| 3 | `cnpj_dv` | texto(2) | Dígitos verificadores do CNPJ |
| 4 | `identificador_matriz_filial` | texto(1) | `1`=Matriz, `2`=Filial |
| 5 | `nome_fantasia` | texto | Nome fantasia |
| 6 | `situacao_cadastral` | texto(2) | `01`=Nula, `02`=Ativa, `03`=Suspensa, `04`=Inapta, `08`=Baixada |
| 7 | `data_situacao_cadastral` | data | Data do evento da situação cadastral |
| 8 | `motivo_situacao_cadastral` | texto(2) | Código → tabela **Motivos** |
| 9 | `nome_cidade_exterior` | texto | Cidade no exterior (se aplicável) |
| 10 | `pais` | texto(3) | Código do país → tabela **Paises** |
| 11 | `data_inicio_atividade` | data | Data de abertura do estabelecimento |
| 12 | `cnae_fiscal_principal` | texto(7) | CNAE principal → tabela **Cnaes** |
| 13 | `cnae_fiscal_secundaria` | texto | Lista de CNAEs secundários separados por vírgula |
| 14 | `tipo_logradouro` | texto | Ex.: RUA, AVENIDA |
| 15 | `logradouro` | texto | Nome do logradouro |
| 16 | `numero` | texto | Número (pode ser "S/N") |
| 17 | `complemento` | texto | Complemento do endereço |
| 18 | `bairro` | texto | Bairro |
| 19 | `cep` | texto(8) | CEP |
| 20 | `uf` | texto(2) | Sigla da Unidade Federativa |
| 21 | `municipio` | texto(4) | Código do município (**código RF, não IBGE**) → tabela **Municipios** |
| 22 | `ddd_1` | texto | DDD do telefone 1 |
| 23 | `telefone_1` | texto | Telefone 1 |
| 24 | `ddd_2` | texto | DDD do telefone 2 |
| 25 | `telefone_2` | texto | Telefone 2 |
| 26 | `ddd_fax` | texto | DDD do fax |
| 27 | `fax` | texto | Fax |
| 28 | `correio_eletronico` | texto | E-mail |
| 29 | `situacao_especial` | texto | Situação especial (ex.: falência, recuperação) |
| 30 | `data_situacao_especial` | data | Data da situação especial |

---

### 4.3 SÓCIOS — `*.SOCIOCSV` (11 colunas)
> Quadro societário. Uma linha por **sócio** vinculado a um `cnpj_basico`.

| # | Coluna | Tipo | Descrição |
|---|---|---|---|
| 1 | `cnpj_basico` | texto(8) | Raiz do CNPJ. **FK → Empresas** |
| 2 | `identificador_socio` | texto(1) | `1`=Pessoa Jurídica, `2`=Pessoa Física, `3`=Estrangeiro |
| 3 | `nome_socio_razao_social` | texto | Nome do sócio (PF) ou razão social (PJ) |
| 4 | `cnpj_cpf_socio` | texto | CNPJ/CPF do sócio. CPF vem **mascarado** (`***NNNNNN**`) |
| 5 | `qualificacao_socio` | texto(2) | Qualificação do sócio → tabela **Qualificacoes** |
| 6 | `data_entrada_sociedade` | data | Data de entrada na sociedade |
| 7 | `pais` | texto(3) | País do sócio (se estrangeiro) → tabela **Paises** |
| 8 | `representante_legal` | texto | CPF do representante legal (mascarado) |
| 9 | `nome_representante` | texto | Nome do representante legal |
| 10 | `qualificacao_representante_legal` | texto(2) | Qualificação do representante → tabela **Qualificacoes** |
| 11 | `faixa_etaria` | texto(1) | `1`=0-12, `2`=13-20, `3`=21-30, `4`=31-40, `5`=41-50, `6`=51-60, `7`=61-70, `8`=71-80, `9`=≥80, `0`=não se aplica |

---

### 4.4 SIMPLES NACIONAL — `*.SIMPLES.CSV` (7 colunas)
> Opção pelo Simples Nacional e MEI, ao nível da raiz do CNPJ.

| # | Coluna | Tipo | Descrição |
|---|---|---|---|
| 1 | `cnpj_basico` | texto(8) | Raiz do CNPJ. **FK → Empresas** |
| 2 | `opcao_pelo_simples` | texto(1) | `S`=optante, `N`=não optante, vazio=outros |
| 3 | `data_opcao_simples` | data | Data de entrada no Simples |
| 4 | `data_exclusao_simples` | data | Data de saída do Simples |
| 5 | `opcao_pelo_mei` | texto(1) | `S`=optante MEI, `N`=não |
| 6 | `data_opcao_mei` | data | Data de entrada no MEI |
| 7 | `data_exclusao_mei` | data | Data de saída do MEI |

---

## Arquivos de Domínio (Tabelas de Tradução)
> Arquivos pequenos com 2 colunas: `codigo` (texto) e `descricao` (texto).

| Arquivo | Conteúdo | Usado por |
|---|---|---|
| `*.CNAECSV` | Código CNAE (7 díg.) → descrição da atividade econômica | Estabelecimentos (`cnae_fiscal_principal`, `cnae_fiscal_secundaria`) |
| `*.MOTICSV` | Código → motivo da situação cadastral | Estabelecimentos (`motivo_situacao_cadastral`) |
| `*.MUNICCSV` | Código RF (4 díg.) → nome do município | Estabelecimentos (`municipio`) |
| `*.NATJUCSV` | Código (4 díg.) → natureza jurídica | Empresas (`natureza_juridica`) |
| `*.PAISCSV` | Código (3 díg.) → nome do país | Estabelecimentos (`pais`), Sócios (`pais`) |
| `*.QUALSCSV` | Código (2 díg.) → qualificação de sócio/responsável | Empresas, Sócios |

> **Atenção:** o código de `municipio` em Estabelecimentos é o **código próprio da Receita Federal**, que **difere do código IBGE**. Para cruzar com bases do IBGE é necessária uma tabela de-para adicional (não inclusa neste conjunto).

---

## Modelo de Relacionamento entre os Arquivos

```
                  EMPRESAS
                  PK: cnpj_basico
                       |
              cnpj_basico (1:N)
           ┌────────────┼─────────────┐
           ▼            ▼             ▼
  ESTABELECIMENTOS    SOCIOS        SIMPLES
  (1:N por empresa)  (1:N por      (1:1 por
  CNPJ completo =    empresa)       empresa)
  basico+ordem+dv

Tabelas de domínio (lookup por código):
  Naturezas    →  Empresas.natureza_juridica
  Qualificacoes → Empresas.qualificacao_responsavel,
                  Socios.qualificacao_socio,
                  Socios.qualificacao_representante_legal
  Cnaes        →  Estabelecimentos.cnae_fiscal_principal / cnae_fiscal_secundaria
  Motivos      →  Estabelecimentos.motivo_situacao_cadastral
  Municipios   →  Estabelecimentos.municipio
  Paises       →  Estabelecimentos.pais, Socios.pais
```

### Regras de Cruzamento

- **Empresas → Estabelecimentos:** relação `1:N` por `cnpj_basico`. Para reconstruir o CNPJ completo de 14 dígitos: `cnpj_basico + cnpj_ordem + cnpj_dv` (só existe no arquivo de Estabelecimentos)
- **Empresas → Sócios:** relação `1:N` por `cnpj_basico`. Uma empresa pode ter vários sócios
- **Empresas → Simples:** relação `1:1` por `cnpj_basico` — indica opção pelo Simples/MEI
- **Granularidade:** Empresas, Sócios e Simples estão no nível da **raiz (8 dígitos)**; Estabelecimentos está no nível do **estabelecimento (14 dígitos)** — não duplicar empresas ao agregar com múltiplos estabelecimentos

---

## Resumo Estratégico para o Hackathon

| O que o dado permite fazer | Campos-chave |
|---|---|
| Identificar empresas ativas em um setor | `situacao_cadastral=02` + `cnae_fiscal_principal` |
| Filtrar por porte/regime tributário | `porte_empresa` + `opcao_pelo_simples` |
| Localizar geograficamente | `uf`, `municipio`, `cep`, endereço completo |
| Analisar quadro societário / age dos sócios | `identificador_socio`, `faixa_etaria`, `data_entrada_sociedade` |
| Histórico de abertura/baixa | `data_inicio_atividade`, `data_situacao_cadastral` |
| Empresas em situação especial (falência etc.) | `situacao_especial`, `data_situacao_especial` |
| Contato direto | `correio_eletronico`, `telefone_1`, `ddd_1` |
