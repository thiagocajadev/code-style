# Quick Reference

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

## Options obrigatórios

```vbnet
Option Strict On    ' proíbe conversões implícitas e late binding
Option Explicit On  ' exige Dim para toda variável
Option Infer On     ' habilita inferência de tipo com Dim
```

Configure como padrão no `.vbproj` para não repetir em cada arquivo.

## Verbos por intenção

| Verbo | Intenção | Exemplo |
| --- | --- | --- |
| `Find` | Buscar por critério, pode retornar Nothing | `FindPurchaseAsync`, `FindByIdAsync` |
| `Get` | Buscar, espera encontrar, lança se não encontrar | `GetCustomerAsync` |
| `Save` | Persistir (insert ou update) | `SavePurchaseAsync` |
| `Delete` | Remover | `DeletePurchaseAsync` |
| `Calculate` | Computar valor | `CalculateTotal`, `CalculateTax` |
| `Map` / `Build` | Transformar / construir DTO ou modelo | `MapToDto`, `BuildInvoice` |
| `Validate` | Verificar pré-condição | `ValidateRequest`, `ValidatePayment` |
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
| Hungarian notation (`strName`, `intAge`) | Redundante com `Option Strict On` | Nome pelo domínio |
| `Catch ex As Exception` vazio | Silencia falhas | Loga e relança, ou trata com intenção |
| `And` / `Or` com objetos anuláveis | Avalia ambos os lados, `NullReferenceException` | `AndAlso` / `OrElse` |
| `Module` com estado mutável | `Module` é estático — estado global | `Class` com injeção de dependência |

## Module vs Class

`Module` em VB.NET é uma classe estática selada: todos os membros são automaticamente `Shared`, não pode ser instanciado. Use para funções utilitárias puras sem estado. Para qualquer coisa com dependência ou estado, use `Class`.

```vbnet
' Module: funções puras sem estado
Module DateHelpers
    Public Function ToLocalDisplay(value As DateTimeOffset) As String
        Return value.ToLocalTime().ToString("dd/MM/yyyy HH:mm")
    End Function
End Module

' Class: tem dependência, precisa de injeção
Public Class PurchaseService
    Private ReadOnly _repository As IPurchaseRepository

    Public Sub New(repository As IPurchaseRepository)
        _repository = repository
    End Sub
End Class
```

## Conversões de tipo

```vbnet
' TryCast: seguro, retorna Nothing se falhar
Dim btn = TryCast(sender, Button)
If btn Is Nothing Then Return

' DirectCast: sem coerção, lança InvalidCastException se errar — use quando o tipo é certo
Dim form = DirectCast(Application.OpenForms("MainForm"), MainForm)

' CType: com coerção — para conversões numéricas explícitas
Dim total As Decimal = CType(txtTotal.Text, Decimal)  ' prefira Decimal.TryParse

' Conversão segura com TryParse
Dim quantity As Integer
If Not Integer.TryParse(txtQuantity.Text, quantity) Then
    ShowError("Invalid quantity.")
    Return
End If
```

## Convenções rápidas

```vbnet
' Nothing check idiomático
If purchase Is Nothing Then Return
If user IsNot Nothing AndAlso user.IsActive Then Process(user)

' Ternário seguro
Dim label = If(isActive, "Active", "Inactive")

' Using para IDisposable
Using conn = New SqlConnection(_connectionString)
    ' ...
End Using

' Task paralelas
Dim t1 = _users.FindByIdAsync(userId)
Dim t2 = _purchases.FindByUserAsync(userId)
Await Task.WhenAll(t1, t2)

' LINQ method syntax
Dim active = purchases.Where(Function(purchase) purchase.IsActive).ToList()
Dim total = purchases.Sum(Function(purchase) purchase.Total)
Dim first = purchases.FirstOrDefault(Function(purchase) purchase.Id = id)
```
