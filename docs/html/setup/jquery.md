# jQuery

> **Contexto de uso:** jQuery é uma ferramenta de **manutenção de legado**. Para código novo, prefira
> JavaScript vanilla: os equivalentes nativos cobrem todos os casos de uso comuns sem dependência
> adicional. Veja [JavaScript Vanilla](javascript-vanilla.md).

jQuery simplifica manipulação de **DOM** (Document Object Model, Modelo de Objetos do Documento), eventos e requisições assíncronas. Seu valor hoje está em bases de código que já o adotam; para projetos novos, as APIs nativas do navegador cobrem o mesmo terreno sem dependência.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **DOM** (Document Object Model, Modelo de Objetos do Documento) | Árvore de nós do navegador; jQuery abstrai seleção e manipulação |
| **API** (Application Programming Interface, Interface de Programação de Aplicações) | Contrato público de uma biblioteca; jQuery tem a sua própria (`$`, `.on`, `.ajax`) |
| **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) | Formato de resposta mais comum em chamadas assíncronas |
| **callback** (função de retorno) | Função passada como argumento para executar quando a operação termina |

## Versões de referência

| Versão  | Status              | Indicação                                      |
| ------- | ------------------- | ---------------------------------------------- |
| 4.0.0   | Mais recente (2026) | Projetos novos que ainda exigem jQuery         |
| 3.7.1   | LTS de fato         | Projetos legados: versão mais comum em produção |

jQuery 4.x remove suporte a IE, adota ES Modules e tem footprint menor (~19.5KB gzip). Projetos
legados em 3.x devem permanecer nela; migração para 4.x exige revisão das APIs removidas.

## Document ready

`$(document).ready()` espera o DOM estar disponível. Na versão 3.x, a forma curta `$(fn)` é
equivalente. Prefira `DOMContentLoaded` nativo em código novo; use jQuery ready apenas quando já
está em contexto jQuery.

<details>
<summary>❌ Ruim: inline no head, DOM ainda não existe</summary>

```html
<head>
  <script>
    $('#submit-btn').on('click', handleSubmit); // erro: elemento não existe
  </script>
</head>
```

</details>

<details>
<summary>✅ Bom: aguarda DOM com $(fn) ou script defer</summary>

```js
$(function () {
  $('#submit-btn').on('click', handleSubmit);
});
```

</details>

## Seleção eficiente

Seletores por ID são os mais rápidos (mapeiam para `getElementById`). Seletores por classe e
atributo percorrem o DOM. Reduzir o escopo com contexto ou cache melhora performance.

<details>
<summary>❌ Ruim: seletor global repetido, sem cache</summary>

```js
$('.card .title').css('color', 'blue');
$('.card .title').on('click', handleClick);
$('.card .title').addClass('active');
```

</details>

<details>
<summary>✅ Bom: seleção cacheada, escopo limitado</summary>

```js
const $cards = $('#product-list');
const $titles = $cards.find('.card__title');

$titles
  .addClass('card__title--active')
  .on('click', handleClick);
```

</details>

## Event delegation

Adicionar handler em cada elemento filho é ineficiente para listas dinâmicas. Delegation registra
um único handler no pai e usa `event.target` para filtrar. Funciona para elementos adicionados
depois do bind.

<details>
<summary>❌ Ruim: handler em cada item, não funciona com itens adicionados dinamicamente</summary>

```js
$('.product-card').on('click', function () {
  $(this).toggleClass('selected');
});
```

</details>

<details>
<summary>✅ Bom: delegation no container estático, selector como filtro</summary>

```js
$('#product-list').on('click', '.product-card', function () {
  $(this).toggleClass('selected');
});
```

</details>

## Chaining

jQuery retorna `this` na maioria dos métodos. O encadeamento agrupa operações no mesmo elemento sem
repetir a seleção. Cada nível de chain é uma operação, não uma nova query.

<details>
<summary>❌ Ruim: seleção repetida para cada operação</summary>

```js
$('#notification').removeClass('hidden');
$('#notification').addClass('notification--success');
$('#notification').text('Saved successfully');
$('#notification').fadeIn(300);
```

</details>

<details>
<summary>✅ Bom: chain, uma seleção, múltiplas operações</summary>

```js
$('#notification')
  .removeClass('hidden')
  .addClass('notification--success')
  .text('Saved successfully')
  .fadeIn(300);
```

</details>

## AJAX

`$.ajax` é a API base; `$.get` e `$.post` são atalhos para casos comuns. Para JSON, defina
`contentType` e `dataType` explicitamente. Em jQuery 3.x/4.x, os métodos retornam uma Promise
compatível com `.then()` / `.catch()`.

<details>
<summary>❌ Ruim: sem contentType, callback no sucesso, sem tratamento de erro</summary>

```js
$.post('/api/orders', orderData, function (createdOrder) {
  showSuccess(createdOrder);
});
```

</details>

<details>
<summary>✅ Bom: JSON explícito, Promise com then/catch</summary>

```js
$.ajax({
  url: '/api/orders',
  method: 'POST',
  contentType: 'application/json',
  dataType: 'json',
  data: JSON.stringify(orderData),
})
  .then(function (createdOrder) {
    showSuccess(createdOrder);
  })
  .catch(function (orderError) {
    const errorMessage = orderError.responseJSON?.message ?? 'Request failed';
    showError(errorMessage);
  });
```

</details>

## Referência rápida

| Operação               | jQuery                              | Nativo equivalente                          |
| ---------------------- | ----------------------------------- | ------------------------------------------- |
| Seleção por ID         | `$('#id')`                          | `document.getElementById('id')`             |
| Seleção por classe     | `$('.class', ctx)`                  | `ctx.querySelectorAll('.class')`            |
| Evento com delegation  | `$(parent).on('click', '.sel', fn)` | `parent.addEventListener(...)` + `matches`  |
| DOM ready              | `$(fn)`                             | `type="module"` ou `DOMContentLoaded`       |
| AJAX GET               | `$.get(url).then(fn)`               | `fetch(url).then(r => r.json())`            |
| Adicionar classe       | `$el.addClass('cls')`               | `el.classList.add('cls')`                   |
| Manipular data-*       | `$el.data('key')`                   | `el.dataset.key`                            |
