# Visual Density: VB.NET

**Visual density** (densidade visual) é a quantidade de informação por bloco visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra quando trechos não relacionados ficam colados. A solução é agrupar por intenção semântica e separar grupos com linha em branco: cada grupo conta uma micro-história.

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em VB.NET/.NET Framework 4.8.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, `Dim` + `Return`) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`Dim`/`Const`); mantidas juntas sem blank; preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `Dim X = …` single-line + `Return X` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Object initializer expandido, lambda multi-linha ou statement com `_` continuation; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta, com blank antes da montagem |
| **boundary** (limite) | Linha que separa camadas (controller ↔ service, service ↔ repository); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão, frágil a rename, gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim: denso demais: todos os passos colados</summary>

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

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

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

Uma `Dim` nomeada acima do `Return` explica o valor retornado. Sempre que a linha imediatamente acima for essa `Dim` (single-line) e o `Return` retornar essa variável, os dois formam par de 2 linhas sem blank, não importa quantos passos haja acima. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)

    Return status
End Function
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)
    Return status
End Function
```

</details>

## Return tight vs return separado

A regra é simples: `Return` é **tight** com a linha imediatamente acima **somente quando essa linha é a `Dim` que nomeia o valor retornado** (Explaining Return), e essa `Dim` está em uma única linha.

Em todos os outros casos, vai blank antes do `Return`:

- linha acima é **multi-linha** (object initializer expandido, statement com `_` continuation);
- linha acima é **side effect** (`Await`, `Sub`/função sem retorno) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é single-line</summary>

```vbnet
Public Function FormatOrderDate(isoString As String, Optional locale As String = "pt-BR") As String
    Dim parsedDate = DateTimeOffset.Parse(isoString)
    Dim culture = New CultureInfo(locale) With {
        .DateTimeFormat = New DateTimeFormatInfo() With {
            .ShortDatePattern = "dd/MM/yyyy"
        }
    }
    Dim formattedDate = parsedDate.ToString("d", culture)

    Return formattedDate
End Function
```

O object initializer multi-linha exige blank depois de si, mas o blank foi posto antes do `Return`. `formattedDate` e `Return formattedDate` formam Explaining Return tight: não devem ser separados.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```vbnet
Public Function FormatOrderDate(isoString As String, Optional locale As String = "pt-BR") As String
    Dim parsedDate = DateTimeOffset.Parse(isoString)
    Dim culture = New CultureInfo(locale) With {
        .DateTimeFormat = New DateTimeFormatInfo() With {
            .ShortDatePattern = "dd/MM/yyyy"
        }
    }

    Dim formattedDate = parsedDate.ToString("d", culture)
    Return formattedDate
End Function
```

O blank fica **depois** do object initializer multi-linha. O par `formattedDate` + `Return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando construído a partir de objeto multi-linha</summary>

```vbnet
Public Function BuildOrderResponse(order As Order, requestId As String) As OrderResponse
    Dim data = New OrderData() With {
        .Id = order.Id,
        .Total = order.Total,
        .Items = order.Items
    }

    Return New OrderResponse(data, requestId)
End Function
```

`data` é object initializer multi-linha; o blank antes do `Return` isola o bloco grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `Return` é o único conteúdo.

```vbnet
Public Function FindPendingOrders(userId As Guid) As IEnumerable(Of Order)
    Return _orderRepository.FindByStatus(userId, OrderStatus.Pending)
End Function
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `If` de guarda formam par semântico **quando o guarda cabe em uma única linha**: `If x Is Nothing Then Return`, `If ... Then Throw New ...`. Nesse caso a linha em branco vem **depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco multi-linha** (`If ... Then` em uma linha, corpo, `End If` em outra), o `If` vira fase própria: o bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede respiro**: linha em branco **antes** do bloco. O critério é visual, não semântico.

<details>
<summary>❌ Ruim: variável solta do seu guarda inline</summary>

```vbnet
Dim order = Await _orderRepository.FindByIdAsync(orderId)

If order Is Nothing Then Return NotFound()
Dim invoice = BuildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda inline (uma linha), par tight com a declaração</summary>

```vbnet
Dim order = Await _orderRepository.FindByIdAsync(orderId)
If order Is Nothing Then Return NotFound()

Dim invoice = BuildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda em bloco, fase própria com blank antes</summary>

```vbnet
Dim handler = _eventHandlers(eventType)

If handler Is Nothing Then
    LogUnhandledEventType(eventType)
    Return
End If

Dim eventPayload = [event].Data
```

</details>

<details>
<summary>✅ Bom: guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```vbnet
Dim response = Await requestFn()

If response.Status <> 429 Then
    Return response
End If

Dim delayMs = CInt(Math.Pow(2, attempt) * 1000)
```

O bloco ocupa três linhas físicas, com peso visual próprio. Inline ficaria tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`Const`, `ReadOnly`, `Dim` com literal) formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```vbnet
Public Class DomainLimits
    Public Const MinimumDrivingAge As Integer = 18
    Public Const OrderStatusApproved As Integer = 2

    Public Const OneDayMs As Long = 86_400_000
End Class
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```vbnet
Public Class DomainLimits
    Public Const MinimumDrivingAge As Integer = 18
    Public Const OrderStatusApproved As Integer = 2
    Public Const OneDayMs As Long = 86_400_000
End Class
```

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```vbnet
Public Class DomainLimits
    Public Const MinimumDrivingAge As Integer = 18
    Public Const OrderStatusApproved As Integer = 2

    Public Const OneDayMs As Long = 86_400_000
    Public Const MaxRetryAttempts As Integer = 3
End Class
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

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

<details>
<summary>✅ Bom: par semântico tight</summary>

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

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que **consome múltiplos fragmentos** (não depende só do último), trate a montagem como fase distinta, com blank antes dela. É o caso clássico "preparar partes → montar resultado", diferente do par semântico encadeado (onde a última depende **diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```vbnet
Public Function BuildDeliveryMessage(user As User, order As Order) As String
    Dim fullName = $"{user.FirstName} {user.LastName}"
    Dim address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}"
    Dim deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis."
    Return deliveryMessage
End Function
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.Id` *e* `order.DeliveryDays`. Não é par direto com `address`: é a fase de montagem. Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```vbnet
Public Function BuildDeliveryMessage(user As User, order As Order) As String
    Dim fullName = $"{user.FirstName} {user.LastName}"
    Dim address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}"

    Dim deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis."
    Return deliveryMessage
End Function
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar" (Explaining Return tight).

</details>

<details>
<summary>✅ Bom: contraste: par semântico encadeado (última depende só da penúltima)</summary>

```vbnet
Public Function BuildOrderSlug(order As Order) As String
    Dim normalizedTitle = order.Title.ToLowerInvariant().Replace(" ", "-")
    Dim slug = $"{order.Id}-{normalizedTitle}"
    Return slug
End Function
```

`slug` depende **diretamente** de `normalizedTitle` (penúltima). Par semântico encadeado: as duas ficam tight, e o `Return` ainda tight com o último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não são todas atômicas homogêneas.

<details>
<summary>❌ Ruim: 3 linhas heterogêneas coladas</summary>

```vbnet
While attempt < maxAttempts
    Dim connection = ConnectToDatabase()
    If connection.IsReady Then Exit While
    attempt += 1
End While
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em par, incremento separado</summary>

```vbnet
While attempt < maxAttempts
    Dim connection = ConnectToDatabase()
    If connection.IsReady Then Exit While

    attempt += 1
End While
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível.

<details>
<summary>❌ Ruim: todas as fases coladas, sem separação visual</summary>

```vbnet
Public Async Function CreateUserHandlerAsync(request As CreateUserRequest) As Task(Of IHttpActionResult)
    Dim sanitized = SanitizeCreateUser(request)
    Dim input = CreateUserSchema.Parse(sanitized)
    Await CreateUserAsync(input)
    Dim body = New With {.Id = input.Id}
    Return Content(HttpStatusCode.Created, body)
End Function
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```vbnet
Public Async Function CreateUserHandlerAsync(request As CreateUserRequest) As Task(Of IHttpActionResult)
    Dim sanitized = SanitizeCreateUser(request)
    Dim input = CreateUserSchema.Parse(sanitized)

    Await CreateUserAsync(input)

    Dim body = New With {.Id = input.Id}
    Return Content(HttpStatusCode.Created, body)
End Function
```

</details>

## Testes: Assert como fase própria

O `Assert` é fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: Assert colado ao setup, fases invisíveis</summary>

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

<details>
<summary>✅ Bom: Assert separado, assertion como fase própria</summary>

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

## Multi-linha: respiro depois do bloco

Quando um object initializer expande em várias linhas ou um statement quebra com `_` continuation, o bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: object initializer multi-linha colado ao próximo statement</summary>

```vbnet
Public Async Function CreateSessionAsync(user As User) As Task(Of String)
    Dim claims = New SessionClaims() With {
        .Sub = user.Id,
        .Email = user.Email,
        .Roles = user.Roles,
        .IssuedAt = DateTimeOffset.UtcNow
    }
    Dim token = Await SignJwtAsync(claims)
    Return token
End Function
```

</details>

<details>
<summary>✅ Bom: blank depois do objeto isola o bloco</summary>

```vbnet
Public Async Function CreateSessionAsync(user As User) As Task(Of String)
    Dim claims = New SessionClaims() With {
        .Sub = user.Id,
        .Email = user.Email,
        .Roles = user.Roles,
        .IssuedAt = DateTimeOffset.UtcNow
    }

    Dim token = Await SignJwtAsync(claims)
    Return token
End Function
```

</details>

## Ifs consecutivos: blocos multi-linha precisam de respiro

Dois `If` consecutivos com **bloco multi-linha** (`If ... Then` / `End If`) colados formam muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo e ficam tight: a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos If colados</summary>

```vbnet
Public Sub ProcessOrder(order As Order)
    If order.Status = OrderStatus.Pending Then
        NotifyCustomer(order)
        ScheduleReview(order)
    End If
    If order.Total > 1000 Then
        FlagForAudit(order)
        NotifyManager(order)
    End If
End Sub
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```vbnet
Public Sub ProcessOrder(order As Order)
    If order.Status = OrderStatus.Pending Then
        NotifyCustomer(order)
        ScheduleReview(order)
    End If

    If order.Total > 1000 Then
        FlagForAudit(order)
        NotifyManager(order)
    End If
End Sub
```

</details>

<details>
<summary>✅ Bom: guardas de uma linha ficam tight (trio atômico)</summary>

```vbnet
Public Function ValidateInput(input As CreateUserInput) As CreateUserInput
    If input Is Nothing Then Throw New ValidationException("Input required")
    If String.IsNullOrEmpty(input.Email) Then Throw New ValidationException("Email required")
    If String.IsNullOrEmpty(input.Password) Then Throw New ValidationException("Password required")

    Return input
End Function
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre **um espaço único**. Alinhamento artificial quebra com qualquer rename, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim: espaços extras para alinhar colunas</summary>

```vbnet
Dim userName     = "alice"
Dim userEmail    = "alice@example.com"
Dim userRole     = "admin"
Dim lastLoginAt  = DateTime.UtcNow
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```vbnet
Dim userName = "alice"
Dim userEmail = "alice@example.com"
Dim userRole = "admin"
Dim lastLoginAt = DateTime.UtcNow
```

</details>

## Strings longas

Uma string longa colada em um `Return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: concatenação densa inline, sem semântica nas partes</summary>

```vbnet
Public Function BuildDeliveryMessage(user As User, order As Order) As String
    Return $"Olá {user.FirstName} {user.LastName}, seu pedido #{order.Id} foi confirmado e será entregue no endereço {order.Address.Street}, {order.Address.City} - {order.Address.State} em até {order.DeliveryDays} dias úteis."
End Function
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```vbnet
Public Function BuildDeliveryMessage(user As User, order As Order) As String
    Dim fullName = $"{user.FirstName} {user.LastName}"
    Dim address = $"{order.Address.Street}, {order.Address.City} - {order.Address.State}"

    Dim deliveryMessage = $"Olá {fullName}, seu pedido #{order.Id} foi confirmado e será entregue em {address} em até {order.DeliveryDays} dias úteis."
    Return deliveryMessage
End Function
```

</details>
