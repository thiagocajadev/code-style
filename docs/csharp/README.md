# C#

[![C#](https://img.shields.io/badge/C%23-14-512BD4?logo=csharp&logoColor=white)](https://learn.microsoft.com/en-us/dotnet/csharp/)

As convenções do guia aplicadas ao C# e ao .NET. A linguagem oferece um recurso para quase toda
decisão de design, e a maior parte destas páginas trata de escolher entre eles: quando `record` e
quando `class`, quando `Result` e quando exceção, quando `var` e quando o tipo escrito por extenso.
Os exemplos usam C# 14 e .NET 10, e o texto avisa quando uma versão anterior se comporta de outro
jeito.

→ [Referência rápida](quick-reference.md): nomenclatura, modificadores, tipos, LINQ, controle de fluxo

## Setup

Configuração inicial de um projeto C#/.NET: estrutura, infraestrutura e segurança.

| Tópico                                            | Conceitos                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| [Fundação do projeto](setup/project-foundation.md) | Program.cs enxuto, extension methods, rate limiting, pipeline  |
| [Segurança](setup/security.md)                    | Secrets, env vars, user-secrets, cadeia de configuração        |
| [Fatia vertical](setup/vertical-slice.md)         | IModule, descoberta automática, AddDefaults/UseDefaults, os seis passos, CQS |
| [Entity Framework](setup/entity-framework.md)     | `AsNoTracking`, projeção, N+1, paginação, `OrderBy`, left join |
| [Dapper](setup/dapper.md)                         | Procedures por domínio, queries simples, injeção de conexão    |

## Fundamentos

| Tópico                                            | Conceitos                                             |
| ------------------------------------------------- | ----------------------------------------------------- |
| [Variáveis](conventions/variables.md)             | `var`, `const`, `readonly`, record para dados fixos   |
| [Nomes](conventions/naming.md)                    | PascalCase, `_camelCase`, prefixo `I`, sufixo `Async` |
| [Métodos](conventions/methods.md)                 | Um nível de abstração, orquestrador, construtor primário |
| [Controle de fluxo](conventions/control-flow.md)  | Guard clauses, pattern matching, switch expressions   |
| [Densidade visual](conventions/visual-density.md) | Fases do método, o respiro antes do return, declaração + guarda |

## Avançados

| Tópico                                                              | Conceitos                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Tratamento de erros](conventions/advanced/error-handling.md)      | `Result<T>`, `ApiError`, exceção só para o inesperado        |
| [Assincronia](conventions/advanced/async.md)                       | `async/await`, `Task.WhenAll`, `CancellationToken`           |
| [LINQ](conventions/advanced/linq.md)                               | Coleções, `Select` e `foreach`, materialização, left join    |
| [Injeção de dependências](conventions/advanced/dependency-injection.md) | Injeção por construtor, tempo de vida, interface para teste |
| [Design de API](conventions/advanced/api-design.md)                | Minimal API, fatia vertical, controllers, DTOs, status codes |
| [Testes](conventions/advanced/testing.md)                          | AAA, assert com valores nomeados, isolamento                 |
| [Desempenho](conventions/advanced/performance.md)                  | `Span<T>`, `StringBuilder`, `ValueTask`                      |
| [Observabilidade](conventions/advanced/observability.md)           | Logging estruturado, níveis, PII, id de correlação           |
| [Validação](conventions/advanced/validation.md)                    | Limpeza, FluentValidation, regras de negócio, filtro de saída |
| [Datas](conventions/advanced/dates.md)                             | `DateTimeOffset`, `DateOnly`, UTC, ida e volta ao banco      |
| [Modelagem de entidades](conventions/advanced/entity-modeling.md)  | `record struct` para IDs, `IReadOnlyList`, `Entity<TId>`, factory + `private` setters |
| [Referência rápida](quick-reference.md)                            | Nomenclatura, verbos, nomes proibidos, convenções rápidas    |

## Frameworks

| Tópico                                         | Conceitos                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Blazor](frameworks/blazor.md)                 | Render modes, componentes, estado, formulários, roteamento, JS Interop                 |
| [Razor Pages e MVC](frameworks/razor-mvc.md)   | PageModel, Tag Helpers, controller thin, ViewModel, layouts, partial views             |

## Princípios

**Forma**: estrutura e narrativa do método

| Princípio                                                                                      | Descrição                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#portuguese-names)                                  | Código universal, nomes curtos e sem ambiguidade                    |
| [PascalCase e \_camelCase](conventions/naming.md#capitalization-by-scope)                      | Público PascalCase, privado `_camelCase`                            |
| [Sufixo Async](conventions/naming.md#async-suffix)                                             | Todo método assíncrono termina em `Async`                           |
| [Nomes expressivos](conventions/naming.md#meaningless-identifiers)                     | Variáveis e métodos que dispensam explicação                        |
| [Código como documentação](conventions/naming.md#code-as-documentation)                     | Nomes substituem comentários: comentários mentem                    |
| [Orquestrador no topo](conventions/methods.md#orchestrator-on-top)                            | Chamada visível antes dos detalhes: top-down                        |
| [SLA](conventions/methods.md#single-level-of-abstraction)                               | Uma responsabilidade, um nível de abstração                         |
| [Sem lógica no retorno](conventions/methods.md#no-logic-in-return)                          | Saída de uma linha: o retorno nomeia o resultado, não o computa     |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                      | Descrição                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-and-else)                                    | Saída cedo na falha, sem else após return                           |
| [Fluxo linear](conventions/control-flow.md#cascading-nesting)                             | Aninhamento em cascata substituído por fluxo plano                  |
| [Pattern matching](conventions/control-flow.md#pattern-matching)                               | `switch` expressions sobre `if-else` encadeado                      |
| [Valor fixo por padrão](conventions/variables.md#records-immutable)                            | `readonly`, `const`, `record`: alteração é exceção explícita        |
| [Sem valores mágicos](conventions/variables.md#magic-values)                            | Constantes nomeadas em vez de literais inline                       |
| [CQS](conventions/variables.md#direct-mutation)                                              | Retornar novo estado, sem efeitos colaterais ocultos                |

<br>

**Controle de qualidade**: estado, erros, async e testes

| Princípio                                                                                      | Descrição                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Primary constructors](conventions/methods.md#primary-constructors)                            | DI por construtor primário, sem service locator                     |
| [Result\<T\>](conventions/advanced/error-handling.md#result-t)                                  | Exceção para falhas inesperadas; `Result` para fluxo de negócio     |
| [Falhar rápido](conventions/advanced/error-handling.md#fail-fast)                          | Validar cedo, interromper fluxo inválido                            |
| [Contratos consistentes](conventions/advanced/error-handling.md#api-error)                      | Erros tipados, sempre o mesmo formato                               |
| [I/O assíncrono](conventions/advanced/async.md#async-await)                                     | `async/await`: nunca `.Result` ou `.Wait()`                         |
| [CancellationToken](conventions/advanced/async.md#cancellation-token)                           | Propagado em todas as chamadas de I/O públicas                      |
| [Concorrência explícita](conventions/advanced/async.md#task-whenall)                            | `Task.WhenAll` para chamadas independentes em paralelo              |
| [LINQ puro](conventions/advanced/linq.md#pure-linq)                          | Query transforma dados; efeitos colaterais ficam no `foreach`       |
| [Testes estruturados](conventions/advanced/testing.md#aaa-phases)                   | AAA: fases explícitas; assert limpo, sem expressões inline          |
