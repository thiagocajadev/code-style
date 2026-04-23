# IA (Inteligência Artificial)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Inteligência Artificial aplicada a software é o conjunto de técnicas que permite a sistemas
computacionais gerar texto, código, imagens e decisões a partir de modelos treinados em grandes
volumes de dados. Para engenheiros, o ponto central é entender como integrar e operar esses modelos
de forma eficiente, segura e econômica.

## Na verdade, o que é IA?

O nome **AI** (Artificial Intelligence, Inteligência Artificial) é uma escolha de marketing, não uma
descrição técnica precisa. Um LLM não pensa, não entende e não tem intenção. O modelo executa uma
operação estatística sofisticada: dado o texto de entrada, calcula a sequência de tokens mais
provável como continuação, com base em padrões aprendidos de bilhões de exemplos de texto humano.

O resultado pode parecer raciocínio porque os dados de treinamento são produtos de raciocínio
humano. Mas o processo subjacente é predição de próximos tokens, não cognição. Essa distinção
importa na prática: o modelo não "sabe" que está certo, não detecta quando alucina e não tem
objetivo próprio. Quem projeta o sistema precisa compensar essas limitações com grounding
(ancoragem), validação e supervisão humana.

**Resumindo:** IA não pensa. Ela completa texto com base em padrões. Parece inteligente porque
aprendeu com bilhões de textos escritos por humanos inteligentes, a inteligência está na origem dos
dados, não no modelo.

## Conceitos fundamentais

| Conceito                                                                    | O que é                                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **LLM** (Large Language Model, Modelo de Linguagem de Grande Escala)        | Modelo treinado para prever e gerar texto; base de assistentes como Claude, GPT e Gemini            |
| **Inference** (inferência)                                                  | Processo de usar um modelo treinado para gerar uma resposta; o oposto de treinamento                |
| **Prompt**                                                                  | Entrada de texto enviada ao modelo para guiar a resposta                                            |
| **Token**                                                                   | Unidade mínima de texto processada pelo modelo; aproximadamente 4 caracteres em inglês              |
| **Context window** (janela de contexto)                                     | Quantidade máxima de tokens que o modelo processa em uma única chamada (entrada + saída)            |
| **Model** (modelo)                                                          | Conjunto de pesos e parâmetros que define o comportamento do LLM                                    |
| **Agent** (agente)                                                          | Sistema autônomo que usa um LLM para raciocinar, planejar e executar ações em sequência             |
| **RAG** (Retrieval-Augmented Generation, Geração com Recuperação Aumentada) | Técnica que injeta conteúdo recuperado de uma base de dados no prompt antes da geração              |
| **Tool** (ferramenta)                                                       | Função externa que o modelo pode invocar para buscar dados ou executar ações                        |
| **MCP** (Model Context Protocol, Protocolo de Contexto de Modelo)           | Protocolo padrão para expor ferramentas e recursos a modelos de IA                                  |
| **Embedding** (representação vetorial)                                      | Vetor numérico que representa o significado semântico de um texto                                   |
| **Quantização**                                                             | Técnica que reduz a precisão dos pesos do modelo para diminuir uso de memória e aumentar velocidade |

## Guias

| Arquivo                      | Conteúdo                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| [models.md](models.md)       | Modelos em nuvem (Claude, GPT, Gemini, Llama, Mistral), modelos locais (Ollama, LM Studio) e quantização |
| [agents.md](agents.md)       | Agent, Harness, Orchestration, Multi-agent e Memory                                                      |
| [rag.md](rag.md)             | RAG, Embeddings, Vector store e Chunking                                                                 |
| [tools-mcp.md](tools-mcp.md) | Tool Use, Function Calling e MCP Protocol                                                                |
| [tokens.md](tokens.md)       | Tokens, Context window, Custo e Prompt Caching                                                           |
| [prompts.md](prompts.md)     | Engenharia de prompts com exemplos BAD/GOOD para eficiência                                              |
| [skills.md](skills.md)       | Skills como capacidades de agentes: routing, loading, composição e boas práticas                         |
| [advanced.md](advanced.md)   | Fine-tuning, Hallucination, Structured outputs, Extended thinking, Inference engines e AI Gateway        |

## Veja também

- [Patterns](../architecture/patterns.md) — padrão AI-Driven e CQRS aplicados a sistemas com LLM
- [Integrations](../platform/integrations.md#apis-de-modelos-de-ia-llm-apis) — autenticação, streaming e retry para APIs de LLM
