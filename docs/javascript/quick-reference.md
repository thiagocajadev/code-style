# Referência rápida de JavaScript

> Escopo: JavaScript. Resumo das convenções; o raciocínio por trás de cada uma está em `conventions/`.

Esta página serve a quem já leu as convenções e precisa conferir uma decisão em segundos: que caixa usar no nome, qual verbo escolher, que palavra não usar. Se algo aqui parecer arbitrário, a página correspondente em `conventions/` explica o porquê.

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

O verbo é a primeira palavra do nome da função, e ele promete o que a função faz. Escolha o verbo que descreve a ação, e o leitor não precisa abrir o corpo para saber se ela busca, grava ou só calcula.

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

## Nomes proibidos

Cada nome da coluna esquerda cabe em qualquer contexto, e é por isso que nenhum deles informa nada. Troque pelo verbo que descreve a ação ou pelo conceito do domínio.

| Evitar | Usar |
| --- | --- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send` |
| `data`, `info`, `result` | nome do conceito: `user`, `invoice`, `summary` |
| `res`, `req`, `ctx` | `response`, `request`, `context` |
| `tmp`, `val`, `cb`, `fn` | nome completo e expressivo |
| `item`, `obj`, `thing` | nome do domínio: `order`, `product`, `entry` |

## Desestruturação no corpo, não nos parâmetros

A **desestruturação** (extrair campos de um objeto em variáveis soltas) na assinatura esconde o que a função recebe: a lista de campos aparece no lugar do nome do objeto, e quem lê a chamada perde o conceito. Receba o objeto inteiro e abra os campos na primeira linha do corpo.

```js
function formatUser(user) {
  const { name, email } = user;
  // ...
}
```
