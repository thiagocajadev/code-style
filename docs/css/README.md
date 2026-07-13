# CSS

[![CSS](https://img.shields.io/badge/CSS-3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference)

Convenções de CSS seguindo os mesmos princípios do resto do guia: classes nomeadas pelo papel que o elemento cumpre, seletores de peso baixo, os valores do design guardados em variáveis e o estilo da tela pequena escrito primeiro.

→ [Referência rápida](quick-reference.md): nomes, ordem das propriedades e tokens

## Code style

| Tópico                                          | Conceitos                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| [Nomes em CSS](conventions/naming.md)           | BEM, kebab-case, nome pelo papel e especificidade baixa          |
| [Variáveis](conventions/variables.md)           | Propriedades customizadas, tokens semânticos e escopo            |
| [Formatação](conventions/formatting.md)         | Ordem das propriedades e agrupamento por responsabilidade        |
| [Layout responsivo](conventions/responsive.md)  | Tela pequena primeiro, `min-width` e larguras de corte nomeadas  |
| [Densidade visual](conventions/visual-density.md) | Respiro entre blocos, grupos de propriedades, `@media` e aninhamento |
| [Valor ausente](conventions/null-safety.md)     | Valor de reserva no `var()`, `@property` e as palavras de reset  |
| [Performance](conventions/performance.md)       | Recálculo de layout, `transform`, `will-change` e `contain`      |
| [Referência rápida](quick-reference.md)         | Nomes, ordem das propriedades e tokens                           |

## Frameworks

| Framework                 | Conceitos                                                            |
| ------------------------- | -------------------------------------------------------------------- |
| [Tailwind](tailwind.md)   | Extrair o componente com `@layer`, e registrar os tokens no config   |
| [Bootstrap](bootstrap.md) | Trocar a variável em vez do seletor, e compor sobre a classe base    |
| [shadcn/ui](shadcn.md)    | Tokens semânticos, variantes com `cva`, o `cn()`, estender e forkar  |
| [Lucide](lucide.md)       | Import por nome, cor herdada, nome acessível no botão só com ícone   |

## Princípios

**Nomeação**: semântica, hierarquia e especificidade

| Princípio                                                            | Descrição                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Nomes semânticos](conventions/naming.md#semantic-vs-presentational) | A classe descreve o papel do elemento na interface               |
| [BEM](conventions/naming.md#bem)                                     | Bloco\_\_Elemento--Modificador, com a hierarquia dentro do nome  |
| [Especificidade baixa](conventions/naming.md#specificity)            | Uma classe por seletor, sem id e sem `!important`                |

<br>

**Estilo e layout**: propriedades, tokens e responsividade

| Princípio                                                       | Descrição                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Variáveis](conventions/variables.md#semantic-tokens)           | O valor do design guardado num nome que diz para que ele serve   |
| [Ordem das propriedades](conventions/formatting.md#property-order) | Posição, caixa, texto e acabamento, nesta ordem                |
| [Tela pequena primeiro](conventions/responsive.md#mobile-first) | A base é o celular, e o `min-width` acrescenta nas telas maiores |
