# Quick Reference

> Escopo: VB.NET. Cheat-sheet das convenções; detalhes em `conventions/`.

## Nomenclatura

| Escopo | Convenção | Exemplo |
| --- | --- | --- |
| Tipo (classe, interface, enum, `Module`) | `PascalCase` | `PurchaseService`, `IRepository`, `PaymentStatus` |
| Método / `Function` / `Sub` | `PascalCase` | `FindPurchaseAsync`, `BuildInvoice` |
| Propriedade | `PascalCase` | `CreatedAt`, `IsActive` |
| Evento | `PascalCase` | `PurchaseCreated`, `PaymentFailed` |
| Campo privado | `_camelCase` | `_repository`, `_logger` |
| Parâmetro / variável local | `camelCase` | `purchaseId`, `cancellationToken` |
| Constante | `PascalCase` | `MaxRetries`, `DefaultTimeout` |
| Interface | `IPascalCase` | `IPurchaseRepository`, `INotifier` |

## Sub vs Function

| Situação | Usar |
| --- | --- |
| Operação produz um resultado | `Function ... As T` |
| Operação sem resultado (void) | `Sub` |
| I/O assíncrono com resultado | `Async Function ... As Task(Of T)` |
| I/O assíncrono sem resultado | `Async Function ... As Task` |
| Event handler | `Async Sub ... Handles ...` (único caso válido) |

## Operadores idiomáticos

| Usar | Em vez de | Por quê |
| --- | --- | --- |
| `x Is Nothing` | `IsNothing(x)` / `x = Nothing` | Padrão .NET, testa referência |
| `x IsNot Nothing` | `Not IsNothing(x)` / `x <> Nothing` | Idem |
| `AndAlso` | `And` | Curto-circuito — não avalia o lado direito se desnecessário |
| `OrElse` | `Or` | Curto-circuito |
| `If(cond, a, b)` | `IIf(cond, a, b)` | IIf avalia ambos os lados sempre |
| `TryCast(x, T)` | `CType(x, T)` | TryCast retorna Nothing; CType lança |
| `DirectCast(x, T)` | `CType(x, T)` | DirectCast sem coerção; use quando o tipo é certo |

## Verbos por intenção

| Verbo | Intenção | Exemplo |
| --- | --- | --- |
| `Find` | Buscar por critério, pode retornar Nothing | `FindPurchaseAsync` |
| `Get` | Buscar, espera encontrar, lança se não encontrar | `GetCustomerAsync` |
| `Save` | Persistir (insert ou update) | `SavePurchaseAsync` |
| `Delete` | Remover | `DeletePurchaseAsync` |
| `Calculate` | Computar valor | `CalculateTotal`, `CalculateTax` |
| `Map` / `Build` | Transformar / construir DTO ou modelo | `MapToDto`, `BuildInvoice` |
| `Validate` | Verificar pré-condição | `ValidateRequest` |
| `Send` | Disparar evento, notificação, e-mail | `SendNotificationAsync` |
| `Is` / `Has` / `Can` | Predicado booleano | `IsActive`, `HasDiscount`, `CanApprove` |

## Taboos

| Proibido | Motivo | Alternativa |
| --- | --- | --- |
| `On Error GoTo` | Modelo VB clássico, não estruturado | `Try/Catch/Finally` |
| `GoTo` | Fluxo incontrolável | `Return`, `Try/Finally`, `Using` |
| `IIf` | Avalia ambos os lados | `If(cond, a, b)` |
| `IsNothing(x)` | Função legacy de `Microsoft.VisualBasic` | `x Is Nothing` |
| `Async Sub` fora de event handler | Exceções não capturáveis, não aguardável | `Async Function ... As Task` |
| `.Result` / `.Wait()` em Task | Deadlock em contextos com SynchronizationContext | `Await` |
| Hungarian notation (`strName`) | Redundante com `Option Strict On` | Nome pelo domínio |
| `Catch ex As Exception` vazio | Silencia falhas | Loga e relança, ou trata com intenção |
| `And` / `Or` com objetos anuláveis | Avalia ambos os lados, `NullReferenceException` | `AndAlso` / `OrElse` |
| `Module` com estado mutável | `Module` é estático — estado global | `Class` com injeção de dependência |

## Options obrigatórios

```vbnet
Option Strict On    ' proíbe conversões implícitas e late binding
Option Explicit On  ' exige Dim para toda variável
Option Infer On     ' habilita inferência de tipo com Dim
```

Configure como padrão no `.vbproj` para não repetir em cada arquivo.
