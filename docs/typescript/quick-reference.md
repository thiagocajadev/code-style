# Quick Reference

Tabelas de consulta rápida para as convenções TypeScript deste guia.

## Nomenclatura

| Categoria             | Convenção                          | Exemplos                                              |
| --------------------- | ---------------------------------- | ----------------------------------------------------- |
| Interface             | PascalCase, sem prefixo `I`        | `User`, `OrderRepository`, `PaymentGateway`           |
| Type alias            | PascalCase                         | `OrderStatus`, `UserId`, `ApiResponse<T>`             |
| Genérico simples      | `T`                                | `function identity<T>(value: T): T`                   |
| Genérico com contexto | `TItem`, `TKey`, `TValue`          | `function map<TItem, TResult>(...)`                   |
| Enum (evitar)         | PascalCase + const object          | `ORDER_STATUS.active` — prefer union type             |

## type vs interface

| Cenário                           | Usar                           |
| --------------------------------- | ------------------------------ |
| Shape de objeto / contrato        | `interface`                    |
| Union type                        | `type`                         |
| Intersection de tipos             | `type`                         |
| Mapped type / conditional type    | `type`                         |
| Estender outra interface          | `interface ... extends`        |
| Alias de primitivo                | `type UserId = string`         |

## Utility types

| Utility          | Uso                                     | Exemplo                                  |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| `Partial<T>`     | Todos os campos opcionais               | `Partial<User>` em updates parciais      |
| `Required<T>`    | Todos os campos obrigatórios            | `Required<Config>` após merge de padrões |
| `Pick<T, K>`     | Subconjunto de propriedades             | `Pick<User, 'id' \| 'email'>`            |
| `Omit<T, K>`     | Remover propriedades                    | `Omit<User, 'password'>` em DTOs         |
| `Record<K, V>`   | Mapa chave → valor tipado               | `Record<OrderStatus, string>`            |
| `Readonly<T>`    | Imutabilidade em compile time           | `Readonly<Config>`                       |
| `ReturnType<T>`  | Tipo de retorno de uma função           | `ReturnType<typeof buildOrder>`          |
| `Parameters<T>`  | Tipos dos parâmetros de uma função      | `Parameters<typeof createUser>`          |
| `NonNullable<T>` | Remove `null` e `undefined` do tipo     | `NonNullable<string \| null>`            |

## Taboos

| Evitar                             | Usar                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `any`                              | `unknown` — força narrowing antes do uso                        |
| Prefixo `I` em interface           | PascalCase direto: `User`, não `IUser`                          |
| `as Type` para silenciar o erro    | Narrowing real ou refatorar a função                            |
| Enum nativo                        | Const object + union type                                       |
| `Object`, `String`, `Number`       | `object`, `string`, `number` — tipos primitivos, não wrappers   |
| `Function` como tipo               | Assinatura explícita: `(id: string) => Promise<User>`           |
| `!` (non-null assertion) inline    | Guard clause ou narrowing explícito                             |

## Código narrativo com tipos

Entry point de uma linha. O orquestrador conta a história — os helpers guardam os detalhes e os tipos.

<details>
<summary>❌ Bad — tipos inline, lógica misturada no entry point</summary>
<br>

```ts
async function checkout(cartId: string): Promise<{ id: string; total: number; tax: number }> {
  const cart = await db.carts.findById(cartId);
  if (!cart || !cart.items.length) throw new Error('Cart empty');
  const subtotal = cart.items.reduce((sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.1;
  const order = await db.orders.create({ cartId, subtotal, tax, total: subtotal + tax });
  await emailService.send(cart.userId, order);

  return order;
}
```

</details>

<br>

<details>
<summary>✅ Good — entry point limpo, contratos em interfaces separadas</summary>
<br>

```ts
async function checkout(cartId: string): Promise<Order> {
  const cart = await fetchCart(cartId);
  validateCart(cart);

  const order = await saveOrder(cart);
  await notifyCustomer(cart.userId, order);

  return order;
}
```

</details>

## Retorno simétrico com tipo explícito

O nome da variável de retorno reflete o conceito da função. O return type do topo confirma o contrato.

```ts
async function findProductById(id: string): Promise<Product> {
  const product = await db.products.findById(id);

  return product;
}

function buildInvoice(order: Order): Invoice {
  const invoice = mapOrderToInvoice(order);

  return invoice;
}
```
