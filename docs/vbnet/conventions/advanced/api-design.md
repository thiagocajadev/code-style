# Design de API em VB.NET

> Escopo: VB.NET. Idiomas Web API 2 deste arquivo.
> SSOT do pipeline, envelope, verbos, status codes e Result → HTTP: [shared/platform/api-design.md](../../../shared/platform/api-design.md).

VB.NET sobre .NET Framework 4.8 escreve **API HTTP** com **ASP.NET Web API 2** (namespace `System.Web.Http`). Duas facilidades que aparecem em material recente ficam de fora aqui: a Minimal API, que pede .NET 6 ou superior, e o construtor primário, que é do C# 12. As decisões de design continuam as mesmas: controller fino, um handler por operação, DTOs que não mudam depois de criados e um envelope igual em todas as respostas.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Contrato pelo qual um sistema conversa com outro, normalmente sobre HTTP |
| **REST** (Representational State Transfer · Transferência de Estado Representacional) | Estilo que usa os verbos do HTTP sobre recursos identificados por URL |
| **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) | Protocolo da web: verbos, status codes, cabeçalhos e corpo |
| **Controller** (controlador) | Fica no limite entre o HTTP e o domínio: recebe a requisição, chama o handler e traduz o resultado |
| **Handler** (manipulador) | Executa a operação e devolve `Result(Of T)`, sem saber que HTTP existe |
| **Result(Of T)** (tipo de resultado) | Valor que carrega o sucesso com o dado, ou a falha com a mensagem |
| **envelope** (envelope da resposta) | Formato fixo de toda resposta da API: `{ Data, Meta }` |
| **SSOT** (Single Source of Truth · Fonte Única da Verdade) | Pipeline, envelope e a tradução de `Result` para HTTP moram em shared/platform/api-design.md |

<a id="thin-controller"></a>

## O controller entrega o trabalho ao handler

O controller fica no limite do sistema: ele traduz HTTP para uma chamada de domínio e traduz o resultado de volta para HTTP. Regra de negócio escrita ali dentro só roda quando existe uma requisição para carregá-la, então testá-la exige subir o pipeline do Web API, e reaproveitá-la em um job noturno fica impossível. Cada operação vira um handler, e os arquivos de um domínio ficam na mesma pasta.

```
Features/
└── Orders/
    ├── OrdersController.vb      ' boundary HTTP ↔ domínio
    ├── CreateOrderHandler.vb    ' um handler por operação
    ├── FindOrderByIdHandler.vb
    ├── FindOrdersHandler.vb
    ├── OrderService.vb          ' lógica compartilhada entre handlers
    ├── OrderRequest.vb          ' DTO de entrada
    └── OrderResponse.vb         ' DTO de saída
```

<details>
<summary>❌ Ruim: controller com lógica de negócio inline</summary>

```vbnet
<RoutePrefix("api/orders")>
Public Class OrdersController
    Inherits ApiController

    Private ReadOnly _db As AppDbContext

    Public Sub New(db As AppDbContext)
        _db = db
    End Sub

    <HttpPost>
    <Route("")>
    Public Async Function Create(request As OrderRequest) As Task(Of IHttpActionResult)
        If String.IsNullOrWhiteSpace(request.ProductId) Then
            Return BadRequest("Product ID required.")
        End If

        Dim product = Await _db.Products.FindAsync(request.ProductId)
        If product Is Nothing Then
            Return NotFound()
        End If

        Dim order = New Order(request.ProductId, request.Quantity, product.Price * request.Quantity)

        _db.Orders.Add(order)
        Await _db.SaveChangesAsync()

        Return Created($"/api/orders/{order.Id}", order)
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: controller delega para handler, traduz Result no boundary</summary>

```vbnet
<RoutePrefix("api/orders")>
Public Class OrdersController
    Inherits ApiController

    Private ReadOnly _createOrder As CreateOrderHandler
    Private ReadOnly _findOrderById As FindOrderByIdHandler
    Private ReadOnly _findOrders As FindOrdersHandler

    Public Sub New(createOrder As CreateOrderHandler,
                   findOrderById As FindOrderByIdHandler,
                   findOrders As FindOrdersHandler)
        _createOrder = createOrder
        _findOrderById = findOrderById
        _findOrders = findOrders
    End Sub

    <HttpGet>
    <Route("")>
    Public Async Function FindAll() As Task(Of IHttpActionResult)
        Dim orders = Await _findOrders.HandleAsync()

        Dim response = Ok(orders)
        Return response
    End Function

    <HttpGet>
    <Route("{id:guid}")>
    Public Async Function FindById(id As Guid) As Task(Of IHttpActionResult)
        Dim result = Await _findOrderById.HandleAsync(id)
        If Not result.IsSuccess Then
            Dim notFound = NotFound()
            Return notFound
        End If

        Dim response = Ok(result.Value)
        Return response
    End Function

    <HttpPost>
    <Route("")>
    Public Async Function Create(request As OrderRequest) As Task(Of IHttpActionResult)
        Dim result = Await _createOrder.HandleAsync(request)
        If Not result.IsSuccess Then
            Dim badRequest = Content(HttpStatusCode.BadRequest, result.ErrorMessage)
            Return badRequest
        End If

        Dim createdOrder = result.Value
        Dim location = New Uri($"/api/orders/{createdOrder.Id}", UriKind.Relative)

        Dim response = Created(location, createdOrder)
        Return response
    End Function
End Class
```

</details>

<a id="handler-returns-domain"></a>

## O handler devolve Result, e o controller traduz para HTTP

O handler devolve `Result(Of T)`: sucesso com o valor de domínio, ou falha com a mensagem. Quem escolhe o status code é o controller, no limite do sistema. Essa divisão tem dois efeitos práticos. O teste do handler roda sem `HttpContext`, chamando o método e lendo o resultado. E o mesmo handler serve a um job agendado ou a um comando de linha de comando, onde `IHttpActionResult` não significaria nada.

<details>
<summary>❌ Ruim: handler retorna IHttpActionResult, acoplado a HTTP</summary>

```vbnet
Public Class CreateOrderHandler

    Private ReadOnly _orderService As OrderService

    Public Sub New(orderService As OrderService)
        _orderService = orderService
    End Sub

    Public Async Function HandleAsync(request As OrderRequest) As Task(Of IHttpActionResult)
        Dim result = Await _orderService.CreateOrderAsync(request)
        ' handler agora precisa construir IHttpActionResult sem ser um ApiController
        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: handler retorna Result(Of T), domínio puro</summary>

```vbnet
Public Class CreateOrderHandler

    Private ReadOnly _orderService As OrderService

    Public Sub New(orderService As OrderService)
        _orderService = orderService
    End Sub

    Public Async Function HandleAsync(request As OrderRequest) As Task(Of Result(Of OrderResponse))
        Dim serviceResult = Await _orderService.CreateOrderAsync(request)
        If Not serviceResult.IsSuccess Then
            Dim failure = Result(Of OrderResponse).Fail(serviceResult.ErrorMessage)
            Return failure
        End If

        Dim order = serviceResult.Value
        Dim orderResponse = New OrderResponse(
            order.Id,
            order.ProductId,
            order.Quantity,
            order.Total,
            order.CreatedAt)

        Dim success = Result(Of OrderResponse).Success(orderResponse)
        Return success
    End Function
End Class
```

</details>

<a id="immutable-dto"></a>

## O DTO é uma classe que não muda depois de criada

O formato do envelope, os verbos, os status codes e a tradução de `Result(Of T)` para HTTP valem para qualquer linguagem, e estão em [shared/platform/api-design.md](../../../shared/platform/api-design.md). O que muda aqui é a escrita: o .NET Framework 4.8 não tem `record`, então o DTO é uma classe `NotInheritable` com propriedades `ReadOnly` preenchidas no construtor. Depois de construído, o objeto guarda os mesmos valores até o fim, e nenhuma camada do caminho consegue alterá-lo por engano.

```vbnet
Public NotInheritable Class OrderRequest

    Public ReadOnly Property ProductId As String
    Public ReadOnly Property Quantity As Integer

    Public Sub New(productId As String, quantity As Integer)
        Me.ProductId = productId
        Me.Quantity = quantity
    End Sub
End Class

Public NotInheritable Class ApiMeta

    Public ReadOnly Property CorrelationId As String
    Public ReadOnly Property RequestedAt As DateTimeOffset

    Public Sub New(correlationId As String, requestedAt As DateTimeOffset)
        Me.CorrelationId = correlationId
        Me.RequestedAt = requestedAt
    End Sub
End Class

Public NotInheritable Class ApiResponse(Of T)

    Public ReadOnly Property Data As T
    Public ReadOnly Property Meta As ApiMeta

    Public Sub New(data As T, meta As ApiMeta)
        Me.Data = data
        Me.Meta = meta
    End Sub
End Class
```

<a id="attribute-routing"></a>

## A rota fica escrita no próprio controller

Web API 2 aceita duas formas de declarar rota. A convencional monta uma tabela central no `WebApiConfig`, e ali um template como `api/{controller}/{id}` atende todos os controllers de uma vez: qualquer rota fora desse formato exige voltar ao arquivo central, e duas actions com a mesma forma de URL entram em conflito. O roteamento por atributo escreve a rota em cima da action, onde quem lê o método já enxerga a URL que chega nele.

<details>
<summary>❌ Ruim: rotas convencionais, descoberta distante do handler</summary>

```vbnet
' WebApiConfig.vb
config.Routes.MapHttpRoute(
    name:="DefaultApi",
    routeTemplate:="api/{controller}/{id}",
    defaults:=New With {.id = RouteParameter.Optional})
```

Qualquer alteração de rota exige mexer no arquivo central. Três actions no mesmo controller exigem três rotas numeradas ou conflitam.

</details>

<details>
<summary>✅ Bom: roteamento por atributo, rota no próprio controller</summary>

```vbnet
' WebApiConfig.vb
config.MapHttpAttributeRoutes()

' Controller
<RoutePrefix("api/orders")>
Public Class OrdersController
    Inherits ApiController

    <HttpGet>
    <Route("{id:guid}")>
    Public Async Function FindById(id As Guid) As Task(Of IHttpActionResult)
        ' ...
    End Function
End Class
```

</details>

<a id="async-without-deadlock"></a>

## A cadeia async vai do controller ao service

O Web API 2 rodando sobre IIS tem um `SynchronizationContext`, então um `.Result` ou `.Wait()` dentro do controller ou do handler trava a requisição pelo impasse descrito em [código assíncrono](async.md#no-blocking-await): a thread fica parada esperando a `Task`, e a `Task` espera aquela thread para continuar. A cadeia precisa ser `Async` inteira, do controller ao service, sem um único elo síncrono no meio.

<details>
<summary>❌ Ruim: .Result em handler async</summary>

```vbnet
Public Function Handle(request As OrderRequest) As Result(Of OrderResponse)
    Dim result = _orderService.CreateOrderAsync(request).Result ' deadlock em produção
    Dim success = Result(Of OrderResponse).Success(result.Value)

    Return success
End Function
```

</details>

<details>
<summary>✅ Bom: async ponta a ponta</summary>

```vbnet
Public Async Function HandleAsync(request As OrderRequest) As Task(Of Result(Of OrderResponse))
    Dim serviceResult = Await _orderService.CreateOrderAsync(request)
    If Not serviceResult.IsSuccess Then
        Dim failure = Result(Of OrderResponse).Fail(serviceResult.ErrorMessage)
        Return failure
    End If

    Dim success = Result(Of OrderResponse).Success(serviceResult.Value)
    Return success
End Function
```

</details>

Veja [Async](./async.md) para detalhes do padrão `Async/Await` em VB.NET.
