# Control Flow

Os padrões de controle de fluxo do JavaScript se aplicam sem mudança. O TypeScript adiciona:
narrowing pelo sistema de tipos, discriminated unions em switch e exhaustiveness check para
garantir que todos os casos são tratados.

> Base JavaScript: [javascript/conventions/control-flow.md](../../javascript/conventions/control-flow.md)

## Narrowing como guard clause

Guard clauses em TypeScript estreitam o tipo além de controlar o fluxo. Após o guard, o
compilador sabe que a variável é não-nula — sem assertions.

<details>
<summary>❌ Bad — tipo nullable navega pelo código inteiro com ?.</summary>
<br>

```ts
async function processOrder(orderId: string): Promise<void> {
  const order = await findOrder(orderId); // Order | null

  await sendReceipt(order?.customerId);   // customerId pode ser undefined aqui
  await updateStatus(order?.id, "done");  // id pode ser undefined
}
```

</details>

<br>

<details>
<summary>✅ Good — guard estreita o tipo, resto do código é não-nulo</summary>
<br>

```ts
async function processOrder(orderId: string): Promise<void> {
  const order = await findOrder(orderId); // Order | null
  if (!order) return;
  // order: Order — compilador garante não-nulo daqui para baixo

  await sendReceipt(order.customerId);
  await updateStatus(order.id, "done");
}
```

</details>

## Discriminated unions em switch

`switch` sobre um campo literal estreita o tipo automaticamente em cada `case`. O TypeScript
sabe o shape completo de cada variante sem type assertions.

<details>
<summary>❌ Bad — if/else com type assertions manuais</summary>
<br>

```ts
type PaymentEvent =
  | { type: "payment_success"; orderId: string; amount: number }
  | { type: "payment_failed"; orderId: string; reason: string }
  | { type: "payment_refunded"; orderId: string };

function handlePaymentEvent(event: PaymentEvent): void {
  if (event.type === "payment_success") {
    const e = event as { type: "payment_success"; orderId: string; amount: number };
    sendReceipt(e.orderId, e.amount);
  } else if (event.type === "payment_failed") {
    const e = event as { type: "payment_failed"; orderId: string; reason: string };
    notifyFailure(e.orderId, e.reason);
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — switch com narrowing automático por discriminante</summary>
<br>

```ts
function handlePaymentEvent(event: PaymentEvent): void {
  switch (event.type) {
    case "payment_success":
      sendReceipt(event.orderId, event.amount); // amount disponível aqui
      break;

    case "payment_failed":
      notifyFailure(event.orderId, event.reason); // reason disponível aqui
      break;

    case "payment_refunded":
      issueRefund(event.orderId);
      break;
  }
}
```

</details>

## Exhaustiveness check

`never` no `default` do switch garante que todos os casos do union type são tratados. Quando
um novo variant é adicionado ao tipo, o compilador aponta o switch que precisa ser atualizado.

<details>
<summary>❌ Bad — novo variant ignorado silenciosamente</summary>
<br>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":   return "Aguardando";
    case "approved":  return "Aprovado";
    case "shipped":   return "Enviado";
    // "cancelled" adicionado ao tipo mas esquecido aqui — retorna undefined
    default:          return "Unknown";
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — never no default, compilador avisa se faltar um caso</summary>
<br>

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":    return "Aguardando";
    case "approved":   return "Aprovado";
    case "shipped":    return "Enviado";
    case "cancelled":  return "Cancelado";
    default:           return assertNever(status);
    // adicionar "returned" ao tipo → erro de compilação aqui
  }
}
```

</details>

## Type predicates como guards reutilizáveis

Quando o mesmo narrowing é necessário em múltiplos lugares, extraia para uma função predicado.
O compilador propaga o contrato para todos os callers.

<details>
<summary>❌ Bad — verificação inline repetida, narrowing não reutilizável</summary>
<br>

```ts
function processApiResponse(data: unknown): void {
  if (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "customerId" in data
  ) {
    // data: object — ainda não é Order para o compilador
    sendConfirmation((data as Order).customerId);
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — type predicate nomeia e reutiliza o narrowing</summary>
<br>

```ts
function isOrder(value: unknown): value is Order {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "customerId" in value &&
    "total" in value
  );
}

function processApiResponse(data: unknown): void {
  if (!isOrder(data)) throw new Error("Invalid order payload");

  sendConfirmation(data.customerId); // data: Order — compilador sabe
}
```

</details>
