# Injeção de dependências em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

**DI** (Dependency Injection · Injeção de Dependências) é o padrão em que a classe declara no construtor tudo de que precisa, e alguém de fora entrega. Esse alguém é o container do .NET, que monta a cadeia inteira sozinho: para criar o `OrderService` ele descobre que precisa de um `IOrderRepository`, cria a implementação registrada, e assim por diante. A classe fica com uma responsabilidade só, que é usar as dependências. E como quem entrega é de fora, o teste entrega um repositório que guarda os dados em memória no lugar do que fala com o banco, sem tocar no código da classe.

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

<a id="service-locator"></a>

## Service locator

Receber o `IServiceProvider` no construtor e pedir a ele as dependências lá dentro parece injeção, e funciona ao contrário dela. A assinatura da classe deixa de contar do que ela depende, e descobrir isso passa a exigir ler o corpo de todos os métodos. O teste também perde: em vez de passar um repositório falso, é preciso montar um container inteiro para satisfazer a classe.

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

<a id="primary-constructors"></a>

## Construtor primário

O C# 12 deixa declarar os parâmetros ao lado do nome da classe e usá-los direto no corpo. Some o trio que toda classe injetada repetia: o campo privado, o parâmetro e a linha que copia um no outro.

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

<a id="lifetimes"></a>

## Tempo de vida de cada dependência

Ao registrar um serviço, você decide quanto tempo a instância dele vive. `Scoped` cria uma por requisição HTTP, que é o certo para repositório e `DbContext`, porque a requisição inteira compartilha a mesma transação. `Transient` cria uma nova a cada pedido. `Singleton` cria uma só e a mantém enquanto a aplicação estiver de pé.

| Lifetime | Instância | Quando usar |
| --- | --- | --- |
| `Scoped` | Uma por request HTTP | Repositórios, services de domínio, `DbContext` |
| `Transient` | Nova a cada resolução | Objetos leves e sem estado compartilhado |
| `Singleton` | Uma para toda a aplicação | Configuração, cache, `IHttpClientFactory` |

A combinação perigosa é a **captive dependency** (dependência cativa): um `Singleton` que recebe um `Scoped` no construtor guarda para sempre a primeira instância que chegou. O `DbContext` daquela primeira requisição continua vivo, sendo usado pelas requisições seguintes. O bug aparece longe da causa, como dado de um usuário aparecendo na sessão de outro.

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

<a id="interface-for-testability"></a>

## Interface para testabilidade

Declare a dependência pela interface (`IOrderRepository`), e não pela classe concreta (`SqlOrderRepository`). A produção registra a implementação que fala com o banco; o teste registra uma que guarda tudo em memória. O código do serviço permanece o mesmo nos dois casos, e é isso que permite testar a regra de negócio sem subir um banco.

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

<a id="assembly-scanning"></a>

## Registrar os handlers varrendo o assembly

Num domínio com dezenas de handlers, a lista de registro cresce uma linha por handler, e o handler novo que ninguém registrou só quebra quando a rota é chamada. Dá para varrer o assembly com reflection e registrar tudo que implementa uma interface marcadora, que é uma interface vazia criada só para identificar essas classes. Handler novo passa a ser registrado por existir.

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

<a id="registration"></a>

## Onde fica o registro

Cada domínio registra as próprias dependências no seu extension method, e o `Program.cs` chama esses métodos. Veja [Project Foundation](../../setup/project-foundation.md#extension-methods-by-domain).
