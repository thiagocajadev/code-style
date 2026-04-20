# Control Flow

## If e ElseIf

O ponto de partida. Para dois caminhos, `If/Else` funciona, mas `Else` após um `Return` é ruído estrutural: o compilador já descartou o branch anterior.

<details>
<summary>❌ Bad — ElseIf desnecessário após Return</summary>
<br>

```vbnet
Public Function GetDiscount(customerType As String) As Decimal
    If customerType = "VIP" Then
        Return 0.2D
    ElseIf customerType = "PREMIUM" Then
        Return 0.1D
    Else
        Return 0D
    End If
End Function
```

</details>

<br>

<details>
<summary>✅ Good — early return elimina o ElseIf</summary>
<br>

```vbnet
Public Function GetDiscount(customerType As String) As Decimal
    If customerType = "VIP" Then Return 0.2D
    If customerType = "PREMIUM" Then Return 0.1D

    Return 0D
End Function
```

</details>

## Aninhamento em cascata

Quando as condições crescem e se aninham, o fluxo vira uma pirâmide — o _arrow antipattern_. Guard clauses invertem: valide as saídas no topo e deixe o fluxo principal limpo.

<details>
<summary>❌ Bad — lógica enterrada em múltiplos níveis</summary>
<br>

```vbnet
Public Async Function CheckoutAsync(request As CartRequest) As Task(Of Invoice)
    If request IsNot Nothing Then
        If request.Items.Count > 0 Then
            Dim user = Await _users.FindByIdAsync(request.UserId)
            If user IsNot Nothing Then
                If user.IsActive Then
                    Dim invoice = Await BuildInvoiceAsync(request, user)
                    Return invoice
                End If
            End If
        End If
    End If

    Throw New InvalidOperationException("Checkout failed.")
End Function
```

</details>

<br>

<details>
<summary>✅ Good — guards no topo, caminho feliz sem aninhamento</summary>
<br>

```vbnet
Public Async Function CheckoutAsync(request As CartRequest) As Task(Of Invoice)
    If request Is Nothing Then Throw New ArgumentNullException(NameOf(request))
    If request.Items.Count = 0 Then Throw New InvalidOperationException("Cart is empty.")

    Dim user = Await _users.FindByIdAsync(request.UserId)
    If user Is Nothing Then Throw New InvalidOperationException("User not found.")
    If Not user.IsActive Then Throw New InvalidOperationException("User inactive.")

    Dim invoice = Await BuildInvoiceAsync(request, user)
    Return invoice
End Function
```

</details>

## Select Case

`Select Case` substitui cadeias de `If/ElseIf` quando o valor de uma única expressão determina o caminho. Mais legível, mais rápido de escanear e extensível sem aninhamento extra.

<details>
<summary>❌ Bad — cadeia de ElseIf para valor único</summary>
<br>

```vbnet
Public Function GetStatusLabel(status As String) As String
    If status = "PENDING" Then
        Return "Awaiting review"
    ElseIf status = "APPROVED" Then
        Return "Approved"
    ElseIf status = "REJECTED" Then
        Return "Rejected"
    ElseIf status = "CANCELLED" Then
        Return "Cancelled"
    Else
        Return "Unknown"
    End If
End Function
```

</details>

<br>

<details>
<summary>✅ Good — Select Case, legível e extensível</summary>
<br>

```vbnet
Public Function GetStatusLabel(status As String) As String
    Select Case status
        Case "PENDING" : Return "Awaiting review"
        Case "APPROVED" : Return "Approved"
        Case "REJECTED" : Return "Rejected"
        Case "CANCELLED" : Return "Cancelled"
        Case Else : Return "Unknown"
    End Select
End Function
```

</details>

<br>

`Select Case` também aceita intervalos e múltiplos valores por `Case`:

<details>
<summary>✅ Good — Select Case com intervalos e múltiplos valores</summary>
<br>

```vbnet
Public Function ClassifyScore(score As Integer) As String
    Select Case score
        Case 90 To 100 : Return "Excellent"
        Case 70 To 89 : Return "Good"
        Case 50 To 69 : Return "Average"
        Case 0 To 49 : Return "Below average"
        Case Else : Return "Invalid score"
    End Select
End Function

Public Function IsWeekend(day As DayOfWeek) As Boolean
    Select Case day
        Case DayOfWeek.Saturday, DayOfWeek.Sunday : Return True
        Case Else : Return False
    End Select
End Function
```

</details>

## For Each e For

Use `For Each` quando não precisa do índice — comunica iteração pura sem ruído de contador. Reserve `For...Next` para quando o índice é parte da lógica.

<details>
<summary>❌ Bad — For com índice quando não é necessário</summary>
<br>

```vbnet
For i = 0 To purchases.Count - 1
    ProcessPurchase(purchases(i))
Next

For i = 0 To items.Count - 1
    total += items(i).Price * items(i).Quantity
Next
```

</details>

<br>

<details>
<summary>✅ Good — For Each para iteração simples</summary>
<br>

```vbnet
For Each purchase In purchases
    ProcessPurchase(purchase)
Next

For Each item In items
    total += item.Price * item.Quantity
Next
```

</details>

<br>

<details>
<summary>✅ Good — For...Next quando o índice é parte da lógica</summary>
<br>

```vbnet
' índice usado para posição ou offset
For i = 0 To pages.Count - 1
    pages(i).PageNumber = i + 1
Next

' processamento em pares
For i = 0 To items.Count - 2 Step 2
    SwapItems(items, i, i + 1)
Next
```

</details>

## TryCast, DirectCast e CType

VB.NET oferece três formas de conversão. A escolha importa para segurança e clareza de intenção.

| Operador | Comportamento | Quando usar |
| --- | --- | --- |
| `TryCast` | Retorna `Nothing` se falhar | Tipo incerto em runtime — sempre verifique o resultado |
| `DirectCast` | Lança exceção se falhar | Tipo garantido, quer exceção clara se errar |
| `CType` | Tenta converter, pode fazer coerção | Conversões numéricas ou quando `Option Strict` exige |

<details>
<summary>❌ Bad — CType onde o tipo é incerto, exceção genérica se falhar</summary>
<br>

```vbnet
Dim service = CType(container.Resolve("IPurchaseService"), IPurchaseService)
Dim handler = CType(e.Item.FindControl("handler"), Button)
```

</details>

<br>

<details>
<summary>✅ Good — TryCast com verificação explícita</summary>
<br>

```vbnet
Dim service = TryCast(container.Resolve("IPurchaseService"), IPurchaseService)
If service Is Nothing Then Throw New InvalidOperationException("IPurchaseService not registered.")

Dim handler = TryCast(e.Item.FindControl("handler"), Button)
If handler Is Nothing Then Return
```

</details>

## GoTo

`GoTo` é proibido. VB.NET herdou `GoTo` do Basic clássico — em .NET não há justificativa para uso. `Try/Catch/Finally` cobre tratamento de erro; `Return` antecipado cobre saída condicional; `Using` cobre limpeza de recursos.

<details>
<summary>❌ Bad — GoTo como substituto de estruturas modernas</summary>
<br>

```vbnet
Sub ProcessFile(path As String)
    If Not File.Exists(path) Then GoTo ErrorHandler

    Dim lines = File.ReadAllLines(path)
    ' ... process ...
    GoTo Cleanup

ErrorHandler:
    LogError("File not found: " & path)

Cleanup:
    CloseResources()
End Sub
```

</details>

<br>

<details>
<summary>✅ Good — Return antecipado e Using/Finally</summary>
<br>

```vbnet
Sub ProcessFile(path As String)
    If Not File.Exists(path) Then
        LogError($"File not found: {path}")
        Return
    End If

    Try
        Dim lines = File.ReadAllLines(path)
        ' ... process ...
    Finally
        CloseResources()
    End Try
End Sub
```

</details>

## IIf vs If ternário

`IIf` é uma função legacy que avalia **ambos** os argumentos independente da condição — incluindo expressões com efeitos colaterais ou que lançam exceções. O operador ternário `If(condition, truePart, falsePart)` usa curto-circuito.

<details>
<summary>❌ Bad — IIf avalia os dois lados sempre</summary>
<br>

```vbnet
Dim label = IIf(isActive, "Active", "Inactive")
Dim value = IIf(items IsNot Nothing, items.Count, 0)  ' items.Count avaliado mesmo se Nothing
```

</details>

<br>

<details>
<summary>✅ Good — If ternário com curto-circuito</summary>
<br>

```vbnet
Dim label = If(isActive, "Active", "Inactive")
Dim count = If(items IsNot Nothing, items.Count, 0)  ' items.Count só se items IsNot Nothing
```

</details>
