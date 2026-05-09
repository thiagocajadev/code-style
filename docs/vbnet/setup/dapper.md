# Dapper

> [!NOTE]
> Essa estrutura reflete como usar Dapper em projetos VB.NET/.NET Framework 4.8. Os exemplos são referências conceituais. O que importa é o princípio: procedures para operações de domínio, queries abertas para casos simples, parâmetros nomeados sempre.

A preferência é usar stored procedures para operações de domínio: a lógica de acesso a dados fica no banco, o VB.NET só chama e mapeia. Queries abertas entram quando a operação é simples demais para justificar uma procedure.

## Procedure por domínio

Cada operação de domínio tem sua própria procedure. O repositório chama e mapeia, não constrói **SQL** (Structured Query Language, Linguagem de Consulta Estruturada).

<details>
<summary>❌ Bad — SQL de domínio inline no repositório</summary>
<br>

```vbnet
Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
    Dim sql = "
        SELECT p.Id, p.Total, p.CreatedAt, s.Name AS Status
        FROM Purchases p
        INNER JOIN PurchaseStatuses s ON s.Id = p.StatusId
        WHERE p.CustomerId = @CustomerId
          AND p.DeletedAt IS NULL
        ORDER BY p.CreatedAt DESC"  ' lógica de domínio acoplada ao VB.NET

    Dim summaries = Await _connection.QueryAsync(Of PurchaseSummary)(sql, New With {.CustomerId = customerId})

    Return summaries.ToList()
End Function
```

</details>

<br>

<details>
<summary>✅ Good — procedure encapsula a lógica, repositório só mapeia</summary>
<br>

```sql
-- FindPurchasesByCustomer.sql
CREATE OR ALTER PROCEDURE FindPurchasesByCustomer
(
  @CustomerId UNIQUEIDENTIFIER
)
AS
BEGIN
  SELECT
    Purchases.Id,
    Purchases.Total,
    Purchases.CreatedAt,
    PurchaseStatuses.Name AS Status
  FROM
    Purchases
  INNER JOIN
    PurchaseStatuses ON Purchases.StatusId = PurchaseStatuses.Id
  WHERE
    Purchases.CustomerId = @CustomerId AND
    Purchases.DeletedAt IS NULL
  ORDER BY
    Purchases.CreatedAt DESC;
END;

-- EXEC FindPurchasesByCustomer @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0';
```

```vbnet
Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
    Dim parameters = New DynamicParameters()
    parameters.Add("CustomerId", customerId)

    Dim summaries = Await _connection.QueryAsync(Of PurchaseSummary)(
        "FindPurchasesByCustomer",
        parameters,
        commandType:=CommandType.StoredProcedure)

    Dim result = summaries.ToList()

    Return result
End Function
```

</details>

<br>

<details>
<summary>✅ Good — procedure de escrita com OUTPUT param</summary>
<br>

```sql
-- CreatePurchase.sql
CREATE OR ALTER PROCEDURE CreatePurchase
(
  @CustomerId UNIQUEIDENTIFIER,
  @Total      DECIMAL(18, 2),
  @NewId      UNIQUEIDENTIFIER OUTPUT
)
AS
BEGIN
  SET @NewId = NEWID();

  INSERT INTO Purchases (Id, CustomerId, Total, CreatedAt)
  VALUES (@NewId, @CustomerId, @Total, GETUTCDATE());
END;

-- EXEC CreatePurchase
--   @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0',
--   @Total      = 99.90,
--   @NewId      = NULL OUTPUT;
```

```vbnet
Public Async Function CreateAsync(customerId As Guid, total As Decimal) As Task(Of Guid)
    Dim parameters = New DynamicParameters()
    parameters.Add("CustomerId", customerId)
    parameters.Add("Total", total)
    parameters.Add("NewId", dbType:=DbType.Guid, direction:=ParameterDirection.Output)

    Await _connection.ExecuteAsync(
        "CreatePurchase",
        parameters,
        commandType:=CommandType.StoredProcedure)

    Dim newId = parameters.Get(Of Guid)("NewId")

    Return newId
End Function
```

</details>

## Query aberta: casos simples

Quando a operação é simples demais para justificar uma procedure (lookup por chave, contagem, existência), query aberta é aceitável.

<details>
<summary>✅ Good — lookup simples por chave primária</summary>
<br>

```vbnet
Public Async Function FindByIdAsync(id As Guid) As Task(Of Customer)
    Const sql = "SELECT Id, Name, Email FROM Customers WHERE Id = @Id"

    Dim customer = Await _connection.QueryFirstOrDefaultAsync(Of Customer)(sql, New With {.Id = id})

    Return customer
End Function
```

</details>

<br>

<details>
<summary>✅ Good — verificação de existência</summary>
<br>

```vbnet
Public Async Function ExistsAsync(email As String) As Task(Of Boolean)
    Const sql = "SELECT COUNT(1) FROM Customers WHERE Email = @Email"

    Dim count = Await _connection.ExecuteScalarAsync(Of Integer)(sql, New With {.Email = email})
    Dim exists = count > 0

    Return exists
End Function
```

</details>

## SQL injection

SQL injection acontece quando um valor externo é interpretado como código SQL em vez de dado. Parâmetros nomeados eliminam o risco: o driver envia o valor separado do SQL, e o banco trata como dado puro.

<details>
<summary>❌ Bad — concatenação deixa o atacante escrever SQL</summary>
<br>

```vbnet
' email recebido: ' OR '1'='1
' SQL gerado: SELECT Id, Name FROM Customers WHERE Email = '' OR '1'='1'
' resultado: retorna todos os clientes
Dim sql = $"SELECT Id, Name FROM Customers WHERE Email = '{email}'"

' email recebido: '; DROP TABLE Customers; --
' SQL gerado: SELECT ... WHERE Email = ''; DROP TABLE Customers; --'
' resultado: tabela deletada
Dim sql = "SELECT Id, Name FROM Customers WHERE Email = '" & email & "'"
```

</details>

<br>

<details>
<summary>❌ Bad — LIKE com concatenação, wildcard no SQL permite injeção</summary>
<br>

```vbnet
Public Async Function SearchByNameAsync(term As String) As Task(Of IReadOnlyList(Of Customer))
    Dim sql = $"SELECT Id, Name FROM Customers WHERE Name LIKE '%{term}%'"
    ' term = "'; DROP TABLE Customers; --" → executa instrução arbitrária

    Dim customers = Await _connection.QueryAsync(Of Customer)(sql)
    Dim result = customers.ToList()

    Return result
End Function
```

</details>

<br>

<details>
<summary>✅ Good — parâmetro nomeado, valor tratado como dado pelo banco</summary>
<br>

```vbnet
Public Async Function FindByEmailAsync(email As String) As Task(Of Customer)
    Const sql = "SELECT Id, Name FROM Customers WHERE Email = @Email"

    Dim customer = Await _connection.QueryFirstOrDefaultAsync(Of Customer)(sql, New With {.Email = email})

    Return customer
End Function
```

</details>

<br>

<details>
<summary>✅ Good — LIKE com parâmetro, wildcard no valor não no SQL</summary>
<br>

```vbnet
Public Async Function SearchByNameAsync(term As String) As Task(Of IReadOnlyList(Of Customer))
    Const sql = "SELECT Id, Name FROM Customers WHERE Name LIKE @Term"

    Dim customers = Await _connection.QueryAsync(Of Customer)(sql, New With {.Term = $"%{term}%"})
    Dim result = customers.ToList()

    Return result
End Function
```

</details>

## Injeção de conexão

`IDbConnection` é injetado no repositório via construtor, nunca instanciado internamente. O ciclo de vida da conexão é responsabilidade do container de DI.

<details>
<summary>❌ Bad — conexão instanciada dentro do repositório</summary>
<br>

```vbnet
Public Class PurchaseRepository
    Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
        Using connection = New SqlConnection("Server=...;Database=...")  ' hardcoded
            ' ...
        End Using
    End Function
End Class
```

</details>

<br>

<details>
<summary>✅ Good — IDbConnection injetado via construtor</summary>
<br>

```vbnet
Public Class PurchaseRepository
    Implements IPurchaseRepository

    Private ReadOnly _connection As IDbConnection

    Public Sub New(connection As IDbConnection)
        _connection = connection
    End Sub

    Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary)) _
        Implements IPurchaseRepository.FindByCustomerAsync

        Dim parameters = New DynamicParameters()
        parameters.Add("CustomerId", customerId)

        Dim summaries = Await _connection.QueryAsync(Of PurchaseSummary)(
            "FindPurchasesByCustomer",
            parameters,
            commandType:=CommandType.StoredProcedure)

        Dim result = summaries.ToList()

        Return result
    End Function
End Class
```

```vbnet
' Infrastructure/InfrastructureRegistration.vb
container.RegisterType(Of IDbConnection)(
    New HierarchicalLifetimeManager(),
    New InjectionFactory(Function(c) ConnectionFactory.Create()))

container.RegisterType(Of IPurchaseRepository, PurchaseRepository)(
    New HierarchicalLifetimeManager())
```

</details>

## Multi-result: QueryMultiple

Quando uma procedure retorna múltiplos result sets, `QueryMultiple` lê cada um em sequência com uma única viagem ao banco.

<details>
<summary>✅ Good — procedure com múltiplos SELECTs, uma única chamada</summary>
<br>

```sql
-- GetPurchaseDashboard.sql
CREATE OR ALTER PROCEDURE GetPurchaseDashboard
(
  @CustomerId UNIQUEIDENTIFIER
)
AS
BEGIN
  SELECT Id, Name, Email FROM Customers WHERE Id = @CustomerId;

  SELECT Id, Total, CreatedAt, Status
  FROM Purchases
  WHERE CustomerId = @CustomerId
  ORDER BY CreatedAt DESC;
END;
```

```vbnet
Public Async Function GetDashboardAsync(customerId As Guid) As Task(Of CustomerDashboard)
    Dim parameters = New DynamicParameters()
    parameters.Add("CustomerId", customerId)

    Using reader = Await _connection.QueryMultipleAsync(
        "GetPurchaseDashboard",
        parameters,
        commandType:=CommandType.StoredProcedure)

        Dim customer = Await reader.ReadFirstOrDefaultAsync(Of Customer)()
        Dim purchases = (Await reader.ReadAsync(Of PurchaseSummary)()).ToList()

        Dim dashboard = New CustomerDashboard(customer, purchases)

        Return dashboard
    End Using
End Function
```

</details>
