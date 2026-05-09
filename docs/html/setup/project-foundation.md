# Project Foundation: HTML

Template base para novos projetos **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto). A ordem do `<head>` afeta performance: charset e viewport
primeiro, recursos críticos antes do CSS, scripts com `defer`.

## Template base

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <!-- 1. Charset e viewport: antes de qualquer outro recurso -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- 2. SEO -->
    <title>Page Title — Site Name</title>
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

## Ordem do `<head>`

| Posição | Elemento                           | Motivo                                         |
| ------- | ---------------------------------- | ---------------------------------------------- |
| 1       | `charset`, `viewport`              | Afetam parse e layout; obrigatoriamente primeiro  |
| 2       | `title`, `description`, `canonical`| SEO: descobertos antes dos recursos             |
| 3       | Open Graph                         | Compartilhamento social                         |
| 4       | `preconnect`                       | Abre conexão TCP antes do CSS referenciar       |
| 5       | `preload`                          | Antecipa recursos críticos (fontes, hero image) |
| 6       | CSS                                | Render-blocking: antes do body                  |
| 7       | Favicon, manifesto                 | Baixa prioridade, não bloqueia                  |
| 8       | Scripts `async`                    | Independentes, não bloqueiam                    |
| 9       | Scripts `defer`                    | `defer` garante execução pós-parse; ficam no `<head>`     |

## Skip link

Permite usuários de teclado pular direto para o conteúdo principal, obrigatório em qualquer site
com navegação global.

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
