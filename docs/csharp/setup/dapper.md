# Dapper

> [!NOTE]
> Essa estrutura reflete como costumo usar Dapper em projetos C#. Os exemplos são referências conceituais e podem não cobrir todos os detalhes de implementação; conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio: procedures para operações de domínio, queries abertas para casos simples.

A preferência é usar stored procedures para operações de domínio: a lógica de acesso a dados fica no banco, o C# só chama e mapeia. Queries abertas entram quando a operação é simples demais para justificar uma procedure.

## Procedure por domínio

Cada operação de domínio tem sua própria procedure. O repositório chama e mapeia, não constrói **SQL** (Structured Query Language, Linguagem de Consulta Estruturada).

<details>
<summary>❌ Bad — SQL de domínio inline no repositório</summary>
<br>

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
{
    var sql = @"
        SELECT o.Id, o.Total, o.CreatedAt, s.Name AS Status
        FROM Orders o
        INNER JOIN OrderStatuses s ON s.Id = o.StatusId
        WHERE o.CustomerId = @CustomerId
          AND o.DeletedAt IS NULL
        ORDER BY o.CreatedAt DESC"; // lógica de domínio acoplada ao C#

    var summaries = await _connection.QueryAsync<OrderSummary>(sql, new { customerId });

    return summaries.ToList();
}
```

</details>

<br>

<details>
<summary>✅ Good — procedure encapsula a lógica, repositório só mapeia</summary>
<br>

```sql
-- FindOrdersByCustomer.sql
CREATE OR ALTER PROCEDURE FindOrdersByCustomer
(
  @CustomerId UNIQUEIDENTIFIER
)
AS

BEGIN
  SELECT
    Orders.Id,
    Orders.Total,
    Orders.CreatedAt,
    OrderStatuses.Name AS Status
  FROM
    Orders
  INNER JOIN
    OrderStatuses ON Orders.StatusId = OrderStatuses.Id
  WHERE
    Orders.CustomerId = @CustomerId AND
    Orders.DeletedAt IS NULL
  ORDER BY
    Orders.CreatedAt DESC;
END;

-- EXEC FindOrdersByCustomer @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0';
```

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
{
    var parameters = new DynamicParameters();
    parameters.Add("CustomerId", customerId);

    var summaries = await _connection.QueryAsync<OrderSummary>(
        "FindOrdersByCustomer",
        parameters,
        commandType: CommandType.StoredProcedure);

    var result = summaries.ToList();
    return result;
}
```

</details>

<br>

<details>
<summary>✅ Good — procedure de escrita com OUTPUT param</summary>
<br>

```sql
-- CreateOrder.sql
CREATE OR ALTER PROCEDURE CreateOrder
(
  @CustomerId UNIQUEIDENTIFIER,
  @Total DECIMAL(18, 2),
  @NewId UNIQUEIDENTIFIER OUTPUT
)
AS

BEGIN
  SET @NewId = NEWID();

  INSERT INTO Orders (Id, CustomerId, Total, CreatedAt)
  VALUES (@NewId, @CustomerId, @Total, GETUTCDATE());
END;

-- EXEC CreateOrder
--   @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0',
--   @Total = 99.90,
--   @NewId = NULL OUTPUT;
```

```csharp
public async Task<Guid> CreateAsync(Guid customerId, decimal total, CancellationToken ct)
{
    var parameters = new DynamicParameters();
    parameters.Add("CustomerId", customerId);
    parameters.Add("Total", total);

    parameters.Add("NewId", dbType: DbType.Guid, direction: ParameterDirection.Output);

    await _connection.ExecuteAsync(
        "CreateOrder",
        parameters,
        commandType: CommandType.StoredProcedure);

    var newId = parameters.Get<Guid>("NewId");
    return newId;
}
```

</details>

## Query aberta: casos simples

Quando a operação é simples demais para justificar uma procedure (lookup por chave, contagem, existência), query aberta é aceitável.

<details>
<summary>✅ Good — lookup simples por chave primária</summary>
<br>

```csharp
public async Task<Customer?> FindByIdAsync(Guid id, CancellationToken ct)
{
    const string sql = "SELECT Id, Name, Email FROM Customers WHERE Id = @Id";

    var customer = await _connection.QueryFirstOrDefaultAsync<Customer>(sql, new { id });

    return customer;
}
```

</details>

<br>

<details>
<summary>✅ Good — verificação de existência</summary>
<br>

```csharp
public async Task<bool> ExistsAsync(string email, CancellationToken ct)
{
    const string sql = "SELECT COUNT(1) FROM Customers WHERE Email = @Email";

    var count = await _connection.ExecuteScalarAsync<int>(sql, new { email });
    var exists = count > 0;

    return exists;
}
```

</details>

## SQL injection

SQL injection acontece quando um valor externo é interpretado como código SQL em vez de dado. O banco não distingue o que veio do código do que veio do usuário: tudo vira instrução executável.

Parâmetros nomeados eliminam o risco: o driver envia o valor separado do SQL, e o banco trata como dado puro, sem interpretar.

<details>
<summary>❌ Bad — concatenação deixa o atacante escrever SQL</summary>
<br>

```csharp
// email recebido: ' OR '1'='1
// SQL gerado: SELECT Id, Name FROM Customers WHERE Email = '' OR '1'='1'
// resultado: retorna todos os clientes
var sql = $"SELECT Id, Name FROM Customers WHERE Email = '{email}'";

// email recebido: '; DROP TABLE Customers; --
// SQL gerado: SELECT ... WHERE Email = ''; DROP TABLE Customers; --'
// resultado: tabela deletada
var sql = $"SELECT Id, Name FROM Customers WHERE Email = '{email}'";
```

</details>

<br>

<details>
<summary>❌ Bad — LIKE com concatenação, wildcard no SQL permite injeção</summary>
<br>

```csharp
public async Task<IReadOnlyList<Customer>> SearchByNameAsync(string term, CancellationToken ct)
{
    var sql = $"SELECT Id, Name FROM Customers WHERE Name LIKE '%{term}%'";
    // term = "'; DROP TABLE Customers; --" → executa instrução arbitrária

    var customers = await _connection.QueryAsync<Customer>(sql);
    var result = customers.ToList();

    return result;
}
```

</details>

<br>

<details>
<summary>✅ Good — parâmetro nomeado, valor tratado como dado pelo banco</summary>
<br>

```csharp
public async Task<Customer?> FindByEmailAsync(string email, CancellationToken ct)
{
    const string sql = "SELECT Id, Name FROM Customers WHERE Email = @Email";

    var customer = await _connection.QueryFirstOrDefaultAsync<Customer>(sql, new { email });

    return customer;
}
```

</details>

<br>

<details>
<summary>✅ Good — LIKE com parâmetro, wildcard no valor não no SQL</summary>
<br>

```csharp
// tentação comum: $"WHERE Name LIKE '%{term}%'" — SQL injection
public async Task<IReadOnlyList<Customer>> SearchByNameAsync(string term, CancellationToken ct)
{
    const string sql = "SELECT Id, Name FROM Customers WHERE Name LIKE @Term";

    var customers = await _connection.QueryAsync<Customer>(sql, new { Term = $"%{term}%" });
    var result = customers.ToList();

    return result;
}
```

</details>

## Injeção de conexão

`IDbConnection` é injetado no repositório, nunca instanciado internamente com connection string hardcoded. O ciclo de vida da conexão é responsabilidade do chamador.

<details>
<summary>❌ Bad — conexão instanciada dentro do repositório</summary>
<br>

```csharp
public class OrderRepository
{
    public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
    {
        using var connection = new SqlConnection("Server=...;Database=..."); // hardcoded
        // ...
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — IDbConnection injetado via construtor</summary>
<br>

```csharp
public class OrderRepository(IDbConnection connection)
{
    public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
    {
        var parameters = new DynamicParameters();
        parameters.Add("CustomerId", customerId);

        var summaries = await connection.QueryAsync<OrderSummary>(
            "FindOrdersByCustomer",
            parameters,
            commandType: CommandType.StoredProcedure);

        var result = summaries.ToList();
        return result;
    }
}
```

```csharp
// Infrastructure/DatabaseExtensions.cs
builder.Services.AddScoped<IDbConnection>(_ =>
    new SqlConnection(connectionString));

builder.Services.AddScoped<IOrderRepository, OrderRepository>();
```

</details>
