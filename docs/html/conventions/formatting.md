# Formatting

Formatação consistente torna o **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) escaneável: **indentation** (indentação) revela hierarquia, ordem de **attribute** (atributo) cria previsibilidade e aspas duplas eliminam ambiguidade.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **doctype** (declaração de tipo de documento) | `<!DOCTYPE html>` no topo; ativa modo padrão do browser |
| **tag** (marcação) | Abertura `<el>` e fechamento `</el>` que delimitam o conteúdo |
| **attribute** (atributo) | Par `nome="valor"` dentro da tag de abertura; configura o elemento |
| **void element** (elemento vazio) | Tag sem fechamento (`<img>`, `<br>`, `<meta>`); não aceita conteúdo |
| **self-closing** (autofechamento) | Sintaxe `<el />`; opcional em HTML5, obrigatória em XHTML/JSX |
| **indentation** (indentação) | 2 espaços por nível; revela hierarquia do documento |
| **block vs inline** (bloco vs em linha) | Bloco quebra linha (`<section>`, `<div>`); inline flui no texto (`<a>`, `<span>`) |

## Indentação

2 espaços por nível. Elementos de bloco em nova linha, indentados em relação ao pai. Elementos
inline (`<a>`, `<strong>`, `<span>`) permanecem na mesma linha do conteúdo.

<details>
<summary>❌ Ruim: indentação inconsistente, bloco colado ao pai</summary>

```html
<ul>
<li><a href="/home">Home</a></li>
    <li>
  <a href="/about">About</a>
    </li>
</ul>
```

</details>

<details>
<summary>✅ Bom: 2 espaços, hierarquia visível</summary>

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
<summary>❌ Ruim: atributos em ordem aleatória</summary>

```html
<input required placeholder="Enter email" type="email" name="email" id="user-email" class="input" />
<img alt="Profile photo" src="/img/avatar.jpg" class="avatar" loading="lazy" id="user-avatar" />
```

</details>

<details>
<summary>✅ Bom: ordem consistente, fácil de escanear</summary>

```html
<input id="user-email" class="input" name="email" type="email" placeholder="Enter email" required />
<img id="user-avatar" class="avatar" src="/img/avatar.jpg" loading="lazy" alt="Profile photo" />
```

</details>

## Atributos longos

Quando um elemento tem muitos atributos, um por linha. O fechamento `>` ou `/>` fica na última
linha do atributo ou em linha própria; o padrão do projeto define qual, mas deve ser consistente.

<details>
<summary>❌ Ruim: atributos numa linha longa, difícil de ler</summary>

```html
<input id="search-input" class="input input--search" name="q" type="search" placeholder="Search products..." autocomplete="off" aria-label="Search products" required />
```

</details>

<details>
<summary>✅ Bom: um atributo por linha, fechamento alinhado</summary>

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
<summary>❌ Ruim: aspas simples, valor redundante em boolean</summary>

```html
<input type='text' required='required' disabled='disabled' />
<script src='/js/app.js' defer='defer'></script>
```

</details>

<details>
<summary>✅ Bom: aspas duplas, booleanos sem valor</summary>

```html
<input type="text" required disabled />
<script src="/js/app.js" defer></script>
```

</details>
