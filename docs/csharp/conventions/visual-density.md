# Visual Density: C#

Os mesmos princípios de [densidade visual](../../shared/visual-density.md) com exemplos em C#/.NET.

## Fases de um método

Métodos com múltiplos passos (validar, buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter no máximo 2 linhas antes de um respiro.

<details>
<summary>❌ Bad — todos os passos colados, fases invisíveis</summary>
<br>

```csharp
public async Task<UserDto> RegisterUserAsync(RegisterUserRequest request, CancellationToken ct)
{
    var exists = await _userRepository.ExistsByEmailAsync(request.Email, ct);
    if (exists) throw new ConflictException("Email already taken");
    var hash = _passwordHasher.Hash(request.Password);
    var user = new User(request.Name, request.Email, hash);
    await _userRepository.AddAsync(user, ct);
    var token = _tokenService.Generate(user.Id);
    await _emailService.SendWelcomeAsync(user.Email, token, ct);
    return UserDto.From(user);
}
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas, fluxo legível de cima pra baixo</summary>
<br>

```csharp
public async Task<UserDto> RegisterUserAsync(RegisterUserRequest request, CancellationToken ct)
{
    var exists = await _userRepository.ExistsByEmailAsync(request.Email, ct);
    if (exists) throw new ConflictException("Email already taken");

    var hash = _passwordHasher.Hash(request.Password);
    var user = new User(request.Name, request.Email, hash);

    await _userRepository.AddAsync(user, ct);

    var token = _tokenService.Generate(user.Id);
    await _emailService.SendWelcomeAsync(user.Email, token, ct);

    return UserDto.From(user);
}
```

</details>

## `return` sempre separado

O `return` encerra um método. Quando há mais de um passo antes dele, ele pertence a um parágrafo próprio.

<details>
<summary>❌ Bad — return colado ao último passo</summary>
<br>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formatted = date.ToString("dd/MM/yyyy", culture);
    return formatted;
}
```

</details>

<br>

<details>
<summary>✅ Good — return separado do último passo</summary>
<br>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formatted = date.ToString("dd/MM/yyyy", culture);

    return formatted;
}
```

</details>

**Exceção:** métodos de uma expressão ficam compactos.

```csharp
public IEnumerable<Order> GetPendingOrders(Guid userId) =>
    _orderRepository.FindByStatus(userId, OrderStatus.Pending);
```

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam um par semântico. A linha em branco vem **depois** do par, não entre eles.

<details>
<summary>❌ Bad — variável solta do seu guarda</summary>
<br>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);

if (order is null) return NotFound();
var invoice = BuildInvoice(order);
```

</details>

<br>

<details>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>
<br>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);
if (order is null) return NotFound();

var invoice = BuildInvoice(order);
```

</details>

## Testes: Assert como fase própria

Em métodos de teste, o `Assert` é uma fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado. Setup (arrange + act + expected) fica compacto em um grupo; assertion fica no próprio parágrafo.

<details>
<summary>❌ Bad — Assert colado ao setup, fases invisíveis</summary>
<br>

```csharp
[Fact]
public void AppliesTenPercentDiscountToPrice()
{
    var price = 100m;
    var actualPrice = ApplyDiscount(price, 10);
    var expectedPrice = 90m;
    Assert.Equal(expectedPrice, actualPrice);
}
```

</details>

<br>

<details>
<summary>✅ Good — Assert separado, assertion como fase própria</summary>
<br>

```csharp
[Fact]
public void AppliesTenPercentDiscountToPrice()
{
    var price = 100m;
    var actualPrice = ApplyDiscount(price, 10);
    var expectedPrice = 90m;

    Assert.Equal(expectedPrice, actualPrice);
}
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

<details>
<summary>❌ Bad — interpolação densa inline, sem semântica nas partes</summary>
<br>

```csharp
public string BuildShippingLabel(Order order)
{
    return $"{order.Customer.FirstName} {order.Customer.LastName}\n{order.Address.Street}, {order.Address.Number}\n{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}\nOrder #{order.Id}";
}
```

</details>

<br>

<details>
<summary>✅ Good — fragmentos nomeados, template final limpo</summary>
<br>

```csharp
public string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";

    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return label;
}
```

</details>
