# Visual Density: VB.NET

Os mesmos princípios de [densidade visual](../../../shared/visual-density.md) com exemplos em VB.NET/.NET Framework 4.8.

## Fases de um método

Métodos com múltiplos passos (validar, buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter no máximo 2 linhas antes de um respiro.

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

## `Return` sempre separado

O `Return` encerra um método. Quando há mais de um passo antes dele, ele pertence a um parágrafo próprio.

<details>
<summary>❌ Bad — Return colado ao último passo</summary>
<br>

```vbnet
Public Function FormatOrderDate(date As DateTimeOffset, Optional locale As String = "pt-BR") As String
    Dim culture = New CultureInfo(locale)
    Dim formatted = date.ToString("dd/MM/yyyy", culture)
    Return formatted
End Function
```

</details>

<br>

<details>
<summary>✅ Good — Return separado do último passo</summary>
<br>

```vbnet
Public Function FormatOrderDate(date As DateTimeOffset, Optional locale As String = "pt-BR") As String
    Dim culture = New CultureInfo(locale)
    Dim formatted = date.ToString("dd/MM/yyyy", culture)

    Return formatted
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

Uma variável seguida do `If` que a valida formam um par semântico. A linha em branco vem **depois** do par, não entre eles.

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

## Testes: Assert como fase própria

Em métodos de teste, o `Assert` é uma fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

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

Uma string longa colada em um `Return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

<details>
<summary>❌ Bad — concatenação densa inline, sem semântica nas partes</summary>
<br>

```vbnet
Public Function BuildShippingLabel(order As Order) As String
    Return order.Customer.FirstName & " " & order.Customer.LastName & vbCrLf & order.Address.Street & ", " & order.Address.Number & vbCrLf & order.Address.City & " - " & order.Address.State & ", " & order.Address.ZipCode & vbCrLf & "Order #" & order.Id.ToString()
End Function
```

</details>

<br>

<details>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>
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
