# Variables

Declarações controlam três coisas: **scope** (escopo, onde a variável existe), **mutability** (se o valor pode ser alterado depois) e **hoisting** (içamento, quando a declaração é processada). A escolha errada vaza variáveis para fora do bloco, permite reatribuição acidental e quebra o raciocínio sobre o fluxo.

Dúvida? Use `const`. Só troque por `let` quando precisar reatribuir. Nunca use `var`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **const** (constante) | Declaração de bloco fixa: a referência não pode ser alterada após atribuída |
| **let** (deixar / permitir) | Declaração de bloco que pode mudar: aceita reatribuição no mesmo escopo |
| **var** (variável) | Declaração de função (legado): vaza para fora do bloco e permite redeclaração silenciosa |
| **block scope** (escopo de bloco) | Visibilidade limitada às chaves `{ }` mais próximas |
| **hoisting** (içamento) | Antecipação da declaração para o topo do escopo na fase de parsing |
| **TDZ** (Temporal Dead Zone, Zona Morta Temporal) | Trecho entre o início do bloco e a declaração `let`/`const` onde acessar a variável lança erro |

## var: escopo de função, não de bloco

<details>
<summary>❌ Ruim</summary>

```js
if (true) {
  var leaked = 50; // vaza para fora do bloco
}

console.log(leaked); // 50: comportamento inesperado

var count = 10;
var count = 20; // redeclaração silenciosa
```

</details>

<details>
<summary>✅ Bom</summary>

```js
if (true) {
  const contained = 50;
}

console.log(contained); // ReferenceError: escopo correto
```

</details>

## let desnecessário

<details>
<summary>❌ Ruim: let onde const seria suficiente</summary>

```js
let MAX_RETRIES = 3; // nunca reatribuído
let userName = "Alice"; // nunca reatribuído
```

</details>

<details>
<summary>✅ Bom: const por padrão, let só quando necessário</summary>

```js
const MAX_RETRIES = 3;
const userName = "Alice";

let attempt = 0;
while (attempt < MAX_RETRIES) {
  attempt++;
}
```

</details>

## Mutação direta de objetos

Objetos são passados por referência. Alterar um parâmetro muda o estado do chamador: um efeito
colateral invisível e difícil de rastrear. Prefira retornar um novo objeto com as propriedades
desejadas.

<details>
<summary>❌ Ruim: mutação acoplada e difícil de rastrear</summary>

```js
function applyDiscount(order) {
  order.discount = 10; // altera o objeto recebido
  order.total -= 10; // efeito colateral escondido
}
```

</details>

<details>
<summary>✅ Bom: retorna novo estado, sem efeitos colaterais</summary>

```js
function applyDiscount(order) {
  const discountedOrder = {
    ...order,
    discount: 10,
    total: order.total - 10,
  };

  return discountedOrder;
}
```

</details>

## Evitar valores mágicos

Números e strings soltos no código não dizem nada. Constantes nomeadas tornam a intenção visível.

<details>
<summary>❌ Ruim: o que significa 18? e 86400000?</summary>

```js
if (user.age >= 18) {
  /* ... */
}
if (order.status === 2) {
  /* ... */
}
setTimeout(syncData, 86400000);
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;

if (user.age >= MINIMUM_DRIVING_AGE) {
  /* ... */
}

if (order.status === ORDER_STATUS_APPROVED) {
  /* ... */
}

setTimeout(syncData, ONE_DAY_MS);
```

</details>
