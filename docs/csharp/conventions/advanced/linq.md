# LINQ

## LINQ puro: sem side effects

LINQ é para transformação de dados: `Where`, `Select`, `GroupBy`, `OrderBy`. Nunca para side effects. Logging, mutação e I/O dentro de uma query tornam o comportamento imprevisível e difícil de testar.

<details>
<summary>❌ Bad — side effect dentro de query LINQ</summary>
<br>

```csharp
var summaries = orders
    .Where(order => order.IsActive)
    .Select(order =>
    {
        _logger.LogInformation("Processing order {Id}", order.Id); // side effect
        order.ProcessedAt = DateTime.UtcNow;                        // mutação
        return new OrderSummary(order.Id, order.Total);
    })
    .ToList();
```

</details>

<br>

<details>
<summary>✅ Good — LINQ transforma, foreach executa side effects</summary>
<br>

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
<summary>❌ Bad — Aggregate onde foreach é mais claro</summary>
<br>

```csharp
var totalRevenue = orders.Aggregate(
    0m,
    (accumulated, order) => accumulated + order.Items.Sum(item => item.Price * item.Quantity) // difícil de rastrear
);
```

</details>

<br>

<details>
<summary>❌ Bad — foreach manual para construir lista, sem Select</summary>
<br>

```csharp
var summaries = new List<OrderSummary>();
foreach (var order in orders)
{
    var summary = new OrderSummary(order.Id, order.Total, order.CreatedAt);
    summaries.Add(summary); // acumulação manual para transformação 1-para-1 — Select é mais direto
}
```

</details>

<br>

<details>
<summary>✅ Good — foreach com variável de acumulação explícita</summary>
<br>

```csharp
decimal totalRevenue = 0;
foreach (var order in orders)
foreach (var item in order.Items)
    totalRevenue += item.Price * item.Quantity;
```

</details>

<br>

<details>
<summary>✅ Good — Select para transformação 1-para-1</summary>
<br>

```csharp
var summaries = orders
    .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
    .ToList();
```

</details>

## Materialização nas fronteiras

`IEnumerable<T>` é lazy: a query só executa quando iterada. Materialize com `.ToList()` apenas nas fronteiras: ao retornar para o chamador ou ao passar para outro método que itera múltiplas vezes. Materialização prematura desperdiça memória.

<details>
<summary>❌ Bad — materialização prematura no meio do pipeline</summary>
<br>

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

<br>

<details>
<summary>✅ Good — pipeline lazy, materialização única na fronteira</summary>
<br>

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
<summary>❌ Bad — chain monolítica, difícil de rastrear</summary>
<br>

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

<br>

<details>
<summary>✅ Good — etapas nomeadas, cada uma com responsabilidade clara</summary>
<br>

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
<summary>❌ Bad — Join exclui registros sem correspondência</summary>
<br>

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

<br>

<details>
<summary>✅ Good — GroupJoin + SelectMany preserva todos os registros do lado esquerdo</summary>
<br>

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
