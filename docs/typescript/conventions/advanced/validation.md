# Validation

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões de validação do JavaScript se aplicam sem mudança. O TypeScript adiciona: **type inference** (inferência de tipo) a partir do schema **Zod** (biblioteca de validação por schema), tipos derivados em vez de declarados manualmente e garantia de que o output do **parse** (transformação) corresponde ao tipo esperado.

> Base JavaScript: [javascript/conventions/advanced/validation.md](../../../../javascript/conventions/advanced/validation.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Zod** (biblioteca de validação por schema) | Biblioteca de schemas componíveis com tipo inferido a partir do schema |
| **`z.infer`** (inferência de tipo a partir do schema) | Utilitário que extrai o tipo TS de um schema Zod; uma só fonte de verdade |
| **schema** (descrição declarativa de formato) | Objeto que descreve a forma esperada dos dados em runtime |
| **parse, don't validate** (transforme, não só verifique) | Princípio: converter a entrada em tipo seguro de uma vez, em vez de só checar e seguir com `unknown` |
| **`safeParse`** (parse com resultado tipado) | Variante que retorna `{ success, data }` ou `{ success, error }` em vez de lançar |
| **branded type** (tipo marcado) | Primitivo + tag (`z.string().brand<"Email">()`) para distinguir valores semânticos |
| **trust boundary** (limite de confiança) | Ponto onde dados externos viram dados confiáveis após validação |
| **DTO** (Data Transfer Object, Objeto de Transferência de Dados) | Estrutura sem comportamento usada para mover dados entre camadas; derivada do schema |

## z.infer: tipo deriva do schema

Declarar o tipo separado e o schema separado cria duas fontes de verdade que podem divergir.
`z.infer<typeof schema>` extrai o tipo do schema automaticamente: uma fonte de verdade, sem
divergência.

<details>
<summary>❌ Ruim: tipo declarado manualmente, pode divergir do schema</summary>

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

<details>
<summary>✅ Bom: tipo inferido do schema, fonte única</summary>

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

`parse` lança exceção: adequado em handlers de entrada onde o erro é fatal. `safeParse`
retorna `{ success, data, error }`: adequado quando a falha de validação é um caso esperado
no fluxo de negócio.

<details>
<summary>❌ Ruim: parse lança exceção tratada com try/catch para fluxo de negócio</summary>

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

<details>
<summary>✅ Bom: safeParse retorna Result, sem try/catch para validação</summary>

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
<summary>❌ Ruim: z.union sem discriminante, narrowing manual com as</summary>

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

<details>
<summary>✅ Bom: discriminatedUnion com narrowing automático</summary>

```ts
const paymentSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("card"), cardToken: z.string() }),
  z.object({ method: z.literal("pix"), pixKey: z.string() }),
]);

type Payment = z.infer<typeof paymentSchema>;

function processPayment(payment: Payment): void {
  switch (payment.method) {
    case "card":
      chargeCard(payment.cardToken); // narrowing automático: sem cast
      break;

    case "pix":
      sendPix(payment.pixKey);
      break;
  }
}
```

</details>

## Output filtering tipado

O tipo de retorno do handler deve ser o **DTO** (Data Transfer Object, Objeto de Transferência de Dados) de resposta, não a entidade. `Pick` ou um tipo
explícito documentam o contrato publicamente e impedem o vazamento acidental de campos.

<details>
<summary>❌ Ruim: retorna a entidade completa, sem contrato explícito</summary>

```ts
async function findUserHandler(req: Request, res: Response): Promise<void> {
  const user = await db.users.findById(req.params.id);

  res.json(user); // passwordHash, internalFlags, deletedAt saem na resposta
}
```

</details>

<details>
<summary>✅ Bom: DTO tipado define o contrato da resposta</summary>

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

async function findUserHandler(request: Request, response: Response): Promise<void> {
  const user = await userRepository.findById(request.params.id);
  const userResponse = toUserResponse(user);

  response.json(userResponse);
}
```

</details>
