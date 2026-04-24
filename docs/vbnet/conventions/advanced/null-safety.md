# Null Safety

> Escopo: VB.NET. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

VB.NET representa ausência de valor com `Nothing`. Com `Option Strict On` e `Option Infer On`,
o compilador bloqueia a maior parte dos acessos a `Nothing` em tempo de compilação — mas não
todos. As diretrizes abaixo cobrem os padrões que o compilador não verifica sozinho.

> Conceito geral: [Null Safety](../../../../shared/standards/null-safety.md)

## Is Nothing vs IsNothing()

`Is Nothing` é o operador nativo do .NET para checar referências nulas. `IsNothing()` é uma
função de compatibilidade do VB6 — idêntica em resultado, mas idiomática do legado.

<details>
<summary>❌ Bad — IsNothing() é legado do VB6</summary>
<br>

```vbnet
If IsNothing(order) Then Return
If IsNothing(customer.Address) Then Return

Dim name As String = If(IsNothing(user.Name), "Unknown", user.Name)
```

</details>

<br>

<details>
<summary>✅ Good — Is Nothing / IsNot Nothing como operadores nativos</summary>
<br>

```vbnet
If order Is Nothing Then Return
If customer.Address Is Nothing Then Return

Dim name As String = If(user.Name IsNot Nothing, user.Name, "Unknown")
```

</details>

## Nullable(Of T) para tipos de valor

Tipos de valor (`Integer`, `Decimal`, `Date`, `Boolean`) não aceitam `Nothing` diretamente.
`Nullable(Of T)` (ou `T?`) representa ausência explícita. Use `.HasValue` e `.Value` para
acessar com segurança.

<details>
<summary>❌ Bad — valor sentinela para representar ausência</summary>
<br>

```vbnet
Public Class OrderItem
    Public Property Discount As Decimal  ' 0 significa "sem desconto" ou "desconto zero"?
    Public Property DeliveredAt As Date  ' Date.MinValue como sentinela de "não entregue"
End Class

Public Function HasDiscount(item As OrderItem) As Boolean
    Return item.Discount <> 0D  ' valor mágico — ambíguo
End Function
```

</details>

<br>

<details>
<summary>✅ Good — Nullable(Of T) expressa ausência explicitamente</summary>
<br>

```vbnet
Public Class OrderItem
    Public Property Discount As Decimal?      ' Nothing = sem desconto; 0D = desconto zero explícito
    Public Property DeliveredAt As Date?      ' Nothing = não entregue
End Class

Public Function HasDiscount(item As OrderItem) As Boolean
    Return item.Discount.HasValue AndAlso item.Discount.Value > 0D
End Function

Public Function GetDeliveryStatus(item As OrderItem) As String
    If Not item.DeliveredAt.HasValue Then Return "Pending"

    Dim deliveryDate As String = item.DeliveredAt.Value.ToString("dd/MM/yyyy")

    Return $"Delivered on {deliveryDate}"
End Function
```

</details>

## If() ternário como operador null-coalescing

O operador ternário `If(condition, valueIfTrue, valueIfFalse)` com dois argumentos funciona
como `??` em C#: retorna o primeiro argumento se não for `Nothing`, caso contrário retorna o
segundo.

<details>
<summary>❌ Bad — If/Else verboso para default de null</summary>
<br>

```vbnet
Dim city As String
If user.Address IsNot Nothing Then
    city = user.Address.City
Else
    city = "Unknown"
End If

Dim discount As Decimal
If product.Discount.HasValue Then
    discount = product.Discount.Value
Else
    discount = 0D
End If
```

</details>

<br>

<details>
<summary>✅ Good — If() de dois argumentos como null-coalescing</summary>
<br>

```vbnet
Dim city As String = If(user.Address?.City, "Unknown")

Dim discount As Decimal = If(product.Discount, 0D)
```

</details>

## Coleções nunca são Nothing

Métodos e propriedades que retornam coleções retornam lista vazia, nunca `Nothing`. O caller
não precisa verificar `Nothing` antes de iterar.

<details>
<summary>❌ Bad — Nothing em coleção força defesa em cada caller</summary>
<br>

```vbnet
Public Function FindOrdersByUser(userId As Guid) As List(Of Order)
    Dim orders = _repository.FindByUser(userId)
    If orders Is Nothing OrElse orders.Count = 0 Then Return Nothing

    Return orders
End Function

' caller precisa verificar antes de iterar
Dim orders = _service.FindOrdersByUser(userId)
If orders IsNot Nothing Then
    For Each order In orders
        ProcessOrder(order)
    Next
End If
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia como estado neutro, sem Nothing</summary>
<br>

```vbnet
Public Function FindOrdersByUser(userId As Guid) As List(Of Order)
    Dim orders = _repository.FindByUser(userId)
    If orders Is Nothing Then Return New List(Of Order)()

    Return orders
End Function

' caller itera diretamente — sem verificação
Dim orders = _service.FindOrdersByUser(userId)
For Each order In orders
    ProcessOrder(order)
Next
```

</details>

## Guard clause em construtores

Verificar argumentos de construtor garante que o objeto nunca é criado em estado inválido.
**Fail-fast** (falhar cedo): melhor do que descobrir o `Nothing` mais tarde na cadeia.

<details>
<summary>❌ Bad — construtor aceita Nothing silenciosamente</summary>
<br>

```vbnet
Public Class OrderService
    Private ReadOnly _repository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(repository As IOrderRepository, notifier As INotifier)
        _repository = repository  ' Nothing passa sem erro
        _notifier = notifier
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — guard clause no construtor</summary>
<br>

```vbnet
Public Class OrderService
    Private ReadOnly _repository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(repository As IOrderRepository, notifier As INotifier)
        If repository Is Nothing Then Throw New ArgumentNullException(NameOf(repository))
        If notifier Is Nothing Then Throw New ArgumentNullException(NameOf(notifier))

        _repository = repository
        _notifier = notifier
    End Sub
End Class
```

</details>
