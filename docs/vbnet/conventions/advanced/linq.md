# LINQ

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

**LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) em VB.NET tem duas sintaxes: **method syntax** (mesma do C#) e **query syntax** (com palavras-chave `From`, `Where`, `Select`). Prefira method syntax para consistência e capacidade de encadeamento. Query syntax é mais verbosa e se fragmenta quando o encadeamento cresce.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) | API de .NET para transformar coleções de forma declarativa: `Where`, `Select`, `GroupBy`, `OrderBy` |
| **method syntax** (sintaxe de método) | Forma fluente `xs.Where(...).Select(...)`; preferida no projeto sobre query syntax |
| **query syntax** (sintaxe de consulta) | Forma com `From`, `Where`, `Select`; mais verbosa e difícil de encadear |
| **IEnumerable(Of T)** (sequência iterável) | Interface que expõe iteração em memória; cada operador aplica em sequência |
| **IQueryable(Of T)** (sequência consultável) | Interface que constrói árvore de expressão; provedor traduz para SQL |
| **lazy evaluation** (avaliação preguiçosa) | A query só executa no momento da iteração; permite composição |
| **side effect** (efeito colateral) | Mudança de estado externo (log, mutação, I/O); proibido dentro de queries LINQ |
| **deferred execution** (execução adiada) | Resultado materializado só quando enumerado; `ToList()` força execução |

## Method syntax vs query syntax

<details>
<summary>❌ Ruim: query syntax verbosa, difícil de encadear</summary>

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

<details>
<summary>✅ Bom: method syntax, encadeável e consistente</summary>

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

`Select`, `Where` e `Aggregate` são transformações, não devem ter efeitos colaterais. Salvar, logar, notificar dentro de um `Select` torna o código não determinístico e difícil de testar.

<details>
<summary>❌ Ruim: side effect dentro de Select</summary>

```vbnet
Dim processed = purchases.Select(Function(purchase)
    _repository.Save(purchase)      ' side effect: persistência dentro de transformação
    SendNotification(purchase)      ' side effect: I/O dentro de LINQ
    Return MapToDto(purchase)
End Function).ToList()
```

</details>

<details>
<summary>✅ Bom: LINQ para transformação, loop explícito para side effects</summary>

```vbnet
For Each purchase In purchases
    _repository.Save(purchase)
    SendNotification(purchase)
Next

Dim dtos = purchases.Select(Function(purchase) MapToDto(purchase)).ToList()
```

</details>

## Materialização explícita

Consultas LINQ são lazy: executam quando enumeradas. Materializar com `ToList()` ou `ToArray()` no momento certo evita múltiplas execuções da query, garante snapshot dos dados e deixa explícito onde o **I/O** (Input/Output · Entrada/Saída) acontece.

<details>
<summary>❌ Ruim: IEnumerable lazy enumerado múltiplas vezes</summary>

```vbnet
Dim activePurchases = purchases.Where(Function(purchase) purchase.IsActive)  ' não materializado

Dim count = activePurchases.Count()          ' 1ª execução
Dim total = activePurchases.Sum(Function(purchase) purchase.Total)  ' 2ª execução: pode ter resultado diferente
Dim first = activePurchases.FirstOrDefault() ' 3ª execução
```

</details>

<details>
<summary>✅ Bom: materializado uma vez, operações sobre List(Of T)</summary>

```vbnet
Dim activePurchases = purchases.Where(Function(purchase) purchase.IsActive).ToList()

Dim count = activePurchases.Count
Dim total = activePurchases.Sum(Function(purchase) purchase.Total)
Dim first = activePurchases.FirstOrDefault()
```

</details>

## FirstOrDefault vs First

`First` lança `InvalidOperationException` quando a sequência está vazia. `FirstOrDefault` retorna `Nothing`. Na maioria dos casos, o resultado ausente é um fluxo normal de negócio: trate explicitamente com `IsNot Nothing`.

<details>
<summary>❌ Ruim: First lança exceção em fluxo normal</summary>

```vbnet
Dim found = purchases.First(Function(purchase) purchase.Id = purchaseId)  ' InvalidOperationException se não encontrar
ProcessPurchase(found)
```

</details>

<details>
<summary>✅ Bom: FirstOrDefault com guard clause explícita</summary>

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
<summary>✅ Bom: Select para projeção simples, SelectMany para achatar</summary>

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
<summary>❌ Ruim: Max/Min em coleção possivelmente vazia</summary>

```vbnet
Dim highestTotal = purchases.Max(Function(purchase) purchase.Total)  ' InvalidOperationException se vazia
Dim oldestDate = purchases.Min(Function(purchase) purchase.CreatedAt) ' idem
```

</details>

<details>
<summary>✅ Bom: guard ou DefaultIfEmpty antes de Max/Min</summary>

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

Encadeie `OrderBy` com `ThenBy` para ordenação composta. Usar `OrderBy` duas vezes descarta a primeira ordenação: cada `OrderBy` reinicia o critério.

<details>
<summary>❌ Ruim: OrderBy duplo descarta a primeira ordenação</summary>

```vbnet
Dim sorted = purchases _
    .OrderBy(Function(purchase) purchase.CustomerName) _
    .OrderBy(Function(purchase) purchase.CreatedAt)    ' desfaz a ordenação anterior
```

</details>

<details>
<summary>✅ Bom: ThenBy para ordenação secundária</summary>

```vbnet
Dim sorted = purchases _
    .OrderBy(Function(purchase) purchase.CreatedAt) _
    .ThenBy(Function(purchase) purchase.CustomerName) _
    .ToList()
```

</details>
