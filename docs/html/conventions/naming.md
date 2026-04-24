# Naming

IDs e classes descrevem **propósito**: o papel do elemento no domínio da **UI** (User Interface, Interface do Usuário), não sua aparência nem
sua posição no layout. `data-*` é para JavaScript; classes são para CSS. As duas responsabilidades
não se misturam.

## IDs e classes

IDs são únicos por página, usados para anchors, labels de formulário e targets de JavaScript. Não
use IDs como seletor CSS. Classes seguem kebab-case semântico (mesmo BEM do CSS).

<details>
<summary>❌ Bad — ID duplicável, classe descreve aparência</summary>
<br>

```html
<div id="box" class="blue-card big-text">
  <span class="red">Error</span>
</div>
<div id="box" class="blue-card small-text">
  <span class="red">Warning</span>
</div>
```

</details>

<br>

<details>
<summary>✅ Good — ID único e semântico, classe descreve papel</summary>
<br>

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
<summary>❌ Bad — classe CSS usada como gatilho JS, sem data-*</summary>
<br>

```html
<button class="btn btn-primary open-modal">Open</button>

<div class="modal-container" data-id="1">...</div>
```

```js
document.querySelectorAll('.open-modal').forEach((btn) => { ... });
```

</details>

<br>

<details>
<summary>✅ Good — data-* para comportamento, classe só para estilo</summary>
<br>

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
<summary>❌ Bad — prefixo redundante, nome opaco</summary>
<br>

```html
<tr data-row-data-id="42" data-row-data-status="active" data-x="1">
```

</details>

<br>

<details>
<summary>✅ Good — nome direto, kebab-case, sem redundância</summary>
<br>

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
