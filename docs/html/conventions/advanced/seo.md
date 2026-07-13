# SEO em HTML

> Escopo: HTML. Idiomas específicos deste ecossistema.

**SEO** (Search Engine Optimization · Otimização para Mecanismos de Busca) técnico começa dentro do `<head>`, e é onde a marcação fala com quem nunca vê a página renderizada: o robô do buscador e o servidor da rede social que monta a prévia de um link compartilhado.

Três tags carregam quase todo o resultado: o `<title>`, a descrição e a `canonical`. As demais desta página resolvem casos específicos, como a prévia no WhatsApp ou a estrelinha de avaliação no resultado do Google.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SEO** (Search Engine Optimization · Otimização para Mecanismos de Busca) | O conjunto de práticas que ajuda a página a ser encontrada no buscador |
| **crawler** (robô de indexação) | Programa do buscador que percorre a página, lê a marcação e decide como listá-la |
| **snippet** (trecho do resultado) | O bloco que o buscador mostra na lista de resultados: título, endereço e descrição |
| **Open Graph** (protocolo de metadados sociais) | Padrão que define como a página aparece quando alguém compartilha o link numa rede social |
| **JSON-LD** (JavaScript Object Notation for Linked Data · Notação de Objetos JavaScript para Dados Ligados) | Bloco de dados dentro de um `<script>`, que descreve o conteúdo em termos que o robô entende |
| **canonical URL** (endereço canônico) | O endereço oficial de uma página, quando o mesmo conteúdo responde em vários endereços |

<a id="title-and-description"></a>

## Cada página tem o próprio `<title>` e a própria descrição

O `<title>` é o que vira o link azul do resultado da busca, e a `<meta name="description">` é o texto cinza embaixo dele. Escreva os dois pensando em quem está lendo a lista de resultados e decidindo em qual clicar.

O `<title>` cabe em 50 a 60 caracteres antes de o buscador cortar, e a descrição em 150 a 160. Vale escrever os dois específicos por página. Repetir "My Site" em todas desperdiça o espaço que decide o clique.

A descrição não muda a posição da página no ranking. Ela decide se a pessoa clica no seu resultado ou no de baixo.

<details>
<summary>❌ Ruim: um título genérico, e a mesma descrição em todas as páginas</summary>

```html
<head>
  <title>My Site</title>
</head>
```

```html
<!-- mesma description em todas as páginas -->
<head>
  <title>Product: My Site</title>
  <meta name="description" content="Welcome to My Site." />
</head>
```

</details>

<details>
<summary>✅ Bom: o título diz o que a página vende, e a descrição dá o motivo do clique</summary>

```html
<head>
  <title>Running Shoes for Men: Acme Store</title>
  <meta
    name="description"
    content="Shop lightweight running shoes for men. Free shipping on orders over $50."
  />
</head>
```

</details>

## Open Graph decide a aparência do link compartilhado

Quando alguém cola o link da sua página no WhatsApp, no Slack ou no LinkedIn, a plataforma busca a página e monta um cartão com título, descrição e imagem. As tags de **Open Graph** (protocolo de metadados sociais) são de onde ela tira esses três campos.

Sem elas, a plataforma escolhe sozinha. Costuma pegar a primeira imagem que encontrar no arquivo, que muitas vezes é o logo ou um ícone de interface, e o cartão sai com a marca da empresa no lugar da foto do produto.

A imagem de compartilhamento pede 1200 por 630 pixels. Fora dessa proporção, o corte acontece na plataforma, e ninguém controla onde.

<details>
<summary>❌ Ruim: nenhuma tag social, e a plataforma escolhe a imagem que quiser</summary>

```html
<head>
  <title>Running Shoes for Men: Acme Store</title>
</head>
```

</details>

<details>
<summary>✅ Bom: título, descrição e imagem declarados para o cartão do link</summary>

```html
<head>
  <title>Running Shoes for Men: Acme Store</title>

  <!-- Open Graph: identidade -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="Running Shoes for Men" />
  <meta property="og:description" content="Lightweight running shoes. Free shipping over $50." />

  <!-- Open Graph: imagem -->
  <meta property="og:image" content="https://acme.com/img/og/running-shoes.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Open Graph: contexto -->
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

## A `canonical` aponta qual endereço é o oficial

O mesmo conteúdo costuma responder em vários endereços: com e sem `www`, com os parâmetros de campanha que o time de marketing cola no link, na página 2 da paginação. Para o buscador, cada endereço desses é uma página diferente, e ele acaba dividindo a relevância entre elas, ou escolhendo por conta própria qual indexar.

A `<link rel="canonical">` encerra a dúvida: ela declara qual é o endereço oficial, e o buscador concentra ali tudo o que as variações acumularam.

<details>
<summary>❌ Ruim: a página com parâmetros de campanha é indexada como se fosse outra</summary>

```html
<!-- URL: /products?utm_source=email&utm_campaign=spring -->
<head>
  <title>Products: Acme Store</title>
</head>
```

</details>

<details>
<summary>✅ Bom: a canonical aponta para o endereço limpo</summary>

```html
<head>
  <title>Products: Acme Store</title>
  <link rel="canonical" href="https://acme.com/products" />
</head>
```

</details>

## JSON-LD descreve o conteúdo em termos que o robô entende

Um humano olha `<p>$89.99</p>` e sabe que aquilo é o preço. O robô vê um parágrafo com um texto dentro. O bloco de **JSON-LD** (JavaScript Object Notation for Linked Data · Notação de Objetos JavaScript para Dados Ligados) traduz a página para o vocabulário do buscador: aqui está um produto, este é o preço, esta é a nota média, este é o número de avaliações.

Com esses dados declarados, o resultado da busca deixa de ser só título e descrição, e passa a mostrar preço, disponibilidade e as estrelas de avaliação. O bloco entra num `<script>` e não muda nada do que aparece na tela.

<details>
<summary>❌ Ruim: o preço e a nota estão na tela, e o robô não sabe o que eles são</summary>

```html
<body>
  <h1>Running Shoes</h1>
  <p>$89.99</p>
  <p>★★★★☆ (142 reviews)</p>
</body>
```

</details>

<details>
<summary>✅ Bom: o bloco nomeia produto, preço, disponibilidade e avaliação</summary>

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

## `robots` diz o que fica fora do índice

A `<meta name="robots">` controla duas coisas em separado: se a página entra no índice do buscador, e se o robô segue os links que ela contém.

Serve para a área administrativa, que não deveria aparecer em busca nenhuma, e para a página de resultado da busca interna, que gera endereços infinitos e não tem valor no índice, embora os links dela levem a produtos que valem a pena rastrear.

```html
<!-- padrão: indexar e seguir links -->
<meta name="robots" content="index, follow" />

<!-- não indexar, seguir links (ex: página de busca interna) -->
<meta name="robots" content="noindex, follow" />

<!-- não indexar, não seguir (ex: área administrativa) -->
<meta name="robots" content="noindex, nofollow" />
```
