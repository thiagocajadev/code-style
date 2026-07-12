# Tratamento de erros em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

Existem dois tipos de falha, e cada um pede uma ferramenta. A falha inesperada (o banco caiu, um bug deixou o objeto num estado impossível) vira **exception** (exceção), porque ninguém programou para aquilo acontecer. A falha prevista (o pedido não existe, o cliente não tem saldo) faz parte do que a operação pode responder, então ela vira um valor de retorno: o **Result**. Tratar as duas com a mesma ferramenta produz `try/catch` em volta de código que só queria saber se o pedido existe.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **exception** (exceção) | Evento excepcional para falhas inesperadas: bugs, infraestrutura indisponível, estado impossível |
| **Result\<T\>** (tipo de resultado) | Valor que representa sucesso (`Value`) ou falha (`Error`); torna o contrato de erro explícito |
| **try/catch** (tentar / capturar) | Bloco que captura exceções; usado no limite externo, não para fluxo de negócio |
| **rethrow** (relançar) | `throw;` que preserva o stack trace original ao propagar a mesma exceção |
| **exception filter** (filtro de exceção) | `when (...)` em `catch` que avalia condição sem desempilhar; mantém o stack trace |
| **business rule** (regra de negócio) | Falha esperada modelada como dado, não como exceção; retornada via `Result<T>` |
| **boundary** (limite do sistema) | Camada externa (controller, handler) onde o `Result` é convertido em resposta HTTP/JSON |

<a id="result-t"></a>

## Result\<T\>

`Result<T>` carrega um de dois conteúdos: o valor, quando deu certo, ou o erro, quando não deu. A assinatura do método passa a declarar que a operação pode falhar, e quem chama precisa olhar qual dos dois veio antes de usar o valor. Compare com o método que lança exceção: a assinatura promete devolver um `Order`, e a possibilidade de falha só aparece na documentação ou no susto em produção.

```csharp
public sealed record ApiError(string Message, string Code);

public record Result<T>(bool IsSuccess, bool IsFailure, T? Value, ApiError? Error)
{
    public static Result<T> Success(T value) => new(true, false, value, null);
    public static Result<T> Fail(string message, string code) => new(false, true, default, new ApiError(message, code));

    public static implicit operator Result<T>(T value) => Success(value);
}
```

<details>
<summary>❌ Ruim: exceção como controle de fluxo de negócio</summary>

```csharp
public async Task<Order> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repository.FindByIdAsync(orderId, ct);
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

<details>
<summary>✅ Bom: falha de negócio como valor, contrato explícito</summary>

```csharp
public async Task<Result<Order>> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repository.FindByIdAsync(orderId, ct);
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
        { IsSuccess: true, Value: var order } => TypedResults.Ok(order),
        { Error.Code: "NOT_FOUND" } => TypedResults.NotFound(),
        _ => Results.Problem(),
    };

    return response;
}
```

</details>

<a id="api-error"></a>

## ApiError

O erro carrega um código em `UPPER_SNAKE_CASE` (`NOT_FOUND`, `INVALID_PRODUCT_ID`) que diz o que aconteceu no vocabulário do domínio. Esse código é o que a camada de fora traduz para status **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto), num único ponto de mapeamento. Guardar o `404` direto no erro amarraria a regra de negócio ao protocolo, e a mesma operação chamada por uma fila ou por um job não teria o que fazer com um número de status.

<details>
<summary>❌ Ruim: strings mágicas sem contrato</summary>

```csharp
return Result<Order>.Fail("not found", "404");
return Result<Order>.Fail("invalid", "bad_request");
return Result<Order>.Fail("unauthorized", "401");
```

</details>

<details>
<summary>✅ Bom: códigos semânticos, mapeamento centralizado</summary>

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

<a id="implicit-operator"></a>

## O caminho feliz devolve o valor direto

O `implicit operator` declarado no `Result<T>` converte um `T` em `Result<T>.Success(value)` sozinho. Na prática, o método valida, sai cedo em cada falha e termina com `return request`. As linhas de falha continuam explícitas, e a de sucesso perde a cerimônia.

<details>
<summary>❌ Ruim: Success() explícito repetido em cada retorno bem-sucedido</summary>

```csharp
public static Result<OrderCreateRequest> Validate(OrderCreateRequest request)
{
    if (request.CustomerId == Guid.Empty)
        return Result<OrderCreateRequest>.Fail("Customer id is required.", "INVALID_CUSTOMER_ID");

    if (!request.Items.Any())
        return Result<OrderCreateRequest>.Fail("Order must have at least one item.", "INVALID_ITEMS");

    return Result<OrderCreateRequest>.Success(request); // cerimônia desnecessária
}
```

</details>

<details>
<summary>✅ Bom: implicit operator, happy path retorna o valor diretamente</summary>

```csharp
public static Result<OrderCreateRequest> Validate(OrderCreateRequest request)
{
    if (request.CustomerId == Guid.Empty)
        return Result<OrderCreateRequest>.Fail("Customer id is required.", "INVALID_CUSTOMER_ID");

    if (!request.Items.Any())
        return Result<OrderCreateRequest>.Fail("Order must have at least one item.", "INVALID_ITEMS");

    return request; // implicit operator: converte para Result<T>.Success(request)
}
```

</details>

<a id="fail-fast"></a>

## Falhar rápido

Confira as pré-condições na primeira linha do método, antes de qualquer **I/O** (Input/Output · Entrada/Saída). Validar depois de três consultas ao banco significa pagar as três consultas para no fim descobrir que a descrição veio vazia. Além do desperdício, a validação no topo deixa o resto do método livre: dali para baixo, os dados já são válidos.

<details>
<summary>❌ Ruim: validação tardia, trabalho desnecessário antes de falhar</summary>

```csharp
public async Task<Result<Invoice>> CreateInvoiceAsync(InvoiceRequest request, CancellationToken ct)
{
    var order = await _orders.FindByIdAsync(request.OrderId, ct);          // I/O desnecessário
    var customer = await _customers.FindByIdAsync(request.CustomerId, ct); // I/O desnecessário

    var items = await _items.FindByOrderAsync(request.OrderId, ct);        // I/O desnecessário

    if (string.IsNullOrWhiteSpace(request.Description)) // validação tardia: trabalho já feito
        return Result<Invoice>.Fail("Description is required.", "INVALID_INPUT");

    var invoice = BuildInvoice(order, customer, items, request.Description);

    return Result<Invoice>.Success(invoice);
}
```

</details>

<details>
<summary>✅ Bom: validação antes do I/O, falha rápida</summary>

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

<a id="exception-as-control-flow"></a>

## Exceção para desviar fluxo esperado

Lançar e capturar exceção custa caro em tempo de execução, e o custo maior é de leitura: quem chama precisa adivinhar quais exceções aquele método lança, porque a assinatura não conta. Um pedido que não existe é uma resposta prevista da operação. Devolva isso como `Result` e deixe o `try/catch` para o limite do sistema, onde ele protege contra o que ninguém esperava.

<details>
<summary>❌ Ruim: try/catch como desvio de fluxo esperado</summary>

```csharp
public async Task<Order?> GetOrderAsync(Guid orderId, CancellationToken ct)
{
    try
    {
        var order = await _repository.FindByIdAsync(orderId, ct);
        return order;
    }
    catch (NotFoundException) // fluxo esperado tratado como exceção
    {
        return null;
    }
}
```

</details>

<details>
<summary>✅ Bom: retorno explícito para ausência, try/catch apenas no limite</summary>

```csharp
public async Task<Result<Order>> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repository.FindByIdAsync(orderId, ct);
    if (order is null)
        return Result<Order>.Fail("Order not found.", "NOT_FOUND");

    return Result<Order>.Success(order);
}
```

</details>

<a id="global-exception-handler"></a>

## Barreira final para a exceção que ninguém tratou

Uma exceção que ninguém capturou sobe até o topo da aplicação. Sem um tratador global, quem responde é o runtime, e a resposta traz stack trace, nome de tabela e mensagem do driver do banco: informação interna entregue a quem fez a requisição.

O `IExceptionHandler` (a partir do .NET 8) intercepta esse caso. Ele registra o erro completo no log, onde o time consegue investigar, e devolve ao cliente um `500` com uma mensagem genérica. Registre-o como primeiro middleware do pipeline, para que ele fique por fora de todos os outros e enxergue qualquer exceção que aconteça abaixo.

<details>
<summary>❌ Ruim: sem handler global, detalhe interno vaza</summary>

```csharp
// sem UseExceptionHandler no pipeline
// cliente recebe stack trace, mensagem de banco ou exception.Message diretamente
```

</details>

<details>
<summary>✅ Bom: IExceptionHandler como barreira final</summary>

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
// AppPipelineExtensions.cs: deve ser o primeiro middleware do pipeline
app.UseExceptionHandler();
app.UseStatusCodePages(); // padroniza respostas 4xx sem corpo

app.UseHttpsRedirection();
// ...
```

</details>
