# Agentes de IA (AI Agents)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um agente de IA é um sistema que usa um LLM para raciocinar sobre um objetivo, decidir quais ações tomar e executá-las em loop até concluir a tarefa. A diferença fundamental em relação a uma chamada direta ao modelo é a autonomia: o agente decide o próximo passo com base no resultado anterior, sem intervenção humana em cada iteração.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Agent** (agente) | Sistema autônomo que combina LLM com ferramentas e executa tarefas em múltiplos passos |
| **Harness** (estrutura de execução) | Código que envolve o agente: gerencia o loop de raciocínio, chama ferramentas e mantém estado |
| **Orchestration** (orquestração) | Coordenação de múltiplos agentes ou etapas em um fluxo de trabalho |
| **ReAct** | Padrão de raciocínio: o agente alterna entre Reason (raciocinar) e Act (agir) em cada passo |
| **Plan-and-Execute** (planejar e executar) | Padrão em que o agente gera um plano completo antes de executar qualquer ação |
| **Handoff** (transferência) | Passagem de controle de um agente para outro em um pipeline multi-agente |
| **Memory** (memória) | Capacidade do agente de reter informações entre chamadas ou entre sessões |
| **Checkpoint** | Estado salvo do agente que permite retomar a execução após falha ou interrupção |

## Agent (Agente)

Um agente recebe um objetivo em linguagem natural e opera em loop até completá-lo. O ciclo básico é:

```
Objetivo → Raciocina → Escolhe ferramenta → Executa → Observa resultado → Raciocina → ...→ Resposta final
```

O padrão **ReAct** é o mais adotado. Em cada iteração, o modelo produz um bloco de raciocínio (Thought) antes de decidir a ação (Action). Isso melhora a qualidade das decisões e facilita depuração.

```
Thought: Preciso buscar o preço atual do produto antes de calcular o desconto.
Action: fetch_product_price(product_id="SKU-42")
Observation: { "price": 199.90 }
Thought: Com o preço em mãos, calculo 15% de desconto.
Action: final_answer("R$ 169.92")
```

Agentes são indicados para tarefas que requerem decisões condicionais, uso de múltiplas ferramentas ou iterações cujo número não é conhecido antecipadamente.

## Harness (Estrutura de execução)

O **Harness** é o código de infraestrutura que faz o agente funcionar. Ele não contém lógica de domínio, mas gerencia:

- O loop de raciocínio (lê a resposta do modelo, invoca ferramentas, devolve o resultado)
- O estado da conversa (histórico de mensagens, resultados de ferramentas)
- Interrupções, timeouts e limites de iteração
- Checkpoints para retomada após falha

Exemplos de harnesses: **Claude Code** (Anthropic), **LangGraph**, **CrewAI**, **AutoGen/AG2** (Microsoft), **OpenAI Agents SDK**, **Google ADK**.

Um harness bem construído é independente do domínio: a lógica de negócio fica nas ferramentas, não no loop de execução.

## Orchestration (Orquestração)

Orquestração é a coordenação de agentes ou etapas em um pipeline. Há dois modelos principais:

```
Sequencial: Agente A → Agente B → Agente C → Resultado
Paralelo:   Objetivo → [Agente A | Agente B | Agente C] → Agregador → Resultado
```

**Sequencial** é indicado quando cada etapa depende do resultado da anterior. **Paralelo** é indicado quando as tarefas são independentes e o tempo importa.

Frameworks como **LangGraph** modelam orquestração como grafos dirigidos com estado compartilhado, checkpointing e suporte a time travel (voltar a um estado anterior para reprocessar).

## Multi-agent (Multi-agente)

Em sistemas multi-agente, agentes especializados colaboram para resolver uma tarefa complexa. Cada agente tem um papel definido e passa o controle via **handoff** explícito.

```
Orquestrador → Pesquisador (busca dados) → Analista (interpreta) → Redator (formata saída)
```

Vantagens em relação a um agente único:
- Especialização: cada agente recebe apenas o contexto necessário para seu papel
- Paralelismo: agentes independentes podem executar simultaneamente
- Controle: handoffs explícitos tornam o fluxo auditável

O risco principal é a propagação de erros: um agente upstream com output incorreto contamina todos os downstream. Validação de output entre handoffs é obrigatória.

## Memory (Memória)

Modelos de linguagem são stateless por natureza: cada chamada começa do zero. O agente precisa de mecanismos explícitos para reter informações.

| Tipo | Como funciona | Indicação |
|---|---|---|
| **In-context** | Histórico de mensagens na janela de contexto | Sessão única, curta duração |
| **External short-term** | Estado salvo em banco (Redis, SQLite) via checkpoint | Sessões longas, retomada após falha |
| **External long-term** | Embeddings em vector store; recuperados via RAG | Conhecimento acumulado entre sessões |
| **Episodic** (episódica) | Registro de interações passadas com o usuário | Personalização e continuidade |

A memória in-context é a mais simples, mas cresce com o número de iterações e pode esgotar a janela de contexto. Para agentes de longa duração, combine checkpoint (estado estruturado) com RAG (recuperação semântica).
