# Performance

> Escopo: HTML. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

**HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) controla como o browser carrega e prioriza recursos. Scripts bloqueiam o parse por padrão;
imagens fora da viewport consomem banda desnecessária; recursos críticos chegam tarde sem dica
explícita.

## defer e async

Scripts sem atributo bloqueiam o parse HTML enquanto baixam e executam. `defer` baixa em paralelo e
executa após o parse, na ordem do documento: ficam no `<head>`, sem necessidade de mover para o
fim do `<body>`. `async` baixa em paralelo e executa imediatamente, sem garantia de ordem.

<details>
<summary>❌ Bad — script no head sem defer, bloqueia o parse</summary>
<br>

```html
<head>
  <script src="/js/app.js"></script>
  <script src="/js/analytics.js"></script>
</head>
```

</details>

<br>

<details>
<summary>✅ Good — defer para scripts dependentes de DOM; async para scripts independentes</summary>
<br>

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
<summary>❌ Bad — todas as imagens carregam imediatamente</summary>
<br>

```html
<img src="/img/hero.jpg" alt="Hero banner" />
<img src="/img/product-1.jpg" alt="Product 1" />
<img src="/img/product-2.jpg" alt="Product 2" />
<img src="/img/product-3.jpg" alt="Product 3" />
```

</details>

<br>

<details>
<summary>✅ Good — hero sem lazy (above the fold), demais com lazy</summary>
<br>

```html
<img src="/img/hero.jpg" alt="Hero banner" fetchpriority="high" />
<img src="/img/product-1.jpg" alt="Product 1" loading="lazy" />
<img src="/img/product-2.jpg" alt="Product 2" loading="lazy" />
<img src="/img/product-3.jpg" alt="Product 3" loading="lazy" />
```

</details>

## preload e preconnect

`<link rel="preload">` instrui o browser a baixar um recurso crítico antes de descobri-lo no CSS
ou JS. `<link rel="preconnect">` abre a conexão TCP/TLS com origens externas antecipadamente.

<details>
<summary>❌ Bad — fonte crítica descoberta tarde, origem externa sem preconnect</summary>
<br>

```html
<head>
  <link rel="stylesheet" href="/css/app.css" />
  <!-- browser só descobre a fonte ao processar o CSS -->
</head>
```

</details>

<br>

<details>
<summary>✅ Good — preconnect abre conexão, preload antecipa recursos críticos</summary>
<br>

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
<summary>❌ Bad — sem dimensões, layout shift ao carregar</summary>
<br>

```html
<img src="/img/product.jpg" alt="Product photo" loading="lazy" />
```

</details>

<br>

<details>
<summary>✅ Good — dimensões declaradas, CSS mantém proporção</summary>
<br>

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
