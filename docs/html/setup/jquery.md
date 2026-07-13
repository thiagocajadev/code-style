# jQuery

> **Contexto de uso:** esta página serve à **manutenção de código legado**. Em código novo, use
> JavaScript sem framework: as APIs nativas do navegador cobrem os casos comuns sem trazer uma
> dependência junto. Veja [JavaScript sem framework](javascript-vanilla.md).

jQuery resolveu, na época dele, um problema real: cada navegador implementava a manipulação de **DOM** (Document Object Model · Modelo de Objetos do Documento), os eventos e as requisições de um jeito, e o `$` escondia essa diferença atrás de uma API só. Os navegadores convergiram, e hoje o que resta é uma base grande de código escrito com ele.

Esta página serve a quem mantém esse código: as convenções que evitam os erros mais comuns, e a tabela do fim, que traz o equivalente nativo de cada operação.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **DOM** (Document Object Model · Modelo de Objetos do Documento) | A árvore de nós que o navegador monta a partir do HTML. É o que o `$` seleciona e altera |
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | O conjunto de métodos que a biblioteca expõe. No jQuery são `$`, `.on` e `.ajax`, entre outros |
| **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) | O formato em que a API responde na maioria das chamadas assíncronas |
| **callback** (função de retorno) | Função passada como argumento, que roda quando a operação termina |
| **chaining** (encadeamento) | Chamar um método atrás do outro na mesma linha, porque cada um devolve a própria seleção |

## Versões de referência

| Versão  | Status              | Indicação                                      |
| ------- | ------------------- | ---------------------------------------------- |
| 4.0.0   | Mais recente (2026) | Projetos novos que ainda exigem jQuery         |
| 3.7.1   | LTS de fato         | Projetos legados: versão mais comum em produção |

A versão 4.x abandonou o suporte ao Internet Explorer, passou a usar ES Modules e encolheu para cerca de 19,5 KB comprimidos. Um projeto que já roda em 3.x fica onde está. A subida para a 4.x pede uma revisão das APIs removidas antes de valer a pena.

## O script precisa esperar a página existir

Um `$('#submit-btn')` que roda dentro do `<head>` não encontra nada. O navegador ainda não leu o `<body>`, então o botão não existe na árvore, e a seleção volta vazia. A chamada não quebra nem avisa: ela registra o clique num conjunto de zero elementos, e o botão fica sem resposta.

O `$(function () { ... })` adia o código até a página estar montada. Em código novo, o `type="module"` ou o `defer` no script já garantem isso, sem passar pelo jQuery.

<details>
<summary>❌ Ruim: o script roda no head, e o botão que ele procura ainda não existe</summary>

```html
<head>
  <script>
    $('#submit-btn').on('click', handleSubmit); // erro: elemento não existe
  </script>
</head>
```

</details>

<details>
<summary>✅ Bom: o código espera a página estar montada antes de procurar o botão</summary>

```js
$(function () {
  $('#submit-btn').on('click', handleSubmit);
});
```

</details>

## Guarde a seleção, e limite onde ela procura

Cada `$('.card .title')` percorre a página inteira de novo. Três chamadas seguidas do mesmo seletor fazem três varreduras para achar os mesmos elementos.

Guardar o resultado numa variável corta as repetições. Buscar a partir de um id, com `find`, corta o alcance: em vez de varrer o documento todo, o jQuery salta direto para o container e procura só ali dentro.

<details>
<summary>❌ Ruim: o mesmo seletor varre a página três vezes</summary>

```js
$('.card .title').css('color', 'blue');
$('.card .title').on('click', handleClick);
$('.card .title').addClass('active');
```

</details>

<details>
<summary>✅ Bom: uma busca guardada, e a procura limitada ao container</summary>

```js
const $cards = $('#product-list');
const $titles = $cards.find('.card__title');

$titles
  .addClass('card__title--active')
  .on('click', handleClick);
```

</details>

## Escute o clique no container, e filtre pelo seletor do filho

O `$('.product-card').on(...)` registra um handler em cada card que existe naquele instante. Os cards que a lista carregar depois, por filtro ou por scroll, chegam sem handler, e o clique neles não faz nada.

Passar o seletor do filho como segundo argumento muda o registro de lugar: o handler fica no container, que nunca é recriado, e o jQuery confere se o clique veio de um `.product-card`. Cards que ainda nem existem já estão cobertos.

<details>
<summary>❌ Ruim: um handler por card, e os cards carregados depois ficam de fora</summary>

```js
$('.product-card').on('click', function () {
  $(this).toggleClass('selected');
});
```

</details>

<details>
<summary>✅ Bom: o handler mora no container, e o seletor filtra a origem do clique</summary>

```js
$('#product-list').on('click', '.product-card', function () {
  $(this).toggleClass('selected');
});
```

</details>

## Encadeie as operações sobre a mesma seleção

Quase todo método do jQuery devolve a própria seleção, e é isso que permite chamar o próximo método logo em seguida. Escrever `$('#notification')` quatro vezes faz o jQuery buscar quatro vezes o mesmo elemento. Encadeado, ele busca uma vez e aplica as quatro operações sobre o que já tem em mãos.

Quebre uma operação por linha. A leitura fica vertical, e o diff do Git aponta a linha que mudou.

<details>
<summary>❌ Ruim: a mesma busca repetida a cada operação</summary>

```js
$('#notification').removeClass('hidden');
$('#notification').addClass('notification--success');
$('#notification').text('Saved successfully');
$('#notification').fadeIn(300);
```

</details>

<details>
<summary>✅ Bom: uma busca, quatro operações encadeadas, uma por linha</summary>

```js
$('#notification')
  .removeClass('hidden')
  .addClass('notification--success')
  .text('Saved successfully')
  .fadeIn(300);
```

</details>

## Declare o formato na chamada, e trate o erro

O `$.ajax` é a chamada completa, e `$.get` e `$.post` são atalhos dela. O atalho esconde duas decisões que costumam ser as erradas.

A primeira é o formato. Sem `contentType`, o `$.post` envia os dados como formulário, e a API que espera JSON recusa. A segunda é o erro: passar um callback de sucesso e parar por aí deixa a falha sem tratamento nenhum, e o usuário fica olhando para uma tela que não responde.

A partir da 3.x, a chamada devolve uma Promise, então `.then` e `.catch` cobrem os dois caminhos.

<details>
<summary>❌ Ruim: envia como formulário, e a falha não tem para onde ir</summary>

```js
$.post('/api/orders', orderData, function (createdOrder) {
  showSuccess(createdOrder);
});
```

</details>

<details>
<summary>✅ Bom: JSON declarado nos dois sentidos, com sucesso e falha tratados</summary>

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
