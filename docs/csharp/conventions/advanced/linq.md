# LINQ

> Escopo: C#. Idiomas específicos deste ecossistema.

**LINQ** é a linguagem de transformação de coleções em C#. O estilo é declarativo: operadores encadeados descrevem a transformação, e a query só executa quando o resultado é percorrido (**lazy evaluation**). Vale como query engine (sobre `IEnumerable`, `IQueryable`), não como orquestrador de efeitos. Manter queries puras torna o resultado previsível e testável.

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

## LINQ puro: sem side effects

LINQ é para transformação de dados: `Where`, `Select`, `GroupBy`, `OrderBy`. Nunca para side effects. Logging, alteração de estado e **I/O** (Input/Output · Entrada/Saída) dentro de uma query tornam o comportamento imprevisível e difícil de testar.

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

## Select vs foreach

`Select` é para transformação 1-para-1: cada elemento de entrada produz exatamente um de saída. `foreach` é para acumulação, side effects ou lógica que não mapeia 1-para-1.

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

## Materialização nos limites

`IEnumerable<T>` é lazy: a query só executa quando iterada. Materialize com `.ToList()` apenas nos limites: ao retornar para o chamador ou ao passar para outro método que itera múltiplas vezes. Materialização prematura desperdiça memória.

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

## Encadeamento excessivo

Chains longas sacrificam legibilidade. Quando um pipeline mistura filtro, agrupamento e projeção, quebre em etapas nomeadas, cada uma com uma responsabilidade.

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

## Left join (LINQ in-memory)

`GroupJoin` + `SelectMany` com `DefaultIfEmpty()` é o padrão para left join em LINQ in-memory. Todo elemento do lado esquerdo é preservado; o lado direito pode ser `null` quando não há correspondência.

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
