# Performance

CSS controla como o browser renderiza a página. Seletores complexos, propriedades que disparam
reflow e animações na thread principal degradam a experiência. Meça com DevTools antes de otimizar.

## Propriedades que não disparam reflow

Reflow recalcula a geometria de todos os elementos afetados: caro. `transform` e `opacity`
operam na GPU via compositor, sem reflow. Para animações, prefira sempre essas duas propriedades.

<details>
<summary>❌ Bad — anima propriedades de layout, dispara reflow por frame</summary>
<br>

```css
.modal {
  position: fixed;
  top: -100%;
  transition: top 300ms ease;
}

.modal--visible {
  top: 0; /* reflow em cada frame da animação */
}

.notification {
  width: 0;
  transition: width 200ms ease; /* reflow — recalcula todo o layout */
}

.notification--visible {
  width: 320px;
}
```

</details>

<br>

<details>
<summary>✅ Good — transform e opacity: compositor sem reflow</summary>
<br>

```css
.modal {
  position: fixed;
  top: 0;
  transform: translateY(-100%);
  transition: transform 300ms ease;
}

.modal--visible {
  transform: translateY(0); /* GPU — sem reflow */
}

.notification {
  opacity: 0;
  transform: translateX(100%);
  transition: opacity 200ms ease, transform 200ms ease;
}

.notification--visible {
  opacity: 1;
  transform: translateX(0);
}
```

</details>

## will-change: uso restrito

`will-change` cria uma nova camada no compositor antecipadamente. Promove o elemento para GPU
antes da animação começar, eliminando o jank do primeiro frame. Mas cada camada consome memória:
use apenas em elementos que realmente animam, e remova depois da animação se possível.

<details>
<summary>❌ Bad — will-change em tudo, pressão de memória desnecessária</summary>
<br>

```css
/* aplicado globalmente — cada card vira uma camada de GPU */
.card {
  will-change: transform, opacity;
}

.button {
  will-change: background-color; /* background-color não se beneficia de will-change */
}
```

</details>

<br>

<details>
<summary>✅ Good — will-change aplicado via JS só durante a animação</summary>
<br>

```css
.card {
  transition: transform 200ms ease;
}

.card--animating {
  will-change: transform; /* aplicado via JS antes de animar, removido depois */
}
```

```js
card.classList.add("card--animating");
card.addEventListener("transitionend", () => {
  card.classList.remove("card--animating");
}, { once: true });
```

</details>

## Especificidade baixa

Seletores de alta especificidade (`#id`, `!important`, seletores aninhados profundos) criam
dependências de ordem que precisam ser sobrescritas com especificidade ainda maior. A cascata
vira um jogo de força bruta. Classes simples com BEM resolvem isso.

<details>
<summary>❌ Bad — especificidade alta força escalada de força bruta</summary>
<br>

```css
#main-content .product-list .product-card .product-card__title {
  color: #1a1a1a;
  font-size: 1rem;
}

/* para sobrescrever no mobile, precisa de especificidade igual ou maior */
@media (max-width: 768px) {
  #main-content .product-list .product-card .product-card__title {
    font-size: 0.875rem;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — classe simples, sobrescrita trivial</summary>
<br>

```css
.product-card__title {
  color: #1a1a1a;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .product-card__title {
    font-size: 0.875rem; /* mesma especificidade — ordem da cascata basta */
  }
}
```

</details>

## contain: isolar reflow

`contain: layout` instrui o browser que o reflow interno ao elemento não afeta elementos
externos. Útil em componentes que renderizam em lista: o reflow de um card não propaga
para o resto da página.

<details>
<summary>✅ Good — contain isola o impacto de reflow por componente</summary>
<br>

```css
.product-card {
  contain: layout style; /* reflow interno não afeta fora do card */
}

.notification-list__item {
  contain: layout; /* lista de notificações: cada item isolado */
}
```

</details>

> `contain: strict` é o mais agressivo: `layout + style + paint + size`. Use quando o tamanho
> do elemento é conhecido (altura fixa) e o conteúdo é completamente isolado.

## Seletores universais e profundos

`*`, `[attr]`, e seletores descendentes (`A B C`) forçam o browser a percorrer a árvore
inteira a cada recálculo. Quanto mais específico o seletor, menos elementos são percorridos.

<details>
<summary>❌ Bad — seletor descendente profundo recalcula a árvore</summary>
<br>

```css
/* percorre todos os filhos de .form para encontrar input */
.form * input {
  border: 1px solid #ccc;
}

/* percorre todos os elementos para verificar o atributo */
[data-theme] * {
  transition: color 200ms, background-color 200ms;
}
```

</details>

<br>

<details>
<summary>✅ Good — classe direta no elemento</summary>
<br>

```css
.form__input {
  border: 1px solid #ccc;
}

/* transição só nos elementos que precisam */
.button,
.card,
.nav__link {
  transition: color 200ms, background-color 200ms;
}
```

</details>
