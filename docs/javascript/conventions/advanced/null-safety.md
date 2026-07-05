# Null Safety

> Escopo: JavaScript. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

JavaScript não tem compilador que rastreie **nullability** (nulabilidade, possibilidade de o valor ser nulo). A responsabilidade é do código: validar nos **boundaries** (limites, pontos de entrada de dados externos) e confiar no interior. Operadores específicos (`??`, `?.`) tornam a intenção explícita; usar o operador errado (`||` em vez de `??`) descarta valores válidos como `0` ou `""`.

> Conceito geral: [Null Safety](../../../shared/standards/null-safety.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **null** (nulo) | Valor explícito que indica "ausência intencional"; atribuído pelo programador |
| **undefined** (indefinido) | Valor padrão de variável não inicializada ou propriedade inexistente; atribuído pela engine |
| **nullish** (ausente: nulo ou indefinido) | Conjunto que reúne `null` e `undefined`; o que `??` e `?.` tratam |
| **falsy** (avalia como falso) | Valores que coercionam para `false` em booleano: `null`, `undefined`, `0`, `""`, `false`, `NaN` |
| **nullish coalescing** (coalescência de ausente, `??`) | Retorna o lado direito apenas se o esquerdo for `null` ou `undefined` |
| **optional chaining** (encadeamento opcional, `?.`) | Acessa propriedade ou chama método sem lançar erro se a base for nullish |
| **boundary** (limite) | Ponto onde dados externos entram (HTTP, DB, fila); local correto para validar nulos |
| **non-null assertion** (afirmação de não-nulo) | Garantia explícita ao leitor de que o valor não é nulo neste ponto; em JS via comentário ou guard |

## ?? vs ||

`||` retorna o lado direito para qualquer valor falsy: `0`, `""` e `false` disparam o fallback.
`??` retorna o lado direito **só para `null` e `undefined`**. Para defaults, `??` é o correto
na maioria dos casos.

<details>
<summary>❌ Ruim: || descarta valores falsy válidos</summary>

```js
const timeout = config.timeout || 5000; // 0 → 5000: zero é tempo válido
const retries = input.retries || 3;     // 0 → 3: zero retries é intencional

const debug = options.debug || false;   // false → false: ok aqui, mas por acidente
```

</details>

<details>
<summary>✅ Bom: ?? respeita 0, "" e false</summary>

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
<summary>❌ Ruim: ||= sobrescreve zero, que é um valor válido</summary>

```js
let count = 0;
count ||= 10; // count vira 10: zero é falsy, então ||= dispara
```

</details>

<details>
<summary>✅ Bom: ??= respeita zero e false</summary>

```js
let count = 0;
count ??= 10; // count permanece 0: zero não é null

const config = {};
config.port ??= 3000;

config.port ??= 8080; // não executa: port já é 3000
```

</details>

## ?. navegação segura

`?.` retorna `undefined` se o receptor for `null` ou `undefined`, sem lançar exceção.

Tem lugar para campos **opcionais por design**. Quando o campo deveria sempre existir, a ausência
é um bug: use guard clause.

<details>
<summary>❌ Ruim: ?. esconde contrato fraco</summary>

```js
async function getOrderTotal(orderId) {
  const order = await db.orders.findById(orderId);
  return order?.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
  // se order não existe, retorna 0 silenciosamente. É isso que queremos?
}
```

</details>

<details>
<summary>✅ Bom: guard clause quando ausência é erro; ?. quando é esperada</summary>

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

Funções que retornam listas sempre retornam `[]`, nunca `null`. No limite com dados externos,
normalize com `?? []`.

<details>
<summary>❌ Ruim: null em lista força defesa no caller</summary>

```js
async function findOrdersByUser(userId) {
  const orders = await db.orders.findByUser(userId);
  return orders.length ? orders : null;
}
```

</details>

<details>
<summary>✅ Bom: lista vazia como estado neutro</summary>

```js
async function findOrdersByUser(userId) {
  const orders = await orderRepository.findByUser(userId);
  return orders; // ORM já retorna []: nunca null
}

// limite com API externa: normaliza na entrada
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
<summary>❌ Ruim: filter + map percorre o array duas vezes</summary>

```js
const rawItems = ["1", null, "3", undefined, "5"];

const parsed = rawItems
  .filter((item) => item != null)
  .map((item) => parseInt(item, 10));
```

</details>

<details>
<summary>✅ Bom: flatMap filtra e transforma em uma passagem</summary>

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
<summary>❌ Ruim: hasOwnProperty vulnerável a prototype pollution</summary>

```js
const config = { timeout: 0 };

config.hasOwnProperty("timeout"); // funciona, mas pode ser sobrescrito via prototype
```

</details>

<details>
<summary>✅ Bom: Object.hasOwn seguro e direto</summary>

```js
const config = { timeout: 0, debug: false };

Object.hasOwn(config, "timeout"); // true: existe, mesmo sendo 0
Object.hasOwn(config, "retries"); // false: não existe

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
<summary>❌ Ruim: **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) round-trip perde undefined, Date e Map</summary>

```js
const order = {
  notes: null,
  tags: undefined,
  createdAt: new Date(),
  meta: new Map([["source", "web"]]),
};

const clone = JSON.parse(JSON.stringify(order));
// notes: null       ✓
// tags              ausente: undefined some
// createdAt         "2026-...": virou string
// meta              {}: Map virou objeto vazio
```

</details>

<details>
<summary>✅ Bom: structuredClone preserva todos os tipos</summary>

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
