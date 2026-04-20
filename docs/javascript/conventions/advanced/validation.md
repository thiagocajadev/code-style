# Validation

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

O pipeline de validação tem três responsabilidades distintas, cada uma no seu lugar:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

Misturar essas camadas cria acoplamento, dificulta testes e abre brechas de segurança.

## Sanitização de entrada

Antes de validar, limpar: `trim` em strings, `toLowerCase` em emails. Dados sujos entram em
validação suja: um email com espaço passa no schema mas falha na busca no banco.

<details>
<summary>❌ Bad — dados brutos chegam direto na validação</summary>
<br>

```js
async function createUserHandler(req, res) {
  const input = createUserSchema.parse(req.body); // " Admin@Email.com " passa no schema

  await createUser(input);
  res.status(201).json({ id: input.id });
}
```

</details>

<br>

<details>
<summary>✅ Good — sanitize antes de validar</summary>
<br>

```js
function sanitizeCreateUser(body) {
  const sanitized = {
    name: body.name?.trim(),
    email: body.email?.trim().toLowerCase(),
  };

  return sanitized;
}

async function createUserHandler(request, response) {
  const sanitized = sanitizeCreateUser(request.body);
  const input = createUserSchema.parse(sanitized);

  await createUser(input);

  const body = { id: input.id };
  response.status(201).json(body);
}
```

</details>

## Schema validation com Zod

Zod valida shape, tipos e constraints, nunca regras de negócio. Centraliza o contrato técnico e
elimina validação manual espalhada pelos handlers.

<details>
<summary>❌ Bad — validação manual espalhada no handler</summary>
<br>

```js
async function createOrder(body) {
  if (!body.productId) throw new ValidationError("productId required");
  if (typeof body.quantity !== "number") throw new ValidationError("quantity must be number");

  if (body.quantity <= 0) throw new ValidationError("quantity must be positive");
  if (!body.customerId) throw new ValidationError("customerId required");
}
```

</details>

<br>

<details>
<summary>✅ Good — schema centralizado, handler recebe dado tipado e validado</summary>
<br>

```js
const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  customerId: z.string().uuid(),
});

async function createOrder(body) {
  const input = createOrderSchema.parse(body);
  const invoice = await buildInvoice(input);

  return invoice;
}
```

</details>

## Regras de negócio

Schema valida se o dado tem o formato correto. Regras de negócio validam se faz sentido no domínio:
dependem de I/O (banco, serviços externos) e não pertencem ao schema.

<details>
<summary>❌ Bad — I/O dentro do schema (refine async) mistura camadas</summary>
<br>

```js
const createOrderSchema = z.object({
  productId: z.string().uuid().refine(
    async (id) => {
      const product = await db.products.findById(id);
      return product?.isAvailable; // regra de domínio escondida no schema
    },
    { message: "Product not available" }
  ),
});
```

</details>

<br>

<details>
<summary>✅ Good — schema valida shape, domínio valida regras após</summary>
<br>

```js
const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

async function validateOrderRules(input) {
  const product = await findProductById(input.productId);
  if (!product) return Result.fail("Product not found", "NOT_FOUND");

  if (!product.isAvailable) return Result.fail("Product unavailable", "UNAVAILABLE");
  if (product.stock < input.quantity) return Result.fail("Insufficient stock", "OUT_OF_STOCK");

  return Result.ok(product);
}

async function createOrder(body) {
  const input = createOrderSchema.parse(body);

  const rulesResult = await validateOrderRules(input);
  if (!rulesResult.ok) return rulesResult;

  const invoice = await buildInvoice(input, rulesResult.value);

  return Result.ok(invoice);
}
```

</details>

## Output filtering

Retornar a entidade direta vaza campos internos: `passwordHash`, `deletedAt`, `internalFlags`.
Projete explicitamente o que sai, nunca o objeto do banco diretamente.

<details>
<summary>❌ Bad — entidade direta vaza campos internos</summary>
<br>

```js
async function findUserByIdHandler(req, res) {
  const user = await db.users.findById(req.params.id);

  return res.json(user); // passwordHash, internalFlags, deletedAt...
}
```

</details>

<br>

<details>
<summary>✅ Good — projeção explícita do que sai na resposta</summary>
<br>

```js
function toUserResponse(user) {
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };

  return userResponse;
}

async function findUserByIdHandler(request, response) {
  const user = await userRepository.findById(request.params.id);
  const userResponse = toUserResponse(user);

  return response.json(userResponse);
}
```

</details>
