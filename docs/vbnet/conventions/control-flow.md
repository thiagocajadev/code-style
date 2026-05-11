# Control Flow

Controle de fluxo em VB.NET prioriza retorno antecipado e **guard clauses** (cláusulas de proteção) sobre aninhamento. Cada `If` que não guarda cedo acumula profundidade; cada `Else` após `Return` é ruído que o leitor precisa descartar. O objetivo é que o olho percorra o método em linha reta.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `If` no topo do método que retorna cedo em caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | Sair do método assim que o resultado for conhecido, sem `Else` desnecessário |
| **Select Case** (selecionar caso) | Comando de despacho por valor; bom para enums e mapeamento explícito |
| **If / ElseIf** (se / senão se) | Cadeia condicional para múltiplos ramos; quebrar em guard clauses quando crescer |
| **lookup table** (tabela de busca) | `Dictionary(Of K, V)` que substitui cadeias longas de `If/ElseIf` |
| **AndAlso / OrElse** (curto-circuito condicional) | Operadores que avaliam o segundo operando só se necessário; preferidos a `And`/`Or` |
| **Exit For / Exit While** (saída antecipada de laço) | Comandos que abandonam laços assim que a condição for atendida |

## If e ElseIf

O ponto de partida. Para dois caminhos, `If/Else` funciona, mas `Else` após um `Return` é ruído estrutural: o compilador já descartou o branch anterior.

<details>
<summary>❌ Ruim — ElseIf desnecessário após Return</summary>

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

<details>
<summary>✅ Bom — early return elimina o ElseIf</summary>

```vbnet
Public Function GetDiscount(customerType As String) As Decimal
    If customerType = "VIP" Then Return 0.2D
    If customerType = "PREMIUM" Then Return 0.1D

    Return 0D
End Function
```

</details>

## If ternário

Para atribuição de dois valores possíveis em uma linha. Três ou mais alternativas → `Select Case`.
`IIf` é uma função _legacy_ que avalia **ambos** os argumentos sempre — incluindo expressões que
lançam exceções. O operador `If(condition, truePart, falsePart)` usa curto-circuito.

<details>
<summary>❌ Ruim — IIf avalia os dois lados sempre</summary>

```vbnet
Dim label = IIf(isActive, "Active", "Inactive")
Dim count = IIf(items IsNot Nothing, items.Count, 0)  ' items.Count avaliado mesmo se Nothing
```

</details>

<details>
<summary>✅ Bom — If ternário com curto-circuito</summary>

```vbnet
Dim label = If(isActive, "Active", "Inactive")
Dim count = If(items IsNot Nothing, items.Count, 0)
```

</details>

<details>
<summary>❌ Ruim — If ternário aninhado para 3+ alternativas</summary>

```vbnet
Dim priority = If(isUrgent, If(isCritical, "Critical", "High"), "Normal")
```

</details>

<details>
<summary>✅ Bom — Select Case para 3+ alternativas</summary>

```vbnet
Dim priority As String
Select Case True
    Case isUrgent AndAlso isCritical : priority = "Critical"
    Case isUrgent                    : priority = "High"
    Case Else                        : priority = "Normal"
End Select
```

</details>

## Aninhamento em cascata

Quando as condições crescem e se aninham, o fluxo vira uma pirâmide — o _arrow antipattern_. Guard clauses invertem: valide as saídas no topo e deixe o fluxo principal limpo.

<details>
<summary>❌ Ruim — lógica enterrada em múltiplos níveis</summary>

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

<details>
<summary>✅ Bom — guards no topo, caminho feliz sem aninhamento</summary>

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

## Dictionary

`Dictionary(Of TKey, TValue)` substitui chains de `If/ElseIf` para mapeamento de chave → valor
quando os dados são dinâmicos ou o conjunto é extensível sem recompilar.

<details>
<summary>❌ Ruim — If/ElseIf para mapeamento estático de chave → valor</summary>

```vbnet
Public Function GetCurrencyCode(region As String) As String
    If region = "BR" Then Return "BRL"
    If region = "US" Then Return "USD"
    If region = "EU" Then Return "EUR"

    Return "USD"
End Function
```

</details>

<details>
<summary>✅ Bom — Dictionary para lookup dinâmico</summary>

```vbnet
Private ReadOnly _currencyByRegion As New Dictionary(Of String, String) From {
    {"BR", "BRL"},
    {"US", "USD"},
    {"EU", "EUR"}
}

Public Function GetCurrencyCode(region As String) As String
    Dim code As String = Nothing
    Dim found = _currencyByRegion.TryGetValue(region, code)

    Return If(found, code, "USD")
End Function
```

</details>

## Select Case

`Select Case` substitui cadeias de `If/ElseIf` quando o valor de uma única expressão determina o caminho. Mais legível, mais rápido de escanear e extensível sem aninhamento extra.

<details>
<summary>❌ Ruim — cadeia de ElseIf para valor único</summary>

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

<details>
<summary>✅ Bom — Select Case, legível e extensível</summary>

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
<summary>✅ Bom — Select Case com intervalos e múltiplos valores</summary>

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

## Circuit break

Antes de escrever um loop, verifique se `FirstOrDefault`, `Any` ou `All` (LINQ) já resolve. Esses
métodos param no primeiro match — sem percorrer o resto.

<details>
<summary>❌ Ruim — loop com flag percorre tudo mesmo após encontrar</summary>

```vbnet
Dim expiredOrder As Order = Nothing

For Each order In orders
    If expiredOrder Is Nothing AndAlso order.IsExpired Then
        expiredOrder = order  ' continua iterando mesmo após encontrar
    End If
Next
```

</details>

<details>
<summary>✅ Bom — For Each com Return antecipado sai no primeiro match</summary>

```vbnet
Function FindFirstExpiredOrder(orders As IEnumerable(Of Order)) As Order
    For Each order In orders
        If order.IsExpired Then Return order
    Next

    Return Nothing
End Function
```

</details>

<details>
<summary>✅ Bom — LINQ declarativo com circuit break nativo</summary>

```vbnet
' para no primeiro match
Dim expiredOrder = orders.FirstOrDefault(Function(o) o.IsExpired)

' para no primeiro True
Dim hasExpired = orders.Any(Function(o) o.IsExpired)

' para no primeiro False
Dim allActive = orders.All(Function(o) o.IsActive)
```

</details>

## For Each e For

Use `For Each` quando não precisa do índice — comunica iteração pura sem ruído de contador. Reserve `For...Next` para quando o índice é parte da lógica.

<details>
<summary>❌ Ruim — For com índice quando não é necessário</summary>

```vbnet
For i = 0 To purchases.Count - 1
    ProcessPurchase(purchases(i))
Next

For i = 0 To items.Count - 1
    total += items(i).Price * items(i).Quantity
Next
```

</details>

<details>
<summary>✅ Bom — For Each para iteração simples</summary>

```vbnet
For Each purchase In purchases
    ProcessPurchase(purchase)
Next

For Each item In items
    total += item.Price * item.Quantity
Next
```

</details>

<details>
<summary>✅ Bom — For...Next quando o índice é parte da lógica</summary>

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

## While

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice, `While`
é a escolha natural. Use `Do...Loop Until` quando a primeira iteração deve sempre executar,
independente da condição.

<details>
<summary>❌ Ruim — For simulando condição de parada por estado</summary>

```vbnet
For attempt = 0 To maxAttempts - 1
    Dim conn = ConnectToDatabase()
    If conn.IsReady Then Exit For  ' o índice não representa nada aqui
Next
```

</details>

<details>
<summary>✅ Bom — While para condição de parada por estado</summary>

```vbnet
Dim attempt = 0

While attempt < maxAttempts
    Dim conn = ConnectToDatabase()
    If conn.IsReady Then Exit While

    attempt += 1
End While
```

</details>

<details>
<summary>✅ Bom — Do...Loop Until quando a primeira execução é garantida</summary>

```vbnet
' drena a fila — processa pelo menos um item antes de verificar
Do
    Dim task = taskQueue.Dequeue()
    ExecuteTask(task)
Loop Until taskQueue.Count = 0
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
<summary>❌ Ruim — CType onde o tipo é incerto, exceção genérica se falhar</summary>

```vbnet
Dim service = CType(container.Resolve("IPurchaseService"), IPurchaseService)
Dim handler = CType(e.Item.FindControl("handler"), Button)
```

</details>

<details>
<summary>✅ Bom — TryCast com verificação explícita</summary>

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
<summary>❌ Ruim — GoTo como substituto de estruturas modernas</summary>

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

<details>
<summary>✅ Bom — Return antecipado e Using/Finally</summary>

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

