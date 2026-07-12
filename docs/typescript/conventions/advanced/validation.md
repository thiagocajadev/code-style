# Validação em TypeScript

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

As regras de validação do JavaScript continuam valendo. O que o TypeScript acrescenta resolve uma
duplicação que o JavaScript não tinha como evitar: sem tipos, o **schema** (a descrição do formato
esperado, escrito com o **Zod**) era a única declaração do dado. Com tipos, aparece a tentação de
escrever a mesma forma duas vezes, uma no schema e uma na `interface`, e as duas saem de sincronia
na primeira mudança. O `z.infer` acaba com isso: o tipo passa a ser derivado do schema, e existe uma
declaração só.

> Base JavaScript: [javascript/conventions/advanced/validation.md](../../../javascript/conventions/advanced/validation.md)

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
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Estrutura sem comportamento usada para mover dados entre camadas; derivada do schema |

## O tipo é derivado do schema, e não escrito de novo

Um schema Zod e uma `interface` que descrevem o mesmo dado são duas declarações da mesma coisa.
Alguém acrescenta um campo no schema, esquece a interface, e o compilador não tem como reclamar:
as duas continuam válidas por conta própria. O erro aparece quando o campo novo chega em runtime e
o código não sabe o que fazer com ele.

`z.infer<typeof schema>` deriva o tipo do schema. O schema passa a ser a única declaração do
formato, e o tipo acompanha sozinho toda mudança feita nele.

<details>
<summary>❌ Ruim: o tipo é escrito à mão e pode sair de sincronia com o schema</summary>

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
<summary>✅ Bom: o schema é a única declaração, e o tipo sai dele</summary>

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

## `parse` lança, `safeParse` devolve o resultado

Os dois fazem a mesma validação e diferem no que acontece quando o dado não passa. `parse` lança
uma exceção, e serve no ponto de entrada, onde um dado inválido interrompe a requisição. `safeParse`
devolve `{ success, data }` ou `{ success, error }`, e serve quando a falha de validação é um
caminho previsto do negócio, que precisa virar uma resposta em vez de um erro.

Envolver `parse` em um `try/catch` para tratar um caso esperado é usar exceção como fluxo de
controle. O `safeParse` diz a mesma coisa no tipo do retorno, e quem chama trata o erro sem `catch`.

<details>
<summary>❌ Ruim: exceção usada como fluxo de controle do negócio</summary>

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
<summary>✅ Bom: safeParse devolve o resultado, e a falha vira resposta sem try/catch</summary>

```ts
async function applyDiscount(body: unknown): Promise<Result<Order>> {
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) return Result.fail("Invalid input", "VALIDATION_ERROR");

  const order = await processDiscount(parsed.data);

  return Result.ok(order);
}
```

</details>

## `z.discriminatedUnion` entrega o tipo já discriminado

Um `z.union` comum valida o dado e devolve um tipo em que os membros não estão ligados a campo
nenhum. Para chegar aos campos de um deles, o código precisa do `as`, e o `as` desliga a checagem
logo depois da validação, que era exatamente o ponto onde ela valia.

`z.discriminatedUnion` recebe o nome do campo que identifica cada membro e devolve uma união
discriminada de verdade. O `switch` sobre esse campo estreita o tipo sozinho, e o `as` some.

<details>
<summary>❌ Ruim: a união não tem discriminante, e o as reaparece depois da validação</summary>

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
<summary>✅ Bom: o campo discriminante estreita o tipo dentro de cada case</summary>

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

## O handler declara o DTO de resposta

Devolver a entidade inteira do banco entrega ao cliente tudo que ela carrega, inclusive o hash da
senha e os campos internos que ninguém pretendia publicar. Basta um campo novo entrar na entidade
para ele aparecer na resposta da API, sem que ninguém tenha decidido isso.

O retorno do handler declara um **DTO** (Data Transfer Object · Objeto de Transferência de Dados),
escrito com `Pick` ou como tipo próprio. Ele diz em código quais campos são públicos, e o campo novo
que entrar na entidade fica de fora até alguém acrescentá-lo ali de propósito.

<details>
<summary>❌ Ruim: devolve a entidade inteira, e o campo interno vai junto</summary>

```ts
async function findUserHandler(req: Request, res: Response): Promise<void> {
  const user = await db.users.findById(req.params.id);

  res.json(user); // passwordHash, internalFlags, deletedAt saem na resposta
}
```

</details>

<details>
<summary>✅ Bom: o DTO declara quais campos a resposta publica</summary>

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
