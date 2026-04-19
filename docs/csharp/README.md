# C#

Convenções C#/.NET aplicando os mesmos princípios do guia. Os exemplos usam C# 14 e .NET 10 como
referência; diferenças relevantes com versões anteriores são destacadas onde necessário.

## Setup

Configuração inicial de um projeto C#/.NET — estrutura, infraestrutura e segurança.

| Tópico                                            | Conceitos                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| [Security](setup/security.md)                     | Secrets, env vars, user-secrets, cadeia de configuração        |
| [Project Foundation](setup/project-foundation.md) | Program.cs enxuto, extension methods, rate limiting, pipeline  |
| [Entity Framework](setup/entity-framework.md)     | `AsNoTracking`, projeção, N+1, paginação, `OrderBy`, left join |
| [Dapper](setup/dapper.md)                         | Procedures por domínio, queries simples, injeção de conexão    |

## Code Style

| Tópico                                | Conceitos                                                  |
| ------------------------------------- | ---------------------------------------------------------- |
| [Variables](conventions/variables.md)                         | `var`, `const`, `readonly`, records imutáveis                    |
| [Naming](conventions/naming.md)                               | PascalCase, `_camelCase`, prefixo `I`, sufixo `Async`            |
| [Methods](conventions/methods.md)                             | SLA, orquestrador, guard clauses, primary constructors           |
| [Control Flow](conventions/control-flow.md)                   | Guard clauses, pattern matching, switch expressions              |
| [Error Handling](conventions/error-handling.md)               | `Result<T>`, `ApiError`, sem exceções no fluxo de negócio        |
| [Async](conventions/async.md)                                 | `async/await`, `Task.WhenAll`, `CancellationToken`               |
| [LINQ](conventions/linq.md)                                   | Coleções, `Select` vs `foreach`, materialização, left join       |
| [Dependency Injection](conventions/dependency-injection.md)   | Constructor injection, lifetimes, interface para testabilidade   |
| [API Design](conventions/api-design.md)                       | Minimal API, Vertical Slice, controllers, DTOs, status codes     |
| [Testing](conventions/testing.md)                             | AAA, semantic assert, isolamento                                 |
| [Performance](conventions/performance.md)                     | `Span<T>`, `StringBuilder`, `ValueTask`                          |
| [Observability](conventions/observability.md)                 | Logging estruturado, níveis, PII, correlationId                  |
| [Validation](conventions/validation.md)                       | Sanitize, FluentValidation, regras de negócio, output filter     |
| [Dates](conventions/dates.md)                                 | `DateTimeOffset`, `DateOnly`, UTC, EF Core round-trip            |
| [Quick Reference](quick-reference.md)                         | Nomenclatura, verbos, taboos, convenções rápidas                 |

## Princípios

| Princípio                                                      | Descrição                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)              | Código universal, nomes curtos e sem ambiguidade                    |
| [PascalCase e \_camelCase](conventions/naming.md#pascalcase-e-_camelcase)  | Público PascalCase, privado `_camelCase`                            |
| [Sufixo Async](conventions/naming.md#sufixo-async)                         | Todo método assíncrono termina em `Async`                           |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado) | Variáveis e métodos que dispensam explicação                        |
| [Código como documentação](conventions/naming.md#código-como-documentação) | Nomes substituem comentários — comentários mentem                   |
| [Imutabilidade por padrão](conventions/variables.md#records-imutáveis)     | `readonly`, `const`, `record` — mutação é exceção explícita         |
| [Sem valores mágicos](conventions/variables.md#sem-valores-mágicos)        | Constantes nomeadas em vez de literais inline                       |
| [CQS](conventions/variables.md#mutação-direta)                             | Retornar novo estado, sem efeitos colaterais ocultos                |
| [Orquestrador no topo](conventions/methods.md#orquestrador-no-topo)        | Chamada visível antes dos detalhes — top-down                       |
| [SLA](conventions/methods.md#sla--orquestrador-ou-implementação)           | Uma responsabilidade, um nível de abstração                         |
| [Sem lógica no retorno](conventions/methods.md#sem-lógica-no-retorno)      | Variável expressiva antes do `return`, simétrica à entrada          |
| [Primary constructors](conventions/methods.md#primary-constructors)        | DI por construtor primário — sem service locator                    |
| [Guard clauses](conventions/control-flow.md#guard-clauses)                 | Retorno antecipado, fluxo principal livre                           |
| [Fluxo linear](conventions/control-flow.md#else-após-return)               | Guard clauses sobre condicionais aninhadas                          |
| [Pattern matching](conventions/control-flow.md#pattern-matching)           | `switch` expressions sobre `if-else` encadeado                      |
| [Result\<T\>](conventions/error-handling.md#resultt)                       | Exceção para falhas inesperadas — `Result` para fluxo de negócio    |
| [Falhar rápido](conventions/error-handling.md#falhar-rápido)               | Validar cedo, interromper fluxo inválido                            |
| [Contratos consistentes](conventions/error-handling.md#apierror)           | Erros tipados, sempre o mesmo formato                               |
| [I/O assíncrono](conventions/async.md#asyncawait)                          | `async/await` — nunca `.Result` ou `.Wait()`                        |
| [CancellationToken](conventions/async.md#cancellationtoken)                | Propagado em todas as chamadas de I/O públicas                      |
| [Concorrência explícita](conventions/async.md#taskwhenall)                 | `Task.WhenAll` para chamadas independentes em paralelo              |
| [LINQ puro](conventions/linq.md#linq-puro--sem-side-effects)               | Sem efeitos colaterais em queries — transformação, não orquestração |
| [Testes estruturados](conventions/testing.md#fases-misturadas--aaa)        | AAA — fases explícitas; assert limpo — sem expressões inline        |
