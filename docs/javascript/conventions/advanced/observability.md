# Observabilidade

> Escopo: JavaScript. Visão transversal: [shared/standards/observability.md](../../../shared/standards/observability.md).

Um sistema observável responde a uma pergunta: o que ele estava fazendo quando algo deu errado. **Observability** (observabilidade) é essa capacidade de entender o estado interno pelo que o sistema emite para fora, sem abrir o código. Em JavaScript e Node, quatro hábitos entregam isso: logar objetos estruturados em vez de strings concatenadas, escolher o nível de severidade certo, nunca deixar dado sensível vazar no log e carregar um **correlation ID** (identificador que liga todos os logs de uma mesma requisição). Os princípios que valem para qualquer linguagem estão em [shared/standards/observability.md](../../../shared/standards/observability.md).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **structured logging** (log estruturado) | Log emitido como objeto JSON com campos pesquisáveis, não string concatenada |
| **log level** (nível de log) | Severidade: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| **correlation ID** (ID de correlação) | Identificador único por requisição que aparece em todos os logs do mesmo fluxo |
| **redaction** (mascaramento de dados sensíveis) | Remoção ou mascaramento de campos sensíveis (senha, token, CPF) antes de emitir |
| **PII** (Personally Identifiable Information · Informação Pessoal Identificável) | Dado que identifica um indivíduo; nunca sai cru no log |
| **trace** (rastro) | Caminho de uma requisição atravessando múltiplos serviços; cada salto é um span |
| **span** (trecho) | Unidade de trabalho dentro de um trace; tem início, fim e atributos |
| **metric** (métrica) | Valor numérico agregado (contador, gauge, histograma) emitido periodicamente |

## Logging estruturado

Log é dado, não texto para humano ler. Uma string concatenada com `console.log` não dá para filtrar nem agregar: a ferramenta recebe uma frase pronta e não sabe onde termina o `orderId`. Emita um objeto com Pino (ou Winston) e cada campo vira uma propriedade que você pesquisa e agrupa.

<details>
<summary>❌ Ruim: string concatenada, ilegível para ferramentas</summary>

```js
logger.info(`Order ${order.id} processed by user ${user.id}, total: $${order.total}`);
logger.error(`Payment failed: ${error.message} for order ${order.id}`);
```

</details>

<details>
<summary>✅ Bom: objeto estruturado com campos semânticos</summary>

```js
const orderContext = { orderId: order.id, userId: user.id, total: order.total };
logger.info(orderContext, "order processed");

const paymentErrorContext = { orderId: order.id, error: error.message };
logger.error(paymentErrorContext, "payment failed");
```

</details>

## Níveis de log

O nível de um log diz o quão urgente ele é. `info` narra o fluxo normal, `warn` marca algo estranho que ainda não quebrou nada, `error` marca uma falha que precisa de atenção. Jogar tudo em `console.log` apaga essa diferença e afoga o erro real no meio do ruído.

<details>
<summary>❌ Ruim: console.log para tudo, sem distinção de severidade</summary>

```js
console.log("Checkout started");
console.log(`Database query took ${durationMs}ms`);

console.log(`User ${userId} not found`);
```

</details>

<details>
<summary>✅ Bom: nível correto por situação</summary>

```js
const checkoutContext = { cartId };
logger.info(checkoutContext, "checkout started");

const slowQueryContext = { cartId, durationMs };
logger.warn(slowQueryContext, "slow database query");

const userNotFoundContext = { cartId, userId };
logger.error(userNotFoundContext, "user not found during checkout");
```

</details>

## O que nunca logar

Log vaza. Ele vai para arquivo, para serviço de terceiros, para a tela de quem dá suporte. Senha, token, número de cartão e qualquer **PII** (Personally Identifiable Information · Informação Pessoal Identificável) nunca entram no log. Registre o identificador do recurso, uma referência que você resolve depois, e pare por aí.

<details>
<summary>❌ Ruim: PII e credenciais em log</summary>

```js
logger.info({ email: user.email, password: user.password }, "login attempt");
logger.info({ cardNumber: payment.card, cvv: payment.cvv }, "payment initiated");

logger.info({ token }, "user authenticated");
```

</details>

<details>
<summary>✅ Bom: IDs e referências, nunca dados sensíveis</summary>

```js
const loginContext = { userId: user.id };
logger.info(loginContext, "login attempt");

const paymentContext = { paymentId: payment.id, last4: payment.lastFour };
logger.info(paymentContext, "payment initiated");

const authContext = { userId: user.id };
logger.info(authContext, "user authenticated");
```

</details>

## ID de correlação

Sem um identificador comum, os logs de uma mesma requisição viram ilhas soltas e você não consegue reconstruir o que aconteceu. O **correlation ID** é o fio que costura essas ilhas: o mesmo valor aparece em todos os logs do fluxo. O `AsyncLocalStorage` do Node guarda esse valor por baixo e injeta em cada log, sem você passar o ID de função em função.

<details>
<summary>❌ Ruim: logs sem contexto de requisição</summary>

```js
async function processOrder(orderId) {
  logger.info("processing order");

  const invoice = await buildInvoice(orderId);

  logger.info("order processed");

  return invoice;
}
// {"msg":"processing order"}: impossível saber qual request originou
```

</details>

<details>
<summary>✅ Bom: correlationId propagado via AsyncLocalStorage</summary>

```js
// middleware/correlation.js
const requestStore = new AsyncLocalStorage();

export function correlationMiddleware(request, response, next) {
  const correlationId = request.headers["x-correlation-id"] ?? crypto.randomUUID();

  response.setHeader("x-correlation-id", correlationId);

  const store = { correlationId };
  requestStore.run(store, next);
}

export const logger = pino({
  mixin() {
    const context = requestStore.getStore();
    return context ?? {};
  },
});

// handler: correlationId incluído automaticamente em todos os logs
async function processOrder(orderId) {
  const startContext = { orderId };
  logger.info(startContext, "processing order");

  const invoice = await buildInvoice(orderId);

  const completedContext = { orderId, invoiceId: invoice.id };
  logger.info(completedContext, "order processed");

  return invoice;
}
// {"correlationId":"abc-123","orderId":"...","msg":"processing order"}
```

</details>
