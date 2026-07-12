# Dapper

> [!NOTE]
> Esta estrutura reflete como costumo usar Dapper em projetos C#. Os exemplos são referências conceituais e podem não cobrir todos os detalhes de implementação; conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio: procedures para operações de domínio, queries abertas para casos simples.

O Dapper fica entre escrever ADO.NET na mão e adotar um ORM completo: você entrega o SQL, e ele transforma cada linha do resultado num objeto tipado. Neste guia, as operações de domínio moram em **stored procedures** (procedimentos armazenados no banco), e o C# apenas chama e mapeia o retorno. O SQL escrito direto no repositório fica para as consultas simples, como buscar por chave ou contar registros, em que uma procedure só acrescentaria um arquivo a manter.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Dapper** (micro-ORM para .NET) | Biblioteca leve que mapeia linhas para tipos sem o peso de um ORM completo |
| **ORM** (Object-Relational Mapper, Mapeador Objeto-Relacional) | Camada que mapeia tabelas para classes; Dapper fica entre ADO.NET cru e Entity Framework |
| **stored procedure** (procedimento armazenado) | Operação SQL nomeada e versionada no banco; encapsula lógica de acesso a dados |
| **parameterized query** (consulta parametrizada) | SQL com `@param`; previne SQL injection e permite cache de plano |
| **DbConnection** (conexão com o banco) | Abstração ADO.NET; Dapper estende com `Query`, `Execute`, `QueryAsync` |
| **multi-mapping** (mapeamento múltiplo) | Recurso do Dapper para popular grafo de objetos a partir de uma única query |
| **CommandType.StoredProcedure** (tipo de comando: procedure) | Flag que indica ao Dapper executar via `EXEC` em vez de SQL inline |
| **SQL injection** (injeção de SQL) | Vulnerabilidade ao concatenar entrada do usuário em SQL; parametrização elimina o risco |

<a id="procedure-per-domain"></a>

## Procedure por operação de domínio

Cada operação de domínio ganha a própria procedure, e o repositório fica com duas responsabilidades: chamar e mapear o resultado. O **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) montado dentro do repositório espalha a consulta pelo código C#, onde o time de banco não a revisa e nenhuma ferramenta de banco a enxerga para analisar o plano de execução.

O nome da procedure segue a convenção do banco, e não a do C#: `SP_` seguido do verbo e da tabela, em maiúsculas, como `SP_LIST_ORDERS_BY_CUSTOMER_ID`. O método do repositório que a chama continua em PascalCase (`FindByCustomerAsync`), porque ele é código C#. Os verbos disponíveis e o formato completo estão em [sql/conventions/naming.md](../../sql/conventions/naming.md).

<details>
<summary>❌ Ruim: SQL de domínio inline no repositório</summary>

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

<details>
<summary>✅ Bom: procedure encapsula a lógica, repositório só mapeia</summary>

```sql
-- SP_LIST_ORDERS_BY_CUSTOMER_ID.sql
CREATE OR ALTER PROCEDURE SP_LIST_ORDERS_BY_CUSTOMER_ID
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

-- EXEC SP_LIST_ORDERS_BY_CUSTOMER_ID @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0';
```

```csharp
public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
{
    var parameters = new DynamicParameters();
    parameters.Add("CustomerId", customerId);

    var summaries = await _connection.QueryAsync<OrderSummary>(
        "SP_LIST_ORDERS_BY_CUSTOMER_ID",
        parameters,
        commandType: CommandType.StoredProcedure);

    var result = summaries.ToList();
    return result;
}
```

</details>

<details>
<summary>✅ Bom: procedure de escrita com OUTPUT param</summary>

```sql
-- SP_ADD_ORDER.sql
CREATE OR ALTER PROCEDURE SP_ADD_ORDER
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

-- EXEC SP_ADD_ORDER
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
        "SP_ADD_ORDER",
        parameters,
        commandType: CommandType.StoredProcedure);

    var newId = parameters.Get<Guid>("NewId");
    return newId;
}
```

</details>

<a id="inline-query"></a>

## Consulta escrita no repositório

Buscar por chave, contar linhas, checar se um registro existe: nesses casos a consulta cabe numa linha e não guarda regra nenhuma. Criar uma procedure para cada uma acrescentaria arquivos ao banco sem nada em troca. Escreva o SQL ali mesmo, sempre com parâmetro.

<details>
<summary>✅ Bom: lookup simples por chave primária</summary>

```csharp
public async Task<Customer?> FindByIdAsync(Guid id, CancellationToken ct)
{
    const string sql = "SELECT Id, Name, Email FROM Customers WHERE Id = @Id";

    var customer = await _connection.QueryFirstOrDefaultAsync<Customer>(sql, new { id });
    return customer;
}
```

</details>

<details>
<summary>✅ Bom: verificação de existência</summary>

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

<a id="sql-injection"></a>

## SQL injection

Quando você junta o valor digitado pelo usuário ao texto da consulta, o banco recebe uma frase só e executa tudo o que ela contém. Um nome como `'; DROP TABLE Orders; --` deixa de ser um nome e passa a ser um comando. O parâmetro nomeado (`@Email`) resolve isso: o driver envia o valor separado do texto da consulta, e o banco o trata como dado, qualquer que seja o conteúdo.

<details>
<summary>❌ Ruim: concatenação deixa o atacante escrever SQL</summary>

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

<details>
<summary>❌ Ruim: LIKE com concatenação, wildcard no SQL permite injeção</summary>

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

<details>
<summary>✅ Bom: parâmetro nomeado, valor tratado como dado pelo banco</summary>

```csharp
public async Task<Customer?> FindByEmailAsync(string email, CancellationToken ct)
{
    const string sql = "SELECT Id, Name FROM Customers WHERE Email = @Email";

    var customer = await _connection.QueryFirstOrDefaultAsync<Customer>(sql, new { email });
    return customer;
}
```

</details>

<details>
<summary>✅ Bom: LIKE com parâmetro, wildcard no valor não no SQL</summary>

```csharp
// tentação comum: $"WHERE Name LIKE '%{term}%'": SQL injection
public async Task<IReadOnlyList<Customer>> SearchByNameAsync(string term, CancellationToken ct)
{
    const string sql = "SELECT Id, Name FROM Customers WHERE Name LIKE @Term";

    var customers = await _connection.QueryAsync<Customer>(sql, new { Term = $"%{term}%" });
    var result = customers.ToList();
    return result;
}
```

</details>

<a id="connection-injection"></a>

## Injeção de conexão

O repositório recebe a `IDbConnection` pelo construtor. Criá-la lá dentro, com a connection string escrita no código, prende o repositório a um banco específico e leva a senha para o repositório de código. Quem cria a conexão também decide quando fechá-la, e é assim que várias operações conseguem compartilhar a mesma transação.

<details>
<summary>❌ Ruim: conexão instanciada dentro do repositório</summary>

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

<details>
<summary>✅ Bom: IDbConnection injetado via construtor</summary>

```csharp
public class OrderRepository(IDbConnection connection)
{
    public async Task<IReadOnlyList<OrderSummary>> FindByCustomerAsync(Guid customerId, CancellationToken ct)
    {
        var parameters = new DynamicParameters();
        parameters.Add("CustomerId", customerId);

        var summaries = await connection.QueryAsync<OrderSummary>(
            "SP_LIST_ORDERS_BY_CUSTOMER_ID",
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
