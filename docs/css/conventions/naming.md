# Naming

Nomes de classe descrevem **propósito** — o que o elemento representa no domínio da UI — não sua
aparência visual. Uma classe que diz `.button--danger` sobrevive a uma mudança de cor. `.red-button`
não.

## Semântico vs presentacional

<details>
<summary>❌ Bad — nome descreve aparência, quebra ao mudar o design</summary>

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
<summary>✅ Good — nome descreve papel, sobrevive a mudanças de design</summary>

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
relacionamento entre partes da UI sem depender de aninhamento no CSS.

<details>
<summary>❌ Bad — hierarquia implícita, acoplada ao HTML</summary>

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
<summary>✅ Good — BEM: bloco__elemento--modificador</summary>

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

Especificidade alta torna o CSS frágil — qualquer override exige `!important` ou seletor ainda mais
específico.

<details>
<summary>❌ Bad — IDs e seletores encadeados inflam a especificidade</summary>

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
<summary>✅ Good — classes simples, especificidade baixa e previsível</summary>

```css
.card__title {
  font-size: 1.5rem;
}
.nav__link:hover {
  color: var(--color-primary);
}
```

</details>
