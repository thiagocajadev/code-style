# HTML

Convenções HTML aplicando os mesmos princípios do guia: estrutura semântica, nomes que descrevem
propósito e acessibilidade como padrão, não como adição.

## Setup

| Tópico                                                          | Conceitos                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| [Project Foundation](setup/project-foundation.md)               | Template base, ordem do `<head>`, charset, viewport          |
| [JavaScript Vanilla](setup/javascript-vanilla.md)               | `type="module"`, seleção, delegation, fetch                  |
| [jQuery](setup/jquery.md)                                       | Legado — 3.7.1 / 4.0.0, seleção, delegation, chaining, AJAX |

## Fundamentos

| Tópico                                          | Conceitos                                                    |
| ----------------------------------------------- | ------------------------------------------------------------ |
| [Structure](conventions/structure.md)           | Semântica, landmark elements, hierarquia de headings         |
| [Naming](conventions/naming.md)                 | IDs, classes, `data-*`, kebab-case semântico                 |
| [Formatting](conventions/formatting.md)         | Indentação, ordem de atributos, aspas duplas                 |
| [Visual Density](conventions/visual-density.md) | Respiro entre blocos, atributos longos, aninhamento          |
| [Quick Reference](quick-reference.md)           | Elementos semânticos, atributos, checklist                   |

## Avançados

| Tópico                                                        | Conceitos                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| [Accessibility](conventions/advanced/accessibility.md)        | `alt`, ARIA, foco, roles, botão vs link                      |
| [Forms](conventions/advanced/forms.md)                        | `<label>`, `<fieldset>`, tipos de input, validação nativa    |
| [Performance](conventions/advanced/performance.md)            | `defer`, `async`, lazy loading, preload, preconnect          |
| [SEO](conventions/advanced/seo.md)                            | `<title>`, meta description, Open Graph, canonical, JSON-LD  |

## Princípios

**Estrutura** — semântica e hierarquia

| Princípio                                                                    | Descrição                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Semântica em vez de div](conventions/structure.md#elementos-semânticos)     | Elemento correto carrega significado sem classe extra               |
| [Hierarquia de headings](conventions/structure.md#hierarquia-de-headings)    | `h1` → `h2` → `h3` sem pular níveis                                |
| [Nomes que descrevem propósito](conventions/naming.md#ids-e-classes)         | IDs e classes descrevem papel, não aparência                        |
| [data-* para comportamento](conventions/naming.md#data-attributes)           | `data-*` para JS; classes só para CSS                               |

<br>

**Acessibilidade** — legível por todos

| Princípio                                                                          | Descrição                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [alt em toda imagem](conventions/advanced/accessibility.md#imagens)                | Descritivo para conteúdo, vazio para decorativo                     |
| [Label associado](conventions/advanced/forms.md#label)                             | Todo input tem `<label>` explícita; placeholder não substitui       |
| [Botão vs link](conventions/advanced/accessibility.md#botão-vs-link)               | `<button>` para ação, `<a>` para navegação                          |
| [lang no html](conventions/structure.md#lang-e-charset)                            | `lang` correto habilita pronúncia e hifenização do leitor de tela   |

<br>

**Performance e SEO** — produção

| Princípio                                                                         | Descrição                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [defer nos scripts](conventions/advanced/performance.md#defer-e-async)            | Scripts com `defer` no `<head>`, sem bloquear o parse               |
| [lazy loading](conventions/advanced/performance.md#lazy-loading)                  | Imagens abaixo da dobra com `loading="lazy"`                        |
| [Title e description únicos](conventions/advanced/seo.md#title-e-description)     | Cada página com `<title>` e `<meta name="description">` próprios    |
