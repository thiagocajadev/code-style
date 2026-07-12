# Tipos em C#

> Escopo: **idioma C# / .NET moderno**. Decisões de arquitetura entre tipos (quando criar contratos, quando herdar, quando compor) estão em `shared/architecture/architecture.md` e `shared/architecture/patterns.md`; este documento cobre as ferramentas do idioma.

O C# oferece cinco formas de declarar um tipo: **interface**, **abstract class**, **class**, **record** e **struct**. Cada uma resolve bem um caso e resolve mal os outros. Escolher a errada compila e roda; o custo aparece depois, quando a regra que deveria morar num lugar acaba espalhada porque o tipo escolhido não tinha onde guardá-la.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **interface** (contrato sem estado) | Descreve capacidade; suporta múltipla implementação; sem campos nem implementação obrigatória |
| **abstract class** (classe abstrata) | Identidade parcial: estado e comportamento compartilhados, completados pelas filhas |
| **class** (tipo de referência) | Tipo padrão: identidade por referência, estado pode ser alterado, alocado no heap |
| **record** (tipo com igualdade por valor) | Tipo que não muda após criação, com igualdade estrutural; ideal para DTOs e value objects |
| **struct** (tipo de valor) | Tipo alocado em pilha, igualdade por valor; para dados pequenos e sem identidade |
| **sealed** (fechada para herança) | Modificador que impede herança; comunica que a classe não foi pensada para ser estendida |
| **generic** (tipo genérico) | Parâmetro de tipo (`Result<T>`); reaproveita o contrato sem perder verificação |
| **value object** (objeto de valor) | Tipo cuja igualdade é definida pelos campos, não pela referência (`record` cobre o caso) |

<a id="interface-vs-abstract-class"></a>

## Quando usar interface e quando usar abstract class

A pergunta que decide é se as implementações vão compartilhar código. Se compartilham, use `abstract class`: ela guarda o estado comum (o logger, por exemplo) e o método que fixa a sequência dos passos, deixando as filhas preencherem os buracos. Se compartilham só a assinatura, use `interface`, que várias classes podem implementar ao mesmo tempo e que não carrega campo nenhum.

O C# 8 permite escrever corpo de método dentro da interface. Isso tenta a gente a usar interface para reaproveitar código, e aí uma classe que implementa duas interfaces com o mesmo método herda duas implementações concorrentes do mesmo nome. Deixe o código compartilhado na `abstract class`.

<details>
<summary>❌ Ruim: interface usada para compartilhar código entre implementações</summary>

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

<details>
<summary>✅ Bom: abstract class quando há estado ou template method</summary>

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

<details>
<summary>✅ Bom: interface quando só o contrato importa</summary>

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

<a id="sealed-by-default"></a>

## Toda classe concreta nasce sealed

`sealed` impede que alguém herde da classe. Vale invertê-lo em relação ao default da linguagem: marque `sealed` sempre, e tire o modificador só quando a herança for uma decisão de projeto. Uma classe aberta promete que dá para estendê-la com segurança, e essa promessa foi feita sem ninguém decidir: quem herdar vai sobrescrever um método e pode quebrar uma garantia que a classe original mantinha em silêncio.

<details>
<summary>❌ Ruim: classe concreta sem sealed, extensibilidade acidental</summary>

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

<details>
<summary>✅ Bom: sealed por padrão, extensibilidade exige decisão</summary>

```csharp
public sealed class OrderService(IOrderRepository orderRepository)
{
    public async Task<Result<Order>> CreateOrderAsync(OrderRequest request) { /* ... */ }
}
```

</details>

Duas exceções valem: o tipo desenhado para herança (a `abstract class` que fixa a sequência dos passos) e o tipo publicado numa biblioteca que documenta como estendê-lo.

<a id="record-vs-class"></a>

## record para dados, class para objetos com identidade

Use `record` quando o tipo existe para carregar valores: DTO, value object, resposta de **API** (Application Programming Interface · Interface de Programação de Aplicações), resultado de domínio. Ele entrega comparação por valor, um `ToString()` legível e a palavra `with` para criar cópias com campos trocados, sem escrever nada disso à mão.

Use `class` quando o objeto tem identidade própria e continua o mesmo depois de mudar de estado. Um pedido com o mesmo `Id` é o mesmo pedido, mesmo depois de o total mudar, e a comparação por valor do `record` daria a resposta errada nesse caso.

<details>
<summary>❌ Ruim: class com setters para dados que não mudam</summary>

```csharp
public class OrderResponse
{
    public Guid Id { get; set; }
    public string ProductId { get; set; }
    public decimal Total { get; set; }

    // igualdade por referência: duas OrderResponse com os mesmos valores comparam desiguais
}
```

</details>

<details>
<summary>✅ Bom: record para dados, igualdade estrutural sem boilerplate</summary>

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

Existe ainda o `record struct`, para quando o dado é pequeno e vale evitar a alocação no heap. Ele resolve um problema de desempenho, então adote com medição na mão.

<a id="nullable-reference-types"></a>

## Tipos de referência anuláveis

Ligar `<Nullable>enable</Nullable>` no `.csproj` muda o significado das assinaturas do projeto inteiro: `string` passa a prometer que nunca é nulo, e `string?` avisa que pode ser. O compilador cobra a verificação antes do uso, e aquele `NullReferenceException` que aparecia em produção vira aviso durante o build.

<details>
<summary>❌ Ruim: nullable desligado, null silencioso no contrato</summary>

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

<details>
<summary>✅ Bom: nullable habilitado, contrato explícito</summary>

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

O operador `!` (null-forgiving) manda o compilador confiar em você e parar de avisar. Ele cabe quando uma garantia externa ao código assegura o valor e o compilador não tem como enxergar isso. Ele não cabe para silenciar um aviso legítimo, porque o aviso volta como exceção em produção. Detalhes em [null-safety.md](./advanced/null-safety.md).

<a id="pattern-matching"></a>

## Pattern matching

O pattern matching (correspondência de padrões) troca cadeias de `if/else` por `is`, `switch` expressions e padrões que leem propriedades do objeto. Ele faz o **narrowing** (estreitamento do tipo) sozinho: dentro do bloco onde o teste passou, a variável já vem com o tipo específico. Quando o conjunto de variantes é fechado, o compilador ainda cobra o tratamento de todas.

<details>
<summary>❌ Ruim: cadeia de if com cast explícito</summary>

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

<details>
<summary>✅ Bom: is-expression com narrowing e descrição nomeada por variante</summary>

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

Quando o domínio tem um conjunto fechado de variantes, declare cada uma como um tipo. O resultado do pagamento deixa de ser um campo de texto que alguém precisa comparar com a string certa, e passa a ser `PaymentResult.Success` ou `PaymentResult.Failure`, cada um carregando os campos que só fazem sentido no seu caso.

<details>
<summary>✅ Bom: discriminated result via pattern matching</summary>

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

<a id="generics-with-constraints"></a>

## Constraint declara o que o tipo genérico precisa ter

Um genérico sem **constraint** (restrição de tipo) aceita qualquer tipo, e por isso o método não consegue chamar nada nele. A saída costuma ser descobrir a capacidade em tempo de execução, com reflection, e lançar exceção quando o tipo não serve. A constraint (`where T : IEntity`, `where T : struct`, `where T : new()`) coloca esse requisito na assinatura: o método passa a usar `e.Id` direto, e o tipo errado nem compila.

<details>
<summary>❌ Ruim: genérico sem constraint, reflection para descobrir capability</summary>

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

<details>
<summary>✅ Bom: constraint declara capability, compilador valida</summary>

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

<a id="avoid-dynamic"></a>

## Evitar `dynamic`

`dynamic` desliga a verificação de tipos naquela variável. O compilador para de conferir os nomes que você acessa, e um erro de digitação como `TimoutSeconds` compila sem reclamar e explode como `RuntimeBinderException` quando o código roda.

Dois casos justificam o uso: interoperar com COM e Office, e ler dados cujo formato muda de verdade a cada resposta. Mesmo no segundo caso, `JsonElement` ou `JsonNode` resolvem com verificação.

<details>
<summary>❌ Ruim: dynamic para conveniência</summary>

```csharp
public void ProcessConfig(dynamic config)
{
    var endpoint = config.Api.Endpoint; // erro de digitação vira exception em runtime
    var timeout = config.Api.TimoutSeconds; // typo silencioso
}
```

</details>

<details>
<summary>✅ Bom: tipo concreto ou JsonElement</summary>

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
