# Quick Reference

Tabelas de consulta rápida para as convenções JavaScript deste guia.

## Nomenclatura

| Categoria | Convenção | Exemplos |
| --- | --- | --- |
| Variáveis | camelCase | `userName`, `totalAmount`, `isActive` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES`, `ONE_DAY_MS`, `API_URL` |
| Funções | camelCase | `fetchUser`, `calculateTax`, `validateEmail` |
| Classes | PascalCase | `UserService`, `OrderRepository`, `BaseError` |
| Booleanos | `is/has/can/should` + camelCase | `isValid`, `hasPermission`, `canRetry`, `shouldSync` |
| Coleções | plural camelCase | `orders`, `activeUsers`, `pendingItems` |

## Verbos

| Verbo | Uso | Exemplos |
| --- | --- | --- |
| `fetch` / `find` / `get` | Busca | `fetchUserById`, `findActiveOrders`, `getConfig` |
| `save` / `persist` | Persistência | `saveInvoice`, `persistChanges` |
| `compute` / `calculate` | Cálculo | `computeTotal`, `calculateDiscount` |
| `validate` / `check` | Verificação | `validateEmail`, `checkPermission` |
| `notify` / `send` | Comunicação | `notifyUser`, `sendConfirmation` |
| `format` / `render` | Apresentação | `formatDate`, `renderTemplate` |
| `build` / `create` | Construção | `buildReport`, `createInstance` |
| `parse` / `map` | Conversão | `parseDate`, `mapToViewModel` |

## Taboos

Nomes que não dizem nada — trocar pelo verbo ou conceito correto.

| Evitar | Usar |
| --- | --- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send` |
| `data`, `info`, `result` | nome do conceito: `user`, `invoice`, `summary` |
| `res`, `req`, `ctx` | `response`, `request`, `context` |
| `tmp`, `val`, `cb`, `fn` | nome completo e expressivo |
| `item`, `obj`, `thing` | nome do domínio: `order`, `product`, `entry` |

## Código narrativo

Entry point de uma linha por responsabilidade. O orquestrador conta a história — os helpers guardam os detalhes.

```js
// ❌ Bad — god function, lógica misturada no entry point
async function checkout(cartId) {
  const cart = await db.carts.findById(cartId);
  if (!cart || !cart.items.length) throw new Error('Cart empty');
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.1;
  const order = await db.orders.create({ cartId, subtotal, tax, total: subtotal + tax });
  await emailService.send(cart.userId, order);
  return order;
}

// ✅ Good — entry point limpo, detalhes abaixo
async function checkout(cartId) {
  const cart = await fetchCart(cartId);
  validateCart(cart);

  const order = await saveOrder(cart);
  await notifyCustomer(cart.userId, order);

  return order;
}

async function fetchCart(cartId) { /* ... */ }
function validateCart(cart) { /* ... */ }
async function saveOrder(cart) { /* ... */ }
async function notifyCustomer(userId, order) { /* ... */ }
```

## Retorno simétrico

O nome da variável de retorno reflete o conceito da função.

```js
function processOrder(order) {
  const invoice = buildInvoice(order);
  return invoice;
}

function findProductById(productId) {
  const product = db.products.find(productId);
  return product;
}
```

## Destructuring

Sempre no corpo da função, nunca nos parâmetros.

```js
// ❌ Bad
function formatUser({ name, email }) { /* ... */ }

// ✅ Good
function formatUser(user) {
  const { name, email } = user;
  /* ... */
}
```
