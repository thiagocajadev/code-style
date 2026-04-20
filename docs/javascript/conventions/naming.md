# Naming

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Identificadores sem significado

<details>
<br>
<summary>❌ Bad</summary>

```js
const r = apply(data, pedido, callback);

function apply(x, p, c) {
  if (p.c.inadimplente) return false;
  return c(x);
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good</summary>

```js
const discountedOrder = applyDiscount(order, calculateDiscount);

function applyDiscount(order, calculateDiscount) {
  if (order.customer.defaulted) return null;

  const discountedOrder = calculateDiscount(order);

  return discountedOrder;
}
```

</details>

## Nomes em português

<details>
<br>
<summary>❌ Bad — camelCase com português fica desajeitado</summary>

```js
const nomeDoUsuario = "Alice";
const listaDeIds = [1, 2, 3];

function retornaOUsuario(id) {
  /* ... */
}
function buscaEnderecoDoCliente(id) {
  /* ... */
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — inglês: curto, direto, universal</summary>

```js
const userName = "Alice";
const idList = [1, 2, 3];

function getUser(id) {
  /* ... */
}
function getCustomerAddress(id) {
  /* ... */
}
```

</details>

## Mistura de idiomas

<details>
<br>
<summary>❌ Bad — português e inglês no mesmo arquivo</summary>

```js
function notify(pedido) {
  console.log("cliente inadimplente", pedido?.cliente?.nome);
}

const resultado = processOrder(pedido);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — consistência de idioma</summary>

```js
function notifyDefault(order) {
  console.log("defaulted customer:", order?.customer?.name);
}

const result = processOrder(order);
```

</details>

## Ordem semântica invertida

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

<details>
<br>
<summary>❌ Bad — ordem invertida</summary>

```js
getProfileUser(); // "get profile, that's a user"
updateStatusOrder(); // status pertence ao pedido
calculateTotalInvoice(); // "invoice total" é a expressão natural
```

</details>

<br>

<details>
<br>
<summary>✅ Good — ordem natural</summary>

```js
getUserProfile();
updateOrderStatus();
calculateInvoiceTotal();
```

</details>

## Verbos genéricos

<details>
<br>
<summary>❌ Bad — handle, process, manage, do não dizem nada</summary>

```js
function handle(data) {
  /* ... */
}
function process(input) {
  /* ... */
}
function manage(items) {
  /* ... */
}
function doStuff(x) {
  /* ... */
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — verbo de intenção</summary>

```js
function validatePayment(payment) {
  /* ... */
}
function calculateOrderTotal(items) {
  /* ... */
}
function notifyCustomerDefault(order) {
  /* ... */
}
function applySeasonalDiscount(order) {
  /* ... */
}
```

</details>

## Taxonomia de verbos

| Intenção           | Preferir                                  | Evitar             |
| ------------------ | ----------------------------------------- | ------------------ |
| Ler de storage     | `fetch`, `load`, `find`, `get`            | `retrieve`, `pull` |
| Escrever/persistir | `save`, `persist`, `create`, `insert`     | `put`, `push`      |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build` | `get`, `do`        |
| Transformar        | `map`, `transform`, `convert`, `format`   | `process`, `parse` |
| Validar            | `validate`, `check`, `assert`, `verify`   | `handle`, `test`   |
| Notificar          | `send`, `dispatch`, `notify`, `emit`      | `fire`, `trigger`  |

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de como ou onde a operação acontece.

<details>
<br>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>

```js
function callStripe(amount) {
  /* ... */
}
function getUserFromDB(id) {
  /* ... */
}
function postToSlack(message) {
  /* ... */
}
function saveToS3(file) {
  /* ... */
}
function queryElastic(term) {
  /* ... */
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — nome fala a linguagem do negócio</summary>

```js
function chargeCustomer(amount) {
  /* ... */
}
function findUser(id) {
  /* ... */
}
function notifyTeam(message) {
  /* ... */
}
function archiveDocument(file) {
  /* ... */
}
function searchProducts(term) {
  /* ... */
}
```

</details>

## Código como documentação

Comentários que explicam o _quê_ mentem — o código muda, o comentário fica. Um nome expressivo
substitui qualquer comentário.

<details>
<br>
<summary>❌ Bad — comentário repete o que o código já diz</summary>

```js
// verifica se o usuário pode excluir registros
if (user.status === "active" && user.roles.includes("admin")) {
  deleteRecord(id);
}

// incrementa tentativas
attempts++;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — nome expressivo torna o comentário desnecessário</summary>

```js
const canDeleteRecord = user.status === "active" && user.roles.includes("admin");
if (canDeleteRecord) {
  deleteRecord(id);
}

attempts++;
```

</details>

## Boolean naming

<details>
<br>
<summary>✅ Good — prefixos is, has, can, should</summary>

```js
const isActive = user.status === "active";
const hasPermission = user.roles.includes("admin");
const canDelete = isActive && hasPermission;
const shouldRetry = attempt < MAX_RETRIES;
```

</details>
