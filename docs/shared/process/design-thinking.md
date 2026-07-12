# Design Thinking: decidir o que construir antes de construir

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Design Thinking é o raciocínio que acontece **antes** de decidir o que construir. Ele parte do usuário real e do problema real, e chega à solução por etapas baratas de descartar, porque nenhuma delas foi implementada ainda. Um time que pula essa etapa entrega código correto para o problema errado, e descobre isso depois do deploy.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **User-centered** (centrado no usuário) | Design que parte da necessidade real do usuário, não da capacidade técnica disponível |
| **Persona** (arquétipo de usuário) | Representação arquetípica de um usuário, construída a partir de pesquisa |
| **Journey** (jornada do usuário) | Mapa das etapas que o usuário atravessa para atingir um objetivo |
| **Problem framing** (enquadramento de problema) | Formulação do problema em termos que orientam a solução sem prescrevê-la |
| **HMW** (How Might We · Como Poderíamos) | Pergunta aberta que transforma um problema em oportunidade de solução |
| **Prototype** (protótipo) | Artefato descartável que materializa uma hipótese para validação |
| **Usability** (usabilidade) | Facilidade com que o usuário atinge o objetivo com a interface proposta |

## O que o Design Thinking responde

São quatro perguntas que a implementação sozinha deixa em aberto:

- Quem é o usuário real dessa solução?
- Qual problema ele está tentando resolver?
- Que soluções ele já tenta hoje?
- Em que contexto a solução vai ser usada?

Sem essas respostas, o time constrói o que **supõe** ser necessário, e a única forma de conferir a suposição é entregar e esperar. Com elas, a solução ganha um critério de aceitação que existe antes da primeira linha de código.

## As cinco fases

O processo canônico tem cinco fases que se alimentam. A ordem é uma referência, e não uma linha reta: uma descoberta na fase de teste pode mandar o time de volta para a definição do problema.

```
Empathize → Define → Ideate → Prototype → Test
```

| Fase | Pergunta central | Artefato gerado |
|---|---|---|
| **Empathize** (empatizar) | Quem é o usuário e o que ele vive? | Pesquisa, entrevistas, observação |
| **Define** (definir) | Qual é o problema real a resolver? | Problem statement (declaração de problema), persona, jornada |
| **Ideate** (idear) | Que soluções são possíveis? | Lista de ideias, HMW questions (perguntas "como poderíamos") |
| **Prototype** (prototipar) | Como essa ideia se materializa? | Protótipo de baixa ou alta fidelidade |
| **Test** (testar) | A solução resolve o problema? | Feedback de usuário, ajustes na solução |

Cada fase produz algo descartável, e é aí que está a economia. Descartar uma ideia na fase Ideate custa uma folha de papel. Descartar uma feature já em produção custa o desenvolvimento inteiro, mais a migração dos dados que ela criou.

## Empathize: entender o usuário no contexto dele

O alvo é o usuário real, com as restrições e os hábitos que ele tem hoje. O usuário ideal, aquele que lê todos os avisos e nunca erra o formulário, atrapalha a pesquisa.

Técnicas comuns:

| Técnica | Como funciona |
|---|---|
| **Entrevista** | Conversa aberta com usuário real sobre como ele resolve o problema hoje |
| **Observação** | Acompanhar o usuário no ambiente onde ele usaria a solução |
| **Shadowing** (acompanhamento silencioso) | Ficar junto do usuário por um período sem intervir |
| **Análise de suporte** | Ler tickets, reclamações e dúvidas já registrados |

Escutar rende mais que perguntar. Na maior parte das conversas, o usuário descreve o sintoma que incomoda ("o relatório demora"), e a causa aparece na observação ("ele exporta para planilha porque a tela não soma a coluna").

## Define: enunciar o problema

O entendimento do usuário vira um enunciado de problema. Um bom problem statement é específico, acionável e fala da necessidade do usuário. Quando ele já embute a solução, a fase de ideação perde a razão de existir.

```
Ruim:  "Precisamos de um dashboard para o gestor"
Bom:   "O gestor precisa saber em 30 segundos se o time está no prazo, sem abrir relatórios"
```

O exemplo ruim manda construir um dashboard. O bom descreve a necessidade e deixa em aberto se a resposta é um dashboard, um alerta no celular ou uma linha no e-mail da manhã.

Dois artefatos ajudam a enquadrar:

- **Persona**: arquetipo do usuário (nome, contexto, objetivos, frustrações)
- **Jornada**: sequência de etapas que o usuário atravessa, com emoção, ação e ponto de fricção em cada uma

Aprofundamento em journey maps e service blueprints fica em `design-thinking-advanced.md`.

## Ideate: gerar soluções antes de julgá-las

A regra central separa a geração da avaliação: primeiro o time produz muitas ideias, e só depois escolhe entre elas. Julgar durante a geração faz o grupo parar nas duas ou três respostas óbvias.

A pergunta que abre a ideação é **HMW** (How Might We · Como Poderíamos):

```
Problema:  "O gestor perde tempo abrindo relatórios"
HMW:       "Como poderíamos entregar a informação crítica sem exigir ação?"
```

A pergunta é ampla o bastante para admitir várias respostas e estreita o bastante para descartar as que fogem do problema.

## Prototype: materializar a ideia pelo menor custo

O protótipo existe para sustentar um argumento: esta ideia resolve o problema do usuário. Ele usa o material mais barato que consegue sustentar esse argumento, e vai para o lixo depois do teste.

| Fidelidade | Suporte | Quando usar |
|---|---|---|
| **Baixa** | Papel, post-it, esboço | Explorar conceito, ainda há dúvida sobre o problema |
| **Média** | Wireframe (esboço digital de interface) | Validar fluxo de navegação e estrutura |
| **Alta** | Mockup (protótipo visualmente completo) | Validar aparência final e detalhes de interação |

Começar pela alta fidelidade custa caro. A ideia errada em papel custa algumas horas; a mesma ideia errada em mockup completo custa semanas de trabalho visual que vão ser jogadas fora.

## Test: descobrir onde a solução falha

O teste procura os pontos em que a solução quebra na mão do usuário. Uma sessão que só confirma o que o time já achava produz pouca informação.

Princípios:

- Testar com usuário do público-alvo; o colega de time já conhece o produto e não erra onde o usuário erra
- Dar a tarefa, e deixar o caminho por conta do usuário (_"faça X"_, em vez de _"clique aqui"_)
- Observar mais que explicar: a hesitação na tela diz onde a solução falha
- Aceitar que o resultado pode mandar o trabalho de volta para Ideate ou Define

Uma sessão bem-feita produz ajustes concretos. Quando a sessão não acha nada, desconfie do roteiro do teste ou da escolha do usuário.

## O que o Design Thinking decide e o que a execução visual decide

Design Thinking responde **o que construir**. A execução visual e de interação responde **como apresentar** o que já foi decidido.

| Etapa | Documento |
|---|---|
| Descoberta e enquadramento de problema | `design-thinking.md` (este) |
| Técnicas avançadas de ideação, jornada e teste | [`design-thinking-advanced.md`](./design-thinking-advanced.md) |
| Sistema de design, tipografia, acessibilidade, estados | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |

A confusão com **UI** (User Interface · Interface do Usuário) e **UX** (User Experience · Experiência do Usuário) é comum. UI/UX é a execução visual daquilo que o Design Thinking já decidiu construir.

## Quando o Design Thinking começa e termina

**Começa**: quando existe um problema percebido, antes de existir uma solução proposta.

**Termina**: quando existem respostas para as quatro perguntas:

1. Quem é o usuário e o que ele vive?
2. Qual é o problema real a resolver?
3. Qual solução resolve o problema e foi validada com usuário real?
4. Quais ajustes a validação exigiu antes de entregar em produção?

Respondidas essas perguntas, o trabalho passa para a execução: `ui-ux.md` para a apresentação, `methodologies.md` para a implementação, `system-design.md` para o raciocínio arquitetural. Aprofundamento em técnicas de ideação, service blueprint e usability testing fica em `design-thinking-advanced.md`.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Técnicas avançadas, Double Diamond, Service Blueprint | [`design-thinking-advanced.md`](./design-thinking-advanced.md) |
| Execução visual da solução | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |
| Raciocínio arquitetural antes da implementação | [`../architecture/system-design.md`](../architecture/system-design.md) |
| Governança do ciclo de desenvolvimento | [`governance.md`](./governance.md) |
