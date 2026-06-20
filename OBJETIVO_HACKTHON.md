PROBLEMA: Criar um score de conformidade para empresas com base em dados públicos. Os dados abertos da Receita Federal pode servir como base, mas os grupos podem trazer outros dados para compor o score.

SOLUÇÃO:

1 - Criar uma fórmula para definir uma pontuação que determine a confiança da empresa
de acordo com dados.

2 - ( Diferencial ) Nessa fórmula, teremos parâmetros que serão customizáveis
e treinados por uma rede neural, assim podemos treinar com os dados existentes

3 - ( Diferencial ) Criar uma plataforma ( API e Front End) para mostrar
o score funcionando, além de customizar parâmetros e ver a rede neural sendo treinada

---------------------------------------------------------------
Fluxo da Solução
-> passa o CNPJ da empresa/Fornecedor + documentos variados
e não definidos + passa o que o cliente quer ( um texto )
-> análise e geração do score de acordo com os pesos pré setados 
na plataforma
-> é gerado dois scores, um da IA/LLM contextual e outro
score gerado pela fórmula parametrizada, gerar red flags
com sites de consumidor.gov.br
-> gera a análise com exportação de PDF

----------------------------------------------------------------
-- Onde vamos procurar:
Portal da Transparência — CEIS e CNEP (impacto altíssimo)
O que é: Cadastro de Empresas Inidôneas e Suspensas (CEIS) + Cadastro Nacional de Empresas Punidas (CNEP)
Por que usar: Se a empresa está no CEIS, ela está impedida de contratar com o governo federal. É o red flag mais poderoso que existe para conformidade B2B.
GET https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado={cnpj}
GET https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cnpjSancionado={cnpj}

Portal da Transparência — Contratos com governo (sinal positivo)

Cadastro de Empregadores — Lista Suja do Trabalho Escravo
O que é: Ministério do Trabalho — empresas autuadas por trabalho análogo à escravidão

Disponível como CSV público atualizado periodicamente
No score: Hard Gate — empresa na lista → multiplicador × 0.0
Download direto no site do MTE, pode pré-carregar na base

IBGE API — Contexto econômico do município

GET https://servicodados.ibge.gov.br/api/v3/agregados/47001/periodos/2021/variaveis/37?localidades=N6[{cod_municipio_ibge}]
PIB per capita, população, setor econômico predominante do município
Contextualiza o porte da empresa em relação à sua região
No score: fator de contexto regional (empresa grande em município pequeno = mais relevante)


------------------------------------------------------------------

quero fazer uma fórmula que tenha os paâmetros diversos e pesos para cada um, e esse peso podemos zerar caso a gente não queira incluir na pesagem para o score final

----------------------------------------------------------------

Critérios que vão entrar na fórmula
Longevidade (Tempo de Mercado (Experiência))
Porte + Capital
Estabilidade societária
Regularidade tributária
Completude cadastral
Protestos em Cartório e Dívida Ativa


Critérios semânticos
CNAE


Stack escolhida

Front: Vite

Back: Python -> FastAPI




