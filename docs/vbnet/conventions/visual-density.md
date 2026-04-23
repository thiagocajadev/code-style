# Visual Density: VB.NET

Os mesmos princípios de [densidade visual](../../../shared/standards/visual-density.md) com exemplos em VB.NET/.NET Framework 4.8.

## Fases de um método

Métodos com múltiplos passos (validar, buscar, transformar, persistir, responder) devem deixar cada fase visível.

<details>
<summary>❌ Bad — todos os passos colados, fases invisíveis</summary>
<br>

```vbnet
Public Async Function RegisterUserAsync(request As RegisterUserRequest) As Task(Of UserDto)
    Dim exists = Await _userRepository.ExistsByEmailAsync(request.Email)
    If exists Then Throw New ConflictException("Email already taken")
    Dim hash = _passwordHasher.Hash(request.Password)
    Dim user = New User(request.Name, request.Email, hash)
    Await _userRepository.AddAsync(user)
    Dim token = _tokenService.Generate(user.Id)
    Await _emailService.SendWelcomeAsync(user.Email, token)
    Return UserDto.From(user)
End Function
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas, fluxo legível de cima pra baixo</summary>
<br>

```vbnet
Public Async Function RegisterUserAsync(request As RegisterUserRequest) As Task(Of UserDto)
    Dim exists = Await _userRepository.ExistsByEmailAsync(request.Email)
    If exists Then Throw New ConflictException("Email already taken")

    Dim hash = _passwordHasher.Hash(request.Password)
    Dim user = New User(request.Name, request.Email, hash)

    Await _userRepository.AddAsync(user)

    Dim token = _tokenService.Generate(user.Id)
    Await _emailService.SendWelcomeAsync(user.Email, token)

    Dim userDto = UserDto.From(user)
    Return userDto
End Function
```

</details>

## Explaining Return: par tight

Quando há **apenas um passo** antes do `Return`, os dois formam par de 2 linhas sem blank.

<details>
<summary>❌ Bad — blank fragmenta o par</summary>
<br>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)

    Return status
End Function
```

</details>

<br>

<details>
<summary>✅ Good — par tight</summary>
<br>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)
    Return status
End Function
```

</details>

## Return separado: quando há 2+ passos antes

<details>
<summary>✅ Good — 2 preps + Return separado</summary>
<br>

```vbnet
Public Function FormatOrderDate(date As DateTimeOffset, Optional locale As String = "pt-BR") As String
    Dim culture = New CultureInfo(locale)
    Dim formattedDate = date.ToString("dd/MM/yyyy", culture)

    Return formattedDate
End Function
```

</details>

**Exceção:** funções de uma expressão ficam compactas.

```vbnet
Public Function GetPendingOrders(userId As Guid) As IEnumerable(Of Order)
    Return _orderRepository.FindByStatus(userId, OrderStatus.Pending)
End Function
```

## Declaração + guarda = 1 grupo

Uma variável seguida do `If` que a valida formam par semântico. A linha em branco vem **depois** do par.

<details>
<summary>❌ Bad — variável solta do seu guarda</summary>
<br>

```vbnet
Dim order = Await _orderRepository.FindByIdAsync(orderId)

If order Is Nothing Then Return NotFound()
Dim invoice = BuildInvoice(order)
```

</details>

<br>

<details>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>
<br>

```vbnet
Dim order = Await _orderRepository.FindByIdAsync(orderId)
If order Is Nothing Then Return NotFound()

Dim invoice = BuildInvoice(order)
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (Const, ReadOnly, Dim com literal) formam grupo coeso.

<details>
<summary>❌ Bad — órfão entre blanks</summary>
<br>

```vbnet
Public Class DomainLimits
    Public Const MinimumDrivingAge As Integer = 18
    Public Const OrderStatusApproved As Integer = 2

    Public Const OneDayMs As Long = 86_400_000
End Class
```

</details>

<br>

<details>
<summary>✅ Good — trio tight</summary>
<br>

```vbnet
Public Class DomainLimits
    Public Const MinimumDrivingAge As Integer = 18
    Public Const OrderStatusApproved As Integer = 2
    Public Const OneDayMs As Long = 86_400_000
End Class
```

</details>

## Par semântico encadeado

<details>
<summary>✅ Good — penúltima consumida pela última, par tight</summary>
<br>

```vbnet
Public Function BuildShippingLabel(order As Order) As String
    Dim fullName = $"{order.Customer.FirstName} {order.Customer.LastName}"
    Dim addressLine = $"{order.Address.Street}, {order.Address.Number}"

    Dim cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}"
    Dim label = $"{fullName}{vbCrLf}{addressLine}{vbCrLf}{cityLine}{vbCrLf}Order #{order.Id}"

    Return label
End Function
```

</details>

## Testes: Assert como fase própria

<details>
<summary>❌ Bad — Assert colado ao setup, fases invisíveis</summary>
<br>

```vbnet
<Test>
Public Sub AppliesTenPercentDiscountToPrice()
    Dim price = 100D
    Dim actualPrice = ApplyDiscount(price, 10)
    Dim expectedPrice = 90D
    Assert.That(actualPrice, Is.EqualTo(expectedPrice))
End Sub
```

</details>

<br>

<details>
<summary>✅ Good — Assert separado, assertion como fase própria</summary>
<br>

```vbnet
<Test>
Public Sub AppliesTenPercentDiscountToPrice()
    Dim price = 100D
    Dim actualPrice = ApplyDiscount(price, 10)
    Dim expectedPrice = 90D

    Assert.That(actualPrice, Is.EqualTo(expectedPrice))
End Sub
```

</details>

## Strings longas

<details>
<summary>❌ Bad — concatenação densa inline, sem semântica nas partes</summary>
<br>

```vbnet
Public Function BuildShippingMessage(order As Order) As String
    Return order.Customer.FirstName & " " & order.Customer.LastName & vbCrLf & order.Address.Street & ", " & order.Address.Number & vbCrLf & order.Address.City & " - " & order.Address.State & ", " & order.Address.ZipCode & vbCrLf & "Order #" & order.Id.ToString()
End Function
```

</details>

<br>

<details>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>
<br>

```vbnet
Public Function BuildShippingMessage(order As Order) As String
    Dim fullName = $"{order.Customer.FirstName} {order.Customer.LastName}"
    Dim addressLine = $"{order.Address.Street}, {order.Address.Number}"

    Dim cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}"
    Dim message = $"{fullName}{vbCrLf}{addressLine}{vbCrLf}{cityLine}{vbCrLf}Order #{order.Id}"

    Return message
End Function
```

</details>
