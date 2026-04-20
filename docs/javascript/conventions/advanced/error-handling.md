# Error Handling

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

Erros bem estruturados separam o que é **problema de negócio** do que é **falha técnica**. `try/catch` existe para capturar, nunca para esconder.

## Múltiplos tipos de retorno

<details>
<summary>❌ Bad — null, undefined, false e objeto na mesma função</summary>
<br>

```js
function processOrder(order) {
  if (!order) return null;
  if (order.items.length === 0) return undefined;

  if (order.customer.defaulted) return false;

  return { success: true, order };
}

// quem chama não sabe o que esperar
const result = processOrder(order);
if (result) { /* ... */ }           // false passa, undefined também

if (result !== null) { /* ... */ }  // e undefined?
```

</details>

<br>

<details>
<summary>✅ Good — contrato consistente, sempre o mesmo formato</summary>
<br>

```js
function processOrder(order) {
  if (!order) throw new ValidationError({ message: "Order is required." });
  if (order.items.length === 0) throw new ValidationError({ message: "Order has no items." });

  if (order.customer.defaulted) throw new BusinessError({ message: "Customer has unpaid debts." });

  const processedOrder = { success: true, order };

  return processedOrder;
}
```

</details>

## Erro como string

<details>
<summary>❌ Bad — string solta, impossível tratar com instanceof</summary>
<br>

```js
async function findUser(id) {
  const user = await db.query(id);

  if (!user) {
    throw "User not found"; // sem tipo, sem contexto
  }

  return user;
}
```

</details>

<br>

<details>
<summary>✅ Good — erros tipados, identificáveis e tratáveis</summary>
<br>

```js
async function findUser(id) {
  const user = await userRepository.findById(id);

  if (!user) throw new NotFoundError({ message: `User ${id} not found.` });

  return user;
}
```

</details>

## BaseError: abstração centralizada

<details>
<summary>❌ Bad — throw com string solta, sem tipo, sem contrato</summary>
<br>

```js
// errors.js — não existe, cada módulo lança o que quiser
async function findUser(id) {
  const user = await db.query(id);
  if (!user) throw "User not found"; // sem tipo, não dá para instanceof

  return user;
}

async function processOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    return order;
  } catch (error) {
    console.log(error); // engole o erro, não relança
    return null;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — contrato único para todos os erros da aplicação</summary>
<br>

```js
// errors.js
export class BaseError extends Error {
  constructor({ name, message, action, statusCode, cause }) {
    super(message, { cause });
    this.name = name || "BaseError";

    this.action = action || "Contact support.";
    this.statusCode = statusCode || 500;
  }

  toJSON() {
    const envelope = {
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

export class NotFoundError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      name: "NotFoundError",
      message: message || "Resource not found.",
      action: action || "Check if the resource exists.",
      statusCode: 404,
      cause,
    });
  }
}

export class ValidationError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      name: "ValidationError",
      message: message || "Invalid input.",
      action: action || "Review the input data.",
      statusCode: 400,
      cause,
    });
  }
}

export class InternalServerError extends BaseError {
  constructor({ cause } = {}) {
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

## try/catch que engole o erro

<details>
<summary>❌ Bad — captura, loga e retorna null</summary>
<br>

```js
async function findProductById(id) {
  try {
    const results = await db.query(id);

    if (results.rowCount === 0) {
      throw "Product not found";
    }

    return results.rows[0];
  } catch (error) {
    console.log("Something went wrong"); // engole o erro
    return null;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — propaga com contexto, trata na fronteira</summary>
<br>

```js
async function findProductById(id) {
  try {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError({
        message: `Product ${id} not found.`,
        action: "Check if the product ID is correct.",
      });
    }

    return product;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    throw new InternalServerError({ cause: error });
  }
}
```

</details>

## Exceção como controle de fluxo

<details>
<summary>❌ Bad — try/catch controlando lógica de negócio normal</summary>
<br>

```js
function getUser(id) {
  try {
    return userMap[id]; // undefined não é uma exceção
  } catch {
    return null;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — verificação explícita, sem exceção para fluxo normal</summary>
<br>

```js
function getUser(id) {
  const user = userMap[id] ?? null;

  return user;
}
```

</details>

### Quando usar try/catch

| Use | Não use |
| --- | --- |
| I/O externo (DB, rede, arquivo) | Para encadear chamadas que já propagam erros |
| Fronteira do sistema (controller HTTP) | Para logar e ignorar: mascara problemas   |
| Para mapear erro técnico → erro de negócio | Quando o erro já será tratado em camada superior |
