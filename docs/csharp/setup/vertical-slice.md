# Arquitetura de fatia vertical em C#

> Escopo: C#. Visão transversal: [shared/architecture/architecture.md](../../shared/architecture/architecture.md) · [shared/architecture/operation-flow.md](../../shared/architecture/operation-flow.md).

Numa **fatia vertical** (vertical slice), tudo o que uma funcionalidade precisa mora na mesma pasta: as rotas, os contratos, as regras de negócio e o acesso ao banco. A pasta `Features/Orders` guarda a feature de pedidos inteira, e mexer nela não obriga a abrir mais nada. Isso substitui a divisão por camadas, em que alterar um campo do pedido significa editar um arquivo na pasta de controllers, outro na de services e outro na de repositories.

Este documento acompanha uma requisição do começo ao fim, do `Program.cs` até a resposta.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Vertical Slice** (fatia vertical) | Organização por feature onde rota, contrato, regra e acesso a dados ficam colocalizados |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Contrato de entrada ou saída da feature; não muda depois de criado |
| **CQS** (Command-Query Separation, Separação Comando-Consulta) | Handler altera estado OU retorna dado, nunca os dois |
| **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) | Protocolo da fatia: verbo, status, envelope no boundary |
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa o limite do processo: banco, rede, arquivo; sempre assíncrona |

<a id="file-structure"></a>

## Onde cada arquivo mora

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

<a id="pipeline"></a>

## O caminho da requisição

Toda requisição percorre a mesma sequência, e os nomes abaixo são as classes que você vai encontrar no código:

`HTTP Request → ValidationFilter → [AsParameters] → Sanitize → Validate → Business Rules → Save → Read → Filter Output → TypedResults`

| Etapa | Papel | I/O | Falha |
| --- | --- | --- | --- |
| ValidationFilter | Rejeita body nulo antes do handler | - | 400 |
| [AsParameters] | DI resolve o context record | - | - |
| 1. Sanitize | Normaliza o input | puro | - |
| 2. Validate | Regras de input, retorna `Result<T>` | puro | 400 |
| 3. Business Rules | Regras de domínio, retorna `Result<bool>` | com I/O | 404 / 409 |
| 4. Save | Persiste, `void` (CQS) | com I/O | - |
| 5. Read | Busca o que foi salvo, `Result<Order>` | com I/O | 500 |
| 6. Filter Output | Projeta `OrderResponse` | puro | - |
| TypedResults | Resposta final | - | 201 / 200 / 400 / 404 / 500 |

---

<a id="entry-point"></a>

## 1. Ponto de entrada

O `Program.cs` cabe em quatro linhas porque não configura nada: ele chama quem configura.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddDefaults();

var app = builder.Build();
app.UseDefaults();

app.Run();
```

`AddDefaults` registra a infraestrutura e chama `RegisterModules`, que varre o assembly em busca de classes que implementam `IModule` e registra os serviços de cada uma. Uma fatia nova é descoberta por existir.

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

`UseDefaults` configura o pipeline e chama `MapModules`, que mapeia as rotas de todos os módulos.

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

<a id="modules"></a>

## 2. Cada fatia se registra sozinha

A fatia implementa `IModule`, que pede duas coisas: registrar os serviços dela e mapear as rotas dela. O `ModuleExtensions` encontra todas as implementações no assembly e chama os dois métodos de cada uma. Ninguém precisa lembrar de adicionar a feature nova a uma lista central, e por isso ninguém esquece.

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

<a id="contracts"></a>

## 3. Contratos: request, response e apelidos

`OrderContracts.cs` guarda os tipos que entram e saem da fatia. `OrderAliases.cs` batiza os tipos de retorno HTTP com um `global using`: uma linha por conjunto de status possíveis, válida no assembly inteiro, para que a assinatura do handler não carregue o namespace completo.

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

<a id="request-entry"></a>

## 4. Entrada da requisição: filtro e contexto

Antes do handler, a requisição passa pelo `ValidationFilter`. Corpo vazio vira `400` ali mesmo, e o handler nem chega a rodar. Isso poupa o handler de começar todo método verificando se o que chegou existe.

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

O handler recebe um parâmetro só, marcado com `[AsParameters]`. O framework olha dentro do record e resolve cada propriedade pelo container, como se fossem parâmetros soltos. A assinatura fica curta e as dependências continuam explícitas.

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

<a id="six-steps"></a>

## 5. Os seis passos do handler

Todo handler executa esta sequência, na íntegra e nesta ordem. A ordem existe por dependência: validar antes de limpar deixa passar um dado que a limpeza consertaria, e consultar o banco antes de validar gasta uma ida ao banco para descobrir que o campo estava vazio.

```
1. Sanitize       → normaliza entrada            (puro, sem I/O, classe estática)
2. Validate       → regras de input              (puro, sem I/O, classe estática)
3. BusinessRules  → regras de domínio            (com I/O, interface injetada)
4. Save           → persiste (void, CQS)         (comando, sem retorno de dados)
5. Read           → busca o que foi salvo        (query, interface separada)
6. FilterOutput   → formata a resposta           (puro, sem I/O, classe estática)
```

### 5.1 Sanitize

Limpa a entrada antes de qualquer verificação: aqui, descarta os itens com quantidade zero. É uma função pura, sem acesso ao banco, então dá para testá-la passando um objeto e conferindo o resultado.

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

Confere o formato do que chegou, sem consultar nada: cliente preenchido, pelo menos um item. Devolve `Result<T>`, com `Fail` e um código de erro em cada saída antecipada. O sucesso aproveita o `implicit operator` e devolve o próprio request.

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

Aqui ficam as perguntas que só o banco responde: o cliente existe? o pedido repete o mesmo produto? Esta etapa é separada do validator justamente porque acessa o repositório. Ela entra por interface, então o teste passa uma implementação em memória e continua rápido.

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

Grava o agregado e devolve `void`. O comando não entrega dado de volta: quem quiser ver o que ficou gravado usa o passo seguinte, e aí lê o estado que está no banco, com os campos que ele mesmo preencheu.

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

Busca o registro gravado por um contrato próprio. `IOrderReader` existe separado de `IOrderRepository` para que a escrita e a leitura tenham interfaces diferentes: uma pode evoluir (ganhar um filtro, uma projeção) sem mexer na outra.

```csharp
// Features/Orders/IOrderReader.cs
namespace Features.Orders;

public interface IOrderReader
{
    Task<Result<Order>> FindByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

### 5.6 Filter Output

Copia da entidade para o DTO de resposta os campos que a API publica. A entidade de domínio fica de fora da resposta, e com ela ficam os campos internos que ninguém decidiu expor.

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

<a id="handler"></a>

## 6. O handler orquestra

O handler chama os seis passos na ordem e sai na primeira falha. Ele não valida, não calcula e não monta texto: cada uma dessas coisas tem uma classe com nome. Lido de cima a baixo, ele conta a operação inteira.

<details>
<summary>❌ Ruim: lógica inline, SaveAsync retornando entidade, sem sanitize</summary>

```csharp
// ❌ valida inline, CQS violado (SaveAsync retorna entidade), lógica no return
public static async Task<IResult> Handle(
    OrderCreateRequest request,
    IOrderRepository repository,
    CancellationToken cancellationToken)
{
    if (request.CustomerId == Guid.Empty)
        return TypedResults.BadRequest("Customer required.");

    var saved = await repository.SaveAsync(request, cancellationToken); // retorna entidade: CQS violado

    return TypedResults.Created($"/orders/{saved.Id}", saved); // lógica no return
}
```

</details>

<details>
<summary>✅ Bom: orquestrador slim, 6 steps explícitos</summary>

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

<a id="shared-result"></a>

## 7. Compartilhado: Result e extensões

`Result<T>` é o que cada passo devolve: ou o valor, ou o erro com um código. O raciocínio que justifica esse tipo está em [error-handling.md](../conventions/advanced/error-handling.md).

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

`ToHttpError` traduz o código do erro em status HTTP, e serve aos handlers que devolvem `IResult`. Os handlers que enumeram os status na assinatura (como `OrderCreateResult`) escrevem cada `TypedResults.*` na mão, porque é assim que o tipo declarado no contrato se mantém.

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

<a id="tests"></a>

## Testes

O handler é um método estático que recebe um record. O teste monta esse record com implementações em memória e o chama direto, sem subir servidor e sem `WebApplicationFactory`. É por isso que a suíte roda em milissegundos.

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

Para convenções de teste completas, ver [testing.md](../conventions/advanced/testing.md).

---

<a id="anti-patterns"></a>

## Antipadrões

Os quatro desvios abaixo aparecem juntos no mesmo handler com frequência, e cada um desfaz uma decisão do padrão.

<details>
<summary>❌ Ruim: violações frequentes no padrão vertical slice</summary>

```csharp
// ❌ SaveAsync retornando entidade: CQS violado
var saved = await repository.SaveAsync(order, cancellationToken);

// ❌ leitura no mesmo contrato do comando: mistura command e query
public Task<Order> SaveAndReturnAsync(Order order, CancellationToken cancellationToken);

// ❌ regra de negócio inline no handler: step 3 fora do lugar
var customerExists = await repository.CustomerExistsAsync(request.CustomerId, cancellationToken);
if (!customerExists)
    return TypedResults.NotFound();

// ❌ lógica no return: URL e DTO construídos inline
return TypedResults.Created($"/orders/{order.Id}", OrderResponseFilterOutput.Apply(saved.Value!));
```

</details>

<details>
<summary>✅ Bom: cada step no seu lugar, comando e query separados</summary>

```csharp
// ✅ SaveAsync sem retorno: comando persiste, não devolve estado (CQS)
await repository.SaveAsync(order, cancellationToken);

// ✅ leitura por contrato próprio: query dedicada após o comando
var saved = await reader.FindByIdAsync(order.Id, cancellationToken);

// ✅ regra de negócio no step dedicado: handler orquestra, não decide
var businessValidation = await businessRules.ValidateAsync(sanitized, cancellationToken);

if (!businessValidation.IsSuccess)
    return TypedResults.Problem(businessValidation.Error!.Message);

// ✅ sem lógica no return: URL e DTO nomeados antes da saída
var orderLocation = $"/orders/{order.Id}";
var orderResponse = OrderResponseFilterOutput.Apply(saved.Value!);

var response = TypedResults.Created(orderLocation, orderResponse);
return response;
```

</details>
