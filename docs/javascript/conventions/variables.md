# Variables

Dúvida? Use `const`. Só troque por `let` quando precisar reatribuir. Nunca use `var`.

## var — escopo de função, não de bloco

<details>
<summary>❌ Bad</summary>
<br>

```js
if (true) {
  var leaked = 50; // vaza para fora do bloco
}

console.log(leaked); // 50 — comportamento inesperado

var count = 10;
var count = 20; // redeclaração silenciosa
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```js
if (true) {
  const contained = 50;
}

console.log(contained); // ReferenceError — escopo correto
```

</details>

## let desnecessário

<details>
<summary>❌ Bad — let onde const seria suficiente</summary>
<br>

```js
let MAX_RETRIES = 3; // nunca reatribuído
let userName = "Alice"; // nunca reatribuído
```

</details>

<br>

<details>
<summary>✅ Good — const por padrão, let só quando necessário</summary>
<br>

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
<summary>❌ Bad — mutação acoplada e difícil de rastrear</summary>
<br>

```js
function applyDiscount(order) {
  order.discount = 10; // altera o objeto recebido
  order.total -= 10; // efeito colateral escondido
}
```

</details>

<br>

<details>
<summary>✅ Good — retorna novo estado, sem efeitos colaterais</summary>
<br>

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
<summary>❌ Bad — o que significa 18? e 86400000?</summary>
<br>

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

<br>

<details>
<summary>✅ Good — constantes nomeadas</summary>
<br>

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
