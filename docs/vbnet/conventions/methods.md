# Methods

Métodos em VB.NET distinguem `Sub` (sem retorno) e `Function` (com retorno). A escolha é semântica, não estética: comunica a intenção da operação antes mesmo do nome. Orquestrador fica no topo; helpers `Private` descem em ordem de leitura.

## Sub vs Function

`Sub` não retorna valor — equivalente a `void`. `Function` retorna. A escolha é semântica: se a operação produz um resultado, use `Function`. `Sub` com parâmetro `ByRef` para comunicar resultado é um cheiro de design — na dúvida, prefira `Function`.

<details>
<summary>❌ Bad — Sub com ByRef para comunicar resultado</summary>
<br>

```vbnet
Public Sub ProcessPayment(payment As Payment, ByRef success As Boolean, ByRef errorMessage As String)
    If payment.Amount <= 0 Then
        success = False
        errorMessage = "Invalid amount."
        Return
    End If

    _gateway.Charge(payment)
    success = True
    errorMessage = String.Empty
End Sub

' chamada: caller precisa declarar variáveis antes e verificar depois
Dim ok As Boolean
Dim msg As String
ProcessPayment(payment, ok, msg)
If Not ok Then HandleError(msg)
```

</details>

<br>

<details>
<summary>✅ Good — Function retorna o resultado, caller lê diretamente</summary>
<br>

```vbnet
Public Function ProcessPayment(payment As Payment) As PaymentResult
    If payment.Amount <= 0 Then
        Dim invalidAmount = PaymentResult.Fail("Invalid amount.", "INVALID_AMOUNT")
        Return invalidAmount
    End If

    _gateway.Charge(payment)

    Dim result = PaymentResult.Success()

    Return result
End Function

' chamada: limpa e direta
Dim result = ProcessPayment(payment)
If Not result.IsSuccess Then HandleError(result.ErrorMessage)
```

</details>

## Orquestrador no topo

O método de entrada declara o fluxo de alto nível: o quê, não o como. Helpers ficam abaixo. O leitor entende o fluxo completo antes de descer aos detalhes.

<details>
<summary>❌ Bad — implementação misturada com orquestração</summary>
<br>

```vbnet
Public Async Function ProcessPurchaseAsync(request As PurchaseRequest) As Task(Of Invoice)
    If String.IsNullOrWhiteSpace(request.ProductId) Then
        Throw New ArgumentException("Product ID required.")
    End If

    Dim product = Await _products.FindByIdAsync(request.ProductId)
    If product Is Nothing Then
        Throw New InvalidOperationException("Product not found.")
    End If

    Dim subtotal = product.Price * request.Quantity
    Dim tax = subtotal * 0.1D
    Dim total = subtotal + tax
    Dim purchase = New Purchase(request.ProductId, request.Quantity, total)

    Await _purchases.SaveAsync(purchase)
    Await _notifications.SendAsync(New PurchaseCreatedEvent(purchase.Id))

    Dim invoice = New Invoice(purchase.Id, total, DateTime.UtcNow)
    Return invoice
End Function
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador declara o fluxo, helpers implementam cada passo</summary>
<br>

```vbnet
Public Async Function ProcessPurchaseAsync(request As PurchaseRequest) As Task(Of Invoice)
    ValidateRequest(request)

    Dim product = Await FindProductAsync(request.ProductId)
    Dim purchase = Await SavePurchaseAsync(request, product)
    Await NotifyPurchaseCreatedAsync(purchase)

    Dim invoice = BuildInvoice(purchase)
    Return invoice
End Function

Private Shared Sub ValidateRequest(request As PurchaseRequest)
    If String.IsNullOrWhiteSpace(request.ProductId) Then
        Throw New ArgumentException("Product ID required.", NameOf(request.ProductId))
    End If
End Sub

Private Async Function FindProductAsync(productId As String) As Task(Of Product)
    Dim product = Await _products.FindByIdAsync(productId)
    If product Is Nothing Then Throw New InvalidOperationException("Product not found.")
    Return product
End Function

Private Async Function SavePurchaseAsync(request As PurchaseRequest, product As Product) As Task(Of Purchase)
    Dim purchase = Purchase.From(request, product)
    Await _purchases.SaveAsync(purchase)
    Return purchase
End Function

Private Async Function NotifyPurchaseCreatedAsync(purchase As Purchase) As Task
    Await _notifications.SendAsync(New PurchaseCreatedEvent(purchase.Id))
End Function

Private Shared Function BuildInvoice(purchase As Purchase) As Invoice
    Dim invoice = New Invoice(purchase.Id, purchase.Total, DateTime.UtcNow)
    Return invoice
End Function
```

</details>

## SLA: orquestrador ou implementação

Cada método faz uma coisa: ou orquestra chamadas nomeadas, ou implementa um passo concreto. Nunca os dois. Um método que coordena e também calcula tem duas responsabilidades.

<details>
<summary>❌ Bad — orquestração e implementação no mesmo método</summary>
<br>

```vbnet
Public Async Function BuildPurchaseSummaryAsync(purchaseId As Guid) As Task(Of PurchaseSummary)
    Dim purchase = Await _purchases.FindByIdAsync(purchaseId)

    Dim subtotal = purchase.Items.Sum(Function(item) item.Price * item.Quantity)
    Dim tax = subtotal * 0.1D
    Dim total = subtotal + tax

    Dim lines = purchase.Items.Select(Function(item) $"{item.Name} x{item.Quantity}").ToList()
    Dim summary = New PurchaseSummary(purchase.Id, lines, subtotal, tax, total)

    Return summary
End Function
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador chama helpers, cada um com uma responsabilidade</summary>
<br>

```vbnet
Public Async Function BuildPurchaseSummaryAsync(purchaseId As Guid) As Task(Of PurchaseSummary)
    Dim purchase = Await _purchases.FindByIdAsync(purchaseId)

    Dim totals = CalculateTotals(purchase)
    Dim summary = BuildSummary(purchase, totals)

    Return summary
End Function

Private Shared Function CalculateTotals(purchase As Purchase) As PurchaseTotals
    Dim subtotal = purchase.Items.Sum(Function(item) item.Price * item.Quantity)
    Dim tax = subtotal * 0.1D
    Dim total = subtotal + tax

    Dim totals = New PurchaseTotals(subtotal, tax, total)
    Return totals
End Function

Private Shared Function BuildSummary(purchase As Purchase, totals As PurchaseTotals) As PurchaseSummary
    Dim lines = purchase.Items.Select(Function(item) $"{item.Name} x{item.Quantity}").ToList()
    Dim summary = New PurchaseSummary(purchase.Id, lines, totals.Subtotal, totals.Tax, totals.Total)
    Return summary
End Function
```

</details>

## Sem lógica no retorno

O `Return` declara o que sai, não calcula. Uma variável nomeada antes do retorno documenta o resultado e mantém o método legível.

<details>
<summary>❌ Bad — construção inline no Return</summary>
<br>

```vbnet
Public Function BuildSummary(purchase As Purchase) As PurchaseSummary
    Return New PurchaseSummary(
        purchase.Id,
        purchase.Items.Select(Function(item) $"{item.Name} x{item.Quantity}").ToList(),
        purchase.Items.Sum(Function(item) item.Price * item.Quantity)
    )
End Function
```

</details>

<br>

<details>
<summary>✅ Good — variável expressiva antes do Return</summary>
<br>

```vbnet
Public Function BuildSummary(purchase As Purchase) As PurchaseSummary
    Dim lines = purchase.Items.Select(Function(item) $"{item.Name} x{item.Quantity}").ToList()
    Dim total = purchase.Items.Sum(Function(item) item.Price * item.Quantity)

    Dim summary = New PurchaseSummary(purchase.Id, lines, total)
    Return summary
End Function
```

</details>

## Guard clauses

Valide as pré-condições no topo e saia cedo. O fluxo principal fica plano e sem aninhamento. Cada guarda remove um nível de indentação.

<details>
<summary>❌ Bad — lógica principal enterrada em aninhamento</summary>
<br>

```vbnet
Public Function ApprovePurchase(purchase As Purchase, user As User) As String
    If purchase IsNot Nothing Then
        If user IsNot Nothing Then
            If user.IsActive Then
                If purchase.Total > 0 Then
                    _purchases.Approve(purchase)
                    Return "Approved"
                Else
                    Return "Invalid total"
                End If
            Else
                Return "Inactive user"
            End If
        Else
            Return "User required"
        End If
    Else
        Return "Purchase required"
    End If
End Function
```

</details>

<br>

<details>
<summary>✅ Good — guards no topo, fluxo principal limpo</summary>
<br>

```vbnet
Public Function ApprovePurchase(purchase As Purchase, user As User) As String
    If purchase Is Nothing Then Return "Purchase required"
    If user Is Nothing Then Return "User required"
    If Not user.IsActive Then Return "Inactive user"
    If purchase.Total <= 0 Then Return "Invalid total"

    _purchases.Approve(purchase)
    Return "Approved"
End Function
```

</details>

## Baixa densidade visual

Linhas relacionadas ficam juntas, sem linha em branco dentro do mesmo passo. Passos diferentes são separados por exatamente uma linha em branco. Nunca duas linhas em branco consecutivas.

<details>
<summary>❌ Bad — sem separação entre passos ou separação excessiva</summary>
<br>

```vbnet
Public Async Function ProcessPurchaseAsync(request As PurchaseRequest) As Task(Of Invoice)
    ValidateRequest(request)
    Dim product = Await FindProductAsync(request.ProductId)  ' sem separação do passo anterior
    If product Is Nothing Then Throw New InvalidOperationException("Not found.")
    Dim purchase = Await SavePurchaseAsync(request, product)


    Await NotifyPurchaseCreatedAsync(purchase)  ' duas linhas em branco — ruído
    Dim invoice = BuildInvoice(purchase)
    Return invoice
End Function
```

</details>

<br>

<details>
<summary>✅ Good — um grupo por passo, separados por uma linha em branco</summary>
<br>

```vbnet
Public Async Function ProcessPurchaseAsync(request As PurchaseRequest) As Task(Of Invoice)
    ValidateRequest(request)

    Dim product = Await FindProductAsync(request.ProductId)
    If product Is Nothing Then Throw New InvalidOperationException("Not found.")

    Dim purchase = Await SavePurchaseAsync(request, product)
    Await NotifyPurchaseCreatedAsync(purchase)

    Dim invoice = BuildInvoice(purchase)
    Return invoice
End Function
```

</details>
