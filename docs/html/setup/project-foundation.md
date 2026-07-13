# Base de um projeto HTML

O template desta página é o ponto de partida de um projeto novo, e a ordem em que as tags do `<head>` aparecem faz parte dele.

Essa ordem não é estética. O navegador lê o arquivo de cima para baixo e age conforme lê, então uma tag colocada tarde chega tarde. A codificação declarada depois do título faz o navegador reler o que já tinha lido. O `preconnect` colocado depois do CSS abre a conexão quando o pedido já saiu.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **doctype** (declaração de tipo de documento) | `<!DOCTYPE html>`, na primeira linha. Faz o navegador interpretar a página pelo padrão atual |
| **lang attribute** (atributo de idioma) | `<html lang="pt-BR">`, que dá o idioma ao leitor de tela e ao tradutor automático |
| **charset** (codificação de caracteres) | `<meta charset="UTF-8">`, declarado antes de qualquer texto para o navegador não precisar reler o arquivo |
| **viewport** (área visível) | `<meta name="viewport">`, que define a largura e a escala iniciais no celular |
| **head order** (ordem do head) | Codificação → SEO → conexões externas → CSS → scripts. A ordem muda quando cada recurso começa a baixar |
| **favicon** (ícone do site) | `<link rel="icon">`, o ícone que aparece na aba do navegador e nos favoritos |
| **canonical** (endereço canônico) | `<link rel="canonical">`, que diz ao buscador qual endereço é o oficial da página |

## Template base

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <!-- 1. Charset e viewport: antes de qualquer outro recurso -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- 2. SEO -->
    <title>Page Title: Site Name</title>
    <meta name="description" content="Page description, 150–160 characters." />
    <link rel="canonical" href="https://example.com/page" />

    <!-- 3. Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Page Title" />
    <meta property="og:description" content="Page description." />
    <meta property="og:image" content="https://example.com/img/og.jpg" />
    <meta property="og:url" content="https://example.com/page" />

    <!-- 4. Preconnect a origens externas (antes do CSS que as referencia) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- 5. Preload de recursos críticos -->
    <link rel="preload" as="font" href="/fonts/inter-var.woff2" type="font/woff2" crossorigin />

    <!-- 6. CSS -->
    <link rel="stylesheet" href="/css/app.css" />

    <!-- 7. Favicon e manifesto -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />

    <!-- 8. Scripts assíncronos (analytics, etc) -->
    <script src="/js/analytics.js" async></script>

    <!-- 9. Scripts com defer: executam após o parse, ordem garantida -->
    <script src="/js/vendor.js" defer></script>
    <script src="/js/app.js" defer></script>
  </head>

  <body>
    <header>
      <a href="/" class="brand">Site Name</a>
      <nav aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>

    <main id="main-content">
      <!-- conteúdo da página -->
    </main>

    <footer>
      <p>© 2026 Site Name</p>
    </footer>
  </body>
</html>
```

## Por que o `<head>` segue essa ordem

| Posição | Elemento                           | Motivo                                                              |
| ------- | ---------------------------------- | ------------------------------------------------------------------- |
| 1       | `charset`, `viewport`              | Decidem como o arquivo é decodificado e como a página mede a tela. Depois deles, tarde demais |
| 2       | `title`, `description`, `canonical`| O robô do buscador encontra os três logo no começo do arquivo        |
| 3       | Open Graph                         | Monta o cartão que aparece quando alguém compartilha o link          |
| 4       | `preconnect`                       | Abre a conexão com o domínio externo antes de o CSS pedir a fonte    |
| 5       | `preload`                          | Começa a baixar a fonte e a imagem do topo sem esperar a descoberta   |
| 6       | CSS                                | O navegador segura a primeira pintura até o CSS chegar               |
| 7       | Favicon e manifesto                | Baixam quando sobrar banda, e não seguram nada                       |
| 8       | Scripts `async`                    | Rodam quando terminarem de baixar, em qualquer ordem                 |
| 9       | Scripts `defer`                    | Esperam a leitura do documento e rodam na ordem em que aparecem      |

## O skip link deixa o teclado pular o menu

Quem navega por teclado começa pelo primeiro elemento do arquivo, que costuma ser o menu. Em um site com trinta links de navegação, chegar ao conteúdo custa trinta toques em `Tab`, e o custo se repete em cada página visitada.

O skip link é um `<a>` que aponta para o `<main>` e fica escondido fora da tela até receber foco. No primeiro `Tab`, ele aparece, e o `Enter` leva direto ao conteúdo.

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>...</header>
  <main id="main-content">...</main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
}

.skip-link:focus {
  top: 0;
}
```
