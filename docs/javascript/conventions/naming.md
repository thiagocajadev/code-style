# Naming

Nomear bem as coisas ajuda o programador a ler e entender o código. Um
identificador expressivo elimina comentários, encurta a leitura e revela
intenção.

Um nome genérico (`data`, `result`, `tmp`) força o programador a abrir o corpo
da função pra entender o que está acontecendo. Em funções e módulos, o nome
ainda compõe a **API** (Application Programming Interface, Interface de
Programação) que outro código vai consumir. Errar ali custa mais caro.

Quando o nome carrega a intenção, o comentário deixa de fazer falta.

## Conceitos fundamentais

| Conceito                                         | O que é                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **identifier** (identificador)                   | Nome dado a variável, função, classe ou propriedade                                                   |
| **camelCase** (estilo camelo)                    | Convenção JS para variáveis e funções: primeira palavra minúscula, demais capitalizadas (`fetchUser`) |
| **PascalCase** (estilo Pascal)                   | Convenção JS para classes e construtores: todas as palavras capitalizadas (`UserService`)             |
| **UPPER_SNAKE_CASE** (maiúsculas com sublinhado) | Convenção JS para constantes globais e enums (`MAX_RETRIES`)                                          |
| **magic number** (número mágico)                 | Literal numérico sem nome no meio do código; perde contexto e dificulta troca                         |
| **boolean prefix** (prefixo booleano)            | `is`, `has`, `can`, `should`: torna o nome legível como pergunta (`isActive`, `hasPermission`)        |
| **domain term** (termo de domínio)               | Palavra que pertence ao negócio (`invoice`, `subscriber`), não ao tipo técnico (`object`, `entity`)   |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```js
const r = apply(data, pedido, callback);

function apply(x, p, c) {
  if (p.c.inadimplente) return false;
  return c(x);
}
```

</details>

<details>
<summary>✅ Bom</summary>

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
<summary>❌ Ruim: camelCase com português fica desajeitado</summary>

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

<details>
<summary>✅ Bom: inglês: curto, direto, universal</summary>

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
<summary>❌ Ruim: português e inglês no mesmo arquivo</summary>

```js
function notify(pedido) {
  console.log("cliente inadimplente", pedido?.cliente?.nome);
}

const resultado = processOrder(pedido);
```

</details>

<details>
<summary>✅ Bom: consistência de idioma</summary>

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
<summary>❌ Ruim: ordem invertida</summary>

```js
getProfileUser(); // "get profile, that's a user"
updateStatusOrder(); // status pertence ao pedido

calculateTotalInvoice(); // "invoice total" é a expressão natural
```

</details>

<details>
<summary>✅ Bom: ordem natural</summary>

```js
getUserProfile();
updateOrderStatus();

calculateInvoiceTotal();
```

</details>

## Verbos genéricos

<details>
<summary>❌ Ruim: handle, process, manage, do não dizem nada</summary>

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

<details>
<summary>✅ Bom: verbo de intenção</summary>

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

O nome reflete a intenção de negócio, não o detalhe técnico de como ou onde a
operação acontece.

<details>
<summary>❌ Ruim: nome revela infraestrutura, não domínio</summary>

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

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

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

Comentários que explicam o _quê_ mentem: o código muda, o comentário fica. Um
nome expressivo substitui qualquer comentário.

<details>
<summary>❌ Ruim: comentário repete o que o código já diz</summary>

```js
// verifica se o usuário pode excluir registros
if (user.status === "active" && user.roles.includes("admin")) {
  deleteRecord(id);
}

// incrementa tentativas
attempts++;
```

</details>

<details>
<summary>✅ Bom: nome expressivo torna o comentário desnecessário</summary>

```js
const canDeleteRecord =
  user.status === "active" && user.roles.includes("admin");
if (canDeleteRecord) {
  deleteRecord(id);
}

attempts++;
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```js
const loading = true;
const error = false;

const active = user.status === "active";
const valid = email.includes("@");
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

```js
const isActive = user.status === "active";
const hasPermission = user.roles.includes("admin");

const canDelete = isActive && hasPermission;
const shouldRetry = attempt < MAX_RETRIES;
```

</details>
