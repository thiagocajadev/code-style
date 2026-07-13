# Performance em HTML

> Escopo: HTML. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

É a marcação que decide o que o navegador baixa primeiro e o que ele deixa para depois. Antes de otimizar qualquer coisa em JavaScript, vale acertar quatro atributos no `<head>` e nas imagens.

Sem eles, três coisas acontecem por padrão, e todas atrasam a primeira tela. O script para a leitura do documento enquanto baixa. As imagens do rodapé baixam junto com as do topo, disputando a mesma banda. E a fonte que o CSS pede só começa a ser buscada depois que o CSS inteiro chegou.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **critical render path** (caminho crítico de renderização) | O mínimo que o navegador precisa baixar e processar para desenhar a primeira tela |
| **viewport** (área visível) | O pedaço da página que cabe na tela sem rolagem |
| **defer** (adiar execução) | Atributo que baixa o script em paralelo e o executa depois da leitura do documento, na ordem em que os scripts aparecem |
| **async** (assíncrono) | Atributo que baixa em paralelo e executa assim que o download termina, em ordem imprevisível |
| **lazy loading** (carregamento tardio) | `loading="lazy"` em `<img>` e `<iframe>`. O download só começa quando o usuário chega perto do elemento |
| **preload** (pré-carregamento) | `<link rel="preload">`, que antecipa um recurso que o navegador só descobriria mais tarde |
| **preconnect** (pré-conexão) | `<link rel="preconnect">`, que abre a conexão com um domínio externo antes do primeiro pedido |
| **layout shift** (deslocamento de layout) | O conteúdo pula na tela quando uma imagem termina de carregar e empurra o que estava embaixo |

<a id="defer-and-async"></a>

## `defer` no script que precisa da página, `async` no que não precisa

Um `<script>` sem atributo nenhum para tudo. O navegador estava lendo o documento, encontra a tag, e fica parado até baixar e executar o arquivo inteiro. Enquanto isso, nada do que vem abaixo aparece na tela.

Os dois atributos resolvem isso de formas diferentes:

- `defer` baixa o script em paralelo e o executa só depois que o documento inteiro foi lido, respeitando a ordem em que os scripts aparecem. É o que você quer no script que manipula a página e no que depende de outro ter rodado antes.
- `async` baixa em paralelo e executa assim que o download termina, sem esperar nada. Quem chega primeiro roda primeiro, e a ordem muda a cada carregamento. Serve para o script que não mexe na página nem depende de ninguém, como o de analytics.

Com `defer`, o script pode ficar no `<head>`, e não há mais motivo para empurrar a tag para o fim do `<body>`.

<details>
<summary>❌ Ruim: dois scripts no head sem atributo, e a página para de carregar em cada um</summary>

```html
<head>
  <script src="/js/app.js"></script>
  <script src="/js/analytics.js"></script>
</head>
```

</details>

<details>
<summary>✅ Bom: defer nos scripts que mexem na página, async no analytics</summary>

```html
<head>
  <!-- async: independente, sem acesso ao DOM, sem ordem necessária -->
  <script src="/js/analytics.js" async></script>

  <!-- defer: precisa do DOM, ordem importa -->
  <script src="/js/vendor.js" defer></script>
  <script src="/js/app.js" defer></script>
</head>
```

</details>

| Atributo | Baixa em paralelo | Espera a leitura do documento | Mantém a ordem |
| -------- | :---------------: | :----------------: | :-------------: |
| nenhum   | ❌                | ❌                | ✅              |
| `async`  | ✅                | ❌                | ❌              |
| `defer`  | ✅                | ✅                | ✅              |

<a id="lazy-loading"></a>

## A imagem abaixo da dobra espera o usuário chegar perto

Um `loading="lazy"` na imagem faz o navegador adiar o download dela até o usuário rolar a página até perto dali. Numa vitrine com trinta produtos, isso corta quase toda a banda do primeiro carregamento, e não custa uma linha de JavaScript.

A imagem do topo fica de fora dessa regra. Ela precisa aparecer o quanto antes, então continua sem `lazy` e ainda ganha `fetchpriority="high"`, que pede ao navegador para buscá-la na frente das outras.

<details>
<summary>❌ Ruim: as quatro imagens disputam banda no primeiro carregamento</summary>

```html
<img src="/img/hero.jpg" alt="Hero banner" />
<img src="/img/product-1.jpg" alt="Product 1" />
<img src="/img/product-2.jpg" alt="Product 2" />
<img src="/img/product-3.jpg" alt="Product 3" />
```

</details>

<details>
<summary>✅ Bom: a imagem do topo vem com prioridade, e as de baixo esperam a rolagem</summary>

```html
<img src="/img/hero.jpg" alt="Hero banner" fetchpriority="high" />

<img src="/img/product-1.jpg" alt="Product 1" loading="lazy" />
<img src="/img/product-2.jpg" alt="Product 2" loading="lazy" />
<img src="/img/product-3.jpg" alt="Product 3" loading="lazy" />
```

A imagem do topo cumpre um papel próprio e fica sozinha no primeiro grupo. As três de produto se repetem e ficam juntas.

</details>

## `preconnect` abre a conexão, `preload` antecipa o download

O navegador só descobre a fonte quando termina de processar o CSS, porque é lá dentro que o `@font-face` está escrito. Até esse momento, ele nem sabe que o arquivo existe, e a fonte chega tarde: o texto aparece com a fonte de sistema e depois troca na cara do usuário.

Os dois atributos atacam esse atraso em pontos diferentes. O `preload` diz ao navegador para começar o download agora, sem esperar a descoberta. O `preconnect` cuida do custo de falar com um domínio novo (a resolução do DNS, o aperto de mão do TLS), que pode passar de cem milissegundos, e faz isso antes do primeiro pedido chegar.

<details>
<summary>❌ Ruim: a fonte só aparece quando o CSS termina de ser processado</summary>

```html
<head>
  <link rel="stylesheet" href="/css/app.css" />
  <!-- browser só descobre a fonte ao processar o CSS -->
</head>
```

</details>

<details>
<summary>✅ Bom: a conexão externa abre cedo, e a fonte começa a baixar antes do CSS</summary>

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- abre conexão com origem externa antes de precisar -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- antecipa recurso crítico descoberto dentro do CSS -->
  <link rel="preload" as="font" href="/fonts/inter-var.woff2" type="font/woff2" crossorigin />
  <link rel="preload" as="image" href="/img/hero.webp" />

  <link rel="stylesheet" href="/css/app.css" />
</head>
```

</details>

## Declare `width` e `height` para o conteúdo não pular na tela

Uma imagem sem dimensões declaradas ocupa zero pixel de altura até terminar de baixar. Quando ela chega, empurra para baixo tudo o que estava embaixo dela. Se o usuário já tinha começado a ler, o texto foge; se ele ia clicar num botão, o botão sai do lugar debaixo do dedo.

Com `width` e `height` na tag, o navegador calcula a proporção e reserva o espaço certo antes de o arquivo chegar. Os números são a proporção, e não o tamanho na tela: o CSS com `max-width: 100%` e `height: auto` continua responsável por quanto a imagem mede em cada dispositivo.

<details>
<summary>❌ Ruim: sem dimensões, o conteúdo abaixo pula quando a imagem chega</summary>

```html
<img src="/img/product.jpg" alt="Product photo" loading="lazy" />
```

</details>

<details>
<summary>✅ Bom: dimensões na tag reservam o espaço, e o CSS cuida do tamanho na tela</summary>

```html
<img
  src="/img/product.jpg"
  alt="Product photo"
  width="400"
  height="300"
  loading="lazy"
/>
```

```css
img {
  max-width: 100%;
  height: auto;
}
```

</details>
