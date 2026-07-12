# ADO.NET

**ADO.NET** (ActiveX Data Objects para .NET) é a camada de acesso a dados que já vem no .NET Framework, e é o que se encontra em praticamente todo sistema legado. Ele não faz mapeamento automático: quem lê o resultado é o seu código, coluna por coluna, com um **SqlDataReader**, ou carregando tudo em um **DataTable**. O que se ganha em troca é controle sobre a query, sobre o resultado e sobre a transação, sem nenhuma camada decidindo por você.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ADO.NET** (ActiveX Data Objects para .NET) | Camada de acesso a dados nativa do .NET Framework, sem mapeamento automático |
| **SqlConnection** (conexão) | Abre o canal com o banco; implementa `IDisposable`, então vive dentro de um `Using` |
| **SqlCommand** (comando) | Carrega a instrução a executar, com os parâmetros dela |
| **SqlDataReader** (leitor de resultado) | Percorre as linhas uma a uma, do começo ao fim, sem carregar tudo em memória |
| **SqlDataAdapter** (adaptador) | Preenche um `DataTable` com o resultado inteiro de uma vez |
| **DataTable** (tabela em memória) | Tabela com linhas e colunas, usada como fonte de dados de grids |
| **parameterized query** (consulta com parâmetro) | SQL com `@nome` no lugar do valor; o valor viaja separado da instrução |
| **SQL injection** (injeção de SQL) | Ataque que insere comando SQL pelo campo de entrada; o parâmetro fecha essa porta |
| **DBNull** (nulo do banco) | Como o ADO.NET representa uma coluna `NULL`; é diferente de `Nothing` |
| **Using** (bloco com descarte garantido) | Garante o `Dispose()` na saída, mesmo quando uma exceção interrompe o caminho |

<a id="connection-and-command"></a>

## SqlConnection e SqlCommand dentro de Using

Conexão e comando seguram recursos que o processo precisa devolver: um socket com o servidor e o espaço reservado no pool de conexões. Sem `Dispose()`, esses recursos ficam presos, e o pool se esgota depois de algumas centenas de requisições. O `Using` chama o `Dispose()` na saída do bloco, inclusive quando uma exceção corta o caminho no meio.

<details>
<summary>✅ Bom: query com SqlDataReader, Using garante descarte</summary>

```vbnet
Public Async Function FindByIdAsync(id As Guid) As Task(Of Customer)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText = "SELECT Id, Name, Email FROM Customers WHERE Id = @Id"
            command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = id

            Using reader = Await command.ExecuteReaderAsync()
                If Not Await reader.ReadAsync() Then Return Nothing

                Dim customer = New Customer With {
                    .Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    .Name = reader.GetString(reader.GetOrdinal("Name")),
                    .Email = reader.GetString(reader.GetOrdinal("Email"))
                }

                Return customer
            End Using
        End Using
    End Using
End Function
```

</details>

<a id="parameters-not-concatenation"></a>

## O valor entra por parâmetro, nunca por concatenação

Esta é a regra mais importante da página. Concatenar o que o usuário digitou dentro do **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) entrega a ele o poder de escrever a consulta: um nome como `'; DROP TABLE Customers; --` vira um comando que o banco executa. A interpolação com `$"..."` é o mesmo problema com outra escrita. Com parâmetro, a instrução vai por um caminho e o valor por outro, e o banco trata aquele valor como texto, sem nunca interpretá-lo como comando.

<details>
<summary>❌ Ruim: concatenação de strings abre porta para SQL injection</summary>

```vbnet
' entrada: name = "'; DROP TABLE Customers; --"
Dim sql = "SELECT Id FROM Customers WHERE Name = '" & name & "'"
command.CommandText = sql  ' executa instrução arbitrária do atacante

' com interpolação: igualmente perigoso
command.CommandText = $"SELECT Id FROM Customers WHERE Name = '{name}'"
```

</details>

<details>
<summary>✅ Bom: parâmetro nomeado, valor isolado do SQL</summary>

```vbnet
command.CommandText = "SELECT Id FROM Customers WHERE Name = @Name"
command.Parameters.Add("@Name", SqlDbType.NVarChar, 200).Value = name
```

</details>

<a id="add-with-explicit-type"></a>

## Add com o tipo escrito, no lugar de AddWithValue

`AddWithValue` adivinha o tipo do parâmetro a partir do valor .NET que você passou, e a adivinhação erra. Uma `String` vira `NVarChar` de um tamanho qualquer, e quando a coluna do banco é `VarChar`, o SQL Server precisa converter a coluna inteira para comparar, o que descarta o índice e transforma uma busca instantânea em varredura da tabela. `Add` com o `SqlDbType` declarado envia o parâmetro no tipo da coluna, e a conversão deixa de existir.

<details>
<summary>❌ Ruim: AddWithValue: tipo inferido pode causar conversão e miss de índice</summary>

```vbnet
command.Parameters.AddWithValue("@CustomerId", customerId)  ' tipo inferido
command.Parameters.AddWithValue("@Status", status)          ' String → NVarChar(??)
command.Parameters.AddWithValue("@CreatedAt", date)         ' DateTime vs DateTime2
```

</details>

<details>
<summary>✅ Bom: Add com tipo explícito, sem surpresas de conversão</summary>

```vbnet
command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId
command.Parameters.Add("@Status", SqlDbType.VarChar, 20).Value = status
command.Parameters.Add("@CreatedAt", SqlDbType.DateTime2).Value = createdAt
```

</details>

<a id="execute-non-query"></a>

## ExecuteNonQuery para INSERT, UPDATE e DELETE

`ExecuteNonQuery` roda a instrução que não devolve linhas e responde quantas linhas ela afetou. Esse número é a resposta para "o registro existia?": um `UPDATE` que afeta zero linhas encontrou o `WHERE` sem correspondência, e o método devolve isso a quem chamou em vez de fingir sucesso.

<details>
<summary>✅ Bom: INSERT com ExecuteNonQueryAsync</summary>

```vbnet
Public Async Function CreateAsync(purchase As Purchase) As Task
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText =
                "INSERT INTO Purchases (Id, CustomerId, Total, CreatedAt)
                 VALUES (@Id, @CustomerId, @Total, @CreatedAt)"

            command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = purchase.Id
            command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = purchase.CustomerId
            command.Parameters.Add("@Total", SqlDbType.Decimal).Value = purchase.Total
            command.Parameters.Add("@CreatedAt", SqlDbType.DateTime2).Value = purchase.CreatedAt

            Await command.ExecuteNonQueryAsync()
        End Using
    End Using
End Function
```

</details>

<details>
<summary>✅ Bom: UPDATE verificando se o registro foi encontrado</summary>

```vbnet
Public Async Function UpdateStatusAsync(purchaseId As Guid, status As String) As Task(Of Boolean)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText =
                "UPDATE Purchases SET Status = @Status WHERE Id = @Id AND DeletedAt IS NULL"

            command.Parameters.Add("@Status", SqlDbType.VarChar, 20).Value = status
            command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = purchaseId

            Dim rowsAffected = Await command.ExecuteNonQueryAsync()
            Dim wasFound = rowsAffected > 0
            Return wasFound
        End Using
    End Using
End Function
```

</details>

<a id="stored-procedures"></a>

## Stored procedure com CommandType.StoredProcedure

Com `CommandType.StoredProcedure`, o `CommandText` passa a ser o nome da procedure, e o driver monta o `EXEC` por baixo. Os parâmetros são declarados do mesmo jeito. A alternativa, montar o `EXEC` à mão dentro de uma string, volta a misturar instrução e valor no mesmo texto.

O nome da procedure segue a convenção do banco (`SP_` mais verbo e tabela, em maiúsculas), enquanto o método VB.NET que a chama segue a convenção da linguagem. Os verbos e o formato completo estão em [sql/conventions/naming.md](../../sql/conventions/naming.md#object-prefixes).

<details>
<summary>✅ Bom: procedure de leitura</summary>

```vbnet
Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText = "SP_LIST_PURCHASES_BY_CUSTOMER_ID"
            command.CommandType = CommandType.StoredProcedure
            command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId

            Dim summaries = New List(Of PurchaseSummary)()

            Using reader = Await command.ExecuteReaderAsync()
                While Await reader.ReadAsync()
                    Dim summary = New PurchaseSummary With {
                        .Id = reader.GetGuid(reader.GetOrdinal("Id")),
                        .Total = reader.GetDecimal(reader.GetOrdinal("Total")),
                        .CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                        .Status = reader.GetString(reader.GetOrdinal("Status"))
                    }
                    summaries.Add(summary)
                End While
            End Using

            Return summaries
        End Using
    End Using
End Function
```

</details>

<a id="output-parameter"></a>

## Parâmetro OUTPUT devolve o valor gerado no banco

Quando a procedure calcula um valor e o devolve por um parâmetro `OUTPUT` (o `Id` recém-gerado, por exemplo), esse parâmetro precisa ser declarado com `Direction = ParameterDirection.Output`. O valor só existe depois que o comando roda: ler o `.Value` antes do `ExecuteNonQueryAsync` devolve `Nothing`.

<details>
<summary>✅ Bom: procedure com OUTPUT param para Id gerado no banco</summary>

```vbnet
Public Async Function CreateAsync(customerId As Guid, total As Decimal) As Task(Of Guid)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText = "SP_ADD_PURCHASE"
            command.CommandType = CommandType.StoredProcedure

            command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId
            command.Parameters.Add("@Total", SqlDbType.Decimal).Value = total

            Dim newIdParam = command.Parameters.Add("@NewId", SqlDbType.UniqueIdentifier)
            newIdParam.Direction = ParameterDirection.Output

            Await command.ExecuteNonQueryAsync()

            Dim newId = DirectCast(newIdParam.Value, Guid)
            Return newId
        End Using
    End Using
End Function
```

</details>

<a id="datatable"></a>

## DataTable quando a tela é um grid

`DataTable` carrega o resultado inteiro em memória e serve como fonte de dados direta de um `DataGridView` ou `GridView`, sem que ninguém precise escrever uma classe para as colunas. É o padrão das telas de WebForms e WinForms legados, e continua sendo a escolha certa para relatório e listagem. Para percorrer muitas linhas e processá-las uma a uma, o `SqlDataReader` faz o mesmo trabalho sem trazer tudo para a memória de uma vez.

<details>
<summary>✅ Bom: SqlDataAdapter + DataTable para binding em DataGridView/GridView</summary>

```vbnet
Public Function GetPurchaseTable(customerId As Guid) As DataTable
    Using connection = ConnectionFactory.Create()
        Dim sql = "
            SELECT Id, Total, CreatedAt, Status
            FROM Purchases
            WHERE CustomerId = @CustomerId AND DeletedAt IS NULL
            ORDER BY CreatedAt DESC"

        Using adapter = New SqlDataAdapter(sql, connection)
            adapter.SelectCommand.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId

            Dim table = New DataTable()
            adapter.Fill(table)

            Return table
        End Using
    End Using
End Function

' uso em WebForms / WinForms
GridView1.DataSource = _repository.GetPurchaseTable(customerId)
GridView1.DataBind()
```

</details>

<details>
<summary>✅ Bom: DataTable via stored procedure</summary>

```vbnet
Public Function GetPurchaseReport(startDate As Date, endDate As Date) As DataTable
    Using connection = ConnectionFactory.Create()
        Using adapter = New SqlDataAdapter("SP_GET_PURCHASE_REPORT", connection)
            adapter.SelectCommand.CommandType = CommandType.StoredProcedure
            adapter.SelectCommand.Parameters.Add("@StartDate", SqlDbType.Date).Value = startDate
            adapter.SelectCommand.Parameters.Add("@EndDate", SqlDbType.Date).Value = endDate

            Dim table = New DataTable()
            adapter.Fill(table)

            Return table
        End Using
    End Using
End Function
```

</details>

<a id="transaction"></a>

## A transação faz as duas escritas valerem juntas

Gravar a compra e baixar o estoque são duas escritas. Sem transação, a primeira já está gravada quando a segunda falha, e o banco fica com uma compra cujo estoque nunca saiu. A `SqlTransaction` mantém as duas em suspenso até o `Commit`, e o `Rollback` desfaz tudo no caminho da exceção. Cada `SqlCommand` precisa receber a transação em `.Transaction`: o comando que não a recebe roda fora dela e persiste sozinho.

<details>
<summary>❌ Ruim: sem transação, operações parcialmente persistidas em caso de erro</summary>

```vbnet
Public Async Function CheckoutAsync(cart As Cart) As Task
    Await CreatePurchaseAsync(cart)    ' persiste
    Await DeductStockAsync(cart)       ' falha: estoque não deduzido, mas purchase criada
    Await SendConfirmationAsync(cart)
End Function
```

</details>

<details>
<summary>✅ Bom: transação garante consistência entre as operações</summary>

```vbnet
Public Async Function CheckoutAsync(cart As Cart) As Task
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using transaction = connection.BeginTransaction()
            Try
                Await InsertPurchaseAsync(connection, transaction, cart)
                Await DeductStockAsync(connection, transaction, cart)

                transaction.Commit()
            Catch ex As Exception
                transaction.Rollback()
                Throw
            End Try
        End Using
    End Using
End Function

Private Async Function InsertPurchaseAsync(
    connection As SqlConnection,
    transaction As SqlTransaction,
    cart As Cart) As Task

    Using command = connection.CreateCommand()
        command.Transaction = transaction
        command.CommandText =
            "INSERT INTO Purchases (Id, CustomerId, Total, CreatedAt)
             VALUES (@Id, @CustomerId, @Total, @CreatedAt)"

        command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = Guid.NewGuid()
        command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = cart.CustomerId
        command.Parameters.Add("@Total", SqlDbType.Decimal).Value = cart.Total
        command.Parameters.Add("@CreatedAt", SqlDbType.DateTime2).Value = DateTime.UtcNow

        Await command.ExecuteNonQueryAsync()
    End Using
End Function

Private Async Function DeductStockAsync(
    connection As SqlConnection,
    transaction As SqlTransaction,
    cart As Cart) As Task

    Using command = connection.CreateCommand()
        command.Transaction = transaction
        command.CommandText =
            "UPDATE Products SET Stock = Stock - @Quantity WHERE Id = @ProductId"

        command.Parameters.Add("@Quantity", SqlDbType.Int).Value = cart.Quantity
        command.Parameters.Add("@ProductId", SqlDbType.UniqueIdentifier).Value = cart.ProductId

        Await command.ExecuteNonQueryAsync()
    End Using
End Function
```

</details>

<a id="dbnull"></a>

## A coluna nula chega como DBNull, e não como Nothing

Uma coluna `NULL` no banco volta ao código como `DBNull.Value`. Chamar `GetDateTime` sobre ela lança `InvalidCastException`, porque não existe data ali para converter. Pergunte com `IsDBNull` antes de ler, e devolva o valor em um tipo que aceita ausência (`DateTime?`).

<details>
<summary>❌ Ruim: leitura direta sem verificar DBNull</summary>

```vbnet
' coluna DeletedAt é NULL: GetDateTime lança InvalidCastException
Dim deletedAt = reader.GetDateTime(reader.GetOrdinal("DeletedAt"))
```

</details>

<details>
<summary>✅ Bom: IsDBNull antes de ler coluna anulável</summary>

```vbnet
Dim deletedAtOrdinal = reader.GetOrdinal("DeletedAt")
Dim deletedAt As DateTime? = If(
    reader.IsDBNull(deletedAtOrdinal),
    Nothing,
    CType(reader.GetDateTime(deletedAtOrdinal), DateTime?))
```

</details>

<a id="execute-scalar"></a>

## ExecuteScalar quando a resposta é um valor só

`COUNT`, `MAX`, `SUM` e a leitura de uma única coluna devolvem um valor, e não uma tabela. `ExecuteScalar` traz esse valor direto, sem `SqlDataReader` e sem laço. O retorno é `Object`, então a conversão para o tipo esperado fica por conta de quem chamou.

<details>
<summary>✅ Bom: contagem e verificação de existência com ExecuteScalar</summary>

```vbnet
Public Async Function CountByCustomerAsync(customerId As Guid) As Task(Of Integer)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText =
                "SELECT COUNT(1) FROM Purchases WHERE CustomerId = @CustomerId AND DeletedAt IS NULL"
            command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId

            Dim count = Await command.ExecuteScalarAsync()
            Dim result = CInt(count)
            Return result
        End Using
    End Using
End Function

Public Async Function ExistsAsync(purchaseId As Guid) As Task(Of Boolean)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText =
                "SELECT COUNT(1) FROM Purchases WHERE Id = @Id AND DeletedAt IS NULL"
            command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = purchaseId

            Dim count = Await command.ExecuteScalarAsync()
            Dim exists = CInt(count) > 0
            Return exists
        End Using
    End Using
End Function
```

</details>
