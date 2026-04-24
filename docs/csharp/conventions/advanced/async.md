# Async

> Escopo: C#. Idiomas específicos deste ecossistema.

Assincronia em .NET é baseada em `Task<T>` + `async`/`await`. Toda operação que atravessa fronteira do processo (banco, rede, arquivo) retorna `Task`. O chamador aguarda com `await`; bloquear (`Result`, `Wait()`) trava threads do pool e leva a deadlock.

## async/await

Todo **I/O** (Input/Output, Entrada/Saída) é assíncrono. Métodos que realizam I/O retornam `Task<T>` ou `Task` e carregam o sufixo `Async`. O chamador sempre usa `await`, nunca `.Result` ou `.Wait()`.

<details>
<summary>❌ Bad — I/O síncrono bloqueia a thread</summary>
<br>

```csharp
public Order FindOrder(Guid orderId)
{
    var order = _repo.FindByIdAsync(orderId).Result; // bloqueia thread

    return order;
}

public void SaveOrder(Order order)
{
    _repo.SaveAsync(order).Wait(); // deadlock em contextos com SynchronizationContext
}
```

</details>

<br>

<details>
<summary>✅ Good — async/await do início ao fim</summary>
<br>

```csharp
public async Task<Order> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    return order;
}

public async Task SaveOrderAsync(Order order, CancellationToken ct)
{
    await _repo.SaveAsync(order, ct);
}
```

</details>

## Task.WhenAll

Chamadas independentes de I/O devem rodar em paralelo. `await` sequencial em operações sem dependência entre si desperdiça tempo: o tempo total vira a soma, não o máximo.

<details>
<summary>❌ Bad — await sequencial em chamadas independentes</summary>
<br>

```csharp
public async Task<Dashboard> BuildDashboardAsync(Guid userId, CancellationToken ct)
{
    var user = await _users.FindByIdAsync(userId, ct);               // espera terminar
    var orders = await _orders.FindRecentAsync(userId, ct);          // só então começa

    var notifications = await _notifications.FindAsync(userId, ct);  // só então começa

    var dashboard = new Dashboard(user, orders, notifications);

    return dashboard;
}
```

</details>

<br>

<details>
<summary>✅ Good — Task.WhenAll para chamadas independentes em paralelo</summary>
<br>

```csharp
public async Task<Dashboard> BuildDashboardAsync(Guid userId, CancellationToken ct)
{
    var userTask = _users.FindByIdAsync(userId, ct);
    var ordersTask = _orders.FindRecentAsync(userId, ct);

    var notificationsTask = _notifications.FindAsync(userId, ct);

    await Task.WhenAll(userTask, ordersTask, notificationsTask);

    var dashboard = new Dashboard(
        await userTask,
        await ordersTask,
        await notificationsTask
    );

    return dashboard;
}
```

</details>

## CancellationToken

Propague `CancellationToken` em toda chamada de I/O pública. Ele permite que o chamador cancele a operação. Sem ele, requisições **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) canceladas ou timeouts não interrompem o trabalho em andamento.

<details>
<summary>❌ Bad — CancellationToken ignorado ou ausente</summary>
<br>

```csharp
public async Task<Order> FindOrderAsync(Guid orderId)
{
    var order = await _repo.FindByIdAsync(orderId); // sem ct

    return order;
}

public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(request.OrderId); // ct disponível mas não propagado
    await _notifications.SendAsync(order);

    return Result<Invoice>.Success(BuildInvoice(order));
}
```

</details>

<br>

<details>
<summary>✅ Good — CancellationToken propagado em toda a cadeia</summary>
<br>

```csharp
public async Task<Order> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    return order;
}

public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(request.OrderId, ct);
    await _notifications.SendAsync(order, ct);

    var invoice = BuildInvoice(order);

    return Result<Invoice>.Success(invoice);
}
```

</details>

## Sem bloqueio síncrono

`.Result`, `.Wait()` e `GetAwaiter().GetResult()` bloqueiam a thread chamante. Em aplicações ASP.NET Core, isso pode causar deadlock quando o `SynchronizationContext` está presente. Não existe caminho seguro: a única solução é async de ponta a ponta.

<details>
<summary>❌ Bad — bloqueio síncrono em contexto async</summary>
<br>

```csharp
public class OrderController(OrderService service) : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult GetOrder(Guid id)
    {
        var order = service.FindOrderAsync(id, HttpContext.RequestAborted).Result;
        return Ok(order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — endpoint async de ponta a ponta</summary>
<br>

```csharp
public class OrderController(OrderService service) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderAsync(Guid id, CancellationToken ct)
    {
        var order = await service.FindOrderAsync(id, ct);
        return Ok(order);
    }
}
```

</details>
