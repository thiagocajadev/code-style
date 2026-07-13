# HTML

[![HTML](https://img.shields.io/badge/HTML-5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference)

Convenções de HTML seguindo os mesmos princípios do resto do guia: escolher o elemento que descreve o papel do conteúdo, dar nomes que revelam propósito e tratar acessibilidade como parte da marcação desde a primeira linha.

→ [Referência rápida](quick-reference.md): elementos semânticos, atributos e checklist

## Setup

| Tópico                                            | Conceitos                                                    |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [Base do projeto](setup/project-foundation.md)    | Template inicial, ordem do `<head>`, charset e viewport      |
| [JavaScript sem framework](setup/javascript-vanilla.md) | `type="module"`, seleção, delegação de evento e fetch  |
| [jQuery](setup/jquery.md)                         | Legado 3.7.1 e 4.0.0: seleção, delegação, encadeamento e AJAX |

## Fundamentos

| Tópico                                              | Conceitos                                                    |
| --------------------------------------------------- | ------------------------------------------------------------ |
| [Estrutura do documento](conventions/structure.md)  | Elementos semânticos, regiões da página e hierarquia de títulos |
| [Nomes em HTML](conventions/naming.md)              | id, classe, `data-*` e kebab-case semântico                  |
| [Formatação](conventions/formatting.md)             | Indentação, ordem dos atributos e aspas duplas               |
| [Densidade visual](conventions/visual-density.md)   | Respiro entre blocos, atributos longos e aninhamento         |
| [Referência rápida](quick-reference.md)             | Elementos semânticos, atributos e checklist                  |

## Avançados

| Tópico                                                 | Conceitos                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| [Acessibilidade](conventions/advanced/accessibility.md) | `alt`, ARIA, foco, papéis e a escolha entre botão e link    |
| [Formulários](conventions/advanced/forms.md)           | `<label>`, `<fieldset>`, tipos de input e validação nativa   |
| [Performance](conventions/advanced/performance.md)     | `defer`, `async`, carregamento tardio, preload e preconnect  |
| [SEO](conventions/advanced/seo.md)                     | `<title>`, meta description, Open Graph, canonical e JSON-LD |

## Princípios

**Estrutura:** semântica e hierarquia

| Princípio                                                                 | Descrição                                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Elemento semântico no lugar de div](conventions/structure.md#semantic-elements) | O elemento certo já carrega o significado, sem classe extra |
| [Hierarquia de títulos](conventions/structure.md#heading-hierarchy)       | `h1` → `h2` → `h3`, sem pular nível                              |
| [Nomes que revelam propósito](conventions/naming.md#ids-and-classes)      | O id e a classe descrevem o papel do elemento na tela            |
| [`data-*` para comportamento](conventions/naming.md#data-attributes)      | O JavaScript lê o `data-*`, e a classe fica só com o estilo      |

<br>

**Acessibilidade:** legível por todos

| Princípio                                                                | Descrição                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [alt em toda imagem](conventions/advanced/accessibility.md#images)       | Descritivo quando a imagem informa, vazio quando ela só decora   |
| [Label associado ao campo](conventions/advanced/forms.md#label)          | Todo input tem `<label>` própria, e o placeholder some ao digitar |
| [Botão para ação, link para navegação](conventions/advanced/accessibility.md#button-vs-link) | `<button>` executa, `<a>` leva a outro endereço |
| [lang no html](conventions/structure.md#lang-and-charset)                | O `lang` correto dá ao leitor de tela a pronúncia do idioma      |

<br>

**Performance e SEO:** produção

| Princípio                                                                | Descrição                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [defer nos scripts](conventions/advanced/performance.md#defer-and-async) | Script com `defer` no `<head>`, sem travar a leitura da página   |
| [Carregamento tardio de imagem](conventions/advanced/performance.md#lazy-loading) | Imagem abaixo da dobra com `loading="lazy"`             |
| [Title e description próprios](conventions/advanced/seo.md#title-and-description) | Cada página com o próprio `<title>` e a própria descrição |
