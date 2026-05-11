# Naming

Nomes de **class** (classe) descrevem o papel do elemento no domínio da **UI** (User Interface, Interface do Usuário), não sua aparência. Uma classe `.button--danger` sobrevive a uma mudança de cor. `.red-button` não.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **class** (classe) | Identificador reutilizável aplicado via `class="..."`; alvo do seletor `.nome` |
| **kebab-case** (palavras separadas por hífen) | Convenção CSS: `product-card`, não `productCard` |
| **BEM** (Block Element Modifier, Bloco-Elemento-Modificador) | `block__element--modifier`; vincula classe ao papel no componente |
| **block** (bloco) | Componente raiz no BEM: `.card`, `.menu` |
| **element** (elemento) | Parte do bloco no BEM: `.card__title`, `.menu__item` |
| **modifier** (modificador) | Variante de estado/aparência: `.button--danger`, `.menu--open` |
| **semantic class** (classe semântica) | Nome descreve o papel; sobrevive a mudanças de design |
| **utility class** (classe utilitária) | Classe atômica focada em uma propriedade: `.text-center`, `.mt-2` |

## Semântico vs presentacional

<details>
<summary>❌ Ruim — nome descreve aparência, quebra ao mudar o design</summary>

```css
.blue-header {
  color: #1d4ed8;
}
.big-text {
  font-size: 2rem;
}
.left-col {
  float: left;
  width: 30%;
}
.red-alert {
  background: red;
  color: white;
}
```

</details>

<details>
<summary>✅ Bom — nome descreve papel, sobrevive a mudanças de design</summary>

```css
.heading--primary {
  color: var(--color-primary);
}
.text--display {
  font-size: var(--font-size-display);
}
.layout__sidebar {
  width: 30%;
}
.alert--danger {
  background: var(--color-danger);
  color: var(--color-on-danger);
}
```

</details>

## BEM

BEM - Block\_\_Element--Modifier (Bloco\_\_Elemento--Modificador) torna explícita a hierarquia e o
relacionamento entre partes da **UI** (User Interface, Interface do Usuário) sem depender de aninhamento no CSS.

<details>
<summary>❌ Ruim — hierarquia implícita, acoplada ao **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto)</summary>

```html
<div class="card featured">
  <img class="image big" />
  <h2 class="title">...</h2>
  <button class="btn primary">...</button>
</div>
```

```css
.card .title {
  font-size: 1.25rem;
}
.card.featured .title {
  font-weight: bold;
}
.card .btn.primary {
  background: blue;
}
```

</details>

<details>
<summary>✅ Bom — BEM: bloco__elemento--modificador</summary>

```html
<div class="card card--featured">
  <img class="card__image card__image--large" />
  <h2 class="card__title">...</h2>
  <button class="card__action button button--primary">...</button>
</div>
```

```css
.card__title {
  font-size: 1.25rem;
}
.card--featured .card__title {
  font-weight: bold;
}
.button--primary {
  background: var(--color-primary);
}
```

</details>

## Especificidade

Especificidade alta torna o CSS frágil. Qualquer override exige `!important` ou seletor ainda mais
específico.

<details>
<summary>❌ Ruim — IDs e seletores encadeados inflam a especificidade</summary>

```css
#app .container .card h2 {
  font-size: 1.5rem;
}
.nav a:hover {
  color: blue !important;
}
```

</details>

<details>
<summary>✅ Bom — classes simples, especificidade baixa e previsível</summary>

```css
.card__title {
  font-size: 1.5rem;
}
.nav__link:hover {
  color: var(--color-primary);
}
```

</details>
