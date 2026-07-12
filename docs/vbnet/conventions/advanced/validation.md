# Validação em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

A validação de uma requisição passa por três trabalhos diferentes, e cada um tem seu lugar. Limpar o dado que chegou, conferir se ele tem o formato combinado e, só então, perguntar se ele faz sentido para o negócio. O caminho completo é este:

```
[Entrada] → Limpa → Valida formato → Aplica regras de negócio → [Filtra saída] → Resposta
```

Quando esses trabalhos se misturam em um lugar só, a regra de negócio passa a depender do framework de validação, o teste precisa subir um banco para rodar, e um campo interno acaba escapando na resposta.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Ponto de entrada da requisição; o controller recebe o dado bruto |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Objeto que carrega o dado de entrada ou de saída, com os campos que aquele contrato expõe |
| **MVC** (Model-View-Controller · Modelo-Visão-Controle) | Pipeline do ASP.NET onde as Data Annotations rodam a validação de formato sozinhas |
| **DataAnnotations** (anotações de validação) | Atributos como `<Required>` e `<Range>` que declaram o formato esperado na própria classe |
| **ModelState** (estado do modelo) | Objeto do ASP.NET que reúne os erros encontrados na validação de formato |
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa um limite: banco, rede, disco |
| **sanitize** (higienizar) | Limpar o dado antes de validar: tirar espaços das pontas, baixar o email para minúsculas |

<a id="sanitization"></a>

## Limpe o dado antes de validar

`" Admin@Email.com "` passa em qualquer validação de formato de email, e depois não encontra ninguém na busca do banco, porque lá o email está gravado em minúsculas e sem espaços. A limpeza vem primeiro: `Trim()` nas strings, `ToLowerInvariant()` no email. Assim a validação julga o mesmo texto que o resto do sistema vai usar.

<details>
<summary>❌ Ruim: dados brutos chegam direto na validação</summary>

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

<details>
<summary>✅ Bom: sanitize antes de validar</summary>

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

<a id="schema-validation"></a>

## O formato esperado fica declarado no DTO

As **DataAnnotations** dizem, na própria classe de entrada, quais campos são obrigatórios e que valores eles aceitam. O contrato passa a morar em um lugar só, e o controller deixa de repetir a mesma sequência de `If` a cada action. Web API 2 e MVC 5 rodam essa verificação sozinhos e depositam o resultado no `ModelState`.

<details>
<summary>❌ Ruim: validação manual espalhada no handler</summary>

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

<details>
<summary>✅ Bom: DataAnnotations centralizam o contrato, handler recebe dado válido</summary>

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

<a id="business-rules"></a>

## A regra de negócio mora no service

A validação de formato responde se o campo veio preenchido e dentro da faixa aceita. "Este produto está disponível para venda" é outra pergunta: ela exige uma consulta ao banco. Escondida dentro de um atributo de validação, essa consulta transforma um teste do DTO em um teste que precisa de infraestrutura, e o erro de negócio volta ao cliente com a mesma cara de um campo mal preenchido. O service faz essas verificações depois que o formato já passou, e devolve o resultado com um código próprio.

<details>
<summary>❌ Ruim: I/O e regra de domínio misturados na validação de esquema</summary>

```vbnet
Public Class CreateOrderRequest
    <Required>
    Public Property ProductId As String

    ' regra de domínio escondida num custom attribute: difícil de testar
    <ProductMustBeAvailable>
    Public Property Quantity As Integer
End Class
```

</details>

<details>
<summary>✅ Bom: schema validation separa do domínio; regras de negócio no service</summary>

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

<a id="output-filtering"></a>

## A resposta expõe só os campos do contrato

Devolver a entidade do banco manda para o cliente tudo o que ela carrega, incluindo `PasswordHash`, `IsDeleted` e os campos de auditoria. E cada coluna nova que alguém acrescentar à tabela entra na resposta sozinha, sem ninguém decidir. Uma classe de resposta lista os campos que saem, e o que não está nessa lista fica no servidor.

<details>
<summary>❌ Ruim: entidade direta vaza campos internos</summary>

```vbnet
Public Function GetUser(id As Guid) As User
    Return _repository.FindById(id)
    ' PasswordHash, IsDeleted, SecurityStamp... vão todos para o cliente
End Function
```

</details>

<details>
<summary>✅ Bom: DTO de resposta como projeção explícita do que sai</summary>

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

<a id="global-model-state-filter"></a>

## Um filtro global responde 400 por todas as actions

O bloco `If Not ModelState.IsValid Then Return BadRequest(...)` se repete em toda action e sempre faz a mesma coisa. Um `ActionFilterAttribute` registrado globalmente roda essa verificação antes da action, devolve `400` quando o formato falhou, e some com a repetição.

<details>
<summary>✅ Bom: filtro global elimina boilerplate de ModelState em cada action</summary>

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
