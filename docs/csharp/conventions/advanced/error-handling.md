# Error handling

## Result\<T\>

Exceções são para falhas inesperadas: erros de infraestrutura, bugs, estado impossível. Falhas de negócio são resultados esperados e devem ser representadas como valores. `Result<T>` torna o contrato explícito: o chamador sabe que pode falhar e é obrigado a lidar com isso.

```csharp
public sealed record ApiError(string Message, string Code);

public record Result<T>(bool IsSuccess, bool IsFailure, T? Value, ApiError? Error)
{
    public static Result<T> Success(T value) => new(true, false, value, null);
    public static Result<T> Fail(string message, string code) => new(false, true, default, new ApiError(message, code));
}
```

<details>
<summary>❌ Bad — exceção como controle de fluxo de negócio</summary>
<br>

```csharp
public async Task<Order> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    if (order is null)
        throw new Exception("Order not found");

    return order;
}

// chamador forçado a usar try/catch para fluxo esperado
public async Task<IResult> GetOrder(Guid orderId)
{
    try
    {
        var order = await _service.FindOrderAsync(orderId, CancellationToken.None);
        return Results.Ok(order);
    }
    catch (Exception ex)
    {
        return Results.NotFound(ex.Message);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — falha de negócio como valor, contrato explícito</summary>
<br>

```csharp
public async Task<Result<Order>> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    if (order is null)
        return Result<Order>.Fail("Order not found.", "NOT_FOUND");

    return Result<Order>.Success(order);
}

// chamador lida com o resultado sem try/catch
public async Task<IResult> GetOrder(Guid orderId, CancellationToken ct)
{
    var result = await _service.FindOrderAsync(orderId, ct);
    var response = result switch
    {
        { IsSuccess: true, Value: var order } => Results.Ok(order),
        { Error.Code: "NOT_FOUND" } => Results.NotFound(),
        _ => Results.Problem(),
    };

    return response;
}
```

</details>

## ApiError

Erros são tipados e carregam código semântico. O código é uma string em `UPPER_SNAKE_CASE`, mapeável para HTTP status no adapter sem `if-else` espalhados pela aplicação.

<details>
<summary>❌ Bad — strings mágicas sem contrato</summary>
<br>

```csharp
return Result<Order>.Fail("not found", "404");
return Result<Order>.Fail("invalid", "bad_request");
return Result<Order>.Fail("unauthorized", "401");
```

</details>

<br>

<details>
<summary>✅ Good — códigos semânticos, mapeamento centralizado</summary>
<br>

```csharp
return Result<Order>.Fail("Order not found.", "NOT_FOUND");
return Result<Order>.Fail("Product ID is required.", "INVALID_PRODUCT_ID");

return Result<Order>.Fail("User is not authorized.", "UNAUTHORIZED");

// mapeamento centralizado no adapter
private static int MapStatusCode(string code) => code switch
{
    "NOT_FOUND" => 404,
    "UNAUTHORIZED" => 401,
    "FORBIDDEN" => 403,
    "CONFLICT" => 409,
    _ => 422,
};
```

</details>

## Falhar rápido

Valide pré-condições no início do método, antes de qualquer I/O ou processamento. Interromper cedo evita trabalho desnecessário e mantém o fluxo feliz livre de ruído de validação.

<details>
<summary>❌ Bad — validação tardia, trabalho desnecessário antes de falhar</summary>
<br>

```csharp
public async Task<Result<Invoice>> CreateInvoiceAsync(InvoiceRequest request, CancellationToken ct)
{
    var order = await _orders.FindByIdAsync(request.OrderId, ct);          // I/O desnecessário
    var customer = await _customers.FindByIdAsync(request.CustomerId, ct); // I/O desnecessário

    var items = await _items.FindByOrderAsync(request.OrderId, ct);        // I/O desnecessário

    if (string.IsNullOrWhiteSpace(request.Description)) // validação tardia — trabalho já feito
        return Result<Invoice>.Fail("Description is required.", "INVALID_INPUT");

    var invoice = BuildInvoice(order, customer, items, request.Description);

    return Result<Invoice>.Success(invoice);
}
```

</details>

<br>

<details>
<summary>✅ Good — validação antes do I/O, falha rápida</summary>
<br>

```csharp
public async Task<Result<Invoice>> CreateInvoiceAsync(InvoiceRequest request, CancellationToken ct)
{
    if (string.IsNullOrWhiteSpace(request.Description))
        return Result<Invoice>.Fail("Description is required.", "INVALID_INPUT");

    var order = await _orders.FindByIdAsync(request.OrderId, ct);
    var customer = await _customers.FindByIdAsync(request.CustomerId, ct);

    var items = await _items.FindByOrderAsync(request.OrderId, ct);

    var invoice = BuildInvoice(order, customer, items, request.Description);

    return Result<Invoice>.Success(invoice);
}
```

</details>

## Exceção como controle de fluxo

`try/catch` tem custo: é reservado para fronteiras de I/O e falhas inesperadas. Usar exceção para desviar fluxo esperado esconde intenção e força o chamador a inferir a semântica pelo tipo da exceção.

<details>
<summary>❌ Bad — try/catch como desvio de fluxo esperado</summary>
<br>

```csharp
public async Task<Order?> GetOrderAsync(Guid orderId, CancellationToken ct)
{
    try
    {
        var order = await _repo.FindByIdAsync(orderId, ct);
        return order;
    }
    catch (NotFoundException) // fluxo esperado tratado como exceção
    {
        return null;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — retorno explícito para ausência, try/catch apenas na fronteira</summary>
<br>

```csharp
public async Task<Result<Order>> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    if (order is null)
        return Result<Order>.Fail("Order not found.", "NOT_FOUND");

    return Result<Order>.Success(order);
}
```

</details>

## Global exception handler

Exceções não capturadas borbulham até o topo. Sem um handler global, o runtime devolve stack trace ou detalhes internos ao cliente: vazamento de informação e contrato quebrado.

O `IExceptionHandler` (disponível a partir do .NET 8) é a barreira final: intercepta qualquer exceção não tratada, registra o erro internamente e devolve sempre `500` com uma mensagem segura. Regras de negócio, nomes de tabela, mensagens de infraestrutura: nada disso chega ao cliente.

<details>
<summary>❌ Bad — sem handler global, detalhe interno vaza</summary>
<br>

```csharp
// sem UseExceptionHandler no pipeline
// cliente recebe stack trace, mensagem de banco ou exception.Message diretamente
```

</details>

<br>

<details>
<summary>✅ Good — IExceptionHandler como barreira final</summary>
<br>

```csharp
// Infrastructure/GlobalExceptionHandler.cs
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken ct)
    {
        logger.LogError(exception, "Unhandled exception");

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var error = new ApiError("An unexpected error occurred.", "INTERNAL_ERROR");
        await httpContext.Response.WriteAsJsonAsync(error, ct);

        return true;
    }
}
```

```csharp
// Infrastructure/GlobalExceptionHandlerExtensions.cs
public static class GlobalExceptionHandlerExtensions
{
    public static WebApplicationBuilder AddGlobalExceptionHandler(this WebApplicationBuilder builder)
    {
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddProblemDetails();

        return builder;
    }
}
```

```csharp
// AppPipelineExtensions.cs — deve ser o primeiro middleware do pipeline
app.UseExceptionHandler();
app.UseStatusCodePages(); // padroniza respostas 4xx sem corpo

app.UseHttpsRedirection();
// ...
```

</details>
