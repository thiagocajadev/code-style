# Densidade visual em C#

Densidade visual é a quantidade de informação que você empilha em cada bloco de
código. Quando muitas linhas se acumulam sem espaço, o olho cansa e você perde o
fio do raciocínio. Quando linhas sem relação ficam grudadas, o leitor não sabe
onde uma ideia termina e a outra começa. A saída é direta: junte as linhas que
contam a mesma pequena história e separe cada história da próxima com uma linha
em branco. Este guia mostra como aplicar isso em C# e .NET, sempre com um exemplo
ruim e um bom lado a lado.

Os princípios gerais estão em
[densidade visual](../../shared/standards/visual-density.md). Aqui eles aparecem
adaptados a C#.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo |
| **semantic group** (grupo semântico) | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou salvar |
| **blank line** (linha em branco) | Separa dois grupos; faz o papel que antes cabia a um comentário de seção |
| **boundary** (limite) | Linha que separa camadas, por exemplo do controller para o service; pede uma linha em branco antes |
| **multi-line block** (bloco de várias linhas) | Inicializador de objeto, coleção ou comando quebrado em várias linhas; pede um respiro depois de si |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação |

## A regra central

A regra que resolve quase tudo: **agrupe poucas linhas por vez e separe cada
grupo com uma linha em branco.** O tamanho natural de um grupo é duas linhas.
Três valem quando dividir em duas mais uma deixaria a última linha sozinha. A
partir de quatro, quebre em dois grupos de duas.

<details>
<summary>❌ Ruim: denso demais, com todos os passos juntos</summary>

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

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

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

<a id="explaining-return"></a>

## O `return` fica junto da linha que nomeia o valor

Quando a linha logo acima do `return` é a `var` que dá nome ao valor devolvido,
as duas contam a mesma coisa e ficam juntas, sem linha em branco no meio. Isso
vale por mais longo que seja o método. A linha em branco entra antes do par,
separando-o do passo anterior.

<details>
<summary>❌ Ruim: a linha em branco parte a dupla no meio</summary>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);

    return status;
}
```

</details>

<details>
<summary>✅ Bom: a `var` e o `return` juntos</summary>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);
    return status;
}
```

</details>

<a id="return-tight-vs-separated"></a>

## Quando o `return` cola na linha acima e quando ganha um respiro

O `return` cola na linha de cima em um caso só: quando essa linha é a declaração
que nomeia o valor devolvido (`var x = ...` ou `Type x = ...`) e cabe inteira em
uma linha.

Nos outros casos entra uma linha em branco antes do `return`:

- a linha de cima ocupa várias linhas (um inicializador de objeto ou de coleção,
  ou um comando quebrado);
- a linha de cima executa uma ação e não nomeia valor nenhum (um `await`, um
  método sem retorno);
- o valor devolvido foi criado vários passos antes, e as duas linhas não se
  referem uma à outra.

<details>
<summary>❌ Ruim: a linha em branco separou a declaração do `return` que a devolve</summary>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formattedDate = date.ToString("dd/MM/yyyy", culture);

    return formattedDate;
}
```

`formattedDate` e `return formattedDate` são a mesma ideia escrita em duas
linhas. Separá-las não ajuda ninguém.

</details>

<details>
<summary>✅ Bom: a declaração que nomeia o valor e o `return` ficam juntos</summary>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formattedDate = date.ToString("dd/MM/yyyy", culture);
    return formattedDate;
}
```

</details>

<details>
<summary>✅ Bom: o respiro fica depois do inicializador de várias linhas</summary>

```csharp
public OrderResponse BuildOrderResponse(Order order, string requestId)
{
    var data = new OrderData
    {
        Id = order.Id,
        Total = order.Total,
        Items = order.Items,
    };

    var response = new OrderResponse(data, requestId);
    return response;
}
```

O inicializador de `data` ocupa seis linhas. A linha em branco depois dele marca
onde esse bloco termina e onde começa a montagem da resposta.

</details>

Métodos de uma expressão só fogem da regra, porque o `return` é o corpo inteiro:

```csharp
public IEnumerable<Order> GetPendingOrders(Guid userId) =>
    _orderRepository.FindByStatus(userId, OrderStatus.Pending);
```

<a id="declaration-and-guard"></a>

## A variável e o `if` que a valida ficam juntos

Uma variável e o `if` que confere o valor dela contam um passo só: buscar e
verificar. Quando esse `if` cabe em uma linha (`if (...) return ...;` ou
`if (...) throw ...;`), ele fica junto da declaração, e a linha em branco vem
depois dos dois.

Quando o `if` abre chaves, a história muda. O bloco `{ }` ocupa várias linhas na
tela e passa a pesar como um passo próprio, mesmo que tenha uma instrução só
dentro. Aí entra uma linha em branco antes dele. O critério é o peso visual do
bloco.

<details>
<summary>❌ Ruim: a linha em branco separou a variável do `if` que a valida</summary>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);

if (order is null) return NotFound();
var invoice = BuildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: o `if` de uma linha fica junto da declaração</summary>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);
if (order is null) return NotFound();

var invoice = BuildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: o `if` com chaves vira um passo próprio, com respiro antes</summary>

```csharp
var handler = _eventHandlers.GetValueOrDefault(eventType);

if (handler is null)
{
    _logger.LogUnhandledEventType(eventType);
    return;
}

var eventPayload = @event.Data;
```

</details>

<details>
<summary>✅ Bom: mesmo com uma instrução só, o `if` com chaves pede respiro antes</summary>

```csharp
var response = await requestFn();

if (response.StatusCode != HttpStatusCode.TooManyRequests)
{
    return response;
}

var delayMs = Math.Pow(2, attempt) * 1000;
```

O bloco ocupa quatro linhas na tela. Escrito em uma linha só, ele ficaria junto
na declaração; escrito com chaves, pede o respiro antes.

</details>

<a id="single-line-orphan"></a>

## Não deixe uma linha sozinha entre espaços

Três declarações simples e parecidas (`const`, `readonly`, `var` com um valor
literal) formam um grupo coeso. Se você quebrar duas mais uma, a última fica
sozinha entre duas linhas em branco e parece esquecida ali. Mantenha as três
juntas. A partir de quatro, quebre em dois grupos de duas.

<details>
<summary>❌ Ruim: a última constante ficou sozinha entre linhas em branco</summary>

```csharp
public static class DomainLimits
{
    public const int MinimumDrivingAge = 18;
    public const int OrderStatusApproved = 2;

    public const long OneDayMs = 86_400_000;
}
```

</details>

<details>
<summary>✅ Bom: as três constantes em um grupo só</summary>

```csharp
public static class DomainLimits
{
    public const int MinimumDrivingAge = 18;
    public const int OrderStatusApproved = 2;
    public const long OneDayMs = 86_400_000;
}
```

</details>

<details>
<summary>✅ Bom: quatro constantes viram dois grupos de duas</summary>

```csharp
public static class DomainLimits
{
    public const int MinimumDrivingAge = 18;
    public const int OrderStatusApproved = 2;

    public const long OneDayMs = 86_400_000;
    public const int MaxRetryAttempts = 3;
}
```

</details>

<a id="semantic-pair"></a>

## Duas linhas onde a segunda usa o valor da primeira

Quando a última linha usa o valor que a linha logo acima acabou de declarar, as
duas dependem uma da outra e ficam juntas. A linha em branco entra antes desse
par, separando-o do que veio antes.

<details>
<summary>❌ Ruim: a linha em branco separou quem produz o valor de quem usa o valor</summary>

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

<details>
<summary>✅ Bom: a linha que usa o valor fica junto da que declarou o valor</summary>

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

<a id="fragments-to-assembly"></a>

## Prepare as partes, depois monte o resultado

Quando duas ou mais linhas preparam pedaços e uma linha final junta todos eles, a
montagem é um passo próprio e ganha uma linha em branco antes. Repare que isso é
o oposto do caso anterior, e a pergunta que separa os dois é simples:

- a última linha usa só o valor declarado logo acima? As duas ficam juntas.
- a última linha junta valores declarados em linhas diferentes? Ela é a montagem,
  e vai com um respiro antes.

<details>
<summary>❌ Ruim: os pedaços e a montagem juntos, como se fossem um grupo só</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    var fullName = $"{user.FirstName} {user.LastName}";
    var address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}";
    var deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis.";
    return deliveryMessage;
}
```

`deliveryMessage` usa `fullName`, `address`, `order.Id` e `order.DeliveryDays`.
Ela não pertence a `address`, ela costura tudo. Coladas assim, as três linhas
parecem um grupo só e a fase de montagem some.

</details>

<details>
<summary>✅ Bom: os pedaços em um grupo, a montagem e o `return` em outro</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    var fullName = $"{user.FirstName} {user.LastName}";
    var address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}";

    var deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis.";
    return deliveryMessage;
}
```

Agora dá para ver duas fases: preparar os pedaços e montar a mensagem.

</details>

<details>
<summary>✅ Bom: a última linha usa só o valor da linha de cima, então as duas ficam juntas</summary>

```csharp
public string BuildOrderSlug(Order order)
{
    var normalizedTitle = order.Title.ToLowerInvariant().Replace(' ', '-');
    var slug = $"{order.Id}-{normalizedTitle}";
    return slug;
}
```

Aqui `slug` usa só `normalizedTitle`, a linha logo acima. As duas ficam juntas, e
o `return` fica junto delas.

</details>

<a id="short-blocks"></a>

## Dentro de laços e condições curtas

Dentro de um `while` ou de um `if`, a mesma regra vale. Quando as três linhas não
são declarações parecidas, dois mais um continua sendo a quebra natural.

<details>
<summary>❌ Ruim: três linhas diferentes entre si, todas juntas</summary>

```csharp
while (attempt < maxAttempts)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break;
    attempt++;
}
```

</details>

<details>
<summary>✅ Bom: declaração e `if` juntos, incremento em outro grupo</summary>

```csharp
while (attempt < maxAttempts)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break;

    attempt++;
}
```

</details>

<a id="method-phases"></a>

## Deixe cada fase do método visível

Um método que busca, transforma, salva e responde tem quatro fases. Cada uma
merece seu grupo, para que a leitura acompanhe a operação sem reler.

<details>
<summary>❌ Ruim: todas as fases juntas, sem separação visual</summary>

```csharp
public async Task<IActionResult> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
{
    var sanitized = SanitizeCreateUser(request);
    var input = CreateUserValidator.Validate(sanitized);
    await _createUser.ExecuteAsync(input, ct);
    var body = new { id = input.Id };
    return StatusCode(201, body);
}
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```csharp
public async Task<IActionResult> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
{
    var sanitized = SanitizeCreateUser(request);
    var input = CreateUserValidator.Validate(sanitized);

    await _createUser.ExecuteAsync(input, ct);

    var body = new { id = input.Id };
    return StatusCode(201, body);
}
```

</details>

<a id="assert-phase"></a>

## No teste, a verificação é uma fase separada

O `Assert` responde a pergunta que o teste faz. A linha em branco antes dele
separa o que foi montado e executado daquilo que está sendo conferido.

<details>
<summary>❌ Ruim: o Assert junto do preparo, com as fases invisíveis</summary>

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

<details>
<summary>✅ Bom: linha em branco antes do Assert, que vira uma fase própria</summary>

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

<a id="multi-line-block"></a>

## Depois de um bloco de várias linhas, deixe um respiro

Um inicializador de objeto, uma coleção expandida ou um comando quebrado já
ocupam bastante espaço na tela. Deixe uma linha em branco depois deles. Sem esse
respiro, o próximo passo parece fazer parte do bloco, e o leitor precisa contar
chaves para achar onde ele termina.

<details>
<summary>❌ Ruim: o inicializador de várias linhas junto do comando seguinte</summary>

```csharp
public async Task<string> CreateSessionAsync(User user, CancellationToken ct)
{
    var claims = new Claims
    {
        Subject = user.Id,
        Email = user.Email,
        Roles = user.Roles,
        IssuedAt = DateTimeOffset.UtcNow,
    };
    var token = await _jwtSigner.SignAsync(claims, ct);
    return token;
}
```

</details>

<details>
<summary>✅ Bom: a linha em branco depois do inicializador isola o bloco</summary>

```csharp
public async Task<string> CreateSessionAsync(User user, CancellationToken ct)
{
    var claims = new Claims
    {
        Subject = user.Id,
        Email = user.Email,
        Roles = user.Roles,
        IssuedAt = DateTimeOffset.UtcNow,
    };

    var token = await _jwtSigner.SignAsync(claims, ct);
    return token;
}
```

</details>

<a id="consecutive-ifs"></a>

## Dois `if` seguidos com chaves pedem uma linha entre eles

Dois blocos `{ }` juntos viram uma parede de chaves, e achar onde um termina e o
outro começa exige contá-las. Uma linha em branco entre eles resolve.

A exceção são as guardas de uma linha. Elas são curtas e parecidas entre si, e
ficam juntas como qualquer grupo de linhas parecidas.

<details>
<summary>❌ Ruim: dois blocos com chaves juntos, um no outro</summary>

```csharp
public void ProcessOrder(Order order)
{
    if (order.Status == OrderStatus.Pending)
    {
        NotifyCustomer(order);
        ScheduleReview(order);
    }
    if (order.Total > 1_000)
    {
        FlagForAudit(order);
        NotifyManager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom: uma linha em branco entre os dois blocos</summary>

```csharp
public void ProcessOrder(Order order)
{
    if (order.Status == OrderStatus.Pending)
    {
        NotifyCustomer(order);
        ScheduleReview(order);
    }

    if (order.Total > 1_000)
    {
        FlagForAudit(order);
        NotifyManager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom: as três verificações de uma linha ficam juntas</summary>

```csharp
public Input ValidateInput(Input input)
{
    if (input is null) throw new ValidationException("Input required");
    if (string.IsNullOrEmpty(input.Email)) throw new ValidationException("Email required");
    if (string.IsNullOrEmpty(input.Password)) throw new ValidationException("Password required");

    return input;
}
```

</details>

<a id="column-alignment"></a>

## Não alinhe o código em colunas

Use um espaço só antes e depois do `=`. Alinhar os sinais na vertical com espaços
extras parece organizado até alguém renomear uma variável: aí todas as linhas do
bloco precisam ser reajustadas, e o diff mostra mudança em linhas que ninguém
tocou.

<details>
<summary>❌ Ruim: espaços extras para alinhar colunas</summary>

```csharp
var userName     = "alice";
var userEmail    = "alice@example.com";
var userRole     = "admin";
var lastLoginAt  = DateTimeOffset.UtcNow;
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```csharp
var userName = "alice";
var userEmail = "alice@example.com";
var userRole = "admin";
var lastLoginAt = DateTimeOffset.UtcNow;
```

</details>

<a id="long-strings"></a>

## Textos longos montados em uma linha

Um texto longo montado dentro do `return` esconde as partes que o compõem, e
quem for mexer nele precisa achar o pedaço certo no meio da interpolação. Extraia
os pedaços em variáveis com nome e monte o texto no fim.

<details>
<summary>❌ Ruim: o texto inteiro montado dentro do `return`, sem nome para os pedaços</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    return $"Olá {user.FirstName} {user.LastName}, seu pedido #{order.Id} foi confirmado e será entregue no endereço {order.Address.Street}, {order.Address.City} - {order.Address.State} em até {order.DeliveryDays} dias úteis.";
}
```

</details>

<details>
<summary>✅ Bom: pedaços com nome, montagem no fim</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    var fullName = $"{user.FirstName} {user.LastName}";
    var address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}";

    var deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis.";
    return deliveryMessage;
}
```

</details>
