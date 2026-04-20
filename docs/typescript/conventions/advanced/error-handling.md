# Error Handling

Os princípios de tratamento de erros do JavaScript — erros tipados, try/catch nas fronteiras,
não engolir exceções — aplicam-se sem mudança. O TypeScript adiciona: hierarquia de classes
tipadas com contratos explícitos e `instanceof` como mecanismo de narrowing.

## Múltiplos tipos de retorno

<details>
<summary>❌ Bad — null, undefined, false e objeto na mesma função</summary>
<br>

```ts
function processOrder(order: Order | null): { success: boolean; order: Order } | null | false {
  if (!order) return null;
  if (order.items.length === 0) return false;
  if (order.customer.defaulted) return null;

  return { success: true, order };
  // quem chama recebe uma union inútil — precisa checar todos os casos manualmente
}
```

</details>

<br>

<details>
<summary>✅ Good — contrato consistente, lança exceções tipadas</summary>
<br>

```ts
function processOrder(order: Order | null): ProcessedOrder {
  if (!order) throw new ValidationError({ message: "Order is required." });
  if (order.items.length === 0) throw new ValidationError({ message: "Order has no items." });
  if (order.customer.defaulted) throw new BusinessError({ message: "Customer has unpaid debts." });

  const processedOrder: ProcessedOrder = { success: true, order };

  return processedOrder;
}
```

</details>

## BaseError — hierarquia tipada

<details>
<summary>✅ Good — contrato único para todos os erros da aplicação</summary>
<br>

```ts
// errors.ts
interface BaseErrorParams {
  name?: string;
  message: string;
  action?: string;
  statusCode?: number;
  cause?: unknown;
}

interface ErrorEnvelope {
  error: {
    name: string;
    message: string;
    action: string;
    statusCode: number;
  };
}

export class BaseError extends Error {
  readonly action: string;
  readonly statusCode: number;

  constructor({ name, message, action, statusCode, cause }: BaseErrorParams) {
    super(message, { cause });
    this.name = name ?? "BaseError";
    this.action = action ?? "Contact support.";
    this.statusCode = statusCode ?? 500;
  }

  toJSON(): ErrorEnvelope {
    const envelope: ErrorEnvelope = {
      error: {
        name: this.name,
        message: this.message,
        action: this.action,
        statusCode: this.statusCode,
      },
    };

    return envelope;
  }
}

interface SubErrorParams {
  message?: string;
  action?: string;
  cause?: unknown;
}

export class NotFoundError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "NotFoundError",
      message: message ?? "Resource not found.",
      action: action ?? "Check if the resource exists.",
      statusCode: 404,
      cause,
    });
  }
}

export class ValidationError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "ValidationError",
      message: message ?? "Invalid input.",
      action: action ?? "Review the input data.",
      statusCode: 400,
      cause,
    });
  }
}

export class BusinessError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "BusinessError",
      message: message ?? "Business rule violation.",
      action: action ?? "Check the operation requirements.",
      statusCode: 422,
      cause,
    });
  }
}

export class InternalServerError extends BaseError {
  constructor({ cause }: Pick<SubErrorParams, "cause"> = {}) {
    super({
      name: "InternalServerError",
      message: "An unexpected error occurred.",
      action: "Contact support.",
      statusCode: 500,
      cause,
    });
  }
}
```

</details>

## try/catch — narrowing do error

O `catch` recebe `unknown` em TypeScript estrito. Antes de usar o erro, é preciso fazer narrowing.

<details>
<summary>❌ Bad — acessa propriedades de error sem narrowing</summary>
<br>

```ts
async function findProductById(id: string): Promise<Product> {
  try {
    const product = await db.products.findById(id);
    return product;
  } catch (error) {
    console.log(error.message); // erro de compilação — error é unknown
    return null;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — instanceof para narrowing, propaga com contexto</summary>
<br>

```ts
async function findProductById(id: string): Promise<Product> {
  try {
    const results = await db.query(id);

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: `Product ${id} not found.`,
        action: "Check if the product ID is correct.",
      });
    }

    const product = results.rows[0] as Product;
    return product;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    throw new InternalServerError({ cause: error });
  }
}
```

</details>

## Quando usar try/catch

| Use                                              | Não use                                                 |
| ------------------------------------------------ | ------------------------------------------------------- |
| I/O externo (DB, rede, arquivo)                  | Para encadear chamadas que já propagam erros            |
| Fronteira do sistema (controller HTTP)           | Para logar e ignorar — mascara problemas                |
| Para mapear erro técnico → erro de negócio       | Quando o erro já será tratado em camada superior        |
