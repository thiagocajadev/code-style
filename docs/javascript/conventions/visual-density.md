# Visual Density — JavaScript

Os mesmos princípios de [densidade visual](../../shared/visual-density.md) com exemplos em JavaScript/Node.js.

## A regra central

**Máximo 2 linhas consecutivas por grupo.** Linhas relacionadas ficam juntas. Passos distintos são separados por exatamente uma linha em branco.

<details>
<br>
<summary>❌ Bad — denso demais: todos os passos colados</summary>

```js
async function registerUser(input) {
  const { name, email } = input;
  const exists = await db.users.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");
  const hash = await hashPassword(input.password);
  const user = await db.users.create({ name, email, hash });
  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);
  return user;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — passos separados, no máximo 2 linhas por grupo</summary>

```js
async function registerUser(input) {
  const { name, email } = input;
  const exists = await db.users.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");

  const hash = await hashPassword(input.password);
  const user = await db.users.create({ name, email, hash });

  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

## `return` sempre separado

O `return` encerra uma função — visualmente, ele pertence a um parágrafo próprio quando há mais de um passo antes dele.

<details>
<br>
<summary>❌ Bad — return colado ao último passo</summary>

```js
function formatOrderDate(isoString, locale = "pt-BR") {
  const date = new Date(isoString);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return formattedDate;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — return separado do último passo</summary>

```js
function formatOrderDate(isoString, locale = "pt-BR") {
  const date = new Date(isoString);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);

  return formattedDate;
}
```

</details>

**Exceção:** funções de uma linha ficam compactas — o `return` é o único conteúdo.

```js
function findPendingOrders(userId) {
  return orderRepository.findByStatus(userId, "pending");
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam um par semântico. A linha em branco vem **depois** do par, não entre eles.

<details>
<br>
<summary>❌ Bad — variável solta do seu guarda</summary>

```js
const order = await fetchOrder(orderId);

if (!order) return;
const invoice = buildInvoice(order);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>

```js
const order = await fetchOrder(orderId);
if (!order) return;

const invoice = buildInvoice(order);
```

</details>

## 3 linhas viram 2+1, 4 linhas viram 2+2

Quando um bloco tem 3 ou 4 linhas relacionadas sem nenhuma separação, quebre no meio.

<details>
<br>
<summary>❌ Bad — 3 linhas coladas</summary>

```js
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;
  attempt++;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — 2+1</summary>

```js
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter no máximo 2 linhas antes de um respiro.

<details>
<br>
<summary>✅ Good — fases explícitas</summary>

```js
async function createUserHandler(req, res) {
  const sanitized = sanitizeCreateUser(req.body);
  const input = createUserSchema.parse(sanitized);

  await createUser(input);

  const body = { id: input.id };
  res.status(201).json(body);
}
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado — o template final fica legível e os pedaços ganham semântica.

<details>
<br>
<summary>❌ Bad — string imensa inline, sem semântica nas partes</summary>

```js
function buildDeliveryMessage(user, order) {
  return `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  return `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>
