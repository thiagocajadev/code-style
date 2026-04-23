# API Design

> Escopo: VB.NET. Idiomas Web API 2 deste arquivo.
> SSOT do pipeline, envelope, verbos, status codes e Result → HTTP: [shared/platform/api-design.md](../../../shared/platform/api-design.md).

VB.NET sobre .NET Framework 4.8 usa **ASP.NET Web API 2** (System.Web.Http) para APIs HTTP. Não há Minimal API (exige .NET 6+) nem primary constructors (exige C# 12). O design continua valendo: controller fino, handler por operação, DTOs imutáveis, envelope consistente.

## Controller thin: delegar para handler

Controller em Web API 2 é o **boundary** entre HTTP e domínio. Recebe input, chama o handler, traduz o resultado. Handler retorna `Result(Of T)` (tipo de domínio), nunca `IHttpActionResult` — o controller é quem conhece HTTP.

A estrutura por domínio mantém tudo colocalizado:

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
<summary>❌ Bad — controller com lógica de negócio inline</summary>
<br>

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

<br>

<details>
<summary>✅ Good — controller delega para handler, traduz Result no boundary</summary>
<br>

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

## Handler retorna domínio, nunca HTTP

Handler não conhece HTTP. Retorna `Result(Of T)` — success com valor de domínio ou failure com mensagem. O controller traduz para `IHttpActionResult` no boundary. Assim o handler fica testável sem `HttpContext` e reaproveitável fora de Web API.

<details>
<summary>❌ Bad — handler retorna IHttpActionResult, acoplado a HTTP</summary>
<br>

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

<br>

<details>
<summary>✅ Good — handler retorna Result(Of T), domínio puro</summary>
<br>

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

## Contrato, envelope, verbos e status codes

Pipeline de API, DTOs de Request/Response, envelope `ApiResponse(Of T)` com `{ Data, Meta }`,
verbos REST, status codes e mapeamento de `Result(Of T)` para HTTP são agnósticos. A SSOT fica em
[shared/platform/api-design.md](../../../shared/platform/api-design.md).

Em VB.NET sobre .NET Framework 4.8 não há `record`; o equivalente idiomático é a **classe imutável**
com propriedades `ReadOnly` inicializadas no construtor, e o envelope é montado no controller:

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

## Roteamento por atributo

Web API 2 suporta roteamento convencional (`config.Routes.MapHttpRoute(...)`) e roteamento por atributo (`<Route(...)>`, `<RoutePrefix(...)>`). O roteamento por atributo é preferido: rota colocalizada com o controller, sem tabela global.

<details>
<summary>❌ Bad — rotas convencionais, descoberta distante do handler</summary>
<br>

```vbnet
' WebApiConfig.vb
config.Routes.MapHttpRoute(
    name:="DefaultApi",
    routeTemplate:="api/{controller}/{id}",
    defaults:=New With {.id = RouteParameter.Optional})
```

Qualquer alteração de rota exige mexer no arquivo central. Três actions no mesmo controller exigem três rotas numeradas ou conflitam.

</details>

<br>

<details>
<summary>✅ Good — roteamento por atributo, rota no próprio controller</summary>
<br>

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

## Async sem deadlock

Web API 2 sobre IIS expõe um `SynchronizationContext`. Chamar `.Result` ou `.Wait()` em controller ou handler causa deadlock: a continuation aguarda a thread que está bloqueada esperando a task.

A regra é `Async/Await` ponta a ponta. Controller `Async Function`, handler `Async Function`, service `Async Function`. Nunca quebrar a cadeia.

<details>
<summary>❌ Bad — .Result em handler async</summary>
<br>

```vbnet
Public Function Handle(request As OrderRequest) As Result(Of OrderResponse)
    Dim result = _orderService.CreateOrderAsync(request).Result ' deadlock em produção
    Dim success = Result(Of OrderResponse).Success(result.Value)

    Return success
End Function
```

</details>

<br>

<details>
<summary>✅ Good — async ponta a ponta</summary>
<br>

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
