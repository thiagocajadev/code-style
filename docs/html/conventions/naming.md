# Nomes em HTML

O nome de um **id** (identificador) ou de uma **class** (classe) diz qual papel o elemento cumpre na tela: `order-summary`, `alert--error`, `product-card`. Um nome escolhido pela aparência tem prazo de validade curto. `blue-card` descreve o card enquanto ele for azul; no redesenho que o deixa verde, alguém precisa trocar a classe em todos os arquivos, ou conviver com uma classe chamada `blue-card` num card verde.

Duas coisas diferentes leem a marcação, e cada uma tem o seu atributo. O CSS lê a classe para colorir o elemento. O JavaScript lê o **data attribute** (atributo de dados), o `data-*`, para saber o que fazer quando alguém clica.

Manter essa divisão evita um acidente comum. Se o JavaScript procura o botão pela classe `.open-modal`, quem renomear essa classe numa faxina de CSS desliga o clique, e nada acusa o erro: a página continua carregando, o botão continua na tela e o modal deixa de abrir.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **id** (identificador) | Aparece uma vez só na página. Serve de alvo para link, para `<label for>` e para o JavaScript |
| **class** (classe) | Reutilizável em vários elementos. O nome descreve o papel que o elemento cumpre |
| **data attribute** (atributo de dados) | `data-*`, lido pelo JavaScript através de `dataset`. É o canal de comportamento |
| **kebab-case** (palavras separadas por hífen) | Forma dos nomes em HTML e CSS: `product-card` |
| **BEM** (Block Element Modifier · Bloco-Elemento-Modificador) | Convenção `block__element--modifier`, que amarra a classe ao papel dela dentro do componente |
| **semantic class** (classe semântica) | O nome vem do papel, como `alert--danger`. Continua valendo depois de um redesenho |
| **presentational class** (classe de aparência) | O nome vem do visual, como `red-text`. Deixa de descrever o elemento assim que a cor muda |

<a id="ids-and-classes"></a>

## Um id aparece uma vez, uma classe se repete

O id é o endereço de um elemento dentro da página. Um link com `#checkout-summary` salta para ele, um `<label for>` se conecta ao campo por ele, e o JavaScript o encontra por ele. Repetir o mesmo id em dois elementos cria dois destinos para um endereço só, e o navegador entrega sempre o primeiro que achar.

A classe existe para se repetir, e é ela que carrega o nome do papel: `order-summary`, `alert--error`. Escreva em kebab-case, seguindo o mesmo BEM que o CSS usa.

Evite escolher o id como seletor de CSS. Ele tem prioridade alta demais na cascata, e sobrescrever essa regra depois custa caro.

<details>
<summary>❌ Ruim: o mesmo id em dois elementos, e a classe descreve a cor</summary>

```html
<div id="box" class="blue-card big-text">
  <span class="red">Error</span>
</div>
<div id="box" class="blue-card small-text">
  <span class="red">Warning</span>
</div>
```

</details>

<details>
<summary>✅ Bom: cada id aparece uma vez, e a classe diz o papel do elemento</summary>

```html
<div id="checkout-summary" class="order-summary">
  <span class="alert alert--error">Error</span>
</div>

<div id="cart-sidebar" class="order-summary order-summary--compact">
  <span class="alert alert--warning">Warning</span>
</div>
```

</details>

<a id="data-attributes"></a>

## `data-*` guarda o dado que o JavaScript vai ler

Um `data-*` carrega estado e configuração, e o nome dele descreve o dado guardado: `data-modal-target`, `data-user-id`, `data-status`. O JavaScript chega até ele por `dataset` ou por um seletor de atributo, como `[data-modal-target]`.

Com o gancho do JavaScript num `data-*`, a classe fica livre para ser renomeada, dividida ou apagada durante um redesenho, e o comportamento do botão continua de pé.

<details>
<summary>❌ Ruim: o JavaScript procura pela classe de estilo, e nenhum data-* existe</summary>

```html
<button class="btn btn-primary open-modal">Open</button>

<div class="modal-container" data-id="1">...</div>
```

```js
document.querySelectorAll('.open-modal').forEach((btn) => { ... });
```

</details>

<details>
<summary>✅ Bom: o JavaScript procura pelo data-*, e a classe fica só com o estilo</summary>

```html
<button class="button button--primary" data-modal-target="product-details">Open</button>

<div class="modal" data-modal-id="product-details">...</div>
```

```js
document.querySelectorAll('[data-modal-target]').forEach((btn) => { ... });
```

</details>

## Como nomear um `data-*`

Escreva em kebab-case e diga o que o valor guarda: `data-user-id`, `data-status`, `data-page`.

Duas coisas engordam o nome sem informar nada. Repetir o elemento pai (`data-row-data-id` dentro de um `<tr>`) só devolve a informação que a marcação já dá. E abreviar até virar `data-x` deixa o leitor procurando no JavaScript o que o valor significa.

<details>
<summary>❌ Ruim: o nome repete o elemento pai, e data-x não diz nada</summary>

```html
<tr data-row-data-id="42" data-row-data-status="active" data-x="1">
```

</details>

<details>
<summary>✅ Bom: cada nome diz o que guarda, em kebab-case</summary>

```html
<tr data-user-id="42" data-status="active" data-page="1">
```

</details>

## Referência rápida

| Uso             | Convenção       | Exemplo                        |
| --------------- | --------------- | ------------------------------ |
| ID              | kebab-case      | `id="checkout-summary"`        |
| Classe          | BEM kebab-case  | `class="card card--featured"`  |
| data-*          | kebab-case      | `data-modal-target="dialog-1"` |
| aria-label      | Texto natural   | `aria-label="Close dialog"`    |
