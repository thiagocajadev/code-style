# Vertical Slice Architecture

> Escopo: C#. Visão transversal: [shared/architecture.md](../../shared/architecture.md).

Cada feature é uma fatia vertical autossuficiente — sem camadas horizontais cruzando o sistema. A fatia de pedidos tem suas rotas, contratos, regras de negócio e acesso a dados. Nenhuma dependência cruza para outra fatia.

Este documento segue o ciclo de vida de uma requisição: de `Program.cs` até o response final.

## Estrutura de arquivos

```
src/
├── Program.cs
├── Features/
│   └── Orders/
│       ├── OrdersModule.cs          ← DI + registro de rotas
│       ├── OrderAliases.cs          ← global using aliases de retorno
│       ├── OrderContracts.cs        ← request e response records
│       ├── OrderContexts.cs         ← context records para [AsParameters]
│       ├── OrderCreateSanitizer.cs  ← normaliza entrada (puro, sem I/O)
│       ├── OrderCreateValidator.cs  ← valida input (puro, sem I/O)
│       ├── IOrderBusinessRules.cs   ← contrato de regras de negócio
│       ├── OrderBusinessRules.cs    ← regras de negócio (com I/O)
│       ├── IOrderRepository.cs      ← contrato de persistência
│       ├── IOrderReader.cs          ← contrato de leitura
│       ├── OrderResponseFilterOutput.cs   ← formata resposta (puro, sem I/O)
│       ├── Create.cs                ← handler
│       └── GetById.cs               ← handler
├── Infrastructure/
│   └── Extensions/
│       ├── ServiceExtensions.cs     ← AddDefaults
│       ├── AppExtensions.cs         ← UseDefaults
│       └── ModuleExtensions.cs      ← RegisterModules + MapModules
└── Shared/
    ├── IModule.cs
    ├── Result.cs
    ├── ResultExtensions.cs
    └── Filters/
        └── ValidationFilter.cs
```

## Pipeline

```
HTTP Request
  ↓
ValidationFilter     → body nulo → 400
  ↓
[AsParameters]       → DI resolve o context record
  ↓
1. Sanitize          → normaliza input                        (puro, sem I/O)
  ↓
2. Validate          → Result<T>      falha → 400             (puro, sem I/O)
  ↓
3. Business Rules    → Result<bool>   falha → 404 / 409       (com I/O)
  ↓
4. Save              → void — CQS                             (com I/O)
  ↓
5. Read              → Result<Order>  falha → 500             (com I/O)
  ↓
6. Filter Output     → OrderResponse                          (puro, sem I/O)
  ↓
TypedResults         → 201 Created / 200 Ok / 400 / 404 / 500
```

---

## 1. Entry point

`Program.cs` declara intenção em 4 linhas. Toda configuração é delegada.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddDefaults();

var app = builder.Build();
app.UseDefaults();

app.Run();
```

`AddDefaults` registra infraestrutura e chama `RegisterModules` — que descobre todos os `IModule` via reflexão e registra seus serviços de DI automaticamente.

```csharp
// Infrastructure/Extensions/ServiceExtensions.cs
public static class ServiceExtensions
{
    public static WebApplicationBuilder AddDefaults(this WebApplicationBuilder builder)
    {
        builder.Services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
            {
                context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
                context.ProblemDetails.Extensions["timestamp"] = DateTimeOffset.UtcNow;
            };
        });

        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();

        builder.RegisterModules();

        return builder;
    }
}
```

`UseDefaults` configura o pipeline e chama `MapModules` — que mapeia as rotas de todos os módulos.

```csharp
// Infrastructure/Extensions/AppExtensions.cs
public static class AppExtensions
{
    public static WebApplication UseDefaults(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapModules();

        return app;
    }
}
```

---

## 2. Módulos — IModule e auto-discovery

Cada fatia implementa `IModule`. `ModuleExtensions` descobre todos os módulos via reflexão — tanto rotas quanto serviços de DI são registrados automaticamente. Nenhuma feature precisa ser adicionada manualmente ao aggregator.

```csharp
// Shared/IModule.cs
public interface IModule
{
    IServiceCollection RegisterServices(IServiceCollection services);
    IEndpointRouteBuilder MapEndpoints(IEndpointRouteBuilder app);
}
```

```csharp
// Infrastructure/Extensions/ModuleExtensions.cs
public static class ModuleExtensions
{
    private static readonly IReadOnlyList<IModule> Modules = Assembly
        .GetExecutingAssembly()
        .GetTypes()
        .Where(type => typeof(IModule).IsAssignableFrom(type) && !type.IsInterface)
        .Select(Activator.CreateInstance)
        .Cast<IModule>()
        .ToList();

    public static WebApplicationBuilder RegisterModules(this WebApplicationBuilder builder)
    {
        foreach (var module in Modules)
            module.RegisterServices(builder.Services);

        return builder;
    }

    public static WebApplication MapModules(this WebApplication app)
    {
        foreach (var module in Modules)
            module.MapEndpoints(app);

        return app;
    }
}
```

`OrdersModule` registra os serviços da fatia e mapeia as rotas com seus filtros:

```csharp
// Features/Orders/OrdersModule.cs
namespace Features.Orders;

public sealed class OrdersModule : IModule
{
    public IServiceCollection RegisterServices(IServiceCollection services)
    {
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderBusinessRules, OrderBusinessRules>();
        services.AddScoped<IOrderReader, OrderReader>();

        return services;
    }

    public IEndpointRouteBuilder MapEndpoints(IEndpointRouteBuilder app)
    {
        app.MapPost("/orders", Create.Handle)
           .WithTags("Orders")
           .WithSummary("Places a new order")
           .AddEndpointFilter<ValidationFilter<OrderCreateRequest>>();

        app.MapGet("/orders/{id:guid}", GetById.Handle)
           .WithTags("Orders")
           .WithSummary("Returns an order by id");

        return app;
    }
}
```

---

## 3. Contratos — request, response e aliases

`OrderContracts.cs` define os tipos que fluem pela fatia. `OrderAliases.cs` declara os tipos de retorno HTTP — uma linha por status possível, `global using` válido em todo o assembly.

```csharp
// Features/Orders/OrderContracts.cs
namespace Features.Orders;

public sealed record OrderCreateRequest(
    Guid CustomerId,
    IReadOnlyList<OrderItemRequest> Items);

public sealed record OrderItemRequest(Guid ProductId, int Quantity);

public sealed record OrderResponse(
    Guid Id,
    Guid CustomerId,
    IReadOnlyList<OrderItemRequest> Items,
    DateTimeOffset CreatedAt);
```

```csharp
// Features/Orders/OrderAliases.cs
global using OrderCreateResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Created<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.BadRequest<string>,
    Microsoft.AspNetCore.Http.HttpResults.ProblemHttpResult>;

global using OrderGetResult = Microsoft.AspNetCore.Http.HttpResults.Results<
    Microsoft.AspNetCore.Http.HttpResults.Ok<Features.Orders.OrderResponse>,
    Microsoft.AspNetCore.Http.HttpResults.NotFound>;
```

---

## 4. Entrada da requisição — filter e context

Antes de chegar ao handler, a requisição passa pelo `ValidationFilter`. Se o body for nulo, retorna `400` imediatamente — o handler não é chamado.

```csharp
// Shared/Filters/ValidationFilter.cs
public sealed class ValidationFilter<TRequest> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var request = context.Arguments.OfType<TRequest>().FirstOrDefault();

        if (request is null)
            return TypedResults.BadRequest("Request body is required.");

        return await next(context);
    }
}
```

O handler recebe um único parâmetro via `[AsParameters]`. O framework resolve cada propriedade do record individualmente via DI — sem service locator, sem parâmetros avulsos.

```csharp
// Features/Orders/OrderContexts.cs
namespace Features.Orders;

public sealed record OrderCreateContext(
    OrderCreateRequest Request,
    IOrderRepository Repository,
    IOrderBusinessRules BusinessRules,
    IOrderReader Reader,
    CancellationToken CancellationToken);

public sealed record OrderGetContext(
    Guid Id,
    IOrderReader Reader,
    CancellationToken CancellationToken);
```

---

## 5. Pipeline — 6 steps invariantes

Todo handler segue esta sequência. Nenhuma etapa é opcional, nenhuma pode ser reordenada.

```
1. Sanitize       → normaliza entrada            (puro, sem I/O, classe estática)
2. Validate       → regras de input              (puro, sem I/O, classe estática)
3. BusinessRules  → regras de domínio            (com I/O, interface injetada)
4. Save           → persiste (void — CQS)        (comando, sem retorno de dados)
5. Read           → busca o que foi salvo        (query, interface separada)
6. FilterOutput   → formata a resposta           (puro, sem I/O, classe estática)
```

### 5.1 Sanitize

Normaliza o input antes de qualquer validação. Dados sujos que passam pela validação podem falhar silenciosamente em operações posteriores.

```csharp
// Features/Orders/OrderCreateSanitizer.cs
namespace Features.Orders;

public static class OrderCreateSanitizer
{
    public static OrderCreateRequest Sanitize(OrderCreateRequest request) =>
        request with
        {
            Items = request.Items
                .Where(item => item.Quantity > 0)
                .ToList()
        };
}
```

### 5.2 Validate

Valida regras de input — sem I/O. Retorna `Result<T>`: happy path usa o `implicit operator` (`return request`), falha usa `Fail` com código semântico.

```csharp
// Features/Orders/OrderCreateValidator.cs
namespace Features.Orders;

public static class OrderCreateValidator
{
    public static Result<OrderCreateRequest> Validate(OrderCreateRequest request)
    {
        if (request.CustomerId == Guid.Empty)
            return Result<OrderCreateRequest>.Fail("Customer id is required.", "INVALID_CUSTOMER_ID");

        if (!request.Items.Any())
            return Result<OrderCreateRequest>.Fail("Order must have at least one item.", "INVALID_ITEMS");

        return request;
    }
}
```

### 5.3 Business Rules

Valida regras de domínio — com I/O. Separado do validator porque depende de repositórios. Injetado via interface para testabilidade.

```csharp
// Features/Orders/IOrderBusinessRules.cs
namespace Features.Orders;

public interface IOrderBusinessRules
{
    Task<Result<bool>> ValidateAsync(OrderCreateRequest request, CancellationToken cancellationToken);
}
```

```csharp
// Features/Orders/OrderBusinessRules.cs
namespace Features.Orders;

public sealed class OrderBusinessRules(IOrderRepository repository) : IOrderBusinessRules
{
    public async Task<Result<bool>> ValidateAsync(
        OrderCreateRequest request,
        CancellationToken cancellationToken)
    {
        var customerExists = await repository.CustomerExistsAsync(request.CustomerId, cancellationToken);

        if (!customerExists)
            return Result<bool>.Fail("Customer not found.", "NOT_FOUND");

        var hasDuplicateItems = request.Items
            .GroupBy(item => item.ProductId)
            .Any(group => group.Count() > 1);

        if (hasDuplicateItems)
            return Result<bool>.Fail("Order has duplicate products.", "DUPLICATE_ITEMS");

        return true;
    }
}
```

### 5.4 Save

Persiste o aggregate — retorna `void`. CQS obrigatório: um comando não produz dados. A leitura pós-save é responsabilidade do step seguinte.

```csharp
// Features/Orders/IOrderRepository.cs
namespace Features.Orders;

public interface IOrderRepository
{
    Task SaveAsync(Order order, CancellationToken cancellationToken);
    Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken cancellationToken);
}
```

### 5.5 Read

Busca o que foi salvo via interface de leitura separada. `IOrderReader` é distinto de `IOrderRepository` — command e query em contratos distintos.

```csharp
// Features/Orders/IOrderReader.cs
namespace Features.Orders;

public interface IOrderReader
{
    Task<Result<Order>> FindByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

### 5.6 Filter Output

Projeta a entidade no DTO de resposta. Nunca retorna a entidade de domínio diretamente — campos internos ficam ocultos.

```csharp
// Features/Orders/OrderResponseFilterOutput.cs
namespace Features.Orders;

public static class OrderResponseFilterOutput
{
    public static OrderResponse Apply(Order order) =>
        new(
            Id: order.Id,
            CustomerId: order.CustomerId,
            Items: order.Items.Select(MapItem).ToList(),
            CreatedAt: order.CreatedAt);

    private static OrderItemRequest MapItem(OrderItem item) =>
        new(item.ProductId, item.Quantity);
}
```

---

## 6. Orquestrador — handler

O handler orquestra os 6 steps em sequência. Retorna cedo na falha, nunca implementa lógica diretamente.

<details>
<summary>❌ Bad — lógica inline, SaveAsync retornando entidade, sem sanitize</summary>
<br>

```csharp
// ❌ valida inline, CQS violado (SaveAsync retorna entidade), lógica no return
public static async Task<IResult> Handle(
    OrderCreateRequest request,
    IOrderRepository repository,
    CancellationToken cancellationToken)
{
    if (request.CustomerId == Guid.Empty)
        return TypedResults.BadRequest("Customer required.");

    var saved = await repository.SaveAsync(request, cancellationToken); // retorna entidade — CQS violado

    return TypedResults.Created($"/orders/{saved.Id}", saved); // lógica no return
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador slim, 6 steps explícitos</summary>
<br>

```csharp
// Features/Orders/Create.cs
namespace Features.Orders;

public static class Create
{
    public static async Task<OrderCreateResult> Handle(
        [AsParameters] OrderCreateContext context)
    {
        var (request, repository, businessRules, reader, cancellationToken) = context;

        var sanitized = OrderCreateSanitizer.Sanitize(request);
        var validation = OrderCreateValidator.Validate(sanitized);

        if (!validation.IsSuccess)
            return TypedResults.BadRequest(validation.Error!.Message);

        var businessValidation = await businessRules.ValidateAsync(sanitized, cancellationToken);

        if (!businessValidation.IsSuccess)
            return TypedResults.Problem(businessValidation.Error!.Message);

        var order = Order.From(sanitized);

        await repository.SaveAsync(order, cancellationToken);

        var saved = await reader.FindByIdAsync(order.Id, cancellationToken);

        if (!saved.IsSuccess)
            return TypedResults.Problem(saved.Error!.Message);

        var orderLocation = $"/orders/{order.Id}";
        var orderResponse = OrderResponseFilterOutput.Apply(saved.Value!);
        var response = TypedResults.Created(orderLocation, orderResponse);

        return response;
    }
}
```

```csharp
// Features/Orders/GetById.cs
namespace Features.Orders;

public static class GetById
{
    public static async Task<OrderGetResult> Handle(
        [AsParameters] OrderGetContext context)
    {
        var (id, reader, cancellationToken) = context;

        var found = await reader.FindByIdAsync(id, cancellationToken);

        if (!found.IsSuccess)
            return TypedResults.NotFound();

        var orderResponse = OrderResponseFilterOutput.Apply(found.Value!);
        var response = TypedResults.Ok(orderResponse);

        return response;
    }
}
```

</details>

---

## 7. Shared — Result e extensões

`Result<T>` é o tipo de retorno de todo step do pipeline. Ver [error-handling.md](../advanced/error-handling.md) para o raciocínio completo.

```csharp
// Shared/Result.cs
public sealed record ApiError(string Message, string Code);

public record Result<T>(bool IsSuccess, bool IsFailure, T? Value, ApiError? Error)
{
    public static Result<T> Success(T value) => new(true, false, value, null);
    public static Result<T> Fail(string message, string code) => new(false, true, default, new ApiError(message, code));

    public static implicit operator Result<T>(T value) => Success(value);
}
```

`ToHttpError` é usado em handlers com retorno `IResult`. Handlers com tipo union (`OrderCreateResult`) mapeiam erros explicitamente via `TypedResults.*` para preservar os tipos do contrato.

```csharp
// Shared/ResultExtensions.cs
public static class ResultExtensions
{
    public static IResult ToHttpError<T>(this Result<T> result) =>
        result.Error!.Code switch
        {
            "NOT_FOUND" => TypedResults.NotFound(),
            "UNAUTHORIZED" => TypedResults.Unauthorized(),
            "CONFLICT" => TypedResults.Conflict(),
            _ => TypedResults.Problem(result.Error.Message)
        };
}
```

---

## Testes

Os handlers estáticos são testáveis diretamente via context record — sem mocks de framework, sem `WebApplicationFactory` para testes unitários.

```csharp
[Fact]
public async Task ReturnsBusinessRuleFailureWhenCustomerDoesNotExist()
{
    var request = new OrderCreateRequest(CustomerId: Guid.NewGuid(), Items: [new(Guid.NewGuid(), 1)]); // arrange
    var repository = new FakeOrderRepository(customerExists: false);
    var businessRules = new OrderBusinessRules(repository);
    var reader = new FakeOrderReader();
    var context = new OrderCreateContext(request, repository, businessRules, reader, CancellationToken.None);

    var actualResult = await Create.Handle(context); // act

    var actualHttpResult = actualResult.Result; // assert
    var expectedType = typeof(ProblemHttpResult);
    Assert.IsType(expectedType, actualHttpResult);
}
```

Para convenções de teste completas, ver [testing.md](../advanced/testing.md).

---

## Anti-patterns

<details>
<summary>❌ Bad — violações frequentes no padrão vertical slice</summary>
<br>

```csharp
// ❌ SaveAsync retornando entidade — CQS violado
var saved = await repository.SaveAsync(order, cancellationToken);

// ❌ leitura no mesmo contrato do comando — mistura command e query
public Task<Order> SaveAndReturnAsync(Order order, CancellationToken cancellationToken);

// ❌ regra de negócio inline no handler — step 3 fora do lugar
var customerExists = await repository.CustomerExistsAsync(request.CustomerId, cancellationToken);
if (!customerExists)
    return TypedResults.NotFound();

// ❌ lógica no return — URL e DTO construídos inline
return TypedResults.Created($"/orders/{order.Id}", OrderResponseFilterOutput.Apply(saved.Value!));
```

</details>
