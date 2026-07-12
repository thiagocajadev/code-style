# Conceitos avançados de IA

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Seis assuntos aparecem em toda aplicação de IA que chega a produção: ajuste fino do modelo, alucinação, saídas estruturadas, raciocínio estendido, motores de inferência e **AI Gateway** (camada que fica entre a aplicação e os provedores de IA). Cada um deles muda uma decisão concreta de arquitetura ou de custo, então vale entender o que fazem antes de escolher.

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
| **AI Gateway** (gateway de IA)                                                                     | Camada intermediária entre o cliente e as APIs de LLM: roteamento, cache, rate limiting e observabilidade |
| **RLHF** (Reinforcement Learning from Human Feedback · Aprendizado por Reforço com Feedback Humano) | Técnica usada no pós-treinamento para alinhar o modelo com preferências humanas                           |

## Ajuste fino: treinar mais o modelo com dados do domínio

O **fine-tuning** (ajuste fino) pega um modelo já treinado e continua o treinamento com um conjunto de dados menor e específico do seu domínio. O modelo que sai dali responde melhor naquele domínio e continua sabendo tudo o que sabia antes.

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

Comece pelo prompt e por **RAG** (Retrieval-Augmented Generation · Geração Aumentada por Recuperação, técnica que busca o conteúdo relevante e o injeta no prompt). Os dois cobrem a maioria dos casos, custam menos e dispensam o pipeline de treinamento que o ajuste fino exige.

**Variantes:**

| Variante                                   | O que é                                                                     | Indicação                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| **Full fine-tuning**                       | Atualiza todos os pesos do modelo                                           | Máxima especialização; exige GPU               |
| **LoRA** (Low-Rank Adaptation · Adaptação de Posto Reduzido) | Atualiza apenas matrizes de posto reduzido; pesos base congelados | Eficiente em memória; mais comum               |
| **QLoRA**                                  | LoRA sobre modelo quantizado                                                | Fine-tuning em hardware doméstico (GPU de 24GB) |
| **PEFT** (Parameter-Efficient Fine-Tuning · Ajuste Fino com Eficiência de Parâmetros) | Família de técnicas que inclui LoRA, prefix tuning e adapters              | Termo genérico para ajuste fino eficiente      |

## Alucinação: o modelo afirma com confiança o que não é verdade

Alucinação é quando o modelo gera uma afirmação falsa em tom seguro. A causa está no treinamento: o modelo aprendeu quais palavras costumam vir juntas, e essa estatística não distingue o fato verificado da frase que apenas soa plausível. A frequência sobe com prompt ambíguo, domínio pouco presente no treinamento e resposta longa sem fatos de apoio.

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
RAG → Recuperar informação atualizada e injetá-la no contexto
Verificação → Pedir ao modelo que cite a fonte no próprio output
Temperature → Usar temperature baixa (0-0.3) para tarefas factuais
```

Em domínio crítico, a combinação que mais reduz alucinação é **RAG com grounding**: você entrega os documentos, manda o modelo responder só com base neles e exige a citação da origem de cada afirmação. Quando a resposta precisa apontar de onde veio, a invenção fica difícil de sustentar.

<details>
<summary>❌ Ruim: sem grounding, modelo inventa para preencher a lacuna</summary>

```
Quais foram os resultados financeiros da Acme Corp no Q3 2024?
```

</details>

<details>
<summary>✅ Bom: com grounding, modelo responde apenas com base no conteúdo fornecido</summary>

```
Com base no relatório abaixo, quais foram os resultados financeiros da Acme Corp no Q3 2024?
Se a informação não estiver no relatório, responda "não encontrado".

[conteúdo do relatório]
```

</details>

<details>
<summary>❌ Ruim: sem restrição de fonte, modelo cita referências inexistentes</summary>

```
Liste 3 artigos acadêmicos sobre RAG publicados em 2024.
```

</details>

<details>
<summary>✅ Bom: restrito a fontes verificadas, modelo não inventa referências</summary>

```
Liste apenas artigos que estejam na lista abaixo.
Se não houver artigos sobre RAG, diga que não encontrou.

[lista de referências verificadas]
```

</details>

<details>
<summary>❌ Ruim: sem instrução de incerteza, modelo afirma o que não sabe</summary>

```
Qual a versão atual do framework X?
```

</details>

<details>
<summary>✅ Bom: com instrução explícita de incerteza</summary>

```
Qual a versão atual do framework X?
Se não tiver certeza, diga que não sabe e recomende verificar a documentação oficial.
```

</details>

O padrão dos três exemplos bons é o mesmo: dizer ao modelo o que fazer quando a informação falta. Sem essa instrução, o modelo preenche a lacuna com o texto mais provável.

## Saídas estruturadas: forçar o modelo a devolver JSON válido

Structured output obriga o modelo a responder com um **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) que obedece a um schema que você definiu. O código consome esse JSON direto, sem regex e sem o pós-processamento que quebra na primeira resposta fora do formato esperado.

<details>
<summary>❌ Ruim: sem schema, resposta em texto livre, parsing manual e frágil</summary>

```js
const response = await client.messages.create({
  messages: [{ role: "user", content: `Extraia nome e email de: ${text}` }],
});

const rawText = response.content[0].text;
```

</details>

<details>
<summary>✅ Bom: schema forçado via tool, output processável diretamente</summary>

```js
const response = await client.messages.create({
  tools: [extractContactTool],
  tool_choice: { type: "tool", name: "extract_contact" },
  messages: [{ role: "user", content: `Extraia nome e email de: ${text}` }],
});

const contact = response.content[0].input;
```

</details>

No exemplo bom, `tool_choice` obriga o modelo a chamar a ferramenta `extract_contact`, e o schema dela define os campos. O que volta em `input` já é um objeto com nome e email.

Suporte por provedor:

| Provedor  | Como ativar                                                    |
| --------- | -------------------------------------------------------------- |
| OpenAI    | `response_format: { type: "json_schema", json_schema: {...} }` |
| Anthropic | Tool com schema JSON como único tool disponível                |
| Ollama    | `format: "json"` ou schema via `format` field                  |

Sempre que a saída do modelo alimentar outro sistema, use structured output. Extrair dado de texto livre em produção é apostar que o modelo vai escolher o mesmo formato em toda chamada.

## Raciocínio estendido: gerar um rascunho antes da resposta

O modelo produz texto um token de cada vez, e cada token gerado entra no contexto do próximo. Gerar passos de raciocínio antes da conclusão dá ao modelo mais contexto para acertar, pelo mesmo motivo que uma pessoa erra menos ao escrever a conta antes de dizer o resultado.

Extended thinking é o modo que reserva um espaço para esse rascunho. O modelo gera os **thinking tokens** (tokens de raciocínio interno), fecha o bloco e só então escreve a resposta final. O bloco de raciocínio fica separado da resposta e pode ou não ser mostrado ao usuário.

```
Prompt → [Thinking: raciocínio interno] → Resposta final
```

Nesse espaço o modelo levanta hipóteses, checa contradições e corrige o próprio erro antes de se comprometer com uma resposta. O ganho de precisão aparece em tarefas de:

- Matemática e lógica formal
- Planejamento multi-passo
- Análise de código complexo
- Raciocínio causal e contrafactual

**Thinking tokens custam dinheiro:** eles são cobrados como tokens de saída. Em tarefa simples, o rascunho acrescenta latência e custo sem melhorar a resposta. Ligue o raciocínio estendido quando a precisão valer mais que os dois.

| Modelo                | Controle de thinking                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| Claude (Anthropic)    | `thinking: { type: "enabled", budget_tokens: N }`, orçamento controlável  |
| o3 / o4-mini (OpenAI) | Automático; parâmetro `reasoning_effort` (low/medium/high)                |
| Gemini 2.5 (Google)   | `thinking_config: { thinking_budget: N }`, orçamento controlável          |

## Motores de inferência: o software que executa o modelo

Um **inference engine** (motor de inferência) é o programa que carrega os pesos do modelo e gera os tokens. Com modelo em nuvem, o provedor cuida disso e você nem vê. Com modelo local, a escolha do engine decide a velocidade, o hardware que serve e os recursos disponíveis.

| Engine                              | Características                                               | Indicação                                                |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| **llama.cpp**                       | Rodar modelos GGUF em CPU/GPU; base do Ollama                 | Compatibilidade máxima; hardware variado                 |
| **Ollama**                          | Wrapper de llama.cpp com API REST e CLI simples               | Desenvolvimento local; prototipagem                      |
| **vLLM**                            | Alto **throughput** (vazão) em GPU; PagedAttention; batching contínuo     | Produção em servidor GPU; múltiplos usuários simultâneos |
| **LM Studio**                       | Interface gráfica sobre llama.cpp; servidor compatível com a API da OpenAI | Exploração local com UI; sem linha de comando            |
| **TGI** (Text Generation Inference · Inferência para Geração de Texto) | Servidor Hugging Face; quantização, streaming, batching       | Modelos Hugging Face em produção                         |

Para produção com vários usuários ao mesmo tempo, **vLLM** é a escolha padrão. Ele agrupa as requisições que chegam em um lote contínuo, o que mantém a GPU ocupada, e usa PagedAttention (atenção paginada) para administrar o **KV cache** (as matrizes de atenção dos tokens já processados, guardadas para não recalcular) em páginas de memória, do mesmo jeito que um sistema operacional pagina RAM.

## AI Gateway: uma camada entre a aplicação e os provedores

Um AI Gateway fica no meio do caminho entre a sua aplicação e as APIs de **LLM** (Large Language Model · Modelo de Linguagem de Grande Escala). Ele concentra as tarefas que se repetem em toda chamada de IA e que não pertencem à lógica de negócio.

```
Aplicação → AI Gateway → [Claude | GPT | Gemini | modelo local]
```

**Responsabilidades típicas:**

| Responsabilidade    | O que resolve                                               |
| ------------------- | ----------------------------------------------------------- |
| **Roteamento**      | Selecionar provedor por custo, latência ou capacidade       |
| **Rate limiting**   | Controlar volume de requisições por usuário ou **tenant** (inquilino)       |
| **Cache semântico** | Reutilizar respostas de prompts semanticamente equivalentes |
| **Fallback**        | Trocar de provedor automaticamente em caso de falha         |
| **Observabilidade** | Centralizar logs, latência, custo e tokens por chamada      |
| **PII scrubbing** (remoção de dados pessoais)   | Remover dados sensíveis antes de enviar ao provedor externo |
| **Cost allocation** | Associar consumo de tokens a projetos, times ou clientes    |

| Ferramenta | Open-source? | Foco principal |
|---|---|---|
| **LiteLLM** | Sim | 140+ provedores; custo, balanceamento e roteamento; o mais completo do ecossistema open-source |
| **Portkey** | Sim (desde mar/2026) | Observabilidade, controle de custo, governança de agentes; MCP Gateway nativo |
| **Bifrost** | Sim (Apache 2.0) | Altíssima performance em Go; overhead de ~11µs; indicado para produção de alto volume |
| **OpenRouter** | Não (SaaS) | Catálogo de 300+ modelos via endpoint único compatível com OpenAI; foco em variedade |
| **Cloudflare AI Gateway** | Não (SaaS) | Roteamento no edge; cache semântico; 70+ modelos; integrado ao ecossistema Cloudflare |

Vale a pena adotar um gateway quando a aplicação fala com mais de um provedor, precisa medir custo por tenant ou opera sob regulação (dados pessoais, conformidade). Com um provedor só e um projeto simples, a camada extra vira mais um componente para manter, monitorar e atualizar, sem resolver problema que o projeto tenha.
