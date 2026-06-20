Aqui estão as ideias de como você pode estruturar as telas e a jornada do usuário no seu MVP:

### 1. Tela Inicial: A "Mesa de Operações" (Busca e Parametrização)

A primeira tela precisa passar a sensação de poder e controle. O usuário não está apenas "dando um Google" no CNPJ; ele está configurando uma auditoria.

* **A Busca Central (O Input):** * Um campo principal em destaque para o **CNPJ**.
* Logo abaixo, uma caixa de texto (textarea) para o **Contexto da Contratação** (Ex: *"Preciso contratar esta empresa para desenvolver um software financeiro sensível por 12 meses"*). É aqui que a LLM vai brilhar.
* Uma área de "Arrastar e Soltar" (Drag & Drop) opcional para **Documentos Adicionais** (ex: balanço patrimonial em PDF, formulários assinados).


* **Painel de Calibragem (Os Pesos da Fórmula):**
* Ao lado ou logo abaixo da busca, você coloca os "Sliders" (barras deslizantes) para cada critério que você listou: *Longevidade, Porte+Capital, Estabilidade Societária, Regularidade, Completude e Protestos*.
* **A Grande Sacada:** Cada Slider deve ter um botão de "Ligar/Desligar" (Toggle). Se o usuário desligar "Protestos", o peso vai a zero e o motor recalcula a fórmula redistribuindo os 100% apenas entre os critérios ativos.



### 2. Tela de Transição: O "Motor Trabalhando" (UX Crucial)

Como o seu sistema vai bater em várias APIs (Portal da Transparência, IBGE, Receita Federal, Consumidor.gov) e ainda rodar uma LLM, isso não será instantâneo.

* **Ideia:** Não use apenas um "ícone rodando". Mostre ao usuário o que está acontecendo, mas de exemplo
* *Exemplo visual na tela:* * ✅ Consultando Receita Federal...
* ✅ Cruzando dados de PIB do IBGE...
* ⏳ Verificando Lista Suja do Trabalho Escravo...
* ⏳ Analisando semântica do CNAE com a IA...


* Isso diminui a ansiedade da espera e agrega muito valor percebido ao seu produto. O cliente sente que o sistema está trabalhando pesado para ele.

### 3. O Dashboard de Resultados (A Entrega de Valor)

Esta é a tela principal do MVP. A informação precisa ser hierárquica para não sobrecarregar o usuário.

Score do lado direito em cima bem grande

* **O Topo: Identificação e "Hard Gates" (Red Flags)**
* Nome da Empresa, CNPJ e um selo de porte/contexto (ex: "Empresa de Médio Porte em Região de Alto PIB", gerado pelos dados do IBGE).
* **A Faixa de Risco:** Se a empresa estiver no CEIS, CNEP ou na Lista Suja do Trabalho Escravo, o topo da tela deve ficar vermelho imediatamente com o selo **VETO RECOMENDADO**. O Score é zerado (`multiplicador x 0.0`).


* **O Meio: O Duelo dos Scores (Visor Duplo)**
* **Lado Esquerdo (Score Analítico/Fórmula):** Um gráfico de velocímetro ou círculo mostrando a nota de 0 a 1000 baseada nos pesos que o usuário escolheu. Abaixo dele, mini-barras mostrando o desempenho em cada critério (ex: Longevidade: 9/10, Capital: 4/10).
* **Lado Direito (Score IA/Semântico):** Outro visor mostrando a nota da IA. Junto com a nota, um pequeno parágrafo gerado pela LLM explicando o raciocínio. *Exemplo: "O CNAE principal é de 'Comércio de Roupas', o que entra em conflito com o texto da contratação que pede 'Desenvolvimento de Software'."*


* **O Fundo: Alertas de Consumidor e Ação**
* Uma seção puxando os dados do Consumidor.gov.br (Índice de solução de problemas e reclamações ativas).
* Um botão grande e visível no canto superior direito ou no rodapé: **"Exportar Parecer (PDF)"**.



### Como isso ajuda no Treinamento da Rede Neural (Seu Diferencial 2)

Na própria tela de resultado, você pode colocar um recurso de "Feedback do Usuário".

* Uma pergunta simples: *"Esse score reflete a realidade do mercado?" [ 👍 Sim ] [ 👎 Não, a nota deveria ser menor ]*.
* A cada vez que um cliente (ou sua equipe interna) ajusta os pesos na Tela Inicial para "corrigir" um score ou dá um feedback na tela de Resultados, esses dados (Inputs escolhidos vs. Resultado esperado) são salvos no banco de dados. Essa base histórica é exatamente o que você usará para treinar a sua rede neural futuramente, ensinando-a a calibrar os pesos sozinha dependendo do setor.