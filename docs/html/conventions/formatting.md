# Formatting

Formatação consistente torna o **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) escaneável: indentação revela hierarquia, ordem de atributos
cria previsibilidade e aspas duplas eliminam ambiguidade.

## Indentação

2 espaços por nível. Elementos de bloco em nova linha, indentados em relação ao pai. Elementos
inline (`<a>`, `<strong>`, `<span>`) permanecem na mesma linha do conteúdo.

<details>
<summary>❌ Bad — indentação inconsistente, bloco colado ao pai</summary>
<br>

```html
<ul>
<li><a href="/home">Home</a></li>
    <li>
  <a href="/about">About</a>
    </li>
</ul>
```

</details>

<br>

<details>
<summary>✅ Good — 2 espaços, hierarquia visível</summary>
<br>

```html
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>
```

</details>

## Ordem de atributos

Atributos seguem uma ordem fixa: identificação → tipo/papel → fonte → estado → dados → aria. A
ordem previsível reduz o tempo para localizar um atributo específico.

```
id → class → name → type → src | href → value → placeholder → for
→ disabled | required | readonly → loading → data-* → aria-* → role
```

<details>
<summary>❌ Bad — atributos em ordem aleatória</summary>
<br>

```html
<input required placeholder="Enter email" type="email" name="email" id="user-email" class="input" />
<img alt="Profile photo" src="/img/avatar.jpg" class="avatar" loading="lazy" id="user-avatar" />
```

</details>

<br>

<details>
<summary>✅ Good — ordem consistente, fácil de escanear</summary>
<br>

```html
<input id="user-email" class="input" name="email" type="email" placeholder="Enter email" required />
<img id="user-avatar" class="avatar" src="/img/avatar.jpg" loading="lazy" alt="Profile photo" />
```

</details>

## Atributos longos

Quando um elemento tem muitos atributos, um por linha. O fechamento `>` ou `/>` fica na última
linha do atributo ou em linha própria; o padrão do projeto define qual, mas deve ser consistente.

<details>
<summary>❌ Bad — atributos numa linha longa, difícil de ler</summary>
<br>

```html
<input id="search-input" class="input input--search" name="q" type="search" placeholder="Search products..." autocomplete="off" aria-label="Search products" required />
```

</details>

<br>

<details>
<summary>✅ Good — um atributo por linha, fechamento alinhado</summary>
<br>

```html
<input
  id="search-input"
  class="input input--search"
  name="q"
  type="search"
  placeholder="Search products..."
  autocomplete="off"
  aria-label="Search products"
  required
/>
```

</details>

## Aspas e boolean attributes

Sempre aspas duplas em valores de atributo. Atributos booleanos (`required`, `disabled`, `checked`,
`readonly`) não precisam de valor; a presença já é `true`.

<details>
<summary>❌ Bad — aspas simples, valor redundante em boolean</summary>
<br>

```html
<input type='text' required='required' disabled='disabled' />
<script src='/js/app.js' defer='defer'></script>
```

</details>

<br>

<details>
<summary>✅ Good — aspas duplas, booleanos sem valor</summary>
<br>

```html
<input type="text" required disabled />
<script src="/js/app.js" defer></script>
```

</details>
