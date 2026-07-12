# Dapper

> [!NOTE]
> Essa estrutura reflete como usar Dapper em projetos VB.NET/.NET Framework 4.8. Os exemplos são referências conceituais. O que importa é o princípio: procedures para operações de domínio, queries abertas para casos simples, parâmetros nomeados sempre.

**Dapper** é uma biblioteca que executa a query e transforma cada linha do resultado em um objeto do seu código. Ele não gera SQL nem controla o schema, então o SQL continua sendo escrito por quem entende do banco. A escolha adotada aqui é colocar a operação de domínio em uma **stored procedure**, e deixar o VB.NET com o papel de chamar e mapear. A query escrita direto no repositório fica para o caso simples, quando criar uma procedure custaria mais do que resolve.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Dapper** (mapeador leve para .NET) | Biblioteca que executa a query e transforma cada linha em um objeto, sem o peso de um ORM completo |
| **ORM** (Object-Relational Mapper · Mapeador Objeto-Relacional) | Camada que traduz tabelas em classes; o Dapper fica entre o ADO.NET cru e o Entity Framework |
| **stored procedure** (procedimento armazenado) | Consulta com nome, guardada e versionada dentro do banco |
| **parameterized query** (consulta com parâmetro) | SQL com `@nome` no lugar do valor; o valor viaja separado da instrução |
| **DynamicParameters** (parâmetros do Dapper) | Objeto do Dapper que carrega os parâmetros, inclusive os de saída (`OUTPUT`) |
| **IDbConnection** (conexão) | Interface de conexão do ADO.NET que o Dapper estende com `QueryAsync` e `ExecuteAsync` |
| **QueryMultiple** (múltiplos resultados) | Lê vários `SELECT` de uma mesma procedure em uma única ida ao banco |
| **SQL injection** (injeção de SQL) | Ataque que insere comando SQL pelo campo de entrada; o parâmetro fecha essa porta |

<a id="procedure-per-domain"></a>

## A operação de domínio mora em uma procedure

O **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) de uma operação de domínio traz os `JOIN`, o filtro de registro excluído e a ordenação que aquele negócio exige. Escrito dentro de uma string no repositório, esse SQL só pode ser ajustado com recompilação e novo deploy, e o time de banco não consegue nem revisar o plano de execução dele. Na procedure, a consulta fica versionada no banco, e o repositório se ocupa de passar os parâmetros e receber os objetos.

O nome da procedure segue a convenção do banco: `SP_` seguido do verbo e da tabela, em maiúsculas, como `SP_LIST_PURCHASES_BY_CUSTOMER_ID`. O verbo `LIST` avisa que volta uma coleção filtrada, e `GET` avisa que volta um registro só. O método do repositório que chama essa procedure continua em PascalCase (`FindByCustomerAsync`), porque ele é código VB.NET. Os verbos disponíveis e o formato completo estão em [sql/conventions/naming.md](../../sql/conventions/naming.md#object-prefixes).

<details>
<summary>❌ Ruim: SQL de domínio inline no repositório</summary>

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

<details>
<summary>✅ Bom: procedure encapsula a lógica, repositório só mapeia</summary>

```sql
-- SP_LIST_PURCHASES_BY_CUSTOMER_ID.sql
CREATE OR ALTER PROCEDURE SP_LIST_PURCHASES_BY_CUSTOMER_ID
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

-- EXEC SP_LIST_PURCHASES_BY_CUSTOMER_ID @CustomerId = '9585E296-1114-4F35-9B34-1130987BA6D0';
```

```vbnet
Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
    Dim parameters = New DynamicParameters()
    parameters.Add("CustomerId", customerId)

    Dim summaries = Await _connection.QueryAsync(Of PurchaseSummary)(
        "SP_LIST_PURCHASES_BY_CUSTOMER_ID",
        parameters,
        commandType:=CommandType.StoredProcedure)

    Dim result = summaries.ToList()
    Return result
End Function
```

</details>

O parâmetro `OUTPUT` devolve ao código um valor que o banco gerou, como o `Id` da linha recém-inserida. No Dapper, ele é declarado no `DynamicParameters` com `direction:=ParameterDirection.Output`, e só pode ser lido depois que o `ExecuteAsync` rodou.

<details>
<summary>✅ Bom: procedure de escrita com OUTPUT param</summary>

```sql
-- SP_ADD_PURCHASE.sql
CREATE OR ALTER PROCEDURE SP_ADD_PURCHASE
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

-- EXEC SP_ADD_PURCHASE
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
        "SP_ADD_PURCHASE",
        parameters,
        commandType:=CommandType.StoredProcedure)

    Dim newId = parameters.Get(Of Guid)("NewId")
    Return newId
End Function
```

</details>

<a id="inline-query"></a>

## A query aberta resolve o caso simples

Busca por chave primária, contagem e verificação de existência cabem em uma linha de SQL e não carregam regra de negócio nenhuma. Criar uma procedure para cada uma delas acrescenta um arquivo, uma migration e um deploy de banco, sem nada em troca. Nesses casos, a query fica no repositório, sempre com parâmetro nomeado.

<details>
<summary>✅ Bom: lookup simples por chave primária</summary>

```vbnet
Public Async Function FindByIdAsync(id As Guid) As Task(Of Customer)
    Const sql = "SELECT Id, Name, Email FROM Customers WHERE Id = @Id"

    Dim customer = Await _connection.QueryFirstOrDefaultAsync(Of Customer)(sql, New With {.Id = id})
    Return customer
End Function
```

</details>

<details>
<summary>✅ Bom: verificação de existência</summary>

```vbnet
Public Async Function ExistsAsync(email As String) As Task(Of Boolean)
    Const sql = "SELECT COUNT(1) FROM Customers WHERE Email = @Email"

    Dim count = Await _connection.ExecuteScalarAsync(Of Integer)(sql, New With {.Email = email})
    Dim exists = count > 0
    Return exists
End Function
```

</details>

<a id="sql-injection"></a>

## O valor entra por parâmetro, e o banco o trata como dado

SQL injection acontece quando um valor digitado pelo usuário é lido pelo banco como comando. Um email igual a `' OR '1'='1` transforma a busca por um cliente na busca por todos eles, e um valor com `; DROP TABLE Customers; --` apaga a tabela. Com parâmetro nomeado, o driver manda a instrução e o valor por vias separadas, e nada do que vier no valor é interpretado como código.

O `LIKE` costuma escapar dessa regra, porque parece que os `%` precisam estar no SQL. Eles não precisam: os `%` fazem parte do valor, e o parâmetro recebe o termo já cercado por eles.

<details>
<summary>❌ Ruim: concatenação deixa o atacante escrever SQL</summary>

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

<details>
<summary>❌ Ruim: LIKE com concatenação, wildcard no SQL permite injeção</summary>

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

<details>
<summary>✅ Bom: parâmetro nomeado, valor tratado como dado pelo banco</summary>

```vbnet
Public Async Function FindByEmailAsync(email As String) As Task(Of Customer)
    Const sql = "SELECT Id, Name FROM Customers WHERE Email = @Email"

    Dim customer = Await _connection.QueryFirstOrDefaultAsync(Of Customer)(sql, New With {.Email = email})
    Return customer
End Function
```

</details>

<details>
<summary>✅ Bom: LIKE com parâmetro, wildcard no valor não no SQL</summary>

```vbnet
Public Async Function SearchByNameAsync(term As String) As Task(Of IReadOnlyList(Of Customer))
    Const sql = "SELECT Id, Name FROM Customers WHERE Name LIKE @Term"

    Dim customers = Await _connection.QueryAsync(Of Customer)(sql, New With {.Term = $"%{term}%"})
    Dim result = customers.ToList()
    Return result
End Function
```

</details>

<a id="connection-injection"></a>

## A conexão chega pelo construtor

O repositório recebe `IDbConnection` pelo construtor. Criar a conexão lá dentro traz a connection string junto e prende o repositório a um banco específico, o que impede o teste de trocá-la por outra coisa. Quem decide o tempo de vida da conexão é o registro no container: `HierarchicalLifetimeManager` entrega uma conexão por requisição, que é o que a transação precisa para abranger as escritas daquela requisição.

<details>
<summary>❌ Ruim: conexão instanciada dentro do repositório</summary>

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

<details>
<summary>✅ Bom: IDbConnection injetado via construtor</summary>

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
            "SP_LIST_PURCHASES_BY_CUSTOMER_ID",
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

<a id="query-multiple"></a>

## QueryMultiple lê vários resultados em uma ida só

Uma tela de painel precisa do cliente e da lista de compras dele. Feitas em duas chamadas, são duas idas ao banco, cada uma com a latência da rede. Uma procedure com dois `SELECT` devolve os dois resultados de uma vez, e o `QueryMultiple` lê um depois do outro, na mesma ordem em que aparecem na procedure.

<details>
<summary>✅ Bom: procedure com múltiplos SELECTs, uma única chamada</summary>

```sql
-- SP_GET_PURCHASE_DASHBOARD.sql
CREATE OR ALTER PROCEDURE SP_GET_PURCHASE_DASHBOARD
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
        "SP_GET_PURCHASE_DASHBOARD",
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
