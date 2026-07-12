# Métodos em VB.NET

VB.NET separa **Sub** (método sem retorno) de **Function** (método que retorna um valor). A escolha entre os dois conta ao leitor o que a operação faz antes de ele chegar no nome: um `Sub` altera o estado do sistema, uma `Function` calcula uma resposta.

Dentro da classe, o **orquestrador** público fica no topo e os **helpers** `Private` vêm abaixo, na ordem em que são chamados. Quem abre o arquivo lê o fluxo inteiro antes de descer ao detalhe de cada passo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Sub** (subrotina sem retorno) | Método sem valor de retorno; equivale a `void` em C# |
| **Function** (função com retorno) | Método que retorna valor; preferida sempre que houver resultado a comunicar |
| **ByVal / ByRef** (por valor / por referência) | Modos de passagem do argumento; para devolver resultado, use o retorno da `Function` |
| **orchestrator** (orquestrador) | Método público de entrada que descreve o fluxo em alto nível |
| **helper** (método auxiliar) | Método `Private` abaixo do orquestrador, com responsabilidade única |
| **Optional** (parâmetro opcional) | Parâmetro com valor padrão; `Optional ByVal logger As ILogger = Nothing` |
| **Overloads** (sobrecarga) | Múltiplas assinaturas do mesmo nome; comunica variantes da operação |
| **single responsibility** (responsabilidade única) | Um método faz uma coisa; o nome descreve essa coisa por completo |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | Cada método opera em um só nível: orquestra passos ou implementa detalhe |

<a id="sub-vs-function"></a>

## Sub ou Function

`Sub` não retorna valor e equivale ao `void` do C#. `Function` retorna. Se a operação produz um resultado, ela é uma `Function`.

Um `Sub` que devolve o resultado por parâmetro `ByRef` obriga quem chama a fazer o trabalho: declarar as variáveis antes, passar elas, e checar depois qual foi preenchida. O retorno de uma `Function` entrega a mesma informação em uma linha, e o compilador garante que ninguém a ignore por acidente.

<details>
<summary>❌ Ruim: Sub com ByRef para comunicar resultado</summary>

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

<details>
<summary>✅ Bom: Function retorna o resultado, caller lê diretamente</summary>

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

<a id="orchestrator-first"></a>

## Orquestrador no topo

O método público de entrada lista os passos do fluxo, cada um com o nome do que ele faz: validar, buscar o produto, salvar a compra, notificar, montar a nota. Como cada passo virou um helper, o corpo do orquestrador cabe em cinco linhas e responde "o que este serviço faz" sem obrigar ninguém a ler o cálculo do imposto.

Os helpers ficam abaixo, na ordem em que o orquestrador chama eles. Quem precisa do detalhe de um passo desce até o helper daquele passo.

<details>
<summary>❌ Ruim: implementação misturada com orquestração</summary>

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

<details>
<summary>✅ Bom: orquestrador declara o fluxo, helpers implementam cada passo</summary>

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

<a id="single-level-of-abstraction"></a>

## Um método fica em um só nível de abstração

Cada método escolhe um dos dois papéis: ele coordena chamadas com nome, ou ele implementa um passo concreto.

Quando os dois papéis se misturam, quem lê precisa acompanhar o fluxo e o cálculo ao mesmo tempo. `BuildPurchaseSummaryAsync` busca a compra, e a linha seguinte já soma item por item e multiplica pela alíquota do imposto. Separar o cálculo em `CalculateTotals` deixa o método de entrada com três linhas que dizem quais são os passos, e o detalhe da soma fica no helper, para quem for procurar por ele.

<details>
<summary>❌ Ruim: orquestração e implementação no mesmo método</summary>

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

<details>
<summary>✅ Bom: orquestrador chama helpers, cada um com uma responsabilidade</summary>

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

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

O `Return` entrega um valor que já está pronto. Calcular dentro dele empilha `Select`, `Sum` e o construtor na mesma expressão, e quem depura precisa desmontar tudo para inspecionar um pedaço. Uma variável com nome antes do `Return` dá um ponto de parada ao debugger e diz, em uma palavra, o que está saindo do método.

<details>
<summary>❌ Ruim: construção inline no Return</summary>

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

<details>
<summary>✅ Bom: variável expressiva antes do Return</summary>

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

As **guard clauses** (cláusulas de proteção) checam as pré-condições no topo do método e saem na hora em que uma falha. Cada guarda tira um nível de indentação do resto: as quatro checagens aninhadas do exemplo ruim viram quatro linhas retas, e o caso de sucesso volta para a margem esquerda, onde é fácil de achar.

<details>
<summary>❌ Ruim: lógica principal enterrada em aninhamento</summary>

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

<details>
<summary>✅ Bom: guards no topo, fluxo principal limpo</summary>

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

As linhas de um mesmo passo ficam grudadas, sem linha em branco entre elas. Passos diferentes ficam separados por uma linha em branco, sempre uma só. Duas linhas em branco seguidas sugerem uma divisão que não existe, e o leitor procura por ela.

<details>
<summary>❌ Ruim: sem separação entre passos ou separação excessiva</summary>

```vbnet
Public Async Function ProcessPurchaseAsync(request As PurchaseRequest) As Task(Of Invoice)
    ValidateRequest(request)
    Dim product = Await FindProductAsync(request.ProductId)  ' sem separação do passo anterior
    If product Is Nothing Then Throw New InvalidOperationException("Not found.")
    Dim purchase = Await SavePurchaseAsync(request, product)


    Await NotifyPurchaseCreatedAsync(purchase)  ' duas linhas em branco: ruído
    Dim invoice = BuildInvoice(purchase)
    Return invoice
End Function
```

</details>

<details>
<summary>✅ Bom: um grupo por passo, separados por uma linha em branco</summary>

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
