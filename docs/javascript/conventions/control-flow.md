# Control Flow

Controle de fluxo evolui com a complexidade. A ferramenta certa depende de quantas condições
existem, se mapeiam valores ou executam ações, e se o fluxo pode precisar de saída antecipada.

## If e else

O ponto de partida. Para dois caminhos, `if/else` funciona. O `else` após um `return` é ruído:
o fluxo já saiu.

<details>
<summary>❌ Bad — else desnecessário após return</summary>
<br>

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

<br>

<details>
<summary>✅ Good — early return elimina o else</summary>
<br>

```js
function getDiscount(user) {
  if (user.isPremium) return 0.2;
  return 0.05;
}
```

</details>

## Aninhamento em cascata

Quando as condições crescem e se aninham, cada nível enterra a lógica um nível mais fundo. O fluxo
vira uma pirâmide: o _arrow antipattern_.

Guard clauses invertem: valide as saídas no topo e deixe o fluxo principal limpo.

<details>
<summary>❌ Bad — lógica enterrada em múltiplos níveis</summary>
<br>

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

<br>

<details>
<summary>✅ Good — guard clauses, fluxo principal ao fundo</summary>
<br>

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

Trap frequente dentro de condicionais: `==` coerce tipos silenciosamente e torna a comparação
imprevisível.

<details>
<summary>❌ Bad — coerção silenciosa</summary>
<br>

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

<br>

<details>
<summary>✅ Good — comparação explícita</summary>
<br>

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

Para atribuição de dois valores possíveis, não para lógica de fluxo. Encadeado, vira puzzle.

<details>
<summary>❌ Bad — lógica inline ilegível</summary>
<br>

```js
const label = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
```

</details>

<br>

<details>
<summary>✅ Good — variáveis nomeadas extraem a intenção</summary>
<br>

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

Quando múltiplos guards ou `if/else` retornam um valor para cada chave, a lista de condições vira um
catálogo. Substitua por um objeto: a chave é a condição, o valor é o resultado.

<details>
<summary>❌ Bad — switch repetitivo mapeando chave → valor</summary>
<br>

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

<br>

<details>
<summary>✅ Good — lookup table: legível e extensível</summary>
<br>

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

Lookup table resolve mapeamento de valores. Quando cada caso precisa executar múltiplas ações (não
retornar um valor, mas fazer algo), `switch` torna a intenção mais clara que um `if/else` encadeado.
Cada `case` termina com `break` ou `return` explícito: fall-through acidental é bug silencioso.

<details>
<summary>❌ Bad — if/else encadeado para despacho de ações</summary>
<br>

```js
// prettier-ignore
function processPaymentEvent(event) {
  if (event.type === "payment_success") {
    sendReceipt(event.orderId);
    updateOrderStatus(event.orderId, "paid");

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

<br>

<details>
<summary>✅ Good — switch para despacho de comportamento</summary>
<br>

```js
function processPaymentEvent(event) {
  switch (event.type) {
    case "payment_success":
      sendReceipt(event.orderId);
      updateOrderStatus(event.orderId, "paid");
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

Lookup table com plain object tem limitações: chaves são sempre coercidas para string e não há
métodos nativos para tamanho ou verificação segura. `Map` é a estrutura certa quando a chave não é
string, quando os dados são dinâmicos, ou quando você precisa de `has`, `delete` e `size` nativos.

<details>
<summary>❌ Bad — plain object perde o tipo da chave</summary>
<br>

```js
const userCache = {};

userCache[user.id] = user; // id number vira string
console.log(userCache[123] === userCache["123"]); // true — coerção silenciosa
const count = Object.keys(userCache).length; // verbose
```

</details>

<br>

<details>
<summary>✅ Good — Map preserva tipo e tem API nativa</summary>
<br>

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

_As ferramentas acima resolvem **decisão**: qual caminho seguir. As abaixo resolvem **iteração**:
quantas vezes percorrer._

## forEach

Para efeitos colaterais sobre cada item de uma coleção, `forEach` é declarativo e suficiente: sem
índice, sem variável de controle.

<details>
<summary>❌ Bad — for com índice quando o índice nunca é usado</summary>
<br>

```js
for (let i = 0; i < orders.length; i++) {
  notifyCustomer(orders[i]);
}
```

</details>

<br>

<details>
<summary>✅ Good — forEach para efeitos colaterais por item</summary>
<br>

```js
orders.forEach((order) => {
  notifyCustomer(order);
});
```

</details>

> `forEach` não suporta `break` nem `continue` — quando precisar de saída antecipada, use
> `for...of`.

## for...of

Quando o laço precisa de saída antecipada ou iteração com valores diretos, `for...of` é a escolha:
sem índice implícito, com suporte a `break` e `continue`, compatível com qualquer iterável.

<details>
<summary>❌ Bad — for...in em array percorre o protótipo</summary>
<br>

```js
const prices = [10, 20, 30];

for (const index in prices) {
  console.log(prices[index]); // índices como strings, inclui herança do protótipo
}
```

</details>

<br>

<details>
<summary>✅ Good — for...of para valores diretos</summary>
<br>

```js
const prices = [10, 20, 30];

for (const price of prices) {
  console.log(price);
}
```

</details>

<br>

<details>
<summary>❌ Bad — iteração de objeto com for...of sem Object.entries</summary>
<br>

```js
const config = { host: "localhost", port: 5432, database: "app" };

for (const key of config) {
  console.log(key); // TypeError: config is not iterable
}
```

</details>

<br>

<details>
<summary>✅ Good — Object.entries() para objetos</summary>
<br>

```js
const config = { host: "localhost", port: 5432, database: "app" };

for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value}`);
}
```

</details>

## Circuit break

Sair cedo de um laço é uma decisão de fluxo. `for...of` com `break` ou `return` é explícito. Para
buscas e verificações, os métodos de array fazem circuit break internamente: param no primeiro
match, sem percorrer o resto.

<details>
<summary>❌ Bad — forEach com flag força percorrer tudo</summary>
<br>

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

<br>

<details>
<summary>✅ Good — for...of sai no primeiro match</summary>
<br>

```js
function findFirstExpiredProduct(products) {
  for (const product of products) {
    if (product.isExpired) return product;
  }

  return null;
}
```

</details>

<br>

<details>
<summary>❌ Bad — forEach percorre tudo mesmo quando o método declarativo existe</summary>
<br>

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

<br>

<details>
<summary>✅ Good — métodos declarativos com circuit break nativo</summary>
<br>

```js
// para no primeiro match
const expiredProduct = products.find((product) => product.isExpired);

// para no primeiro true
const hasExpiredProduct = products.some((product) => product.isExpired);

// para no primeiro false
const allProductsActive = products.every((product) => product.isActive);
```

</details>

## while

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice ou tamanho,
`while` é a escolha natural. Use `do...while` quando a primeira iteração deve sempre executar,
independente da condição.

<details>
<summary>❌ Bad — for simulando condição de parada por estado</summary>
<br>

```js
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const connection = connectToDatabase();
  if (connection.isReady) break; // o índice não tem significado aqui
}
```

</details>

<br>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>
<br>

```js
let attempt = 0;

while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

<br>

<details>
<summary>❌ Bad — while quando a fila deve processar ao menos um item</summary>
<br>

```js
// verifica antes de executar — se a fila já estiver vazia, nunca executa
while (taskQueue.size > 0) {
  const task = taskQueue.dequeue();
  executeTask(task);
}
```

</details>

<br>

<details>
<summary>✅ Good — do...while quando a primeira execução é garantida</summary>
<br>

```js
// drena a fila: processa pelo menos um item antes de verificar
do {
  const task = taskQueue.dequeue();
  executeTask(task);
} while (taskQueue.size > 0);
```

</details>
