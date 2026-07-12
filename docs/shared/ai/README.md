# Inteligência artificial

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Inteligência artificial aplicada a software é o conjunto de técnicas que faz um sistema gerar texto, código, imagem e decisão a partir de modelos treinados em volumes enormes de dados. Para quem constrói software, o trabalho está em integrar e operar esses modelos com eficiência, segurança e custo sob controle. Esta pasta cobre as peças dessa operação, de tokens a agentes.

## O que o modelo faz de fato

O nome **AI** (Artificial Intelligence · Inteligência Artificial) veio do marketing e descreve mal a mecânica. Um **LLM** (Large Language Model · Modelo de Linguagem de Grande Escala) executa uma operação estatística: recebe o texto de entrada e calcula, token a token, qual continuação é a mais provável, com base nos padrões que extraiu de bilhões de exemplos de texto humano.

A resposta se parece com raciocínio porque o material de treinamento foi produzido por pessoas raciocinando. Por baixo, o que acontece é predição do próximo token, e essa diferença aparece na prática de três formas: o modelo não tem como saber se acertou, não percebe quando está alucinando e não persegue objetivo próprio. Quem projeta o sistema cobre essas três lacunas com **grounding** (ancoragem, entregar os fatos no prompt), validação de saída e supervisão humana.

**Resumindo:** o modelo completa texto com base em padrões, e o resultado convence porque ele aprendeu com bilhões de textos escritos por pessoas. A inteligência que você vê na resposta veio dos dados que o treinaram.

## Conceitos fundamentais

| Conceito                                                                    | O que é                                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **LLM** (Large Language Model · Modelo de Linguagem de Grande Escala)        | Modelo treinado para prever e gerar texto; base de assistentes como Claude, GPT e Gemini            |
| **Inference** (inferência)                                                  | Processo de usar um modelo treinado para gerar uma resposta; o oposto de treinamento                |
| **Prompt** (instrução de entrada)                                           | Entrada de texto enviada ao modelo para guiar a resposta                                            |
| **Token** (unidade mínima de texto)                                          | Unidade mínima de texto processada pelo modelo; aproximadamente 4 caracteres em inglês              |
| **Context window** (janela de contexto)                                     | Quantidade máxima de tokens que o modelo processa em uma única chamada (entrada + saída)            |
| **Model** (modelo)                                                          | Conjunto de pesos e parâmetros que define o comportamento do LLM                                    |
| **Agent** (agente)                                                          | Sistema autônomo que usa um LLM para raciocinar, planejar e executar ações em sequência             |
| **RAG** (Retrieval-Augmented Generation · Geração Aumentada por Recuperação) | Técnica que injeta conteúdo recuperado de uma base de dados no prompt antes da geração              |
| **Tool** (ferramenta)                                                       | Função externa que o modelo pode invocar para buscar dados ou executar ações                        |
| **MCP** (Model Context Protocol · Protocolo de Contexto de Modelo)           | Protocolo padrão para expor ferramentas e recursos a modelos de IA                                  |
| **Embedding** (representação vetorial)                                      | Vetor numérico que representa o significado semântico de um texto                                   |
| **Quantization** (quantização)                                              | Técnica que reduz a precisão dos pesos do modelo para diminuir uso de memória e aumentar velocidade |

## Guias

| Arquivo                      | Conteúdo                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| [models.md](models.md)       | Escolher entre nuvem e máquina local: Claude, GPT, Gemini, Llama, Mistral, Ollama, LM Studio e quantização |
| [agents.md](agents.md)       | O loop do agente, o harness que o executa, orquestração, multi-agente e memória                          |
| [rag.md](rag.md)             | Responder com base em documentos recuperados: embeddings, vector store e chunking                        |
| [tools-mcp.md](tools-mcp.md) | Dar ao modelo acesso ao mundo externo: tool use, function calling e o protocolo MCP                      |
| [tokens.md](tokens.md)       | A unidade que o modelo lê e a que a conta mede: janela de contexto, custo e cache de prompt              |
| [prompts.md](prompts.md)     | Escrever a instrução que o modelo entende, com exemplos BAD/GOOD                                         |
| [skills.md](skills.md)       | Empacotar um comportamento do agente: roteamento, carregamento sob demanda e composição                  |
| [advanced.md](advanced.md)   | Ajuste fino, alucinação, saídas estruturadas, raciocínio estendido, motores de inferência e AI Gateway   |
| [security.md](security.md)   | Prompt injection, jailbreak, injeção indireta e as mitigações, com exemplos BAD/GOOD                     |

## Veja também

- [Patterns](../architecture/patterns.md): padrão AI-Driven e CQRS aplicados a sistemas com LLM
- [Integrations](../platform/integrations.md#llm-apis): autenticação, streaming e retry para APIs de LLM
