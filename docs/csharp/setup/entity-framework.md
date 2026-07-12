# Entity Framework Core

O Entity Framework Core é o **ORM** (Object-Relational Mapper · Mapeador Objeto-Relacional) padrão do .NET, ou seja, a camada que transforma linha de tabela em objeto e objeto em comando SQL. Ele guarda uma cópia de tudo o que leu do banco para descobrir sozinho o que mudou quando você chamar `SaveChanges`. Isso é o que faz a escrita ser cômoda, e é também o que faz a leitura ser cara: numa consulta que só exibe dados, esse trabalho de vigilância acontece e ninguém aproveita. Três decisões resolvem a maior parte dos casos: quando desligar o rastreamento, como escrever a consulta para que ela vire um SQL bom, e como evitar o N+1.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **ORM** (Object-Relational Mapper, Mapeador Objeto-Relacional) | Camada que traduz objetos do domínio para tabelas relacionais e vice-versa |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Contrato de leitura; projeção `Select` materializa o DTO sem carregar a entidade inteira |
| **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) | Linguagem gerada pelo provider; `EXPLAIN` ou logs do EF mostram o SQL produzido |
| **Change Tracker** (rastreador de alterações) | Componente do `DbContext` que detecta mudanças entre `Load` e `SaveChanges` |
| **N+1** (consulta repetida por item) | Anti-padrão: 1 query para a lista + N queries para cada item; resolve com `Include` ou projeção |

<a id="as-no-tracking"></a>

## AsNoTracking

Toda entidade que sai de uma consulta entra no rastreador, e o EF guarda uma segunda cópia dela para comparar depois. Numa tela que só lista pedidos, essa cópia nunca vai ser comparada com nada. `AsNoTracking()` avisa que a consulta é de leitura: o EF devolve os objetos e esquece deles, gastando metade da memória e pulando a comparação.

<details>
<summary>❌ Ruim: rastreamento habilitado em query somente leitura</summary>

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

<details>
<summary>✅ Bom: AsNoTracking para leitura sem rastreamento</summary>

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

<a id="projection"></a>

## Projeção com Select

Escreva o `.Select()` dentro da consulta, antes do `ToListAsync`. Assim o EF traduz a projeção para o SQL e pede ao banco só as colunas que você citou. Escrevê-lo depois de materializar traz todas as colunas de todas as linhas para a memória, e só então descarta o que não vai usar.

Isso também mantém a entidade do EF longe de quem chamou. A entidade carrega estado de rastreamento e propriedades de navegação que ainda não foram carregadas, e acessar uma dessas propriedades fora do escopo do `DbContext` estoura uma exceção difícil de rastrear.

<details>
<summary>❌ Ruim: entidade exposta, materialização antes da projeção</summary>

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

<details>
<summary>✅ Bom: projeção para DTO dentro da query, sem materializar entidade</summary>

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

<a id="include-and-n-plus-1"></a>

## Include e o N+1

Acessar `order.Items` numa lista de cem pedidos, sem ter pedido os itens na consulta, faz o EF ir ao banco cem vezes, uma por pedido. É o **N+1**: uma consulta para a lista, mais uma para cada elemento dela. Em desenvolvimento, com dez pedidos, ninguém percebe. Em produção, a mesma tela leva segundos.

`Include` traz as coleções junto na mesma ida ao banco. Quando você precisa de poucos campos das entidades relacionadas, o `.Select()` resolve melhor, porque traz só esses campos.

<details>
<summary>❌ Ruim: N+1: uma query por order para acessar Items</summary>

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

<details>
<summary>✅ Bom: projeção com Select, EF resolve o JOIN em uma query</summary>

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

<details>
<summary>✅ Bom: Include para grafo completo necessário</summary>

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

<a id="as-split-query"></a>

## AsSplitQuery

Dois `Include` de coleção na mesma consulta fazem o banco cruzar as duas listas. Um pedido com 5 itens e 3 pagamentos volta em 15 linhas, e os dados do pedido se repetem em todas elas. Com coleções maiores, o número cresce pela multiplicação e o tempo de resposta vai junto. `AsSplitQuery()` manda o EF fazer uma consulta por coleção e juntar os resultados na memória.

<details>
<summary>❌ Ruim: múltiplos Include sem AsSplitQuery gera produto cartesiano</summary>

```csharp
public async Task<Order?> FindOrderAsync(Guid orderId, CancellationToken ct)
{
    var order = await _context.Orders
        .Include(order => order.Items)    // coleção 1
        .Include(order => order.Payments) // coleção 2: produto cartesiano Items × Payments
        .FirstOrDefaultAsync(order => order.Id == orderId, ct);

    return order;
}
```

</details>

<details>
<summary>✅ Bom: AsSplitQuery divide em queries separadas</summary>

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

<a id="order-by"></a>

## OrderBy e ThenBy

Sem `OrderBy`, o banco devolve as linhas na ordem que for mais conveniente para ele, e essa ordem muda quando o plano de execução muda. Numa lista paginada isso vira um bug visível: o mesmo registro aparece na página 1 e na página 2, e outro não aparece em nenhuma. Ordene sempre que a ordem importar, e use `ThenBy` para desempatar quando o primeiro critério se repete.

<details>
<summary>❌ Ruim: paginação sem ordenação, resultado não determinístico</summary>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindPagedOrdersAsync(
    Guid customerId, int page, int pageSize, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId) // sem OrderBy: ordem não garantida
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

<details>
<summary>✅ Bom: OrderBy antes de Skip/Take, ordem estável e determinística</summary>

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

<details>
<summary>✅ Bom: ThenBy para desempate estável</summary>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindOrdersAsync(Guid customerId, CancellationToken ct)
{
    var summaries = await _context.Orders
        .AsNoTracking()
        .Where(order => order.CustomerId == customerId)
        .OrderByDescending(order => order.CreatedAt)
        .ThenBy(order => order.Id)              // desempate pelo Id: resultado estável
        .Select(order => new OrderSummary(order.Id, order.Total, order.CreatedAt))
        .ToListAsync(ct);

    return summaries;
}
```

</details>

<a id="pagination"></a>

## Paginação

Uma página é `OrderBy` para fixar a ordem, `Skip` para pular as anteriores e `Take` para limitar o tamanho. Devolva junto o total de registros: sem ele, a tela não tem como desenhar a navegação nem dizer quantas páginas existem.

<details>
<summary>❌ Ruim: duas queries independentes, sem compartilhar o filtro base</summary>

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

<details>
<summary>✅ Bom: query base compartilhada, metadados e dados na mesma chamada</summary>

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

<a id="left-join"></a>

## Left join

O `LeftJoin` mantém todas as linhas da esquerda, mesmo as que não têm par do lado direito: os pedidos sem pagamento continuam na lista, com o pagamento vindo nulo. O EF Core 10 trouxe esse operador direto. Antes dele era preciso encadear `GroupJoin`, `SelectMany` e `DefaultIfEmpty()`, três chamadas cuja soma significa "left join" e que nenhuma delas diz sozinha.

<details>
<summary>❌ Ruim: intenção oculta em GroupJoin + SelectMany + DefaultIfEmpty</summary>

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

<details>
<summary>✅ Bom: LeftJoin (EF Core 10), intenção clara</summary>

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

<a id="migrations"></a>

## Migrations

Cada migration é um passo na história do banco: ela resolve uma mudança e leva o nome dessa mudança. Lidas em sequência, elas contam como o schema chegou ao estado atual, e é essa leitura que salva quem precisa entender por que uma coluna existe.

### Nomenclatura

O nome é um verbo seguido do que foi alterado, como `AddEmailToCustomer`. Ele aparece no arquivo, na tabela de controle do banco e na lista do `dotnet ef migrations list`, e é por ele que alguém vai achar a migration que criou determinada coluna. `Update`, `Fix` e `Initial` não ajudam nessa busca.

<details>
<summary>❌ Ruim: nomes vagos que não descrevem a mudança</summary>

```bash
dotnet ef migrations add Initial
dotnet ef migrations add Update
dotnet ef migrations add Fix2
dotnet ef migrations add SchemaChanges
```

</details>

<details>
<summary>✅ Bom: verbo + substantivo, mudança óbvia pelo nome</summary>

```bash
dotnet ef migrations add CreateOrdersTable
dotnet ef migrations add AddEmailToCustomers
dotnet ef migrations add AddEmailIndexToCustomers
dotnet ef migrations add RenameOrderTotalToSubtotal
dotnet ef migrations add DropLegacyStatusColumn
```

</details>

### Só para a frente

Deixe o `Down()` sem implementação. Para desfazer uma mudança de schema, escreva uma migration nova que faça o caminho de volta. O `Down()` promete uma reversão que o banco não consegue cumprir: a migration que apagou uma coluna não tem como trazer de volta os dados que estavam nela, e rodá-la ao contrário em produção apaga o que sobrou.

<details>
<summary>❌ Ruim: Down() implementado, ilusão de reversibilidade</summary>

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

<details>
<summary>✅ Bom: Down() sinaliza explicitamente que não é suportado</summary>

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
        => throw new NotSupportedException("Forward-only: crie uma nova migration para reverter.");
}
```

</details>

### Uma migration por mudança

Uma migration que cria um índice, adiciona uma coluna e renomeia uma tabela não tem nome possível: qualquer um dos três deixa os outros dois escondidos. Separadas, cada uma se explica pelo nome, e desfazer só uma delas é escrever uma migration nova para aquele ponto.

<details>
<summary>❌ Ruim: múltiplas mudanças sem relação na mesma migration</summary>

```csharp
public partial class UpdateSchema : Migration // nome vago, mudanças misturadas
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(         // mudança 1: Customers
            name: "Email",
            table: "Customers",
            nullable: false,
            defaultValue: "");

        migrationBuilder.CreateTable("Invoices",    // mudança 2: nova tabela
            columns: table => new { ... });

        migrationBuilder.DropColumn(                // mudança 3: Orders
            name: "LegacyCode",
            table: "Orders");
    }
}
```

</details>

<details>
<summary>✅ Bom: uma migration por mudança, histórico legível</summary>

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
        => throw new NotSupportedException("Forward-only: crie uma nova migration para reverter.");
}
```

</details>

<a id="right-join"></a>

## Right join

`RightJoin` mantém todas as linhas da direita, mesmo as que não têm par na esquerda. Ele cabe quando a tabela principal da consulta é a da direita: listar todos os produtos e, para cada um, o pedido em que apareceu, mostrando também os que nunca foram vendidos.

<details>
<summary>✅ Bom: RightJoin (EF Core 10), products sem reviews incluídos</summary>

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
