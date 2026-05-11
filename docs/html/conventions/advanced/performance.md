# Performance

> Escopo: HTML. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

**HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) controla como o browser carrega e prioriza recursos. Scripts bloqueiam o parse por padrão; imagens fora da **viewport** (área visível) consomem banda desnecessária; recursos críticos chegam tarde sem **preload** (pré-carregamento) explícito.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **critical render path** (caminho crítico de renderização) | Sequência mínima que o browser executa pra pintar a primeira tela |
| **defer** (adiar execução) | Atributo que baixa o script em paralelo e executa após o parse, na ordem do documento |
| **async** (assíncrono) | Atributo que baixa em paralelo e executa imediatamente, sem garantia de ordem |
| **lazy loading** (carregamento preguiçoso) | `loading="lazy"` em `<img>`/`<iframe>`: só baixa quando próximo da viewport |
| **preload** (pré-carregamento) | `<link rel="preload">` antecipa um recurso crítico identificado tarde no parse |
| **preconnect** (pré-conexão) | `<link rel="preconnect">` abre conexão TCP/TLS com origem externa antes do uso |
| **picture** (imagem responsiva) | `<picture>` com `<source>` serve a imagem certa por viewport ou formato |

## defer e async

Scripts sem atributo bloqueiam o parse HTML enquanto baixam e executam. `defer` baixa em paralelo e
executa após o parse, na ordem do documento: ficam no `<head>`, sem necessidade de mover para o
fim do `<body>`. `async` baixa em paralelo e executa imediatamente, sem garantia de ordem.

<details>
<summary>❌ Ruim — script no head sem defer, bloqueia o parse</summary>

```html
<head>
  <script src="/js/app.js"></script>
  <script src="/js/analytics.js"></script>
</head>
```

</details>

<details>
<summary>✅ Bom — defer para scripts dependentes de DOM; async para scripts independentes</summary>

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

| Atributo | Baixa em paralelo | Executa após parse | Ordem garantida |
| -------- | :---------------: | :----------------: | :-------------: |
| nenhum   | ❌                | ❌                | ✅              |
| `async`  | ✅                | ❌                | ❌              |
| `defer`  | ✅                | ✅                | ✅              |

## Lazy loading

Imagens e iframes abaixo da dobra (`loading="lazy"`) só são carregados quando o usuário se
aproxima da área visível, reduzindo o carregamento inicial sem JavaScript.

<details>
<summary>❌ Ruim — todas as imagens carregam imediatamente</summary>

```html
<img src="/img/hero.jpg" alt="Hero banner" />
<img src="/img/product-1.jpg" alt="Product 1" />
<img src="/img/product-2.jpg" alt="Product 2" />
<img src="/img/product-3.jpg" alt="Product 3" />
```

</details>

<details>
<summary>✅ Bom — hero sem lazy (above the fold), demais com lazy</summary>

```html
<img src="/img/hero.jpg" alt="Hero banner" fetchpriority="high" />

<img src="/img/product-1.jpg" alt="Product 1" loading="lazy" />
<img src="/img/product-2.jpg" alt="Product 2" loading="lazy" />
<img src="/img/product-3.jpg" alt="Product 3" loading="lazy" />
```

O hero tem papel distinto (above the fold, prioridade alta) — fase isolada. Os três produtos com `loading="lazy"` formam trio homogêneo e ficam tight.

</details>

## preload e preconnect

`<link rel="preload">` instrui o browser a baixar um recurso crítico antes de descobri-lo no CSS
ou JS. `<link rel="preconnect">` abre a conexão TCP/TLS com origens externas antecipadamente.

<details>
<summary>❌ Ruim — fonte crítica descoberta tarde, origem externa sem preconnect</summary>

```html
<head>
  <link rel="stylesheet" href="/css/app.css" />
  <!-- browser só descobre a fonte ao processar o CSS -->
</head>
```

</details>

<details>
<summary>✅ Bom — preconnect abre conexão, preload antecipa recursos críticos</summary>

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

## width e height em imagens

Declarar `width` e `height` em imagens previne layout shift (CLS). O browser reserva o espaço
antes de baixar a imagem. Com CSS `height: auto`, a proporção é mantida.

<details>
<summary>❌ Ruim — sem dimensões, layout shift ao carregar</summary>

```html
<img src="/img/product.jpg" alt="Product photo" loading="lazy" />
```

</details>

<details>
<summary>✅ Bom — dimensões declaradas, CSS mantém proporção</summary>

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
