# Injeção de dependência em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

**DI** (Dependency Injection · Injeção de Dependência) é a prática de a classe declarar o que precisa e receber pronto, em vez de sair construindo as próprias dependências. O construtor passa a listar tudo o que aquela classe usa, o teste entrega um substituto no lugar do banco de verdade, e trocar a implementação vira uma linha no registro.

VB.NET sobre .NET Framework 4.8 depende de um container externo para isso. Os dois comuns são o **Unity**, da Microsoft, presente na maioria das bases legadas, e o **Autofac**. Os exemplos usam Unity, e a escrita em Autofac é equivalente.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DI** (Dependency Injection · Injeção de Dependência) | A classe recebe as dependências prontas em vez de construí-las |
| **IoC container** (Inversion of Control · Inversão de Controle) | Componente que guarda o registro dos serviços e monta o objeto com tudo o que ele pede |
| **Unity** (container da Microsoft) | Container clássico das bases VB.NET sobre .NET Framework |
| **Autofac** (container alternativo) | Container com um ecossistema maior de extensões |
| **constructor injection** (injeção pelo construtor) | Forma adotada: os parâmetros do construtor declaram tudo o que a classe precisa |
| **Service Locator** (localizador de serviços) | Antipadrão: pedir a dependência ao container de dentro da classe |
| **lifetime** (tempo de vida) | Por quanto tempo o container reaproveita a mesma instância |
| **Singleton** (instância única) | Uma instância só, que serve a aplicação inteira |
| **Transient** (nova a cada pedido) | Uma instância nova a cada resolução |
| **captive dependency** (dependência capturada) | Objeto de vida curta preso dentro de um de vida longa, que passa a viver junto com ele |

<a id="service-locator"></a>

## A classe declara o que precisa no construtor

Receber o container e pedir as dependências a ele lá dentro esconde o que a classe usa. O construtor mostra um parâmetro, e o `Resolve` verdadeiro está enterrado no meio de um método. Descobrir de que a classe depende passa a exigir ler o corpo inteiro dela, e o teste precisa montar um container em vez de passar dois substitutos. As dependências vão no construtor, onde quem lê a assinatura já vê todas.

<details>
<summary>❌ Ruim: dependência implícita, acoplado ao container</summary>

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
<summary>✅ Bom: dependências explícitas no construtor</summary>

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

<a id="constructor-over-property"></a>

## O objeto nasce com tudo o que precisa

Injetar por propriedade cria um intervalo em que o objeto existe e ainda não serve para nada: o container já construiu a classe, e a propriedade `Repository` continua `Nothing` até que alguém a preencha. Se um caminho do código esquecer de preencher, o erro aparece como `NullReferenceException` dentro de um método, longe do ponto onde a montagem falhou. O construtor exige as dependências na hora de criar, e o objeto que existe é um objeto pronto para usar.

<details>
<summary>❌ Ruim: property injection, dependência opcional implícita</summary>

```vbnet
Public Class OrderService

    Public Property Repository As IOrderRepository ' pode ficar Nothing
    Public Property Notifier As INotifier

    Public Async Function ProcessOrderAsync(request As OrderRequest) As Task(Of Result(Of Invoice))
        ' Repository pode estar Nothing aqui: NullReferenceException em produção
        Dim order = Await Repository.FindByIdAsync(request.OrderId)
        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: constructor injection, objeto nasce válido</summary>

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

<a id="lifetimes"></a>

## O tempo de vida decide quando a instância é reaproveitada

Cada registro diz ao container por quanto tempo aquela instância vale. A tabela abaixo traz os três do Unity.

| Lifetime (Unity) | Instância | Quando usar |
| --- | --- | --- |
| `HierarchicalLifetimeManager` | Uma por request HTTP | Repositórios, services de domínio, `DbContext` |
| `TransientLifetimeManager` (padrão) | Nova a cada resolução | Objetos leves e sem estado compartilhado |
| `ContainerControlledLifetimeManager` | Uma para toda a aplicação | Configuração, cache, HttpClient compartilhado |

O erro que dói é a **captive dependency**. Um serviço registrado como instância única recebe, no construtor, um repositório que deveria durar uma requisição. Como o serviço é construído uma vez só, ele guarda aquele repositório para sempre, junto com o `DbContext` e os dados da requisição que estava rodando naquele momento. Em produção isso aparece como o dado de um usuário surgindo na sessão de outro. Regra prática: o tempo de vida da dependência precisa ser igual ou maior que o de quem a recebe.

<details>
<summary>❌ Ruim: singleton captura scoped</summary>

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
<summary>✅ Bom: lifetimes compatíveis</summary>

```vbnet
container.RegisterType(Of ReportService)(New HierarchicalLifetimeManager())
container.RegisterType(Of IOrderRepository, SqlOrderRepository)(New HierarchicalLifetimeManager())
```

</details>

<a id="interface-for-testability"></a>

## O construtor pede a interface

Declarar o parâmetro como `SqlOrderRepository` amarra a classe àquela implementação, e o teste passa a precisar de um banco SQL Server de pé para rodar. Com o parâmetro declarado como `IOrderRepository`, o teste entrega um repositório em memória, e o registro decide qual implementação entra em produção.

<details>
<summary>❌ Ruim: dependência concreta, impossível substituir em testes</summary>

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
<summary>✅ Bom: dependência por interface, substituível</summary>

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

<a id="registration-by-convention"></a>

## Registro por convenção quando os handlers se multiplicam

Cada handler novo pede uma linha no arquivo de registro, e a linha esquecida só aparece em execução, quando o container não sabe construir o controller. Uma interface marcadora (`IHandler`, sem nenhum método) permite varrer o assembly e registrar de uma vez todas as classes que a implementam. O handler novo passa a se registrar sozinho, bastando implementar a interface.

<details>
<summary>❌ Ruim: registro manual, cresce junto com os handlers</summary>

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
<summary>✅ Bom: registro por convenção via reflection</summary>

```vbnet
' interface marcadora: sem métodos, só para identificar handlers no assembly
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

<a id="registration"></a>

## Cada domínio registra as próprias dependências

O registro de um domínio mora no módulo daquele domínio. O `UnityConfig.vb` chama um módulo por feature, e nada mais. Assim, acrescentar um domínio novo acrescenta um arquivo e uma linha, em vez de fazer um arquivo central crescer para sempre. Veja [Project Foundation](../../setup/project-foundation.md#registration-by-domain).

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
