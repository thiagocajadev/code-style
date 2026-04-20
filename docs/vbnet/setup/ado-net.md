# ADO.NET

ADO.NET é a camada de acesso a dados nativa do .NET Framework — presente em todo legado. Não tem mapeamento automático: o código lê coluna a coluna do `SqlDataReader` ou carrega em `DataTable` via `SqlDataAdapter`. Em troca, oferece controle total sobre a query, o resultado e a transação.

## SqlConnection e SqlCommand

O par fundamental. `SqlConnection` abre o canal com o banco; `SqlCommand` executa a instrução. Ambos implementam `IDisposable` — sempre dentro de `Using`.

<details>
<summary>✅ Good — query com SqlDataReader, Using garante descarte</summary>
<br>

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

## Parâmetros: nunca concatenação

A regra mais importante de ADO.NET. Concatenar valores do usuário no SQL é SQL injection direto. Parâmetros nomeados enviam o valor separado da instrução — o banco nunca o interpreta como código.

<details>
<summary>❌ Bad — concatenação de strings abre porta para SQL injection</summary>
<br>

```vbnet
' entrada: name = "'; DROP TABLE Customers; --"
Dim sql = "SELECT Id FROM Customers WHERE Name = '" & name & "'"
command.CommandText = sql  ' executa instrução arbitrária do atacante

' com interpolação: igualmente perigoso
command.CommandText = $"SELECT Id FROM Customers WHERE Name = '{name}'"
```

</details>

<br>

<details>
<summary>✅ Good — parâmetro nomeado, valor isolado do SQL</summary>
<br>

```vbnet
command.CommandText = "SELECT Id FROM Customers WHERE Name = @Name"
command.Parameters.Add("@Name", SqlDbType.NVarChar, 200).Value = name
```

</details>

## Adicionando parâmetros

Prefira `Add` com tipo explícito a `AddWithValue`. `AddWithValue` infere o tipo do valor .NET, o que pode causar conversões inesperadas — especialmente com `String` sendo mapeada para `NVarChar` de tamanho arbitrário, afetando o plano de execução.

<details>
<summary>❌ Bad — AddWithValue: tipo inferido pode causar conversão e miss de índice</summary>
<br>

```vbnet
command.Parameters.AddWithValue("@CustomerId", customerId)  ' tipo inferido
command.Parameters.AddWithValue("@Status", status)          ' String → NVarChar(??)
command.Parameters.AddWithValue("@CreatedAt", date)         ' DateTime vs DateTime2
```

</details>

<br>

<details>
<summary>✅ Good — Add com tipo explícito, sem surpresas de conversão</summary>
<br>

```vbnet
command.Parameters.Add("@CustomerId", SqlDbType.UniqueIdentifier).Value = customerId
command.Parameters.Add("@Status", SqlDbType.VarChar, 20).Value = status
command.Parameters.Add("@CreatedAt", SqlDbType.DateTime2).Value = createdAt
```

</details>

## ExecuteNonQuery: INSERT, UPDATE, DELETE

Para operações que não retornam linhas. Retorna o número de linhas afetadas — útil para detectar se o registro existia.

<details>
<summary>✅ Good — INSERT com ExecuteNonQueryAsync</summary>
<br>

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

<br>

<details>
<summary>✅ Good — UPDATE verificando se o registro foi encontrado</summary>
<br>

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

## Stored procedures

`CommandType.StoredProcedure` instrui o driver a chamar a procedure pelo nome em vez de executar SQL literal. Os parâmetros são os mesmos — o driver cuida da sintaxe `EXEC`.

<details>
<summary>✅ Good — procedure de leitura</summary>
<br>

```vbnet
Public Async Function FindByCustomerAsync(customerId As Guid) As Task(Of IReadOnlyList(Of PurchaseSummary))
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText = "FindPurchasesByCustomer"
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

## Parâmetro OUTPUT

Procedures que retornam um valor via `OUTPUT` exigem um `SqlParameter` com `Direction = ParameterDirection.Output`. O valor fica disponível após `ExecuteNonQueryAsync`.

<details>
<summary>✅ Good — procedure com OUTPUT param para Id gerado no banco</summary>
<br>

```vbnet
Public Async Function CreateAsync(customerId As Guid, total As Decimal) As Task(Of Guid)
    Using connection = ConnectionFactory.Create()
        Await connection.OpenAsync()

        Using command = connection.CreateCommand()
            command.CommandText = "CreatePurchase"
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

## DataTable e SqlDataAdapter

`DataTable` é o padrão de fato em WebForms e WinForms legados: carrega um result set inteiro em memória, serve como `DataSource` direto de grids e relatórios. `SqlDataAdapter` preenche o `DataTable` sem precisar de `Open()` explícito.

<details>
<summary>✅ Good — SqlDataAdapter + DataTable para binding em DataGridView/GridView</summary>
<br>

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

<br>

<details>
<summary>✅ Good — DataTable via stored procedure</summary>
<br>

```vbnet
Public Function GetPurchaseReport(startDate As Date, endDate As Date) As DataTable
    Using connection = ConnectionFactory.Create()
        Using adapter = New SqlDataAdapter("GetPurchaseReport", connection)
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

## Transação

`SqlTransaction` garante atomicidade: ou tudo persiste, ou nada persiste. Sempre associe cada `SqlCommand` à transação via `.Transaction`. Em caso de exceção, `Rollback` desfaz tudo.

<details>
<summary>❌ Bad — sem transação, operações parcialmente persistidas em caso de erro</summary>
<br>

```vbnet
Public Async Function CheckoutAsync(cart As Cart) As Task
    Await CreatePurchaseAsync(cart)    ' persiste
    Await DeductStockAsync(cart)       ' falha — estoque não deduzido, mas purchase criada
    Await SendConfirmationAsync(cart)
End Function
```

</details>

<br>

<details>
<summary>✅ Good — transação garante consistência entre as operações</summary>
<br>

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

## Null em colunas anuláveis

`SqlDataReader` retorna `DBNull.Value` para colunas `NULL`. Verificar com `IsDBNull` antes de ler evita `InvalidCastException`.

<details>
<summary>❌ Bad — leitura direta sem verificar DBNull</summary>
<br>

```vbnet
' coluna DeletedAt é NULL — GetDateTime lança InvalidCastException
Dim deletedAt = reader.GetDateTime(reader.GetOrdinal("DeletedAt"))
```

</details>

<br>

<details>
<summary>✅ Good — IsDBNull antes de ler coluna anulável</summary>
<br>

```vbnet
Dim deletedAtOrdinal = reader.GetOrdinal("DeletedAt")
Dim deletedAt As DateTime? = If(
    reader.IsDBNull(deletedAtOrdinal),
    Nothing,
    CType(reader.GetDateTime(deletedAtOrdinal), DateTime?))
```

</details>

## ExecuteScalar

Para queries que retornam um único valor (COUNT, MAX, SUM, ou uma coluna de uma linha).

<details>
<summary>✅ Good — contagem e verificação de existência com ExecuteScalar</summary>
<br>

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
