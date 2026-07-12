# Segurança contra nulos em JavaScript

> Escopo: JavaScript. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

JavaScript não tem um compilador que avise, antes de rodar, quando um valor pode ser nulo. Essa **nullability** (possibilidade de o valor ser nulo ou indefinido) fica por conta do código: validar nos **boundaries** (limites, os pontos onde dados externos entram) e confiar no interior a partir daí. Os operadores `??` e `?.` deixam essa intenção explícita. Escolher o operador errado, `||` no lugar de `??`, descarta valores válidos como `0` e `""`, o tipo de bug que costuma aparecer só em produção.

> Conceito geral: [Null Safety](../../../shared/standards/null-safety.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **null** (nulo) | Valor explícito que indica "ausência intencional"; atribuído pelo programador |
| **undefined** (indefinido) | Valor padrão de variável não inicializada ou propriedade inexistente; atribuído pela engine |
| **nullish** (ausente: nulo ou indefinido) | Conjunto que reúne `null` e `undefined`; o que `??` e `?.` tratam |
| **falsy** (avalia como falso) | Valores que avaliam como `false` em booleano: `null`, `undefined`, `0`, `""`, `false`, `NaN` |
| **nullish coalescing** (coalescência de ausente, `??`) | Retorna o lado direito apenas se o esquerdo for `null` ou `undefined` |
| **optional chaining** (encadeamento opcional, `?.`) | Acessa propriedade ou chama método sem lançar erro se a base for nullish |
| **boundary** (limite) | Ponto onde dados externos entram (HTTP, DB, fila); local correto para validar nulos |
| **non-null assertion** (afirmação de não-nulo) | Garantia explícita ao leitor de que o valor não é nulo neste ponto; em JS via comentário ou guard |

## Valor padrão sem descartar 0 e ""

`||` devolve o lado direito para qualquer valor **falsy** (que avalia como falso): `0`, `""` e
`false` já disparam o valor alternativo. `??` devolve o lado direito só quando o esquerdo é
`null` ou `undefined`. Para preencher um valor padrão, `??` é o certo na maioria dos casos.

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

## Atribuir um padrão só quando o valor é nulo

`??=` atribui só se o valor atual for `null` ou `undefined`. `||=` atribui para qualquer falsy.
É a mesma distinção entre `??` e `||`, agora na forma de atribuição.

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

## Quando ?. ajuda e quando esconde um bug

`?.` devolve `undefined` se o receptor for `null` ou `undefined`, sem lançar exceção.

O lugar dele é o campo opcional por natureza. Quando o campo deveria sempre existir, a ausência
é um bug, e abafá-la com `?.` só adia a descoberta: use uma guard clause que falha na hora.

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

## flatMap: filtrar e transformar em uma passagem

`flatMap` que devolve `[]` nos casos inválidos remove os nulos durante a própria transformação.
Lê melhor que `.filter().map()` e percorre o array uma única vez em vez de duas.

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

## Object.hasOwn para checar propriedade com segurança

`Object.hasOwn(obj, key)` verifica se a propriedade existe no próprio objeto, sem cair na
**prototype pollution** (propriedades injetadas no protótipo por um atacante). Substitui o
padrão antigo `obj.hasOwnProperty(key)`, que pode ser sobrescrito.

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

## structuredClone para cópia profunda

`JSON.parse(JSON.stringify(obj))` descarta campos `undefined` e não preserva `Date`, `Map` nem
`Set`. `structuredClone` faz a cópia profunda mantendo `null` e os tipos nativos como estão.

<details>
<summary>❌ Ruim: JSON round-trip perde undefined, Date e Map</summary>

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
