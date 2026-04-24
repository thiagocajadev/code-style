# Conceitos Avançados de IA (Advanced AI Concepts)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Este guia cobre conceitos que aparecem em sistemas de IA em produção: ajuste fino de modelos,
alucinações, saídas estruturadas, raciocínio estendido, engines de inferência e **AI** (Artificial Intelligence, Inteligência Artificial) Gateway. Cada
conceito impacta diretamente decisões de arquitetura e custo.

## Conceitos fundamentais

| Conceito                                                                                           | O que é                                                                                                   |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Fine-tuning** (ajuste fino)                                                                      | Treinamento adicional de um modelo pré-treinado em dados específicos de domínio                           |
| **Hallucination** (alucinação)                                                                     | Resposta gerada com confiança que não corresponde a fatos reais                                           |
| **Grounding** (ancoragem)                                                                          | Técnica de fornecer fatos concretos no prompt para ancorar a resposta                                     |
| **Structured output** (saída estruturada)                                                          | Saída do modelo forçada a seguir um schema JSON específico                                                |
| **Extended thinking** (raciocínio estendido)                                                       | Modo em que o modelo raciocina em passos internos antes de gerar a resposta final                         |
| **Chain-of-thought** (cadeia de raciocínio)                                                        | Técnica de prompt que instrui o modelo a raciocinar passo a passo antes de responder                      |
| **Inference engine** (motor de inferência)                                                         | Software que executa o modelo para gerar tokens: llama.cpp, vLLM, Ollama                                  |
| **AI Gateway**                                                                                     | Camada intermediária entre o cliente e as APIs de LLM: roteamento, cache, rate limiting e observabilidade |
| **RLHF** (Reinforcement Learning from Human Feedback, Aprendizado por Reforço com Feedback Humano) | Técnica usada no pós-treinamento para alinhar o modelo com preferências humanas                           |

## Fine-tuning (Ajuste fino)

Fine-tuning parte de um modelo pré-treinado e continua o treinamento com um dataset menor e
específico. O resultado é um modelo que performa melhor no domínio-alvo sem perder o conhecimento
geral.

```
Modelo base (treinado em internet) → Fine-tuning com dados do domínio → Modelo especializado
```

**Quando usar:**

| Cenário                                             | Técnica recomendada            |
| --------------------------------------------------- | ------------------------------ |
| Formato de saída específico e repetitivo            | Fine-tuning                    |
| Tom e vocabulário de domínio (ex: jurídico, médico) | Fine-tuning                    |
| Tarefa com exemplos abundantes e bem rotulados      | Fine-tuning                    |
| Comportamento novo sem dados suficientes            | Prompt engineering primeiro    |
| Conhecimento factual atualizado                     | RAG (mais simples e auditável) |

Fine-tuning não é a primeira escolha. Prompt engineering e **RAG** (Retrieval-Augmented Generation, Geração Aumentada por Recuperação) resolvem a maioria dos casos com
menos custo e sem a complexidade de um pipeline de treinamento.

**Variantes:**

| Variante                                   | O que é                                                                     | Indicação                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| **Full fine-tuning**                       | Atualiza todos os pesos do modelo                                           | Máxima especialização; exige GPU               |
| **LoRA** (Low-Rank Adaptation, Adaptação de Baixo Rank) | Atualiza apenas matrizes de baixo rank (classicação); pesos base congelados | Eficiente em memória; mais comum               |
| **QLoRA**                                  | LoRA sobre modelo quantizado                                                | Fine-tuning em hardware consumer (GPU de 24GB) |
| **PEFT** (Parameter-Efficient Fine-Tuning, Ajuste Fino com Eficiência de Parâmetros) | Família de técnicas que incluem LoRA, prefix tuning e adapters              | Termo genérico para ajuste fino eficiente      |

## Hallucination (Alucinação)

Alucinação é o modelo gerar afirmações falsas com tom confiante. Ocorre porque o modelo aprende
padrões estatísticos de texto, não fatos verificados. A frequência aumenta com: prompts ambíguos,
domínios raros no treinamento e outputs longos sem ancoragem.

**Tipos:**

| Tipo                    | Exemplo                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| **Factual** (factual)   | Citar livro que não existe, atribuir fala a pessoa errada        |
| **Temporal** (temporal) | Afirmar que evento futuro já aconteceu ou dar data errada        |
| **Logical** (lógico)    | Dedução correta localmente, mas inválida no contexto maior       |
| **Citation** (citação)  | Inventar referências bibliográficas plausíveis, mas inexistentes |

**Mitigação:**

```
Grounding → Fornecer os fatos no prompt em vez de deixar o modelo lembrar
RAG      → Recuperar informação atualizada e injetá-la no contexto
Verificação → Pedir ao modelo que cite a fonte no próprio output
Temperature → Usar temperature baixa (0-0.3) para tarefas factuais
```

A mitigação mais eficaz para domínios críticos é **RAG com grounding**: o modelo responde apenas com
base nos documentos fornecidos e cita a origem de cada afirmação.

<details>
<summary>❌ Bad: sem grounding — modelo inventa para preencher a lacuna</summary>
<br>

```
Quais foram os resultados financeiros da Acme Corp no Q3 2024?
```

</details>

<br>

<details>
<summary>✅ Good: com grounding — modelo responde apenas com base no conteúdo fornecido</summary>
<br>

```
Com base no relatório abaixo, quais foram os resultados financeiros da Acme Corp no Q3 2024?
Se a informação não estiver no relatório, responda "não encontrado".

[conteúdo do relatório]
```

</details>

<br>

<details>
<summary>❌ Bad: sem restrição de fonte — modelo cita referências inexistentes</summary>
<br>

```
Liste 3 artigos acadêmicos sobre RAG publicados em 2024.
```

</details>

<br>

<details>
<summary>✅ Good: restrito a fontes verificadas — modelo não inventa referências</summary>
<br>

```
Liste apenas artigos que estejam na lista abaixo.
Se não houver artigos sobre RAG, diga que não encontrou.

[lista de referências verificadas]
```

</details>

<br>

<details>
<summary>❌ Bad: sem instrução de incerteza — modelo afirma o que não sabe</summary>
<br>

```
Qual a versão atual do framework X?
```

</details>

<br>

<details>
<summary>✅ Good: com instrução explícita de incerteza</summary>
<br>

```
Qual a versão atual do framework X?
Se não tiver certeza, diga que não sabe e recomende verificar a documentação oficial.
```

</details>

## Structured outputs (Saídas estruturadas)

Structured outputs forçam o modelo a gerar um **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) que segue um schema definido. O output é
parseável sem regex, sem pós-processamento frágil.

<details>
<summary>❌ Bad: sem schema — resposta em texto livre, parsing manual e frágil</summary>
<br>

```js
const response = await client.messages.create({
  messages: [{ role: "user", content: `Extraia nome e email de: ${text}` }],
});

const rawText = response.content[0].text;
```

</details>

<br>

<details>
<summary>✅ Good: schema forçado via tool — output parseável diretamente</summary>
<br>

```js
const response = await client.messages.create({
  tools: [extractContactTool],
  tool_choice: { type: "tool", name: "extract_contact" },
  messages: [{ role: "user", content: `Extraia nome e email de: ${text}` }],
});

const contact = response.content[0].input;
```

</details>

Suporte por provedor:

| Provedor  | Como ativar                                                    |
| --------- | -------------------------------------------------------------- |
| OpenAI    | `response_format: { type: "json_schema", json_schema: {...} }` |
| Anthropic | Tool com schema JSON como único tool disponível                |
| Ollama    | `format: "json"` ou schema via `format` field                  |

Structured outputs são obrigatórios quando o output alimenta outro sistema de forma programática.
Nunca parsear texto livre em produção.

## Extended thinking (Raciocínio estendido)

O modelo não pensa de fato — mas pode gerar tokens intermediários antes da resposta final,
funcionando como um rascunho interno. Estatisticamente, produzir mais tokens de "rascunho" antes do
output aumenta a precisão em tarefas complexas, pelo mesmo motivo que humanos erram menos quando
escrevem os passos antes de concluir.

Extended thinking é um modo em que o modelo gera esse rascunho interno (thinking tokens) antes de
produzir a resposta final. O bloco de raciocínio é separado da resposta e pode ou não ser exposto ao
usuário.

```
Prompt → [Thinking: raciocínio interno] → Resposta final
```

O raciocínio interno permite ao modelo explorar hipóteses, verificar contradições e corrigir erros
antes de comprometer com uma resposta. O resultado é ganho expressivo de precisão em tarefas de:

- Matemática e lógica formal
- Planejamento multi-passo
- Análise de código complexo
- Raciocínio causal e contrafactual

**Thinking tokens têm custo:** são cobrados como output tokens. Para tarefas simples, extended
thinking adiciona latência e custo sem ganho proporcional. Use quando a precisão supera o custo.

| Modelo                | Controle de thinking                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| Claude (Anthropic)    | `thinking: { type: "enabled", budget_tokens: N }` — orçamento controlável |
| o3 / o4-mini (OpenAI) | Automático; parâmetro `reasoning_effort` (low/medium/high)                |
| Gemini 2.5 (Google)   | `thinking_config: { thinking_budget: N }` — orçamento controlável         |

## Inference engines (Motores de inferência)

Um inference engine é o software que carrega os pesos do modelo e executa a geração de tokens. Para
modelos cloud, o provedor gerencia isso de forma transparente. Para modelos locais, a escolha do
engine impacta velocidade, compatibilidade e recursos suportados.

| Engine                              | Características                                               | Indicação                                                |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| **llama.cpp**                       | Rodar modelos GGUF em CPU/GPU; base do Ollama                 | Compatibilidade máxima; hardware variado                 |
| **Ollama**                          | Wrapper de llama.cpp com API REST e CLI simples               | Desenvolvimento local; prototipagem                      |
| **vLLM**                            | Alto throughput em GPU; PagedAttention; batching contínuo     | Produção em servidor GPU; múltiplos usuários simultâneos |
| **LM Studio**                       | Interface gráfica sobre llama.cpp; servidor OpenAI-compatible | Exploração local com UI; sem linha de comando            |
| **TGI** (Text Generation Inference, Inferência para Geração de Texto) | Servidor Hugging Face; quantização, streaming, batching       | Modelos Hugging Face em produção                         |

Para uso em produção com múltiplos usuários, **vLLM** é a escolha padrão: batching contínuo maximiza
throughput (vazão) e PagedAttention (atenção paginada) gerencia a KV cache (armazenamento rápido e
temporário das matrizes de atenção chave-valor de tokens já processados) de forma eficiente.

## AI Gateway

Um AI Gateway (portão de IA) é uma camada intermediária entre a aplicação e as APIs de **LLM** (Large Language Model, Modelo de Linguagem Grande).
Centraliza responsabilidades que não devem viver na lógica de negócio.

```
Aplicação → AI Gateway → [Claude | GPT | Gemini | modelo local]
```

**Responsabilidades típicas:**

| Responsabilidade    | O que resolve                                               |
| ------------------- | ----------------------------------------------------------- |
| **Roteamento**      | Selecionar provedor por custo, latência ou capacidade       |
| **Rate limiting**   | Controlar volume de requisições por usuário ou tenant       |
| **Cache semântico** | Reutilizar respostas de prompts semanticamente equivalentes |
| **Fallback**        | Trocar de provedor automaticamente em caso de falha         |
| **Observabilidade** | Centralizar logs, latência, custo e tokens por chamada      |
| **PII scrubbing**   | Remover dados sensíveis antes de enviar ao provedor externo |
| **Cost allocation** | Associar consumo de tokens a projetos, times ou clientes    |

| Ferramenta | Open-source? | Foco principal |
|---|---|---|
| **LiteLLM** | Sim | 140+ provedores; custo, balanceamento e roteamento; mais completo do ecossistema OSS |
| **Portkey** | Sim (desde mar/2026) | Observabilidade, controle de custo, governança de agentes; MCP Gateway nativo |
| **Bifrost** | Sim (Apache 2.0) | Altíssima performance em Go; overhead de ~11µs; indicado para produção de alto volume |
| **OpenRouter** | Não (SaaS) | Catálogo de 300+ modelos via endpoint único compatível com OpenAI; foco em variedade |
| **Cloudflare AI Gateway** | Não (SaaS) | Roteamento no edge; cache semântico; 70+ modelos; integrado ao ecossistema Cloudflare |

O AI Gateway é indicado quando a aplicação usa múltiplos provedores, precisa de controle de custo
por tenant (inquilino) ou opera em ambiente regulado (PII, compliance). Para um único provedor em
projeto simples, a abstração é overhead desnecessário.
