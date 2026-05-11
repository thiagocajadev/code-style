# Visual density: Kotlin

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco. Cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Kotlin 2.2.

## Conceitos fundamentais

| Conceito                                     | O que é                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **visual density** (densidade visual)        | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo                         |
| **semantic group** (grupo semântico)         | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir)            |
| **blank line** (linha em branco)             | Separador entre grupos semânticos; substitui comentário de seção                                            |
| **tight pair** (par tight)                   | Duas linhas com relação direta (declaração + uso, `val` + `return`) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico)               | Três declarações simples consecutivas e homogêneas (`val`); mantidas juntas sem blank; preferir ao 2+1 que cria órfão                    |
| **semantic pair** (par semântico encadeado)  | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta                    |
| **single-line orphan** (órfão de 1)          | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2    |
| **explaining return** (retorno explicativo)  | Caso particular de `tight pair`: `val x = …` single-line + `return x` sem blank entre eles                  |
| **multi-line block** (bloco multi-linha)     | Data class instance, `listOf` expandido, lambda multi-linha ou chain `?.let { ... }.also { ... }`; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta, com blank antes da montagem |
| **boundary** (limite)                        | Linha que separa camadas (handler ↔ service, service ↔ repository); merece linha em branco antes            |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão: frágil a rename, gera diff ruidoso       |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim: denso demais: todos os passos colados</summary>

```kotlin
fun registerUser(input: RegisterUserInput): User {
    val (name, email) = input
    val exists = userRepository.findByEmail(email)
    if (exists != null) throw ConflictError("Email taken")
    val hash = hashPassword(input.password)
    val user = userRepository.create(name, email, hash)
    val token = generateToken(user.id)
    sendWelcomeEmail(email, token)
    return user
}
```

</details>

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

```kotlin
fun registerUser(input: RegisterUserInput): User {
    val (name, email) = input
    val exists = userRepository.findByEmail(email)
    if (exists != null) throw ConflictError("Email taken")

    val hash = hashPassword(input.password)
    val user = userRepository.create(name, email, hash)

    val token = generateToken(user.id)
    sendWelcomeEmail(email, token)

    return user
}
```

</details>

## Explaining Return: par tight

Uma `val` nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for essa `val` (single-line) e o `return` retornar
exatamente essa variável, os dois formam par de 2 linhas sem blank, não importa
quantos passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```kotlin
fun mapErrorToStatus(error: DomainError): Int {
    val status = errorStatusByCode[error.code] ?: 500

    return status
}
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```kotlin
fun mapErrorToStatus(error: DomainError): Int {
    val status = errorStatusByCode[error.code] ?: 500
    return status
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `val` que nomeia o valor retornado**
(Explaining Return), e essa `val` está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (data class instance, `listOf` expandido, lambda
  ou chain quebrados em várias linhas);
- linha acima é **side effect** (chamada `Unit`, log) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é single-line</summary>

```kotlin
fun formatOrderDate(instant: Instant, zone: ZoneId): String {
    val zonedDateTime = instant.atZone(zone)
    val formatter = DateTimeFormatter
        .ofPattern("dd/MM/yyyy HH:mm")
        .withLocale(Locale.forLanguageTag("pt-BR"))
    val formattedDate = formatter.format(zonedDateTime)

    return formattedDate
}
```

`formatter` multi-linha exige blank depois de si, mas o blank foi posto antes do
`return`. `formattedDate` e `return formattedDate` formam Explaining Return
tight: não devem ser separados.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```kotlin
fun formatOrderDate(instant: Instant, zone: ZoneId): String {
    val zonedDateTime = instant.atZone(zone)
    val formatter = DateTimeFormatter
        .ofPattern("dd/MM/yyyy HH:mm")
        .withLocale(Locale.forLanguageTag("pt-BR"))

    val formattedDate = formatter.format(zonedDateTime)
    return formattedDate
}
```

O blank fica **depois** do `formatter` multi-linha. O par `formattedDate` +
`return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando construído a partir de data class multi-linha</summary>

```kotlin
fun buildOrderResponse(order: Order, requestId: String): OrderResponse {
    val data = OrderData(
        id = order.id,
        total = order.total,
        items = order.items,
    )

    return OrderResponse(data = data, requestId = requestId)
}
```

`data` é data class instance multi-linha; o blank antes do `return` isola o
bloco grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único
conteúdo, ou a função usa `=` direto.

```kotlin
fun findPendingOrders(userId: Long): List<Order> {
    return orderRepository.findByStatus(userId, OrderStatus.PENDING)
}

// ou ainda mais idiomático
fun findPendingOrders(userId: Long): List<Order> =
    orderRepository.findByStatus(userId, OrderStatus.PENDING)
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico **quando o
guarda cabe em uma única linha**: `if (...) return`, `if (...) throw ...`.
Nesse caso a linha em branco vem **depois** do par, nunca entre eles. O mesmo
vale para o atalho idiomático `?: return …` ou `?: throw …` colado na linha da
declaração.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas
físicas, mesmo com uma única instrução dentro), o `if` vira fase própria: o
bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede
respiro**: linha em branco **antes** do bloco. O critério é visual, não
semântico.

<details>
<summary>❌ Ruim: variável solta do seu guarda inline</summary>

```kotlin
val order = orderRepository.findById(orderId)

if (order == null) return
val invoice = buildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda inline (uma linha), par tight com a declaração</summary>

```kotlin
val order = orderRepository.findById(orderId)
if (order == null) return

val invoice = buildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda em bloco, fase própria com blank antes</summary>

```kotlin
val handler = eventHandlers[eventType]

if (handler == null) {
    logUnhandledEventType(eventType)
    return
}

val eventPayload = event.data
```

</details>

<details>
<summary>✅ Bom: guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```kotlin
val response = requestFn()

if (response.status != 429) {
    return response
}

val delayMs = (2.0.pow(attempt) * 1000).toLong()
```

O bloco ocupa três linhas físicas, peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`val` homogêneas) formam grupo coeso.
Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três
juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```kotlin
private const val MINIMUM_DRIVING_AGE = 18
private const val ORDER_STATUS_APPROVED = 2

private const val ONE_DAY_MS = 86_400_000L
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```kotlin
private const val MINIMUM_DRIVING_AGE = 18
private const val ORDER_STATUS_APPROVED = 2
private const val ONE_DAY_MS = 86_400_000L
```

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```kotlin
private const val MINIMUM_DRIVING_AGE = 18
private const val ORDER_STATUS_APPROVED = 2

private const val ONE_DAY_MS = 86_400_000L
private const val MAX_RETRY_ATTEMPTS = 3
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

```kotlin
fun buildShippingLabel(order: Order): String {
    val fullName = "${order.customer.firstName} ${order.customer.lastName}"
    val addressLine = "${order.address.street}, ${order.address.number}"

    val cityLine = "${order.address.city} - ${order.address.state}, ${order.address.zipCode}"

    val label = "$fullName\n$addressLine\n$cityLine\nOrder #${order.id}"
    return label
}
```

</details>

<details>
<summary>✅ Bom: par semântico tight</summary>

```kotlin
fun buildShippingLabel(order: Order): String {
    val fullName = "${order.customer.firstName} ${order.customer.lastName}"
    val addressLine = "${order.address.street}, ${order.address.number}"

    val cityLine = "${order.address.city} - ${order.address.state}, ${order.address.zipCode}"
    val label = "$fullName\n$addressLine\n$cityLine\nOrder #${order.id}"
    return label
}
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta, com blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```kotlin
fun buildDeliveryMessage(user: User, order: Order): String {
    val fullName = "${user.firstName} ${user.lastName}"
    val address = "${order.address.street}, ${order.address.city} - ${order.address.state}"
    val deliveryMessage = "Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis."
    return deliveryMessage
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e*
`order.deliveryDays`. Não é par direto com `address`, é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```kotlin
fun buildDeliveryMessage(user: User, order: Order): String {
    val fullName = "${user.firstName} ${user.lastName}"
    val address = "${order.address.street}, ${order.address.city} - ${order.address.state}"

    val deliveryMessage = "Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis."
    return deliveryMessage
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom: contraste: par semântico encadeado (última depende só da penúltima)</summary>

```kotlin
fun buildOrderSlug(order: Order): String {
    val normalizedTitle = order.title.lowercase().replace(Regex("\\s+"), "-")
    val slug = "${order.id}-$normalizedTitle"
    return slug
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
<summary>❌ Ruim: 3 linhas heterogêneas coladas</summary>

```kotlin
while (attempt < maxAttempts) {
    val connection = connectToDatabase()
    if (connection.isReady) break
    attempt++
}
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em par, incremento separado</summary>

```kotlin
while (attempt < maxAttempts) {
    val connection = connectToDatabase()
    if (connection.isReady) break

    attempt++
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim: todas as fases coladas, sem separação visual</summary>

```kotlin
fun createUserHandler(request: CreateUserRequest): ResponseEntity<UserResponse> {
    val sanitized = sanitizeCreateUser(request)
    val input = createUserSchema.parse(sanitized)
    createUser(input)
    val body = UserResponse(id = input.id)
    return ResponseEntity.status(201).body(body)
}
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```kotlin
fun createUserHandler(request: CreateUserRequest): ResponseEntity<UserResponse> {
    val sanitized = sanitizeCreateUser(request)
    val input = createUserSchema.parse(sanitized)

    createUser(input)

    val body = UserResponse(id = input.id)
    return ResponseEntity.status(201).body(body)
}
```

</details>

## Testes: assertion como fase própria

A asserção é fase distinta. A linha em branco antes dela separa o que está sendo
verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: assertion colada ao setup, fases invisíveis</summary>

```kotlin
@Test
fun `applyDiscount returns price reduced by percentage`() {
    val order = Order(price = 100.0, discountPct = 10)
    val actualOrder = applyDiscount(order)
    val expectedPrice = 90.0
    actualOrder.price shouldBe expectedPrice
}
```

</details>

<details>
<summary>✅ Bom: assertion separada como fase própria</summary>

```kotlin
@Test
fun `applyDiscount returns price reduced by percentage`() {
    val order = Order(price = 100.0, discountPct = 10)
    val actualOrder = applyDiscount(order)
    val expectedPrice = 90.0

    actualOrder.price shouldBe expectedPrice
}
```

</details>

## Multi-linha: respiro depois do bloco

Quando uma data class instance, `listOf` expandido, lambda multi-linha ou chain
quebrada ocupa várias linhas, o bloco já tem peso visual próprio. Cole uma
linha em branco **depois** dele para isolar o bloco grande do próximo passo.
Sem respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: data class instance multi-linha colada ao próximo statement</summary>

```kotlin
fun createSession(user: User): SessionToken {
    val claims = Claims(
        sub = user.id,
        email = user.email,
        roles = user.roles,
        issuedAt = Instant.now(),
    )
    val token = signJwt(claims)
    return token
}
```

</details>

<details>
<summary>✅ Bom: blank depois do objeto isola o bloco</summary>

```kotlin
fun createSession(user: User): SessionToken {
    val claims = Claims(
        sub = user.id,
        email = user.email,
        roles = user.roles,
        issuedAt = Instant.now(),
    )

    val token = signJwt(claims)
    return token
}
```

</details>

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) colados formam
muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre
insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo e
ficam tight; a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos {} colados</summary>

```kotlin
fun processOrder(order: Order) {
    if (order.status == OrderStatus.PENDING) {
        notifyCustomer(order)
        scheduleReview(order)
    }
    if (order.total > 1_000) {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```kotlin
fun processOrder(order: Order) {
    if (order.status == OrderStatus.PENDING) {
        notifyCustomer(order)
        scheduleReview(order)
    }

    if (order.total > 1_000) {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

<details>
<summary>✅ Bom: guardas de uma linha ficam tight (trio atômico)</summary>

```kotlin
fun validateInput(input: RegisterInput): RegisterInput {
    if (input.email.isBlank()) throw ValidationError("Email required")
    if (input.password.isBlank()) throw ValidationError("Password required")
    if (input.name.isBlank()) throw ValidationError("Name required")

    return input
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim: espaços extras para alinhar colunas</summary>

```kotlin
val userName     = "alice"
val userEmail    = "alice@example.com"
val userRole     = "admin"
val lastLoginAt  = Instant.now()
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```kotlin
val userName = "alice"
val userEmail = "alice@example.com"
val userRole = "admin"
val lastLoginAt = Instant.now()
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: string imensa inline, sem semântica nas partes</summary>

```kotlin
fun buildDeliveryMessage(user: User, order: Order): String {
    return "Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis."
}
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```kotlin
fun buildDeliveryMessage(user: User, order: Order): String {
    val fullName = "${user.firstName} ${user.lastName}"
    val address = "${order.address.street}, ${order.address.city} - ${order.address.state}"

    val deliveryMessage = "Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis."
    return deliveryMessage
}
```

</details>
