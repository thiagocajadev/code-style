# Dependency Injection

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

**DI** (Dependency Injection, injeção de dependência) torna dependências explícitas, testáveis e substituíveis. O container resolve o grafo automaticamente. A única responsabilidade do código é declarar o que precisa, não como obtê-lo.

VB.NET sobre .NET Framework 4.8 usa containers externos: **Unity** (container DI da Microsoft, padrão em projetos legados) ou **Autofac** (container DI com ecossistema mais rico). Os exemplos abaixo usam Unity por ser o mais comum em bases VB.NET; o idioma é equivalente em Autofac.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DI** (Dependency Injection, Injeção de Dependências) | Padrão em que o container fornece dependências em vez de a classe construí-las |
| **IoC container** (Inversion of Control, Inversão de Controle) | Componente que registra serviços e resolve o grafo de dependências |
| **Unity** (container DI da Microsoft) | Container clássico em projetos VB.NET sobre .NET Framework |
| **Autofac** (container DI alternativo) | Container popular com ecossistema rico de extensões |
| **Service Locator** (localizador de serviços) | Antipadrão: buscar dependências do container dentro da classe |
| **constructor injection** (injeção via construtor) | Forma preferida: parâmetros do construtor declaram tudo que a classe precisa |
| **Singleton** (instância única) | Tempo de vida em que uma única instância serve todo o app |
| **Transient** (por chamada) | Tempo de vida em que cada resolução cria uma nova instância |
| **PerRequestLifetime** (por requisição HTTP) | Tempo de vida que dura por requisição em ASP.NET clássico |

## Service locator

Service locator é o antipadrão clássico de DI: buscar dependências diretamente do container dentro da classe. Torna dependências implícitas, dificulta testes e cria acoplamento ao container.

<details>
<summary>❌ Ruim — dependência implícita, acoplado ao container</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _container As IUnityContainer

    Public Sub New(container As IUnityContainer)
        _container = container
    End Sub

    Public Async Function ProcessOrderAsync(request As OrderRequest) As Task(Of Result(Of Invoice))
        Dim repository = _container.Resolve(Of IOrderRepository)()
        Dim notifier = _container.Resolve(Of INotifier)()
        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom — dependências explícitas no construtor</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(orderRepository As IOrderRepository, notifier As INotifier)
        _orderRepository = orderRepository
        _notifier = notifier
    End Sub

    Public Async Function ProcessOrderAsync(request As OrderRequest) As Task(Of Result(Of Invoice))
        ' ...
    End Function
End Class
```

</details>

## Constructor injection sobre property injection

Property injection (setter injection) cria objetos em estado inválido: a dependência pode estar `Nothing` até alguém injetar. Constructor injection garante que o objeto nasce completo.

<details>
<summary>❌ Ruim — property injection, dependência opcional implícita</summary>

```vbnet
Public Class OrderService

    Public Property Repository As IOrderRepository ' pode ficar Nothing
    Public Property Notifier As INotifier

    Public Async Function ProcessOrderAsync(request As OrderRequest) As Task(Of Result(Of Invoice))
        ' Repository pode estar Nothing aqui — NullReferenceException em produção
        Dim order = Await Repository.FindByIdAsync(request.OrderId)
        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom — constructor injection, objeto nasce válido</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository
    Private ReadOnly _notifier As INotifier

    Public Sub New(orderRepository As IOrderRepository, notifier As INotifier)
        If orderRepository Is Nothing Then Throw New ArgumentNullException(NameOf(orderRepository))
        If notifier Is Nothing Then Throw New ArgumentNullException(NameOf(notifier))

        _orderRepository = orderRepository
        _notifier = notifier
    End Sub
End Class
```

</details>

## Lifetimes

O container resolve cada dependência com um tempo de vida. Escolher errado gera bugs silenciosos em produção.

| Lifetime (Unity) | Instância | Quando usar |
| --- | --- | --- |
| `HierarchicalLifetimeManager` | Uma por request HTTP | Repositórios, services de domínio, `DbContext` |
| `TransientLifetimeManager` (padrão) | Nova a cada resolução | Objetos leves e sem estado compartilhado |
| `ContainerControlledLifetimeManager` | Uma para toda a aplicação | Configuração, cache, HttpClient compartilhado |

**Captive dependency**: um `ContainerControlledLifetimeManager` (singleton) que recebe um `HierarchicalLifetimeManager` (scoped) captura a instância na primeira resolução. O scoped passa a viver para sempre: comportamento incorreto e difícil de rastrear.

<details>
<summary>❌ Ruim — singleton captura scoped</summary>

```vbnet
container.RegisterType(Of ReportService)(New ContainerControlledLifetimeManager())
container.RegisterType(Of IOrderRepository, SqlOrderRepository)(New HierarchicalLifetimeManager())

Public Class ReportService

    Private ReadOnly _orderRepository As IOrderRepository ' capturado na primeira resolução

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub
End Class
```

</details>

<details>
<summary>✅ Bom — lifetimes compatíveis</summary>

```vbnet
container.RegisterType(Of ReportService)(New HierarchicalLifetimeManager())
container.RegisterType(Of IOrderRepository, SqlOrderRepository)(New HierarchicalLifetimeManager())
```

</details>

## Interface para testabilidade

Depender de interfaces, não de implementações concretas. Permite substituição em testes sem alterar o código de produção.

<details>
<summary>❌ Ruim — dependência concreta, impossível substituir em testes</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As SqlOrderRepository

    Public Sub New(orderRepository As SqlOrderRepository)
        _orderRepository = orderRepository
    End Sub
End Class
```

</details>

<details>
<summary>✅ Bom — dependência por interface, substituível</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub
End Class

' produção
container.RegisterType(Of IOrderRepository, SqlOrderRepository)(New HierarchicalLifetimeManager())

' testes
container.RegisterType(Of IOrderRepository, FakeOrderRepository)(New TransientLifetimeManager())
```

</details>

## Registro por convenção

Em domínios com muitos handlers, registrar cada um manualmente é repetitivo e fácil de esquecer. Unity permite varrer o assembly via reflection e registrar por convenção de nome ou interface marcadora.

<details>
<summary>❌ Ruim — registro manual, cresce junto com os handlers</summary>

```vbnet
Public Module OrdersRegistration

    Public Sub Register(container As IUnityContainer)
        container.RegisterType(Of FindOrdersHandler)()
        container.RegisterType(Of FindOrderByIdHandler)()

        container.RegisterType(Of CreateOrderHandler)()
        container.RegisterType(Of UpdateOrderHandler)()

        container.RegisterType(Of CancelOrderHandler)()
        ' a cada novo handler, uma nova linha aqui
    End Sub
End Module
```

</details>

<details>
<summary>✅ Bom — registro por convenção via reflection</summary>

```vbnet
' interface marcadora — sem métodos, só para identificar handlers no assembly
Public Interface IHandler
End Interface

Public Class CreateOrderHandler
    Implements IHandler

    Private ReadOnly _orderService As OrderService

    Public Sub New(orderService As OrderService)
        _orderService = orderService
    End Sub
End Class

Public Class FindOrderByIdHandler
    Implements IHandler

    Private ReadOnly _orderService As OrderService

    Public Sub New(orderService As OrderService)
        _orderService = orderService
    End Sub
End Class
```

```vbnet
Public Module OrdersRegistration

    Public Sub Register(container As IUnityContainer)
        Dim assembly = GetType(CreateOrderHandler).Assembly
        Dim handlerTypes = assembly.GetTypes().
            Where(Function(t) GetType(IHandler).IsAssignableFrom(t) AndAlso
                              Not t.IsAbstract AndAlso
                              Not t.IsInterface)

        For Each handlerType In handlerTypes
            container.RegisterType(handlerType, New HierarchicalLifetimeManager())
        Next

        container.RegisterType(Of OrderService)(New HierarchicalLifetimeManager())
    End Sub
End Module
```

</details>

> [!NOTE]
> Unity possui `RegisterTypes` com helpers para assembly scanning (`AllClasses.FromAssembliesInBasePath()`, `WithMappings.FromMatchingInterface`). Autofac tem equivalente (`builder.RegisterAssemblyTypes(...).AsImplementedInterfaces()`). Quando o registro por convenção se repete em vários domínios, usar o helper do container reduz duplicação.

## Registro

O registro das dependências pertence ao módulo do domínio, não ao `Global.asax.vb`. O `UnityConfig.vb` (ou equivalente) apenas orquestra os módulos de cada feature. Veja [Project Foundation](../../setup/project-foundation.md#unity-ioc-e-registro-por-domínio).

```vbnet
Public Module UnityConfig

    Public Function CreateContainer() As IUnityContainer
        Dim container = New UnityContainer()

        OrdersRegistration.Register(container)
        CustomersRegistration.Register(container)
        BillingRegistration.Register(container)

        Return container
    End Function
End Module
```
