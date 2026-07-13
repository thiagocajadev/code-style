# Performance em CSS

Para desenhar a tela, o navegador passa por três etapas em sequência: calcula onde cada elemento fica e que tamanho tem (**layout**), preenche os pixels (**paint**) e junta as camadas prontas na placa gráfica (**composite**).

A propriedade que você anima decide em qual dessas etapas o navegador entra a cada quadro. Animar `top` obriga ele a refazer as três, sessenta vezes por segundo. Animar `transform` entra direto na terceira, que roda na placa gráfica e custa quase nada. É essa diferença que separa a animação fluida da que engasga.

Meça no DevTools antes de otimizar qualquer coisa.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **layout** (cálculo de layout) | A etapa em que o navegador calcula a posição e o tamanho dos elementos. Propriedades como `width`, `top` e `padding` disparam ela |
| **paint** (pintura) | A etapa em que o navegador preenche os pixels. Propriedades como `color` e `background` disparam ela |
| **composite** (composição) | A etapa em que as camadas prontas são juntadas na placa gráfica. É a mais barata das três |
| **reflow** (recálculo de layout) | Refazer o cálculo de layout de um elemento e de todos os que a mudança dele afeta |
| **GPU layer** (camada de placa gráfica) | Uma camada desenhada pela placa gráfica, que `transform` e `opacity` movem sem tocar no layout |
| **will-change** (vai mudar) | Avisa o navegador que a propriedade vai animar, para ele preparar a camada antes |
| **contain** (isolamento) | `contain: layout` promete ao navegador que o que muda dentro do elemento não afeta nada fora dele |

## Anime `transform` e `opacity`, e não a geometria

Animar `top` ou `width` faz o navegador recalcular a geometria da página a cada quadro, e não só a do elemento animado: tudo o que a posição dele empurra ou puxa entra na conta. Numa animação de 300ms, isso são dezoito recálculos completos.

`transform` e `opacity` não mexem no layout. O elemento já tem a própria camada, e a placa gráfica a desloca ou a apaga sem que o navegador precise recalcular nada. O modal desce com `translateY` em vez de `top`, e a notificação entra com `translateX` em vez de crescer de `width: 0`.

<details>
<summary>❌ Ruim: anima top e width, e o layout é recalculado a cada quadro</summary>

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
  transition: width 200ms ease; /* reflow: recalcula todo o layout */
}

.notification--visible {
  width: 320px;
}
```

</details>

<details>
<summary>✅ Bom: os dois animam por transform e opacity, sem tocar no layout</summary>

```css
.modal {
  position: fixed;
  top: 0;
  transform: translateY(-100%);
  transition: transform 300ms ease;
}

.modal--visible {
  transform: translateY(0); /* GPU: sem reflow */
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

## `will-change` só no elemento que está prestes a animar

Preparar a camada leva tempo, e por padrão o navegador só faz isso quando a animação começa. O resultado é um engasgo no primeiro quadro. O `will-change` avisa com antecedência, e a camada já está pronta quando a animação parte.

O aviso tem preço: cada camada ocupa memória da placa gráfica. Declarar `will-change` em `.card` numa lista de cinquenta cards cria cinquenta camadas que ficam ali paradas, consumindo memória o tempo todo para uma animação que talvez nunca aconteça.

O jeito certo é ligar o aviso pouco antes de animar e desligar quando a animação termina, o que o JavaScript faz com uma classe.

<details>
<summary>❌ Ruim: cada card vira uma camada permanente, e o botão anuncia uma propriedade que não se beneficia</summary>

```css
/* aplicado globalmente: cada card vira uma camada de GPU */
.card {
  will-change: transform, opacity;
}

.button {
  will-change: background-color; /* background-color não se beneficia de will-change */
}
```

</details>

<details>
<summary>✅ Bom: o aviso é ligado antes de animar e desligado quando a animação acaba</summary>

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

## O seletor longo obriga a próxima regra a repetir a corrente inteira

Um seletor como `#main-content .product-list .product-card .product-card__title` tem peso alto na cascata. Para sobrescrever aquela regra em qualquer lugar, o próximo desenvolvedor precisa repetir a corrente inteira, e o `@media` do exemplo abaixo mostra isso: mudar só o tamanho da fonte no celular custou repetir quatro seletores.

Com uma classe só, a regra do `@media` vence pela posição no arquivo, e a corrente desaparece.

<details>
<summary>❌ Ruim: a corrente de quatro seletores precisa ser repetida para mudar uma propriedade</summary>

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

<details>
<summary>✅ Bom: uma classe, e a regra do @media vence pela posição no arquivo</summary>

```css
.product-card__title {
  color: #1a1a1a;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .product-card__title {
    font-size: 0.875rem; /* mesma especificidade: ordem da cascata basta */
  }
}
```

</details>

## `contain` limita o alcance de um recálculo

Por padrão, o navegador precisa assumir o pior: quando algo muda dentro de um card, ele não sabe se aquilo vai empurrar o card seguinte, então recalcula a lista inteira. Numa lista de cem itens, uma mudança em um deles custa cem.

O `contain: layout` é uma promessa que você faz ao navegador: o que acontece dentro deste elemento fica dentro dele. Com essa garantia, o recálculo para nas bordas do card.

<details>
<summary>✅ Bom: o recálculo de um item para nas bordas dele, sem alcançar a lista</summary>

```css
.product-card {
  contain: layout style; /* reflow interno fica isolado do card */
}

.notification-list__item {
  contain: layout; /* lista de notificações, cada item isolado */
}
```

</details>

> O `contain: strict` promete tudo de uma vez: layout, estilo, pintura e tamanho. Ele exige que
> o elemento tenha altura fixa, porque o navegador passa a reservar o espaço sem olhar o conteúdo.

## O seletor universal faz o navegador percorrer a árvore inteira

Um seletor como `.form * input` pede ao navegador que confira todos os descendentes do formulário. O `[data-theme] *` é pior: ele alcança todos os elementos da página, e o navegador precisa avaliar cada um a cada recálculo.

A classe direta no elemento resolve o mesmo problema com uma comparação só. E quando várias regras compartilham a transição, listar os seletores explicitamente mantém o alcance no que precisa dela.

<details>
<summary>❌ Ruim: os dois seletores pedem uma varredura da árvore a cada recálculo</summary>

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

<details>
<summary>✅ Bom: a classe vai direto no elemento, e a transição alcança só quem precisa</summary>

```css
.form__input {
  border: 1px solid #ccc;
}

/* transição apenas nos elementos que precisam */
.button,
.card,
.nav__link {
  transition: color 200ms, background-color 200ms;
}
```

</details>
