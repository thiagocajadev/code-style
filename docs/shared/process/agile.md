# Agile: organizar o trabalho em ciclos curtos

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Agile** (desenvolvimento ágil) é o nome que dezessete pessoas deram, em 2001, a um conjunto de ideias que já praticavam separadas. A aposta central: em software, o entendimento do problema muda enquanto o produto é construído, então vale mais entregar pedaços pequenos e ajustar a direção do que planejar tudo antes e seguir o plano.

O termo virou guarda-chuva para coisas diferentes. **Scrum** e **Kanban** são os dois métodos mais usados e resolvem problemas distintos. **Lean** é a origem de boa parte do vocabulário. **XP** (eXtreme Programming) trata das práticas de engenharia e está descrito em [`methodologies.md`](./methodologies.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **sprint** (ciclo de duração fixa) | Período fechado, de uma a quatro semanas, ao fim do qual existe algo utilizável |
| **backlog** (lista de trabalho pendente) | Itens ordenados por prioridade, com os de cima mais detalhados que os de baixo |
| **user story** (história de usuário) | Item de backlog escrito da perspectiva de quem vai usar, com critérios de aceite |
| **DoD** (Definition of Done · Definição de Pronto) | Acordo do time sobre o que precisa estar feito para um item contar como entregue |
| **WIP** (Work In Progress · Trabalho em Andamento) | Quantidade de itens começados e ainda não terminados |
| **lead time** (tempo de atendimento) | Intervalo entre o pedido entrar na lista e a entrega chegar ao usuário |
| **cycle time** (tempo de execução) | Intervalo entre alguém começar a trabalhar no item e a entrega |
| **velocity** (vazão do time) | Quantidade de trabalho que o time conclui por ciclo, usada para previsão |
| **Scrum** (método por ciclos fixos) | Papéis, reuniões e artefatos organizados em torno do sprint |
| **Kanban** (método de fluxo contínuo) | Quadro visível com limite de trabalho em andamento, sem ciclos fixos |
| **Lean** (redução de desperdício) | Abordagem vinda da manufatura, focada em remover trabalho que não gera valor |

## Referência rápida

| Método | Ritmo | Melhor para | Métrica principal |
|---|---|---|---|
| [Scrum](#scrum) | Ciclos fixos de uma a quatro semanas | Produto em construção, escopo negociável, time estável | Vazão por sprint |
| [Kanban](#kanban) | Fluxo contínuo, sem ciclo | Suporte, manutenção, demanda que chega sem aviso | Tempo de execução |
| [Lean](#lean) | Não define ritmo | Diagnóstico de onde o trabalho trava | Proporção de espera no tempo total |
| [Cascata](#waterfall) | Fases sequenciais | Requisito fixo por contrato, norma ou hardware | Aderência ao plano |

---

<a id="manifesto"></a>

## O Manifesto e os quatro valores

O manifesto é curto e a formulação importa: ele coloca dois lados em cada linha e diz qual pesa mais, sem descartar o outro.

| Vale mais | Do que | O que isso significa na prática |
|---|---|---|
| Indivíduos e interações | Processos e ferramentas | Uma conversa de dez minutos resolve o que três dias de troca de tíquete não resolvem |
| Software funcionando | Documentação abrangente | A medida de progresso é o que roda, e não o que foi descrito |
| Colaboração com o cliente | Negociação de contrato | O escopo é revisto quando o entendimento muda, sem virar disputa |
| Responder a mudanças | Seguir um plano | O plano orienta e é atualizado quando a realidade discorda |

A leitura errada mais comum é tratar a coluna da direita como proibida. Documentação, contrato, processo e plano continuam existindo. O manifesto diz o que fazer quando os dois entram em conflito.

Os doze princípios que acompanham o manifesto detalham essas quatro linhas. Três deles guiam a maior parte das decisões do dia a dia: entregar valor cedo e com frequência, aceitar mudança de requisito mesmo tarde no desenvolvimento, e manter um ritmo que o time consiga sustentar por tempo indeterminado.

<a id="user-stories"></a>

## Como um item de trabalho é escrito

O item de backlog é onde o método encosta no trabalho real. Ele descreve o que precisa existir e como saber que ficou pronto, deixando a decisão técnica para quem vai implementar.

<details>
<summary>❌ Ruim: a tarefa descreve a solução técnica e não diz quando parar</summary>

```
Implementar endpoint POST /orders com validação de CPF
e integração com o gateway de pagamento.

Estimativa: 8 pontos
```

A tarefa já escolheu a solução, e ninguém sabe para quem ela serve. Não existe critério para recusar a entrega numa revisão, porque não existe critério nenhum. Se o time descobrir no meio que outro caminho resolve melhor, mudar a tarefa parece desvio de escopo.

</details>

<details>
<summary>✅ Bom: a história diz quem, o quê e por quê, com critérios verificáveis</summary>

```
Como cliente da loja, quero finalizar a compra com cartão
para receber o pedido sem precisar falar com o atendimento.

Critérios de aceite
- Compra com cartão válido gera o pedido e debita o valor total
- Cartão recusado mostra o motivo e mantém o carrinho intacto
- Pedido criado aparece em "meus pedidos" em até 5 segundos
```

Os três critérios dizem quando a história termina, e qualquer pessoa do time consegue conferir. A escolha do provedor de pagamento continua sendo decisão técnica, e pode mudar sem invalidar a história.

</details>

<a id="definition-of-done"></a>

## Definição de pronto

Sem um acordo escrito, "pronto" significa coisas diferentes para quem desenvolve, quem revisa e quem recebe. O item volta da revisão, e a discussão passa a ser sobre o que estava combinado.

<details>
<summary>❌ Ruim: pronto quer dizer que o código foi integrado</summary>

```
Pronto = código na main
```

Testes, revisão, migração de banco e observabilidade ficam de fora do acordo, e cada um deles reaparece depois como trabalho não previsto. A vazão do time parece alta durante o sprint e cai quando as pendências chegam juntas.

</details>

<details>
<summary>✅ Bom: o acordo cobre tudo que separa o código do usuário</summary>

```
Um item está pronto quando:
- Os critérios de aceite passam em ambiente de homologação
- Existe teste automatizado para o caminho feliz e para a recusa
- A revisão de código foi aprovada por outra pessoa
- A migração de banco roda e é reversível
- O evento de erro aparece no painel de observabilidade
- A documentação da API foi atualizada
```

O acordo vale para todo item e não é renegociado dentro do sprint. Quando o time decide mudar a lista, a mudança vale para os itens seguintes.

</details>

---

<a id="scrum"></a>

## Scrum

Scrum organiza o trabalho em ciclos de duração fixa. A duração não muda, e o escopo do ciclo é o que se ajusta. Essa inversão é o mecanismo central: com a data travada, a conversa deixa de ser sobre prazo e passa a ser sobre prioridade.

**Os três papéis**

| Papel | Responsabilidade | O que não é |
|---|---|---|
| **Product Owner** (dono do produto) | Decide a ordem do backlog e responde pelo valor entregue | Chefe do time nem redator de especificação técnica |
| **Scrum Master** | Remove impedimentos e cuida do funcionamento do processo | Gerente de projeto nem quem distribui tarefas |
| **Time de desenvolvimento** | Decide como construir e quanto cabe no ciclo | Executor de um plano feito por outra pessoa |

**As quatro reuniões**

| Reunião | Quando | Pergunta que responde |
|---|---|---|
| **Planning** (planejamento) | Início do ciclo | O que cabe neste ciclo e como vamos construir |
| **Daily** (reunião diária) | Todo dia, quinze minutos | O que está travado hoje |
| **Review** (revisão) | Fim do ciclo | O que ficou pronto, e o que quem recebe achou |
| **Retrospective** (retrospectiva) | Fim do ciclo | O que vamos mudar no nosso jeito de trabalhar |

**Os três artefatos**: o backlog do produto (tudo que pode ser feito, em ordem), o backlog do sprint (o que o time assumiu neste ciclo) e o incremento (o que ficou utilizável ao fim do ciclo).

<details>
<summary>❌ Ruim: a reunião diária vira relato de status para quem coordena</summary>

```
Ana:   ontem mexi na tela de checkout, hoje continuo
Bruno: ontem terminei a API de cupons, hoje pego a próxima tarefa
Célia: ontem tive reunião o dia todo, hoje começo o relatório
```

Cada pessoa fala para quem coordena, e ninguém fala com ninguém. Nada do que foi dito muda o que vai acontecer no dia, e a reunião existe para produzir um relatório que um quadro atualizado já daria.

</details>

<details>
<summary>✅ Bom: a conversa percorre os itens travados</summary>

```
Quadro, da direita para a esquerda:

"Aprovar cupom" está em revisão desde segunda
  → Bruno: preciso de alguém para revisar hoje, senão não entra no ciclo
  → Ana: eu revejo depois do almoço

"Tela de checkout" está em andamento há 4 dias
  → Ana: o gateway de teste está fora do ar
  → Célia: eu tenho o contato deles, resolvo até as 11h

Nada mais em andamento. Ninguém puxa item novo até o checkout sair.
```

A conversa parte dos itens, e não das pessoas. Cada fala termina em alguém assumindo uma ação para o dia, e o time sai sabendo o que destravar primeiro.

</details>

**Quando o Scrum atrapalha**: em time que atende demanda imprevisível, como suporte e correção de incidente, o compromisso do ciclo quebra toda semana. O ciclo fixo pressupõe que dá para proteger o time por duas semanas, e quando essa proteção não existe, o Kanban serve melhor.

---

<a id="kanban"></a>

## Kanban

Kanban não tem ciclo, papel nem reunião obrigatória. Ele tem duas regras: tornar o trabalho visível e limitar quanto pode estar em andamento ao mesmo tempo.

O limite é a parte que produz o efeito. Quando o número de itens em andamento chega ao teto, ninguém começa outra coisa, e a única forma de avançar é terminar ou destravar o que já está na mesa.

<details>
<summary>❌ Ruim: quadro sem limite, com todo mundo começando algo</summary>

```
A fazer (14)   |  Em andamento (11)  |  Revisão (6)  |  Pronto (2)
                  Ana: 3 itens
                  Bruno: 4 itens
                  Célia: 4 itens
```

Onze itens começados num time de três pessoas, e dois terminados. Cada pessoa alterna entre tarefas e perde contexto a cada troca. Os seis itens parados em revisão mostram onde o fluxo trava, e ninguém para de começar coisa nova para resolver isso.

</details>

<details>
<summary>✅ Bom: teto por coluna, e a revisão passa na frente</summary>

```
A fazer (14)  |  Em andamento (máx 3)  |  Revisão (máx 2)  |  Pronto (9)
                 Ana: checkout            Bruno: cupons
                 Célia: relatório

Regra do time: revisão pendente vem antes de começar item novo.
```

Com o teto de três, quem termina um item revisa o que está parado em vez de puxar outro. A coluna de revisão deixa de acumular, e o número da coluna "Pronto" passa a subir.

</details>

**As métricas do Kanban** medem tempo, e não quantidade:

| Métrica | O que mede | Para que serve |
|---|---|---|
| **Lead time** | Do pedido entrar até a entrega chegar | Responder "quando fica pronto" a quem pediu |
| **Cycle time** | De começar o trabalho até a entrega | Descobrir se o time é rápido ou se a fila é longa |
| **Throughput** (vazão) | Itens concluídos por semana | Prever capacidade sem estimar item por item |

Quando o tempo de atendimento é muito maior que o tempo de execução, o problema está na fila e não na velocidade de quem executa. Contratar mais gente nesse cenário aumenta a fila.

---

<a id="lean"></a>

## Lean

Lean vem da manufatura, e a ideia que atravessou para o software é a de desperdício: qualquer trabalho que consome tempo sem aproximar a entrega de quem vai usar.

| Desperdício | Como aparece em software |
|---|---|
| Trabalho parcialmente feito | Branch aberta há três semanas, feature atrás de uma flag esquecida |
| Funcionalidade não usada | Tela construída porque alguém achou que seria útil |
| Troca de contexto | Uma pessoa em três projetos ao mesmo tempo |
| Espera | Item parado aguardando revisão, ambiente ou aprovação |
| Retrabalho | Defeito que volta da homologação, requisito entendido errado |
| Repasse entre times | Tarefa que atravessa quatro áreas antes de chegar ao usuário |

O diagnóstico é direto: acompanhe um item do pedido até a entrega e some quanto tempo ele passou parado. Na maioria dos times, a espera ocupa mais que a execução, e é ali que a mudança de processo devolve mais.

---

<a id="waterfall"></a>

## Cascata, e quando ela é a escolha certa

A cascata organiza o trabalho em fases sequenciais: levantamento, projeto, implementação, teste, entrega. Cada fase termina antes de a seguinte começar, e a validação com quem vai usar acontece no fim.

Ela funciona bem quando o requisito é fixo e a mudança tardia é cara de verdade: sistema embarcado em hardware já fabricado, software sob norma regulatória com documentação obrigatória por fase, contrato de escopo fechado com penalidade por alteração.

O problema aparece quando esse cenário é presumido sem existir. Em produto digital, o requisito muda porque o entendimento melhora, e a cascata só descobre isso na fase de teste, quando refazer sai mais caro do que teria saído no começo.

---

<a id="how-to-choose"></a>

## Como escolher

| Pergunta | Se a resposta for sim |
|---|---|
| A demanda chega sem aviso e não dá para proteger o time por duas semanas? | Kanban |
| O time constrói um produto com escopo negociável e prioridades revistas? | Scrum |
| O trabalho trava mais na espera do que na execução? | Comece pelo diagnóstico Lean, e depois escolha |
| O requisito é fixo por norma ou contrato, com mudança tardia proibitiva? | Cascata, com validação antecipada onde couber |
| O time já tem processo e o problema é qualidade técnica? | XP, em [`methodologies.md`](./methodologies.md) |

Combinar Scrum e Kanban é comum e funciona: manter o ciclo fixo do Scrum e acrescentar o limite de trabalho em andamento do Kanban resolve o quadro que acumula itens começados.

<a id="agile-theater"></a>

## Quando o nome fica e a prática sai

Os sinais abaixo aparecem juntos e descrevem um time que adotou o vocabulário sem adotar o mecanismo:

- O escopo do ciclo é definido por alguém de fora e o time não pode recusar
- A retrospectiva levanta os mesmos pontos há meses e nenhuma ação sai dela
- A vazão do time virou meta de desempenho individual, e as estimativas cresceram junto
- A reunião diária é um relatório de status, e ninguém sai dela com uma ação
- "Pronto" é definido item a item, na hora da entrega

O denominador comum é a decisão sair do time. O manifesto coloca a autonomia de quem constrói no centro, e sem ela as reuniões continuam acontecendo sem produzir efeito.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| XP, DDD, BDD, TDD e os estilos arquiteturais | [`methodologies.md`](./methodologies.md) |
| Modelagem do processo de negócio que o software atende | [`bpm.md`](./bpm.md) |
| Decidir o que construir antes de entrar no backlog | [`design-thinking.md`](./design-thinking.md) |
| Governança, revisão de código e registro de decisão | [`governance.md`](./governance.md) |
| Pipeline, entrega contínua e separação entre deploy e release | [`ci-cd.md`](./ci-cd.md) |
| Branches, commits e estratégia de entrega | [`git.md`](./git.md) |
