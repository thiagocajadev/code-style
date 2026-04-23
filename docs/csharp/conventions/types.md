# Types

> Escopo: **idioma C# / .NET moderno**. Decisões de arquitetura entre tipos (quando criar contratos, quando herdar, quando compor) estão em `shared/architecture/architecture.md` e `shared/architecture/patterns.md`; este documento cobre as ferramentas do idioma.

O sistema de tipos do C# oferece várias formas de descrever contratos: `interface`, `abstract class`, `class`, `record`, `struct`. Cada uma tem um domínio natural. A escolha errada não quebra nada, mas empurra decisões para o tipo errado.

## Interface vs abstract class

`interface` descreve **capacidade** — o que o tipo consegue fazer. Suporta múltipla implementação, não carrega estado. `abstract class` descreve **identidade parcial** — uma base comum com estado e comportamento compartilhados, completada pelas filhas.

A regra prática: se duas implementações vão compartilhar código, `abstract class`. Se só compartilham contrato, `interface`.

<details>
<summary>❌ Bad — interface usada para compartilhar código entre implementações</summary>
<br>

```csharp
public interface OrderProcessor
{
    // C# 8+ permite default implementation, mas vira caverna de herança diamante
    Task<Result> ProcessAsync(Order order)
    {
        var validation = Validate(order);
        if (validation.IsFailure) return validation;
        return ExecuteAsync(order);
    }

    Result Validate(Order order);
    Task<Result> ExecuteAsync(Order order);
}
```

</details>

<br>

<details>
<summary>✅ Good — abstract class quando há estado ou template method</summary>
<br>

```csharp
public abstract class OrderProcessor(ILogger logger)
{
    protected readonly ILogger _logger = logger;

    public async Task<Result> ProcessAsync(Order order)
    {
        var validation = Validate(order);
        if (validation.IsFailure)
        {
            _logger.LogWarning("Order validation failed: {Reason}", validation.Error);
            return validation;
        }

        var execution = await ExecuteAsync(order);
        return execution;
    }

    protected abstract Result Validate(Order order);
    protected abstract Task<Result> ExecuteAsync(Order order);
}

public sealed class StandardOrderProcessor(ILogger logger) : OrderProcessor(logger)
{
    protected override Result Validate(Order order) { /* ... */ }
    protected override Task<Result> ExecuteAsync(Order order) { /* ... */ }
}
```

</details>

<br>

<details>
<summary>✅ Good — interface quando só o contrato importa</summary>
<br>

```csharp
public interface IOrderRepository
{
    Task<Order?> FindByIdAsync(Guid id, CancellationToken ct);
    Task SaveAsync(Order order, CancellationToken ct);
}

public sealed class SqlOrderRepository(AppDbContext db) : IOrderRepository { /* ... */ }
public sealed class InMemoryOrderRepository : IOrderRepository { /* testes */ }
```

</details>

## Sealed por padrão

`sealed` impede herança adicional. A recomendação do idioma moderno é **inverter o default**: toda classe concreta nasce `sealed`, exceto quando herança for um requisito explícito de design. Classe não-sealed é um contrato implícito de extensibilidade — e contrato implícito é contrato errado.

<details>
<summary>❌ Bad — classe concreta sem sealed, extensibilidade acidental</summary>
<br>

```csharp
public class OrderService(IOrderRepository orderRepository)
{
    public async Task<Result<Order>> CreateOrderAsync(OrderRequest request) { /* ... */ }
}

// em outro assembly, alguém estende sem conhecimento do autor
public class CustomOrderService : OrderService
{
    // override acidental quebra invariantes esperadas pelo OrderService original
}
```

</details>

<br>

<details>
<summary>✅ Good — sealed por padrão, extensibilidade exige decisão</summary>
<br>

```csharp
public sealed class OrderService(IOrderRepository orderRepository)
{
    public async Task<Result<Order>> CreateOrderAsync(OrderRequest request) { /* ... */ }
}
```

</details>

Exceções legítimas ao sealed: tipos explicitamente desenhados para herança (template method com `abstract class`) e tipos expostos em bibliotecas públicas que documentam o contrato de extensão.

## Record vs class

`record` é a escolha padrão para **tipos de dados immutable** (que não mudam): DTOs, Value Objects, respostas de API, resultados de domínio. Fornece igualdade por valor, `ToString()` útil, e `with` expressions sem boilerplate. `class` fica para tipos com identidade, estado mutável ou comportamento rico.

<details>
<summary>❌ Bad — class mutable para dados immutable</summary>
<br>

```csharp
public class OrderResponse
{
    public Guid Id { get; set; }
    public string ProductId { get; set; }
    public decimal Total { get; set; }

    // igualdade por referência — duas OrderResponse com os mesmos valores comparam desiguais
}
```

</details>

<br>

<details>
<summary>✅ Good — record para dados, igualdade estrutural sem boilerplate</summary>
<br>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required string ProductId { get; init; }
    public required decimal Total { get; init; }
}

var updated = orderResponse with { Total = newTotal };
```

</details>

`record struct` existe quando o valor fixo também precisa ser um value type (alocação em pilha, passagem por valor). Usar apenas com medição de alocações, não por reflexo.

## Nullable Reference Types

Habilitar `<Nullable>enable</Nullable>` no `.csproj` torna a ausência de valor parte do contrato. `string` nunca é nulo; `string?` pode ser. O compilador obriga o tratamento antes de usar.

<details>
<summary>❌ Bad — nullable desligado, null silencioso no contrato</summary>
<br>

```csharp
public class OrderService
{
    public Order FindById(Guid id)
    {
        // o retorno aceita null sem marcar no contrato
        // caller não tem aviso do compilador
        return _orderRepository.FindById(id);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — nullable habilitado, contrato explícito</summary>
<br>

```csharp
public sealed class OrderService(IOrderRepository orderRepository)
{
    public Order? FindById(Guid id)
    {
        var order = orderRepository.FindById(id);
        return order;
    }
}

// caller é forçado a tratar
var order = orderService.FindById(id);
if (order is null)
    return NotFound();

var total = order.Total; // narrowed para Order não-nulo
```

</details>

O operador `!` (null-forgiving) suprime o aviso do compilador. Usar apenas quando o contrato externo do tipo já garante não-nulo e o compilador não consegue inferir — nunca para calar alerta genuíno. Detalhes em [null-safety.md](./advanced/null-safety.md).

## Pattern matching

Pattern matching substitui cadeias de `if/else` com `is`, `switch` expressions e property patterns. Reduz boilerplate e faz narrowing automático. O compilador garante exaustividade quando o input é uma hierarquia fechada.

<details>
<summary>❌ Bad — cadeia de if com cast explícito</summary>
<br>

```csharp
public string DescribePayment(IPayment payment)
{
    if (payment is CreditCard)
    {
        var creditCard = (CreditCard)payment;
        return $"Credit card ending in {creditCard.LastFour}";
    }

    if (payment is Pix)
    {
        var pix = (Pix)payment;
        return $"Pix to {pix.Key}";
    }

    return "Unknown payment";
}
```

</details>

<br>

<details>
<summary>✅ Good — is-expression com narrowing e descrição nomeada por variante</summary>
<br>

```csharp
public string DescribePayment(IPayment payment)
{
    if (payment is CreditCard creditCard)
    {
        var creditCardDescription = $"Credit card ending in {creditCard.LastFour}";
        return creditCardDescription;
    }

    if (payment is Pix pix)
    {
        var pixDescription = $"Pix to {pix.Key}";
        return pixDescription;
    }

    var fallback = "Unknown payment";
    return fallback;
}
```

</details>

Quando o domínio tem variantes fechadas, o pattern matching troca o discriminador implícito por estrutura:

<details>
<summary>✅ Good — discriminated result via pattern matching</summary>
<br>

```csharp
public abstract record PaymentResult
{
    public sealed record Success(string TransactionId) : PaymentResult;
    public sealed record Failure(string ErrorCode, string ErrorMessage) : PaymentResult;
}

public IActionResult HandlePayment(PaymentResult result)
{
    if (result is PaymentResult.Success success)
    {
        var successBody = new { success.TransactionId };
        var okResponse = Ok(successBody);

        return okResponse;
    }

    if (result is PaymentResult.Failure failure)
    {
        var failureBody = new { failure.ErrorCode, failure.ErrorMessage };
        var badRequest = BadRequest(failureBody);

        return badRequest;
    }

    var serverError = StatusCode(500);
    return serverError;
}
```

</details>

## Generics com constraints

Generic sem constraint descreve qualquer tipo — é abstração sem propósito. Constraints (`where T : IEntity`, `where T : struct`, `where T : new()`) tornam o contrato do genérico parte da assinatura e permitem usar membros do tipo dentro do método.

<details>
<summary>❌ Bad — genérico sem constraint, reflection para descobrir capability</summary>
<br>

```csharp
public T? Find<T>(Guid id) where T : class
{
    // método precisa lançar exceção se T não for uma entidade
    var entityType = typeof(T);
    var idProperty = entityType.GetProperty("Id");
    if (idProperty is null)
        throw new InvalidOperationException($"{entityType.Name} is not an entity.");

    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — constraint declara capability, compilador valida</summary>
<br>

```csharp
public interface IEntity
{
    Guid Id { get; }
}

public T? Find<T>(Guid id) where T : class, IEntity
{
    var entity = _context.Set<T>().FirstOrDefault(e => e.Id == id);
    return entity;
}
```

</details>

## Evitar `dynamic`

`dynamic` desliga a checagem de tipos — volta o C# ao mundo do JavaScript dos anos 2000. Erros que seriam de compilação viram `RuntimeBinderException` em produção.

Existem dois casos legítimos: interop com COM/Office e desserialização de shapes genuinamente dinâmicos (e mesmo assim, preferir `JsonElement` / `JsonNode`).

<details>
<summary>❌ Bad — dynamic para conveniência</summary>
<br>

```csharp
public void ProcessConfig(dynamic config)
{
    var endpoint = config.Api.Endpoint; // erro de digitação vira exception em runtime
    var timeout = config.Api.TimoutSeconds; // typo silencioso
}
```

</details>

<br>

<details>
<summary>✅ Good — tipo concreto ou JsonElement</summary>
<br>

```csharp
public sealed record ApiConfig
{
    public required string Endpoint { get; init; }
    public required int TimeoutSeconds { get; init; }
}

public void ProcessConfig(ApiConfig config)
{
    var endpoint = config.Endpoint;
    var timeout = config.TimeoutSeconds;
}
```

</details>
