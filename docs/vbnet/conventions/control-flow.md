# Controle de fluxo em VB.NET

O controle de fluxo em VB.NET começa pelo retorno antecipado e pelas **guard clauses** (cláusulas de proteção), no lugar do aninhamento. Cada `If` que não sai cedo acrescenta um nível de indentação, e o caso de sucesso vai parar no fundo do método.

Um `Else` depois de um `Return` também sobra: o `Return` já encerrou aquele caminho, e quem lê o `Else` precisa confirmar isso antes de descartar o bloco.

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

Para dois caminhos, `If/Else` resolve. O que sobra é o `Else` colocado depois de um `Return`: se a condição foi verdadeira, o método já saiu, e as linhas seguintes só rodam no caso contrário. O `Else` repete uma informação que o `Return` acima já deu, e leva junto um nível de indentação.

<details>
<summary>❌ Ruim: ElseIf desnecessário após Return</summary>

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
<summary>✅ Bom: early return elimina o ElseIf</summary>

```vbnet
Public Function GetDiscount(customerType As String) As Decimal
    If customerType = "VIP" Then Return 0.2D
    If customerType = "PREMIUM" Then Return 0.1D

    Return 0D
End Function
```

</details>

## If ternário

O operador `If(condição, valorSeVerdadeiro, valorSeFalso)` atribui um de dois valores em uma linha. A partir de três alternativas, use `Select Case`: o ternário aninhado dentro de outro ternário obriga o leitor a resolver a expressão de dentro para fora.

Existe também o `IIf`, herdado do VB clássico, e ele tem um defeito grave: avalia sempre os dois argumentos. Em `IIf(items IsNot Nothing, items.Count, 0)`, o `items.Count` roda mesmo quando `items` é `Nothing`, e a chamada falha exatamente no caso que a condição tentava proteger. O operador `If` avalia só o ramo escolhido.

<details>
<summary>❌ Ruim: IIf avalia os dois lados sempre</summary>

```vbnet
Dim label = IIf(isActive, "Active", "Inactive")
Dim count = IIf(items IsNot Nothing, items.Count, 0)  ' items.Count avaliado mesmo se Nothing
```

</details>

<details>
<summary>✅ Bom: If ternário com curto-circuito</summary>

```vbnet
Dim label = If(isActive, "Active", "Inactive")
Dim count = If(items IsNot Nothing, items.Count, 0)
```

</details>

<details>
<summary>❌ Ruim: If ternário aninhado para 3+ alternativas</summary>

```vbnet
Dim priority = If(isUrgent, If(isCritical, "Critical", "High"), "Normal")
```

</details>

<details>
<summary>✅ Bom: Select Case para 3+ alternativas</summary>

```vbnet
Dim priority As String
Select Case True
    Case isUrgent AndAlso isCritical : priority = "Critical"
    Case isUrgent                    : priority = "High"
    Case Else                        : priority = "Normal"
End Select
```

</details>

<a id="nested-conditionals"></a>

## Aninhamento em cascata

Quatro condições aninhadas empurram o caso de sucesso para o quinto nível de indentação, e quem lê precisa manter as quatro na cabeça para saber em que situação aquela linha roda. A saída de erro, no fim do método, fica longe da condição que a causou.

Inverta as condições e coloque as saídas no topo, uma por linha. O caso de sucesso volta para a margem e cada checagem fica ao lado do erro que ela produz.

<details>
<summary>❌ Ruim: lógica enterrada em múltiplos níveis</summary>

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
<summary>✅ Bom: guards no topo, caminho feliz sem aninhamento</summary>

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

`Dictionary(Of TKey, TValue)` guarda um mapeamento de chave para valor que, escrito como `If/ElseIf`, viraria uma linha de código por entrada. Acrescentar uma moeda nova passa a ser uma linha na tabela, e o método de busca continua igual. Vale quando as entradas mudam com frequência, ou quando elas vêm de configuração e não podem exigir uma recompilação.

<details>
<summary>❌ Ruim: If/ElseIf para mapeamento estático de chave → valor</summary>

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
<summary>✅ Bom: Dictionary para lookup dinâmico</summary>

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

<a id="select-case"></a>

## Select Case

Quando o caminho depende do valor de uma única expressão, `Select Case` diz isso na primeira linha: a expressão aparece uma vez, e cada `Case` mostra um valor possível dela. A cadeia de `If/ElseIf` equivalente repete `status =` em cada ramo, e o leitor precisa comparar as condições entre si para confirmar que todas testam a mesma variável.

<details>
<summary>❌ Ruim: cadeia de ElseIf para valor único</summary>

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
<summary>✅ Bom: Select Case, legível e extensível</summary>

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
<summary>✅ Bom: Select Case com intervalos e múltiplos valores</summary>

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

## Sair do laço assim que a resposta aparece

Um laço que percorre a coleção inteira para achar um item faz trabalho à toa depois de encontrar ele. Em uma lista de dez mil pedidos com o vencido na posição 3, o laço com flag faz 9.997 comparações desnecessárias.

`Return` dentro do `For Each` sai na hora. E antes de escrever o laço, veja se o LINQ já resolve: `FirstOrDefault` para no primeiro item que casa, `Any` para no primeiro verdadeiro e `All` para no primeiro falso.

<details>
<summary>❌ Ruim: loop com flag percorre tudo mesmo após encontrar</summary>

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
<summary>✅ Bom: For Each com Return antecipado sai no primeiro match</summary>

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
<summary>✅ Bom: LINQ declarativo com circuit break nativo</summary>

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

`For Each` percorre a coleção sem contador. `For...Next` fica reservado para quando o índice entra na lógica: numerar páginas, pular de dois em dois, comparar um item com o vizinho.

O `For` com índice usado só para acessar o elemento (`purchases(i)`) acrescenta três pontos onde dá para errar: o valor inicial, o `Count - 1` e cada indexação no corpo. O `For Each` não tem nenhum deles.

<details>
<summary>❌ Ruim: For com índice quando não é necessário</summary>

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
<summary>✅ Bom: For Each para iteração simples</summary>

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
<summary>✅ Bom: For...Next quando o índice é parte da lógica</summary>

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

`While` serve quando a parada depende de uma condição de estado e não existe coleção para percorrer, como tentar conectar ao banco até a conexão ficar pronta. Escrever isso como `For` cria um índice que não representa nada, e quem lê procura pelo significado dele.

`Do...Loop Until` roda o corpo uma vez antes de testar a condição. É o que serve para esvaziar uma fila: processa o item, e só então pergunta se ainda sobrou algum.

<details>
<summary>❌ Ruim: For simulando condição de parada por estado</summary>

```vbnet
For attempt = 0 To maxAttempts - 1
    Dim conn = ConnectToDatabase()
    If conn.IsReady Then Exit For  ' o índice não representa nada aqui
Next
```

</details>

<details>
<summary>✅ Bom: While para condição de parada por estado</summary>

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
<summary>✅ Bom: Do...Loop Until quando a primeira execução é garantida</summary>

```vbnet
' drena a fila: processa pelo menos um item antes de verificar
Do
    Dim task = taskQueue.Dequeue()
    ExecuteTask(task)
Loop Until taskQueue.Count = 0
```

</details>

## TryCast, DirectCast e CType

VB.NET tem três formas de converter um tipo em outro, e elas se diferenciam pelo que acontece quando a conversão falha. `TryCast` devolve `Nothing`, `DirectCast` lança exceção e `CType` tenta uma coerção antes de desistir. A escolha declara o que você espera do valor.

| Operador | Comportamento | Quando usar |
| --- | --- | --- |
| `TryCast` | Retorna `Nothing` se falhar | Tipo incerto em runtime; sempre verifique o resultado |
| `DirectCast` | Lança exceção se falhar | Tipo garantido, quer exceção clara se errar |
| `CType` | Tenta converter, pode fazer coerção | Conversões numéricas ou quando `Option Strict` exige |

<details>
<summary>❌ Ruim: CType onde o tipo é incerto, exceção genérica se falhar</summary>

```vbnet
Dim service = CType(container.Resolve("IPurchaseService"), IPurchaseService)
Dim handler = CType(e.Item.FindControl("handler"), Button)
```

</details>

<details>
<summary>✅ Bom: TryCast com verificação explícita</summary>

```vbnet
Dim service = TryCast(container.Resolve("IPurchaseService"), IPurchaseService)
If service Is Nothing Then Throw New InvalidOperationException("IPurchaseService not registered.")

Dim handler = TryCast(e.Item.FindControl("handler"), Button)
If handler Is Nothing Then Return
```

</details>

## GoTo

`GoTo` é proibido. Ele veio do Basic clássico, quando a linguagem não tinha estrutura para desviar o fluxo de outro jeito. Hoje cada uso dele tem substituto direto: `Try/Catch/Finally` para tratar erro, `Return` antecipado para sair do método e `Using` para liberar recurso.

O problema prático do `GoTo` é que o rótulo de destino pode estar em qualquer ponto do método, então descobrir o que roda depois de uma linha exige procurar todos os `GoTo` que apontam para lá.

<details>
<summary>❌ Ruim: GoTo como substituto de estruturas modernas</summary>

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
<summary>✅ Bom: Return antecipado e Using/Finally</summary>

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

