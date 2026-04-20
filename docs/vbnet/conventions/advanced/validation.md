# Validation

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

O pipeline de validação tem três responsabilidades distintas, cada uma no seu lugar:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

Misturar essas camadas cria acoplamento, dificulta testes e abre brechas de segurança.

## Sanitização de entrada

Antes de validar, limpar: `Trim` em strings, `ToLowerInvariant` em emails. Dados sujos entram em validação suja: um email com espaço passa no validator mas falha na busca no banco.

<details>
<summary>❌ Bad — dados brutos chegam direto na validação</summary>
<br>

```vbnet
Public Function CreateUser(request As CreateUserRequest) As OperationResult(Of User)
    If Not ModelState.IsValid Then  ' " Admin@Email.com " passa na validação de formato
        Return OperationResult(Of User).Fail("Invalid input.", "INVALID_INPUT")
    End If

    Dim user = _repository.Create(request)
    Return OperationResult(Of User).Success(user)
End Function
```

</details>

<br>

<details>
<summary>✅ Good — sanitize antes de validar</summary>
<br>

```vbnet
Private Function Sanitize(request As CreateUserRequest) As CreateUserRequest
    Dim sanitized = New CreateUserRequest With {
        .Name = request.Name.Trim(),
        .Email = request.Email.Trim().ToLowerInvariant()
    }

    Return sanitized
End Function

Public Function CreateUser(request As CreateUserRequest) As OperationResult(Of User)
    Dim sanitized = Sanitize(request)

    If Not TryValidate(sanitized) Then
        Return OperationResult(Of User).Fail("Invalid input.", "INVALID_INPUT")
    End If

    Dim user = _repository.Create(sanitized)

    Dim result = OperationResult(Of User).Success(user)

    Return result
End Function
```

</details>

## Schema validation com DataAnnotations

DataAnnotations validam shape, tipos e constraints — não regras de negócio. Centralizam o contrato técnico e eliminam validação manual espalhada nos handlers. Web API 2 e MVC 5 verificam `ModelState.IsValid` automaticamente quando `[ValidateModel]` está aplicado.

<details>
<summary>❌ Bad — validação manual espalhada no handler</summary>
<br>

```vbnet
Public Function CreateOrder(request As CreateOrderRequest) As IHttpActionResult
    If String.IsNullOrWhiteSpace(request.ProductId) Then
        Return BadRequest("ProductId required")
    End If

    If request.Quantity <= 0 Then
        Return BadRequest("Quantity must be positive")
    End If

    If String.IsNullOrWhiteSpace(request.CustomerId) Then
        Return BadRequest("CustomerId required")
    End If

    ' ...
End Function
```

</details>

<br>

<details>
<summary>✅ Good — DataAnnotations centralizam o contrato, handler recebe dado válido</summary>
<br>

```vbnet
' Features/Orders/CreateOrderRequest.vb
Public Class CreateOrderRequest
    <Required(ErrorMessage:="ProductId is required.")>
    <RegularExpression("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                       ErrorMessage:="ProductId must be a valid GUID.")>
    Public Property ProductId As String

    <Range(1, Integer.MaxValue, ErrorMessage:="Quantity must be at least 1.")>
    Public Property Quantity As Integer

    <Required(ErrorMessage:="CustomerId is required.")>
    Public Property CustomerId As String
End Class

' Features/Orders/OrdersController.vb
Public Class OrdersController
    Inherits ApiController

    Public Function Post(request As CreateOrderRequest) As IHttpActionResult
        If Not ModelState.IsValid Then
            Return BadRequest(ModelState)
        End If

        Dim result = _orderService.Create(request)
        If Not result.IsSuccess Then
            Return BadRequest(result.Error)
        End If

        Dim location = $"api/orders/{result.Value.Id}"
        Dim response = Created(location, result.Value)

        Return response
    End Function
End Class
```

</details>

## Regras de negócio

O validator valida se o dado tem o formato correto. Regras de negócio validam se faz sentido no domínio: dependem de I/O (banco, serviços externos) e não pertencem ao validator.

<details>
<summary>❌ Bad — I/O e regra de domínio misturados na validação de schema</summary>
<br>

```vbnet
Public Class CreateOrderRequest
    <Required>
    Public Property ProductId As String

    ' regra de domínio escondida num custom attribute — difícil de testar
    <ProductMustBeAvailable>
    Public Property Quantity As Integer
End Class
```

</details>

<br>

<details>
<summary>✅ Good — schema validation separa do domínio; regras de negócio no service</summary>
<br>

```vbnet
' validator valida shape apenas
Public Class CreateOrderRequest
    <Required>
    Public Property ProductId As String

    <Range(1, Integer.MaxValue)>
    Public Property Quantity As Integer
End Class

' service aplica regras de negócio após schema válido
Public Function CreateOrder(request As CreateOrderRequest) As OperationResult(Of Invoice)
    Dim product = _productRepository.FindById(Guid.Parse(request.ProductId))
    If product Is Nothing Then
        Dim notFound = OperationResult(Of Invoice).Fail("Product not found.", "NOT_FOUND")
        Return notFound
    End If

    If Not product.IsAvailable Then
        Dim unavailable = OperationResult(Of Invoice).Fail("Product unavailable.", "UNAVAILABLE")
        Return unavailable
    End If

    Dim invoice = BuildInvoice(request, product)

    Dim result = OperationResult(Of Invoice).Success(invoice)

    Return result
End Function
```

</details>

## Output filtering

Retornar a entidade direta vaza campos internos: `PasswordHash`, `IsDeleted`, flags de auditoria. Use uma classe de resposta como projeção explícita — nunca a entidade do banco.

<details>
<summary>❌ Bad — entidade direta vaza campos internos</summary>
<br>

```vbnet
Public Function GetUser(id As Guid) As User
    Return _repository.FindById(id)
    ' PasswordHash, IsDeleted, SecurityStamp... vão todos para o cliente
End Function
```

</details>

<br>

<details>
<summary>✅ Good — DTO de resposta como projeção explícita do que sai</summary>
<br>

```vbnet
' Features/Users/UserResponse.vb
Public Class UserResponse
    Public Property Id As Guid
    Public Property Name As String
    Public Property Email As String
    Public Property CreatedAt As DateTimeOffset

    Public Shared Function From(user As User) As UserResponse
        Return New UserResponse With {
            .Id = user.Id,
            .Name = user.Name,
            .Email = user.Email,
            .CreatedAt = user.CreatedAt
        }
    End Function
End Class

' service retorna o DTO, não a entidade
Public Function GetUser(id As Guid) As UserResponse
    Dim user = _repository.FindById(id)
    If user Is Nothing Then Return Nothing

    Dim response = UserResponse.From(user)

    Return response
End Function
```

</details>

## Filtro global de ModelState

Para evitar repetir `If Not ModelState.IsValid` em cada action, registre um `ActionFilterAttribute` global que retorna `400` automaticamente.

<details>
<summary>✅ Good — filtro global elimina boilerplate de ModelState em cada action</summary>
<br>

```vbnet
' Infrastructure/Filters/ValidateModelAttribute.vb
Public Class ValidateModelAttribute
    Inherits ActionFilterAttribute

    Public Overrides Sub OnActionExecuting(context As HttpActionContext)
        If Not context.ModelState.IsValid Then
            context.Response = context.Request.CreateErrorResponse(
                HttpStatusCode.BadRequest, context.ModelState)
        End If
    End Sub
End Class

' App_Start/FilterConfig.vb
Public Module FilterConfig
    Public Sub RegisterGlobalFilters(filters As HttpFilterCollection)
        filters.Add(New ValidateModelAttribute())
    End Sub
End Module
```

</details>
