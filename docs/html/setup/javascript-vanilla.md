# JavaScript Vanilla

Padrões modernos de JavaScript para projetos HTML sem bundler. O objetivo aqui é o contexto de
integração com o DOM. Para convenções da linguagem em si, veja a
[documentação completa de JavaScript](../../javascript/README.md).

## Script como módulo

`type="module"` implica `defer` automaticamente, ativa strict mode e habilita `import`/`export`. É a
forma padrão de incluir scripts em projetos sem bundler.

```html
<head>
  <script src="/js/app.js" type="module"></script>
</head>
```

Código em um módulo não precisa de wrapper `DOMContentLoaded`: o script executa após o parse.

## Seleção e manipulação de DOM

`querySelector` e `querySelectorAll` substituem todos os seletores jQuery com a mesma sintaxe CSS.
Cache a seleção quando reutilizar o elemento.

<details>
<summary>❌ Bad — seleção repetida, sem cache</summary>
<br>

```js
document.querySelector(".card__title").classList.add("active");
document.querySelector(".card__title").textContent = "Updated";
```

</details>

<br>

<details>
<summary>✅ Good — cache da seleção, operações encadeadas no mesmo elemento</summary>
<br>

```js
const title = document.querySelector(".card__title");

title.classList.add("active");
title.textContent = "Updated";
```

</details>

## Event delegation

Um único listener no container estático cobre elementos presentes e futuros. `element.matches()`
filtra o target pelo seletor.

<details>
<summary>❌ Bad — listener em cada item, não cobre elementos dinâmicos</summary>
<br>

```js
document.querySelectorAll(".product-card").forEach((card) => {
  card.addEventListener("click", handleSelect);
});
```

</details>

<br>

<details>
<summary>✅ Good — delegation no container, matches como filtro</summary>
<br>

```js
document.getElementById("product-list").addEventListener("click", (event) => {
  if (!event.target.closest(".product-card")) return;

  event.target.closest(".product-card").classList.toggle("selected");
});
```

</details>

## fetch

`fetch` é o substituto nativo de `$.ajax`. Retorna uma Promise; use `async/await` para clareza.

<details>
<summary>❌ Bad — sem verificação de status, sem tratamento de erro</summary>
<br>

```js
fetch("/api/orders", { method: "POST", body: JSON.stringify(orderData) })
  .then((res) => res.json())
  .then((data) => showSuccess(data));
```

</details>

<br>

<details>
<summary>✅ Good — status verificado, erro tratado, Content-Type explícito</summary>
<br>

```js
async function createOrder(orderData) {
  const orderResponse = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!orderResponse.ok) {
    const error = await orderResponse.json();
    throw new Error(error.message ?? "Request failed");
  }

  const createdOrder = await orderResponse.json();
  return createdOrder;
}
```

</details>
