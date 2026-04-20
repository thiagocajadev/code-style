# Quick Reference

> Escopo: JavaScript. Cheat-sheet das convenções; detalhes em `conventions/`.

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

Nomes que não dizem nada. Troque pelo verbo ou conceito correto.

| Evitar | Usar |
| --- | --- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send` |
| `data`, `info`, `result` | nome do conceito: `user`, `invoice`, `summary` |
| `res`, `req`, `ctx` | `response`, `request`, `context` |
| `tmp`, `val`, `cb`, `fn` | nome completo e expressivo |
| `item`, `obj`, `thing` | nome do domínio: `order`, `product`, `entry` |

## Destructuring

Sempre no corpo da função, nunca nos parâmetros.

```js
function formatUser(user) {
  const { name, email } = user;
  // ...
}
```
