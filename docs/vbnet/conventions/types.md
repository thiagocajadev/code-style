# Types

> Escopo: **idioma VB.NET sobre .NET Framework 4.8**. Decisões de arquitetura entre tipos (quando criar contratos, quando herdar, quando compor) estão em `shared/architecture/architecture.md` e `shared/architecture/patterns.md`; este documento cobre as ferramentas do idioma.

VB.NET oferece `Interface`, `MustInherit Class` (abstract), `Class`, `Structure`, `Enum`. Cada uma tem um domínio natural. A escolha errada não quebra nada, mas empurra decisões para o tipo errado.

> [!IMPORTANT]
> Tudo aqui assume `Option Strict On` e `Option Infer On`. Sem eles, o sistema de tipos vira sugestão: conversões implícitas viajam e late binding entra sem aviso. Veja [Variables](./variables.md#option-strict-e-option-explicit).

## Interface vs MustInherit Class

`Interface` descreve **capacidade** — o que o tipo consegue fazer. Suporta múltipla implementação via `Implements`, não carrega estado. `MustInherit Class` (equivalente ao `abstract class` do C#) descreve **identidade parcial** — uma base comum com estado e comportamento compartilhados, completada pelas filhas via `Inherits`.

A regra prática: se duas implementações vão compartilhar código, `MustInherit Class`. Se só compartilham contrato, `Interface`.

<details>
<summary>❌ Bad — interface usada para compartilhar código entre implementações</summary>
<br>

```vbnet
' Interface não carrega estado nem implementação em VB.NET
' Tentar compartilhar lógica aqui força duplicação nas implementações
Public Interface IOrderProcessor
    Function Validate(order As Order) As Result
    Function ExecuteAsync(order As Order) As Task(Of Result)
End Interface

Public Class StandardOrderProcessor
    Implements IOrderProcessor

    Public Function Validate(order As Order) As Result Implements IOrderProcessor.Validate
        ' ...
    End Function

    ' cada implementação precisa repetir a orquestração Validate-then-Execute
End Class
```

</details>

<br>

<details>
<summary>✅ Good — MustInherit Class quando há estado ou template method</summary>
<br>

```vbnet
Public MustInherit Class OrderProcessor

    Protected ReadOnly _logger As ILogger

    Protected Sub New(logger As ILogger)
        _logger = logger
    End Sub

    Public Async Function ProcessAsync(order As Order) As Task(Of Result)
        Dim validation = Validate(order)
        If Not validation.IsSuccess Then
            _logger.Warn("Order validation failed: {Reason}", validation.Error)
            Return validation
        End If

        Dim execution = Await ExecuteAsync(order)

        Return execution
    End Function

    Protected MustOverride Function Validate(order As Order) As Result
    Protected MustOverride Function ExecuteAsync(order As Order) As Task(Of Result)
End Class

Public NotInheritable Class StandardOrderProcessor
    Inherits OrderProcessor

    Public Sub New(logger As ILogger)
        MyBase.New(logger)
    End Sub

    Protected Overrides Function Validate(order As Order) As Result
        ' ...
    End Function

    Protected Overrides Function ExecuteAsync(order As Order) As Task(Of Result)
        ' ...
    End Function
End Class
```

</details>

<br>

<details>
<summary>✅ Good — interface quando só o contrato importa</summary>
<br>

```vbnet
Public Interface IOrderRepository
    Function FindByIdAsync(id As Guid) As Task(Of Order)
    Function SaveAsync(order As Order) As Task
End Interface

Public NotInheritable Class SqlOrderRepository
    Implements IOrderRepository
    ' ...
End Class

Public NotInheritable Class InMemoryOrderRepository ' testes
    Implements IOrderRepository
    ' ...
End Class
```

</details>

## NotInheritable por padrão

`NotInheritable` (equivalente ao `sealed` do C#) impede herança adicional. A recomendação do idioma moderno é **inverter o default**: toda classe concreta nasce `NotInheritable`, exceto quando herança for um requisito explícito de design. Classe não-sealed é um contrato implícito de extensibilidade — e contrato implícito é contrato errado.

<details>
<summary>❌ Bad — classe concreta sem NotInheritable, extensibilidade acidental</summary>
<br>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub

    Public Async Function CreateOrderAsync(request As OrderRequest) As Task(Of Result(Of Order))
        ' ...
    End Function
End Class

' em outro assembly, alguém estende sem conhecimento do autor
Public Class CustomOrderService
    Inherits OrderService
    ' override acidental quebra invariantes esperadas pelo OrderService original
End Class
```

</details>

<br>

<details>
<summary>✅ Good — NotInheritable por padrão, extensibilidade exige decisão</summary>
<br>

```vbnet
Public NotInheritable Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub

    Public Async Function CreateOrderAsync(request As OrderRequest) As Task(Of Result(Of Order))
        ' ...
    End Function
End Class
```

</details>

## Structure vs Class

`Class` é reference type: passa por referência, nasce no heap, igualdade por referência. `Structure` é value type: passa por cópia, nasce na stack ou inline no objeto-pai, igualdade por valor se `Equals` for sobrescrito.

A regra prática: **default é `Class`**. `Structure` só quando a semântica de valor é parte do domínio (coordenadas, dimensões, dinheiro quando não há identidade) e o tipo é pequeno — tipicamente abaixo de 16 bytes.

<details>
<summary>❌ Bad — Structure grande, cópia custosa a cada passagem</summary>
<br>

```vbnet
Public Structure Order ' 10+ campos, string longa, list
    Public ReadOnly Property Id As Guid
    Public ReadOnly Property Customer As Customer ' outro Structure pesado
    Public ReadOnly Property Items As List(Of OrderItem)
    ' ... mais 7 campos

    Public Sub New(id As Guid, customer As Customer, items As List(Of OrderItem))
        Me.Id = id
        Me.Customer = customer
        Me.Items = items
    End Sub
End Structure

' cada parâmetro, cada retorno, cada atribuição copia a struct inteira
```

</details>

<br>

<details>
<summary>✅ Good — Structure pequena com semântica de valor</summary>
<br>

```vbnet
Public Structure Money

    Public ReadOnly Property Amount As Decimal
    Public ReadOnly Property Currency As String

    Public Sub New(amount As Decimal, currency As String)
        Me.Amount = amount
        Me.Currency = currency
    End Sub
End Structure

Public NotInheritable Class Order ' reference type, carrega identidade
    ' ...
End Class
```

</details>

## Nullable(Of T)

VB.NET sobre .NET Framework 4.8 **não suporta Nullable Reference Types** (feature do C# 8+ em .NET Core 3+ / .NET 5+). Qualquer reference type pode ser `Nothing`. O tratamento de ausência é convenção:

- Retornos que podem não encontrar valor devolvem `Nothing` e o tipo documenta isso na assinatura via comentário XML ou nomeação explícita (`FindById` vs `GetById`).
- `Nullable(Of T)` (`T?` em C#) aplica-se apenas a value types (`Integer?`, `DateTime?`, `Guid?`).

<details>
<summary>❌ Bad — Integer para valor opcional, sentinela mágica</summary>
<br>

```vbnet
Public Function FindDiscount(productId As String) As Integer
    Dim discount = _discounts.FindByProductId(productId)
    If discount Is Nothing Then
        Return -1 ' sentinela: caller precisa saber que -1 significa ausência
    End If

    Return discount.Percentage
End Function
```

</details>

<br>

<details>
<summary>✅ Good — Nullable(Of Integer), ausência explícita no tipo</summary>
<br>

```vbnet
Public Function FindDiscount(productId As String) As Integer?
    Dim discount = _discounts.FindByProductId(productId)
    If discount Is Nothing Then
        Return Nothing
    End If

    Dim percentage = discount.Percentage

    Return percentage
End Function

' caller
Dim discountPercentage = FindDiscount(productId)
If discountPercentage.HasValue Then
    ApplyDiscount(discountPercentage.Value)
End If
```

</details>

Detalhes de contratos nulos em [null-safety.md](./advanced/null-safety.md).

## TypeOf ... Is e TryCast

Pattern matching completo (`switch` expressions, property patterns do C# 8+) **não existe em VB.NET**. As ferramentas disponíveis são `TypeOf ... Is`, `TryCast`, `Select Case TypeOf` (VB 14+) e downcast explícito.

A ferramenta idiomática para checagem + narrowing é `TryCast`: tenta a conversão, devolve `Nothing` se falhar, sem exception.

<details>
<summary>❌ Bad — DirectCast após TypeOf, dupla checagem</summary>
<br>

```vbnet
Public Function DescribePayment(payment As IPayment) As String
    If TypeOf payment Is CreditCard Then
        Dim creditCard = DirectCast(payment, CreditCard)
        Return $"Credit card ending in {creditCard.LastFour}"
    End If

    If TypeOf payment Is Pix Then
        Dim pix = DirectCast(payment, Pix)
        Return $"Pix to {pix.Key}"
    End If

    Return "Unknown payment"
End Function
```

</details>

<br>

<details>
<summary>✅ Good — TryCast combina checagem e narrowing</summary>
<br>

```vbnet
Public Function DescribePayment(payment As IPayment) As String
    Dim creditCard = TryCast(payment, CreditCard)
    If creditCard IsNot Nothing Then
        Dim creditCardDescription = $"Credit card ending in {creditCard.LastFour}"
        Return creditCardDescription
    End If

    Dim pix = TryCast(payment, Pix)
    If pix IsNot Nothing Then
        Dim pixDescription = $"Pix to {pix.Key}"
        Return pixDescription
    End If

    Dim fallback = "Unknown payment"

    Return fallback
End Function
```

</details>

Para variantes fechadas de um domínio, a herança hierárquica substitui o pattern matching:

<details>
<summary>✅ Good — hierarquia fechada com método polimórfico</summary>
<br>

```vbnet
Public MustInherit Class PaymentResult
    Public MustOverride Function Describe() As String
End Class

Public NotInheritable Class PaymentSuccess
    Inherits PaymentResult

    Public ReadOnly Property TransactionId As String

    Public Sub New(transactionId As String)
        Me.TransactionId = transactionId
    End Sub

    Public Overrides Function Describe() As String
        Dim description = $"Success: {TransactionId}"

        Return description
    End Function
End Class

Public NotInheritable Class PaymentFailure
    Inherits PaymentResult

    Public ReadOnly Property ErrorCode As String
    Public ReadOnly Property ErrorMessage As String

    Public Sub New(errorCode As String, errorMessage As String)
        Me.ErrorCode = errorCode
        Me.ErrorMessage = errorMessage
    End Sub

    Public Overrides Function Describe() As String
        Dim description = $"Failure {ErrorCode}: {ErrorMessage}"

        Return description
    End Function
End Class
```

</details>

## Generics com constraints

Generic sem constraint (`Of T`) descreve qualquer tipo — é abstração sem propósito. Constraints (`As Class`, `As Structure`, `As IEntity`, `As New`) tornam o contrato do genérico parte da assinatura e permitem usar membros do tipo dentro do método.

<details>
<summary>❌ Bad — genérico sem constraint, reflection para descobrir capability</summary>
<br>

```vbnet
Public Function FindById(Of T As Class)(id As Guid) As T
    ' método precisa lançar exceção se T não for uma entidade
    Dim entityType = GetType(T)
    Dim idProperty = entityType.GetProperty("Id")
    If idProperty Is Nothing Then
        Throw New InvalidOperationException($"{entityType.Name} is not an entity.")
    End If

    ' ...
End Function
```

</details>

<br>

<details>
<summary>✅ Good — constraint declara capability, compilador valida</summary>
<br>

```vbnet
Public Interface IEntity
    ReadOnly Property Id As Guid
End Interface

Public Function FindById(Of T As {Class, IEntity})(id As Guid) As T
    Dim entity = _context.Set(Of T)().FirstOrDefault(Function(e) e.Id = id)

    Return entity
End Function
```

</details>

## Evitar `Object` como contrato

`Object` em VB.NET é o equivalente ao `dynamic` do C# quando `Option Strict Off` está ativo — e mesmo com `Option Strict On`, `Object` como parâmetro ou retorno desliga a garantia de tipo. Erros que seriam de compilação viram `InvalidCastException` em runtime.

<details>
<summary>❌ Bad — Object para conveniência, tipo real perdido</summary>
<br>

```vbnet
Public Sub ProcessConfig(config As Object)
    ' sem garantia de shape, qualquer acesso exige cast
    Dim endpoint = DirectCast(DirectCast(config, IDictionary).Item("Api"), IDictionary).Item("Endpoint")
End Sub
```

</details>

<br>

<details>
<summary>✅ Good — tipo concreto, contrato explícito</summary>
<br>

```vbnet
Public NotInheritable Class ApiConfig

    Public ReadOnly Property Endpoint As String
    Public ReadOnly Property TimeoutSeconds As Integer

    Public Sub New(endpoint As String, timeoutSeconds As Integer)
        Me.Endpoint = endpoint
        Me.TimeoutSeconds = timeoutSeconds
    End Sub
End Class

Public Sub ProcessConfig(config As ApiConfig)
    Dim endpoint = config.Endpoint
    Dim timeout = config.TimeoutSeconds
End Sub
```

</details>
