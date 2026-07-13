# JavaScript sem framework em páginas HTML

Esta página cobre o encontro do JavaScript com a marcação: como achar um elemento, como escutar um clique e como falar com a API. As convenções da própria linguagem estão na [documentação completa de JavaScript](../../javascript/README.md).

Vale como referência para o projeto que roda direto no navegador, sem **bundler** (empacotador) nem framework. O que era feito com jQuery hoje tem equivalente nativo, e sem dependência.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DOM** (Document Object Model · Modelo de Objeto do Documento) | A árvore de objetos que o navegador monta em memória a partir do HTML. É nela que o JavaScript mexe |
| **type module** (script como módulo) | `<script type="module">`, que liga `import` e `export`, o modo estrito e o `defer` automático |
| **event delegation** (delegação de eventos) | Escutar o evento no elemento pai e descobrir pelo `event.target` qual filho recebeu o clique |
| **querySelector** (seleção por seletor CSS) | Acha o elemento com a mesma sintaxe do CSS. Cobre o que `getElementById` e o jQuery faziam |
| **classList** (lista de classes) | Adiciona, remove e alterna a classe de um elemento sem mexer no atributo como texto |
| **AbortController** (controlador de cancelamento) | Um `controller.abort()` derruba os listeners registrados e cancela o `fetch` que ainda está em voo |

## O script como módulo já vem com `defer`

Escrever `type="module"` na tag resolve três coisas de uma vez: o script passa a aceitar `import` e `export`, roda em modo estrito e espera a leitura do documento terminar, como se tivesse `defer`.

```html
<head>
  <script src="/js/app.js" type="module"></script>
</head>
```

Dentro de um módulo, o código não precisa esperar por `DOMContentLoaded`. Quando ele roda, a página já está montada.

## Guarde o elemento numa variável antes de reusá-lo

Cada `querySelector` percorre a árvore da página de novo. Chamar o mesmo seletor duas vezes seguidas faz o navegador procurar duas vezes o elemento que ele acabou de achar.

Guardar a busca numa variável resolve a repetição, e ainda dá um nome ao elemento, o que diz ao leitor o que aquele nó representa.

<details>
<summary>❌ Ruim: o mesmo seletor percorre a árvore duas vezes</summary>

```js
document.querySelector(".card__title").classList.add("active");
document.querySelector(".card__title").textContent = "Updated";
```

</details>

<details>
<summary>✅ Bom: uma busca só, guardada num nome que diz o que o elemento é</summary>

```js
const title = document.querySelector(".card__title");

title.classList.add("active");
title.textContent = "Updated";
```

</details>

## Escute o clique no pai, e descubra qual filho foi clicado

Registrar um listener em cada card funciona enquanto os cards já estão na tela. No momento em que a lista carrega mais itens por scroll infinito ou por filtro, os cards novos chegam sem listener nenhum, e o clique neles não faz nada.

Um listener só, no container que nunca é recriado, resolve os dois casos. O evento sobe do card clicado até o container, e o `closest` diz de qual card ele veio. Cards que ainda nem existem já estão cobertos.

<details>
<summary>❌ Ruim: um listener por card, e os cards carregados depois ficam sem nenhum</summary>

```js
document.querySelectorAll(".product-card").forEach((card) => {
  card.addEventListener("click", handleSelect);
});
```

</details>

<details>
<summary>✅ Bom: um listener no container, e o closest identifica o card de origem</summary>

```js
document.getElementById("product-list").addEventListener("click", (event) => {
  if (!event.target.closest(".product-card")) return;

  event.target.closest(".product-card").classList.toggle("selected");
});
```

</details>

## `fetch` fala com a API, e o status precisa ser conferido

O `fetch` é o `$.ajax` nativo. Ele devolve uma Promise, e `async` com `await` deixa o fluxo legível de cima para baixo.

Uma armadilha aparece aqui: o `fetch` só rejeita a Promise quando a rede falha. Um 400 ou um 500 do servidor chegam como resposta bem-sucedida, e o `.then` roda normalmente. É por isso que o `orderResponse.ok` precisa ser conferido à mão. Sem essa conferência, um pedido recusado pela API cai no caminho de sucesso, e o usuário vê a tela de confirmação de um pedido que nunca existiu.

<details>
<summary>❌ Ruim: o erro da API entra no caminho de sucesso, e o usuário vê a confirmação</summary>

```js
fetch("/api/orders", { method: "POST", body: JSON.stringify(orderData) })
  .then((res) => res.json())
  .then((data) => showSuccess(data));
```

</details>

<details>
<summary>✅ Bom: o status é conferido, e a resposta de erro vira exceção</summary>

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
