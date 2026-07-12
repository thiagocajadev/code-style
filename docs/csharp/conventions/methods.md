# Métodos em C#

Um método bem escrito responde a uma pergunta só, e responde no nível certo de detalhe. O método público de entrada, o **orquestrador**, funciona como o sumário da operação: ele nomeia os passos e não mostra como cada passo acontece. Logo abaixo dele ficam os **helpers** (métodos auxiliares privados), na mesma ordem em que foram chamados, para o leitor descer ao detalhe só quando quiser.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **orchestrator** (orquestrador) | Método público de entrada que descreve o fluxo em alto nível; chama helpers em sequência |
| **helper** (método auxiliar) | Método privado abaixo do orquestrador, com responsabilidade única e nome de domínio |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | Cada método opera num único nível; misturar passos altos e baixos prejudica leitura |
| **single responsibility** (responsabilidade única) | Um método faz uma coisa; o nome descreve essa coisa por completo |
| **side effect** (efeito colateral) | Alteração de estado externo, I/O, log; deixar explícito no nome ou na assinatura |
| **pure function** (função pura) | Método sem side effects; saída depende só dos argumentos; mais fácil de testar |
| **expression-bodied member** (membro com corpo de expressão) | Sintaxe `=>` para métodos curtos com retorno único |

<a id="orchestrator-on-top"></a>

## Orquestrador no topo

O método de entrada conta o que a operação faz, na sequência em que ela acontece: valida o pedido, busca o produto, grava, notifica, monta a nota. Cada um desses passos vira uma chamada com nome próprio, e a implementação de cada um fica logo abaixo. Quem abre o arquivo entende a operação inteira lendo as primeiras vinte linhas, e desce ao detalhe do passo que interessa.

<details>
<summary>❌ Ruim: implementação misturada com orquestração</summary>

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

<details>
<summary>✅ Bom: orquestrador declara o fluxo, helpers implementam cada passo</summary>

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

<a id="single-level-of-abstraction"></a>

## Um nível de abstração por método

Cada método escolhe um papel: ou ele coordena chamadas com nome, ou ele executa um passo concreto. O método que faz as duas coisas mistura a altura da leitura. `BuildOrderSummaryAsync` chama o repositório, o que é alto nível, e no meio calcula imposto multiplicando por `0.1m`, o que é detalhe de cálculo. Quem lê troca de altura no meio do método e perde o fio da operação. Extraia o cálculo para um helper com nome (`CalculateTotals`) e o método de entrada volta a ser só a sequência de passos.

<details>
<summary>❌ Ruim: orquestração e implementação no mesmo método</summary>

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

<details>
<summary>✅ Bom: orquestrador chama helpers, cada um com uma responsabilidade</summary>

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

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

O `return` anuncia o que sai do método. Quando ele também monta o objeto, soma a lista e formata o texto, a última linha vira a mais densa do arquivo, justo onde o leitor esperava a resposta. Guarde o resultado numa variável com nome antes de devolvê-lo. O nome dessa variável é o que documenta o retorno, e o `return` volta a ter uma palavra só.

Vale também para o retorno que só repassa a chamada de outro objeto. `=> await _repository.FindByStatusAsync(...)` devolve algo sem nunca nomear o que é. Uma linha a mais, com `var pendingOrders = ...`, e o leitor sabe o que sai sem consultar a assinatura.

<details>
<summary>❌ Ruim: lógica e construção inline no return</summary>

```csharp
public OrderSummary BuildSummary(Order order) =>
    new OrderSummary(
        order.Id,
        order.Items.Select(i => $"{i.Name} x{i.Quantity}").ToList(),
        order.Items.Sum(i => i.Price * i.Quantity)
    );
```

</details>

<details>
<summary>❌ Ruim: bare return: pass-through sem nome, o retorno não diz o que é</summary>

```csharp
public async Task<IEnumerable<Order>> FindPendingOrdersAsync(Guid userId, CancellationToken ct)
    => await _repository.FindByStatusAsync(userId, OrderStatus.Pending, ct);

public async Task<Invoice> ProcessCheckoutAsync(Guid cartId, CancellationToken ct)
    => await _checkoutService.ProcessAsync(cartId, ct);
```

</details>

<details>
<summary>❌ Ruim: string imensa montada inline: ilegível e sem semântica</summary>

```csharp
public string BuildShippingLabel(Order order) =>
    $"{order.Customer.FirstName} {order.Customer.LastName}\n{order.Address.Street}, {order.Address.Number}\n{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}\nOrder #{order.Id}";
```

</details>

<details>
<summary>✅ Bom: variável expressiva antes do return</summary>

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

<details>
<summary>✅ Bom: nome simétrico com o método deixa claro o que sai</summary>

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

<details>
<summary>✅ Bom: partes nomeadas antes de montar o resultado</summary>

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

<a id="primary-constructors"></a>

## Construtor primário para injeção de dependência

O C# 12 permite declarar os parâmetros do construtor ao lado do nome da classe, e usá-los direto no corpo. Isso apaga o trio que toda classe injetada repetia: o campo privado, o parâmetro do construtor e a linha que copia um no outro. Com o construtor primário, `OrderService(IOrderRepository repository, INotifier notifier)` já deixa `repository` e `notifier` disponíveis em qualquer método.

<details>
<summary>❌ Ruim: o construtor tradicional repete cada dependência três vezes</summary>

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

<details>
<summary>✅ Bom: primary constructor, DI sem cerimônia</summary>

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

<a id="visual-density"></a>

## Uma linha em branco entre um passo e o próximo

As linhas que pertencem ao mesmo passo ficam juntas, sem linha em branco entre elas. Entre um passo e o seguinte entra exatamente uma linha em branco. Duas linhas em branco seguidas não separam nada a mais, só espalham o método pela tela e obrigam a rolar. O corte visual conta ao leitor onde termina uma ideia e começa a outra.

<details>
<summary>❌ Ruim: sem separação entre passos ou separação excessiva</summary>

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


    await NotifyOrderCreatedAsync(order, ct); // duas linhas em branco: ruído
    var invoice = BuildInvoice(order);

    return Result<Invoice>.Success(invoice);
}
```

</details>

<details>
<summary>✅ Bom: um grupo por passo, separados por uma linha em branco</summary>

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
