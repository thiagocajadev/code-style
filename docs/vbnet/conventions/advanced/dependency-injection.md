# Dependency Injection

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

**DI** (Dependency Injection, injeção de dependência) torna dependências explícitas, testáveis e substituíveis. O container resolve o grafo automaticamente. A única responsabilidade do código é declarar o que precisa, não como obtê-lo.

VB.NET sobre .NET Framework 4.8 usa containers externos: **Unity** (Microsoft, padrão em projetos legados) ou **Autofac** (ecossistema mais rico). Os exemplos abaixo usam Unity por ser o mais comum em bases VB.NET; o idioma é equivalente em Autofac.

## Service locator

Service locator é o antipadrão clássico de DI: buscar dependências diretamente do container dentro da classe. Torna dependências implícitas, dificulta testes e cria acoplamento ao container.

<details>
<summary>❌ Bad — dependência implícita, acoplado ao container</summary>
<br>

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

<br>

<details>
<summary>✅ Good — dependências explícitas no construtor</summary>
<br>

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
<summary>❌ Bad — property injection, dependência opcional implícita</summary>
<br>

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

<br>

<details>
<summary>✅ Good — constructor injection, objeto nasce válido</summary>
<br>

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
<summary>❌ Bad — singleton captura scoped</summary>
<br>

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

<br>

<details>
<summary>✅ Good — lifetimes compatíveis</summary>
<br>

```vbnet
container.RegisterType(Of ReportService)(New HierarchicalLifetimeManager())
container.RegisterType(Of IOrderRepository, SqlOrderRepository)(New HierarchicalLifetimeManager())
```

</details>

## Interface para testabilidade

Depender de interfaces, não de implementações concretas. Permite substituição em testes sem alterar o código de produção.

<details>
<summary>❌ Bad — dependência concreta, impossível substituir em testes</summary>
<br>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As SqlOrderRepository

    Public Sub New(orderRepository As SqlOrderRepository)
        _orderRepository = orderRepository
    End Sub
End Class
```

</details>

<br>

<details>
<summary>✅ Good — dependência por interface, substituível</summary>
<br>

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
<summary>❌ Bad — registro manual, cresce junto com os handlers</summary>
<br>

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

<br>

<details>
<summary>✅ Good — registro por convenção via reflection</summary>
<br>

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
