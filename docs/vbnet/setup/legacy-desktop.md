# Desktop legado: o setup mínimo que funciona

> Escopo: VB.NET / Windows Forms / .NET Framework 4.8

Um aplicativo desktop de escopo pequeno (consulta operacional, relatório local, cadastro simples) não precisa de container de dependências, camada de serviço nem padrão elaborado. Duas coisas resolvem: a configuração do banco no **App.config** e um módulo de acesso a dados enxuto, com uma função por operação. Montar as camadas antes de precisar delas acrescenta arquivos que ninguém consulta e atrasa a entrega.

Fluxo: `Formulário (tela) → DataAccess (acesso mínimo) → banco → resultado`

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Windows Forms** (interface desktop do .NET) | Plataforma de janelas do .NET; o padrão histórico dos aplicativos VB.NET |
| **App.config** (arquivo de configuração) | XML com a connection string e os parâmetros do aplicativo, lido em execução |
| **connectionStrings** (seção de conexões) | Bloco do `App.config` que guarda o endereço do banco e as credenciais |
| **DataAccess** (módulo de acesso a dados) | Módulo com uma função por operação de banco; ocupa o lugar da camada de serviço em app simples |
| **Module** (módulo VB.NET) | Agrupa membros compartilhados; equivale a uma classe estática do C# |
| **IoC** (Inversion of Control · Inversão de Controle) | Container que monta as dependências; dispensável neste porte de projeto |
| **fail-fast** (falhar cedo) | Verificar a configuração na subida e parar ali, com mensagem clara |
| **DataGridView** (grid do WinForms) | Componente de listagem; recebe um `DataTable` direto como fonte de dados |

Use este setup quando:
- O formulário é o único consumidor do dado
- Não há regra de negócio complexa entre a tela e o banco
- A equipe é pequena e o prazo não justifica camadas adicionais

> [!NOTE]
> Quando o projeto crescer (múltiplos formulários compartilhando lógica, regras de negócio emergindo, necessidade de testes), migre para o padrão com injeção manual descrito em [Project Foundation](project-foundation.md).

---

<a id="app-config"></a>

## A connection string fica no App.config

Escrita no código, a connection string leva a senha do banco para dentro do executável, e qualquer pessoa com o arquivo em mãos a lê. Também prende o programa a um único banco: apontar para o servidor de homologação passa a exigir recompilar e redistribuir. No `App.config`, o endereço fica em um arquivo texto ao lado do executável, e trocá-lo é editar uma linha.

<details>
<summary>❌ Ruim: connection string hardcoded no código</summary>

```vbnet
Public Module CustomerDataAccess
    Public Function FindAll() As DataTable
        ' credenciais expostas: qualquer um com acesso ao executável vê a senha
        Using connection = New SqlConnection("Server=prod-db;Database=App;User=sa;Password=Abc123!")
            ' ...
        End Using
    End Function
End Module
```

</details>

<details>
<summary>✅ Bom: connection string no App.config, lida uma vez</summary>

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

<a id="thin-data-access"></a>

## Um módulo de acesso a dados por domínio

O formulário que abre a própria `SqlConnection` mistura tela e banco no mesmo arquivo, e a conexão fica sem fechar assim que uma exceção interrompe o método antes do `Close()`. Um módulo por domínio resolve as duas coisas: cada função executa uma query e devolve o resultado, o `Using` garante o fechamento, e o formulário se ocupa de chamar e exibir.

<details>
<summary>❌ Ruim: acesso a dados misturado com lógica de **UI** (User Interface · Interface do Usuário) no Form</summary>

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

<details>
<summary>✅ Bom: módulo thin isolado, formulário só chama e exibe</summary>

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

<a id="insert-and-update"></a>

## Gravar segue o mesmo desenho

A escrita repete a estrutura da leitura: uma função por operação, parâmetro com tipo declarado e `Using` em volta da conexão. A função devolve se a gravação encontrou o registro, e o formulário decide o que dizer ao usuário a partir dessa resposta. A validação do que o usuário digitou fica no formulário, antes da chamada.

<details>
<summary>✅ Bom: INSERT com parâmetros tipados</summary>

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

<a id="missing-connection-string"></a>

## Confira a configuração antes de abrir a primeira tela

Quando a chave não existe no `App.config`, `ConfigurationManager.ConnectionStrings("DefaultConnection")` devolve `Nothing`, e o programa segue normalmente até a primeira consulta ao banco, onde estoura uma `NullReferenceException` no meio de uma tela. O usuário vê um erro que não diz nada, e quem for investigar começa pelo lugar errado. Conferir a chave no `Sub Main` troca isso por uma mensagem que nomeia o arquivo e a chave que faltam.

<details>
<summary>✅ Bom: fail-fast na inicialização, antes de abrir qualquer formulário</summary>

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

Cada domínio tem um formulário e um módulo de acesso a dados, e o `ConnectionFactory` fica em `Infrastructure/`, compartilhado por todos. Não existe `App_Start/`, container nem camada de serviço, e nenhum deles faz falta enquanto o projeto couber nas condições listadas no começo desta página.
