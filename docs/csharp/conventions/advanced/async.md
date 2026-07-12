# Assincronia em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

Toda operação que sai do processo (banco, rede, arquivo) devolve uma `Task<T>`, que representa um resultado que ainda vai chegar. Quem chama espera esse resultado com `await`, e enquanto a resposta não vem, a **thread** (linha de execução que roda o código) fica livre para atender outra requisição. Pedir o valor de forma bloqueante, com `.Result` ou `.Wait()`, prende a thread parada, e com tráfego suficiente isso trava a aplicação inteira. O **CancellationToken** (sinalizador de cancelamento) percorre a cadeia de chamadas para que um cancelamento lá em cima interrompa o trabalho lá embaixo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Task** (tarefa assíncrona) | Tipo `Task<T>` que representa um resultado futuro de uma operação assíncrona |
| **async/await** (assíncrono / aguardar) | Palavras-chave que marcam um método como assíncrono e suspendem a execução até o resultado estar pronto |
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa o limite do processo: rede, disco, banco |
| **deadlock** (impasse) | Travamento por bloqueio síncrono (`.Result`, `.Wait()`) sobre código assíncrono no mesmo contexto |
| **CancellationToken** (sinalizador de cancelamento) | Token propagado pela cadeia para abortar operações longas com cooperação |
| **ConfigureAwait** (configurar continuação) | Método que controla se a continuação retorna ao contexto original; em libraries usa-se `false` |
| **thread pool** (conjunto gerenciado de linhas de execução) | Threads do .NET reutilizadas para executar continuações; bloquear esgota o pool |

<a id="async-await"></a>

## async/await

Todo acesso a banco, rede ou disco vira um método assíncrono: devolve `Task<T>` ou `Task` e termina em `Async`. Quem chama usa `await`. O `await` entrega a thread de volta ao pool enquanto a resposta não chega, e é isso que permite a um servidor atender centenas de requisições com poucas threads.

<details>
<summary>❌ Ruim: I/O síncrono bloqueia a thread</summary>

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

<details>
<summary>✅ Bom: async/await do início ao fim</summary>

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

<a id="task-whenall"></a>

## Task.WhenAll para chamadas que não dependem uma da outra

Três `await` em sequência levam a soma dos três tempos, mesmo quando nenhuma das chamadas precisa do resultado da anterior. Dispare as três, guarde as `Task` sem `await`, e só então espere todas com `Task.WhenAll`. O tempo total passa a ser o da chamada mais lenta. Um painel que buscava usuário, pedidos e notificações em 300 ms cada responde em 300 ms, e não em 900 ms.

<details>
<summary>❌ Ruim: await sequencial em chamadas independentes</summary>

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

<details>
<summary>✅ Bom: Task.WhenAll para chamadas independentes em paralelo</summary>

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

<a id="cancellation-token"></a>

## CancellationToken

Passe o `CancellationToken` adiante em toda chamada assíncrona pública. Ele é o que permite parar o trabalho quando ele já não serve para ninguém: o usuário fechou a aba, o timeout estourou, a requisição **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) foi abortada. Um método que recebe o token e não o repassa quebra a corrente: a consulta ao banco continua rodando até o fim, ocupando conexão para produzir um resultado que ninguém vai ler.

<details>
<summary>❌ Ruim: CancellationToken ignorado ou ausente</summary>

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

<details>
<summary>✅ Bom: CancellationToken propagado em toda a cadeia</summary>

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

<a id="no-sync-blocking"></a>

## Nunca bloquear com `.Result` ou `.Wait()`

`.Result`, `.Wait()` e `GetAwaiter().GetResult()` param a thread atual até a operação terminar. Em ASP.NET Core isso consome uma thread do pool sem fazer trabalho nenhum, e em contextos que têm `SynchronizationContext` chega a travar de vez: a thread bloqueada é justamente a que precisaria estar livre para receber a resposta, e as duas ficam se esperando. A saída é manter o `async` do endpoint até a chamada ao banco, sem quebrar a corrente no meio.

<details>
<summary>❌ Ruim: bloqueio síncrono em contexto async</summary>

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

<details>
<summary>✅ Bom: endpoint async de ponta a ponta</summary>

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
