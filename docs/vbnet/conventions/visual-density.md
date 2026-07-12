# Densidade visual em VB.NET

Densidade visual é a quantidade de informação que você empilha em cada bloco de código. Quando muitas linhas se acumulam sem espaço, o olho cansa e você perde o fio do raciocínio. Quando linhas sem relação ficam grudadas, o leitor não sabe onde uma ideia termina e a outra começa. A saída é direta: junte as linhas que contam a mesma pequena história e separe cada história da próxima com uma linha em branco. Este guia mostra como aplicar isso em VB.NET e .NET Framework 4.8, sempre com um exemplo ruim e um bom lado a lado.

Os princípios gerais estão em [densidade visual](../../shared/standards/visual-density.md). Aqui eles aparecem adaptados a VB.NET.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo |
| **semantic group** (grupo semântico) | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou salvar |
| **blank line** (linha em branco) | Separa dois grupos; faz o papel que antes cabia a um comentário de seção |
| **boundary** (limite) | Linha que separa camadas, por exemplo do controller para o service; pede uma linha em branco antes |
| **multi-line block** (bloco de várias linhas) | Object initializer ou comando quebrado com `_` de continuação; pede um respiro depois de si |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação |

## A regra central

A regra que resolve quase tudo: **agrupe poucas linhas por vez e separe cada grupo com uma linha em branco.** O tamanho natural de um grupo é duas linhas. Três valem quando dividir em duas mais uma deixaria a última linha sozinha. A partir de quatro, quebre em dois grupos de duas.

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

## O `Return` fica junto da linha que nomeia o valor

Quando a linha logo acima do `Return` é o `Dim` que dá nome ao valor devolvido, as duas formam uma dupla e ficam juntas, sem linha em branco entre elas. Não importa quantos passos venham antes. A linha em branco separa essa dupla do que veio antes; ela nunca entra no meio da dupla.

<details>
<summary>❌ Ruim: a linha em branco parte a dupla no meio</summary>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)

    Return status
End Function
```

</details>

<details>
<summary>✅ Bom: o `Dim` e o `Return` juntos</summary>

```vbnet
Public Function MapErrorToStatus(error As DomainError) As Integer
    Dim status = If(ErrorStatusByCode.ContainsKey(error.Code), ErrorStatusByCode(error.Code), 500)
    Return status
End Function
```

</details>

<a id="return-separated"></a>

## Quando o `Return` cola na linha acima e quando ganha um respiro

O `Return` só cola na linha imediatamente acima quando essa linha é o `Dim`, de uma única linha, que nomeia o valor devolvido. Em todos os outros casos, deixe uma linha em branco antes do `Return`:

- a linha acima ocupa várias linhas (um object initializer expandido, um comando quebrado com `_` de continuação);
- a linha acima só produz um efeito (um `Await`, um `Sub` que não devolve valor) e não dá nome ao resultado;
- o valor devolvido foi criado vários passos antes, sem formar dupla com a linha de cima.

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

O `culture` ocupa várias linhas e pede um respiro depois de si, mas aqui a linha em branco foi parar antes do `Return`. `formattedDate` e `Return formattedDate` são a dupla que nomeia e devolve o valor: não devem ser separados.

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

A linha em branco fica **depois** do `culture`, que ocupa várias linhas. A dupla `formattedDate` + `Return formattedDate` continua junta.

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

`data` é um object initializer de várias linhas; a linha em branco antes do `Return` separa esse bloco grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `Return` é o único conteúdo.

```vbnet
Public Function FindPendingOrders(userId As Guid) As IEnumerable(Of Order)
    Return _orderRepository.FindByStatus(userId, OrderStatus.Pending)
End Function
```

## A variável e o `If` que a valida ficam juntos

Uma variável e o `If` que a valida logo abaixo formam uma dupla **quando o `If` cabe em uma linha só** (`If x Is Nothing Then Return`, `If ... Then Throw New ...`). Nesse caso, a linha em branco vem **depois** da dupla, nunca entre a variável e o seu `If`.

Quando o `If` é escrito em bloco (`If ... Then` em uma linha, corpo, `End If` em outra), ele vira uma fase à parte: o bloco já tem peso visual próprio. Aí vale a regra de que todo bloco de várias linhas pede um respiro antes de si. Quem decide é o peso visual do bloco na tela.

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

O bloco ocupa três linhas e tem peso visual próprio. Em uma linha só, ficaria junto da variável; em bloco, pede uma linha em branco antes.

</details>

## Não deixe uma linha sozinha entre espaços

Três declarações simples seguidas (`Const`, `ReadOnly`, `Dim` com literal) formam um grupo coeso. Se você quebrar em duas mais uma, a última fica sozinha entre duas linhas em branco, parecendo esquecida. Mantenha as três juntas. Só divida quando forem quatro, aí em dois pares.

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

## Duas linhas onde a segunda usa o valor da primeira

Quando a última linha **usa o valor recém-criado** na linha de cima, as duas formam uma dupla. O respiro natural fica antes da dupla, nunca entre uma linha e o valor de que ela depende.

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

## Prepare as partes, depois monte o resultado

Quando você prepara **dois ou mais pedaços** e depois tem uma linha que **junta vários deles** (não só o último), trate essa montagem como uma fase à parte, com uma linha em branco antes. É o padrão "preparar as partes, depois montar o resultado". Ele é diferente do caso anterior, em que a última linha depende **só** da linha logo acima e por isso fica junto dela.

Como decidir rápido:

- A última linha usa **só o valor recém-criado** acima? É uma dupla dependente: fica junto.
- A última linha **costura vários pedaços** declarados em linhas diferentes? É a fase de montagem: linha em branco antes.

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

`deliveryMessage` usa `fullName`, `address`, `order.Id` e `order.DeliveryDays` ao mesmo tempo. Não forma dupla com `address`: é a fase de montagem. Grudada como se as três linhas fossem iguais, as fases somem.

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

Duas fases ficam visíveis: preparar os pedaços, depois montar e devolver.

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

`slug` depende **só** de `normalizedTitle`, a linha logo acima. As duas ficam juntas, e o `Return` continua junto de `slug`.

</details>

## Dentro de laços e condições curtas

Em laços (`While`, `For`) e condições curtas, duas linhas mais uma continua sendo a divisão natural quando as linhas não são todas do mesmo tipo.

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

## Deixe cada fase do método visível

Métodos com vários passos (buscar, transformar, salvar, responder) devem deixar cada passo visível. Uma linha em branco entre eles marca onde um termina e o outro começa, ainda mais quando os passos cruzam um limite entre camadas, por exemplo do controller para o service.

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

## No teste, a verificação é uma fase separada

No teste, a linha que verifica o resultado (`Assert`) é uma fase própria. A linha em branco antes dela separa **o que** está sendo verificado de **como** você preparou o cenário.

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

## Depois de um bloco de várias linhas, deixe um respiro

Quando um object initializer ou um comando quebra em várias linhas, esse bloco já ocupa um espaço visual próprio. Deixe uma linha em branco **depois** dele para separá-lo do próximo passo. Sem esse respiro, o leitor não vê onde o bloco termina e o próximo começa.

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

## Dois `If` seguidos em bloco pedem uma linha entre eles

Dois `If` seguidos, cada um com um bloco de várias linhas até o `End If`, formam uma parede: o olho não distingue onde um bloco termina e o outro começa. Sempre coloque uma linha em branco entre eles.

**Exceção:** os `If` de saída rápida, com uma linha só (`If input Is Nothing Then Throw ...`), são do mesmo tipo e ficam juntos, como qualquer grupo de linhas iguais.

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

## Não alinhe o código em colunas

Não use espaços extras para alinhar `=`, `:` ou valores na vertical. Use sempre um espaço só. O alinhamento artificial quebra assim que você renomeia qualquer coisa, gera um diff cheio de ruído (mudanças que não importam) e treina o olho a procurar colunas que somem na primeira refatoração.

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

## Textos longos montados em uma linha

Um texto longo grudado dentro de um `Return` esconde os pedaços que o compõem. Separe cada pedaço em uma variável com nome antes de montar o resultado. Em VB.NET esse texto costuma ser uma **interpolated string** (o texto que começa com `$"` e aceita valores no meio com `{...}`).

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
