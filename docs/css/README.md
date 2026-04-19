# CSS

Convenções CSS - Cascading Style Sheets (Folhas de Estilo em Cascata) aplicando os mesmos princípios
deste guia — nomes semânticos, baixa especificidade, custom properties como tokens e mobile-first
por padrão.

## Code Style

| Tópico                                  | Conceitos                                                    |
| --------------------------------------- | ------------------------------------------------------------ |
| [Naming](conventions/naming.md)         | BEM, kebab-case, semântico vs presentacional, especificidade |
| [Variables](conventions/variables.md)   | Custom properties, tokens semânticos, escopo de variável     |
| [Formatting](conventions/formatting.md) | Ordem de propriedades, agrupamento por responsabilidade      |
| [Responsive](conventions/responsive.md) | Mobile-first, min-width, breakpoints nomeados                |
| [Quick Reference](quick-reference.md)   | Nomenclatura, ordem de propriedades, tokens                  |

## Frameworks

| Framework                 | Conceitos                                                  |
| ------------------------- | ---------------------------------------------------------- |
| [Tailwind](tailwind.md)   | Utility sprawl, @layer components, design tokens no config |
| [Bootstrap](bootstrap.md) | Override via custom properties, extensão vs sobrescrita    |

## Princípios

| Princípio                                                             | Descrição                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Nomes semânticos](conventions/naming.md#semântico-vs-presentacional) | Classes descrevem propósito, não aparência                              |
| [BEM](conventions/naming.md#bem)                                      | Bloco\_\_Elemento--Modificador, hierarquia explícita                    |
| [Custom properties](conventions/variables.md#tokens-semânticos)       | Valores reutilizáveis com nomes que descrevem papel, não cor            |
| [Mobile-first](conventions/responsive.md#mobile-first)                | `min-width` como base, expansão progressiva                             |
| [Ordem lógica](conventions/formatting.md#ordem-de-propriedades)       | Propriedades agrupadas por responsabilidade, legíveis de cima pra baixo |
| [Baixa especificidade](conventions/naming.md#especificidade)          | Classes simples, sem IDs, sem `!important`                              |
