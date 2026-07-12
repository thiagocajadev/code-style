# LINQ em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

**LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) é o jeito de transformar coleções em C#. Você encadeia operadores que descrevem o que quer (`Where`, `Select`, `GroupBy`) e o resultado só é calculado quando alguém percorre a coleção, comportamento chamado **lazy evaluation** (avaliação sob demanda). Essa característica define o bom uso: LINQ serve para consultar e transformar dados. Quando você coloca log, escrita ou chamada externa dentro da query, o momento em que essas ações acontecem passa a depender de quem percorre o resultado, e aí elas podem rodar duas vezes ou nenhuma.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **LINQ** (Language Integrated Query · Consulta Integrada à Linguagem) | API de C# para transformar coleções de forma declarativa: `Where`, `Select`, `GroupBy`, `OrderBy` |
| **IEnumerable\<T\>** (sequência iterável) | Interface que expõe iteração em memória; cada operador aplica em sequência |
| **IQueryable\<T\>** (sequência consultável) | Interface que constrói árvore de expressão; provedor traduz para SQL/remote query |
| **lazy evaluation** (avaliação sob demanda) | A query só executa no momento da iteração (`ToList`, `foreach`); permite composição |
| **side effect** (efeito colateral) | Mudança de estado externo (log, escrita, I/O); proibido dentro de queries LINQ |
| **deferred execution** (execução adiada) | Resultado materializado só quando enumerado; `ToList()`/`ToArray()` força execução |
| **method syntax** (sintaxe de método) | Forma fluente `xs.Where(...).Select(...)`; preferida no projeto sobre query syntax |

<a id="pure-linq"></a>

## A query transforma dados e nada mais

Dentro de um `Select`, escreva só o cálculo que produz o novo valor. Um `_logger.LogInformation` ou um `order.ProcessedAt = ...` ali dentro roda quando a coleção for percorrida, e a coleção pode ser percorrida duas vezes, ou nunca. O log sai duplicado, o campo é escrito de novo, e nada disso aparece lendo a query. Separe: o LINQ produz a lista, e o `foreach` logo abaixo executa as ações.

<details>
<summary>❌ Ruim: side effect dentro de query LINQ</summary>

```csharp
var summaries = orders
    .Where(order => order.IsActive)
    .Select(order =>
    {
        _logger.LogInformation("Processing order {Id}", order.Id); // side effect
        order.ProcessedAt = DateTime.UtcNow;                        // altera estado
        return new OrderSummary(order.Id, order.Total);
    })
    .ToList();
```

</details>

<details>
<summary>✅ Bom: LINQ transforma, foreach executa side effects</summary>

```csharp
var activeOrders = orders
    .Where(order => order.IsActive)
    .ToList();

var summaries = activeOrders
    .Select(order => new OrderSummary(order.Id, order.Total))
    .ToList();

foreach (var order in activeOrders)
    _logger.LogInformation("Processing order {Id}", order.Id);
```

</details>

<a id="select-vs-foreach"></a>

## Quando usar Select e quando usar foreach

`Select` cabe quando cada item de entrada vira exatamente um item de saída. É o caso de transformar pedidos em resumos: dez pedidos, dez resumos. Escrever isso com `foreach` e uma lista que recebe `Add` a cada volta funciona, mas gasta quatro linhas para dizer o que `Select` diz em uma.

`foreach` cabe quando o resultado não acompanha a entrada item a item: somar tudo num total, disparar ações. `Aggregate` também soma, e vale saber que ele existe, mas ler `Aggregate(0m, (acc, o) => acc + ...)` custa mais atenção do que ler um `foreach` com uma variável chamada `totalRevenue`.

<details>
<summary>❌ Ruim: Aggregate onde foreach é mais claro</summary>

```csharp
var totalRevenue = orders.Aggregate(
    0m,
    (accumulated, order) => accumulated + order.Items.Sum(item => item.Price * item.Quantity) // difícil de rastrear
);
```

</details>

<details>
<summary>❌ Ruim: foreach manual para construir lista, sem Select</summary>

```csharp
var summaries = new List<OrderSummary>();
foreach (var order in orders)
{
    var summary = new OrderSummary(order.Id, order.Total, order.CreatedAt);
    summaries.Add(summary); // acumulação manual para transformação 1-para-1: Select é mais direto
}
```

</details>

<details>
<summary>✅ Bom: foreach com variável de acumulação explícita</summary>

```csharp
decimal totalRevenue = 0;
foreach (var order in orders)
foreach (var item in order.Items)
    totalRevenue += item.Price * item.Quantity;
```

</details>

<details>
<summary>✅ Bom: Select para transformação 1-para-1</summary>

```csharp
var summaries = orders
    .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
    .ToList();
```

</details>

<a id="materialization"></a>

## Materializar só no limite

Enquanto a query é um `IEnumerable<T>`, ela é uma receita, e nada foi calculado. `.ToList()` executa a receita e guarda o resultado na memória. Chame `.ToList()` uma vez, no fim, quando for devolver o resultado ou percorrê-lo várias vezes. Cada `.ToList()` no meio do caminho cria uma lista intermediária que existe só para o próximo operador ler e descartar.

<details>
<summary>❌ Ruim: materialização prematura no meio do pipeline</summary>

```csharp
public IEnumerable<OrderSummary> BuildSummaries(IEnumerable<Order> orders, DateTime cutoff)
{
    var activeOrders = orders
        .Where(order => order.IsActive)
        .ToList(); // materializa cedo

    var recentOrders = activeOrders
        .Where(order => order.CreatedAt > cutoff)
        .ToList(); // materializa de novo

    var summaries = recentOrders
        .Select(order => new OrderSummary(order.Id, order.Total));

    return summaries;
}
```

</details>

<details>
<summary>✅ Bom: pipeline lazy, materialização única no limite</summary>

```csharp
public IReadOnlyList<OrderSummary> BuildSummaries(IEnumerable<Order> orders, DateTime cutoff)
{
    var summaries = orders
        .Where(order => order.IsActive)
        .Where(order => order.CreatedAt > cutoff)
        .Select(order => new OrderSummary(order.Id, order.Total))
        .ToList();

    return summaries;
}
```

</details>

<a id="long-chains"></a>

## Cadeias longas viram etapas com nome

Uma cadeia que filtra, agrupa, projeta, ordena e corta os dez primeiros faz cinco coisas, e quem lê precisa segurar as cinco na cabeça até o `ToList()`. Quebre em variáveis com nome: `recentConfirmedOrders`, `customerGroups`, `report`. Cada nome responde uma pergunta que o leitor faria, e a linha densa de projeção vira um método com nome próprio.

<details>
<summary>❌ Ruim: chain monolítica, difícil de rastrear</summary>

```csharp
var report = orders
    .Where(o => o.Status == "CONFIRMED" && o.CreatedAt > DateTime.UtcNow.AddDays(-30))
    .GroupBy(o => o.CustomerId)
    .Select(g => new CustomerReport(g.Key, g.Sum(o => o.Total), g.Count(), g.Max(o => o.CreatedAt))) // linha densa
    .OrderByDescending(r => r.Total)
    .Take(10)
    .ToList();
```

</details>

<details>
<summary>✅ Bom: etapas nomeadas, cada uma com responsabilidade clara</summary>

```csharp
var recentConfirmedOrders = orders
    .Where(order => order.Status == "CONFIRMED")
    .Where(order => order.CreatedAt > DateTime.UtcNow.AddDays(-30));

var customerGroups = recentConfirmedOrders
    .GroupBy(order => order.CustomerId);

var report = customerGroups
    .Select(group => BuildCustomerReport(group))
    .OrderByDescending(customerReport => customerReport.Total)
    .Take(10)
    .ToList();

return report;

static CustomerReport BuildCustomerReport(IGrouping<Guid, Order> group)
{
    decimal total = 0;

    foreach (var order in group)
        total += order.Total;

    var customerReport = new CustomerReport(
        group.Key,
        total,
        group.Count(),
        group.Max(order => order.CreatedAt)
    );

    return customerReport;
}
```

</details>

<a id="left-join"></a>

## Left join com coleções em memória

`Join` devolve só os pares que casaram: um pedido sem pagamento some do resultado, e um relatório de inadimplência construído assim mostra zero. Para manter todos os itens da esquerda e aceitar a ausência do lado direito, use `GroupJoin` seguido de `SelectMany` com `DefaultIfEmpty()`. O pagamento vem `null` quando não existe, e o `?.Amount` trata esse caso.

> Para queries EF Core 10+, use o operador `LeftJoin` nativo. Veja [Entity Framework](../../setup/entity-framework.md#left-join).

<details>
<summary>❌ Ruim: Join exclui registros sem correspondência</summary>

```csharp
var result = orders
    .Join(
        payments,
        order => order.Id,
        payment => payment.OrderId,
        (order, payment) => new OrderPaymentView(order.Id, order.Total, payment.Amount) // orders sem payment são excluídas
    )
    .ToList();
```

</details>

<details>
<summary>✅ Bom: GroupJoin + SelectMany preserva todos os registros do lado esquerdo</summary>

```csharp
var result = orders
    .GroupJoin(
        payments,
        order => order.Id,
        payment => payment.OrderId,
        (order, matchedPayments) => new { order, matchedPayments }
    )
    .SelectMany(
        grouped => grouped.matchedPayments.DefaultIfEmpty(),
        (grouped, payment) => new OrderPaymentView(
            grouped.order.Id,
            grouped.order.Total,
            payment?.Amount        // null quando não há pagamento correspondente
        )
    )
    .ToList();
```

</details>
