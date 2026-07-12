# Performance em VB.NET

> Escopo: VB.NET. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

As técnicas desta página valem no **hot path**, o trecho que roda milhares de vezes por requisição ou em volume alto. Fora dele, escreva o código mais legível e siga em frente: trocar um `For Each` por um `For` indexado em um laço de dez itens economiza microssegundos e deixa o laço mais difícil de ler. E meça antes de mexer, porque o trecho lento quase nunca é o que a intuição aponta.

Quase todo ganho aqui vem de uma coisa só: alocar menos memória. Cada objeto criado no **heap** dá trabalho ao **GC** depois, e alocação dentro de laço multiplica esse trabalho pelo número de voltas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho quente) | Trecho executado em volume ou frequência alta; o único lugar onde a otimização compensa o custo em legibilidade |
| **heap** (área de memória gerenciada) | Onde os objetos criados com `New` são guardados |
| **GC** (Garbage Collector · Coletor de Lixo) | Componente que libera a memória dos objetos sem uso; para a aplicação por instantes enquanto trabalha |
| **allocation** (alocação) | Reserva de memória no heap; `New`, boxing e concatenação de string alocam |
| **StringBuilder** (montador de strings) | Tipo que acumula texto em um buffer reaproveitado; substitui o `&` dentro do laço |
| **boxing** (encaixotamento) | Cópia de um tipo de valor para o heap ao guardá-lo em um `Object` |
| **HashSet(Of T)** (conjunto com busca por hash) | Coleção que responde "contém este item?" em tempo constante |
| **profiling** (medição de desempenho) | Medir onde o tempo é gasto, com números, antes de mudar o código |

<a id="stringbuilder"></a>

## StringBuilder para texto montado em laço

String no .NET não pode ser alterada depois de criada. Cada `summary &= ...` dentro do laço cria uma string nova, copia todo o conteúdo anterior para ela e descarta a antiga. Com mil itens, são mil strings criadas e jogadas fora, e o custo da cópia cresce a cada volta, porque o texto acumulado é maior. `StringBuilder` escreve em um buffer que ele reaproveita, e monta a string final uma única vez, no `ToString()`.

<details>
<summary>❌ Ruim: nova string alocada por iteração</summary>

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

<details>
<summary>✅ Bom: StringBuilder reutiliza o buffer</summary>

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

<a id="for-vs-foreach"></a>

## For indexado em array dentro do hot path

`For Each` pede um enumerador à coleção e chama `MoveNext` a cada volta. Em um array percorrido milhares de vezes por segundo, esse enumerador vira alocação e chamada extra sem contrapartida: o `For` com índice lê a posição direto. Fora do hot path, fique com o `For Each`, que diz melhor o que o laço faz.

<details>
<summary>❌ Ruim: For Each cria enumerador por iteração em hot path</summary>

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

<details>
<summary>✅ Bom: For com índice em array: sem enumerador</summary>

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

<a id="boxing"></a>

## Boxing manda o tipo de valor para o heap

`Integer`, `Decimal` e `Boolean` vivem na pilha e não custam alocação. Guardá-los em um `Object`, que é o que um `ArrayList` faz com cada item, obriga o runtime a criar um objeto no heap para embrulhar aquele valor. Em uma coleção de dez mil números, são dez mil objetos criados na entrada e dez mil conversões na leitura. `List(Of Decimal)` guarda os valores como valores, e o boxing não acontece.

<details>
<summary>❌ Ruim: ArrayList usa Object, boxing por item</summary>

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

<details>
<summary>✅ Bom: List(Of Decimal) sem boxing</summary>

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

<a id="hashset-contains"></a>

## HashSet quando a pergunta é "contém este item?"

`List(Of T).Contains` compara item por item até achar o que procura, então o custo cresce junto com a lista. Dentro de um `Where` que roda para cada produto do catálogo, a lista inteira é percorrida a cada produto. `HashSet(Of T).Contains` calcula o hash do item e vai direto à posição, em tempo que não depende do tamanho do conjunto. Para uma lista fixa consultada com frequência, declare o `HashSet` uma vez no campo e reaproveite.

<details>
<summary>❌ Ruim: List.Contains percorre tudo a cada chamada</summary>

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

<details>
<summary>✅ Bom: HashSet.Contains resolve em O(1)</summary>

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

<a id="sync-path"></a>

## O caminho que já tem a resposta não precisa de Task

Um método `Async` aloca uma `Task` em toda chamada, inclusive quando o valor já estava no cache e nada foi aguardado. Em uma busca que acerta o cache na maior parte das vezes, essa `Task` é alocação pura, repetida a cada requisição. Separe o caminho síncrono em um método que devolve o valor direto, e deixe o método `Async` para quando o dado precisar mesmo vir do repositório.

<details>
<summary>❌ Ruim: Task desnecessário quando resultado está em cache</summary>

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

<details>
<summary>✅ Bom: retorno síncrono direto quando possível</summary>

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
