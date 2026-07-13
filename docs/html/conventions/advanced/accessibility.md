# Acessibilidade em HTML

> Escopo: HTML. Idiomas específicos deste ecossistema.

A maior parte da acessibilidade de uma página vem da própria marcação. Escolher o elemento que descreve o papel do conteúdo, descrever cada imagem e manter a ordem de foco previsível já cobre a maioria dos casos, sem nenhum atributo de **ARIA** (Accessible Rich Internet Applications · Aplicações Ricas e Acessíveis para Internet) por cima.

Vale escrever assim desde a primeira linha do arquivo. Acessibilidade encaixada no fim, sobre uma marcação feita de `<div>`, custa uma reescrita da estrutura.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto) | A estrutura da página. O elemento certo já chega com acessibilidade pronta |
| **ARIA** (Accessible Rich Internet Applications · Aplicações Ricas e Acessíveis para Internet) | Atributos que completam a semântica nos casos em que o HTML nativo não tem elemento equivalente |
| **screen reader** (leitor de tela) | Programa que lê a página em voz alta e navega por ela pelos elementos e títulos |
| **alt text** (texto alternativo) | A descrição que o leitor de tela anuncia no lugar da imagem |
| **focus order** (ordem de foco) | A sequência em que o `Tab` visita os elementos. Segue a ordem da marcação |
| **role** (papel) | O que o elemento representa. `<button>` já traz o seu; um `<div>` precisa declarar |

<a id="images"></a>

## Toda imagem tem `alt`, e o conteúdo dele depende do papel dela

Quando a imagem carrega informação, o `alt` conta ao leitor de tela o que ela mostra: `alt="Monthly sales chart showing 20% growth in Q1"`. Quando a imagem só decora, escreva `alt=""` vazio, e o leitor de tela pula ela.

Deixar o `alt` de fora é o pior dos casos. Sem ele, muitos leitores de tela anunciam o nome do arquivo, e o usuário ouve "avatar ponto jpg". Um `alt="image"` ou `alt="logo"` também não informa nada: o leitor já sabe que aquilo é uma imagem, e quer saber o que está nela.

<details>
<summary>❌ Ruim: uma imagem sem alt, duas com alt que não descreve, e a decorativa anunciada</summary>

```html
<img src="/img/avatar.jpg" />
<img src="/img/chart.png" alt="image" />
<img src="/img/logo.svg" alt="logo" />

<!-- decorative sem alt vazio -->
<img src="/img/divider.png" alt="decorative divider" />
```

</details>

<details>
<summary>✅ Bom: o alt descreve o que a imagem mostra, e a decorativa fica com alt vazio</summary>

```html
<img src="/img/avatar.jpg" alt="Profile photo of Ana Souza" />
<img src="/img/chart.png" alt="Monthly sales chart showing 20% growth in Q1" />
<img src="/img/logo.svg" alt="Acme Corp" />

<!-- decorativo: alt vazio, role presentation -->
<img src="/img/divider.png" alt="" role="presentation" />
```

</details>

<a id="button-vs-link"></a>

## `<button>` executa, `<a>` leva a outro endereço

Se o clique dispara uma ação na própria página, use `<button>`. Se o clique leva o usuário a outro endereço, use `<a href>`. A escolha muda o comportamento que o navegador entrega de graça.

Um `<div onclick>` parece funcionar e deixa três coisas para trás: o `Tab` não chega até ele, o `Enter` e o espaço não o acionam, e o leitor de tela anuncia um bloco de texto qualquer, sem dizer que ali existe algo clicável. Um `<a href="#">` que na verdade envia um formulário engana de outro jeito: o leitor de tela anuncia "link", e o usuário espera sair da página.

<details>
<summary>❌ Ruim: div e span com onclick, e um link que envia formulário</summary>

```html
<div class="btn" onclick="openModal()">Open</div>
<span onclick="deleteItem()">Delete</span>

<a href="#" onclick="submitForm()">Submit</a>
```

</details>

<details>
<summary>✅ Bom: button para as ações, e link para ir ao painel</summary>

```html
<button type="button" onclick="openModal()">Open</button>
<button type="button" onclick="deleteItem()">Delete</button>

<button type="submit">Submit</button>
<a href="/dashboard">Go to dashboard</a>
```

</details>

## A ordem do `Tab` é a ordem da marcação

Quem navega por teclado percorre a página na ordem em que os elementos aparecem no arquivo. É a ordem que você já controla ao escrever a marcação, e ela costuma ser a certa.

O `tabindex` tem três formas, e duas delas resolvem casos reais:

- `tabindex="0"` põe no fluxo do `Tab` um elemento que não entraria sozinho, como um `<div>` que virou controle customizado.
- `tabindex="-1"` tira o elemento do `Tab` e ainda permite que o JavaScript mande o foco para lá, o que serve para levar o foco ao topo de um modal recém-aberto.
- `tabindex` com número positivo empurra o elemento para a frente na fila e desmonta a ordem para todos os outros. Um `tabindex="3"` no campo de e-mail faz o `Tab` saltar até ele antes do campo de nome, e a partir daí a sequência deixa de acompanhar o que está na tela.

<details>
<summary>❌ Ruim: o tabindex positivo inverte a ordem, e o toggle não recebe foco</summary>

```html
<input tabindex="3" name="email" />
<input tabindex="1" name="name" />
<div class="custom-toggle" onclick="toggle()">Toggle</div>
```

</details>

<details>
<summary>✅ Bom: a ordem da marcação vale, e o toggle declara papel, foco e teclado</summary>

```html
<input name="name" />
<input name="email" />
<div
  class="custom-toggle"
  role="switch"
  tabindex="0"
  aria-checked="false"
  onkeydown="handleKey(event)"
  onclick="toggle()"
>Toggle</div>
```

</details>

## ARIA entra onde não existe elemento nativo

Sempre que o HTML tem um elemento para o caso, use ele. Um `<button>` já se anuncia como botão, e escrever `role="button"` nele repete o que o navegador já sabe.

ARIA serve para o componente que o HTML não tem, como um conjunto de abas. Ali você precisa declarar à mão o papel de cada peça (`tablist`, `tab`, `tabpanel`) e o estado de cada uma (`aria-selected`), porque nenhum elemento nativo faz isso.

Vale ter cuidado, porque um ARIA errado atrapalha mais do que ARIA nenhum. Um `role` trocado faz o leitor de tela anunciar o elemento como uma coisa que ele não é, e o usuário passa a agir sobre uma promessa falsa.

<details>
<summary>❌ Ruim: ARIA repetindo o que o elemento nativo já declara</summary>

```html
<button role="button" aria-pressed="false">Submit</button>
<nav role="navigation">...</nav>
<h1 role="heading" aria-level="1">Title</h1>
```

</details>

<details>
<summary>✅ Bom: os nativos ficam limpos, e o ARIA aparece só nas abas customizadas</summary>

```html
<button type="button">Submit</button>
<nav>...</nav>
<h1>Title</h1>

<!-- ARIA justificado: componente customizado sem equivalente nativo -->
<div role="tablist">
  <button id="tab-1" role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button id="tab-2" role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>

<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">...</div>
<div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>...</div>
```

</details>

## `aria-labelledby` aponta para o texto que já está na tela

Quando a região já tem um título visível, use `aria-labelledby` apontando para o id dele. O nome anunciado passa a ser o próprio título, e os dois nunca saem de sincronia.

Um `aria-label` copiando esse mesmo texto cria uma segunda cópia dele, escondida na marcação. Alguém edita o `<h2>` na sprint seguinte, e o leitor de tela continua anunciando o texto antigo.

Reserve `aria-label` para o caso em que não existe texto visível nenhum, como o botão de fechar que só mostra um ícone.

<details>
<summary>❌ Ruim: o aria-label repete o título que já está visível</summary>

```html
<section aria-label="Featured Products">
  <h2>Featured Products</h2>
  ...
</section>

<button aria-label="Close" class="modal__close">✕</button>
```

</details>

<details>
<summary>✅ Bom: a seção aponta para o próprio título, e o botão de ícone ganha aria-label</summary>

```html
<section aria-labelledby="featured-heading">
  <h2 id="featured-heading">Featured Products</h2>
  ...
</section>

<button class="modal__close" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>
```

</details>
