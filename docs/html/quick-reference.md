# Quick reference: HTML

> Escopo: HTML. Cheat-sheet das convenções; detalhes em `conventions/`.

## Elementos semânticos

| Elemento      | Uso                                                      |
| ------------- | -------------------------------------------------------- |
| `<header>`    | Cabeçalho da página ou de uma `<section>`/`<article>`    |
| `<nav>`       | Grupo de links de navegação principal ou secundária      |
| `<main>`      | Conteúdo principal, único por página                     |
| `<section>`   | Grupo temático com heading próprio                       |
| `<article>`   | Conteúdo autossuficiente (post, card de produto, review) |
| `<aside>`     | Conteúdo tangencial ao principal (sidebar, callout)      |
| `<footer>`    | Rodapé da página ou de uma seção                         |
| `<figure>`    | Imagem, diagrama ou código com legenda                   |
| `<figcaption>`| Legenda de `<figure>`                                    |
| `<time>`      | Data ou hora com atributo `datetime` legível por máquina |
| `<address>`   | Informações de contato do autor ou organização           |
| `<mark>`      | Texto destacado/realçado em contexto de busca            |

## Ordem de atributos

```
id → class → name → type → src | href → value → placeholder → for
→ disabled | required | readonly → loading → data-* → aria-* → role
```

## Checklist de acessibilidade

- [ ] `<html lang="...">` definido
- [ ] `<title>` único por página
- [ ] Hierarquia de headings sem saltos (`h1` → `h2` → `h3`)
- [ ] Toda `<img>` com `alt` (vazio se decorativa)
- [ ] Toda `<svg>` interativa com `aria-label` ou `<title>` interno
- [ ] Todo `<input>` com `<label>` via `for`/`id`
- [ ] Grupos de radio/checkbox dentro de `<fieldset>` + `<legend>`
- [ ] `<button>` para ações, `<a href>` para navegação
- [ ] Skip link antes do `<header>`
- [ ] Foco visível em todos os elementos interativos

## Checklist de performance

- [ ] `<meta charset>` e `<meta name="viewport">` primeiros no `<head>`
- [ ] Scripts com `defer` (ou no fim do `<body>`)
- [ ] Scripts independentes (analytics) com `async`
- [ ] Imagens below-the-fold com `loading="lazy"`
- [ ] Imagem hero com `fetchpriority="high"`
- [ ] `width` e `height` declarados em todas as `<img>`
- [ ] `<link rel="preconnect">` para origens externas críticas
- [ ] `<link rel="preload">` para fontes e imagens críticas

## Checklist de SEO

- [ ] `<title>` único, 50–60 caracteres
- [ ] `<meta name="description">` único, 150–160 caracteres
- [ ] `<link rel="canonical">` em páginas com conteúdo duplicável
- [ ] Open Graph mínimo: `og:title`, `og:description`, `og:image`, `og:url`
- [ ] JSON-LD com schema relevante (Product, Article, BreadcrumbList)
- [ ] `<meta name="robots">` para páginas que não devem ser indexadas

## Tipos de input

| Tipo       | Uso                   |
| ---------- | --------------------- |
| `email`    | E-mail                |
| `tel`      | Telefone              |
| `number`   | Valor numérico        |
| `date`     | Data                  |
| `time`     | Hora                  |
| `url`      | URL                   |
| `search`   | Campo de busca        |
| `password` | Senha                 |
| `file`     | Upload de arquivo     |
| `range`    | Slider numérico       |
| `color`    | Seletor de cor        |
| `hidden`   | Dado oculto no form   |
