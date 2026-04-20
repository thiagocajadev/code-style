# Testing

> Escopo: JavaScript. Visão transversal: [shared/testing.md](../../../shared/testing.md).

Testes documentam o comportamento esperado. Um teste que falha conta uma história: quem chamou, o que recebeu, o que esperava.

Os exemplos seguem a abordagem **AAA (Arrange, Act, Assert)**, que divide cada teste em três fases explícitas: preparação do contexto, execução do comportamento e verificação do resultado.

O [code style](../variables.md) se aplica dentro dos testes. O assert recebe variáveis nomeadas: sem expressões, acessos de propriedade ou literais inline.

As variáveis de assert são sempre nomeadas de forma expressiva (`actualPrice`, `expectedName`, `actualOrder` em vez de genéricos), e o `expected` é sempre declarado explicitamente, mesmo quando o valor já tem nome. Isso mantém o padrão AAA consistente: cada fase é visível e o assert lê como uma frase.

Usa [`node:test`](https://nodejs.org/api/test.html) e [`node:assert/strict`](https://nodejs.org/api/assert.html): built-in desde Node 18, sem dependências externas.

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
```

> [!NOTE]
> Em `node:assert`, a convenção é `assert.strictEqual(actual, expected)`: actual primeiro. Em Jest e Vitest, a API fluent deixa a ordem explícita: `expect(actual).toBe(expected)`.

## Fases misturadas: AAA

Cada teste é dividido em três fases separadas por uma linha em branco: preparação do contexto, execução do comportamento e verificação do resultado.

<details>
<summary>❌ Bad — tudo inline, fases invisíveis</summary>
<br>

```js
test('applies discount', () => {
  assert.strictEqual(applyDiscount({ price: 100, discountPct: 10 }), 90);
});
```

</details>

<br>

<details>
<summary>✅ Good — arrange, act e assert separados</summary>
<br>

```js
test('applies 10% discount to order price', () => {
  const order = { price: 100, discountPct: 10 };             // arrange

  const actualPrice = applyDiscount(order);                  // act

  const expectedPrice = 90;                                  // assert
  assert.strictEqual(actualPrice, expectedPrice);
});
```

</details>

## Assert inline: semantic assert

`expected` e `actual` são nomeados antes da comparação. O assert lê como uma frase, não como um cálculo. A regra vale sempre: mesmo quando o valor já tem nome, declare `expected` explicitamente para manter consistência e deixar o assert sem ambiguidade.

<details>
<summary>❌ Bad — literais inline, falha não diz o que era esperado</summary>
<br>

```js
test('formats full name', () => {
  assert.strictEqual(formatName({ first: 'John', last: 'Doe' }), 'John Doe');
});

test('returns active users only', () => {
  const users = [{ name: 'Alice', active: true }, { name: 'Bob', active: false }];
  assert.deepStrictEqual(filterActive(users), [{ name: 'Alice', active: true }]);
});
```

</details>

<br>

<details>
<summary>✅ Good — expected e actual declarados, assert semântico</summary>
<br>

```js
test('formats full name', () => {
  const user = { first: 'John', last: 'Doe' };

  const actualName = formatName(user);

  const expectedName = 'John Doe';
  assert.strictEqual(actualName, expectedName);
});

test('returns active users only', () => {
  const users = [{ name: 'Alice', active: true }, { name: 'Bob', active: false }];

  const actualUsers = filterActive(users);

  const expectedUsers = [{ name: 'Alice', active: true }];
  assert.deepStrictEqual(actualUsers, expectedUsers);
});
```

</details>

## Nome genérico

O nome do teste descreve o cenário e o resultado esperado, não o nome da função nem uma afirmação vaga. Sem prefixos: `should` não agrega informação e `given/when/then` é mecânico e verboso.

<details>
<summary>❌ Bad — prefixo vazio, nome que repete a implementação</summary>
<br>

```js
test('test 1', () => { /* ... */ });
test('should apply discount', () => { /* ... */ });

test('applyDiscount function', () => { /* ... */ });
```

</details>

<br>

<details>
<summary>✅ Good — cenário + resultado esperado, sem prefixo</summary>
<br>

```js
test('applies discount when order total exceeds minimum', () => { /* ... */ });
test('returns original price when no discount applies', () => { /* ... */ });

test('throws ValidationError when discount percentage is negative', () => { /* ... */ });
```

</details>

## Estado compartilhado

Cada teste monta seu próprio contexto. Nenhum teste depende de outro para funcionar.

<details>
<summary>❌ Bad — estado mutável compartilhado entre testes</summary>
<br>

```js
let order;

test('creates order', () => {
  order = createOrder({ items: [{ id: 1, price: 50 }] });

  assert.ok(order.id);
});

test('applies discount to order', () => {
  const actual = applyDiscount(order, 10); // depende do teste anterior
  const actualPrice = actual.price;

  const expected = 45;
  assert.strictEqual(actualPrice, expected);
});
```

</details>

<br>

<details>
<summary>✅ Good — cada teste isolado, sem dependência de execução</summary>
<br>

```js
test('creates order with generated id', () => {
  const order = createOrder({ items: [{ id: 1, price: 50 }] });

  const actualId = order.id;

  assert.ok(actualId);
});

test('applies 10% discount to order price', () => {
  const order = { items: [{ id: 1, price: 50 }], total: 100 };

  const actualOrder = applyDiscount(order, 10);
  const actualPrice = actualOrder.price;

  const expectedPrice = 90;
  assert.strictEqual(actualPrice, expectedPrice);
});
```

</details>

## Exceção sem tipo

Testar que um erro foi lançado é diferente de testar qual erro foi lançado. `assert.rejects` verifica tipo e mensagem, não apenas presença.

<details>
<summary>❌ Bad — try/catch manual, tipo não verificado</summary>
<br>

```js
test('throws on missing order', async () => {
  try {
    await findOrder(null);
  } catch (error) {
    assert.ok(error); // qualquer erro passa
  }
});
```

</details>

<br>

<details>
<summary>✅ Good — assert.rejects com matcher de tipo</summary>
<br>

```js
test('throws NotFoundError when order does not exist', async () => {
  const invalidId = 'nonexistent-id';

  const actual = findOrder(invalidId);

  const expected = { name: 'NotFoundError' };
  await assert.rejects(actual, expected);
});
```

</details>
