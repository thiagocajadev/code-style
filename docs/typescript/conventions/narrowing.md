# Narrowing

Narrowing é o processo de mover de um tipo amplo para um tipo específico dentro de um bloco. O
TypeScript rastreia cada verificação e refina o tipo automaticamente, sem cast, sem assertion.

## typeof: primitivos

Para primitivos, `typeof` é a ferramenta correta. TypeScript entende os guards nativos e aplica
o narrowing.

<details>
<summary>❌ Bad — type assertion no lugar de narrowing</summary>
<br>

```ts
function formatId(id: string | number): string {
  const formatted = (id as string).padStart(6, "0"); // assume string sem verificar
  return formatted; // explode em runtime se id for number
}
```

</details>

<br>

<details>
<summary>✅ Good — typeof para primitivos</summary>
<br>

```ts
function formatId(id: string | number): string {
  if (typeof id === "number") {
    const formatted = id.toString().padStart(6, "0");
    return formatted;
  }

  return id; // narrowado para string
}
```

</details>

## instanceof: classes

Para instâncias de classes, incluindo as de erro, `instanceof` é o operador correto.

<details>
<summary>❌ Bad — type assertion no lugar de instanceof</summary>
<br>

```ts
async function findUser(id: string): Promise<User> {
  try {
    const user = await db.users.findById(id);
    return user;
  } catch (error) {
    if ((error as NotFoundError).name === "NotFoundError") throw error; // name pode ser qualquer string
    throw new InternalServerError({ cause: error });
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — instanceof para classes e erros tipados</summary>
<br>

```ts
async function findUser(id: string): Promise<User> {
  try {
    const user = await userRepository.findById(id);
    return user;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;    // propaga o erro de negócio
    throw new InternalServerError({ cause: error });    // encapsula o técnico
  }
}
```

</details>

## Custom type guards

Quando a verificação é mais complexa que `typeof` ou `instanceof`, extraia em uma função predicado.
O nome expressa a intenção de negócio. O compilador entende o `is` como estreitamento de tipo.

<details>
<summary>❌ Bad — verificação inline repetida, sem nome, sem reutilização</summary>
<br>

```ts
function processPayment(event: unknown) {
  if (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    "amount" in event &&
    typeof (event as any).amount === "number"
  ) {
    // tipo ainda é object — TypeScript não sabe que é PaymentEvent
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — função predicado nomeada, reutilizável e tipada</summary>
<br>

```ts
function isPaymentEvent(value: unknown): value is PaymentEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "amount" in value &&
    typeof (value as PaymentEvent).amount === "number"
  );
}

function processPayment(event: unknown) {
  if (!isPaymentEvent(event)) throw new ValidationError({ message: "Invalid payment event." });

  const amount = event.amount; // number — compilador sabe
}
```

</details>

## Discriminated unions

Quando um union type tem um campo literal discriminante, o TypeScript aplica narrowing
automaticamente dentro de cada branch, sem type guard manual.

<details>
<summary>❌ Bad — acessa campo de variant específica sem narrowing</summary>
<br>

```ts
type NotificationEvent =
  | { type: "email"; recipient: string; subject: string }
  | { type: "sms"; phone: string; body: string }
  | { type: "push"; deviceToken: string; title: string; body: string };

function sendNotification(event: NotificationEvent) {
  // acessa recipient sem verificar se type é "email" — erro de compilação
  sendEmail(event.recipient, event.subject); // Property 'recipient' does not exist on type 'NotificationEvent'
}
```

</details>

<br>

<details>
<summary>✅ Good — narrowing automático via campo discriminante</summary>
<br>

```ts
type NotificationEvent =
  | { type: "email"; recipient: string; subject: string }
  | { type: "sms"; phone: string; body: string }
  | { type: "push"; deviceToken: string; title: string; body: string };

function sendNotification(event: NotificationEvent) {
  switch (event.type) {
    case "email":
      sendEmail(event.recipient, event.subject); // narrowado para email variant
      break;

    case "sms":
      sendSms(event.phone, event.body); // narrowado para sms variant
      break;

    case "push":
      sendPush(event.deviceToken, event.title, event.body); // narrowado para push variant
      break;
  }
}
```

</details>

## Exhaustiveness

Quando um switch sobre um discriminated union precisa cobrir todos os casos, o `never` no default
garante em compile time que nenhum variant foi esquecido. Se um novo variant for adicionado ao
tipo, o compilador aponta o erro antes do runtime.

<details>
<summary>❌ Bad — switch sem cobertura total, novo caso passa silenciosamente</summary>
<br>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending": return "Pending review";
    case "approved": return "Approved";
    case "shipped": return "Shipped";
    // "cancelled" esquecido — retorna undefined em runtime
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — never no default garante cobertura total</summary>
<br>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending": return "Pending review";
    case "approved": return "Approved";
    case "shipped": return "Shipped";
    case "cancelled": return "Cancelled";
    default: {
      const _exhaustive: never = status; // erro de compilação se faltar um caso
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}
```

</details>

## Nullish narrowing

`??` e `?.` não são narrowing: são atalhos para tratar null e undefined. Narrowing real com guard
clause é mais legível quando a ausência do valor é uma condição de negócio que precisa de nome.

<details>
<summary>❌ Bad — nullish chaining esconde a condição de negócio</summary>
<br>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await db.orders.findById(orderId);
  return order?.total ?? 0; // se order não existe, é 0? ou é um erro?
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clause explicita a condição</summary>
<br>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError({ message: `Order ${orderId} not found.` });

  const total = order.total;
  return total;
}
```

</details>
