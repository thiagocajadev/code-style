# LINQ

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

LINQ em VB.NET tem duas sintaxes: method syntax (mesma do C#) e query syntax (com palavras-chave `From`, `Where`, `Select`). Prefira method syntax para consistência e capacidade de encadeamento — query syntax é mais verbosa e se fragmenta quando o encadeamento cresce.

## Method syntax vs query syntax

<details>
<summary>❌ Bad — query syntax verbosa, difícil de encadear</summary>
<br>

```vbnet
' simples, mas não escala bem com múltiplas operações
Dim expiredPurchases = From purchase In purchases
                       Where purchase.ExpiresAt < DateTime.UtcNow AndAlso purchase.Status = "PENDING"
                       Select purchase

Dim totals = From purchase In purchases
             Where purchase.IsActive
             Select purchase.Total
```

</details>

<br>

<details>
<summary>✅ Good — method syntax, encadeável e consistente</summary>
<br>

```vbnet
Dim expiredPurchases = purchases _
    .Where(Function(purchase) purchase.ExpiresAt < DateTime.UtcNow AndAlso purchase.Status = "PENDING") _
    .ToList()

Dim totals = purchases _
    .Where(Function(purchase) purchase.IsActive) _
    .Select(Function(purchase) purchase.Total) _
    .ToList()
```

</details>

## LINQ puro: sem side effects

`Select`, `Where` e `Aggregate` são transformações — não devem ter efeitos colaterais. Salvar, logar, notificar dentro de um `Select` torna o código não determinístico e difícil de testar.

<details>
<summary>❌ Bad — side effect dentro de Select</summary>
<br>

```vbnet
Dim processed = purchases.Select(Function(purchase)
    _repository.Save(purchase)      ' side effect: persistência dentro de transformação
    SendNotification(purchase)      ' side effect: I/O dentro de LINQ
    Return MapToDto(purchase)
End Function).ToList()
```

</details>

<br>

<details>
<summary>✅ Good — LINQ para transformação, loop explícito para side effects</summary>
<br>

```vbnet
For Each purchase In purchases
    _repository.Save(purchase)
    SendNotification(purchase)
Next

Dim dtos = purchases.Select(Function(purchase) MapToDto(purchase)).ToList()
```

</details>

## Materialização explícita

Consultas LINQ são lazy: executam quando enumeradas. Materializar com `ToList()` ou `ToArray()` no momento certo evita múltiplas execuções da query, garante snapshot dos dados e deixa explícito onde o **I/O** (Input/Output, Entrada/Saída) acontece.

<details>
<summary>❌ Bad — IEnumerable lazy enumerado múltiplas vezes</summary>
<br>

```vbnet
Dim activePurchases = purchases.Where(Function(purchase) purchase.IsActive)  ' não materializado

Dim count = activePurchases.Count()          ' 1ª execução
Dim total = activePurchases.Sum(Function(purchase) purchase.Total)  ' 2ª execução — pode ter resultado diferente
Dim first = activePurchases.FirstOrDefault() ' 3ª execução
```

</details>

<br>

<details>
<summary>✅ Good — materializado uma vez, operações sobre List(Of T)</summary>
<br>

```vbnet
Dim activePurchases = purchases.Where(Function(purchase) purchase.IsActive).ToList()

Dim count = activePurchases.Count
Dim total = activePurchases.Sum(Function(purchase) purchase.Total)
Dim first = activePurchases.FirstOrDefault()
```

</details>

## FirstOrDefault vs First

`First` lança `InvalidOperationException` quando a sequência está vazia. `FirstOrDefault` retorna `Nothing`. Na maioria dos casos, o resultado ausente é um fluxo normal de negócio — trate explicitamente com `IsNot Nothing`.

<details>
<summary>❌ Bad — First lança exceção em fluxo normal</summary>
<br>

```vbnet
Dim found = purchases.First(Function(purchase) purchase.Id = purchaseId)  ' InvalidOperationException se não encontrar
ProcessPurchase(found)
```

</details>

<br>

<details>
<summary>✅ Good — FirstOrDefault com guard clause explícita</summary>
<br>

```vbnet
Dim found = purchases.FirstOrDefault(Function(purchase) purchase.Id = purchaseId)
If found Is Nothing Then
    Dim notFound = OperationResult.Fail("Purchase not found.", "NOT_FOUND")
    Return notFound
End If

ProcessPurchase(found)
```

</details>

## Select vs SelectMany

`Select` projeta um item para um item. `SelectMany` achata uma sequência de sequências em uma sequência plana.

<details>
<summary>✅ Good — Select para projeção simples, SelectMany para achatar</summary>
<br>

```vbnet
' Select: Purchase -> PurchaseDto
Dim dtos = purchases.Select(Function(purchase) MapToDto(purchase)).ToList()

' SelectMany: Purchase[] -> PurchaseItem[] (todos os itens de todos os pedidos)
Dim allItems = purchases.SelectMany(Function(purchase) purchase.Items).ToList()

' SelectMany com projeção: item com contexto do pedido
Dim itemsWithPurchase = purchases _
    .SelectMany(
        Function(purchase) purchase.Items,
        Function(purchase, item) New With {.Purchase = purchase, .Item = item}
    ) _
    .ToList()
```

</details>

## Aggregate e Sum com segurança

`Sum`, `Max`, `Min` em coleções vazias se comportam de forma diferente dependendo do tipo. `Sum` retorna 0, `Max` e `Min` lançam exceção. Verifique antes ou use `DefaultIfEmpty`.

<details>
<summary>❌ Bad — Max/Min em coleção possivelmente vazia</summary>
<br>

```vbnet
Dim highestTotal = purchases.Max(Function(purchase) purchase.Total)  ' InvalidOperationException se vazia
Dim oldestDate = purchases.Min(Function(purchase) purchase.CreatedAt) ' idem
```

</details>

<br>

<details>
<summary>✅ Good — guard ou DefaultIfEmpty antes de Max/Min</summary>
<br>

```vbnet
If Not purchases.Any() Then Return Decimal.Zero
Dim highestTotal = purchases.Max(Function(purchase) purchase.Total)

' ou com DefaultIfEmpty
Dim oldestDate = purchases _
    .Select(Function(purchase) purchase.CreatedAt) _
    .DefaultIfEmpty(DateTime.MinValue) _
    .Min()
```

</details>

## OrderBy e ThenBy

Encadeie `OrderBy` com `ThenBy` para ordenação composta. Usar `OrderBy` duas vezes descarta a primeira ordenação — cada `OrderBy` reinicia o critério.

<details>
<summary>❌ Bad — OrderBy duplo descarta a primeira ordenação</summary>
<br>

```vbnet
Dim sorted = purchases _
    .OrderBy(Function(purchase) purchase.CustomerName) _
    .OrderBy(Function(purchase) purchase.CreatedAt)    ' desfaz a ordenação anterior
```

</details>

<br>

<details>
<summary>✅ Good — ThenBy para ordenação secundária</summary>
<br>

```vbnet
Dim sorted = purchases _
    .OrderBy(Function(purchase) purchase.CreatedAt) _
    .ThenBy(Function(purchase) purchase.CustomerName) _
    .ToList()
```

</details>
