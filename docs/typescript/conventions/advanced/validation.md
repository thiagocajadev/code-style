# Validation

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões de validação do JavaScript se aplicam sem mudança. O TypeScript adiciona: inferência
de tipo a partir do schema Zod, tipos derivados em vez de declarados manualmente e garantia de
que o output do parse corresponde ao tipo esperado.

> Base JavaScript: [javascript/conventions/advanced/validation.md](../../../../javascript/conventions/advanced/validation.md)

## z.infer: tipo deriva do schema

Declarar o tipo separado e o schema separado cria duas fontes de verdade que podem divergir.
`z.infer<typeof schema>` extrai o tipo do schema automaticamente: uma fonte de verdade, sem
divergência.

<details>
<summary>❌ Bad — tipo declarado manualmente, pode divergir do schema</summary>
<br>

```ts
type CreateOrderInput = {
  productId: string;
  quantity: number;
  customerId: string;
};

const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  customerId: z.string().uuid(),
  // adicionou couponCode no schema mas esqueceu de atualizar o tipo acima
  couponCode: z.string().optional(),
});
```

</details>

<br>

<details>
<summary>✅ Good — tipo inferido do schema, fonte única</summary>
<br>

```ts
const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  customerId: z.string().uuid(),
  couponCode: z.string().optional(),
});

type CreateOrderInput = z.infer<typeof createOrderSchema>;
// { productId: string; quantity: number; customerId: string; couponCode?: string }
// atualiza automaticamente quando o schema muda
```

</details>

## safeParse para fluxo Result

`parse` lança exceção — adequado em handlers de entrada onde o erro é fatal. `safeParse`
retorna `{ success, data, error }` — adequado quando a falha de validação é um caso esperado
no fluxo de negócio.

<details>
<summary>❌ Bad — parse lança exceção tratada com try/catch para fluxo de negócio</summary>
<br>

```ts
async function applyDiscount(body: unknown): Promise<Result<Order>> {
  try {
    const input = discountSchema.parse(body); // lança ZodError
    const order = await processDiscount(input);

    return Result.ok(order);
  } catch (error) {
    if (error instanceof ZodError) {
      return Result.fail("Invalid input", "VALIDATION_ERROR");
    }

    throw error;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — safeParse retorna Result, sem try/catch para validação</summary>
<br>

```ts
async function applyDiscount(body: unknown): Promise<Result<Order>> {
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) return Result.fail("Invalid input", "VALIDATION_ERROR");

  const order = await processDiscount(parsed.data);

  return Result.ok(order);
}
```

</details>

## Discriminated unions do Zod

`z.discriminatedUnion` gera um tipo discriminado a partir dos schemas: o TypeScript faz
narrowing automático no switch sem type assertions.

<details>
<summary>❌ Bad — z.union sem discriminante, narrowing manual com as</summary>
<br>

```ts
const paymentSchema = z.union([
  z.object({ method: z.literal("card"), cardToken: z.string() }),
  z.object({ method: z.literal("pix"), pixKey: z.string() }),
]);

type Payment = z.infer<typeof paymentSchema>;

function processPayment(payment: Payment): void {
  if (payment.method === "card") {
    const card = payment as { method: "card"; cardToken: string }; // cast manual
    chargeCard(card.cardToken);
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — discriminatedUnion com narrowing automático</summary>
<br>

```ts
const paymentSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("card"), cardToken: z.string() }),
  z.object({ method: z.literal("pix"), pixKey: z.string() }),
]);

type Payment = z.infer<typeof paymentSchema>;

function processPayment(payment: Payment): void {
  switch (payment.method) {
    case "card":
      chargeCard(payment.cardToken); // narrowing automático — sem cast
      break;

    case "pix":
      sendPix(payment.pixKey);
      break;
  }
}
```

</details>

## Output filtering tipado

O tipo de retorno do handler deve ser o DTO de resposta, não a entidade. `Pick` ou um tipo
explícito documentam o contrato publicamente e impedem o vazamento acidental de campos.

<details>
<summary>❌ Bad — retorna a entidade completa, sem contrato explícito</summary>
<br>

```ts
async function findUserHandler(req: Request, res: Response): Promise<void> {
  const user = await db.users.findById(req.params.id);

  res.json(user); // passwordHash, internalFlags, deletedAt saem na resposta
}
```

</details>

<br>

<details>
<summary>✅ Good — DTO tipado define o contrato da resposta</summary>
<br>

```ts
type UserResponse = Pick<User, "id" | "name" | "email" | "createdAt">;

function toUserResponse(user: User): UserResponse {
  const response: UserResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };

  return response;
}

async function findUserHandler(req: Request, res: Response): Promise<void> {
  const user = await db.users.findById(req.params.id);
  const userResponse = toUserResponse(user);

  res.json(userResponse);
}
```

</details>
