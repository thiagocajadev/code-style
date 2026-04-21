# API Design

> Escopo: C#. Visão transversal: [shared/architecture.md](../../../shared/architecture.md).

## Minimal API: preferência

Minimal API é a abordagem preferida para novos projetos. O design se alinha com **Vertical Slice
Architecture**: toda a lógica de uma funcionalidade fica co-localizada, não fragmentada em camadas
horizontais.

Para endpoints triviais sem dependências, uma lambda direta é suficiente e idiomática:

```csharp
app.MapGet("/health", () => TypedResults.Ok());
```

Para endpoints com lógica de negócio e serviços injetados, o **handler class** organiza as
dependências via construtor: um handler por operação, sem misturar DI com parâmetros de request:

```
Features/
└── Orders/
    ├── OrdersExtensions.cs      ← registro + mapeamento de rotas
    ├── CreateOrderHandler.cs    ← um handler por operação
    ├── FindOrderByIdHandler.cs
    ├── FindOrdersHandler.cs
    ├── OrderService.cs          ← lógica compartilhada entre handlers
    ├── OrderRequest.cs          ← DTO de entrada
    └── OrderResponse.cs         ← DTO de saída
```

<details>
<summary>❌ Bad — lógica de negócio inline na rota</summary>
<br>

```csharp
// ❌ rota grossa: DbContext injetado direto, regra de negócio inline, sem repository,
//    sem service, sem TypedResults — tudo junto na lambda
group.MapPost("/", async (OrderRequest request, AppDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.ProductId))
        return Results.BadRequest("Product ID required.");

    var product = await db.Products.FindAsync(request.ProductId, ct);
    if (product is null)
        return Results.NotFound("Product not found.");

    var order = new Order(request.ProductId, request.Quantity, product.Price * request.Quantity);

    db.Orders.Add(order);
    await db.SaveChangesAsync(ct);

    return Results.Created($"/api/orders/{order.Id}", order);
});
```

</details>

<br>

<details>
<summary>❌ Bad — handler que busca dependências via service locator</summary>
<br>

```csharp
// Features/Orders/CreateOrderHandler.cs
public class CreateOrderHandler
{
    public async Task<IResult> HandleAsync(OrderRequest request, IServiceProvider services, CancellationToken ct)
    {
        // dependências resolvidas manualmente dentro do handler
        var orderService = services.GetRequiredService<OrderService>();
        var result = await orderService.CreateOrderAsync(request, ct);
        if (result.IsFailure)
            return Results.BadRequest(result.Error);

        var createdOrder = result.Value!;
        return Results.Created($"/api/orders/{createdOrder.Id}", createdOrder);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — rotas mapeadas no extension method, handler injetado</summary>
<br>

```csharp
// Features/Orders/OrdersExtensions.cs
public static class OrdersExtensions
{
    public static WebApplicationBuilder AddOrders(this WebApplicationBuilder builder)
    {
        // handlers registrados como Scoped — o container os injeta nas rotas automaticamente
        builder.Services.AddScoped<FindOrdersHandler>();

        builder.Services.AddScoped<FindOrderByIdHandler>();

        builder.Services.AddScoped<CreateOrderHandler>();

        builder.Services.AddScoped<OrderService>();

        return builder;
    }

    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("/", (FindOrdersHandler handler, CancellationToken ct)
            => handler.HandleAsync(ct));

        group.MapGet("/{id:guid}", (Guid id, FindOrderByIdHandler handler, CancellationToken ct)
            => handler.HandleAsync(id, ct));

        group.MapPost("/", (OrderRequest request, CreateOrderHandler handler, CancellationToken ct)
            => handler.HandleAsync(request, ct));

        return app;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — handler com dependências no construtor, request como parâmetro</summary>
<br>

```csharp
// Features/Orders/CreateOrderHandler.cs
public class CreateOrderHandler(OrderService orderService)
{
    public async Task<IResult> HandleAsync(OrderRequest request, CancellationToken ct)
    {
        var result = await orderService.CreateOrderAsync(request, ct);
        if (result.IsFailure)
            return TypedResults.BadRequest(result.Error);

        var createdOrder = result.Value!;
        var orderLocation = $"/api/orders/{createdOrder.Id}";
        return TypedResults.Created(orderLocation, createdOrder);
    }
}
```

</details>

## [AsParameters] — context records

Em Minimal API, handlers com muitas dependências produzem assinaturas longas. `[AsParameters]`
permite agrupar todos os parâmetros em um context record — o framework resolve cada propriedade
individualmente via DI, como se fossem parâmetros avulsos.

<details>
<summary>❌ Bad — assinatura longa, dependências espalhadas no handler</summary>
<br>

```csharp
// ❌ cada dependência é um parâmetro avulso — cresce a cada nova injeção
app.MapPost("/orders", async (
    OrderCreateRequest request,
    IOrderRepository repository,
    IOrderBusinessRules businessRules,
    IOrderReader reader,
    CancellationToken cancellationToken) =>
{
    // ...
});
```

</details>

<br>

<details>
<summary>✅ Good — context record agrupa dependências, handler recebe um parâmetro</summary>
<br>

```csharp
// Features/Orders/OrderContexts.cs
public sealed record OrderCreateContext(
    OrderCreateRequest Request,
    IOrderRepository Repository,
    IOrderBusinessRules BusinessRules,
    IOrderReader Reader,
    CancellationToken CancellationToken);
```

```csharp
// Features/Orders/Create.cs — handler recebe um parâmetro; DI resolve cada propriedade
public static async Task<OrderCreateResult> Handle(
    [AsParameters] OrderCreateContext context)
{
    var (request, repository, businessRules, reader, cancellationToken) = context;

    // ...
}
```

</details>

## Controller: MVC e legados

Controllers fazem sentido em projetos que já os adotam ou que precisam de convenções MVC (filtros
globais, model binding por atributo, scaffolding). O mesmo princípio se aplica: controller não tem
lógica, apenas orquestra.

<details>
<summary>❌ Bad — controller com lógica de negócio</summary>
<br>

```csharp
// ❌ controller gordo: DbContext no construtor, cálculo de preço na lambda,
//    interpolação no return — mesma regra que Minimal API, diferente só na sintaxe
[ApiController]
[Route("api/orders")]
public class OrdersController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(OrderRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProductId))
            return BadRequest("Product ID required.");

        var product = await db.Products.FindAsync(request.ProductId, ct);
        if (product is null)
            return NotFound();

        var order = new Order(request.ProductId, request.Quantity, product.Price * request.Quantity);

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        return Created($"/api/orders/{order.Id}", order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — controller thin, delega para o service</summary>
<br>

```csharp
[ApiController]
[Route("api/orders")]
public class OrdersController(OrderService orderService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(OrderRequest request, CancellationToken ct)
    {
        var result = await orderService.CreateOrderAsync(request, ct);
        if (result.IsFailure)
            return BadRequest(result.Error);

        var createdOrder = result.Value!;
        var orderLocation = $"/api/orders/{createdOrder.Id}";
        var response = Created(orderLocation, createdOrder);
        return response;
    }
}
```

</details>

## TypedResults vs Results

Minimal API oferece duas famílias de retorno: `Results` (`Microsoft.AspNetCore.Http.Results`) — o
idioma histórico — e `TypedResults` — a variante tipada introduzida no .NET 7. Ambas produzem a
mesma resposta HTTP; a diferença está no que o compilador sabe sobre ela.

`Results.Ok(order)` retorna `IResult` — tipo apagado. Quem assina a rota com `Results` perde
informação: OpenAPI/Swagger não infere o status nem o payload, testes precisam de cast
(`(Ok<Order>)result`), e a documentação só aparece com atributos `[ProducesResponseType]`
redundantes.

`TypedResults.Ok(order)` retorna `Ok<Order>` — tipo concreto. OpenAPI extrai status (200) e shape
(`Order`) automaticamente. Testes leem `result.Value` direto. A assinatura do handler passa a
**dizer** exatamente o que retorna.

### Quando usar qual

| Contexto                                       | Preferir                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Minimal API, endpoint novo                     | `TypedResults.*`                                                               |
| Endpoint com múltiplos status (ex: 200 ou 404) | `Results<Ok<T>, NotFound>` como tipo de retorno                                |
| MVC Controller (`ControllerBase`)              | métodos da base class (`Ok()`, `NotFound()`, `Created(...)`) — não `Results.*` |
| Código legado usando `Results.*`               | manter até a próxima refatoração natural                                       |

### Assinatura rica para múltiplos status

O tipo genérico `Results<,>` enumera **na assinatura** todos os retornos possíveis. OpenAPI gera
documentação para cada um e o compilador garante que nenhum caminho retorna fora do contrato.

<details>
<summary>❌ Bad — Results apaga o tipo de retorno</summary>
<br>

```csharp
// ❌ IResult é opaco: Swagger não sabe se é 200 ou 404 sem [ProducesResponseType]
app.MapGet("/orders/{id}", async (Guid id, OrderService orderService, CancellationToken ct) =>
{
    var result = await orderService.FindByIdAsync(id, ct);
    if (result.IsFailure) return Results.NotFound();

    var response = OrderResponse.From(result.Value!);
    return Results.Ok(response);
});
```

</details>

<br>

<details>
<summary>✅ Good — TypedResults + union type na assinatura</summary>
<br>

```csharp
app.MapGet("/orders/{id}", FindOrder);

static async Task<Results<Ok<OrderResponse>, NotFound>> FindOrder(
    Guid id, OrderService orderService, CancellationToken ct)
{
    var result = await orderService.FindByIdAsync(id, ct);
    if (result.IsFailure) return TypedResults.NotFound();

    var response = OrderResponse.From(result.Value!);
    return TypedResults.Ok(response);
}
```

</details>

### Location header sem lógica no return

`TypedResults.Created` aceita `string` ou `Uri` como header `Location`. Monte a URL em variável
nomeada antes do retorno — o `return` nomeia, não computa.

<details>
<summary>❌ Bad — interpolação no return</summary>
<br>

```csharp
// ❌ URL construída na linha do return: lógica inline, difícil inspecionar no debugger
return TypedResults.Created($"/api/orders/{createdOrder.Id}", createdOrder);
```

</details>

<br>

<details>
<summary>✅ Good — URL em variável nomeada</summary>
<br>

```csharp
var orderLocation = $"/api/orders/{createdOrder.Id}";
var response = TypedResults.Created(orderLocation, createdOrder);

return response;
```

</details>

## TypedResults aliases

A assinatura `Results<T1, T2, T3>` enumera todos os retornos possíveis, mas repetir namespaces
completos em cada handler polui o código. `global using` aliasa o tipo uma vez para todo o assembly
— os handlers ficam limpos, o contrato permanece explícito e o OpenAPI continua enumerando cada
status.

<details>
<summary>❌ Bad — tipo union verboso repetido em cada handler</summary>
<br>

```csharp
// ❌ namespaces completos repetidos a cada handler que retorna esse tipo
public static async Task<Results<
    Created<OrderResponse>,
    BadRequest<string>,
    ProblemHttpResult>> Handle([AsParameters] OrderCreateContext context)
{
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — alias declarado uma vez, handler usa nome semântico</summary>
<br>

```csharp
// Features/Orders/OrderAliases.cs — um arquivo por feature, uma linha por status possível
global using OrderCreateResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Created<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.BadRequest<string>,
    Microsoft.AspNetCore.Http.HttpResults.ProblemHttpResult>;

global using OrderGetResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Ok<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.NotFound>;
```

```csharp
// handler — tipo de retorno expressivo, sem repetição de namespace
public static async Task<OrderCreateResult> Handle(
    [AsParameters] OrderCreateContext context)
{
    // ...
}
```

</details>

## CQS — Save sem retorno

`SaveAsync` é um comando: persiste e retorna `void`. Retornar a entidade salva mistura command e
query no mesmo método — viola CQS e acopla a leitura à escrita. Um `IOrderReader` separado lê após o
save.

<details>
<summary>❌ Bad — SaveAsync retorna entidade (CQS violado)</summary>
<br>

```csharp
// ❌ salva e retorna — command e query no mesmo método
var saved = await repository.SaveAsync(order, cancellationToken);

return TypedResults.Created($"/orders/{saved.Id}", saved);
```

</details>

<br>

<details>
<summary>✅ Good — SaveAsync void, IOrderReader separado para leitura</summary>
<br>

```csharp
// IOrderRepository — contrato de persistência (command)
public interface IOrderRepository
{
    Task SaveAsync(Order order, CancellationToken cancellationToken);
}

// IOrderReader — contrato de leitura (query)
public interface IOrderReader
{
    Task<Result<Order>> FindByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

```csharp
// no handler: save void, read com interface separada
await repository.SaveAsync(order, cancellationToken);

var saved = await reader.FindByIdAsync(order.Id, cancellationToken);

if (!saved.IsSuccess)
    return TypedResults.Problem(saved.Error!.Message);

var orderLocation = $"/orders/{order.Id}";
var orderResponse = OrderResponseFilterOutput.Apply(saved.Value!);
var response = TypedResults.Created(orderLocation, orderResponse);

return response;
```

</details>

## Request e Response

DTOs definem o contrato da API. Tipos de domínio não vazam para fora: a API recebe e devolve tipos
próprios.

### Request

<details>
<summary>❌ Bad — classe mutável, contrato implícito</summary>
<br>

```csharp
public class OrderRequest
{
    public string ProductId { get; set; }
    public int Quantity { get; set; }
}
```

</details>

<br>

<details>
<summary>✅ Good — record imutável, contrato explícito</summary>
<br>

```csharp
public record OrderRequest(string ProductId, int Quantity);
```

</details>

### Response

<details>
<summary>❌ Bad — entidade de domínio exposta diretamente</summary>
<br>

```csharp
public class FindOrderByIdHandler(OrderService orderService)
{
    public async Task<IResult> HandleAsync(Guid id, CancellationToken ct)
    {
        var order = await orderService.FindOrderByIdAsync(id, ct);
        return Results.Ok(order); // ❌ expõe Order (entidade de domínio)
    }
}
```

</details>

<br>

<details>
<summary>❌ Bad — record posicional com muitos parâmetros, ordem implícita</summary>
<br>

```csharp
public record OrderResponse(Guid Id, string ProductId, int Quantity, decimal Total, DateTime CreatedAt);

// na construção: sem nomes, sem segurança de ordem
var orderResponse = new OrderResponse(order.Id, order.ProductId, order.Quantity, order.Total, order.CreatedAt);
```

</details>

<br>

<details>
<summary>✅ Good — DTO com required init, nomeado e imutável</summary>
<br>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required string ProductId { get; init; }
    public required int Quantity { get; init; }
    public required decimal Total { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public class FindOrderByIdHandler(OrderService orderService)
{
    public async Task<IResult> HandleAsync(Guid id, CancellationToken ct)
    {
        var result = await orderService.FindOrderByIdAsync(id, ct);
        if (result.IsFailure)
            return TypedResults.NotFound(result.Error);

        var order = result.Value!;
        var orderResponse = new OrderResponse
        {
            Id = order.Id,
            ProductId = order.ProductId,
            Quantity = order.Quantity,
            Total = order.Total,
            CreatedAt = order.CreatedAt
        };

        var response = TypedResults.Ok(orderResponse);
        return response;
    }
}
```

</details>

## Response Envelope

Respostas sem envelope têm shapes inconsistentes: sucesso retorna objeto nu, erro retorna string,
lista retorna array. Cada shape exige tratamento separado no cliente.

Um envelope `{ data, meta }` garante contrato previsível. O campo `meta` carrega apenas o que ajuda
na observabilidade, sem inflar o payload.

<details>
<summary>❌ Bad — shapes inconsistentes: objeto nu no sucesso, string no erro</summary>
<br>

```csharp
public async Task<IResult> HandleAsync(Guid id, CancellationToken ct)
{
    var result = await orderService.FindOrderByIdAsync(id, ct);
    if (result.IsFailure)
        return Results.NotFound("Order not found."); // ❌ string solta

    return Results.Ok(result.Value!); // ❌ objeto nu, sem envelope
}
// 200: { "id": "01HV...", "productId": "...", "quantity": 3 }
// 404: "Order not found."
```

</details>

<br>

<details>
<summary>✅ Good — envelope com meta enxuto para rastreamento</summary>
<br>

```csharp
// Shared/ApiResponse.cs
public record ApiMeta
{
    public required string CorrelationId { get; init; }
    public required DateTimeOffset RequestedAt { get; init; }
}

public record ApiResponse<T>
{
    public required T Data { get; init; }
    public required ApiMeta Meta { get; init; }
}
```

```csharp
// Features/Orders/FindOrderByIdHandler.cs — requer builder.Services.AddHttpContextAccessor()
public class FindOrderByIdHandler(OrderService orderService, IHttpContextAccessor httpContextAccessor)
{
    public async Task<IResult> HandleAsync(Guid id, CancellationToken ct)
    {
        var result = await orderService.FindOrderByIdAsync(id, ct);
        if (result.IsFailure)
            return TypedResults.NotFound();

        var order = result.Value!;
        var orderResponse = new OrderResponse
        {
            Id = order.Id,
            ProductId = order.ProductId,
            Quantity = order.Quantity,
            Total = order.Total,
            CreatedAt = order.CreatedAt
        };

        var httpContext = httpContextAccessor.HttpContext!;
        var correlationId = httpContext.Request.Headers["X-Correlation-Id"].ToString();

        var apiResponse = new ApiResponse<OrderResponse>
        {
            Data = orderResponse,
            Meta = new ApiMeta
            {
                CorrelationId = correlationId,
                RequestedAt = DateTimeOffset.UtcNow
            }
        };

        var response = TypedResults.Ok(apiResponse);
        return response;
    }
}
// 200: { "data": { "id": "01HV...", ... }, "meta": { "correlationId": "abc-123", "requestedAt": "2026-04-19T14:32:00Z" } }
// 404: (sem corpo)
```

O `correlationId` em `meta` é o mesmo propagado nos logs da requisição. Veja
[Correlation ID](./observability.md#correlation-id).

</details>

## Verbos e rotas

| Verbo    | Semântica                    | Exemplo                                   |
| -------- | ---------------------------- | ----------------------------------------- |
| `GET`    | Leitura sem efeito colateral | `GET /api/orders`, `GET /api/orders/{id}` |
| `POST`   | Criação de recurso           | `POST /api/orders`                        |
| `PUT`    | Substituição completa        | `PUT /api/orders/{id}`                    |
| `PATCH`  | Atualização parcial          | `PATCH /api/orders/{id}`                  |
| `DELETE` | Remoção                      | `DELETE /api/orders/{id}`                 |

- Rotas em kebab-case: `/api/order-items`, não `/api/orderItems`
- Plural para coleções: `/api/orders`, não `/api/order`
- Sem verbo na rota: `POST /api/orders`, não `POST /api/create-order`

## Status codes

| Status                      | Quando usar                                            |
| --------------------------- | ------------------------------------------------------ |
| `200 OK`                    | Leitura ou operação bem-sucedida com corpo de resposta |
| `201 Created`               | Recurso criado; incluir id ou `Location` no corpo      |
| `204 No Content`            | Operação bem-sucedida sem corpo (ex: DELETE)           |
| `400 Bad Request`           | Input inválido (erro do cliente)                       |
| `401 Unauthorized`          | Não autenticado                                        |
| `403 Forbidden`             | Autenticado mas sem permissão                          |
| `404 Not Found`             | Recurso não encontrado                                 |
| `409 Conflict`              | Estado incompatível (ex: duplicata)                    |
| `422 Unprocessable Entity`  | Input válido mas regra de negócio violada              |
| `429 Too Many Requests`     | Rate limit atingido                                    |
| `500 Internal Server Error` | Falha inesperada; nunca expor detalhes ao cliente      |
