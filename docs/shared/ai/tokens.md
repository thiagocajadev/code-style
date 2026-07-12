# Tokens: a unidade que o modelo lê e a que a conta mede

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Token é o menor pedaço de texto que um modelo de linguagem processa. Ele é a unidade que importa em três decisões práticas: quanto a chamada vai custar, quanto texto cabe em uma requisição e o que compensa cortar de um prompt. As **APIs** (Application Programming Interface · Interface de Programação de Aplicações) de modelo cobram por token, então a conta sobe com a quantidade de pedaços, e a mesma frase em línguas diferentes rende quantidades diferentes.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Token** (unidade mínima de texto) | Sequência de caracteres que o tokenizador trata como unidade: pode ser uma palavra, parte de palavra ou pontuação |
| **Tokenizer** (tokenizador) | Algoritmo que converte texto em tokens antes de enviar ao modelo |
| **Input tokens** (tokens de entrada) | Tokens do prompt: system prompt, mensagens, tool schemas e tool results |
| **Output tokens** (tokens de saída) | Tokens gerados pelo modelo na resposta |
| **Context window** (janela de contexto) | Limite máximo de tokens (entrada + saída) em uma única chamada à API |
| **Prompt caching** (cache de prompt) | Mecanismo que reutiliza tokens de entrada já processados, reduzindo custo e latência |
| **Cache hit** (acerto de cache) | Quando o prefixo do prompt está em cache e não precisa ser reprocessado |
| **Batch API** (API de lote) | Processamento assíncrono de múltiplas requisições com desconto no custo |

## O que é um token

O tokenizador quebra o texto em pedaços seguindo os padrões de frequência que aprendeu no treinamento: o que aparece muito vira um token só, o que é raro vira vários. Daí a regra prática abaixo, que varia por língua e por tipo de conteúdo:

| Língua | Aproximação |
|---|---|
| Inglês | ~4 caracteres por token |
| Português | ~3 caracteres por token |
| Código-fonte | ~3-5 caracteres por token |
| JSON/YAML | ~2-3 caracteres por token |

Palavra comum em inglês costuma ocupar 1 token. Palavra longa ou rara se parte em vários. Espaço em branco e pontuação contam como tokens próprios.

```
"Hello, world!"  →  ["Hello", ",", " world", "!"]  → 4 tokens
"Olá, mundo!"   →  ["Ol", "á", ",", " mundo", "!"] → 5 tokens
```

Os dois exemplos mostram o efeito da língua: a frase em português é mais curta e mesmo assim gasta mais tokens, porque o acento partiu a palavra em dois pedaços. Para estimar com precisão, use o tokenizador do provedor: `tiktoken` (OpenAI), `anthropic-tokenizer` (Anthropic).

## Janela de contexto: o teto de tokens por chamada

A **context window** (janela de contexto) limita o total de tokens de entrada em uma chamada. A saída tem um teto próprio, definido pelo modelo, e os dois limites convivem. Em um modelo com janela de 1.000.000, uma entrada de 900.000 tokens deixa 100.000 disponíveis para a resposta, mesmo que o teto de saída do modelo seja maior.

| Modelo | Entrada (input) | Saída máxima (output) |
|---|---|---|
| Claude Opus 4.7 | 1.000.000 tokens | 128.000 tokens |
| Claude Sonnet 4.6 | 1.000.000 tokens | 64.000 tokens |
| Claude Haiku 4.5 | 200.000 tokens | 64.000 tokens |
| GPT-4.1 | 1.000.000 tokens | 32.768 tokens |
| Gemini 2.5 Pro | 1.000.000 tokens | 65.536 tokens |
| Gemini 2.5 Flash | 1.000.000 tokens | 65.536 tokens |
| Llama 4 Scout | 10.000.000 tokens | não divulgada |

Encher a janela tem preço: cada token de entrada é cobrado, e em alguns modelos o tempo de resposta cresce junto com o tamanho do contexto.

## Custo por token

As APIs cobram entrada e saída em linhas separadas, e o token de saída sai de 3 a 5 vezes mais caro que o de entrada. Por isso uma resposta prolixa pesa mais na fatura que um prompt longo.

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

## Cache de prompt: reaproveitar o prefixo já processado

O **prompt caching** (cache de prompt) guarda o começo do prompt já processado do lado do provedor. O system prompt, os documentos de contexto e os exemplos costumam ser idênticos em toda chamada, e o cache evita pagar por eles de novo a cada requisição.

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

O `cache_control` marca até onde vai o trecho a guardar. Tudo o que vier antes dessa marca entra no cache; o que vier depois é processado a cada chamada.

**OpenAI**: cache automático, sem marcação explícita no **payload** (corpo da mensagem).

O trecho guardado tem **TTL** (Time To Live · tempo de vida) de aproximadamente 5 minutos, contado a partir do último uso.

## Boas práticas de custo

**Coloque o conteúdo estável no início do prompt.** O cache funciona por prefixo: ele casa a partir do primeiro token e para no primeiro caractere diferente. Mudar uma vírgula no system prompt invalida tudo o que vinha depois, então o que muda a cada chamada fica no fim.

**Use o modelo certo para cada tarefa.** Haiku 4.5 custa 5 vezes menos que Sonnet 4.6 por token de saída. Classificação, extração e resumo curto entregam o mesmo resultado no modelo pequeno.

**Combine prompt caching com Batch API.** Os descontos se somam: 90% do cache sobre a entrada, 50% do Batch sobre a chamada. Em processamento de documento em volume, a redução chega perto de 95%.

**Peça respostas concisas.** O token de saída é o mais caro da conta, e uma instrução de tamanho no prompt corta o custo da resposta inteira.

| Técnica | Redução de custo estimada |
|---|---|
| Prompt Caching (cache hit em 80%+ das chamadas) | até 90% nos tokens de entrada |
| Batch API | 50% em todas as chamadas |
| Modelo menor para tarefas simples | 60-80% por token |
| Output conciso (instrução explícita) | 20-40% no output |
