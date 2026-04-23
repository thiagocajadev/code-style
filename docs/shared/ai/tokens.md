# Tokens

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Token é a unidade mínima de texto que um modelo de linguagem processa. Entender tokens é essencial para estimar custo, respeitar limites de contexto e otimizar prompts. A maioria das APIs cobra por token, não por caractere ou palavra.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Token** | Sequência de caracteres que o tokenizador trata como unidade: pode ser uma palavra, parte de palavra ou pontuação |
| **Tokenizer** (tokenizador) | Algoritmo que converte texto em tokens antes de enviar ao modelo |
| **Input tokens** (tokens de entrada) | Tokens do prompt: system prompt, mensagens, tool schemas e tool results |
| **Output tokens** (tokens de saída) | Tokens gerados pelo modelo na resposta |
| **Context window** (janela de contexto) | Limite máximo de tokens (entrada + saída) em uma única chamada à API |
| **Prompt caching** (cache de prompt) | Mecanismo que reutiliza tokens de entrada já processados, reduzindo custo e latência |
| **Cache hit** (acerto de cache) | Quando o prefixo do prompt está em cache e não precisa ser reprocessado |
| **Batch API** | Processamento assíncrono de múltiplas requisições com desconto no custo |

## O que é um token

O tokenizador divide o texto em pedaços baseado em padrões de frequência aprendidos no treinamento. Uma regra prática:

| Língua | Aproximação |
|---|---|
| Inglês | ~4 caracteres por token |
| Português | ~3 caracteres por token |
| Código-fonte | ~3-5 caracteres por token |
| JSON/YAML | ~2-3 caracteres por token |

Palavras comuns em inglês costumam ser 1 token. Palavras longas ou raras podem ser divididas em múltiplos tokens. Espaços em branco e pontuação são tokens separados.

```
"Hello, world!"  →  ["Hello", ",", " world", "!"]  → 4 tokens
"Olá, mundo!"   →  ["Ol", "á", ",", " mundo", "!"] → 5 tokens
```

Para estimar com precisão, use o tokenizador do provedor: `tiktoken` (OpenAI), `anthropic-tokenizer` (Anthropic).

## Context window (Janela de contexto)

A context window define o limite de entrada por chamada. A saída máxima é um limite separado, definido pelo modelo. Se a entrada usar 900.000 tokens em um modelo com janela de 1.000.000, restam apenas 100.000 tokens disponíveis para saída, independente do limite máximo do modelo.

| Modelo | Entrada (input) | Saída máxima (output) |
|---|---|---|
| Claude Opus 4.7 | 1.000.000 tokens | 128.000 tokens |
| Claude Sonnet 4.6 | 1.000.000 tokens | 64.000 tokens |
| Claude Haiku 4.5 | 200.000 tokens | 64.000 tokens |
| GPT-4.1 | 1.000.000 tokens | 32.768 tokens |
| Gemini 2.5 Pro | 1.000.000 tokens | 65.536 tokens |
| Gemini 2.5 Flash | 1.000.000 tokens | 65.536 tokens |
| Llama 4 Scout | 10.000.000 tokens | — |

Contexto longo é útil, mas não gratuito: mais tokens de entrada significa maior custo e, em alguns modelos, aumento de latência.

## Custo por token

A maioria das APIs cobra separadamente por input e output. Output tokens costumam ser 3-5x mais caros que input tokens.

Os valores abaixo são aproximados e podem mudar a qualquer momento. Sempre confira a tabela oficial do provedor antes de estimar custos em produção.

| Modelo | Input / 1M tokens | Output / 1M tokens |
|---|---|---|
| Claude Haiku 4.5 | ~$1,00 | ~$5,00 |
| Claude Sonnet 4.6 | ~$3,00 | ~$15,00 |
| Claude Opus 4.7 | ~$5,00 | ~$25,00 |
| GPT-5 | ~$2,50 | ~$15,00 |
| Gemini 2.5 Pro | ~$1,25 | ~$10,00 |
| Gemini 2.5 Flash | ~$0,30 | ~$2,50 |

> Preços de referência: [Anthropic](https://www.anthropic.com/pricing) · [OpenAI](https://openai.com/api/pricing/) · [Google](https://ai.google.dev/gemini-api/docs/pricing)

Para estimar o custo de uma chamada: `(input_tokens × preço_input + output_tokens × preço_output) / 1_000_000`.

## Cache de prompts (Prompt Caching)

O cache de prompts reutiliza tokens de entrada que não mudaram entre chamadas. O prefixo do prompt (system prompt, documentos de contexto, exemplos) é processado uma vez e armazenado em cache pelo provedor.

```
Primeira chamada:  processa 10.000 tokens → cobra preço normal
Chamadas seguintes: apenas os tokens novos (ex: mensagem do usuário) são processados → 90% de desconto
```

**Anthropic**: cache explícito via `cache_control`. Mínimo de 1.024 tokens para ser elegível ao cache.

```json
{
  "system": [
    {
      "type": "text",
      "text": "Você é um assistente especializado em...",
      "cache_control": { "type": "ephemeral" }
    }
  ]
}
```

**OpenAI**: cache automático, sem marcação explícita no payload.

O cache tem TTL (time to live, tempo de vida) de aproximadamente 5 minutos para prompts com variação frequente.

## Boas práticas de custo

**Colocar o conteúdo estável no início do prompt.** O cache funciona por prefixo: o system prompt e os documentos fixos devem vir antes das mensagens do usuário. Qualquer alteração no prefixo invalida o cache.

**Usar o modelo certo para cada tarefa.** Haiku 4.5 custa 5x menos que Sonnet 4.6 por token de saída. Tarefas simples (classificação, extração, resumo curto) não precisam do modelo mais capaz.

**Combinar Prompt Caching com Batch API.** O desconto do cache (90%) e o desconto do Batch API (50%) se acumulam. Para processamento de documentos em volume, a redução de custo pode chegar a 95%.

**Evitar output tokens desnecessários.** Instruir o modelo a responder de forma concisa quando a tarefa permite. Output tokens são os mais caros.

| Técnica | Redução de custo estimada |
|---|---|
| Prompt Caching (cache hit em 80%+ das chamadas) | até 90% nos tokens de entrada |
| Batch API | 50% em todas as chamadas |
| Modelo menor para tarefas simples | 60-80% por token |
| Output conciso (instrução explícita) | 20-40% no output |
