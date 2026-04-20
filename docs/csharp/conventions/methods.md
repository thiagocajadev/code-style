# Methods

## Orquestrador no topo

O método de entrada declara o fluxo de alto nível — o quê, não o como. Helpers ficam abaixo. O leitor entende o fluxo completo antes de descer aos detalhes.

<details>
<summary>❌ Bad — implementação misturada com orquestração</summary>
<br>

```csharp
public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    if (string.IsNullOrWhiteSpace(request.ProductId))
        return Result<Invoice>.Fail("Product ID required.", "INVALID_PRODUCT_ID");

    var product = await _products.FindByIdAsync(request.ProductId, ct);

    if (product is null)
        return Result<Invoice>.Fail("Product not found.", "NOT_FOUND");

    var order = new Order(request.ProductId, request.Quantity, product.Price * request.Quantity);
    await _orders.SaveAsync(order, ct);
    await _notifications.SendAsync(new OrderCreatedEvent(order.Id), ct);

    var invoice = new Invoice(order.Id, order.Total, DateTime.UtcNow);

    return Result<Invoice>.Success(invoice);
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador declara o fluxo, helpers implementam cada passo</summary>
<br>

```csharp
public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    var validationResult = ValidateRequest(request);
    if (validationResult.IsFailure)
        return Result<Invoice>.Fail(validationResult.Error!.Message, validationResult.Error.Code);

    var product = await _products.FindByIdAsync(request.ProductId, ct);

    if (product is null)
        return Result<Invoice>.Fail("Product not found.", "NOT_FOUND");

    var order = await SaveOrderAsync(request, product, ct);
    await NotifyOrderCreatedAsync(order, ct);

    var invoice = BuildInvoice(order);

    return Result<Invoice>.Success(invoice);
}

private static Result ValidateRequest(OrderRequest request) { ... }
private async Task<Order> SaveOrderAsync(OrderRequest request, Product product, CancellationToken ct) { ... }
private async Task NotifyOrderCreatedAsync(Order order, CancellationToken ct) { ... }
private static Invoice BuildInvoice(Order order) { ... }
```

</details>

## SLA — orquestrador ou implementação

Cada método faz uma coisa: ou orquestra chamadas nomeadas, ou implementa um passo concreto. Nunca os dois. Um método que coordena e também calcula tem duas responsabilidades.

<details>
<summary>❌ Bad — orquestração e implementação no mesmo método</summary>
<br>

```csharp
public async Task<OrderSummary> BuildOrderSummaryAsync(Guid orderId, CancellationToken ct)
{
    var order = await _orders.FindByIdAsync(orderId, ct);

    var subtotal = order.Items.Sum(item => item.Price * item.Quantity);
    var tax = subtotal * 0.1m;
    var total = subtotal + tax;

    var lines = order.Items.Select(item => $"{item.Name} x{item.Quantity}").ToList();
    var summary = new OrderSummary(order.Id, lines, subtotal, tax, total);

    return summary;
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador chama helpers, cada um com uma responsabilidade</summary>
<br>

```csharp
public async Task<OrderSummary> BuildOrderSummaryAsync(Guid orderId, CancellationToken ct)
{
    var order = await _orders.FindByIdAsync(orderId, ct);

    var totals = CalculateTotals(order);
    var summary = BuildSummary(order, totals);

    return summary;
}

private static OrderTotals CalculateTotals(Order order)
{
    var subtotal = order.Items.Sum(item => item.Price * item.Quantity);
    var tax = subtotal * 0.1m;
    var total = subtotal + tax;
    var totals = new OrderTotals(subtotal, tax, total);

    return totals;
}

private static OrderSummary BuildSummary(Order order, OrderTotals totals)
{
    var lines = order.Items.Select(item => $"{item.Name} x{item.Quantity}").ToList();
    var summary = new OrderSummary(order.Id, lines, totals.Subtotal, totals.Tax, totals.Total);

    return summary;
}
```

</details>

## Sem lógica no retorno

O `return` declara o que sai, não calcula. Uma variável nomeada antes do retorno documenta o resultado e mantém o método legível.

<details>
<summary>❌ Bad — lógica e construção inline no return</summary>
<br>

```csharp
public OrderSummary BuildSummary(Order order) =>
    new OrderSummary(
        order.Id,
        order.Items.Select(i => $"{i.Name} x{i.Quantity}").ToList(),
        order.Items.Sum(i => i.Price * i.Quantity)
    );
```

</details>

<br>

<details>
<summary>✅ Good — variável expressiva antes do return</summary>
<br>

```csharp
public OrderSummary BuildSummary(Order order)
{
    var lines = order.Items.Select(item => $"{item.Name} x{item.Quantity}").ToList();
    var total = order.Items.Sum(item => item.Price * item.Quantity);
    var summary = new OrderSummary(order.Id, lines, total);

    return summary;
}
```

</details>

<br>

<details>
<summary>❌ Bad — bare return: pass-through sem nome, o retorno não diz o que é</summary>
<br>

```csharp
public async Task<IEnumerable<Order>> FindPendingOrdersAsync(Guid userId, CancellationToken ct)
    => await _repository.FindByStatusAsync(userId, OrderStatus.Pending, ct);

public async Task<Invoice> ProcessCheckoutAsync(Guid cartId, CancellationToken ct)
    => await _checkoutService.ProcessAsync(cartId, ct);
```

</details>

<br>

<details>
<summary>✅ Good — nome simétrico com o método deixa claro o que sai</summary>
<br>

```csharp
public async Task<IEnumerable<Order>> FindPendingOrdersAsync(Guid userId, CancellationToken ct)
{
    var pendingOrders = await _repository.FindByStatusAsync(userId, OrderStatus.Pending, ct);

    return pendingOrders;
}

public async Task<Invoice> ProcessCheckoutAsync(Guid cartId, CancellationToken ct)
{
    var invoice = await _checkoutService.ProcessAsync(cartId, ct);

    return invoice;
}
```

</details>

<br>

<details>
<summary>❌ Bad — string imensa montada inline: ilegível e sem semântica</summary>
<br>

```csharp
public string BuildShippingLabel(Order order) =>
    $"{order.Customer.FirstName} {order.Customer.LastName}\n{order.Address.Street}, {order.Address.Number}\n{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}\nOrder #{order.Id}";
```

</details>

<br>

<details>
<summary>✅ Good — partes nomeadas antes de montar o resultado</summary>
<br>

```csharp
public string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";
    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return label;
}
```

</details>

## Primary constructors

C# 12 introduziu primary constructors. Use para injeção de dependência — elimina o boilerplate de campo + construtor. Parâmetros do construtor primário ficam acessíveis em todo o corpo da classe.

<details>
<summary>❌ Bad — boilerplate de construtor tradicional</summary>
<br>

```csharp
public class OrderService
{
    private readonly IOrderRepository _repository;
    private readonly INotifier _notifier;

    public OrderService(IOrderRepository repository, INotifier notifier)
    {
        _repository = repository;
        _notifier = notifier;
    }

    public async Task<Result<Order>> SaveOrderAsync(OrderRequest request, CancellationToken ct)
    {
        var order = Order.From(request);
        await _repository.SaveAsync(order, ct);
        await _notifier.SendAsync(order, ct);
        return Result<Order>.Success(order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — primary constructor, DI sem cerimônia</summary>
<br>

```csharp
public class OrderService(IOrderRepository repository, INotifier notifier)
{
    public async Task<Result<Order>> SaveOrderAsync(OrderRequest request, CancellationToken ct)
    {
        var order = Order.From(request);
        await repository.SaveAsync(order, ct);
        await notifier.SendAsync(order, ct);
        return Result<Order>.Success(order);
    }
}
```

</details>

## Baixa densidade visual

Linhas relacionadas ficam juntas — sem linha em branco dentro do mesmo passo. Passos diferentes são separados por exatamente uma linha em branco. Nunca duas linhas em branco consecutivas.

<details>
<summary>❌ Bad — sem separação entre passos ou separação excessiva</summary>
<br>

```csharp
public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    var validationResult = ValidateRequest(request);
    if (validationResult.IsFailure)
        return Result<Invoice>.Fail(validationResult.Error!.Message, validationResult.Error.Code);
    var product = await _products.FindByIdAsync(request.ProductId, ct); // sem separação do bloco anterior
    if (product is null)
        return Result<Invoice>.Fail("Product not found.", "NOT_FOUND");
    var order = await SaveOrderAsync(request, product, ct);


    await NotifyOrderCreatedAsync(order, ct); // duas linhas em branco — ruído
    var invoice = BuildInvoice(order);

    return Result<Invoice>.Success(invoice);
}
```

</details>

<br>

<details>
<summary>✅ Good — um grupo por passo, separados por uma linha em branco</summary>
<br>

```csharp
public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    var validationResult = ValidateRequest(request);
    if (validationResult.IsFailure)
        return Result<Invoice>.Fail(validationResult.Error!.Message, validationResult.Error.Code);

    var product = await _products.FindByIdAsync(request.ProductId, ct);

    if (product is null)
        return Result<Invoice>.Fail("Product not found.", "NOT_FOUND");

    var order = await SaveOrderAsync(request, product, ct);
    await NotifyOrderCreatedAsync(order, ct);

    var invoice = BuildInvoice(order);

    return Result<Invoice>.Success(invoice);
}
```

</details>
