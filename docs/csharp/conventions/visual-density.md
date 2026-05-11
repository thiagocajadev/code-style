# Visual density: C#

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco — cada grupo conta uma
micro-história.

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em C#/.NET.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, var + return) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`var`, `const`); mantidas juntas sem blank — preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `var X = …` single-line + `return X` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Inicializador de objeto, coleção `new[] { ... }` expandido ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem |
| **boundary** (limite) | Linha que separa camadas (controller ↔ service, service ↔ repository); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a rename, gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>

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
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>

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

Uma `var` nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for essa `var` (single-line) e o `return` retornar
essa variável, os dois formam par de 2 linhas sem blank — não importa quantos
passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);

    return status;
}
```

</details>

<details>
<summary>✅ Bom — par tight</summary>

```csharp
public int MapErrorToStatus(DomainError error)
{
    var status = ErrorStatusByCode.GetValueOrDefault(error.Code, 500);
    return status;
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `var` (ou `Type X = ...`) que nomeia o valor
retornado** (Explaining Return) — e essa declaração está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (inicializador de objeto/coleção ou statement
  quebrado em várias linhas);
- linha acima é **side effect** (`await`, método sem retorno) que não nomeia o
  valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — return fragmentado quando a linha acima é single-line</summary>

```csharp
public string FormatOrderDate(DateTimeOffset date, string locale = "pt-BR")
{
    var culture = new CultureInfo(locale);
    var formattedDate = date.ToString("dd/MM/yyyy", culture);

    return formattedDate;
}
```

`formattedDate` e `return formattedDate` formam Explaining Return tight — não
devem ser separados.

</details>

<details>
<summary>✅ Bom — Explaining Return tight</summary>

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
<summary>✅ Bom — return com blank quando construído a partir de inicializador multi-linha</summary>

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

`data` é inicializador multi-linha; o blank antes do `return` isola o bloco
grande do envelope final.

</details>

**Exceção:** métodos de uma expressão ficam compactos. O `return` é o único
conteúdo.

```csharp
public IEnumerable<Order> GetPendingOrders(Guid userId) =>
    _orderRepository.FindByStatus(userId, OrderStatus.Pending);
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico **quando o
guarda cabe em uma única linha** — `if (...) return ...;`,
`if (...) throw ...;`. Nesse caso a linha em branco vem **depois** do par,
nunca entre eles.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas
físicas, mesmo com uma única instrução dentro), o `if` vira fase própria — o
bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede
respiro**: linha em branco **antes** do bloco. O critério é visual, não
semântico.

<details>
<summary>❌ Ruim — variável solta do seu guarda inline</summary>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);

if (order is null) return NotFound();
var invoice = BuildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```csharp
var order = await _orderRepository.FindByIdAsync(orderId, ct);
if (order is null) return NotFound();

var invoice = BuildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>

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
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```csharp
var response = await requestFn();

if (response.StatusCode != HttpStatusCode.TooManyRequests)
{
    return response;
}

var delayMs = Math.Pow(2, attempt) * 1000;
```

O bloco ocupa quatro linhas físicas — peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`const`, `readonly`, `var` com literal)
formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks.
Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>

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
<summary>✅ Bom — trio tight</summary>

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
<summary>✅ Bom — 4 atomics viram 2+2</summary>

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

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

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
<summary>✅ Bom — par semântico tight</summary>

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

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta — blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim — fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    var fullName = $"{user.FirstName} {user.LastName}";
    var address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}";
    var deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis.";
    return deliveryMessage;
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.Id` *e*
`order.DeliveryDays`. Não é par direto com `address` — é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    var fullName = $"{user.FirstName} {user.LastName}";
    var address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}";

    var deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis.";
    return deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>

```csharp
public string BuildOrderSlug(Order order)
{
    var normalizedTitle = order.Title.ToLowerInvariant().Replace(' ', '-');
    var slug = $"{order.Id}-{normalizedTitle}";
    return slug;
}
```

`slug` depende **diretamente** de `normalizedTitle` (penúltima). Par
semântico encadeado: as duas ficam tight, e o `return` ainda tight com o
último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim — 3 linhas heterogêneas coladas</summary>

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
<summary>✅ Bom — declaração + guarda em par, incremento separado</summary>

```csharp
while (attempt < maxAttempts)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break;

    attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>

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
<summary>✅ Bom — fases explícitas</summary>

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

## Testes: Assert como fase própria

O `Assert` é fase distinta. A linha em branco antes dele separa o que está
sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — Assert colado ao setup, fases invisíveis</summary>

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
<summary>✅ Bom — Assert separado, assertion como fase própria</summary>

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

## Multi-linha: respiro depois do bloco

Quando um inicializador de objeto, coleção `new[] { ... }` expandida ou
statement quebra em várias linhas, o bloco já ocupa espaço visual próprio.
Cole uma linha em branco **depois** dele para isolar o bloco grande do próximo
passo. Sem respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — inicializador multi-linha colado ao próximo statement</summary>

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
<summary>✅ Bom — blank depois do inicializador isola o bloco</summary>

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

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) colados formam
muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre
insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo
e ficam tight — a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos {} colados</summary>

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
<summary>✅ Bom — blank entre os blocos</summary>

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
<summary>✅ Bom — guardas de uma linha ficam tight (trio atômico)</summary>

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

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```csharp
var userName     = "alice";
var userEmail    = "alice@example.com";
var userRole     = "admin";
var lastLoginAt  = DateTimeOffset.UtcNow;
```

</details>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>

```csharp
var userName = "alice";
var userEmail = "alice@example.com";
var userRole = "admin";
var lastLoginAt = DateTimeOffset.UtcNow;
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — interpolação densa inline, sem semântica nas partes</summary>

```csharp
public string BuildDeliveryMessage(User user, Order order)
{
    return $"Olá {user.FirstName} {user.LastName}, seu pedido #{order.Id} foi confirmado e será entregue no endereço {order.Address.Street}, {order.Address.City} - {order.Address.State} em até {order.DeliveryDays} dias úteis.";
}
```

</details>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>

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
