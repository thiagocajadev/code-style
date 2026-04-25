# Go

[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white)](https://go.dev/doc/)

Convenções Go aplicando os mesmos princípios do guia. Os exemplos usam Go 1.26 como referência;
diferenças relevantes com versões anteriores são destacadas onde necessário.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Go: estrutura, tooling e segurança.

| Tópico                                            | Conceitos                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| [Project Foundation](setup/project-foundation.md) | go.mod, estrutura de pacotes, entry point, toolchain              |
| [Security](setup/security.md)                     | Secrets, variáveis de ambiente, validação na fronteira            |

## Fundamentos

| Tópico                                          | Conceitos                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| [Naming](conventions/naming.md)                 | PascalCase/camelCase, exportado vs interno, booleans, taboos           |
| [Variables](conventions/variables.md)           | `:=`, `var`, `const`, zero values, imutabilidade                       |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, `switch`, `for`, `defer`, retorno antecipado            |
| [Methods](conventions/methods.md)               | Funções vs métodos, receiver, SLA, explaining return, stepdown         |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função                |
| [Types](conventions/types.md)                   | Structs, interfaces, generics, type assertions, embedding             |

## Avançados

| Tópico                                                              | Conceitos                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| [Error Handling](conventions/advanced/error-handling.md)           | `error`, `errors.Is/As`, wrapping, fronteiras          |
| [Concurrency](conventions/advanced/concurrency.md)                 | Goroutines, channels, `select`, `sync`, `context`      |
| [Async](conventions/advanced/async.md)                             | `context.Context`, cancelamento, timeouts, `errgroup`  |
| [Null Safety](conventions/advanced/null-safety.md)                 | Zero values, nil handling, ponteiros opcionais         |
| [Testing](conventions/advanced/testing.md)                         | `testing`, table-driven tests, `testify`, subtests     |
| [Performance](conventions/advanced/performance.md)                 | Escape analysis, `sync.Pool`, benchmarks, allocs       |
| [Observability](conventions/advanced/observability.md)             | `log/slog`, structured logging, níveis, correlation    |
| [Validation](conventions/advanced/validation.md)                   | Struct tags, `validator`, validação na fronteira       |
| [Dates](conventions/advanced/dates.md)                             | `time.Time`, `time.Parse`, RFC 3339, fusos horários    |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio                                                                                   | Descrição                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                               | Código universal, nomes curtos e sem ambiguidade                     |
| [PascalCase exportado](conventions/naming.md#convenções-de-case)                            | Exported: `PascalCase`; unexported: `camelCase`; sem underscores     |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                  | Variáveis e funções que dispensam explicação                         |
| [Orquestrador no topo](conventions/methods.md#god-function--múltiplas-responsabilidades)    | Chamada visível antes dos detalhes (top-down)                        |
| [SLA](conventions/methods.md#sla--orquestrador-ou-implementação)                            | Uma responsabilidade, um nível de abstração                          |
| [Sem lógica no retorno](conventions/methods.md#sem-lógica-no-retorno)                       | Saída de uma linha: o retorno nomeia o resultado, não o computa      |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                     | Descrição                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                   | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata)                            | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código)                      | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Zero value por padrão](conventions/variables.md#zero-values)                                 | Go inicializa tudo; declare com intenção, não com ruído              |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos)                               | Constantes nomeadas no lugar de literais inline                      |

<br>

**Controle de qualidade**: erros, concorrência e testes

| Princípio                                                                                      | Descrição                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Erros como valores](conventions/advanced/error-handling.md#pânico-como-controle-de-fluxo)    | `error` retornado explicitamente; `panic` só para invariantes|
| [Falhar rápido](conventions/advanced/error-handling.md#erro-silencioso)                        | Validar cedo, interromper fluxo inválido                     |
| [Contexto propagado](conventions/advanced/async.md#contexto-ignorado)                          | `context.Context` no primeiro parâmetro, sempre propagado    |
| [Goroutines controladas](conventions/advanced/concurrency.md#goroutine-sem-controle)           | Toda goroutine tem dono, cancelamento e espera definidos     |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa)                   | Table-driven + AAA; assert semântico via `testify`           |
