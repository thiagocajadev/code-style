# Agentes de IA: o modelo escolhe o próximo passo sozinho

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um agente de IA usa um **LLM** (Large Language Model · Modelo de Linguagem de Grande Escala) para raciocinar sobre um objetivo, escolher uma ação, executá-la e repetir o ciclo até terminar a tarefa. O que separa isso de uma chamada comum ao modelo é a autonomia: em uma chamada comum, você decide o que vem depois de cada resposta; em um agente, quem decide é ele, olhando o resultado do passo anterior.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Agent** (agente) | Sistema autônomo que combina LLM com ferramentas e executa tarefas em múltiplos passos |
| **Harness** (estrutura de execução) | Código que envolve o agente: gerencia o loop de raciocínio, chama ferramentas e mantém estado |
| **Orchestration** (orquestração) | Coordenação de múltiplos agentes ou etapas em um fluxo de trabalho |
| **ReAct** (Reason + Act · raciocinar e agir) | Padrão de raciocínio: o agente alterna entre Reason (raciocinar) e Act (agir) em cada passo |
| **Plan-and-Execute** (planejar e executar) | Padrão em que o agente gera um plano completo antes de executar qualquer ação |
| **Handoff** (transferência) | Passagem de controle de um agente para outro em um pipeline multi-agente |
| **Memory** (memória) | Capacidade do agente de reter informações entre chamadas ou entre sessões |
| **Checkpoint** (ponto de salvamento) | Estado salvo do agente que permite retomar a execução após falha ou interrupção |

## O agente e o loop que ele roda

O agente recebe um objetivo escrito em linguagem natural e gira em um loop até cumpri-lo:

```
Objetivo → Raciocina → Escolhe ferramenta → Executa → Observa resultado → Raciocina → ... → Resposta final
```

O padrão mais adotado é o **ReAct**. A cada volta do loop, o modelo escreve o raciocínio (Thought) antes de escolher a ação (Action). Escrever o motivo antes melhora a decisão, e deixa o rastro que você vai ler quando o agente fizer algo inesperado:

```
Thought: Preciso buscar o preço atual do produto antes de calcular o desconto.
Action: fetch_product_price(product_id="SKU-42")
Observation: { "price": 199.90 }
Thought: Com o preço em mãos, calculo 15% de desconto.
Action: final_answer("R$ 169.92")
```

Use um agente quando a tarefa exige decisão condicional, várias ferramentas ou um número de iterações que você não sabe de antemão. Quando o caminho é sempre o mesmo, uma sequência de chamadas diretas resolve com menos peças.

## Harness: o código que faz o loop girar

O **harness** é a infraestrutura em volta do agente. Ele cuida da mecânica da execução:

- O loop de raciocínio (lê a resposta do modelo, invoca ferramentas, devolve o resultado)
- O estado da conversa (histórico de mensagens, resultados de ferramentas)
- Interrupções, timeouts e limites de iteração
- Checkpoints para retomada após falha

Exemplos de harnesses: **Claude Code** (Anthropic), **LangGraph**, **CrewAI**, **AutoGen/AG2** (Microsoft), **OpenAI Agents SDK** e **Google ADK**.

Um harness bem construído serve a qualquer domínio, porque a regra de negócio mora dentro das ferramentas. O loop só sabe chamar a ferramenta que o modelo pediu e devolver o que ela retornou.

## Orquestração: coordenar agentes e etapas

Orquestrar é decidir a ordem em que os agentes ou as etapas rodam. Há dois arranjos básicos:

```
Sequencial: Agente A → Agente B → Agente C → Resultado
Paralelo:   Objetivo → [Agente A | Agente B | Agente C] → Agregador → Resultado
```

O arranjo **sequencial** serve quando cada etapa precisa do resultado da anterior. O **paralelo** serve quando as tarefas são independentes e o tempo total importa.

Frameworks como o **LangGraph** modelam a orquestração como um grafo dirigido com estado compartilhado, checkpoint em cada nó e **time travel** (voltar a um estado anterior e reprocessar a partir dali).

## Multi-agente: cada agente com um papel e um handoff

Em um sistema multi-agente, agentes especializados dividem uma tarefa complexa. Cada um tem um papel definido e entrega o controle ao próximo por um **handoff** explícito.

```
Orquestrador → Pesquisador (busca dados) → Analista (interpreta) → Redator (formata saída)
```

Vantagens em relação a um agente único:
- Especialização: cada agente recebe apenas o contexto necessário para seu papel
- Paralelismo: agentes independentes podem executar simultaneamente
- Controle: handoffs explícitos tornam o fluxo auditável

O risco mora na cadeia: um agente **upstream** (etapa anterior) que devolve um resultado errado alimenta todos os **downstream** (etapas seguintes), e o erro chega ao fim vestido de resposta pronta. Valide o output em cada handoff.

## Memória: o que o agente guarda entre chamadas

O modelo de linguagem é **stateless** (não guarda estado): cada chamada chega a ele sem lembrança da anterior. Toda memória que o agente tem foi você que construiu, e há quatro formas de fazer isso:

| Tipo | Como funciona | Indicação |
|---|---|---|
| **In-context** | Histórico de mensagens na janela de contexto | Sessão única, curta duração |
| **External short-term** | Estado salvo em banco (Redis, SQLite) via checkpoint | Sessões longas, retomada após falha |
| **External long-term** | Embeddings em vector store; recuperados via RAG | Conhecimento acumulado entre sessões |
| **Episodic** (episódica) | Registro de interações passadas com o usuário | Personalização e continuidade |

A memória in-context é a mais fácil de montar, e ela cresce a cada iteração até esbarrar no limite da janela de contexto. Para agente de longa duração, combine o checkpoint (que guarda o estado estruturado) com **RAG** (Retrieval-Augmented Generation · Geração Aumentada por Recuperação) para buscar o que é relevante em vez de carregar tudo.
