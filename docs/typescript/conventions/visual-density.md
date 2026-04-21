# Visual density: TypeScript

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em TypeScript.
Anotações de tipo não adicionam densidade: ficam na mesma linha que a declaração.

> Base JavaScript: [javascript/conventions/visual-density.md](../../javascript/conventions/visual-density.md)

## A regra central

**Máximo 2 linhas consecutivas por grupo.** Passos distintos são separados por exatamente uma
linha em branco. Anotações de tipo não contam como passo separado.

<details>
<summary>❌ Bad — todos os passos colados</summary>
<br>

```ts
async function registerUser(input: CreateUserInput): Promise<User> {
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
<summary>✅ Good — passos separados, anotações de tipo na mesma linha</summary>
<br>

```ts
async function registerUser(input: CreateUserInput): Promise<User> {
  const { name, email } = input;
  const exists = await userRepository.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");

  const hash = await hashPassword(input.password);
  const user = await userRepository.create({ name, email, hash });

  const token: string = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

## return sempre separado

<details>
<summary>❌ Bad — return colado ao último passo</summary>
<br>

```ts
function buildOrderSummary(order: Order): OrderSummary {
  const itemCount = order.items.length;
  const totalFormatted = formatCurrency(order.total);
  const summary: OrderSummary = { itemCount, totalFormatted, orderId: order.id };
  return summary;
}
```

</details>

<br>

<details>
<summary>✅ Good — return separado do último passo</summary>
<br>

```ts
function buildOrderSummary(order: Order): OrderSummary {
  const itemCount = order.items.length;
  const totalFormatted = formatCurrency(order.total);

  const summary: OrderSummary = { itemCount, totalFormatted, orderId: order.id };

  return summary;
}
```

</details>

**Exceção:** funções de uma linha ficam compactas.

```ts
function findPendingOrders(userId: string): Promise<Order[]> {
  return orderRepository.findByStatus(userId, "pending");
}
```

## Declaração + guarda = 1 grupo

<details>
<summary>❌ Bad — variável solta do seu guarda</summary>
<br>

```ts
const order = await fetchOrder(orderId);

if (!order) return;
const invoice = buildInvoice(order);
```

</details>

<br>

<details>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>
<br>

```ts
const order = await fetchOrder(orderId);
if (!order) return;

const invoice = buildInvoice(order);
```

</details>

## Fases de um método

<details>
<summary>❌ Bad — todas as fases coladas</summary>
<br>

```ts
async function createUserHandler(req: Request, res: Response): Promise<void> {
  const sanitized = sanitizeCreateUser(req.body);
  const input = createUserSchema.parse(sanitized);
  const user = await createUser(input);
  const body: UserResponse = toUserResponse(user);
  res.status(201).json(body);
}
```

</details>

<br>

<details>
<summary>✅ Good — fases explícitas</summary>
<br>

```ts
async function createUserHandler(request: Request, response: Response): Promise<void> {
  const sanitized = sanitizeCreateUser(request.body);
  const input = createUserSchema.parse(sanitized);

  const user = await createUser(input);

  const body: UserResponse = toUserResponse(user);
  response.status(201).json(body);
}
```

</details>

## Strings longas

<details>
<summary>❌ Bad — string imensa inline</summary>
<br>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  return `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>

<br>

<details>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>
<br>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

</details>
