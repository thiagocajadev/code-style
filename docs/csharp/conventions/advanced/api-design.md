# Design de API em C#

> Escopo: C#. Idiomas .NET deste arquivo.
> SSOT do pipeline, envelope, verbos, status codes e Result → HTTP: [shared/platform/api-design.md](../../../shared/platform/api-design.md).

O ASP.NET Core oferece dois jeitos de escrever uma **API** (Application Programming Interface · Interface de Programação de Aplicações): a **Minimal API**, que declara cada rota como uma função, e os **Controllers**, que herdam do pipeline de **MVC** (Model-View-Controller · Modelo-Visão-Controlador). Este guia adota a Minimal API, com o retorno tipado que traduz o `Result` do domínio em resposta HTTP. As regras que valem para qualquer linguagem (verbos, status, envelope) ficam no documento transversal; aqui está o que muda em C#.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Contrato de comunicação entre serviços, tipicamente via HTTP |
| **REST** (Representational State Transfer · Transferência de Estado Representacional) | Estilo arquitetural que usa verbos HTTP sobre recursos identificados por URL |
| **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) | Protocolo da web: verbos, status codes, headers, corpo |
| **MVC** (Model-View-Controller, Modelo-Visão-Controlador) | Padrão que separa dados, apresentação e controle; em ASP.NET, o pipeline de Controllers |
| **CQS** (Command-Query Separation, Separação Comando-Consulta) | Princípio: um método ou altera estado (command) ou retorna dado (query), nunca os dois |
| **SSOT** (Single Source of Truth · Fonte Única da Verdade) | Um único lugar canônico para cada regra ou contrato; cross-links apontam para ele |

<a id="minimal-api"></a>

## Minimal API como padrão

A Minimal API combina com a organização por funcionalidade: tudo o que diz respeito a pedidos (rotas, handlers, DTOs, serviço) mora na pasta `Features/Orders`, em vez de espalhado entre uma pasta de controllers, uma de services e uma de models.

Uma rota sem dependência nenhuma cabe numa lambda:

```csharp
app.MapGet("/health", () => TypedResults.Ok());
```

Quando a rota tem regra de negócio e precisa de serviços, escreva um **handler** (classe que atende a rota) por operação. As dependências entram pelo construtor, e o método recebe só o que veio na requisição:

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
<summary>❌ Ruim: lógica de negócio inline na rota</summary>

```csharp
// ❌ rota grossa: DbContext injetado direto, regra de negócio inline, sem repository,
//    sem service, sem TypedResults: tudo junto na lambda
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

<details>
<summary>❌ Ruim: handler que busca dependências via service locator</summary>

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

<details>
<summary>✅ Bom: rotas mapeadas no extension method, handler injetado</summary>

```csharp
// Features/Orders/OrdersExtensions.cs
public static class OrdersExtensions
{
    public static WebApplicationBuilder AddOrders(this WebApplicationBuilder builder)
    {
        // handlers registrados como Scoped: o container os injeta nas rotas automaticamente
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

<details>
<summary>✅ Bom: handler com dependências no construtor, request como parâmetro</summary>

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

<a id="as-parameters"></a>

## Agrupar os parâmetros do handler

Um handler que precisa do request, de dois repositórios, de um leitor e do token de cancelamento fica com cinco parâmetros, e a lista cresce a cada dependência nova. `[AsParameters]` deixa juntar todos num `record` de contexto. O framework olha dentro do record e resolve cada propriedade pelo container, como se fossem parâmetros soltos, e o handler passa a receber um só.

<details>
<summary>❌ Ruim: assinatura longa, dependências espalhadas no handler</summary>

```csharp
// ❌ cada dependência é um parâmetro avulso: cresce a cada nova injeção
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

<details>
<summary>✅ Bom: context record agrupa dependências, handler recebe um parâmetro</summary>

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
// Features/Orders/Create.cs: handler recebe um parâmetro; DI resolve cada propriedade
public static async Task<OrderCreateResult> Handle(
    [AsParameters] OrderCreateContext context)
{
    var (request, repository, businessRules, reader, cancellationToken) = context;

    // ...
}
```

</details>

<a id="controllers"></a>

## Controller em projetos MVC

Controllers continuam fazendo sentido no projeto que já os usa ou que depende de recursos do MVC, como filtros globais e model binding por atributo. A regra é a mesma da Minimal API: o controller recebe a requisição, chama o serviço e traduz o resultado em resposta. Regra de negócio, cálculo e acesso ao banco ficam de fora dele.

<details>
<summary>❌ Ruim: controller com lógica de negócio</summary>

```csharp
// ❌ controller gordo: DbContext no construtor, cálculo de preço na lambda,
//    interpolação no return. Mesma regra que Minimal API, diferente só na sintaxe
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

<details>
<summary>✅ Bom: controller thin, delega para o service</summary>

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

<a id="typedresults-vs-results"></a>

## TypedResults e Results

A Minimal API tem duas famílias de retorno. `Results` é a mais antiga, `TypedResults` chegou no .NET 7. As duas produzem a mesma resposta HTTP; o que muda é o que o compilador enxerga.

`Results.Ok(order)` devolve `IResult`, um tipo que não guarda informação sobre o conteúdo. O Swagger não consegue descobrir o status nem o formato do **payload** (corpo da mensagem), e você precisa declarar isso à mão com `[ProducesResponseType]`. O teste precisa converter o resultado antes de ler.

`TypedResults.Ok(order)` devolve `Ok<Order>`, um tipo concreto. O Swagger lê dali o status 200 e o formato `Order` sem ajuda. O teste acessa `result.Value` direto. A assinatura do handler passa a declarar o que ele responde.

### Quando usar qual

| Contexto                                       | Preferir                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Minimal API, endpoint novo                     | `TypedResults.*`                                                               |
| Endpoint com múltiplos status (ex: 200 ou 404) | `Results<Ok<T>, NotFound>` como tipo de retorno                                |
| MVC Controller (`ControllerBase`)              | métodos da base class (`Ok()`, `NotFound()`, `Created(...)`), não `Results.*` |
| Código legado usando `Results.*`               | manter até a próxima refatoração natural                                       |

### Assinatura que enumera os status possíveis

O tipo `Results<,>` lista na própria assinatura todos os retornos que o handler pode dar. O Swagger documenta cada um, e o compilador recusa um retorno que não esteja na lista.

<details>
<summary>❌ Ruim: Results apaga o tipo de retorno</summary>

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

<details>
<summary>✅ Bom: TypedResults + union type na assinatura</summary>

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

### Header Location sem lógica no return

`TypedResults.Created` recebe a **URL** (Uniform Resource Locator · Localizador Uniforme de Recurso) do recurso criado, que vai no header `Location`. Monte essa URL numa variável com nome antes da última linha, e deixe o `return` só entregando o resultado.

<details>
<summary>❌ Ruim: interpolação no return</summary>

```csharp
// ❌ URL construída na linha do return: lógica inline, difícil inspecionar no debugger
return TypedResults.Created($"/api/orders/{createdOrder.Id}", createdOrder);
```

</details>

<details>
<summary>✅ Bom: URL em variável nomeada</summary>

```csharp
var orderLocation = $"/api/orders/{createdOrder.Id}";
var response = TypedResults.Created(orderLocation, createdOrder);
return response;
```

</details>

<a id="typedresults-aliases"></a>

## Apelido para a assinatura de retorno

Enumerar os status na assinatura deixa o contrato explícito e produz um tipo comprido, com o namespace inteiro repetido a cada handler. Um `global using` batiza esse tipo uma vez e vale para o assembly todo. O handler passa a declarar `Task<OrderCreateResult>`, e o Swagger continua enxergando cada status que o apelido representa.

<details>
<summary>❌ Ruim: tipo union verboso repetido em cada handler</summary>

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

<details>
<summary>✅ Bom: alias declarado uma vez, handler usa nome semântico</summary>

```csharp
// Features/Orders/OrderAliases.cs: um arquivo por feature, uma linha por status possível
global using OrderCreateResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Created<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.BadRequest<string>,
    Microsoft.AspNetCore.Http.HttpResults.ProblemHttpResult>;

global using OrderGetResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Ok<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.NotFound>;
```

```csharp
// handler: tipo de retorno expressivo, sem repetição de namespace
public static async Task<OrderCreateResult> Handle(
    [AsParameters] OrderCreateContext context)
{
    // ...
}
```

</details>

<a id="cqs"></a>

## O comando grava e a consulta lê

`SaveAsync` grava e devolve `void`. Quando ele também devolve a entidade salva, o método passa a fazer as duas coisas, e quem lê a chamada não sabe mais se aquele valor veio do banco ou do objeto que acabou de ser enviado. Esse é o princípio **CQS** (Command-Query Separation · Separação Comando-Consulta). Depois de gravar, um `IOrderReader` lê o registro, e aí o dado devolvido é o que está no banco de verdade, com os campos que ele mesmo preencheu.

<details>
<summary>❌ Ruim: SaveAsync retorna entidade (CQS violado)</summary>

```csharp
// ❌ salva e retorna: command e query no mesmo método
var saved = await repository.SaveAsync(order, cancellationToken);

return TypedResults.Created($"/orders/{saved.Id}", saved);
```

</details>

<details>
<summary>✅ Bom: SaveAsync void, IOrderReader separado para leitura</summary>

```csharp
// IOrderRepository: contrato de persistência (command)
public interface IOrderRepository
{
    Task SaveAsync(Order order, CancellationToken cancellationToken);
}

// IOrderReader: contrato de leitura (query)
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

<a id="contract-and-envelope"></a>

## Contrato, envelope, verbos e status codes

O desenho do pipeline, os DTOs de request e response, o envelope `{ data, meta }`, os verbos REST, os status codes e a tradução de `Result` para HTTP valem para qualquer linguagem, e a fonte deles é [shared/platform/api-design.md](../../../shared/platform/api-design.md).

Em C#, esses contratos viram `record` com `required init`, que obriga o preenchimento na criação e impede a alteração depois:

```csharp
public record OrderRequest(string ProductId, int Quantity);

public record OrderResponse
{
    public required Guid Id { get; init; }
    public required string ProductId { get; init; }
    public required int Quantity { get; init; }
    public required decimal Total { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}

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

A tradução de `Result` para HTTP acontece no handler ou numa extensão sobre o `Result`, com `TypedResults` (veja [TypedResults e Results](#typedresults-vs-results)).

Versionamento, o verbo QUERY e o formato de erro Problem Details também são agnósticos e vivem na SSOT. Do lado do ASP.NET Core: o versionamento de rota usa o pacote `Asp.Versioning.Http`, que serve `/api/v1` e `/api/v2` lado a lado; um verbo fora do conjunto padrão entra por `app.MapMethods("/reports", ["QUERY"], ...)`; e o corpo de erro no formato Problem Details sai pronto de `TypedResults.Problem(...)`, que já preenche `type`, `title`, `status` e `detail`.
