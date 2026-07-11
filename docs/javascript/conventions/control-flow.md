# Controle de fluxo em JavaScript

Controle de fluxo é como o código escolhe qual caminho seguir e quantas vezes
repetir um trecho. A ferramenta certa depende de quantas condições existem, se
elas escolhem um valor ou disparam ações, e se o fluxo pode precisar sair no
meio. Este guia vai da ferramenta mais simples (`if`) à mais específica, sempre
com um exemplo ruim e um bom lado a lado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `if` no topo da função que retorna cedo em caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | Sair da função assim que o resultado for conhecido, sem `else` desnecessário |
| **ternary** (ternário) | `cond ? a : b`: expressão condicional curta; legível só quando as três partes são curtas |
| **switch** (selecionar caso) | Comando de despacho por valor; bom para enums e mapeamento explícito |
| **lookup table** (tabela de busca) | Objeto `{ chave: valor }` que substitui cadeias de `if/else` ou `switch` simples |
| **short-circuit** (curto-circuito) | `&&` retorna o primeiro falsy; `||` retorna o primeiro truthy; `??` retorna o primeiro não-nulo |
| **truthy / falsy** (avalia como verdadeiro / como falso) | Valores que avaliam como `true` ou `false` em contexto booleano (`0`, `""`, `null` são falsy) |

## If e else

É o ponto de partida. Para dois caminhos, `if/else` resolve. Só que um `else`
depois de um `return` é ruído: se o fluxo já saiu no `return`, o `else` não
acrescenta nada.

<details>
<summary>❌ Ruim: else desnecessário após return</summary>

```js
function getDiscount(user) {
  if (user.isPremium) {
    return 0.2;
  } else {
    return 0.05;
  }
}
```

</details>

<details>
<summary>✅ Bom: early return elimina o else</summary>

```js
function getDiscount(user) {
  if (user.isPremium) return 0.2;
  return 0.05;
}
```

</details>

## Aninhamento em cascata

Quando as condições se aninham uma dentro da outra, cada nível empurra a lógica
principal mais para dentro. O código vira uma pirâmide deitada, um formato que
ganhou o apelido de código em forma de seta (**arrow antipattern**). A guard
clause inverte isso: valide as saídas no topo, uma por uma, e deixe o caminho
principal reto no fim.

<details>
<summary>❌ Ruim: lógica enterrada em múltiplos níveis</summary>

```js
function processOrder(order) {
  if (order) {
    if (order.isActive) {
      if (order.items.length > 0) {
        if (order.customer) {
          return process(order);
        }
      }
    }
  }
}
```

</details>

<details>
<summary>✅ Bom: guard clauses, fluxo principal ao fundo</summary>

```js
function processOrder(order) {
  if (!order) return;
  if (!order.isActive) return;

  if (order.items.length === 0) return;
  if (!order.customer) return;

  const invoice = process(order);
  return invoice;
}
```

</details>

## Coerção implícita

Uma armadilha comum dentro das condições: o `==` converte os tipos por baixo dos
panos antes de comparar, e o resultado fica imprevisível. Use sempre `===`, que
compara valor e tipo sem conversão.

<details>
<summary>❌ Ruim: coerção silenciosa</summary>

```js
if (value != null) {
  /* ... */
} // true para undefined também
if (value == false) {
  /* ... */
} // true para 0, "" e null
if (count == "3") {
  /* ... */
} // converte tipo sem aviso
```

</details>

<details>
<summary>✅ Bom: comparação explícita</summary>

```js
if (value !== null && value !== undefined) {
  /* ... */
}

if (!value) {
  /* ... */
}

if (count === 3) {
  /* ... */
}
```

</details>

## Ternário

Serve para escolher entre dois valores numa atribuição, não para controlar o
fluxo. Encadeado, vira um quebra-cabeça de ler.

<details>
<summary>❌ Ruim: lógica inline ilegível</summary>

```js
const label =
  score >= 90
    ? "A"
    : score >= 80
      ? "B"
      : score >= 70
        ? "C"
        : score >= 60
          ? "D"
          : "F";
```

</details>

<details>
<summary>✅ Bom: variáveis nomeadas extraem a intenção</summary>

```js
const isA = score >= 90;
const isB = score >= 80;
const isC = score >= 70;
const isD = score >= 60;

// prettier-ignore
const grade = isA ? "A"
  : isB ? "B"
  : isC ? "C"
  : isD ? "D"
  : "F";
```

</details>

## Lookup table

Quando vários `if/else` (ou `case`) só devolvem um valor para cada chave, a lista
de condições é na verdade um catálogo. Troque por um objeto: a chave é a
condição, o valor é o resultado.

<details>
<summary>❌ Ruim: switch repetitivo mapeando chave → valor</summary>

```js
function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
```

</details>

<details>
<summary>✅ Bom: lookup table: legível e extensível</summary>

```js
const STATUS_LABELS = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function getStatusLabel(status) {
  const label = STATUS_LABELS[status] ?? "Unknown";
  return label;
}
```

</details>

## Switch

A tabela de busca resolve quando cada caso devolve um valor. Quando cada caso
precisa executar várias ações (fazer algo, não só devolver um valor), o `switch`
deixa a intenção mais clara do que um `if/else` encadeado. Termine cada `case`
com `break` ou `return`: sem isso, a execução vaza para o próximo caso (o
**fall-through**), e esse vazamento acidental é um bug silencioso.

<details>
<summary>❌ Ruim: if/else encadeado para despacho de ações</summary>

```js
// prettier-ignore
function processPaymentEvent(event) {
  if (event.type === "payment_success") {
    sendReceipt(event.orderId);
    updateOrderStatus(event.orderId, "settled");

  } else if (event.type === "payment_failed") {
    notifyFailure(event.userId);
    scheduleRetry(event.orderId);

  } else if (event.type === "payment_refunded") {
    sendRefundConfirmation(event.userId);
    updateOrderStatus(event.orderId, "refunded");
  }
}
```

</details>

<details>
<summary>✅ Bom: switch para despacho de comportamento</summary>

```js
function processPaymentEvent(event) {
  switch (event.type) {
    case "payment_success":
      sendReceipt(event.orderId);
      updateOrderStatus(event.orderId, "settled");
      break;

    case "payment_failed":
      notifyFailure(event.userId);
      scheduleRetry(event.orderId);
      break;

    case "payment_refunded":
      sendRefundConfirmation(event.userId);
      updateOrderStatus(event.orderId, "refunded");
      break;
  }
}
```

</details>

## Map

A tabela de busca feita com objeto comum tem limites: a chave é sempre convertida
para texto, e não há método pronto para contar o tamanho ou checar a presença com
segurança. O `Map` é a estrutura certa quando a chave não é texto, quando os
dados mudam em tempo de execução, ou quando você precisa de `has`, `delete` e
`size` prontos.

<details>
<summary>❌ Ruim: plain object perde o tipo da chave</summary>

```js
const userCache = {};

userCache[user.id] = user; // id number vira string
console.log(userCache[123] === userCache["123"]); // true: coerção silenciosa

const count = Object.keys(userCache).length; // verbose
```

</details>

<details>
<summary>✅ Bom: Map preserva o tipo da chave e traz métodos prontos</summary>

```js
const userCache = new Map();

userCache.set(user.id, user);
userCache.has(user.id);

userCache.get(user.id);
userCache.delete(user.id);

userCache.size;
```

</details>

---

_As ferramentas acima decidem **qual caminho** seguir. As de baixo resolvem a
**repetição**: quantas vezes percorrer uma coleção._

## Parar no primeiro resultado

Antes de escrever um laço na mão, veja se `find`, `some` ou `every` já resolvem.
Esses métodos param assim que acham o que procuravam, sem percorrer o resto. Para
uma busca com saída explícita, `for...of` com `return` é direto.

<details>
<summary>❌ Ruim: forEach com flag força percorrer tudo</summary>

```js
function findFirstExpiredProduct(products) {
  let expiredProduct = null;

  products.forEach((product) => {
    if (!expiredProduct && product.isExpired) {
      expiredProduct = product; // continua iterando mesmo após encontrar
    }
  });

  return expiredProduct;
}
```

</details>

<details>
<summary>✅ Bom: for...of para no primeiro que corresponde</summary>

```js
function findFirstExpiredProduct(products) {
  for (const product of products) {
    if (product.isExpired) return product;
  }

  return null;
}
```

</details>

<details>
<summary>❌ Ruim: forEach percorre tudo mesmo quando o método declarativo existe</summary>

```js
function hasExpiredProduct(products) {
  let found = false;

  products.forEach((product) => {
    if (product.isExpired) found = true;
  });

  return found;
}
```

</details>

<details>
<summary>✅ Bom: métodos que já param no primeiro resultado</summary>

```js
// para no primeiro match
const expiredProduct = products.find((product) => product.isExpired);

// para no primeiro true
const hasExpiredProduct = products.some((product) => product.isExpired);

// para no primeiro false
const allProductsActive = products.every((product) => product.isActive);
```

</details>

## forEach

Quando você só precisa fazer algo com cada item de uma coleção (um efeito
colateral, como notificar ou salvar), `forEach` basta e é claro: sem índice, sem
variável de controle.

<details>
<summary>❌ Ruim: for com índice quando o índice nunca é usado</summary>

```js
for (let i = 0; i < orders.length; i++) {
  notifyCustomer(orders[i]);
}
```

</details>

<details>
<summary>✅ Bom: forEach para efeitos colaterais por item</summary>

```js
orders.forEach((order) => {
  notifyCustomer(order);
});
```

</details>

> `forEach` não suporta `break` nem `continue`. Quando precisar de saída
> antecipada, use `for...of`.

## for...of

Quando o laço precisa sair no meio ou trabalhar direto com os valores, `for...of`
é a escolha: sem índice no caminho, com `break` e `continue`, e funciona com
qualquer coleção percorrível.

<details>
<summary>❌ Ruim: for...in em array percorre o protótipo</summary>

```js
const prices = [10, 20, 30];

for (const index in prices) {
  console.log(prices[index]); // índices como strings, inclui herança do protótipo
}
```

</details>

<details>
<summary>✅ Bom: for...of para valores diretos</summary>

```js
const prices = [10, 20, 30];

for (const price of prices) {
  console.log(price);
}
```

</details>

<details>
<summary>❌ Ruim: iteração de objeto com for...of sem Object.entries</summary>

```js
const config = { host: "localhost", port: 5432, database: "app" };

for (const key of config) {
  console.log(key); // TypeError: config is not iterable
}
```

</details>

<details>
<summary>✅ Bom: Object.entries() para objetos</summary>

```js
const config = { host: "localhost", port: 5432, database: "app" };

for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value}`);
}
```

</details>

## while

Quando não há uma coleção pronta e a parada depende de uma condição (não de um
índice ou tamanho), `while` é a escolha natural. Use `do...while` quando a
primeira volta precisa acontecer sempre, antes de checar a condição.

<details>
<summary>❌ Ruim: for simulando condição de parada por estado</summary>

```js
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const connection = connectToDatabase();
  if (connection.isReady) break; // o índice não tem significado aqui
}
```

</details>

<details>
<summary>✅ Bom: while para condição de parada por estado</summary>

```js
let attempt = 0;

while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

<details>
<summary>❌ Ruim: while quando a fila deve processar ao menos um item</summary>

```js
// verifica antes de executar: se a fila já estiver vazia, nunca executa
while (taskQueue.size > 0) {
  const task = taskQueue.dequeue();
  executeTask(task);
}
```

</details>

<details>
<summary>✅ Bom: do...while quando a primeira execução é garantida</summary>

```js
// drena a fila: processa pelo menos um item antes de verificar
do {
  const task = taskQueue.dequeue();
  executeTask(task);
} while (taskQueue.size > 0);
```

</details>
