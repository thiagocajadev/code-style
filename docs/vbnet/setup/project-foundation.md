# Project Foundation

> [!NOTE]
> Essa estrutura reflete como organizar projetos VB.NET/.NET Framework 4.8. A seção Legacy Desktop cobre Windows Forms; a seção Web cobre ASP.NET MVC 5 / Web API 2. Os padrões de configuração e injeção de dependência se aplicam a ambos os contextos.

---

## Legacy Desktop (Windows Forms)

WinForms em .NET Framework 4.8 tem particularidades que não existem em projetos web: o ciclo de vida é gerenciado pelo `My.Application`, formulários são criados diretamente pelo framework e injeção de dependência é manual. As seções abaixo cobrem os padrões mais encontrados em código legado de desktop.

### Entry point: Sub Main

Por padrão o Visual Studio configura o formulário de inicialização diretamente nas propriedades do projeto — sem `Sub Main` explícito. Isso elimina qualquer chance de inicializar serviços, tratar exceções globais ou passar dependências antes da janela abrir. Prefira `Sub Main` explícito.

Para ativar: **Project Properties → Application → Startup object → Sub Main**.

<details>
<summary>❌ Bad — formulário de inicialização direto, sem ponto de controle</summary>
<br>

```vbnet
' Startup object: MainForm  (configurado nas propriedades do projeto)
' Não há Sub Main — a aplicação abre o formulário diretamente
' Sem tratamento de exceção global, sem inicialização de serviços
```

</details>

<br>

<details>
<summary>✅ Good — Sub Main como ponto de controle único</summary>
<br>

```vbnet
' ApplicationEntry.vb
Module ApplicationEntry
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)

        RegisterExceptionHandlers()

        Dim services = ServiceConfig.Build()
        Dim mainForm = services.Resolve(Of MainForm)()

        Application.Run(mainForm)
    End Sub

    Private Sub RegisterExceptionHandlers()
        AddHandler Application.ThreadException, AddressOf OnThreadException
        AddHandler AppDomain.CurrentDomain.UnhandledException, AddressOf OnUnhandledException
    End Sub
End Module
```

</details>

### Tratamento global de exceções

WinForms expõe dois eventos para capturar exceções não tratadas: `Application.ThreadException` para exceções na UI thread, e `AppDomain.CurrentDomain.UnhandledException` para exceções em outras threads. Sem eles, o Windows exibe uma caixa de erro genérica e encerra o processo.

Registre ambos antes de `Application.Run` — exceções antes desse ponto não são capturadas por nenhum dos dois.

<details>
<summary>❌ Bad — aplicação encerra com diálogo do Windows sem log</summary>
<br>

```vbnet
Module ApplicationEntry
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)
        Application.Run(New MainForm())
        ' exceções não tratadas: diálogo genérico do SO, sem log, sem diagnóstico
    End Sub
End Module
```

</details>

<br>

<details>
<summary>✅ Good — exceções capturadas, logadas e apresentadas ao usuário</summary>
<br>

```vbnet
Module ApplicationEntry
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)

        AddHandler Application.ThreadException, AddressOf OnUiThreadException
        AddHandler AppDomain.CurrentDomain.UnhandledException, AddressOf OnUnhandledException

        ' garante que exceções de UI thread vão para o handler acima
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException)

        Application.Run(New MainForm())
    End Sub

    Private Sub OnUiThreadException(sender As Object, e As ThreadExceptionEventArgs)
        Logger.LogError(e.Exception, "Unhandled UI thread exception")
        MessageBox.Show(
            "An unexpected error occurred. The application will continue.",
            "Error",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error)
    End Sub

    Private Sub OnUnhandledException(sender As Object, e As UnhandledExceptionEventArgs)
        Dim ex = TryCast(e.ExceptionObject, Exception)
        Logger.LogError(ex, "Unhandled exception — application terminating")
        ' não há como recuperar aqui: apenas logar antes de encerrar
    End Sub
End Module
```

</details>

### My.Settings: preferências do usuário

`My.Settings` é exclusivo do VB.NET e representa o `app.config` em duas camadas: configurações de aplicação (somente leitura em runtime) e configurações de usuário (leitura e escrita, persistidas por perfil de Windows).

Use configurações de usuário para preferências de UI — janela maximizada, tema, último diretório aberto. Nunca armazene credenciais ou dados de negócio em `My.Settings`.

| Escopo | Modificável em runtime | Persistido onde |
| --- | --- | --- |
| `Application` | Não | `app.config` |
| `User` | Sim, com `My.Settings.Save()` | `%AppData%\...\user.config` |

<details>
<summary>❌ Bad — preferências de UI hardcoded ou em variáveis locais</summary>
<br>

```vbnet
Public Class MainForm
    Private Sub MainForm_Load(sender As Object, e As EventArgs) Handles Me.Load
        ' estado perdido a cada execução
        Me.WindowState = FormWindowState.Normal
        Me.Width = 1024
        Me.Height = 768
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — My.Settings persiste preferências entre sessões</summary>
<br>

```vbnet
' Em Settings.settings (Designer):
' Nome: WindowMaximized | Tipo: Boolean | Escopo: User | Valor padrão: False
' Nome: LastOpenedPath  | Tipo: String  | Escopo: User | Valor padrão: ""

Public Class MainForm
    Private Sub MainForm_Load(sender As Object, e As EventArgs) Handles Me.Load
        If My.Settings.WindowMaximized Then
            Me.WindowState = FormWindowState.Maximized
        End If
    End Sub

    Private Sub MainForm_FormClosing(sender As Object, e As FormClosingEventArgs) Handles Me.FormClosing
        My.Settings.WindowMaximized = Me.WindowState = FormWindowState.Maximized
        My.Settings.Save()
    End Sub

    Private Sub BtnOpenFile_Click(sender As Object, e As EventArgs) Handles BtnOpenFile.Click
        Using dialog = New OpenFileDialog()
            dialog.InitialDirectory = If(
                String.IsNullOrEmpty(My.Settings.LastOpenedPath),
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                My.Settings.LastOpenedPath)

            If dialog.ShowDialog() = DialogResult.OK Then
                My.Settings.LastOpenedPath = Path.GetDirectoryName(dialog.FileName)
                My.Settings.Save()
                LoadFile(dialog.FileName)
            End If
        End Using
    End Sub
End Class
```

</details>

### Injeção de dependência em Forms

WinForms não tem container de DI nativo. O padrão mais pragmático é **manual constructor injection**: serviços são criados em `Sub Main` e passados para o formulário raiz. Formulários filhos recebem apenas o que precisam — nunca o container inteiro.

<details>
<summary>❌ Bad — Form instancia serviços diretamente ou acessa estado global</summary>
<br>

```vbnet
Public Class PurchaseForm
    Private Sub BtnSave_Click(sender As Object, e As EventArgs) Handles BtnSave.Click
        ' acoplamento direto à implementação concreta
        Dim service = New PurchaseService(New SqlPurchaseRepository())
        service.Save(BuildRequest())
    End Sub
End Class

' ou ainda pior: variável global acessível de qualquer lugar
Public Module Globals
    Public Service As PurchaseService
End Module
```

</details>

<br>

<details>
<summary>✅ Good — serviços injetados via construtor, formulário não conhece a implementação</summary>
<br>

```vbnet
' Sub Main constrói o grafo de dependências
Module ApplicationEntry
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)

        Dim connectionString = ConfigurationManager.ConnectionStrings("DefaultConnection").ConnectionString
        Dim connection = New SqlConnection(connectionString)
        Dim purchaseRepo = New SqlPurchaseRepository(connection)
        Dim purchaseService = New PurchaseService(purchaseRepo)

        Application.Run(New MainForm(purchaseService))
    End Sub
End Module

' MainForm recebe o serviço — não sabe nem quer saber de SqlConnection
Public Class MainForm
    Private ReadOnly _purchaseService As IPurchaseService

    Public Sub New(purchaseService As IPurchaseService)
        InitializeComponent()
        _purchaseService = purchaseService
    End Sub

    Private Sub BtnOpenPurchases_Click(sender As Object, e As EventArgs) Handles BtnOpenPurchases.Click
        ' passa apenas o serviço relevante — não o grafo inteiro
        Dim form = New PurchaseForm(_purchaseService)
        form.ShowDialog()
    End Sub
End Class
```

</details>

### My.Application: ciclo de vida e single-instance

`My.Application` expõe eventos de ciclo de vida (`Startup`, `Shutdown`) e permite configurar a aplicação como single-instance — útil para ferramentas de desktop que não devem abrir duas vezes. Ative em **Project Properties → Application → Make single instance application**.

<details>
<summary>✅ Good — inicialização e limpeza no ciclo de vida da aplicação</summary>
<br>

```vbnet
' ApplicationEvents.vb  (gerado pelo Designer ao ativar eventos de aplicação)
Namespace My
    Partial Friend Class MyApplication

        Private Sub MyApplication_Startup(
            sender As Object,
            e As ApplicationServices.StartupEventArgs) Handles Me.Startup

            ' inicialização antes de qualquer formulário abrir
            Logger.Initialize(ConfigurationManager.AppSettings("LogPath"))
            DatabaseMigrator.EnsureSchema()
        End Sub

        Private Sub MyApplication_Shutdown(
            sender As Object,
            e As EventArgs) Handles Me.Shutdown

            ' limpeza garantida ao encerrar — inclusive por Alt+F4
            Logger.Flush()
        End Sub

        Private Sub MyApplication_StartupNextInstance(
            sender As Object,
            e As ApplicationServices.StartupNextInstanceEventArgs) Handles Me.StartupNextInstance

            ' segunda instância tentou abrir: traz a janela existente para frente
            MainForm.Activate()
            If MainForm.WindowState = FormWindowState.Minimized Then
                MainForm.WindowState = FormWindowState.Normal
            End If
        End Sub

    End Class
End Namespace
```

</details>

### Estrutura de arquivos desktop

```
MyDesktopApp/
├── ApplicationEntry.vb          ← Sub Main, handlers globais
├── ApplicationEvents.vb         ← My.Application (gerado pelo Designer)
├── App.config
├── Settings.settings            ← My.Settings (gerenciado pelo Designer)
├── App_Start/
│   └── ServiceConfig.vb         ← construção manual do grafo de DI
├── Features/
│   ├── Purchases/
│   │   ├── PurchaseForm.vb
│   │   ├── PurchaseForm.Designer.vb
│   │   ├── PurchaseService.vb
│   │   └── PurchaseRepository.vb
│   └── Customers/
│       ├── CustomerForm.vb
│       └── CustomerService.vb
└── Infrastructure/
    ├── ConnectionFactory.vb
    └── Logger.vb
```

---

## Web (ASP.NET MVC 5 / Web API 2)

ASP.NET MVC 5 e Web API 2 em .NET Framework 4.8 seguem um modelo de bootstrap baseado em `Global.asax.vb` e arquivos em `App_Start/`. O ciclo de vida é gerenciado pelo IIS/OWIN e injeção de dependência é feita via container (Unity, Autofac). As seções abaixo cobrem os padrões de configuração, entry point e registro de dependências para projetos web legados.

## Configuração: Web.config e App.config

Connection strings e parâmetros de ambiente pertencem ao arquivo de configuração, nunca ao código. `ConfigurationManager` é o ponto de acesso central — nunca passe strings diretamente para `New SqlConnection(...)`.

<details>
<summary>❌ Bad — connection string hardcoded no código</summary>
<br>

```vbnet
Public Class PurchaseRepository
    Public Function FindById(id As Guid) As Purchase
        Using connection = New SqlConnection("Server=prod-db;Database=App;User=sa;Password=Abc123!")
            ' credenciais expostas no código
        End Using
    End Function
End Class
```

</details>

<br>

<details>
<summary>✅ Good — connection string no Web.config, lida via ConfigurationManager</summary>
<br>

```xml
<!-- Web.config -->
<connectionStrings>
  <add name="DefaultConnection"
       connectionString="Server=.;Database=MyApp;Integrated Security=True;"
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

## Entry point: Global.asax.vb

`Global.asax.vb` é o equivalente ao `Program.cs` em projetos web .NET Framework. Deve declarar intenção — registrar rotas, filtros e container de DI — sem implementar nada diretamente.

<details>
<summary>❌ Bad — Global.asax.vb com lógica de negócio e configuração misturadas</summary>
<br>

```vbnet
Public Class MvcApplication
    Inherits System.Web.HttpApplication

    Protected Sub Application_Start()
        RouteTable.Routes.MapHttpRoute(
            name:="DefaultApi",
            routeTemplate:="api/{controller}/{id}",
            defaults:=New With {.id = RouteParameter.Optional}
        )

        ' registro de serviços espalhado pelo entry point
        Dim container = New UnityContainer()
        container.RegisterType(Of IPurchaseRepository, SqlPurchaseRepository)()
        container.RegisterType(Of ICustomerRepository, SqlCustomerRepository)()
        container.RegisterType(Of PurchaseService)()
        container.RegisterType(Of CustomerService)()
        container.RegisterType(Of IDbConnection)(
            New InjectionFactory(Function(c) ConnectionFactory.Create()))

        GlobalConfiguration.Configuration.DependencyResolver = New UnityDependencyResolver(container)
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — entry point como índice, configuração delegada</summary>
<br>

```vbnet
' Global.asax.vb
Public Class MvcApplication
    Inherits System.Web.HttpApplication

    Protected Sub Application_Start()
        RouteConfig.RegisterRoutes(RouteTable.Routes)
        FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters)
        ContainerConfig.Configure(GlobalConfiguration.Configuration)
    End Sub
End Class
```

```vbnet
' App_Start/RouteConfig.vb
Public Module RouteConfig
    Public Sub RegisterRoutes(routes As RouteCollection)
        routes.MapHttpRoute(
            name:="DefaultApi",
            routeTemplate:="api/{controller}/{id}",
            defaults:=New With {.id = RouteParameter.Optional}
        )
    End Sub
End Module
```

```vbnet
' App_Start/ContainerConfig.vb
Public Module ContainerConfig
    Public Sub Configure(config As HttpConfiguration)
        Dim container = New UnityContainer()
        RegisterTypes(container)
        config.DependencyResolver = New UnityDependencyResolver(container)
    End Sub

    Private Sub RegisterTypes(container As UnityContainer)
        container.RegisterInfrastructure()
        container.RegisterPurchases()
        container.RegisterCustomers()
    End Sub
End Module
```

</details>

## Entry point: Module Main (console e serviços)

Para aplicações console ou Windows Services, o entry point é um `Module` com um `Sub Main`. Mesma regra: declara intenção, delega implementação.

<details>
<summary>✅ Good — Module Main como índice</summary>
<br>

```vbnet
' Program.vb
Module Program
    Sub Main()
        Dim container = ContainerConfig.Build()
        Dim app = container.Resolve(Of Application)()
        app.Run()
    End Sub
End Module
```

```vbnet
' App_Start/ContainerConfig.vb
Public Module ContainerConfig
    Public Function Build() As IUnityContainer
        Dim container = New UnityContainer()
        container.RegisterInfrastructure()
        container.RegisterPurchases()
        Return container
    End Function
End Module
```

</details>

## Injeção de dependência

VB.NET não tem primary constructors (C# 12+). O padrão é construtor explícito com campos `ReadOnly`. Cada serviço declara suas dependências via construtor — nunca instancia ou localiza dependências internamente.

<details>
<summary>❌ Bad — dependências instanciadas internamente</summary>
<br>

```vbnet
Public Class PurchaseService
    Public Function ProcessAsync(request As PurchaseRequest) As Task(Of Invoice)
        ' instanciação direta acopla implementação concreta
        Dim repo = New SqlPurchaseRepository()
        Dim notifier = New EmailNotifier()

        ' ...
    End Function
End Class
```

</details>

<br>

<details>
<summary>❌ Bad — Service Locator: dependências buscadas no container</summary>
<br>

```vbnet
Public Class PurchaseService
    Public Function ProcessAsync(request As PurchaseRequest) As Task(Of Invoice)
        ' acoplamento ao container dentro da classe — difícil de testar
        Dim repo = ServiceLocator.Current.GetInstance(Of IPurchaseRepository)()

        ' ...
    End Function
End Class
```

</details>

<br>

<details>
<summary>✅ Good — constructor injection, dependências declaradas na assinatura</summary>
<br>

```vbnet
Public Class PurchaseService
    Private ReadOnly _repository As IPurchaseRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(repository As IPurchaseRepository, notifier As INotifier)
        _repository = repository
        _notifier = notifier
    End Sub

    Public Async Function ProcessAsync(request As PurchaseRequest) As Task(Of Invoice)
        ' ...
    End Function
End Class
```

</details>

## Registro por domínio

Cada domínio registra suas próprias dependências em um extension method de `IUnityContainer`. `ContainerConfig` agrega, sem conhecer os detalhes de nenhum domínio.

<details>
<summary>✅ Good — domínio de Purchases dono da sua configuração</summary>
<br>

```vbnet
' Features/Purchases/PurchasesRegistration.vb
Public Module PurchasesRegistration
    <Extension>
    Public Function RegisterPurchases(container As IUnityContainer) As IUnityContainer
        container.RegisterType(Of IPurchaseRepository, SqlPurchaseRepository)(
            New HierarchicalLifetimeManager())

        container.RegisterType(Of PurchaseService)(
            New HierarchicalLifetimeManager())

        Return container
    End Function
End Module
```

```vbnet
' Infrastructure/InfrastructureRegistration.vb
Public Module InfrastructureRegistration
    <Extension>
    Public Function RegisterInfrastructure(container As IUnityContainer) As IUnityContainer
        container.RegisterType(Of IDbConnection)(
            New HierarchicalLifetimeManager(),
            New InjectionFactory(Function(c) ConnectionFactory.Create()))

        Return container
    End Function
End Module
```

```vbnet
' App_Start/ContainerConfig.vb
Private Sub RegisterTypes(container As UnityContainer)
    container.RegisterInfrastructure()
    container.RegisterPurchases()
    container.RegisterCustomers()
End Sub
```

</details>

## Leitura de configuração tipada

Evite ler chaves de configuração com strings espalhadas pelo código. Centralize em uma classe ou módulo de configuração — qualquer mudança de chave tem um único ponto de atualização.

<details>
<summary>❌ Bad — chaves de configuração espalhadas no código</summary>
<br>

```vbnet
Public Class EmailNotifier
    Public Sub Send(message As String)
        Dim host = ConfigurationManager.AppSettings("Smtp:Host")      ' chave solta
        Dim port = CInt(ConfigurationManager.AppSettings("Smtp:Port")) ' chave solta
        Dim from = ConfigurationManager.AppSettings("Smtp:From")      ' chave solta
        ' ...
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — configuração centralizada, lida uma vez</summary>
<br>

```xml
<!-- Web.config -->
<appSettings>
  <add key="Smtp:Host" value="smtp.company.com" />
  <add key="Smtp:Port" value="587" />
  <add key="Smtp:From" value="noreply@company.com" />
</appSettings>
```

```vbnet
' Infrastructure/Email/SmtpSettings.vb
Public Class SmtpSettings
    Public ReadOnly Property Host As String
    Public ReadOnly Property Port As Integer
    Public ReadOnly Property From As String

    Public Sub New()
        Host = ConfigurationManager.AppSettings("Smtp:Host")
        Port = CInt(ConfigurationManager.AppSettings("Smtp:Port"))
        From = ConfigurationManager.AppSettings("Smtp:From")
    End Sub
End Class
```

```vbnet
' Infrastructure/InfrastructureRegistration.vb
container.RegisterType(Of SmtpSettings)(New ContainerControlledLifetimeManager())
container.RegisterType(Of INotifier, EmailNotifier)(New HierarchicalLifetimeManager())
```

</details>

## Estrutura de arquivos web

```
MyApp/
├── Global.asax
├── Global.asax.vb
├── Web.config
├── App_Start/
│   ├── RouteConfig.vb
│   ├── FilterConfig.vb
│   └── ContainerConfig.vb
├── Features/
│   ├── Purchases/
│   │   ├── PurchasesRegistration.vb   ← RegisterPurchases()
│   │   ├── PurchaseController.vb
│   │   ├── PurchaseService.vb
│   │   ├── PurchaseRepository.vb
│   │   └── PurchaseRequest.vb
│   └── Customers/
│       ├── CustomersRegistration.vb
│       ├── CustomerController.vb
│       └── CustomerService.vb
└── Infrastructure/
    ├── InfrastructureRegistration.vb  ← RegisterInfrastructure()
    ├── ConnectionFactory.vb
    └── Email/
        ├── SmtpSettings.vb
        └── EmailNotifier.vb
```
