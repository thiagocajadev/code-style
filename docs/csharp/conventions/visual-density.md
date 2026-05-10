# Visual Density: C#

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em C#/.NET. Cada **phase** (fase) do método ganha respiro; **atomic lines** (linhas atômicas) podem aparecer juntas; **explaining return** (retorno explicativo) destaca o resultado final.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Distribuição entre código e respiro: blocos lógicos separados por linha em branco |
| **phase** (fase do método) | Etapa lógica (validar, buscar, transformar, persistir, responder) com até 2 linhas antes do respiro |
| **atomic line** (linha atômica) | Instrução curta e independente; até 3 atômicas homogêneas podem ficar juntas |
| **explaining return** (retorno explicativo) | Linha em branco antes do `return` final para destacar o resultado |
| **breathing room** (espaço de respiro) | Linha em branco que separa fases e ajuda o olho a achar o início de cada bloco |
| **block** (bloco lógico) | Conjunto de linhas que pertencem ao mesmo passo conceitual |
| **orphan line** (linha órfã) | Uma linha solta de um grupo de 4+ atômicas; quebrar em 2+2 evita |

## Fases de um método

Métodos com múltiplos passos (validar, buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter até 2 linhas antes de um respiro; 3 quando são atômicas homogêneas.

<details>
<summary>❌ Ruim — todos os passos colados, fases invisíveis</summary>
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
<summary>✅ Bom — fases separadas, fluxo legível de cima pra baixo</summary>
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

    var userDto = UserDto.From(user);
    return userDto;
}
```

</details>

## Explaining Return: par tight

Uma `var` nomeada acima do `return` explica o valor retornado. Quando há **apenas esse passo** antes do `return`, os dois formam par de 2 linhas sem blank. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>
<br>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);

    return status;
}
```

</details>

<br>

<details>
<summary>✅ Bom — par tight</summary>
<br>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);
    return status;
}
```

</details>

## Return separado: quando há 2+ passos antes

Quando o `return` é precedido por dois ou mais passos distintos, a linha em branco antes dele marca a transição.

<details>
<summary>✅ Bom — 2 preps + return separado</summary>
<br>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formattedDate = date.ToString("dd/MM/yyyy", culture);

    return formattedDate;
}
```

</details>

**Exceção:** métodos de uma expressão ficam compactos.

```csharp
public IEnumerable<Order> GetPendingOrders(Guid userId) =>
    _orderRepository.FindByStatus(userId, OrderStatus.Pending);
```

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam par semântico. A linha em branco vem **depois** do par, não entre eles.

<details>
<summary>❌ Ruim — variável solta do seu guarda</summary>
<br>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);

if (order is null) return NotFound();
var invoice = BuildInvoice(order);
```

</details>

<br>

<details>
<summary>✅ Bom — variável e guarda juntos, separados do próximo passo</summary>
<br>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);
if (order is null) return NotFound();

var invoice = BuildInvoice(order);
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (const, readonly, var com literal) formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>
<br>

```csharp
public static class DomainLimits
{
    public const int MinimumDrivingAge = 18;
    public const int OrderStatusApproved = 2;

    public const long OneDayMs = 86_400_000;
}
```

</details>

<br>

<details>
<summary>✅ Bom — trio tight</summary>
<br>

```csharp
public static class DomainLimits
{
    public const int MinimumDrivingAge = 18;
    public const int OrderStatusApproved = 2;
    public const long OneDayMs = 86_400_000;
}
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>
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

<br>

<details>
<summary>✅ Bom — par semântico tight</summary>
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

## Testes: Assert como fase própria

Em métodos de teste, o `Assert` é fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — Assert colado ao setup, fases invisíveis</summary>
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
<summary>✅ Bom — Assert separado, assertion como fase própria</summary>
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

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — interpolação densa inline, sem semântica nas partes</summary>
<br>

```csharp
public string BuildShippingMessage(Order order)
{
    return $"{order.Customer.FirstName} {order.Customer.LastName}\n{order.Address.Street}, {order.Address.Number}\n{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}\nOrder #{order.Id}";
}
```

</details>

<br>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>
<br>

```csharp
public string BuildShippingMessage(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";
    var message = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return message;
}
```

</details>
