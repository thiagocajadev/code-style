# SEO

> Escopo: HTML. Idiomas específicos deste ecossistema.

**SEO** (Search Engine Optimization, Otimização para Mecanismos de Busca) técnico em **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) começa no `<head>`. Title, description e canonical são os três mais impactantes. **Open Graph** (protocolo de metadados sociais) controla a aparência em redes sociais. **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript)-LD comunica estrutura a crawlers.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SEO** (Search Engine Optimization, Otimização para Mecanismos de Busca) | Conjunto de práticas para melhorar visibilidade em buscadores |
| **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) | Marcação estrutural interpretada por crawlers e navegadores |
| **Open Graph** (protocolo de metadados sociais) | Padrão do Facebook para controlar como a página aparece em redes sociais |
| **JSON-LD** (JavaScript Object Notation for Linked Data, Notação de Objetos JavaScript para Dados Ligados) | Formato de dados estruturados embutido em `<script>` para crawlers |
| **URL** (Uniform Resource Locator, Localizador Uniforme de Recurso) | Endereço canônico da página; `rel="canonical"` evita conteúdo duplicado |

## title e description

`<title>` único por página, entre 50–60 caracteres. `<meta name="description">` único, entre
150–160 caracteres. Não melhora ranking, mas controla o snippet nos resultados.

<details>
<summary>❌ Bad — title genérico, description ausente ou duplicada</summary>
<br>

```html
<head>
  <title>My Site</title>
</head>
```

```html
<!-- mesma description em todas as páginas -->
<head>
  <title>Product — My Site</title>
  <meta name="description" content="Welcome to My Site." />
</head>
```

</details>

<br>

<details>
<summary>✅ Good — title e description únicos, concisos e descritivos</summary>
<br>

```html
<head>
  <title>Running Shoes for Men — Acme Store</title>
  <meta
    name="description"
    content="Shop lightweight running shoes for men. Free shipping on orders over $50."
  />
</head>
```

</details>

## Open Graph

Tags **Open Graph** (protocolo de metadados sociais) controlam título, descrição e imagem ao compartilhar em redes sociais. Sem elas,
a plataforma escolhe, geralmente mal.

<details>
<summary>❌ Bad — sem **Open Graph** (protocolo de metadados sociais), aparência ao compartilhar indefinida</summary>
<br>

```html
<head>
  <title>Running Shoes for Men — Acme Store</title>
</head>
```

</details>

<br>

<details>
<summary>✅ Good — **Open Graph** (protocolo de metadados sociais) completo com imagem 1200×630</summary>
<br>

```html
<head>
  <title>Running Shoes for Men — Acme Store</title>

  <meta property="og:type" content="product" />
  <meta property="og:title" content="Running Shoes for Men" />
  <meta property="og:description" content="Lightweight running shoes. Free shipping over $50." />
  <meta property="og:image" content="https://acme.com/img/og/running-shoes.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="https://acme.com/shoes/running-mens" />
  <meta property="og:site_name" content="Acme Store" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Running Shoes for Men" />
  <meta name="twitter:description" content="Lightweight running shoes. Free shipping over $50." />
  <meta name="twitter:image" content="https://acme.com/img/og/running-shoes.jpg" />
</head>
```

</details>

## Canonical URL

`<link rel="canonical">` resolve conteúdo duplicado e indica a URL preferencial quando o mesmo
conteúdo aparece em múltiplos endereços (com/sem `www`, com parâmetros de rastreamento, paginação).

<details>
<summary>❌ Bad — sem canonical em página com parâmetros UTM</summary>
<br>

```html
<!-- URL: /products?utm_source=email&utm_campaign=spring -->
<head>
  <title>Products — Acme Store</title>
</head>
```

</details>

<br>

<details>
<summary>✅ Good — canonical aponta para URL limpa</summary>
<br>

```html
<head>
  <title>Products — Acme Store</title>
  <link rel="canonical" href="https://acme.com/products" />
</head>
```

</details>

## JSON-LD

JSON-LD comunica dados estruturados a crawlers (Google, Bing) sem alterar o HTML visível. Produtos,
artigos, FAQs e breadcrumbs ganham rich snippets nos resultados.

<details>
<summary>❌ Bad — dados estruturados ausentes, sem rich snippet</summary>
<br>

```html
<body>
  <h1>Running Shoes</h1>
  <p>$89.99</p>
  <p>★★★★☆ (142 reviews)</p>
</body>
```

</details>

<br>

<details>
<summary>✅ Good — JSON-LD com schema Product, preço e avaliação</summary>
<br>

```html
<body>
  <h1>Running Shoes</h1>
  <p>$89.99</p>
  <p>★★★★☆ (142 reviews)</p>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Running Shoes for Men",
    "image": "https://acme.com/img/running-shoes.jpg",
    "description": "Lightweight running shoes for men.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": "89.99",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.2",
      "reviewCount": "142"
    }
  }
  </script>
</body>
```

</details>

## robots e indexação

`<meta name="robots">` controla indexação e seguimento de links por página, útil para pages de
admin, resultados de busca interna ou conteúdo duplicado temporário.

```html
<!-- padrão: indexar e seguir links -->
<meta name="robots" content="index, follow" />

<!-- não indexar, seguir links (ex: página de busca interna) -->
<meta name="robots" content="noindex, follow" />

<!-- não indexar, não seguir (ex: área administrativa) -->
<meta name="robots" content="noindex, nofollow" />
```
