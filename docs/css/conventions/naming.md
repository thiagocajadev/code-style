# Nomes em CSS

O nome da **class** (classe) diz qual papel o elemento cumpre na interface. `.button--danger` continua correto no dia em que o botão de exclusão deixar de ser vermelho. `.red-button` obriga alguém a caçar todas as ocorrências no HTML e trocar a classe, ou a conviver com uma classe chamada `.red-button` num botão laranja.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **class** (classe) | Nome reutilizável posto no elemento por `class="..."`, e alvo do seletor `.nome` no CSS |
| **kebab-case** (palavras separadas por hífen) | A forma dos nomes em CSS: `product-card` |
| **BEM** (Block Element Modifier · Bloco-Elemento-Modificador) | Convenção `block__element--modifier`, que amarra a classe ao papel dela dentro do componente |
| **block** (bloco) | A raiz do componente no BEM: `.card`, `.menu` |
| **element** (elemento) | Uma parte que só existe dentro do bloco: `.card__title`, `.menu__item` |
| **modifier** (modificador) | Uma variante de estado ou aparência do bloco: `.button--danger`, `.menu--open` |
| **specificity** (especificidade) | O peso que o navegador dá a um seletor ao decidir qual regra vence |
| **utility class** (classe utilitária) | Classe que faz uma coisa só: `.text-center`, `.mt-2` |

<a id="semantic-vs-presentational"></a>

## O nome vem do papel do elemento, e não da aparência dele

Um nome escolhido pela aparência descreve o CSS de hoje. `.blue-header`, `.big-text`, `.left-col` param de descrever o elemento no primeiro redesenho, e a partir daí quem lê o HTML recebe uma informação falsa sobre o que aquele bloco é.

Um nome escolhido pelo papel atravessa o redesenho intacto. `.heading--primary` continua sendo o título principal com qualquer cor, e `.layout__sidebar` continua sendo a barra lateral mesmo se ela mudar de lado.

<details>
<summary>❌ Ruim: os nomes descrevem cor, tamanho e posição, e travam o design</summary>

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
<summary>✅ Bom: os nomes descrevem o papel, e o valor visual fica no token</summary>

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

<a id="bem"></a>

## BEM põe a hierarquia dentro do próprio nome da classe

O padrão tem três peças. O bloco é o componente (`.card`). O elemento é uma parte que só existe dentro dele, escrito com dois sublinhados (`.card__title`). O modificador é uma variante, escrito com dois hifens (`.card--featured`).

Com isso, a classe já conta onde ela mora. Quem lê `.card__title` no HTML sabe que aquele título pertence ao card, sem abrir o CSS. E o seletor no CSS fica com uma classe só, no lugar da corrente `.card .title`, que amarra o estilo à posição do elemento na marcação e quebra quando alguém move o título de lugar.

<details>
<summary>❌ Ruim: as classes genéricas só significam algo dentro da corrente de seletores</summary>

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
<summary>✅ Bom: cada classe diz a que bloco pertence, e o seletor tem uma classe só</summary>

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

<a id="specificity"></a>

## Mantenha a especificidade baixa

Quando duas regras querem estilizar o mesmo elemento, o navegador escolhe a de maior especificidade, e o id pesa muito mais que a classe. Um seletor como `#app .container .card h2` vence quase tudo, e é aí que começa o problema.

Para sobrescrever aquela regra em um único lugar, o próximo desenvolvedor precisa escrever um seletor ainda mais pesado, ou apelar para o `!important`. Alguém depois vai precisar sobrescrever o `!important`, e a partir daí cada estilo novo carrega o peso acumulado dos anteriores.

Seletor de uma classe só mantém o peso baixo e previsível, e a regra seguinte vence pela ordem no arquivo, que é o comportamento fácil de raciocinar.

<details>
<summary>❌ Ruim: id encadeado e !important, e a próxima regra precisará pesar mais que os dois</summary>

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
<summary>✅ Bom: uma classe por seletor, e a ordem do arquivo decide quem vence</summary>

```css
.card__title {
  font-size: 1.5rem;
}
.nav__link:hover {
  color: var(--color-primary);
}
```

</details>
