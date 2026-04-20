# Null Safety

> Escopo: JavaScript. Visão transversal: [shared/null-safety.md](../../../shared/null-safety.md).

JavaScript não tem compilador que rastreie nullability. A responsabilidade é do código. A regra
é a mesma: fechar null nas fronteiras, confiar no interior.

> Conceito geral: [Null Safety](../../../../shared/null-safety.md)

## ?? vs ||

`||` retorna o lado direito para qualquer valor falsy: `0`, `""` e `false` disparam o fallback.
`??` retorna o lado direito **só para `null` e `undefined`**. Para defaults, `??` é o correto
na maioria dos casos.

<details>
<summary>❌ Bad — || descarta valores falsy válidos</summary>
<br>

```js
const timeout = config.timeout || 5000; // 0 → 5000 — zero é tempo válido
const retries = input.retries || 3;     // 0 → 3 — zero retries é intencional

const debug = options.debug || false;   // false → false — ok aqui, mas por acidente
```

</details>

<br>

<details>
<summary>✅ Good — ?? respeita 0, "" e false</summary>
<br>

```js
const timeout = config.timeout ?? 5000;
const retries = input.retries ?? 3;

const port = process.env.PORT ?? config.port ?? 3000; // encadeamento de fallbacks
```

</details>

## ??= vs ||=

`??=` atribui só se o valor atual for `null` ou `undefined`. `||=` atribui se for qualquer falsy.
A mesma distinção de `??` vs `||`, aplicada à atribuição lógica.

<details>
<summary>❌ Bad — ||= sobrescreve zero, que é um valor válido</summary>
<br>

```js
let count = 0;
count ||= 10; // count vira 10 — zero é falsy, então ||= dispara
```

</details>

<br>

<details>
<summary>✅ Good — ??= respeita zero e false</summary>
<br>

```js
let count = 0;
count ??= 10; // count permanece 0 — zero não é null

const config = {};
config.port ??= 3000;

config.port ??= 8080; // não executa — port já é 3000
```

</details>

## ?. navegação segura

`?.` retorna `undefined` se o receptor for `null` ou `undefined`, sem lançar exceção.

Tem lugar para campos **opcionais por design**. Quando o campo deveria sempre existir, a ausência
é um bug: use guard clause.

<details>
<summary>❌ Bad — ?. esconde contrato fraco</summary>
<br>

```js
async function getOrderTotal(orderId) {
  const order = await db.orders.findById(orderId);
  return order?.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
  // se order não existe, retorna 0 silenciosamente — é isso que queremos?
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clause quando ausência é erro; ?. quando é esperada</summary>
<br>

```js
// ausência é erro → guard clause
async function getOrderTotal(orderId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError({ message: `Order ${orderId} not found.` });

  const total = order.items.reduce((sum, item) => sum + item.price, 0);

  return total;
}

// ausência é esperada → ?. é suficiente
function formatUserCity(user) {
  const city = user?.address?.city ?? "N/A";

  return city;
}
```

</details>

## Coleções nunca são nulas

Funções que retornam listas sempre retornam `[]`, nunca `null`. Na fronteira com dados externos,
normalize com `?? []`.

<details>
<summary>❌ Bad — null em lista força defesa no caller</summary>
<br>

```js
async function findOrdersByUser(userId) {
  const orders = await db.orders.findByUser(userId);
  return orders.length ? orders : null;
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia como estado neutro</summary>
<br>

```js
async function findOrdersByUser(userId) {
  const orders = await orderRepository.findByUser(userId);
  return orders; // ORM já retorna [] — nunca null
}

// fronteira com API externa: normaliza na entrada
async function fetchUserOrders(userId) {
  const response = await externalApi.get(`/users/${userId}/orders`);
  const orders = response.orders ?? []; // normaliza aqui, não no caller

  return orders;
}
```

</details>

## Array.flatMap: filtrar e mapear sem null

`flatMap` com retorno de `[]` nos casos inválidos é o padrão moderno para remover nulls durante
uma transformação: mais expressivo que `.filter().map()` por percorrer o array uma única vez.

<details>
<summary>❌ Bad — filter + map percorre o array duas vezes</summary>
<br>

```js
const rawItems = ["1", null, "3", undefined, "5"];

const parsed = rawItems
  .filter((item) => item != null)
  .map((item) => parseInt(item, 10));
```

</details>

<br>

<details>
<summary>✅ Good — flatMap filtra e transforma em uma passagem</summary>
<br>

```js
const rawItems = ["1", null, "3", undefined, "5"];

const parsed = rawItems.flatMap((item) => {
  if (item == null) return [];
  return [parseInt(item, 10)];
});
// [1, 3, 5]
```

</details>

## Object.hasOwn: checar propriedade com segurança

`Object.hasOwn(obj, key)` verifica se a propriedade existe no próprio objeto, sem riscos de
prototype pollution. Substitui o padrão antigo `obj.hasOwnProperty(key)`.

<details>
<summary>❌ Bad — hasOwnProperty vulnerável a prototype pollution</summary>
<br>

```js
const config = { timeout: 0 };

config.hasOwnProperty("timeout"); // funciona, mas pode ser sobrescrito via prototype
```

</details>

<br>

<details>
<summary>✅ Good — Object.hasOwn seguro e direto</summary>
<br>

```js
const config = { timeout: 0, debug: false };

Object.hasOwn(config, "timeout"); // true — existe, mesmo sendo 0
Object.hasOwn(config, "retries"); // false — não existe

function mergeConfig(defaults, overrides) {
  const result = { ...defaults };

  for (const key of Object.keys(overrides)) {
    if (Object.hasOwn(defaults, key)) {
      result[key] = overrides[key] ?? defaults[key];
    }
  }

  return result;
}
```

</details>

## structuredClone: cópia profunda sem perder nulls

`JSON.parse(JSON.stringify(obj))` descarta campos `undefined` e não preserva `Date`, `Map` e
`Set`. `structuredClone` copia corretamente, preservando `null` e os tipos nativos.

<details>
<summary>❌ Bad — JSON round-trip perde undefined, Date e Map</summary>
<br>

```js
const order = {
  notes: null,
  tags: undefined,
  createdAt: new Date(),
  meta: new Map([["source", "web"]]),
};

const clone = JSON.parse(JSON.stringify(order));
// notes: null       ✓
// tags              ausente — undefined some
// createdAt         "2026-..." — virou string
// meta              {} — Map virou objeto vazio
```

</details>

<br>

<details>
<summary>✅ Good — structuredClone preserva todos os tipos</summary>
<br>

```js
const order = {
  notes: null,
  tags: undefined,
  createdAt: new Date(),
  meta: new Map([["source", "web"]]),
};

const clone = structuredClone(order);
// notes: null       ✓
// tags: undefined   ✓
// createdAt: Date   ✓
// meta: Map         ✓

clone.meta.set("cloned", true); // não afeta o original
```

</details>
