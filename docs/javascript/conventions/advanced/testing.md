# Testes

> Escopo: JavaScript. Visão transversal:
> [shared/standards/testing.md](../../../shared/standards/testing.md).

Um teste é a documentação viva do comportamento esperado, e a única que não
mente porque roda. Quando falha, conta a história inteira: quem foi chamado, com
o quê, e o que deveria ter voltado. Em JavaScript a base é `node:test` mais
`node:assert/strict` (ambos nativos desde o Node 18), e a estrutura é o **AAA**
(Arrange, Act, Assert · Arranjar, Agir, Atestar): as declarações ficam agrupadas
e uma linha em branco isola a asserção do resto.

## Conceitos fundamentais

| Conceito                                                 | O que é                                                                                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | Estrutura em três fases: preparar contexto, executar comportamento, verificar resultado                                             |
| **unit test** (teste unitário)                           | Testa uma função ou classe isolada; rápido; dependências externas são substituídas                                                  |
| **integration test** (teste de integração)               | Testa múltiplas peças juntas, incluindo banco real ou HTTP de teste                                                                 |
| **fixture** (massa de teste)                             | Dado de entrada conhecido reutilizado entre testes                                                                                  |
| **mock** (dados fictícios)                               | Objeto falso que substitui dependência real (banco, API, relógio) e devolve respostas pré-definidas; isola o teste do mundo externo |
| **stub** (resposta fixa)                                 | Substituto simples que retorna valor fixo, sem registrar chamadas                                                                   |
| **spy** (espião)                                         | Invólucro que registra chamadas mas mantém o comportamento original                                                                 |
| **assertion** (asserção)                                 | Verificação explícita do resultado esperado (`assert.strictEqual`, `assert.deepStrictEqual`)                                        |
| **actual** (valor atual)                                | O que o código devolveu de fato na execução do teste; é o valor que está sob verificação                                            |
| **expected** (valor esperado)                            | O que o código deveria ter devolvido; é o valor que você escreve à mão no teste, como referência                                    |
| **expressive naming** (nomeação expressiva)              | Variáveis de assert com nome do conceito (`actualPrice`, `expectedName`), nunca genéricos                                           |

O [code style](../variables.md) se aplica dentro dos testes. O assert recebe
variáveis nomeadas de forma expressiva (`actualPrice`, `expectedName`), sem
expressões, acessos de propriedade ou literais inline.

Os exemplos usam [`node:test`](https://nodejs.org/api/test.html) e
[`node:assert/strict`](https://nodejs.org/api/assert.html): nativos desde o
Node 18, sem dependências externas.

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
```

> [!NOTE]
> Em `node:assert`, a convenção é `assert.strictEqual(actual, expected)`: actual
> primeiro. Em Jest e Vitest, a API fluente deixa a ordem explícita:
> `expect(actual).toBe(expected)`.

<a id="mixed-phases-aaa"></a>

## Fases misturadas: AAA

Cada teste agrupa as três fases (contexto, execução e valor esperado) em um
bloco único, e uma linha em branco isola a asserção do resultado.

<details>
<summary>❌ Ruim: tudo inline, fases invisíveis</summary>

```js
test("applies discount", () => {
  assert.strictEqual(applyDiscount({ price: 100, discountPercentage: 10 }), 90);
});
```

</details>

<details>
<summary>✅ Bom: setup agrupado, asserção isolada por linha em branco</summary>

```js
test("applies 10% discount to order price", () => {
  const order = { price: 100, discountPercentage: 10 }; // arrange
  const actualPrice = applyDiscount(order); // act
  const expectedPrice = 90; // assert

  assert.strictEqual(actualPrice, expectedPrice);
});
```

</details>

## Assert com valores soltos

Nomeie `actual` e `expected` antes de comparar. O assert passa a ler como uma
frase em vez de um cálculo, e a mensagem de falha diz o que era esperado sem
você abrir o arquivo. A regra vale sempre: mesmo quando o valor já tem nome,
declare `expected` de forma explícita para o assert não deixar dúvida.

<details>
<summary>❌ Ruim: literais inline, falha não diz o que era esperado</summary>

```js
test("formats full name", () => {
  assert.strictEqual(formatName({ first: "John", last: "Doe" }), "John Doe");
});

test("returns active users only", () => {
  const users = [
    { name: "Alice", active: true },
    { name: "Bob", active: false },
  ];
  assert.deepStrictEqual(filterActive(users), [
    { name: "Alice", active: true },
  ]);
});
```

</details>

<details>
<summary>✅ Bom: expected e actual declarados, assert semântico</summary>

```js
test("formats full name", () => {
  const user = { first: "John", last: "Doe" };
  const actualName = formatName(user);
  const expectedName = "John Doe";

  assert.strictEqual(actualName, expectedName);
});

test("returns active users only", () => {
  const users = [
    { name: "Alice", active: true },
    { name: "Bob", active: false },
  ];

  const actualUsers = filterActive(users);
  const expectedUsers = [{ name: "Alice", active: true }];

  assert.deepStrictEqual(actualUsers, expectedUsers);
});
```

</details>

## Nome genérico

O nome do teste descreve o cenário e o resultado esperado, não o nome da função
nem uma afirmação vaga. Sem prefixos: `should` não agrega informação e
`given/when/then` é mecânico e verboso.

<details>
<summary>❌ Ruim: prefixo vazio, nome que repete a implementação</summary>

```js
test("test 1", () => {
  /* ... */
});
test("should apply discount", () => {
  /* ... */
});

test("applyDiscount function", () => {
  /* ... */
});
```

</details>

<details>
<summary>✅ Bom: cenário + resultado esperado, sem prefixo</summary>

```js
test("applies discount when order total exceeds minimum", () => {
  /* ... */
});
test("returns original price when no discount applies", () => {
  /* ... */
});

test("throws ValidationError when discount percentage is negative", () => {
  /* ... */
});
```

</details>

## Estado compartilhado

Cada teste monta o próprio contexto e não depende de nenhum outro para
funcionar. Estado que sobrevive de um teste para o seguinte produz a falha mais
cara de depurar: o teste passa sozinho, quebra dentro da suíte, e o culpado é a
ordem de execução.

<details>
<summary>❌ Ruim: estado compartilhado que muda entre testes</summary>

```js
let order;

test("creates order", () => {
  order = createOrder({ items: [{ id: 1, price: 50, quantity: 2 }] });

  assert.ok(order.id);
});

test("applies discount to order", () => {
  const actual = applyDiscount(order, 10); // depende do teste anterior
  const actualPrice = actual.price;

  const expected = 45;
  assert.strictEqual(actualPrice, expected);
});
```

</details>

<details>
<summary>✅ Bom: cada teste isolado, sem dependência de execução</summary>

```js
test("creates order with generated id", () => {
  const order = createOrder({ items: [{ id: 1, price: 50, quantity: 2 }] });
  const actualId = order.id;

  assert.ok(actualId);
});

test("applies 10% discount to order price", () => {
  const order = { items: [{ id: 1, price: 50, quantity: 2 }], total: 100 };
  const actualOrder = applyDiscount(order, 10);
  const actualPrice = actualOrder.price;
  const expectedPrice = 90;

  assert.strictEqual(actualPrice, expectedPrice);
});
```

</details>

## Exceção sem tipo

Testar que um erro foi lançado é diferente de testar qual erro foi lançado.
`assert.rejects` confere o tipo e a mensagem do erro, além da presença dele.

<details>
<summary>❌ Ruim: try/catch manual, tipo não verificado</summary>

```js
test("throws on missing order", async () => {
  try {
    await findOrder(null);
  } catch (error) {
    assert.ok(error); // qualquer erro passa
  }
});
```

</details>

<details>
<summary>✅ Bom: assert.rejects com matcher de tipo</summary>

```js
test("throws NotFoundError when order does not exist", async () => {
  const invalidId = "nonexistent-id";
  const actual = findOrder(invalidId);
  const expected = { name: "NotFoundError" };

  await assert.rejects(actual, expected);
});
```

</details>
