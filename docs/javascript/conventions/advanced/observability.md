# Observability

Logging estruturado, níveis corretos, proteção de dados sensíveis e rastreamento por requisição.
Veja os princípios agnósticos em [shared/observability.md](../../../shared/observability.md).

## Logging estruturado

`console.log` com strings é ilegível para sistemas de observabilidade. Usar Pino (ou Winston) com
objetos estruturados: cada campo vira uma propriedade pesquisável.

<details>
<summary>❌ Bad — string concatenada, ilegível para ferramentas</summary>
<br>

```js
logger.info(`Order ${order.id} processed by user ${user.id} — total: $${order.total}`);
logger.error(`Payment failed: ${error.message} for order ${order.id}`);
```

</details>

<br>

<details>
<summary>✅ Good — objeto estruturado com campos semânticos</summary>
<br>

```js
const orderContext = { orderId: order.id, userId: user.id, total: order.total };
logger.info(orderContext, "order processed");

const paymentErrorContext = { orderId: order.id, error: error.message };
logger.error(paymentErrorContext, "payment failed");
```

</details>

## Níveis de log

<details>
<summary>❌ Bad — console.log para tudo, sem distinção de severidade</summary>
<br>

```js
console.log("Checkout started");
console.log(`Database query took ${durationMs}ms`);
console.log(`User ${userId} not found`);
```

</details>

<br>

<details>
<summary>✅ Good — nível correto por situação</summary>
<br>

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

<details>
<summary>❌ Bad — PII e credenciais em log</summary>
<br>

```js
logger.info({ email: user.email, password: user.password }, "login attempt");
logger.info({ cardNumber: payment.card, cvv: payment.cvv }, "payment initiated");
logger.info({ token }, "user authenticated");
```

</details>

<br>

<details>
<summary>✅ Good — IDs e referências, nunca dados sensíveis</summary>
<br>

```js
const loginContext = { userId: user.id };
logger.info(loginContext, "login attempt");

const paymentContext = { paymentId: payment.id, last4: payment.lastFour };
logger.info(paymentContext, "payment initiated");

const authContext = { userId: user.id };
logger.info(authContext, "user authenticated");
```

</details>

## Correlation ID

Sem um identificador comum, logs de uma mesma requisição são ilhas — impossível rastrear o fluxo.
`AsyncLocalStorage` propaga o `correlationId` para todos os logs sem passar por parâmetro.

<details>
<summary>❌ Bad — logs sem contexto de requisição</summary>
<br>

```js
async function processOrder(orderId) {
  logger.info("processing order");
  const invoice = await buildInvoice(orderId);
  logger.info("order processed");

  return invoice;
}
// {"msg":"processing order"} — impossível saber qual request originou
```

</details>

<br>

<details>
<summary>✅ Good — correlationId propagado via AsyncLocalStorage</summary>
<br>

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

// handler — correlationId incluído automaticamente em todos os logs
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
