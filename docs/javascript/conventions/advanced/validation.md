# Validação em JavaScript

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

Validação não é um passo único, e sim um **pipeline** (sequência de etapas) com três responsabilidades separadas: limpar a entrada, conferir o formato e aplicar as regras de negócio. Cada uma tem o seu lugar. Juntar as três em um só ponto acopla o código, dificulta o teste e abre brechas de segurança. Em JavaScript, **Zod** (biblioteca de validação) é a escolha padrão para validar o esquema e ainda derivar os tipos a partir dele.

```javascript
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **sanitization** (saneamento) | Limpeza de entrada: `trim`, `toLowerCase`, normalização de unicode; antes de validar |
| **schema validation** (validação de esquema) | Conferência de formato: tipos, comprimento, presença de campos obrigatórios |
| **business rule** (regra de negócio) | Validação que depende do estado do sistema (ex: email já cadastrado, saldo suficiente) |
| **output filter** (filtro de saída) | Remoção de campos sensíveis ou internos antes de responder ao cliente |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Estrutura sem comportamento usada para mover dados entre camadas |
| **parse, don't validate** (transforme, não só verifique) | Princípio: converter a entrada em tipo seguro de uma vez, em vez de só checar e seguir com `unknown` |
| **Zod** (biblioteca de validação) | Você descreve o formato esperado; ela valida os dados e deriva o tipo a partir dessa descrição |
| **trust boundary** (limite de confiança) | Ponto onde dados externos viram dados confiáveis após validação |

## Sanitização de entrada

Antes de validar, limpar: `trim` em strings, `toLowerCase` em emails. Dados
sujos entram em validação suja: um email com espaço passa no schema mas falha na
busca no banco.

<details>
<summary>❌ Ruim: dados brutos chegam direto na validação</summary>

```js
async function createUserHandler(req, res) {
  const input = createUserSchema.parse(req.body); // " Admin@Email.com " passa no schema

  await createUser(input);
  res.status(201).json({ id: input.id });
}
```

</details>

<details>
<summary>✅ Bom: sanitize antes de validar</summary>

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

## Validação de esquema com Zod

Zod confere formato, tipos e restrições, nunca regras de negócio. Reúne o
contrato técnico em um lugar e apaga a validação manual espalhada pelos handlers.

<details>
<summary>❌ Ruim: validação manual espalhada no handler</summary>

```js
async function createOrder(body) {
  if (!body.productId) throw new ValidationError("productId required");
  if (typeof body.quantity !== "number")
    throw new ValidationError("quantity must be number");

  if (body.quantity <= 0)
    throw new ValidationError("quantity must be positive");
  if (!body.customerId) throw new ValidationError("customerId required");
}
```

</details>

<details>
<summary>✅ Bom: schema centralizado, handler recebe dado tipado e validado</summary>

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

O schema confere se o dado tem o formato certo. As regras de negócio conferem se
ele faz sentido no domínio: dependem de **I/O** (Input/Output · Entrada/Saída),
como banco e serviços externos, e por isso não cabem no schema.

<details>
<summary>❌ Ruim: I/O dentro do schema (refine async) mistura camadas</summary>

```js
const createOrderSchema = z.object({
  productId: z
    .string()
    .uuid()
    .refine(
      async (id) => {
        const product = await db.products.findById(id);
        return product?.isAvailable; // regra de domínio escondida no schema
      },
      { message: "Product not available" },
    ),
});
```

</details>

<details>
<summary>✅ Bom: schema valida formato, domínio valida regras depois</summary>

```js
const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

async function validateOrderRules(input) {
  const product = await findProductById(input.productId);
  if (!product) return Result.fail("Product not found", "NOT_FOUND");

  if (!product.isAvailable)
    return Result.fail("Product unavailable", "UNAVAILABLE");

  if (product.stock < input.quantity)
    return Result.fail("Insufficient stock", "OUT_OF_STOCK");

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

## Filtro de saída

Devolver a entidade direto do banco vaza campos internos: `passwordHash`, `deletedAt`,
`internalFlags`. Monte de forma explícita o objeto que sai na resposta, campo a campo, em vez
de entregar a linha do banco como está.

<details>
<summary>❌ Ruim: entidade direta vaza campos internos</summary>

```js
async function findUserByIdHandler(req, res) {
  const user = await db.users.findById(req.params.id);

  return res.json(user); // passwordHash, internalFlags, deletedAt...
}
```

</details>

<details>
<summary>✅ Bom: projeção explícita do que sai na resposta</summary>

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
