# Entity Framework Core

## AsNoTracking

Por padrão, o EF rastreia todas as entidades retornadas — qualquer alteração é detectada no `SaveChanges`. Para queries de leitura, esse rastreamento é custo puro. `AsNoTracking()` elimina o overhead e reduz alocações.

<details>
<summary>❌ Bad — rastreamento habilitado em query somente leitura</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindRecentOrdersAsync(Guid customerId, CancellationToken ct)
{
    var orders = await _context.Orders
        .Where(order => order.CustomerId == customerId) // EF rastreia cada entidade retornada
        .ToListAsync(ct);

    var summaries = orders
        .Select(order => new OrderSummary(order.Id, order.Total))
        .ToList();

    return summaries;
}
```

</details>

<br>

<details>
<summary>✅ Good — AsNoTracking para leitura sem rastreamento</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindRecentOrdersAsync(Guid customerId, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .Select(order => new OrderSummary(order.Id, order.Total))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

## Projeção com Select

Nunca exponha entidades EF diretamente — elas carregam estado de rastreamento, navegações não inicializadas e detalhes de persistência. Projete sempre para DTOs via `.Select()` diretamente na query, não após materializar.

<details>
<summary>❌ Bad — entidade exposta, materialização antes da projeção</summary>
<br>

```csharp
public async Task<List<Order>> FindOrdersAsync(Guid customerId, CancellationToken ct)
{
    var orders = await _context.Orders
        .Where(order => order.CustomerId == customerId)
        .ToListAsync(ct); // materializa a entidade completa

    return orders; // expõe entidade EF ao chamador
}
```

</details>

<br>

<details>
<summary>✅ Good — projeção para DTO dentro da query, sem materializar entidade</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindOrdersAsync(Guid customerId, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .Select(order => new OrderSummary(
            order.Id,
            order.Total,
            order.CreatedAt,
            order.Status
        ))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

## Include e N+1

Acesso a propriedades de navegação sem `Include` dispara uma query por registro — o problema N+1. Use `Include` para grafos conhecidos; projete com `.Select()` quando precisar de campos específicos de entidades relacionadas.

<details>
<summary>❌ Bad — N+1: uma query por order para acessar Items</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderDetail>> FindOrderDetailsAsync(Guid customerId, CancellationToken ct)
{
    var orders = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .ToListAsync(ct);

    var details = orders
        .Select(order => new OrderDetail(
            order.Id,
            order.Items.Sum(item => item.Price * item.Quantity) // dispara query por order
        ))
        .ToList();

    return details;
}
```

</details>

<br>

<details>
<summary>✅ Good — projeção com Select, EF resolve o JOIN em uma query</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderDetail>> FindOrderDetailsAsync(Guid customerId, CancellationToken ct)
{
    var details = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .Select(order => new OrderDetail(
            order.Id,
            order.Items.Sum(item => item.Price * item.Quantity)
        ))
        .ToListAsync(ct);

    return details;
}
```

</details>

<br>

<details>
<summary>✅ Good — Include para grafo completo necessário</summary>
<br>

```csharp
public async Task<Order?> FindOrderWithItemsAsync(Guid orderId, CancellationToken ct)
{
    var order = await _context.Orders
        .Include(order => order.Items)
        .Include(order => order.Customer)
        .FirstOrDefaultAsync(order => order.Id == orderId, ct);

    return order;
}
```

</details>

## AsSplitQuery

`Include` de múltiplas coleções gera um produto cartesiano — linhas duplicadas na query SQL. `AsSplitQuery()` divide em queries separadas e elimina a explosão de dados.

<details>
<summary>❌ Bad — múltiplos Include sem AsSplitQuery gera produto cartesiano</summary>
<br>

```csharp
public async Task<Order?> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _context.Orders
        .Include(order => order.Items)    // coleção 1
        .Include(order => order.Payments) // coleção 2 — produto cartesiano Items × Payments
        .FirstOrDefaultAsync(order => order.Id == orderId, ct);

    return order;
}
```

</details>

<br>

<details>
<summary>✅ Good — AsSplitQuery divide em queries separadas</summary>
<br>

```csharp
public async Task<Order?> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _context.Orders
        .Include(order => order.Items)
        .Include(order => order.Payments)
        .AsSplitQuery()
        .FirstOrDefaultAsync(order => order.Id == orderId, ct);

    return order;
}
```

</details>

## OrderBy e ThenBy

Toda query que usa paginação ou que o chamador espera em ordem determinística precisa de `OrderBy`. Sem ordenação explícita, o banco não garante a ordem — o resultado varia entre execuções.

<details>
<summary>❌ Bad — paginação sem ordenação, resultado não determinístico</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindPagedOrdersAsync(
    Guid customerId, int page, int pageSize, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId) // sem OrderBy — ordem não garantida
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

<br>

<details>
<summary>✅ Good — OrderBy antes de Skip/Take, ordem estável e determinística</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindPagedOrdersAsync(
    Guid customerId, int page, int pageSize, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .OrderByDescending(order => order.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

<br>

<details>
<summary>✅ Good — ThenBy para desempate estável</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindOrdersAsync(Guid customerId, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .OrderByDescending(order => order.CreatedAt)
        .ThenBy(order => order.Id)              // desempate pelo Id — resultado estável
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

## Paginação

Paginação requer `OrderBy` + `Skip` + `Take`. Retorne metadados junto com os dados — o chamador precisa saber o total de registros para renderizar a navegação.

<details>
<summary>❌ Bad — duas queries independentes, sem compartilhar o filtro base</summary>
<br>

```csharp
public async Task<List<OrderSummary>> FindOrdersAsync(Guid customerId, int page, int pageSize, CancellationToken ct)
{
    var total = await _context.Orders.CountAsync(ct); // conta tudo, ignora filtro
    var orders = await _context.Orders
        .Where(order => order.CustomerId == customerId)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(ct); // sem OrderBy, sem AsNoTracking, sem projeção

    return orders; // expõe entidade
}
```

</details>

<br>

<details>
<summary>✅ Good — query base compartilhada, metadados e dados na mesma chamada</summary>
<br>

```csharp
public async Task<PagedResult<OrderSummary>> FindOrdersAsync(
    Guid customerId, int page, int pageSize, CancellationToken ct)
{
    var baseQuery = _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId);

    var total = await baseQuery.CountAsync(ct);

    var items = await baseQuery
        .OrderByDescending(order => order.CreatedAt)
        .ThenBy(order => order.Id)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    var result = new PagedResult<OrderSummary>(items, total, page, pageSize);

    return result;
}
```

</details>

## Left join

EF Core 10 introduziu `LeftJoin` como operador de primeira classe. Antes era necessário combinar `GroupJoin` + `SelectMany` + `DefaultIfEmpty()` — intenção enterrada em ruído. O novo operador declara o que faz.

<details>
<summary>❌ Bad — intenção oculta em GroupJoin + SelectMany + DefaultIfEmpty</summary>
<br>

```csharp
var result = await _context.Orders
    .AsNoTracking()
    .GroupJoin(
        _context.Payments,
        order => order.Id,
        payment => payment.OrderId,
        (order, matchedPayments) => new { order, matchedPayments } // intenção obscura
    )
    .SelectMany(
        grouped => grouped.matchedPayments.DefaultIfEmpty(),
        (grouped, payment) => new OrderPaymentView(
            grouped.order.Id,
            grouped.order.Total,
            payment != null ? payment.Amount : null
        )
    )
    .ToListAsync(ct);
```

</details>

<br>

<details>
<summary>✅ Good — LeftJoin (EF Core 10), intenção clara</summary>
<br>

```csharp
var result = await _context.Orders
    .AsNoTracking()
    .LeftJoin(
        _context.Payments,
        order => order.Id,
        payment => payment.OrderId,
        (order, payment) => new OrderPaymentView(
            order.Id,
            order.Total,
            payment != null ? payment.Amount : null
        )
    )
    .OrderBy(view => view.OrderId)
    .ToListAsync(ct);
```

</details>

## Migrations

Migrations descrevem intenção — cada uma resolve uma mudança atômica no schema. O nome diz o que muda; o histórico conta a evolução do banco.

### Nomenclatura

O nome segue a convenção Rails: verbo + substantivo, descrevendo a mudança concreta. Nomes genéricos como `Update`, `Fix` ou `Initial` não comunicam nada.

<details>
<summary>❌ Bad — nomes vagos que não descrevem a mudança</summary>
<br>

```bash
dotnet ef migrations add Initial
dotnet ef migrations add Update
dotnet ef migrations add Fix2
dotnet ef migrations add SchemaChanges
```

</details>

<br>

<details>
<summary>✅ Good — verbo + substantivo, mudança óbvia pelo nome</summary>
<br>

```bash
dotnet ef migrations add CreateOrdersTable
dotnet ef migrations add AddEmailToCustomers
dotnet ef migrations add AddEmailIndexToCustomers
dotnet ef migrations add RenameOrderTotalToSubtotal
dotnet ef migrations add DropLegacyStatusColumn
```

</details>

### Forward-only

Migrations são append-only — `Down()` não é implementado. Reverter um schema é uma nova migration, não um rollback. Implementar `Down()` cria uma falsa sensação de segurança: em produção, rollback de schema raramente funciona sem perda de dados.

<details>
<summary>❌ Bad — Down() implementado, ilusão de reversibilidade</summary>
<br>

```csharp
public partial class CreateOrdersTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Orders",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false),
                Total = table.Column<decimal>(nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Orders", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Orders"); // perigoso em produção com dados reais
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — Down() sinaliza explicitamente que não é suportado</summary>
<br>

```csharp
public partial class CreateOrdersTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Orders",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false),
                Total = table.Column<decimal>(nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Orders", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
        => throw new NotSupportedException("Forward-only — crie uma nova migration para reverter.");
}
```

</details>

### Uma migration por mudança

Cada migration resolve uma coisa. Agrupar mudanças não relacionadas dificulta o rastreamento, mistura contextos no histórico e impede rollback cirúrgico via nova migration.

<details>
<summary>❌ Bad — múltiplas mudanças sem relação na mesma migration</summary>
<br>

```csharp
public partial class UpdateSchema : Migration // nome vago, mudanças misturadas
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(         // mudança 1 — Customers
            name: "Email",
            table: "Customers",
            nullable: false,
            defaultValue: "");

        migrationBuilder.CreateTable("Invoices",    // mudança 2 — nova tabela
            columns: table => new { ... });

        migrationBuilder.DropColumn(                // mudança 3 — Orders
            name: "LegacyCode",
            table: "Orders");
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — uma migration por mudança, histórico legível</summary>
<br>

```bash
# três migrations atômicas, cada uma com contexto próprio
dotnet ef migrations add AddEmailToCustomers
dotnet ef migrations add CreateInvoicesTable
dotnet ef migrations add DropLegacyCodeFromOrders
```

```csharp
public partial class AddEmailToCustomers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Email",
            table: "Customers",
            nullable: false,
            defaultValue: "");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
        => throw new NotSupportedException("Forward-only — crie uma nova migration para reverter.");
}
```

</details>

## Right join

`RightJoin` preserva todos os registros do lado direito, mesmo sem correspondência no esquerdo. Use quando a tabela da direita é a fonte principal e a esquerda é opcional.

<details>
<summary>✅ Good — RightJoin (EF Core 10), products sem reviews incluídos</summary>
<br>

```csharp
var result = await _context.Reviews
    .AsNoTracking()
    .RightJoin(
        _context.Products,
        review => review.ProductId,
        product => product.Id,
        (review, product) => new ProductReviewView(
            product.Id,
            product.Name,
            review != null ? review.Rating : null,
            review != null ? review.Comment : null
        )
    )
    .OrderBy(view => view.ProductId)
    .ToListAsync(ct);
```

</details>
