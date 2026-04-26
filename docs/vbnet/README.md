# VB.NET

[![VB.NET](https://img.shields.io/badge/VB.NET-16-512BD4?logo=dotnet&logoColor=white)](https://learn.microsoft.com/en-us/dotnet/visual-basic/)

Convenções VB.NET aplicando os mesmos princípios do guia. Os exemplos usam VB.NET 16 e .NET Framework 4.8 — a última versão major do .NET Framework — como referência para trabalho com bases de código legadas.

→ [Quick Reference](quick-reference.md) — nomenclatura, modificadores, tipos, controle de fluxo

> [!IMPORTANT]
> Antes de qualquer convenção, três switches de compilador precisam estar ativos em todo projeto:
>
> ```vbnet
> Option Strict On
> Option Explicit On
> Option Infer On
> ```
>
> Configure no `.vbproj` para aplicar a todo o projeto sem repetir em cada arquivo.

## Setup

Configuração inicial de um projeto VB.NET/.NET Framework: estrutura, injeção de dependência e acesso a dados.

| Tópico | Conceitos |
| --- | --- |
| [Project Foundation](setup/project-foundation.md) | `Web.config`, `Global.asax.vb`, constructor injection, Unity IoC, WinForms legacy |
| [Legacy Desktop](setup/legacy-desktop.md) | Setup enxuto: `App.config`, módulo de acesso thin, formulário → banco → resultado |
| [Security](setup/security.md) | Segredos, Web.config transforms, criptografia de seção, `[Authorize]`, cookies |
| [Dapper](setup/dapper.md) | Procedures por domínio, queries simples, `DynamicParameters`, SQL injection |
| [ADO.NET](setup/ado-net.md) | `SqlCommand`, `SqlDataReader`, `DataTable`, transações, OUTPUT params |

## Fundamentos

| Tópico | Conceitos |
| --- | --- |
| [Naming](conventions/naming.md) | PascalCase universal, `_camelCase`, sufixo `Async`, notação húngara |
| [Variables](conventions/variables.md) | `Option Strict`, `Dim`, `Const`, `ReadOnly`, `Is Nothing`, `AndAlso` |
| [Methods](conventions/methods.md) | `Sub` vs `Function`, orquestrador, SLA, guard clauses |
| [Control Flow](conventions/control-flow.md) | Guard clauses, `Select Case`, `For Each`, `TryCast`, sem `GoTo` |

## Avançados

| Tópico | Conceitos |
| --- | --- |
| [Error Handling](conventions/advanced/error-handling.md) | `Try/Catch`, sem `On Error GoTo`, `Using`, `Catch When` |
| [Async](conventions/advanced/async.md) | `Async Function` vs `Async Sub`, `Await`, `Task.WhenAll` |
| [LINQ](conventions/advanced/linq.md) | Method syntax, LINQ puro, materialização, `FirstOrDefault` |
| [Validation](conventions/advanced/validation.md) | Sanitize, DataAnnotations, ModelState, regras de negócio, output filter |
| [Dates](conventions/advanced/dates.md) | `DateTimeOffset` vs `DateTime`, UTC, formatação com cultura explícita |
| [Observability](conventions/advanced/observability.md) | NLog, message templates, níveis, PII, Correlation ID |
| [Testing](conventions/advanced/testing.md) | AAA, assert semântico, nomes expressivos, isolamento, `Assert.Throws(Of T)` |
| [Visual Density](conventions/visual-density.md) | Fases de método, `Return` separado, declaração + guarda, strings longas |
| [Performance](conventions/advanced/performance.md) | `StringBuilder`, boxing, `HashSet`, `For` vs `For Each` em hot paths |
| [Null Safety](conventions/advanced/null-safety.md) | `Is Nothing`, `Nullable(Of T)`, `If()` null-coalescing, guard em construtor |

## Princípios

**Forma** — estrutura e narrativa do método

| Princípio | Descrição |
| --- | --- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português) | Código universal, nomes curtos e sem ambiguidade |
| [Orquestrador no topo](conventions/methods.md#orquestrador-no-topo) | Chamada visível antes dos detalhes: top-down |
| [SLA](conventions/methods.md#sla-orquestrador-ou-implementação) | Uma responsabilidade, um nível de abstração |
| [Sem lógica no retorno](conventions/methods.md#sem-lógica-no-retorno) | Saída de uma linha: o `Return` nomeia o resultado, não o computa |
| [Sub vs Function](conventions/methods.md#sub-vs-function) | Se produz resultado, use `Function` — `ByRef` para output é design smell |

**Legibilidade** — fluxo, densidade visual e nomes

| Princípio | Descrição |
| --- | --- |
| [Retorno antecipado](conventions/control-flow.md#aninhamento-em-cascata) | Guard clauses no topo, sem aninhamento em cascata |
| [Select Case](conventions/control-flow.md#select-case) | `Select Case` sobre cadeia de `ElseIf` para valor único |
| [Booleans expressivos](conventions/naming.md#booleans-expressivos) | Prefixo `is`, `has`, `can`, `should` declara a semântica |
| [Sem notação húngara](conventions/naming.md#notação-húngara) | Nome pelo domínio, não pelo tipo |
| [Sem valores mágicos](conventions/variables.md#sem-valores-mágicos) | `Const` nomeado em vez de literais inline |

**Controle de qualidade** — estado, erros e async

| Princípio | Descrição |
| --- | --- |
| [Option Strict On](conventions/variables.md#option-strict-e-option-explicit) | Proíbe conversões implícitas e late binding — ativar é obrigatório |
| [Is / IsNot Nothing](conventions/variables.md#nothing-is-e-isnot) | Padrão .NET para verificar nulo — sem `IsNothing()` |
| [AndAlso / OrElse](conventions/variables.md#andalso-e-orelse) | Curto-circuito seguro — `And`/`Or` avaliam ambos os lados |
| [Try/Catch estruturado](conventions/advanced/error-handling.md#trycatch-vs-on-error-goto) | Sem `On Error GoTo`, sem `GoTo` |
| [Async Function](conventions/advanced/async.md#async-function-vs-async-sub) | `Async Sub` apenas para event handlers |
| [Await sem bloqueio](conventions/advanced/async.md#await-nunca-result-ou-wait) | Nunca `.Result` ou `.Wait()` — deadlock em contextos com SynchronizationContext |
| [LINQ puro](conventions/advanced/linq.md#linq-puro-sem-side-effects) | Sem efeitos colaterais em transformações |
