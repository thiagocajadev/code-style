# Null Safety

> Escopo: C#. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

C# 8 introduziu nullable reference types: o compilador passou a distinguir `string` (não-nulo
garantido) de `string?` (pode ser null). C# 14 adicionou null-conditional assignment, completando
o conjunto de operadores null-safe. Ativado globalmente, o compilador bloqueia violações antes do
runtime.

> Conceito geral: [Null Safety](../../../shared/standards/null-safety.md)

## Configuração: habilitar globalmente

Ativar no `.csproj` cobre todo o projeto. Por arquivo com `#nullable enable` é para migração
gradual; o destino é sempre global.

```xml
<!-- .csproj -->
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
</PropertyGroup>
```

Com `TreatWarningsAsErrors`, o compilador bloqueia o build em violações de nullability, não
apenas avisa.

## required e init: contratos não-nulos em tempo de compilação

`required` (C# 11) força o inicializador de objeto a preencher o campo. `init` torna o campo
imutável após a construção. Juntos, eliminam a necessidade de checar null em propriedades que
sempre devem ter valor.

<details>
<summary>❌ Bad — propriedades com setter público sem garantia de valor</summary>
<br>

```csharp
public class Order
{
    public string Id { get; set; }         // pode nunca ser atribuído
    public string CustomerId { get; set; } // idem
    public List<LineItem>? Items { get; set; } // null como estado inicial
}

var order = new Order(); // compila — Id e CustomerId são null
order.Items?.ForEach(ProcessItem); // defesa em cascata
```

</details>

<br>

<details>
<summary>✅ Good — required + init + coleção inicializada</summary>
<br>

```csharp
public class Order
{
    public required string Id { get; init; }
    public required string CustomerId { get; init; }
    public List<LineItem> Items { get; init; } = [];

    // var order = new Order(); // erro de compilação — Id e CustomerId obrigatórios
}

var order = new Order { Id = "ord-1", CustomerId = "cust-99" };
order.Items.ForEach(ProcessItem); // sem checagem — Items é sempre List<LineItem>
```

</details>

## Coleções nunca são nulas

Propriedades e retornos de coleção sempre têm valor: `[]` quando vazias, nunca `null`.
`Array.Empty<T>()` não aloca, sendo preferido para retornos de método.

<details>
<summary>❌ Bad — null em coleção força defesa em cada caller</summary>
<br>

```csharp
public async Task<IEnumerable<Order>?> FindOrdersByUserAsync(string userId)
{
    var orders = await _repo.FindByUserAsync(userId);
    return orders.Any() ? orders : null;
}

// caller protege-se antes de iterar
var orders = await _service.FindOrdersByUserAsync(userId);
if (orders is not null)
{
    foreach (var order in orders) ProcessOrder(order);
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia como estado neutro, sem null</summary>
<br>

```csharp
// quando o repositório já retorna [] — EF e Dapper nunca retornam null
public async Task<IReadOnlyList<Order>> FindOrdersByUserAsync(string userId)
{
    var orders = await _repo.FindByUserAsync(userId);
    return orders.ToList();
}

// quando o retorno vazio é explícito — Array.Empty<T>() não aloca
public IReadOnlyList<Order> FindOrdersByStatus(string status)
{
    if (!_validStatuses.Contains(status))
        return Array.Empty<Order>();

    var orders = _repo.FindByStatus(status);

    return orders;
}

// caller usa diretamente — sem checagem de null
var orders = await _service.FindOrdersByUserAsync(userId);
foreach (var order in orders) ProcessOrder(order);
```

</details>

## ArgumentNullException.ThrowIfNull: validação nas fronteiras

`ArgumentNullException.ThrowIfNull` (C# 11) substitui o padrão verboso de `if (x is null) throw`.
Usado nas fronteiras do sistema: construtores, métodos públicos, endpoints.

<details>
<summary>❌ Bad — verificação manual verbosa ou ausente</summary>
<br>

```csharp
public class OrderService
{
    private readonly IOrderRepository _repo;

    public OrderService(IOrderRepository repo)
    {
        if (repo is null) throw new ArgumentNullException(nameof(repo));
        _repo = repo;
    }

    public async Task<Order> FindAsync(string orderId, CancellationToken ct)
    {
        // orderId não verificado — NullReferenceException em runtime se null
        return await _repo.FindByIdAsync(orderId, ct);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — ThrowIfNull no construtor e nas fronteiras públicas</summary>
<br>

```csharp
public class OrderService(IOrderRepository repo)
{
    private readonly IOrderRepository _repo = repo ?? throw new ArgumentNullException(nameof(repo));

    public async Task<Order?> FindAsync(string orderId, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(orderId);

        var order = await _repo.FindByIdAsync(orderId, ct);
        return order;
    }
}
```

</details>

## Operadores null-safe

`?.` e `??` são atalhos para navegação segura e defaults. Use quando a ausência é um caso esperado.
Quando a ausência é um erro de negócio, guard clause é mais expressivo.

<details>
<summary>❌ Bad — encadeamento que esconde condição de negócio</summary>
<br>

```csharp
public async Task<decimal> GetOrderTotalAsync(string orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    return order?.Total ?? 0m; // se não existe, é zero? ou deveria ser um erro?
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clause quando ausência é erro; ?. quando ausência é esperada</summary>
<br>

```csharp
// ausência é erro → guard clause
public async Task<decimal> GetOrderTotalAsync(string orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    if (order is null)
        return Result<decimal>.Fail("Order not found.", "NOT_FOUND");

    return order.Total;
}

// ausência é esperada → ?. e ?? são suficientes
public string FormatUserCity(User? user)
{
    var city = user?.Address?.City ?? "Unknown";
    return city;
}
```

</details>

## ?. no lado esquerdo: null-conditional assignment (C# 14)

C# 14 permite usar `?.` no lado esquerdo de uma atribuição. A operação só executa se o receptor
não for null, sem `if` explícito, sem guard clause desnecessário.

<details>
<summary>❌ Bad — if apenas para proteger a atribuição</summary>
<br>

```csharp
if (order is not null)
    order.Status = OrderStatus.Shipped;

if (session?.User is not null)
    session.User.LastSeenAt = DateTimeOffset.UtcNow;
```

</details>

<br>

<details>
<summary>✅ Good — null-conditional assignment elimina o if</summary>
<br>

```csharp
order?.Status = OrderStatus.Shipped;

session?.User?.LastSeenAt = DateTimeOffset.UtcNow;
```

</details>

> Use quando a ausência do objeto é um caso **esperado e silencioso**. Quando a ausência é um
> erro de negócio, guard clause continua sendo a escolha certa: ela nomeia a condição.

## ??=: atribuição condicional

`??=` atribui apenas se o valor atual for null. Útil para lazy initialization e merge de defaults
sem repetir o nome da variável.

<details>
<summary>❌ Bad — verificação manual de null antes da atribuição</summary>
<br>

```csharp
public class ReportConfig
{
    public string Title { get; set; } = "Report";
    public List<string> Columns { get; set; } = [];
    public TimeSpan? CacheTimeout { get; set; }

    public ReportConfig WithDefaults()
    {
        if (CacheTimeout == null)
            CacheTimeout = TimeSpan.FromMinutes(10); // verboso — repete o nome do campo

        return this;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — ??= para defaults e lazy init</summary>
<br>

```csharp
public class ReportConfig
{
    public string Title { get; set; } = "Report";
    public List<string> Columns { get; set; } = [];
    public TimeSpan? CacheTimeout { get; set; }

    public ReportConfig WithDefaults()
    {
        CacheTimeout ??= TimeSpan.FromMinutes(10); // atribui só se null

        return this;
    }
}
```

</details>

## Null-forgiving: uso restrito

O operador `!` suprime o aviso de null do compilador. Aceitável apenas quando você tem garantia
externa que o compilador não consegue inferir. Documentar o motivo.

<details>
<summary>❌ Bad — ! para silenciar o compilador sem garantia</summary>
<br>

```csharp
var user = _cache.Get(userId)!; // e se não estiver no cache?
var config = _options.Value!;   // e se Value for null?
```

</details>

<br>

<details>
<summary>✅ Good — guard clause no lugar de !</summary>
<br>

```csharp
if (!_cache.TryGetValue(userId, out var user))
    throw new NotFoundError("User not in cache.");

// user é não-nulo aqui — compilador sabe pelo TryGetValue
```

</details>

## Atributos de análise estática

Para métodos que já fazem a verificação internamente, atributos do namespace
`System.Diagnostics.CodeAnalysis` informam o compilador do resultado, sem obrigar o caller a
repetir a checagem.

<details>
<summary>❌ Bad — parâmetro nullable sem atributo, compilador não propaga garantia</summary>
<br>

```csharp
public static class Guard
{
    // sem atributos: o compilador não sabe que value é não-nulo após a chamada
    public static void NotNull<T>(T? value, string? name = null)
    {
        ArgumentNullException.ThrowIfNull(value, name);
    }

    public static bool IsValid(string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }
}

// uso — compilador ainda emite aviso de possível null
Guard.NotNull(order);
ProcessOrder(order); // CS8604: possível argumento null

if (Guard.IsValid(email))
{
    SendEmail(email); // CS8604: email ainda considerado nullable dentro do if
}
```

</details>

<br>

<details>
<summary>✅ Good — atributos que propagam a garantia de non-null</summary>
<br>

```csharp
using System.Diagnostics.CodeAnalysis;

public static class Guard
{
    public static void NotNull<T>(
        [NotNull] T? value,
        [CallerArgumentExpression(nameof(value))] string? name = null)
    {
        ArgumentNullException.ThrowIfNull(value, name);
    }

    public static bool IsValid(
        [NotNullWhen(true)] string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }
}

// uso
Guard.NotNull(order);        // após isso, compilador sabe que order é não-nulo
if (Guard.IsValid(email))
{
    SendEmail(email);        // email é non-null dentro do if
}
```

</details>
