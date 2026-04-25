# PHP

[![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)](https://www.php.net/releases/8.4/)

Convenções PHP aplicando os mesmos princípios do guia. Os exemplos usam PHP 8.4 como referência;
diferenças relevantes com versões anteriores são destacadas onde necessário. PHP 8.4 tem suporte
ativo até novembro de 2027.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto PHP: estrutura, tooling e segurança.

| Tópico                                            | Conceitos                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| [Project Foundation](setup/project-foundation.md) | Composer, PSR-12, PHPStan, estrutura de módulos, entry point        |
| [Security](setup/security.md)                     | Secrets, variáveis de ambiente, validação, CSRF, output escaping    |

## Fundamentos

| Tópico                                          | Conceitos                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| [Naming](conventions/naming.md)                 | camelCase/PascalCase, PSR-1, booleans, taboos                           |
| [Variables](conventions/variables.md)           | `readonly`, typed properties, imutabilidade, constantes                 |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, `match`, retorno antecipado, `null` coalescing           |
| [Functions](conventions/functions.md)           | SLA, named arguments, arrow functions, explaining return                |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função                 |
| [Types](conventions/types.md)                   | Union types, intersection, enums, readonly classes, property hooks      |

## Avançados

| Tópico                                                            | Conceitos                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| [Error Handling](conventions/advanced/error-handling.md)         | Exceções tipadas, hierarquia, fronteiras HTTP          |
| [Traits](conventions/advanced/traits.md)                         | Composição, conflito, abstract em traits               |
| [Async](conventions/advanced/async.md)                           | Fibers, ReactPHP, Revolt                               |
| [Null Safety](conventions/advanced/null-safety.md)               | Nullable types, `??`, `?->`, never null                |
| [Testing](conventions/advanced/testing.md)                       | PHPUnit 11, AAA, data providers, mocks                 |
| [Performance](conventions/advanced/performance.md)               | OPcache, generators, lazy objects, N+1                 |
| [Observability](conventions/advanced/observability.md)           | Monolog, structured logging, PSR-3, correlation ID     |
| [Validation](conventions/advanced/validation.md)                 | Symfony Validator, atributos, fronteira de validação   |
| [Dates](conventions/advanced/dates.md)                           | `DateTimeImmutable`, `DateTimeInterface`, ISO 8601     |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio                                                                                     | Descrição                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                 | Código universal, nomes curtos e sem ambiguidade                     |
| [PSR-12 nativo](conventions/naming.md#convenções-de-case)                                     | PascalCase para classes; camelCase para métodos e variáveis          |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                    | Variáveis e funções que dispensam explicação                         |
| [Orquestrador no topo](conventions/functions.md#god-function--múltiplas-responsabilidades)    | Chamada visível antes dos detalhes (top-down)                        |
| [SLA](conventions/functions.md#sla--orquestrador-ou-implementação)                            | Uma responsabilidade, um nível de abstração                          |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                       | Saída de uma linha: o retorno nomeia o resultado, não o computa      |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                     | Descrição                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                   | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata)                            | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código)                      | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Readonly por padrão](conventions/variables.md#mutação-direta)                                | `readonly` em propriedades e parâmetros; mutação é exceção           |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos)                               | Constantes nomeadas no lugar de literais inline                      |

<br>

**Controle de qualidade**: estado, erros e testes

| Princípio                                                                                      | Descrição                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Exceções tipadas](conventions/advanced/error-handling.md#exceção-como-string)                | Subclasses de `\RuntimeException`, identificáveis e tratáveis|
| [Falhar rápido](conventions/advanced/error-handling.md#validação-tardia)                       | Validar cedo, interromper fluxo inválido                     |
| [Fronteira de erro](conventions/advanced/error-handling.md#trycatch-espalhado)                 | try/catch nas fronteiras, propagar com contexto              |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa)                   | AAA: fases explícitas; data providers para múltiplos casos   |
