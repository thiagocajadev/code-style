# Dependency Injection

> Escopo: C#. Idiomas específicos deste ecossistema.

**DI** torna dependências explícitas, testáveis e substituíveis. O container do .NET resolve o grafo automaticamente. A única responsabilidade do código é declarar o que precisa, não como obtê-lo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DI** (Dependency Injection · Injeção de Dependências) | Padrão em que o container fornece dependências em vez de a classe construí-las |
| **IoC container** (Inversion of Control · Inversão de Controle) | Componente que registra serviços e resolve o grafo de dependências por construtor |
| **Service Locator** (localizador de serviços) | Antipadrão: buscar dependências do container dentro da classe; torna dependências implícitas |
| **constructor injection** (injeção via construtor) | Forma preferida: parâmetros do construtor declaram tudo que a classe precisa |
| **Singleton** (instância única) | Tempo de vida em que uma única instância serve todo o app |
| **Scoped** (por escopo de requisição) | Tempo de vida em que uma instância dura por requisição/escopo |
| **Transient** (por chamada) | Tempo de vida em que cada resolução cria uma nova instância |
| **captive dependency** (dependência cativa) | Bug em que `Singleton` mantém referência a `Scoped`/`Transient`, vazando além do escopo |

## Service locator

Service locator é o antipadrão clássico de DI: buscar dependências diretamente do container dentro da classe. Torna dependências implícitas, dificulta testes e cria acoplamento ao container.

<details>
<summary>❌ Ruim: dependência implícita, acoplado ao container</summary>

```csharp
public class OrderService(IServiceProvider services)
{
    public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
    {
        var repository = services.GetRequiredService<IOrderRepository>();
        var notifier = services.GetRequiredService<INotifier>();
        // ...
    }
}
```

</details>

<details>
<summary>✅ Bom: dependências explícitas no contrato</summary>

```csharp
public class OrderService(IOrderRepository orderRepository, INotifier notifier)
{
    public async Task<Result<Invoice>> ProcessOrderAsync(OrderRequest request, CancellationToken ct)
    {
        // ...
    }
}
```

</details>

## Primary constructors

C# 12 introduziu primary constructors para classes. Substitui o padrão verboso de campo + construtor explícito. Parâmetros são promovidos a campos `readonly` com `_camelCase`.

<details>
<summary>❌ Ruim: construtor explícito verboso</summary>

```csharp
public class OrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly INotifier _notifier;

    public OrderService(IOrderRepository orderRepository, INotifier notifier)
    {
        _orderRepository = orderRepository;
        _notifier = notifier;
    }
}
```

</details>

<details>
<summary>✅ Bom: primary constructor, DI direta e concisa</summary>

```csharp
public class OrderService(IOrderRepository orderRepository, INotifier notifier)
{
    private readonly IOrderRepository _orderRepository = orderRepository;
    private readonly INotifier _notifier = notifier;
}
```

</details>

## Lifetimes

O container resolve cada dependência com um tempo de vida. Escolher errado gera bugs silenciosos em produção.

| Lifetime | Instância | Quando usar |
| --- | --- | --- |
| `Scoped` | Uma por request HTTP | Repositórios, services de domínio, `DbContext` |
| `Transient` | Nova a cada resolução | Objetos leves e sem estado compartilhado |
| `Singleton` | Uma para toda a aplicação | Configuração, cache, `IHttpClientFactory` |

**Captive dependency**: um `Singleton` que recebe um `Scoped` captura a instância na primeira resolução. O `Scoped` passa a viver para sempre: comportamento incorreto e difícil de rastrear.

<details>
<summary>❌ Ruim: singleton captura scoped</summary>

```csharp
builder.Services.AddSingleton<ReportService>();
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();

public class ReportService(IOrderRepository orderRepository) { } // capturado na primeira resolução
```

</details>

<details>
<summary>✅ Bom: lifetimes compatíveis</summary>

```csharp
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
```

</details>

## Interface para testabilidade

Depender de interfaces, não de implementações concretas. Permite substituição em testes sem alterar o código de produção.

<details>
<summary>❌ Ruim: dependência concreta, impossível substituir em testes</summary>

```csharp
public class OrderService(SqlOrderRepository orderRepository) { }
```

</details>

<details>
<summary>✅ Bom: dependência por interface, substituível</summary>

```csharp
public class OrderService(IOrderRepository orderRepository) { }

// produção
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();

// testes
services.AddScoped<IOrderRepository, FakeOrderRepository>();
```

</details>

## Registro por assembly

Em domínios com muitos handlers, registrar cada um manualmente é repetitivo e fácil de esquecer. O .NET permite varrer o assembly via reflection e registrar por convenção de nome ou interface marcadora, sem dependência externa.

<details>
<summary>❌ Ruim: registro manual, cresce junto com os handlers</summary>

```csharp
public static WebApplicationBuilder AddOrders(this WebApplicationBuilder builder)
{
    builder.Services.AddScoped<FindOrdersHandler>();
    builder.Services.AddScoped<FindOrderByIdHandler>();

    builder.Services.AddScoped<CreateOrderHandler>();
    builder.Services.AddScoped<UpdateOrderHandler>();

    builder.Services.AddScoped<CancelOrderHandler>();
    // a cada novo handler, uma nova linha aqui

    return builder;
}
```

</details>

<details>
<summary>✅ Bom: registro por convenção via reflection</summary>

```csharp
// interface marcadora: sem métodos, só para identificar handlers no assembly
public interface IHandler { }

public class CreateOrderHandler(OrderService orderService) : IHandler { }
public class FindOrderByIdHandler(OrderService orderService) : IHandler { }
```

```csharp
public static WebApplicationBuilder AddOrders(this WebApplicationBuilder builder)
{
    var assembly = typeof(CreateOrderHandler).Assembly;
    var handlerTypes = assembly.GetTypes()
        .Where(t => typeof(IHandler).IsAssignableFrom(t) && t is { IsAbstract: false, IsInterface: false });

    foreach (var handlerType in handlerTypes)
        builder.Services.AddScoped(handlerType);

    builder.Services.AddScoped<OrderService>();

    return builder;
}
```

</details>

> [!NOTE]
> [Scrutor](https://github.com/khellang/Scrutor) é uma biblioteca popular que adiciona assembly scanning fluente ao container nativo do .NET. Útil quando o registro por convenção é usado em vários domínios e a abordagem manual via reflection se repete.

## Registro

O registro das dependências pertence ao extension method do domínio, não ao `Program.cs`. Veja [Project Foundation](../../setup/project-foundation.md#extension-methods-por-domínio).
