# Fórmula do Score de Conformidade — MRSBlueTeam

Score final de **0 a 100 pontos**, calculado em duas etapas:
1. Soma ponderada de 5 dimensões (0–100 pts cada)
2. Aplicação de multiplicadores por situações críticas (Hard Gates)

---

## Visão Geral

```
Score Final = Score_Dimensões × Multiplicador_Situação × Multiplicador_Especial
```

Onde:
```
Score_Dimensões = (D1 × W1) + (D2 × W2) + (D3 × W3) + (D4 × W4) + (D5 × W5)
```

Os pesos W1–W5 são **configuráveis pelo usuário** (diferencial da plataforma).
Valores padrão somam 100%.

---

## Etapa 0 — Hard Gates (Bloqueios Imediatos)

Aplicados **antes** de calcular qualquer dimensão. Se cair em algum, o score é multiplicado.

### Gate 1 — Situação Cadastral
> Campo: `ESTABELECIMENTOS.situacao_cadastral`

| Código | Descrição | Multiplicador |
|---|---|---|
| `02` | Ativa | `× 1.0` (sem penalidade) |
| `03` | Suspensa | `× 0.40` |
| `04` | Inapta | `× 0.15` |
| `01` | Nula | `× 0.05` |
| `08` | Baixada | `× 0.00` → score = 0 |

### Gate 2 — Situação Especial
> Campo: `ESTABELECIMENTOS.situacao_especial`

| Conteúdo | Multiplicador |
|---|---|
| Vazio / não informado | `× 1.0` |
| Recuperação Judicial / Extrajudicial | `× 0.45` |
| Falência | `× 0.05` → score efetivamente zerado |

> Os dois multiplicadores se aplicam juntos.
> Exemplo: empresa Suspensa + Recuperação Judicial = `× 0.40 × 0.45 = × 0.18`

---

## Etapa 1 — As 5 Dimensões

### D1 — Longevidade (peso padrão: 30%)
> Campo: `ESTABELECIMENTOS.data_inicio_atividade`

Mede há quanto tempo a empresa está operando. Empresas mais antigas têm histórico comprovado.

```
anos = (data_atual - data_inicio_atividade) em anos completos
```

| Anos de operação | Pontuação D1 |
|---|---|
| < 1 ano | 5 |
| 1 a < 2 anos | 15 |
| 2 a < 5 anos | 40 |
| 5 a < 10 anos | 65 |
| 10 a < 20 anos | 85 |
| ≥ 20 anos | 100 |

> Se `data_inicio_atividade = 00000000` (não informada): D1 = 0

---

### D2 — Porte e Capital Social (peso padrão: 20%)
> Campos: `EMPRESAS.porte_empresa` + `EMPRESAS.capital_social`

Dois sub-scores de 50 pts cada.

#### Sub-score A — Porte (50 pts)
> Campo: `EMPRESAS.porte_empresa`

| Código | Descrição | Pontos |
|---|---|---|
| `01` | Micro Empresa (ME) | 20 |
| `03` | Empresa de Pequeno Porte (EPP) | 40 |
| `05` | Demais (Médio/Grande) | 50 |
| `00` | Não informado | 10 |
| MEI (via Simples) | Microempreendedor Individual | 10 |

#### Sub-score B — Capital Social (50 pts)
> Campo: `EMPRESAS.capital_social` (converter vírgula → ponto antes)

| Capital Social (R$) | Pontos |
|---|---|
| < 1.000 | 5 |
| 1.000 a < 10.000 | 15 |
| 10.000 a < 100.000 | 30 |
| 100.000 a < 1.000.000 | 40 |
| ≥ 1.000.000 | 50 |

```
D2 = Sub-score_A + Sub-score_B  → normalizado para 0–100
```

---

### D3 — Estabilidade Societária (peso padrão: 20%)
> Campos: `SOCIOS.data_entrada_sociedade`, `SOCIOS.identificador_socio`, `SOCIOS.pais`

Avalia a estabilidade e consistência do quadro de sócios.

#### Sub-score A — Tempo médio dos sócios (60 pts)
```
tempo_medio = média de (data_atual - data_entrada_sociedade) para todos os sócios
```

| Tempo médio | Pontos |
|---|---|
| < 1 ano | 10 |
| 1 a < 2 anos | 20 |
| 2 a < 5 anos | 35 |
| 5 a < 10 anos | 50 |
| ≥ 10 anos | 60 |

#### Sub-score B — Composição societária (40 pts)

| Condição | Pontos |
|---|---|
| Todos sócios PF brasileiros | 40 |
| Mix de PF + PJ nacionais | 30 |
| Presença de sócios estrangeiros | 20 |
| Sócios apenas PJ (sem PF) | 15 |
| Nenhum sócio encontrado | 0 |

```
D3 = Sub-score_A + Sub-score_B  (já em escala 0–100)
```

---

### D4 — Regularidade Tributária (peso padrão: 15%)
> Campos: `SIMPLES.opcao_pelo_simples`, `SIMPLES.opcao_pelo_mei`,
> `SIMPLES.data_exclusao_simples`, `EMPRESAS.porte_empresa`

| Situação | Pontuação D4 |
|---|---|
| Optante Simples Nacional ativo (`S` + sem data de exclusão recente) | 100 |
| Não optante + porte `05` (grande empresa, fora do Simples por porte) | 100 |
| Não optante + porte `03` ou `01` (deveria ser Simples — yellow flag) | 50 |
| Optante MEI ativo | 45 |
| Excluído do Simples há < 2 anos | 30 |
| Excluído do Simples há ≥ 2 anos + não optante atual | 20 |
| Sem registro no Simples | 40 |

> **Penalidade adicional:** se `data_exclusao_simples` preenchida e `data_opcao_simples` vazia → D4 = 15 (dado inconsistente)

---

### D5 — Completude Cadastral (peso padrão: 15%)
> Campos de `ESTABELECIMENTOS`

Empresas com cadastro completo tendem a ser mais estruturadas e facilmente rastreáveis.

| Campo | Condição | Pontos |
|---|---|---|
| `correio_eletronico` | Preenchido e não vazio | 25 |
| `telefone_1` | Preenchido com DDD | 15 |
| `logradouro` + `numero` + `cep` | Todos preenchidos | 25 |
| `cnae_fiscal_principal` | Preenchido | 20 |
| `nome_fantasia` | Preenchido | 10 |
| `telefone_2` | Preenchido | 5 |

```
D5 = soma dos pontos acima  (máximo 100)
```

---

## Etapa 2 — Agregação Final

```python
# Pesos configuráveis (padrão)
W1 = 0.30  # Longevidade
W2 = 0.20  # Porte e Capital
W3 = 0.20  # Estabilidade Societária
W4 = 0.15  # Regularidade Tributária
W5 = 0.15  # Completude Cadastral

# Score das dimensões (0–100)
score_dimensoes = (D1 * W1) + (D2 * W2) + (D3 * W3) + (D4 * W4) + (D5 * W5)

# Multiplicadores (Hard Gates)
mult_situacao = gate_situacao_cadastral(situacao_cadastral)
mult_especial  = gate_situacao_especial(situacao_especial)

# Score final
score_final = score_dimensoes * mult_situacao * mult_especial
score_final = round(score_final, 1)  # 0.0 a 100.0
```

---

## Classificação do Score Final

| Score | Nível | Cor sugerida | Significado |
|---|---|---|---|
| 85–100 | Excelente | Verde escuro | Alta confiabilidade; indicado para contratos de qualquer porte |
| 70–84 | Bom | Verde | Confiável; verificação padrão recomendada |
| 50–69 | Regular | Amarelo | Aceitável com ressalvas; due diligence adicional |
| 30–49 | Baixo | Laranja | Alto risco; evitar contratos críticos |
| 0–29 | Crítico | Vermelho | Não recomendado; possível empresa problemática |

---

## Exemplo de Cálculo

**Empresa:** Construtora Alfa Ltda.
- Ativa há 8 anos → D1 = 65
- EPP + capital R$ 250k → D2 = 40 + 40 = 80 → norm. 80
- 2 sócios PF, média 7 anos → D3 = 50 + 40 = 90
- Optante Simples ativo → D4 = 100
- Email + telefone + endereço + CNAE preenchidos → D5 = 85

```
Score_Dimensões = (65×0.30) + (80×0.20) + (90×0.20) + (100×0.15) + (85×0.15)
               = 19.5 + 16.0 + 18.0 + 15.0 + 12.75
               = 81.25

Situação Cadastral: Ativa → × 1.0
Situação Especial: Vazia → × 1.0

Score Final = 81.25 × 1.0 × 1.0 = 81.3 → Nível: BOM
```

---

## Red Flags Automáticos (para o LLM processar)

Além do score, gerar alertas textuais quando:

| Condição | Alerta |
|---|---|
| `situacao_cadastral` ≠ 02 | "Empresa não está com situação ATIVA na Receita Federal" |
| `situacao_especial` preenchida | "Empresa em situação especial: {valor}" |
| `data_inicio_atividade` < 1 ano | "Empresa recém-constituída — menos de 1 ano de operação" |
| `capital_social` < 1.000 | "Capital social muito baixo (R$ {valor})" |
| `opcao_pelo_mei` = S | "Empresa cadastrada como MEI — verificar capacidade para contratos de grande porte" |
| Nenhum sócio na base | "Quadro societário não localizado na base pública" |
| `correio_eletronico` vazio | "Sem e-mail cadastrado na Receita Federal" |
| Sócios com tempo médio < 1 ano | "Quadro societário recente — possível mudança de controle" |

---

## O que o usuário pode customizar (diferencial da plataforma)

- **Pesos W1–W5** via sliders na interface
- **Perfis pré-definidos** de peso por contexto:
  - "Fornecedor de TI" → peso maior em completude e longevidade
  - "Prestador de Serviços" → peso maior em regularidade tributária
  - "Contrato de alto valor" → peso maior em porte e capital social
