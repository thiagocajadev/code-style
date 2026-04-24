# Legacy Desktop — Setup Enxuto

> Escopo: VB.NET / Windows Forms / .NET Framework 4.8

Aplicativos desktop com escopo limitado — consultas operacionais, relatórios locais, cadastros simples — não precisam de container de injeção de dependência (IoC), camadas de serviço ou padrões elaborados. A configuração do banco no `App.config` e um módulo de acesso a dados thin (enxuto) já resolvem o problema.

Fluxo: `Formulário (tela) → DataAccess (acesso mínimo) → banco → resultado`

Use este setup quando:
- O formulário é o único consumidor do dado
- Não há regra de negócio complexa entre a tela e o banco
- A equipe é pequena e o prazo não justifica camadas adicionais

> [!NOTE]
> Quando o projeto crescer — múltiplos formulários compartilhando lógica, regras de negócio emergindo, necessidade de testes — migre para o padrão com injeção manual descrito em [Project Foundation](project-foundation.md).

---

## App.config: connection string

A connection string (string de conexão) pertence ao `App.config`, nunca ao código. Isso permite trocar o banco sem recompilar.

<details>
<summary>❌ Bad — connection string hardcoded no código</summary>
<br>

```vbnet
Public Module CustomerDataAccess
    Public Function FindAll() As DataTable
        ' credenciais expostas — qualquer um com acesso ao executável vê a senha
        Using connection = New SqlConnection("Server=prod-db;Database=App;User=sa;Password=Abc123!")
            ' ...
        End Using
    End Function
End Module
```

</details>

<br>

<details>
<summary>✅ Good — connection string no App.config, lida uma vez</summary>
<br>

```xml
<!-- App.config -->
<connectionStrings>
  <add name="DefaultConnection"
       connectionString="Server=.\SQLEXPRESS;Database=StockApp;Integrated Security=True;"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

```vbnet
' Infrastructure/ConnectionFactory.vb
Public Module ConnectionFactory
    Public Function Create() As SqlConnection
        Dim connectionString = ConfigurationManager.ConnectionStrings("DefaultConnection").ConnectionString
        Dim connection = New SqlConnection(connectionString)

        Return connection
    End Function
End Module
```

</details>

---

## Módulo de acesso a dados thin

Um módulo por domínio. Cada função executa uma query e retorna o resultado — sem lógica de negócio, sem estado. O formulário só precisa chamar a função.

<details>
<summary>❌ Bad — acesso a dados misturado com lógica de **UI** (User Interface, Interface do Usuário) no Form</summary>
<br>

```vbnet
Public Class ProductForm
    Private Sub ProductForm_Load(sender As Object, e As EventArgs) Handles Me.Load
        ' SqlConnection aberta diretamente no formulário
        Dim connection = New SqlConnection("Server=.\SQLEXPRESS;Database=StockApp;Integrated Security=True;")
        connection.Open()

        Dim command = New SqlCommand("SELECT * FROM Products", connection)
        Dim reader = command.ExecuteReader()

        Dim table = New DataTable()
        table.Load(reader)

        ProductGrid.DataSource = table

        ' connection nunca fechada se ocorrer exceção antes do End Sub
        connection.Close()
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — módulo thin isolado, formulário só chama e exibe</summary>
<br>

```vbnet
' Features/Products/ProductDataAccess.vb
Public Module ProductDataAccess
    Public Function FetchAll() As DataTable
        Using connection = ConnectionFactory.Create()
            Dim sql = "
                SELECT Id, Name, Price, Stock
                FROM Products
                WHERE IsActive = 1
                ORDER BY Name"

            Using adapter = New SqlDataAdapter(sql, connection)
                Dim table = New DataTable()
                adapter.Fill(table)

                Return table
            End Using
        End Using
    End Function

    Public Function FetchById(productId As Integer) As DataRow
        Using connection = ConnectionFactory.Create()
            Dim sql = "SELECT Id, Name, Price, Stock FROM Products WHERE Id = @Id"

            Using adapter = New SqlDataAdapter(sql, connection)
                adapter.SelectCommand.Parameters.Add("@Id", SqlDbType.Int).Value = productId

                Dim table = New DataTable()
                adapter.Fill(table)

                Dim hasResult = table.Rows.Count > 0
                If Not hasResult Then Return Nothing

                Dim row = table.Rows(0)

                Return row
            End Using
        End Using
    End Function
End Module
```

```vbnet
' Features/Products/ProductForm.vb
Public Class ProductForm
    Private Sub ProductForm_Load(sender As Object, e As EventArgs) Handles Me.Load
        RefreshGrid()
    End Sub

    Private Sub RefreshGrid()
        Dim products = ProductDataAccess.FetchAll()
        ProductGrid.DataSource = products
    End Sub
End Class
```

</details>

---

## Salvar dados: INSERT e UPDATE

O mesmo princípio: uma função por operação, parâmetros tipados, `Using` garante descarte da conexão.

<details>
<summary>✅ Good — INSERT com parâmetros tipados</summary>
<br>

```vbnet
' Features/Products/ProductDataAccess.vb (continuação)
Public Function SaveProduct(name As String, price As Decimal, stock As Integer) As Boolean
    Using connection = ConnectionFactory.Create()
        connection.Open()

        Using command = connection.CreateCommand()
            command.CommandText =
                "INSERT INTO Products (Name, Price, Stock, IsActive)
                 VALUES (@Name, @Price, @Stock, 1)"

            command.Parameters.Add("@Name", SqlDbType.NVarChar, 200).Value = name
            command.Parameters.Add("@Price", SqlDbType.Decimal).Value = price
            command.Parameters.Add("@Stock", SqlDbType.Int).Value = stock

            Dim rowsAffected = command.ExecuteNonQuery()
            Dim wasSaved = rowsAffected > 0

            Return wasSaved
        End Using
    End Using
End Function
```

```vbnet
' Features/Products/ProductForm.vb (continuação)
Private Sub BtnSave_Click(sender As Object, e As EventArgs) Handles BtnSave.Click
    Dim isNameEmpty = String.IsNullOrWhiteSpace(TxtName.Text)
    If isNameEmpty Then
        MessageBox.Show("Name is required.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning)
        Return
    End If

    Dim name = TxtName.Text.Trim()
    Dim price = CDec(TxtPrice.Text)
    Dim stock = CInt(TxtStock.Text)

    Dim wasSaved = ProductDataAccess.SaveProduct(name, price, stock)

    If wasSaved Then
        RefreshGrid()
        ClearFields()
    Else
        MessageBox.Show("Could not save product.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
    End If
End Sub

Private Sub ClearFields()
    TxtName.Clear()
    TxtPrice.Clear()
    TxtStock.Clear()
End Sub
```

</details>

---

## Tratar connection string ausente

Se o `App.config` não tiver a connection string, `ConfigurationManager.ConnectionStrings` retorna `Nothing`. Falhar rápido (fail-fast) com mensagem clara é preferível a uma `NullReferenceException` genérica na primeira operação de banco.

<details>
<summary>✅ Good — fail-fast na inicialização, antes de abrir qualquer formulário</summary>
<br>

```vbnet
' ApplicationEntry.vb
Module ApplicationEntry
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)

        Dim isConfigValid = ValidateConfig()
        If Not isConfigValid Then Return

        Application.Run(New MainForm())
    End Sub

    Private Function ValidateConfig() As Boolean
        Dim entry = ConfigurationManager.ConnectionStrings("DefaultConnection")
        Dim isMissing = entry Is Nothing OrElse String.IsNullOrWhiteSpace(entry.ConnectionString)

        If isMissing Then
            MessageBox.Show(
                "Connection string 'DefaultConnection' not found in App.config.",
                "Configuration Error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error)

            Return False
        End If

        Return True
    End Function
End Module
```

</details>

---

## Estrutura de arquivos

```
StockApp/
├── App.config
├── ApplicationEntry.vb
├── Features/
│   └── Products/
│       ├── ProductForm.vb
│       ├── ProductForm.Designer.vb
│       └── ProductDataAccess.vb
└── Infrastructure/
    └── ConnectionFactory.vb
```

Sem `App_Start/`, sem container, sem camada de serviço. Cada domínio tem um formulário e um módulo de acesso a dados. `ConnectionFactory` é compartilhado via `Infrastructure/`.
