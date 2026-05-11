# Naming

**id** (identificador) e **class** (classe) descrevem o papel do elemento no domínio da **UI** (User Interface, Interface do Usuário), não sua aparência nem sua posição no layout. **data attribute** (atributo de dados) é pra JavaScript; classes são pra CSS. As duas responsabilidades não se misturam.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **id** (identificador) | Único por página; alvo de anchor, `<label for>` e seletor de JavaScript |
| **class** (classe) | Reutilizável; nome semântico que descreve o papel, não a aparência |
| **data attribute** (atributo de dados) | `data-*` exposto via `dataset`; canal de JavaScript, não de CSS |
| **kebab-case** (palavras separadas por hífen) | Convenção de nomes em HTML/CSS (`product-card`, não `productCard`) |
| **BEM** (Block Element Modifier, Bloco-Elemento-Modificador) | `block__element--modifier`; vincula classe ao papel no componente |
| **semantic class** (classe semântica) | Nome descreve o papel (`alert--danger`), sobrevive a mudanças de design |
| **presentational class** (classe de aparência) | Nome descreve o visual (`red-text`); quebra ao redesenhar |

## IDs e classes

IDs são únicos por página, usados para anchors, labels de formulário e targets de JavaScript. Não
use IDs como seletor CSS. Classes seguem kebab-case semântico (mesmo BEM do CSS).

<details>
<summary>❌ Ruim: ID duplicável, classe descreve aparência</summary>

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
<summary>✅ Bom: ID único e semântico, classe descreve papel</summary>

```html
<div id="checkout-summary" class="order-summary">
  <span class="alert alert--error">Error</span>
</div>

<div id="cart-sidebar" class="order-summary order-summary--compact">
  <span class="alert alert--warning">Warning</span>
</div>
```

</details>

## data-attributes

`data-*` armazena estado e configuração para JavaScript. O nome descreve o dado, não a ação. Não
reutilize classes CSS como gatilhos de comportamento: isso acopla estilo e lógica.

<details>
<summary>❌ Ruim: classe CSS usada como gatilho JS, sem data-*</summary>

```html
<button class="btn btn-primary open-modal">Open</button>

<div class="modal-container" data-id="1">...</div>
```

```js
document.querySelectorAll('.open-modal').forEach((btn) => { ... });
```

</details>

<details>
<summary>✅ Bom: data-* para comportamento, classe só para estilo</summary>

```html
<button class="button button--primary" data-modal-target="product-details">Open</button>

<div class="modal" data-modal-id="product-details">...</div>
```

```js
document.querySelectorAll('[data-modal-target]').forEach((btn) => { ... });
```

</details>

## Nomenclatura de data-*

`data-*` usa kebab-case. O nome deve ser descritivo sem prefixo redundante (sem `data-data-` ou
repetir o elemento pai).

<details>
<summary>❌ Ruim: prefixo redundante, nome opaco</summary>

```html
<tr data-row-data-id="42" data-row-data-status="active" data-x="1">
```

</details>

<details>
<summary>✅ Bom: nome direto, kebab-case, sem redundância</summary>

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
