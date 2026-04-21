# API Design

> Escopo: VB.NET. Visão transversal: [shared/architecture/architecture.md](../../../shared/architecture/architecture.md).

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

## Request e Response

DTOs (Data Transfer Objects — objetos de transferência de dados) definem o contrato da API. Tipos de domínio não vazam para fora: a API recebe e devolve tipos próprios. Em VB.NET sobre .NET Framework 4.8 não há `record`; o equivalente idiomático é a **classe imutável** com propriedades `ReadOnly` inicializadas no construtor.

### Request

<details>
<summary>❌ Bad — classe mutável, contrato implícito</summary>
<br>

```vbnet
Public Class OrderRequest
    Public Property ProductId As String
    Public Property Quantity As Integer
End Class
```

</details>

<br>

<details>
<summary>✅ Good — classe imutável, contrato explícito</summary>
<br>

```vbnet
Public NotInheritable Class OrderRequest

    Public ReadOnly Property ProductId As String
    Public ReadOnly Property Quantity As Integer

    Public Sub New(productId As String, quantity As Integer)
        Me.ProductId = productId
        Me.Quantity = quantity
    End Sub
End Class
```

</details>

### Response

<details>
<summary>❌ Bad — entidade de domínio exposta diretamente</summary>
<br>

```vbnet
Public Async Function HandleAsync(id As Guid) As Task(Of Result(Of Order))
    Dim order = Await _orderService.FindOrderByIdAsync(id)
    Dim success = Result(Of Order).Success(order) ' ❌ expõe Order (entidade de domínio)

    Return success
End Function
```

</details>

<br>

<details>
<summary>✅ Good — DTO imutável dedicado ao contrato externo</summary>
<br>

```vbnet
Public NotInheritable Class OrderResponse

    Public ReadOnly Property Id As Guid
    Public ReadOnly Property ProductId As String
    Public ReadOnly Property Quantity As Integer
    Public ReadOnly Property Total As Decimal
    Public ReadOnly Property CreatedAt As DateTime

    Public Sub New(id As Guid,
                   productId As String,
                   quantity As Integer,
                   total As Decimal,
                   createdAt As DateTime)
        Me.Id = id
        Me.ProductId = productId
        Me.Quantity = quantity
        Me.Total = total
        Me.CreatedAt = createdAt
    End Sub
End Class

Public Class FindOrderByIdHandler

    Private ReadOnly _orderService As OrderService

    Public Sub New(orderService As OrderService)
        _orderService = orderService
    End Sub

    Public Async Function HandleAsync(id As Guid) As Task(Of Result(Of OrderResponse))
        Dim serviceResult = Await _orderService.FindOrderByIdAsync(id)
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

## Response Envelope

Respostas sem envelope têm shapes inconsistentes: sucesso retorna objeto nu, erro retorna string, lista retorna array. Cada shape exige tratamento separado no cliente.

Um envelope `{ Data, Meta }` garante contrato previsível. O campo `Meta` carrega apenas o que ajuda na observabilidade, sem inflar o payload. A montagem do envelope pertence ao controller (boundary HTTP) — o handler continua devolvendo domínio puro.

<details>
<summary>❌ Bad — shapes inconsistentes entre sucesso e erro</summary>
<br>

```vbnet
Public Async Function FindById(id As Guid) As Task(Of IHttpActionResult)
    Dim result = Await _findOrderById.HandleAsync(id)
    If Not result.IsSuccess Then
        Dim notFound = Content(HttpStatusCode.NotFound, "Order not found.") ' ❌ string solta
        Return notFound
    End If

    Dim response = Ok(result.Value) ' ❌ objeto nu, sem envelope

    Return response
End Function
' 200: { "id": "01HV...", "productId": "...", "quantity": 3 }
' 404: "Order not found."
```

</details>

<br>

<details>
<summary>✅ Good — envelope construído no controller, handler permanece puro</summary>
<br>

```vbnet
' Shared/ApiResponse.vb
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

```vbnet
' Features/Orders/OrdersController.vb
<HttpGet>
<Route("{id:guid}")>
Public Async Function FindById(id As Guid) As Task(Of IHttpActionResult)
    Dim result = Await _findOrderById.HandleAsync(id)
    If Not result.IsSuccess Then
        Dim notFound = NotFound()
        Return notFound
    End If

    Dim correlationHeader = Request.Headers.GetValues("X-Correlation-Id").FirstOrDefault()
    Dim correlationId = If(correlationHeader, String.Empty)

    Dim meta = New ApiMeta(correlationId, DateTimeOffset.UtcNow)
    Dim apiResponse = New ApiResponse(Of OrderResponse)(result.Value, meta)

    Dim response = Ok(apiResponse)

    Return response
End Function
' 200: { "data": { "id": "01HV...", ... }, "meta": { "correlationId": "abc-123", "requestedAt": "2026-04-19T14:32:00Z" } }
' 404: (sem corpo)
```

O `CorrelationId` em `Meta` é o mesmo propagado nos logs da requisição.
Veja [Correlation ID](./observability.md#correlation-id).

</details>

## Verbos e rotas

| Verbo | Semântica | Exemplo |
| --- | --- | --- |
| `GET` | Leitura sem efeito colateral | `GET /api/orders`, `GET /api/orders/{id}` |
| `POST` | Criação de recurso | `POST /api/orders` |
| `PUT` | Substituição completa | `PUT /api/orders/{id}` |
| `PATCH` | Atualização parcial | `PATCH /api/orders/{id}` |
| `DELETE` | Remoção | `DELETE /api/orders/{id}` |

- Rotas em kebab-case: `/api/order-items`, não `/api/orderItems`
- Plural para coleções: `/api/orders`, não `/api/order`
- Sem verbo na rota: `POST /api/orders`, não `POST /api/create-order`

## Status codes

| Status | Quando usar |
| --- | --- |
| `200 OK` | Leitura ou operação bem-sucedida com corpo de resposta |
| `201 Created` | Recurso criado; incluir id ou `Location` no corpo |
| `204 No Content` | Operação bem-sucedida sem corpo (ex: DELETE) |
| `400 Bad Request` | Input inválido (erro do cliente) |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Autenticado mas sem permissão |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Estado incompatível (ex: duplicata) |
| `422 Unprocessable Entity` | Input válido mas regra de negócio violada |
| `429 Too Many Requests` | Rate limit atingido |
| `500 Internal Server Error` | Falha inesperada; nunca expor detalhes ao cliente |

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
