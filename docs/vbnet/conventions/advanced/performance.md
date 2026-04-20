# Performance

Estas diretrizes se aplicam a hot paths: fluxos executados em volume ou frequência alta. Fora desse
contexto, prefira legibilidade. Meça antes de otimizar.

## StringBuilder

Concatenação com `&` dentro de um laço aloca uma nova String a cada iteração: strings são
imutáveis em .NET. `StringBuilder` reutiliza um buffer interno e aloca uma vez no final.

<details>
<summary>❌ Bad — nova string alocada por iteração</summary>
<br>

```vbnet
Public Function BuildOrderSummary(items As IEnumerable(Of OrderItem)) As String
    Dim summary As String = ""
    For Each item In items
        summary &= $"{item.ProductName}: {item.Quantity}x" & vbCrLf
    Next

    Return summary
End Function
```

</details>

<br>

<details>
<summary>✅ Good — StringBuilder reutiliza o buffer</summary>
<br>

```vbnet
Public Function BuildOrderSummary(items As IEnumerable(Of OrderItem)) As String
    Dim builder As New StringBuilder()
    For Each item In items
        builder.AppendLine($"{item.ProductName}: {item.Quantity}x")
    Next

    Dim summary As String = builder.ToString()

    Return summary
End Function
```

</details>

## For vs For Each em hot paths

`For Each` sobre arrays em hot paths usa o enumerador e cria alocação implícita. `For` com
índice acessa o array diretamente, sem overhead de enumerador.

<details>
<summary>❌ Bad — For Each cria enumerador por iteração em hot path</summary>
<br>

```vbnet
Public Function CalculateTotalRevenue(orders As Order()) As Decimal
    Dim total As Decimal = 0D
    For Each order In orders
        total += order.Amount
    Next

    Return total
End Function
```

</details>

<br>

<details>
<summary>✅ Good — For com índice em array: sem enumerador</summary>
<br>

```vbnet
Public Function CalculateTotalRevenue(orders As Order()) As Decimal
    Dim total As Decimal = 0D
    For i As Integer = 0 To orders.Length - 1
        total += orders(i).Amount
    Next

    Return total
End Function
```

</details>

## Boxing e unboxing

Passar um tipo de valor (`Integer`, `Decimal`, `Boolean`) para um parâmetro `Object` causa
boxing: alocação de um wrapper no heap. Em hot paths, prefira genéricos ou tipos concretos.

<details>
<summary>❌ Bad — ArrayList usa Object, boxing por item</summary>
<br>

```vbnet
Public Function SumAmounts(amounts As ArrayList) As Decimal
    Dim total As Decimal = 0D
    For Each item As Object In amounts
        total += CDec(item)  ' unboxing a cada iteração
    Next

    Return total
End Function
```

</details>

<br>

<details>
<summary>✅ Good — List(Of Decimal) sem boxing</summary>
<br>

```vbnet
Public Function SumAmounts(amounts As List(Of Decimal)) As Decimal
    Dim total As Decimal = 0D
    For Each amount As Decimal In amounts
        total += amount
    Next

    Return total
End Function
```

</details>

## Set para membership em alta frequência

`List(Of T).Contains` percorre o inteiro a cada verificação: O(n). `HashSet(Of T).Contains`
resolve em O(1) via hash. Para listas fixas verificadas com frequência, defina o `HashSet` uma
vez no módulo e reutilize.

<details>
<summary>❌ Bad — List.Contains percorre tudo a cada chamada</summary>
<br>

```vbnet
Private ReadOnly _premiumCategories As New List(Of String) From {
    "electronics", "jewelry", "watches"
}

Public Function FilterPremiumProducts(products As IEnumerable(Of Product)) As List(Of Product)
    Dim premiumProducts = products.Where(Function(p) _premiumCategories.Contains(p.Category))

    Return premiumProducts.ToList()
End Function
```

</details>

<br>

<details>
<summary>✅ Good — HashSet.Contains resolve em O(1)</summary>
<br>

```vbnet
Private ReadOnly _premiumCategories As New HashSet(Of String) From {
    "electronics", "jewelry", "watches"
}

Public Function FilterPremiumProducts(products As IEnumerable(Of Product)) As List(Of Product)
    Dim premiumProducts = products.Where(Function(p) _premiumCategories.Contains(p.Category))

    Return premiumProducts.ToList()
End Function
```

</details>

## ValueTask para caminhos síncronos frequentes

`Task(Of T)` aloca um objeto no heap a cada chamada, mesmo quando o resultado já está disponível
sincronamente. Para métodos com caminho síncrono frequente (cache hit, validação rápida), prefira
retornar o valor diretamente quando possível.

<details>
<summary>❌ Bad — Task desnecessário quando resultado está em cache</summary>
<br>

```vbnet
Public Async Function FindProductAsync(id As Guid) As Task(Of Product)
    Dim cached As Product = Nothing
    If _cache.TryGetValue(id, cached) Then
        Return cached  ' Task alocada mesmo no caminho síncrono
    End If

    Dim product = Await _repository.FindByIdAsync(id)

    Return product
End Function
```

</details>

<br>

<details>
<summary>✅ Good — retorno síncrono direto quando possível</summary>
<br>

```vbnet
Public Function FindProduct(id As Guid) As Product
    Dim cached As Product = Nothing
    If _cache.TryGetValue(id, cached) Then
        Return cached  ' sem Task, sem alocação
    End If

    Return Nothing  ' caller decide se precisa do async
End Function

Public Async Function FindProductAsync(id As Guid) As Task(Of Product)
    Dim cached = FindProduct(id)
    If cached IsNot Nothing Then Return cached

    Dim product = Await _repository.FindByIdAsync(id)

    Return product
End Function
```

</details>
