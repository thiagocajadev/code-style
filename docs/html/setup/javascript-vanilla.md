# JavaScript Vanilla

Padrões modernos de JavaScript pra projetos **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) sem **bundler** (empacotador). O objetivo aqui é o contexto de integração com o **DOM** (Document Object Model, Modelo de Objeto do Documento). Pra convenções da linguagem em si, veja a [documentação completa de JavaScript](../../javascript/README.md).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DOM** (Document Object Model, Modelo de Objeto do Documento) | Árvore de objetos que representa o HTML em memória; alvo das APIs do browser |
| **type module** (módulo nativo) | `<script type="module">` ativa `import`/`export`, strict mode e `defer` automático |
| **defer** (adiar execução) | Baixa em paralelo e executa após o parse, na ordem do documento |
| **event delegation** (delegação de eventos) | Listener no ancestral; usa `event.target` pra identificar a origem |
| **querySelector** (seletor único) | API de seleção via CSS; substitui `getElementById` e seletores jQuery |
| **classList** (lista de classes) | API moderna pra `add`/`remove`/`toggle` classes em um elemento |
| **AbortController** (controlador de cancelamento) | `controller.abort()` remove listeners e cancela `fetch` pendente |

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
<summary>❌ Ruim — seleção repetida, sem cache</summary>

```js
document.querySelector(".card__title").classList.add("active");
document.querySelector(".card__title").textContent = "Updated";
```

</details>

<details>
<summary>✅ Bom — cache da seleção, operações encadeadas no mesmo elemento</summary>

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
<summary>❌ Ruim — listener em cada item, não cobre elementos dinâmicos</summary>

```js
document.querySelectorAll(".product-card").forEach((card) => {
  card.addEventListener("click", handleSelect);
});
```

</details>

<details>
<summary>✅ Bom — delegation no container, matches como filtro</summary>

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
<summary>❌ Ruim — sem verificação de status, sem tratamento de erro</summary>

```js
fetch("/api/orders", { method: "POST", body: JSON.stringify(orderData) })
  .then((res) => res.json())
  .then((data) => showSuccess(data));
```

</details>

<details>
<summary>✅ Bom — status verificado, erro tratado, Content-Type explícito</summary>

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
