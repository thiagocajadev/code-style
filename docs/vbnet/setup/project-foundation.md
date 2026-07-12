# Fundação de um projeto VB.NET

> [!NOTE]
> Essa estrutura reflete como organizar projetos VB.NET/.NET Framework 4.8. A seção Legacy Desktop cobre Windows Forms; a seção Web cobre ASP.NET MVC 5 / Web API 2. Os padrões de configuração e injeção de dependência se aplicam a ambos os contextos.

Um projeto VB.NET em .NET Framework 4.8 cai em uma de duas famílias: desktop, com Windows Forms, ou web, com ASP.NET **MVC** (Model-View-Controller · Modelo-Visão-Controle) 5 e Web **API** (Application Programming Interface · Interface de Programação de Aplicações) 2. Elas começam a rodar de formas diferentes e têm ciclos de vida próprios. As decisões que este guia trata valem para as duas: onde fica a configuração, como as dependências chegam às classes e como os arquivos se organizam por domínio.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Superfície HTTP do projeto web, servida pelo Web API 2 |
| **MVC** (Model-View-Controller · Modelo-Visão-Controle) | Pipeline do ASP.NET MVC 5 que renderiza Views e processa formulários |
| **UI** (User Interface · Interface do Usuário) | A parte visível para o usuário: Windows Forms no desktop, Razor na web |
| **entry point** (ponto de entrada) | Onde a aplicação começa: `Sub Main` no desktop, `Global.asax` na web |
| **DI** (Dependency Injection · Injeção de Dependência) | A classe recebe as dependências pelo construtor, e o container as fornece |
| **container** (container de dependências) | Componente que guarda o registro dos serviços e monta os objetos: Unity nos projetos legados |
| **lifetime** (tempo de vida) | Por quanto tempo o container reaproveita a mesma instância de um serviço |

---

## Legacy Desktop (Windows Forms)

O WinForms tem particularidades que o projeto web não tem: quem cuida do ciclo de vida é o `My.Application`, o framework cria os formulários por conta própria e não existe container de dependências pronto. As seções abaixo cobrem os padrões mais frequentes em código legado de desktop.

<a id="sub-main"></a>

### Sub Main como ponto de partida

Por padrão, o Visual Studio aponta o formulário inicial nas propriedades do projeto, e a aplicação abre a janela sem passar por nenhum código seu. Isso tira o único lugar onde daria para inicializar o log, registrar o tratamento global de exceções e montar as dependências antes da primeira tela aparecer. Um `Sub Main` explícito devolve esse lugar.

Para ativar: **Project Properties → Application → Startup object → Sub Main**.

<details>
<summary>❌ Ruim: formulário de inicialização direto, sem ponto de controle</summary>

```vbnet
' Startup object: MainForm  (configurado nas propriedades do projeto)
' Não há Sub Main: a aplicação abre o formulário diretamente
' Sem tratamento de exceção global, sem inicialização de serviços
```

</details>

<details>
<summary>✅ Bom: Sub Main como ponto de controle único</summary>

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

<a id="global-exception-handling"></a>

### Dois eventos capturam a exceção que ninguém tratou

Sem tratamento global, uma exceção que escapa derruba o processo com a caixa de erro genérica do Windows, e o log fica sem nenhum registro do que aconteceu. O WinForms oferece dois eventos, e os dois são necessários: `Application.ThreadException` pega o que estoura na thread da interface, e `AppDomain.CurrentDomain.UnhandledException` pega o que estoura nas demais. Registre ambos antes do `Application.Run`, porque uma exceção lançada antes desse ponto não passa por nenhum dos dois.

<details>
<summary>❌ Ruim: aplicação encerra com diálogo do Windows sem log</summary>

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

<details>
<summary>✅ Bom: exceções capturadas, logadas e apresentadas ao usuário</summary>

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
        Logger.LogError(ex, "Unhandled exception: application terminating")
        ' não há como recuperar aqui: apenas logar antes de encerrar
    End Sub
End Module
```

</details>

<a id="my-settings"></a>

### My.Settings guarda a preferência do usuário

`My.Settings` existe só no VB.NET e enxerga o arquivo de configuração em duas camadas. As chaves de escopo `Application` são lidas e nunca alteradas em execução. As de escopo `User` podem ser gravadas com `My.Settings.Save()` e ficam no perfil do Windows daquela pessoa, então sobrevivem ao fechamento do programa.

Guarde ali o que é preferência de tela: janela maximizada, tema, última pasta aberta. Senha, token e dado de negócio ficam de fora, porque o arquivo é texto no perfil do usuário.

| Escopo | Modificável em runtime | Persistido onde |
| --- | --- | --- |
| `Application` | Não | `app.config` |
| `User` | Sim, com `My.Settings.Save()` | `%AppData%\...\user.config` |

<details>
<summary>❌ Ruim: preferências de UI hardcoded ou em variáveis locais</summary>

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

<details>
<summary>✅ Bom: My.Settings persiste preferências entre sessões</summary>

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

<a id="di-in-forms"></a>

### O formulário recebe o serviço pelo construtor

O WinForms não traz container de dependências, então o grafo é montado à mão dentro do `Sub Main` e o formulário raiz recebe o que precisa pelo construtor. Um formulário que dá `New SqlPurchaseRepository()` lá dentro fica preso àquela implementação e não roda em teste sem um banco atrás. A variável global tem o mesmo problema, com um agravante: qualquer parte do programa pode trocá-la a qualquer momento. Cada formulário filho recebe apenas os serviços que usa.

<details>
<summary>❌ Ruim: Form instancia serviços diretamente ou acessa estado global</summary>

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

<details>
<summary>✅ Bom: serviços injetados via construtor, formulário não conhece a implementação</summary>

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

' MainForm recebe o serviço: não sabe nem quer saber de SqlConnection
Public Class MainForm
    Private ReadOnly _purchaseService As IPurchaseService

    Public Sub New(purchaseService As IPurchaseService)
        InitializeComponent()
        _purchaseService = purchaseService
    End Sub

    Private Sub BtnOpenPurchases_Click(sender As Object, e As EventArgs) Handles BtnOpenPurchases.Click
        ' passa apenas o serviço relevante: não o grafo inteiro
        Dim form = New PurchaseForm(_purchaseService)
        form.ShowDialog()
    End Sub
End Class
```

</details>

<a id="my-application"></a>

### My.Application: início, encerramento e instância única

O `My.Application` expõe os eventos que cercam a vida do programa. O `Startup` roda antes de qualquer formulário abrir, e é onde o log é inicializado e o schema do banco é conferido. O `Shutdown` roda em qualquer encerramento, inclusive quando o usuário fecha pelo Alt+F4, e é onde o log é descarregado em disco. O `StartupNextInstance` só é chamado quando a aplicação está marcada como instância única (**Project Properties → Application → Make single instance application**): em vez de abrir uma segunda janela, ele traz a existente para a frente.

<details>
<summary>✅ Bom: inicialização e limpeza no ciclo de vida da aplicação</summary>

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

            ' limpeza garantida ao encerrar: inclusive por Alt+F4
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

ASP.NET MVC 5 e Web API 2 sobem a partir do `Global.asax.vb` e dos arquivos em `App_Start/`. Quem cuida do ciclo de vida é o IIS, e as dependências chegam por um container (Unity ou Autofac). As seções abaixo cobrem configuração, ponto de entrada e registro de dependências nesses projetos.

<a id="configuration"></a>

## A connection string mora no arquivo de configuração

Uma connection string escrita no código vai para o repositório junto com a senha, e o mesmo binário passa a servir a um ambiente só. No `Web.config`, a string fica fora do código, e cada ambiente traz a sua. O `ConfigurationManager` é o ponto de leitura, e uma fábrica central devolve a conexão pronta para quem precisar.

<details>
<summary>❌ Ruim: connection string hardcoded no código</summary>

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

<details>
<summary>✅ Bom: connection string no Web.config, lida via ConfigurationManager</summary>

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

<a id="global-asax"></a>

## O Global.asax.vb é um índice, não um depósito

O `Application_Start` é o `Program.cs` do .NET Framework: ele diz o que precisa acontecer na subida. Escrever ali dentro cada registro do container transforma o arquivo em uma lista que cresce a cada feature, e o ponto de entrada deixa de caber na tela. Cada assunto ganha um arquivo em `App_Start/`, e o `Application_Start` chama três linhas: rotas, filtros e container.

<details>
<summary>❌ Ruim: Global.asax.vb com lógica de negócio e configuração misturadas</summary>

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

<details>
<summary>✅ Bom: entry point como índice, configuração delegada</summary>

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

<a id="module-main"></a>

## Console e Windows Service começam em Module Main

Em aplicação de console ou serviço do Windows, o ponto de entrada é um `Sub Main` dentro de um `Module`. A regra é a mesma do `Global.asax.vb`: ele monta o container, resolve a aplicação e manda rodar.

<details>
<summary>✅ Bom: Module Main como índice</summary>

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

<a id="constructor-injection"></a>

## O construtor explícito declara as dependências

VB.NET não tem construtor primário, que é recurso do C# 12. A escrita aqui é o construtor completo, com campos `ReadOnly` preenchidos nele. Uma classe que dá `New SqlPurchaseRepository()` no meio de um método esconde essa dependência de quem lê a assinatura, e um `ServiceLocator.Current.GetInstance` faz o mesmo. Nos dois casos, o teste precisa preparar o mundo inteiro em vez de passar dois substitutos. Detalhes do container em [injeção de dependência](../conventions/advanced/dependency-injection.md).

<details>
<summary>❌ Ruim: dependências instanciadas internamente</summary>

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

<details>
<summary>❌ Ruim: Service Locator: dependências buscadas no container</summary>

```vbnet
Public Class PurchaseService
    Public Function ProcessAsync(request As PurchaseRequest) As Task(Of Invoice)
        ' acoplamento ao container dentro da classe: difícil de testar
        Dim repo = ServiceLocator.Current.GetInstance(Of IPurchaseRepository)()

        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: constructor injection, dependências declaradas na assinatura</summary>

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

<a id="registration-by-domain"></a>

## Cada domínio registra as próprias dependências

O registro de um domínio fica dentro da pasta daquele domínio, escrito como extension method de `IUnityContainer`. O `ContainerConfig` chama um método por feature, sem saber o que cada um faz. Uma feature nova acrescenta um arquivo e uma linha, e o arquivo central para de crescer.

<details>
<summary>✅ Bom: domínio de Purchases dono da sua configuração</summary>

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

<a id="typed-configuration"></a>

## A chave de configuração aparece uma vez só

`ConfigurationManager.AppSettings("Smtp:Host")` espalhado por três classes significa três lugares para atualizar quando a chave mudar de nome, e o que esquecer volta `Nothing` em execução, sem erro de compilação. Uma classe de configuração lê as chaves no construtor e entrega os valores já convertidos. Registrada como instância única, ela lê o arquivo uma vez e serve a aplicação inteira.

<details>
<summary>❌ Ruim: chaves de configuração espalhadas no código</summary>

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

<details>
<summary>✅ Bom: configuração centralizada, lida uma vez</summary>

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
