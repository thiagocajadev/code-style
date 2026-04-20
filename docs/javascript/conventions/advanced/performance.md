# Performance

Estas diretrizes se aplicam a hot paths — fluxos executados em volume ou frequência alta. Fora desse
contexto, prefira legibilidade. Meça antes de otimizar.

## for...of vs forEach

`forEach` executa um callback por iteração — há custo de chamada de função e criação de contexto de
execução a cada item. Em hot paths, `for...of` itera diretamente sobre o iterável, sem callback.

<details>
<br>
<summary>❌ Bad — callback alocado por iteração</summary>

```js
function calculateTotalRevenue(orders) {
  let total = 0;
  orders.forEach((order) => {
    total += order.amount;
  });

  return total;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — for...of sem overhead de callback</summary>

```js
function calculateTotalRevenue(orders) {
  let total = 0;
  for (const order of orders) {
    total += order.amount;
  }

  return total;
}
```

</details>

## Set para membership

`Array.includes()` percorre o array do início ao fim — O(n) por verificação. `Set.has()` resolve em
O(1) via hash. Para listas fixas verificadas frequentemente, definir o `Set` uma vez no módulo e
reutilizar.

<details>
<br>
<summary>❌ Bad — Array.includes percorre tudo a cada chamada</summary>

```js
const PREMIUM_CATEGORIES = ["electronics", "jewelry", "watches"];

function filterPremiumProducts(products) {
  const premiumProducts = products.filter((product) =>
    PREMIUM_CATEGORIES.includes(product.category)
  );

  return premiumProducts;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — Set.has resolve em O(1)</summary>

```js
const PREMIUM_CATEGORIES = new Set(["electronics", "jewelry", "watches"]);

function filterPremiumProducts(products) {
  const premiumProducts = products.filter((product) =>
    PREMIUM_CATEGORIES.has(product.category)
  );

  return premiumProducts;
}
```

</details>

## ID — UUID v4 vs UUID v7

`crypto.randomUUID()` gera UUID v4 — aleatório. Inserções aleatórias fragmentam o índice primário
progressivamente. UUID v7 é time-ordered: insere sempre próximo ao fim da B-tree, sem fragmentação.
Veja o impacto no banco em [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md#tipo-de-id--bigint-vs-uuid).

<details>
<br>
<summary>❌ Bad — crypto.randomUUID() é v4: random, fragmenta índice</summary>

```js
function createOrder(request) {
  const orderId = crypto.randomUUID(); // v4 — random, page splits no banco

  return saveOrder({ id: orderId, ...request });
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — UUID v7: time-ordered, sequencial no índice</summary>

```js
import { v7 as uuidv7 } from "uuid";

function createOrder(request) {
  const orderId = uuidv7(); // time-ordered — sequencial no índice, sem fragmentação

  return saveOrder({ id: orderId, ...request });
}
```

</details>

## String building

Concatenação com `+` ou template literal dentro de um loop aloca uma nova string a cada iteração —
strings são imutáveis em JavaScript. Para construir strings dinamicamente, acumular em array e chamar
`join()` no final: uma alocação, resultado único.

<details>
<br>
<summary>❌ Bad — nova string alocada por iteração</summary>

```js
function buildOrderReport(orders) {
  let report = "";
  for (const order of orders) {
    report += `#${order.id}: ${order.customer} — ${order.total}\n`;
  }

  return report;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — array + join, uma alocação no final</summary>

```js
function buildOrderReport(orders) {
  const lines = [];
  for (const order of orders) {
    lines.push(`#${order.id}: ${order.customer} — ${order.total}`);
  }
  const report = lines.join("\n");

  return report;
}
```

</details>
