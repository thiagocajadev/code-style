# Visual density: JavaScript

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em JavaScript/Node.js.

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Bad — denso demais: todos os passos colados</summary>
<br>

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
<summary>✅ Good — fases visíveis, no máximo 2 linhas por grupo</summary>
<br>

```js
async function registerUser(input) {
  const { name, email } = input;
  const exists = await userRepository.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");

  const hash = await hashPassword(input.password);
  const user = await userRepository.create({ name, email, hash });

  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

## Explaining Return: par tight

Uma `const` nomeada acima do `return` explica o valor retornado. Quando há **apenas esse passo** antes do `return`, os dois formam par de 2 linhas sem blank. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Bad — blank fragmenta o par</summary>
<br>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

</details>

<br>

<details>
<summary>✅ Good — par tight</summary>
<br>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

</details>

## Return separado: quando há 2+ passos antes

Quando há dois ou mais passos distintos antes do `return`, o blank line marca a transição do "preparar" para o "entregar".

<details>
<summary>✅ Good — 3 passos antes do return</summary>
<br>

```js
function formatOrderDate(isoString, locale = "pt-BR") {
  const parsedDate = new Date(isoString);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const formattedDate = formatter.format(parsedDate);

  return formattedDate;
}
```

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único conteúdo.

```js
function findPendingOrders(userId) {
  return orderRepository.findByStatus(userId, "pending");
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico. A linha em branco vem **depois** do par, nunca entre eles.

<details>
<summary>❌ Bad — variável solta do seu guarda</summary>
<br>

```js
const order = await fetchOrder(orderId);

if (!order) return;
const invoice = buildInvoice(order);
```

</details>

<br>

<details>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>
<br>

```js
const order = await fetchOrder(orderId);
if (!order) return;

const invoice = buildInvoice(order);
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (const, let, var) formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Bad — órfão entre blanks</summary>
<br>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
```

</details>

<br>

<details>
<summary>✅ Good — trio tight</summary>
<br>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;
```

</details>

<br>

<details>
<summary>✅ Good — 4 atomics viram 2+2</summary>
<br>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
const MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Bad — dependência direta partida</summary>
<br>

```js
function buildShippingLabel(order) {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addressLine = `${order.address.street}, ${order.address.number}`;

  const cityLine = `${order.address.city} - ${order.address.state}, ${order.address.zipCode}`;

  const label = `${fullName}\n${addressLine}\n${cityLine}\nOrder #${order.id}`;
  return label;
}
```

</details>

<br>

<details>
<summary>✅ Good — par semântico tight</summary>
<br>

```js
function buildShippingLabel(order) {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addressLine = `${order.address.street}, ${order.address.number}`;

  const cityLine = `${order.address.city} - ${order.address.state}, ${order.address.zipCode}`;
  const label = `${fullName}\n${addressLine}\n${cityLine}\nOrder #${order.id}`;

  return label;
}
```

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não são todas atômicas homogêneas.

<details>
<summary>❌ Bad — 3 linhas heterogêneas coladas</summary>
<br>

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
<summary>✅ Good — declaração + guarda em par, incremento separado</summary>
<br>

```js
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível.

<details>
<summary>❌ Bad — todas as fases coladas, sem separação visual</summary>
<br>

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

<br>

<details>
<summary>✅ Good — fases explícitas</summary>
<br>

```js
async function createUserHandler(request, response) {
  const sanitized = sanitizeCreateUser(request.body);
  const input = createUserSchema.parse(sanitized);

  await createUser(input);

  const body = { id: input.id };
  response.status(201).json(body);
}
```

</details>

## Testes: expect como fase própria

O `expect` é fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Bad — expect colado ao setup, fases invisíveis</summary>
<br>

```js
it('applies percentage discount to order price', () => {
  const order = { price: 100, discountPct: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;
  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

<br>

<details>
<summary>✅ Good — expect separado, assertion como fase própria</summary>
<br>

```js
it('applies percentage discount to order price', () => {
  const order = { price: 100, discountPct: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;

  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Bad — string imensa inline, sem semântica nas partes</summary>
<br>

```js
function buildDeliveryMessage(user, order) {
  return `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>

<br>

<details>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>
<br>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

</details>
