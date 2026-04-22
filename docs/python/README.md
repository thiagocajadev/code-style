# Python

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://docs.python.org/3.14/)

Convenções Python aplicando os mesmos princípios do guia. Os exemplos usam Python 3.14 como
referência; diferenças relevantes com versões anteriores são destacadas onde necessário.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, type hints, strings, destructuring

## Setup

Configuração inicial de um projeto Python: estrutura, tooling e segurança.

| Tópico                                            | Conceitos                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| [Project Foundation](setup/project-foundation.md) | pyproject.toml, venv, estrutura de módulos, entry point        |
| [Security](setup/security.md)                     | Secrets, env vars, pydantic-settings, cadeia de configuração   |

## Fundamentos

| Tópico                                            | Conceitos                                                    |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [Variables](conventions/variables.md)             | `Final`, `dataclass(frozen=True)`, t-strings vs f-strings, pathlib |
| [Naming](conventions/naming.md)                   | snake_case, PascalCase, UPPER_SNAKE, `_private`, boolean     |
| [Functions](conventions/functions.md)             | SLA, orquestrador, guard clauses, direct return              |
| [Control Flow](conventions/control-flow.md)       | Guard clauses, early return, match/case, comprehensions      |
| [Visual Density](conventions/visual-density.md)   | Agrupamento de linhas, return separado, fases de função      |

## Avançados

| Tópico                                                         | Conceitos                                            |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)      | Exceções tipadas, hierarquia, fronteiras             |
| [Async](conventions/advanced/async.md)                        | asyncio, async/await, gather, evitar bloqueio        |
| [Testing](conventions/advanced/testing.md)                    | pytest, AAA, fixtures, assert semântico              |
| [Performance](conventions/advanced/performance.md)            | Generators, set, join, evitar cópias desnecessárias  |
| [Observability](conventions/advanced/observability.md)        | logging estruturado, níveis, PII, correlation_id     |
| [Validation](conventions/advanced/validation.md)              | Pydantic, validação na fronteira, output filter      |
| [Dates](conventions/advanced/dates.md)                        | datetime aware, zoneinfo, ISO 8601, strptime         |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio                                                                                    | Descrição                                                            |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                | Código universal, nomes curtos e sem ambiguidade                     |
| [snake_case nativo](conventions/naming.md#convenções-de-case)                                | Identificadores em snake_case; classes em PascalCase                 |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                   | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#código-como-documentação)                   | Nomes substituem comentários; comentários mentem                     |
| [Orquestrador no topo](conventions/functions.md#god-function--múltiplas-responsabilidades)   | Chamada visível antes dos detalhes (top-down)                        |
| [SLA](conventions/functions.md#sla--orquestrador-ou-implementação)                           | Uma responsabilidade, um nível de abstração                          |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                      | Saída de uma linha: o retorno nomeia o resultado, não o computa      |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                    | Descrição                                                            |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                  | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata)                           | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código)                     | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Valor fixo por padrão](conventions/variables.md#mutação-direta)                             | `Final`, `frozen=True`: alteração é exceção explícita                |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos)                              | Constantes nomeadas no lugar de literais inline                      |
| [CQS](conventions/variables.md#mutação-direta)                                               | Retornar novo estado, sem efeitos colaterais ocultos                 |

<br>

**Controle de qualidade**: estado, erros, async e testes

| Princípio                                                                                           | Descrição                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Exceções tipadas](conventions/advanced/error-handling.md#exceção-como-string)                     | Subclasses de `Exception`, identificáveis e tratáveis        |
| [Falhar rápido](conventions/advanced/error-handling.md#múltiplos-tipos-de-retorno)                  | Validar cedo, interromper fluxo inválido                     |
| [Fronteira de erro](conventions/advanced/error-handling.md#trycatch-que-engole-o-erro)              | try/except nas fronteiras, propagar com contexto             |
| [I/O assíncrono](conventions/advanced/async.md#bloqueio-síncrono)                                  | async/await, sem bloqueio do event loop                      |
| [Concorrência explícita](conventions/advanced/async.md#gather-execução-paralela)                   | `asyncio.gather` para chamadas independentes em paralelo     |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa)                        | AAA: fases explícitas; assert limpo, sem expressões inline   |
