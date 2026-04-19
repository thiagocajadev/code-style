# Observability

Logging estruturado, níveis corretos, proteção de dados sensíveis e rastreamento por requisição.
Veja os princípios agnósticos em [shared/observability.md](../../shared/observability.md).

## Logging estruturado

`console.log` com strings é ilegível para sistemas de observabilidade. Usar Pino (ou Winston) com
objetos estruturados: cada campo vira uma propriedade pesquisável.

<details>
<summary>❌ Bad — string concatenada, ilegível para ferramentas</summary>

```js
logger.info(`Order ${order.id} processed by user ${user.id} — total: $${order.total}`);
logger.error(`Payment failed: ${error.message} for order ${order.id}`);
```

</details>

<details>
<summary>✅ Good — objeto estruturado com campos semânticos</summary>

```js
logger.info({ orderId: order.id, userId: user.id, total: order.total }, "order processed");
logger.error({ orderId: order.id, error: error.message }, "payment failed");
```

</details>

## Níveis de log

<details>
<summary>❌ Bad — console.log para tudo, sem distinção de severidade</summary>

```js
console.log("Checkout started");
console.log(`Database query took ${durationMs}ms`);
console.log(`User ${userId} not found`);
```

</details>

<details>
<summary>✅ Good — nível correto por situação</summary>

```js
logger.info({ cartId }, "checkout started");
logger.warn({ cartId, durationMs }, "slow database query");
logger.error({ cartId, userId }, "user not found during checkout");
```

</details>

## O que nunca logar

<details>
<summary>❌ Bad — PII e credenciais em log</summary>

```js
logger.info({ email: user.email, password: user.password }, "login attempt");
logger.info({ cardNumber: payment.card, cvv: payment.cvv }, "payment initiated");
logger.info({ token }, "user authenticated");
```

</details>

<details>
<summary>✅ Good — IDs e referências, nunca dados sensíveis</summary>

```js
logger.info({ userId: user.id }, "login attempt");
logger.info({ paymentId: payment.id, last4: payment.lastFour }, "payment initiated");
logger.info({ userId: user.id }, "user authenticated");
```

</details>

## Correlation ID

Sem um identificador comum, logs de uma mesma requisição são ilhas — impossível rastrear o fluxo.
`AsyncLocalStorage` propaga o `correlationId` para todos os logs sem passar por parâmetro.

<details>
<summary>❌ Bad — logs sem contexto de requisição</summary>

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

<details>
<summary>✅ Good — correlationId propagado via AsyncLocalStorage</summary>

```js
// middleware/correlation.js
const requestStore = new AsyncLocalStorage();

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers["x-correlation-id"] ?? crypto.randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  requestStore.run({ correlationId }, next);
}

export const logger = pino({
  mixin() {
    const context = requestStore.getStore();
    return context ?? {};
  },
});

// handler — correlationId incluído automaticamente em todos os logs
async function processOrder(orderId) {
  logger.info({ orderId }, "processing order");
  const invoice = await buildInvoice(orderId);
  logger.info({ orderId, invoiceId: invoice.id }, "order processed");
  return invoice;
}
// {"correlationId":"abc-123","orderId":"...","msg":"processing order"}
```

</details>
