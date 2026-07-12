# Segurança contra nulos em VB.NET

> Escopo: VB.NET. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

VB.NET escreve a ausência de valor como **Nothing**. Com **Option Strict On** e **Option Infer On**, o compilador barra boa parte dos acessos indevidos ainda na compilação, e o resto continua por conta de quem escreve o código. As seções abaixo cobrem os casos que o compilador deixa passar: o tipo de valor que finge ter valor, a coleção que volta nula e o construtor que aceita uma dependência ausente sem reclamar.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Nothing** (ausência de valor em VB.NET) | O `null` do C# escrito em VB: referência ausente, ou valor padrão de um tipo de valor |
| **Option Strict On** (modo estrito de tipos) | Diretiva que proíbe conversão implícita perigosa; ligada em todo projeto |
| **Option Infer On** (inferência de tipo local) | Deixa o compilador deduzir o tipo em `Dim x = ...` quando o lado direito já diz qual é |
| **Is Nothing** (operador nativo de comparação) | Operador do .NET para verificar se a referência está ausente |
| **IsNothing()** (função de compatibilidade VB6) | Função antiga com o mesmo resultado; herança do Basic clássico |
| **NullReferenceException** (exceção de referência nula) | Erro em execução ao usar algo que está `Nothing` |
| **Nullable(Of T)** (tipo de valor que aceita ausência) | Embrulho para tipos de valor (`Integer?`, `Boolean?`, `Date?`) que permite representar "sem valor" |
| **guard clause** (cláusula de proteção) | Verificação no topo do método que interrompe o fluxo quando o argumento não serve |
| **DBNull** (nulo do banco de dados) | Como o ADO.NET representa o `NULL` do banco; é um valor diferente de `Nothing` |

<a id="is-nothing"></a>

## Use Is Nothing, o operador da plataforma

`Is Nothing` e `IsNot Nothing` são os operadores do .NET para verificar referência ausente. `IsNothing()` é uma função de compatibilidade que veio do VB6 e chega ao mesmo resultado, com duas desvantagens: ela recebe o valor como `Object`, o que embrulha tipos de valor sem necessidade, e sinaliza para quem lê o código que aquele arquivo ainda pensa em Basic clássico.

<details>
<summary>❌ Ruim: IsNothing() é legado do VB6</summary>

```vbnet
If IsNothing(order) Then Return
If IsNothing(customer.Address) Then Return

Dim name As String = If(IsNothing(user.Name), "Unknown", user.Name)
```

</details>

<details>
<summary>✅ Bom: Is Nothing / IsNot Nothing como operadores nativos</summary>

```vbnet
If order Is Nothing Then Return
If customer.Address Is Nothing Then Return

Dim name As String = If(user.Name IsNot Nothing, user.Name, "Unknown")
```

</details>

<a id="nullable-value-types"></a>

## Nullable(Of T) em vez de valor sentinela

`Integer`, `Decimal`, `Date` e `Boolean` sempre têm algum valor: zero, `Date.MinValue`, `False`. Isso cria uma ambiguidade concreta: um `Discount` igual a zero pode significar "não tem desconto" ou "o desconto é de zero por cento", e o código não tem como distinguir os dois. `Nullable(Of T)`, escrito `Decimal?`, acrescenta o estado "sem valor". A leitura passa por `.HasValue` antes de `.Value`.

<details>
<summary>❌ Ruim: valor sentinela para representar ausência</summary>

```vbnet
Public Class OrderItem
    Public Property Discount As Decimal  ' 0 significa "sem desconto" ou "desconto zero"?
    Public Property DeliveredAt As Date  ' Date.MinValue como sentinela de "não entregue"
End Class

Public Function HasDiscount(item As OrderItem) As Boolean
    Return item.Discount <> 0D  ' valor mágico: ambíguo
End Function
```

</details>

<details>
<summary>✅ Bom: Nullable(Of T) expressa ausência explicitamente</summary>

```vbnet
Public Class OrderItem
    Public Property Discount As Decimal?      ' Nothing = sem desconto; 0D = desconto zero explícito
    Public Property DeliveredAt As Date?      ' Nothing = não entregue
End Class

Public Function HasDiscount(item As OrderItem) As Boolean
    Return item.Discount.HasValue AndAlso item.Discount.Value > 0D
End Function

Public Function GetDeliveryStatus(item As OrderItem) As String
    If Not item.DeliveredAt.HasValue Then Return "Pending"

    Dim deliveryDate As String = item.DeliveredAt.Value.ToString("dd/MM/yyyy")
    Return $"Delivered on {deliveryDate}"
End Function
```

</details>

<a id="if-null-coalescing"></a>

## If() de dois argumentos entrega o valor padrão

O `If()` com dois argumentos devolve o primeiro quando ele tem valor, e o segundo quando o primeiro é `Nothing`. É o que o C# escreve como `??`. Ele substitui o bloco `If/Else` de seis linhas que existia só para preencher um valor padrão.

Combinado com o `?.`, que interrompe a navegação quando encontra `Nothing`, a linha resolve o caminho inteiro: `If(user.Address?.City, "Unknown")` devolve `"Unknown"` tanto quando o endereço está ausente quanto quando a cidade está.

<details>
<summary>❌ Ruim: If/Else verboso para default de null</summary>

```vbnet
Dim city As String
If user.Address IsNot Nothing Then
    city = user.Address.City
Else
    city = "Unknown"
End If

Dim discount As Decimal
If product.Discount.HasValue Then
    discount = product.Discount.Value
Else
    discount = 0D
End If
```

</details>

<details>
<summary>✅ Bom: If() de dois argumentos como null-coalescing</summary>

```vbnet
Dim city As String = If(user.Address?.City, "Unknown")

Dim discount As Decimal = If(product.Discount, 0D)
```

</details>

<a id="collections-never-null"></a>

## Coleção vazia no lugar de coleção ausente

Um método que devolve coleção devolve a lista vazia quando não encontra nada. Devolver `Nothing` transfere o problema para quem chama: cada `For Each` do sistema passa a precisar de um `If` em volta, e o primeiro lugar onde alguém esquecer esse `If` lança `NullReferenceException`. A lista vazia atravessa o `For Each` sem executar nenhuma volta, que é exatamente o comportamento desejado.

<details>
<summary>❌ Ruim: Nothing em coleção força defesa em cada caller</summary>

```vbnet
Public Function FindOrdersByUser(userId As Guid) As List(Of Order)
    Dim orders = _repository.FindByUser(userId)
    If orders Is Nothing OrElse orders.Count = 0 Then Return Nothing

    Return orders
End Function

' caller precisa verificar antes de iterar
Dim orders = _service.FindOrdersByUser(userId)
If orders IsNot Nothing Then
    For Each order In orders
        ProcessOrder(order)
    Next
End If
```

</details>

<details>
<summary>✅ Bom: lista vazia como estado neutro, sem Nothing</summary>

```vbnet
Public Function FindOrdersByUser(userId As Guid) As List(Of Order)
    Dim orders = _repository.FindByUser(userId)
    If orders Is Nothing Then Return New List(Of Order)()

    Return orders
End Function

' caller itera diretamente: sem verificação
Dim orders = _service.FindOrdersByUser(userId)
For Each order In orders
    ProcessOrder(order)
Next
```

</details>

<a id="constructor-guard"></a>

## O construtor recusa a dependência ausente

Um construtor que aceita `Nothing` cria um objeto quebrado que só vai falhar mais tarde, dentro de algum método, longe de quem passou o argumento errado. O `ArgumentNullException` no construtor faz o erro aparecer no ponto da montagem, com o nome do parâmetro que faltou. `NameOf(repository)` escreve esse nome e continua correto depois de uma renomeação.

<details>
<summary>❌ Ruim: construtor aceita Nothing silenciosamente</summary>

```vbnet
Public Class OrderService
    Private ReadOnly _repository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(repository As IOrderRepository, notifier As INotifier)
        _repository = repository  ' Nothing passa sem erro
        _notifier = notifier
    End Sub
End Class
```

</details>

<details>
<summary>✅ Bom: guard clause no construtor</summary>

```vbnet
Public Class OrderService
    Private ReadOnly _repository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(repository As IOrderRepository, notifier As INotifier)
        If repository Is Nothing Then Throw New ArgumentNullException(NameOf(repository))
        If notifier Is Nothing Then Throw New ArgumentNullException(NameOf(notifier))

        _repository = repository
        _notifier = notifier
    End Sub
End Class
```

</details>
