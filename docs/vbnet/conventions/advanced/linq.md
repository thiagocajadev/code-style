# LINQ em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

**LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) é a forma do .NET de filtrar, transformar e agrupar coleções. Em VB.NET ele aparece em duas escritas: a **method syntax**, com chamadas encadeadas (`purchases.Where(...).Select(...)`), e a **query syntax**, com as palavras `From`, `Where` e `Select`. Este guia usa method syntax, que é a mesma do C# e continua legível quando a consulta ganha mais um passo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) | API do .NET para transformar coleções com `Where`, `Select`, `GroupBy` e `OrderBy` |
| **method syntax** (sintaxe de método) | Escrita encadeada `xs.Where(...).Select(...)`; a adotada no projeto |
| **query syntax** (sintaxe de consulta) | Escrita com `From`, `Where` e `Select`; ocupa mais linhas e encadeia com dificuldade |
| **IEnumerable(Of T)** (sequência iterável) | Interface de iteração em memória; cada operador roda item a item |
| **IQueryable(Of T)** (sequência consultável) | Interface que monta uma árvore de expressão para o provedor traduzir em SQL |
| **lazy evaluation** (avaliação preguiçosa) | A consulta só roda quando alguém percorre o resultado |
| **deferred execution** (execução adiada) | Outro nome do mesmo comportamento; `ToList()` força a execução na hora |
| **side effect** (efeito colateral) | Alteração de estado externo (log, escrita no banco, I/O) dentro da consulta |

<a id="method-syntax"></a>

## Method syntax como escrita padrão

A method syntax encadeia chamadas, então acrescentar um filtro ou uma ordenação é acrescentar uma linha. A query syntax obriga a reescrever o bloco quando a consulta cresce, e o resultado precisa ser embrulhado em parênteses para receber `.ToList()` ou `.Count()`.

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

<a id="pure-linq"></a>

## A consulta transforma dados e nada mais

`Select`, `Where` e `Aggregate` existem para produzir um novo resultado a partir da coleção. Salvar no banco, mandar e-mail ou escrever log dentro deles esbarra na execução adiada: o corpo do `Select` só roda quando alguém percorre o resultado. Se ninguém percorrer, o e-mail nunca sai; se duas partes do código percorrerem, ele sai duas vezes. Deixe o trabalho com efeito em um `For Each`, onde a hora de rodar está escrita no código.

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

<a id="materialization"></a>

## Materialize o resultado com ToList antes de reusá-lo

A consulta guardada em uma variável ainda não rodou. Cada `Count()`, `Sum()` ou `FirstOrDefault()` chamado sobre ela percorre a coleção de novo, e quando a origem é banco de dados, cada passagem é uma nova ida ao servidor. Chamar `ToList()` uma vez executa a consulta, guarda o resultado em memória e deixa claro no código o ponto em que o **I/O** (Input/Output · Entrada/Saída) acontece.

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

<a id="first-or-default"></a>

## FirstOrDefault quando a busca pode não achar nada

`First` lança `InvalidOperationException` quando nenhum item casa com o filtro. Buscar um registro que pode não existir é fluxo comum de negócio, então use `FirstOrDefault`, que devolve `Nothing`, e trate a ausência com uma cláusula de proteção logo abaixo.

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

<a id="select-vs-selectmany"></a>

## Select projeta um item, SelectMany junta as listas de dentro

`Select` devolve um item para cada item de entrada. `SelectMany` serve quando cada item guarda uma lista dentro dele: ele junta todas essas listas em uma só. Um `Select` sobre `purchase.Items` devolveria uma lista de listas; o `SelectMany` devolve todos os itens de todas as compras em sequência.

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

<a id="aggregate-on-empty"></a>

## Max e Min quebram na coleção vazia

Os agregadores discordam entre si quando a coleção está vazia. `Sum` devolve zero, que é a resposta esperada. `Max` e `Min` lançam `InvalidOperationException`, porque não existe maior nem menor elemento em uma coleção sem elementos. Confirme com `Any()` antes de chamar, ou passe um valor de reserva com `DefaultIfEmpty`.

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

<a id="orderby-thenby"></a>

## O segundo critério de ordenação é ThenBy

Cada `OrderBy` recomeça a ordenação do zero. Dois `OrderBy` encadeados guardam apenas o critério do último, e a ordenação anterior se perde sem nenhum aviso do compilador. O critério de desempate entra com `ThenBy`.

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
