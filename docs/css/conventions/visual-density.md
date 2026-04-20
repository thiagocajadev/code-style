# Visual Density — CSS

Os mesmos princípios de [densidade visual](../../shared/visual-density.md) aplicados a CSS: agrupar o que pertence junto, separar o que é distinto.

## Entre regras

Cada bloco CSS é uma unidade semântica. Uma linha em branco entre seletores distintos separa responsabilidades e torna o arquivo escaneável de cima pra baixo.

<details>
<br>
<summary>❌ Bad — regras coladas, sem respiro entre blocos</summary>

```css
.card {
  padding: 16px;
  border-radius: 8px;
}
.card__header {
  font-size: 1.125rem;
  font-weight: 600;
}
.card__body {
  color: var(--color-text-muted);
  line-height: 1.6;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — uma linha em branco entre cada regra</summary>

```css
.card {
  padding: 16px;
  border-radius: 8px;
}

.card__header {
  font-size: 1.125rem;
  font-weight: 600;
}

.card__body {
  color: var(--color-text-muted);
  line-height: 1.6;
}
```

</details>

## Grupos de propriedades

Dentro de uma regra longa, propriedades são agrupadas por responsabilidade: posicionamento, layout, tipografia, visual. Uma linha em branco separa cada grupo — o bloco torna-se legível de cima pra baixo.

A ordem dos grupos é definida em [Formatting](formatting.md#ordem-de-propriedades).

<details>
<br>
<summary>❌ Bad — propriedades longas sem separação entre grupos</summary>

```css
.modal {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  font-size: 1rem;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — grupos separados, cada responsabilidade legível</summary>

```css
.modal {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;

  font-size: 1rem;
  line-height: 1.5;

  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}
```

</details>

## @media blocks

`@media` queries funcionam como fases do mesmo seletor — são separadas do bloco principal e entre si por uma linha em branco.

<details>
<br>
<summary>❌ Bad — @media colados, sem separação visual</summary>

```css
.hero {
  padding: 16px;
  font-size: 1rem;
}
@media (min-width: 768px) {
  .hero {
    padding: 32px;
    font-size: 1.25rem;
  }
}
@media (min-width: 1280px) {
  .hero {
    padding: 64px;
    font-size: 1.5rem;
  }
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — uma linha em branco entre cada bloco</summary>

```css
.hero {
  padding: 16px;
  font-size: 1rem;
}

@media (min-width: 768px) {
  .hero {
    padding: 32px;
    font-size: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .hero {
    padding: 64px;
    font-size: 1.5rem;
  }
}
```

</details>

## CSS nesting

Com CSS nesting (ou SCSS), cada bloco aninhado é uma unidade separada. Uma linha em branco antes de cada bloco filho mantém a hierarquia legível.

<details>
<br>
<summary>❌ Bad — tudo colado, hierarquia difícil de ler</summary>

```css
.nav {
  display: flex;
  gap: 8px;
  .nav__item {
    padding: 8px 12px;
    border-radius: 4px;
    &:hover {
      background: var(--color-surface-hover);
    }
    &.is-active {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — cada bloco aninhado separado, hierarquia visível</summary>

```css
.nav {
  display: flex;
  gap: 8px;

  .nav__item {
    padding: 8px 12px;
    border-radius: 4px;

    &:hover {
      background: var(--color-surface-hover);
    }

    &.is-active {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}
```

</details>
