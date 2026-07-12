# Segurança contra nulos em C#

> Escopo: C#. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

O C# 8 ensinou o compilador a diferenciar `string`, que promete sempre ter valor, de `string?`, que avisa que pode vir vazio. Com isso, o `NullReferenceException` que só aparecia com o programa rodando passa a ser apontado durante o build. O C# 14 fechou o conjunto de operadores ao permitir o `?.` também do lado esquerdo de uma atribuição. Ligue o recurso no projeto inteiro e o compilador passa a avisar em todo ponto onde um valor que pode ser nulo é usado sem verificação.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **nullable reference types** (tipos de referência anuláveis) | Recurso do C# 8+ que distingue `string` (não-nulo) de `string?` (pode ser null) no compilador |
| **null** (ausência de valor) | Valor que indica ausência; o objetivo é tornar essa possibilidade explícita no tipo |
| **null-conditional** (acesso seguro a nulo, `?.`) | Operador que retorna null em vez de lançar `NullReferenceException` ao acessar membro de null |
| **null-coalescing** (coalescência de ausente, `??`) | Operador que devolve o lado direito quando o esquerdo é null |
| **null-forgiving** (supressão de aviso, `!`) | Operador que silencia análise de null; usar só quando há garantia que o compilador não enxerga |
| **NullReferenceException** (exceção de referência nula) | Exceção runtime ao desreferenciar null; o objetivo é eliminá-la em tempo de compilação |
| **Nullable\<T\>** (tipo de valor anulável) | Wrapper para tipos de valor (`int?`, `bool?`); equivale a `Nullable<int>` |

<a id="enable-globally"></a>

## Ligar o recurso no projeto inteiro

Uma linha no `.csproj` cobre todos os arquivos. O `#nullable enable` no topo de um arquivo existe para migrar um projeto antigo aos poucos, e o destino dessa migração continua sendo a configuração global.

```xml
<!-- .csproj -->
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
</PropertyGroup>
```

Com `TreatWarningsAsErrors`, o aviso de nulo passa a quebrar o build. Sem isso, ele vira mais uma linha amarela que o time aprende a rolar para baixo.

<a id="required-and-init"></a>

## required e init garantem o valor na construção

`required` (C# 11) obriga quem cria o objeto a preencher aquele campo, e o esquecimento vira erro de compilação. `init` deixa o campo ser escrito na criação e mais nunca. Os dois juntos removem a checagem de nulo lá na frente: se o objeto existe, o campo tem valor. Vale o mesmo para coleção, que nasce com `= []` e dispensa o `?.` em cada uso.

<details>
<summary>❌ Ruim: propriedades com setter público sem garantia de valor</summary>

```csharp
public class Order
{
    public string Id { get; set; }         // pode nunca ser atribuído
    public string CustomerId { get; set; } // idem
    public List<LineItem>? Items { get; set; } // null como estado inicial
}

var order = new Order(); // compila: Id e CustomerId são null
order.Items?.ForEach(ProcessItem); // defesa em cascata
```

</details>

<details>
<summary>✅ Bom: required + init + coleção inicializada</summary>

```csharp
public class Order
{
    public required string Id { get; init; }
    public required string CustomerId { get; init; }
    public List<LineItem> Items { get; init; } = [];

    // var order = new Order(); // erro de compilação: Id e CustomerId obrigatórios
}

var order = new Order { Id = "ord-1", CustomerId = "cust-99" };
order.Items.ForEach(ProcessItem); // sem checagem: Items é sempre List<LineItem>
```

</details>

<a id="collections-never-null"></a>

## Coleções nunca são nulas

Uma coleção sem itens é uma lista vazia. Devolver `null` para dizer "não achei nada" obriga cada chamador a testar antes do `foreach`, e basta um esquecer para a exceção aparecer. A lista vazia atravessa o `foreach` sem executar nada, que é o comportamento desejado. Em retorno de método, `Array.Empty<T>()` entrega essa lista vazia sem alocar memória.

<details>
<summary>❌ Ruim: null em coleção força defesa em cada caller</summary>

```csharp
public async Task<IEnumerable<Order>?> FindOrdersByUserAsync(string userId)
{
    var orders = await _repository.FindByUserAsync(userId);
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

<details>
<summary>✅ Bom: lista vazia como estado neutro, sem null</summary>

```csharp
// quando o repositório já retorna []: EF e Dapper nunca retornam null
public async Task<IReadOnlyList<Order>> FindOrdersByUserAsync(string userId)
{
    var orders = await _repository.FindByUserAsync(userId);
    return orders.ToList();
}

// quando o retorno vazio é explícito: Array.Empty<T>() não aloca
public IReadOnlyList<Order> FindOrdersByStatus(string status)
{
    if (!_validStatuses.Contains(status))
        return Array.Empty<Order>();

    var orders = _repository.FindByStatus(status);
    return orders;
}

// caller usa diretamente: sem checagem de null
var orders = await _service.FindOrdersByUserAsync(userId);
foreach (var order in orders) ProcessOrder(order);
```

</details>

<a id="throw-if-null"></a>

## ArgumentNullException.ThrowIfNull nos limites

`ArgumentNullException.ThrowIfNull` (C# 11) faz numa linha o que antes pedia três: testa, monta a mensagem com o nome do parâmetro e lança. Use no limite de entrada, onde o dado chega de fora e a garantia do compilador acaba: construtor, método público, endpoint. Dali para dentro, o tipo não anulável já resolve.

<details>
<summary>❌ Ruim: verificação manual verbosa ou ausente</summary>

```csharp
public class OrderService
{
    private readonly IOrderRepository _repository;

    public OrderService(IOrderRepository repository)
    {
        if (repository is null) throw new ArgumentNullException(nameof(repository));
        _repository = repository;
    }

    public async Task<Order> FindAsync(string orderId, CancellationToken ct)
    {
        // orderId não verificado: NullReferenceException em runtime se null
        return await _repository.FindByIdAsync(orderId, ct);
    }
}
```

</details>

<details>
<summary>✅ Bom: ThrowIfNull no construtor e nos limites públicos</summary>

```csharp
public class OrderService(IOrderRepository repository)
{
    private readonly IOrderRepository _repository = repository ?? throw new ArgumentNullException(nameof(repository));

    public async Task<Order?> FindAsync(string orderId, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(orderId);

        var order = await _repository.FindByIdAsync(orderId, ct);
        return order;
    }
}
```

</details>

<a id="null-safe-operators"></a>

## Quando usar `?.` e `??`, e quando usar guard clause

`?.` e `??` servem para a ausência que o sistema já espera: o usuário não preencheu o endereço, então mostre "Unknown". Eles resolvem em silêncio, e é isso que os torna perigosos no outro caso. `order?.Total ?? 0m` devolve zero para um pedido que não existe, e zero é um total plausível: o erro atravessa o sistema disfarçado de dado válido. Quando a ausência significa que algo deu errado, use guard clause, que dá nome à condição e devolve o erro.

<details>
<summary>❌ Ruim: encadeamento que esconde condição de negócio</summary>

```csharp
public async Task<decimal> GetOrderTotalAsync(string orderId, CancellationToken ct)
{
    var order = await _repository.FindByIdAsync(orderId, ct);
    return order?.Total ?? 0m; // se não existe, é zero? ou deveria ser um erro?
}
```

</details>

<details>
<summary>✅ Bom: guard clause quando ausência é erro; ?. quando ausência é esperada</summary>

```csharp
// ausência é erro → guard clause
public async Task<decimal> GetOrderTotalAsync(string orderId, CancellationToken ct)
{
    var order = await _repository.FindByIdAsync(orderId, ct);
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

<a id="null-conditional-assignment"></a>

## Atribuir só se o objeto existir (C# 14)

O C# 14 aceita `?.` do lado esquerdo do `=`. A atribuição acontece quando o objeto existe e é ignorada quando ele é nulo, sem o `if` que só servia para proteger aquela linha.

<details>
<summary>❌ Ruim: if apenas para proteger a atribuição</summary>

```csharp
if (order is not null)
    order.Status = OrderStatus.Shipped;

if (session?.User is not null)
    session.User.LastSeenAt = DateTimeOffset.UtcNow;
```

</details>

<details>
<summary>✅ Bom: null-conditional assignment elimina o if</summary>

```csharp
order?.Status = OrderStatus.Shipped;

session?.User?.LastSeenAt = DateTimeOffset.UtcNow;
```

</details>

> Vale quando a ausência do objeto é esperada e não precisa de reação. Quando a ausência significa erro de negócio, continue com a guard clause: ela nomeia a condição em vez de ignorá-la.

<a id="null-coalescing-assignment"></a>

## `??=` preenche só o que está vazio

`??=` atribui quando o valor atual é nulo e não faz nada quando já existe valor. Serve para completar campos que o chamador deixou em branco e para inicializar algo caro só na primeira vez que ele é pedido, sem repetir o nome do campo em três linhas de `if`.

<details>
<summary>❌ Ruim: verificação manual de null antes da atribuição</summary>

```csharp
public class ReportConfig
{
    public string Title { get; set; } = "Report";
    public List<string> Columns { get; set; } = [];
    public TimeSpan? CacheTimeout { get; set; }

    public ReportConfig WithDefaults()
    {
        if (CacheTimeout == null)
            CacheTimeout = TimeSpan.FromMinutes(10); // verboso: repete o nome do campo

        return this;
    }
}
```

</details>

<details>
<summary>✅ Bom: ??= para defaults e lazy init</summary>

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

<a id="null-forgiving"></a>

## O operador `!` e seu uso restrito

O `!` manda o compilador confiar que aquele valor não é nulo. Ele cabe quando existe uma garantia que o compilador não tem como enxergar, e nesse caso escreva o motivo ao lado. Usado para calar um aviso legítimo, ele apenas adia o problema: o aviso some do build e a exceção aparece em produção. Reescrever com `TryGetValue` costuma resolver melhor, porque o compilador entende o padrão e libera a variável já como não-nula.

<details>
<summary>❌ Ruim: ! para silenciar o compilador sem garantia</summary>

```csharp
var user = _cache.Get(userId)!; // e se não estiver no cache?
var config = _options.Value!;   // e se Value for null?
```

</details>

<details>
<summary>✅ Bom: guard clause no lugar de !</summary>

```csharp
if (!_cache.TryGetValue(userId, out var user))
    throw new NotFoundError("User not in cache.");

// user é não-nulo aqui: compilador sabe pelo TryGetValue
```

</details>

<a id="static-analysis-attributes"></a>

## Atributos de análise estática

Quando o seu método já confere o nulo por dentro, o compilador não tem como saber disso e continua avisando quem chamou. Os atributos de `System.Diagnostics.CodeAnalysis` contam a ele o que o método garante: `[NotNull]` diz que o parâmetro sai não-nulo depois da chamada, e `[NotNullWhen(true)]` diz que ele é não-nulo quando o método devolve `true`. Com isso, o `if (Guard.IsValid(email))` libera `email` como não-nulo lá dentro, sem ninguém precisar checar de novo.

<details>
<summary>❌ Ruim: parâmetro nullable sem atributo, compilador não propaga garantia</summary>

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

// uso: compilador ainda emite aviso de possível null
Guard.NotNull(order);
ProcessOrder(order); // CS8604: possível argumento null

if (Guard.IsValid(email))
{
    SendEmail(email); // CS8604: email ainda considerado nullable dentro do if
}
```

</details>

<details>
<summary>✅ Bom: atributos que propagam a garantia de non-null</summary>

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
