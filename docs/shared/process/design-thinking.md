# Design Thinking

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Design Thinking é o raciocínio feito **antes** de decidir o que construir. Parte do usuário real, do problema real, e chega à solução por etapas que podem ser descartadas sem custo de implementação. Construir sem esse raciocínio resolve o problema errado com precisão.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **User-centered** (centrado no usuário) | Design que parte da necessidade real do usuário, não da capacidade técnica disponível |
| **Persona** (persona) | Representação arquetípica de um usuário, construída a partir de pesquisa |
| **Journey** (jornada do usuário) | Mapa das etapas que o usuário atravessa para atingir um objetivo |
| **Problem framing** (enquadramento de problema) | Formulação do problema em termos que orientam a solução sem prescrevê-la |
| **HMW** (How Might We, Como Poderíamos) | Pergunta aberta que transforma um problema em oportunidade de solução |
| **Prototype** (protótipo) | Artefato descartável que materializa uma hipótese para validação |
| **Usability** (usabilidade) | Facilidade com que o usuário atinge o objetivo com a interface proposta |

## O papel do Design Thinking

Design Thinking responde perguntas que implementação não resolve sozinha:

- Quem é o usuário real dessa solução?
- Qual problema ele está tentando resolver?
- Que soluções ele já tenta hoje?
- Em que contexto a solução vai ser usada?

Sem essas respostas, o time constrói o que assume ser o necessário. Com elas, a solução tem critério de aceitação independente da implementação.

## As 5 fases

O processo canônico tem cinco fases que se alimentam. Não é estritamente linear: descobertas tardias podem exigir voltar a uma fase anterior.

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

Cada fase produz algo descartável. O custo de descartar uma ideia na fase Ideate é uma folha de papel. O custo de descartar uma feature em produção é significativo.

## Empathize

Entender o usuário no contexto dele. Não o usuário ideal, não o que se supõe, o usuário real.

Técnicas comuns:

| Técnica | Como funciona |
|---|---|
| **Entrevista** | Conversa aberta com usuário real sobre como ele resolve o problema hoje |
| **Observação** | Acompanhar o usuário no ambiente onde ele usaria a solução |
| **Shadowing** (acompanhamento silencioso) | Ficar junto do usuário por um período sem intervir |
| **Análise de suporte** | Ler tickets, reclamações e dúvidas já registrados |

Escutar importa mais que perguntar. O usuário frequentemente descreve o sintoma, não a causa.

## Define

Transformar o entendimento do usuário em um enunciado de problema. Um bom problem statement é específico, acionável e centrado em necessidade, não em solução.

```
Ruim:  "Precisamos de um dashboard para o gestor"
Bom:   "O gestor precisa saber em 30 segundos se o time está no prazo, sem abrir relatórios"
```

Dois artefatos ajudam a enquadrar:

- **Persona**: arquetipo do usuário (nome, contexto, objetivos, frustrações)
- **Jornada**: sequência de etapas que o usuário atravessa, com emoção, ação e ponto de fricção em cada uma

Aprofundamento em journey maps e service blueprints fica em `design-thinking-advanced.md`.

## Ideate

Gerar soluções sem filtro prematuro. A regra central é separar quantidade de qualidade: primeiro produzir muitas ideias, depois avaliar.

A pergunta que abre ideação é **HMW** (How Might We, Como Poderíamos):

```
Problema:  "O gestor perde tempo abrindo relatórios"
HMW:       "Como poderíamos entregar a informação crítica sem exigir ação?"
```

HMW é aberto o suficiente para admitir várias respostas, específico o suficiente para descartar as irrelevantes.

## Prototype

Materializar uma ideia com o menor custo possível. O protótipo não é o produto; é o argumento de que a ideia resolve o problema.

| Fidelidade | Suporte | Quando usar |
|---|---|---|
| **Baixa** | Papel, post-it, esboço | Explorar conceito, ainda há dúvida sobre o problema |
| **Média** | Wireframe (esboço digital de interface) | Validar fluxo de navegação e estrutura |
| **Alta** | Mockup (protótipo visualmente completo) | Validar aparência final e detalhes de interação |

Começar em alta fidelidade é uma das formas mais eficientes de desperdiçar tempo. A ideia errada em baixa fidelidade custa horas; em alta fidelidade, custa semanas.

## Test

Entregar o protótipo a usuários reais e observar. O objetivo não é provar que a solução está certa; é descobrir onde está errada.

Princípios:

- Testar com usuário do público-alvo, não com colega de time
- Dar a tarefa, não a instrução (_"faça X"_, não _"clique aqui"_)
- Observar mais que explicar: o usuário conta na ação onde a solução falha
- Aceitar que a solução pode voltar à fase Ideate ou Define

Uma sessão de teste bem-feita produz ajustes concretos. Sessão sem achado é sinal de teste mal desenhado ou usuário mal escolhido.

## Design Thinking vs execução visual

Design Thinking responde **o que construir**. A execução visual e de interação responde **como apresentar**.

| Etapa | Documento |
|---|---|
| Descoberta e enquadramento de problema | `design-thinking.md` (este) |
| Técnicas avançadas de ideação, jornada e teste | [`design-thinking-advanced.md`](./design-thinking-advanced.md) |
| Sistema de design, tipografia, acessibilidade, estados | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |

Confundir Design Thinking com UI/UX é comum. UI/UX é a execução visual do que Design Thinking decidiu construir.

## Quando Design Thinking começa e termina

**Começa**: quando existe um problema percebido, antes de existir uma solução proposta.

**Termina**: quando existem respostas para as quatro perguntas:

1. Quem é o usuário e o que ele vive?
2. Qual é o problema real a resolver?
3. Qual solução resolve o problema e foi validada com usuário real?
4. Quais ajustes a validação exigiu antes de entregar em produção?

Respondidas essas perguntas, o próximo passo é execução: `ui-ux.md` para apresentação, `methodologies.md` para implementação, `system-design.md` para raciocínio arquitetural. Aprofundamento em técnicas de ideação, service blueprint e usability testing fica em `design-thinking-advanced.md`.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Técnicas avançadas, Double Diamond, Service Blueprint | [`design-thinking-advanced.md`](./design-thinking-advanced.md) |
| Execução visual da solução | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |
| Raciocínio arquitetural antes da implementação | [`../architecture/system-design.md`](../architecture/system-design.md) |
| Governança do ciclo de desenvolvimento | [`governance.md`](./governance.md) |
