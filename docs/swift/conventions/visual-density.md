# Visual density: Swift

> Escopo: Swift 6.1.

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco. Cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Swift.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, `let` + `return`) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`let`/`var`); mantidas juntas; preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `let X = …` single-line + `return X` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Struct literal, dictionary literal, closure ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; é fase distinta; blank antes da montagem |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão frágil a rename, gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim: denso demais: todos os passos colados</summary>

```swift
func registerUser(input: RegisterInput) async throws -> User {
    let exists = try await userRepository.findByEmail(input.email)
    if exists != nil { throw RegisterError.emailTaken }
    let hash = try await hashPassword(input.password)
    let user = try await userRepository.create(name: input.name, email: input.email, hash: hash)
    let token = generateToken(userId: user.id)
    try await sendWelcomeEmail(to: input.email, token: token)
    return user
}
```

</details>

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

```swift
func registerUser(input: RegisterInput) async throws -> User {
    let exists = try await userRepository.findByEmail(input.email)
    if exists != nil { throw RegisterError.emailTaken }

    let hash = try await hashPassword(input.password)
    let user = try await userRepository.create(name: input.name, email: input.email, hash: hash)

    let token = generateToken(userId: user.id)
    try await sendWelcomeEmail(to: input.email, token: token)

    return user
}
```

</details>

## Explaining Return: par tight

Uma `let` nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for essa `let` (single-line) e o `return` retornar
essa variável, os dois formam par de 2 linhas sem blank, não importa quantos
passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```swift
func mapErrorToStatus(_ error: OrderError) -> Int {
    let status = errorStatusByCode[error.code] ?? 500

    return status
}
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```swift
func mapErrorToStatus(_ error: OrderError) -> Int {
    let status = errorStatusByCode[error.code] ?? 500
    return status
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `let` que nomeia o valor retornado**
(Explaining Return), com essa `let` em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (struct literal, dictionary literal, closure ou
  statement quebrado em várias linhas);
- linha acima é **side effect** (`await`, função sem retorno) que não nomeia o
  valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é single-line</summary>

```swift
func formatOrderDate(_ date: Date, locale: Locale = Locale(identifier: "pt-BR")) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.locale = locale
    formatter.timeZone = TimeZone(identifier: "America/Sao_Paulo")
    let formattedDate = formatter.string(from: date)

    return formattedDate
}
```

`formatter` é configurado em várias linhas e exige blank depois de si, mas o
blank foi posto antes do `return`. `formattedDate` e `return formattedDate`
formam Explaining Return tight: não devem ser separados.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```swift
func formatOrderDate(_ date: Date, locale: Locale = Locale(identifier: "pt-BR")) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.locale = locale
    formatter.timeZone = TimeZone(identifier: "America/Sao_Paulo")

    let formattedDate = formatter.string(from: date)
    return formattedDate
}
```

O blank fica **depois** do bloco de configuração multi-linha. O par
`formattedDate` + `return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando construído a partir de struct multi-linha</summary>

```swift
func buildOrderResponse(order: Order, requestId: UUID) -> OrderResponse {
    let data = OrderData(
        id: order.id,
        total: order.total,
        items: order.items
    )

    return OrderResponse(data: data, requestId: requestId)
}
```

`data` é struct multi-linha; o blank antes do `return` isola o bloco grande do
envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único
conteúdo.

```swift
func findPendingOrders(userId: UUID) async throws -> [Order] {
    return try await orderRepository.findByStatus(userId: userId, status: .pending)
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `guard` (ou `if`) de guarda formam par semântico
**quando o guarda cabe em uma única linha visual**, como `guard ... else { return }`,
`guard ... else { throw ... }`. Nesse caso a linha em branco vem **depois** do
par, nunca entre eles.

Quando o guarda é escrito em **bloco multi-linha** (`else { ... }` em mais de
uma linha física, mesmo com uma única instrução dentro), o `guard` vira fase
própria, já que o bloco ocupa peso visual próprio. Aplica-se a regra de
**multi-linha pede respiro**: linha em branco **antes** do bloco. O critério é
visual, não semântico.

<details>
<summary>❌ Ruim: variável solta do seu guarda inline</summary>

```swift
let order = try await fetchOrder(id: orderId)

guard let order else { return }
let invoice = buildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda inline (uma linha), par tight com a declaração</summary>

```swift
let order = try await fetchOrder(id: orderId)
guard let order else { return }

let invoice = buildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda em bloco, fase própria com blank antes</summary>

```swift
let handler = eventHandlers[eventType]

guard let handler else {
    logUnhandledEventType(eventType)
    return
}

let eventPayload = event.data
```

</details>

<details>
<summary>✅ Bom: guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```swift
let response = try await requestFn()

guard response.status != 429 else {
    return response
}

let delayMs = pow(2.0, Double(attempt)) * 1000
```

O bloco ocupa três linhas físicas, peso visual próprio. Inline ficaria tight,
mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`let`, `var`) formam grupo coeso. Partir
em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só
divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```swift
let minimumDrivingAge = 18
let orderStatusApproved = 2

let oneDayInSeconds: TimeInterval = 86_400
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```swift
let minimumDrivingAge = 18
let orderStatusApproved = 2
let oneDayInSeconds: TimeInterval = 86_400
```

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```swift
let minimumDrivingAge = 18
let orderStatusApproved = 2

let oneDayInSeconds: TimeInterval = 86_400
let maxRetryAttempts = 3
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

```swift
func buildShippingLabel(order: Order) -> String {
    let fullName = "\(order.customer.firstName) \(order.customer.lastName)"
    let addressLine = "\(order.address.street), \(order.address.number)"

    let cityLine = "\(order.address.city) - \(order.address.state), \(order.address.zipCode)"

    let label = "\(fullName)\n\(addressLine)\n\(cityLine)\nOrder #\(order.id)"
    return label
}
```

</details>

<details>
<summary>✅ Bom: par semântico tight</summary>

```swift
func buildShippingLabel(order: Order) -> String {
    let fullName = "\(order.customer.firstName) \(order.customer.lastName)"
    let addressLine = "\(order.address.street), \(order.address.number)"

    let cityLine = "\(order.address.city) - \(order.address.state), \(order.address.zipCode)"
    let label = "\(fullName)\n\(addressLine)\n\(cityLine)\nOrder #\(order.id)"
    return label
}
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta: blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```swift
func buildDeliveryMessage(user: User, order: Order) -> String {
    let fullName = "\(user.firstName) \(user.lastName)"
    let address = "\(order.address.street), \(order.address.city) - \(order.address.state)"
    let deliveryMessage = "Olá \(fullName), seu pedido #\(order.id) foi confirmado e será entregue em \(address) em até \(order.deliveryDays) dias úteis."
    return deliveryMessage
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e*
`order.deliveryDays`. Não é par direto com `address`: é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```swift
func buildDeliveryMessage(user: User, order: Order) -> String {
    let fullName = "\(user.firstName) \(user.lastName)"
    let address = "\(order.address.street), \(order.address.city) - \(order.address.state)"

    let deliveryMessage = "Olá \(fullName), seu pedido #\(order.id) foi confirmado e será entregue em \(address) em até \(order.deliveryDays) dias úteis."
    return deliveryMessage
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom: contraste: par semântico encadeado (última depende só da penúltima)</summary>

```swift
func buildOrderSlug(order: Order) -> String {
    let normalizedTitle = order.title.lowercased().replacingOccurrences(of: " ", with: "-")
    let slug = "\(order.id)-\(normalizedTitle)"
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

```swift
while attempt < maxAttempts {
    let connection = connectToDatabase()
    if connection.isReady { break }
    attempt += 1
}
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em par, incremento separado</summary>

```swift
while attempt < maxAttempts {
    let connection = connectToDatabase()
    if connection.isReady { break }

    attempt += 1
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim: todas as fases coladas, sem separação visual</summary>

```swift
func createUserHandler(_ request: CreateUserRequest) async throws -> CreateUserResponse {
    let sanitized = sanitizeCreateUser(request)
    let input = try CreateUserInput(sanitized)
    try await createUser(input)
    let body = CreateUserResponse(id: input.id)
    return body
}
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```swift
func createUserHandler(_ request: CreateUserRequest) async throws -> CreateUserResponse {
    let sanitized = sanitizeCreateUser(request)
    let input = try CreateUserInput(sanitized)

    try await createUser(input)

    let body = CreateUserResponse(id: input.id)
    return body
}
```

</details>

## Testes: expect como fase própria

O `#expect` (Swift Testing) ou `XCTAssert*` é fase distinta. A linha em branco
antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: expect colado ao setup, fases invisíveis</summary>

```swift
@Test func appliesPercentageDiscountToOrderPrice() {
    let order = Order(price: 100, discountPct: 10)
    let actualOrder = applyDiscount(order)
    let expectedPrice = 90.0
    #expect(actualOrder.price == expectedPrice)
}
```

</details>

<details>
<summary>✅ Bom: expect separado, assertion como fase própria</summary>

```swift
@Test func appliesPercentageDiscountToOrderPrice() {
    let order = Order(price: 100, discountPct: 10)
    let actualOrder = applyDiscount(order)
    let expectedPrice = 90.0

    #expect(actualOrder.price == expectedPrice)
}
```

</details>

## Multi-linha: respiro depois do bloco

Quando um struct literal, dictionary literal, closure ou statement quebra em
várias linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em
branco **depois** dele para isolar o bloco grande do próximo passo. Sem
respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: struct multi-linha colado ao próximo statement</summary>

```swift
func createSession(user: User) async throws -> String {
    let claims = SessionClaims(
        subject: user.id,
        email: user.email,
        roles: user.roles,
        issuedAt: Date.now
    )
    let token = try await signJwt(claims)
    return token
}
```

</details>

<details>
<summary>✅ Bom: blank depois do struct isola o bloco</summary>

```swift
func createSession(user: User) async throws -> String {
    let claims = SessionClaims(
        subject: user.id,
        email: user.email,
        roles: user.roles,
        issuedAt: Date.now
    )

    let token = try await signJwt(claims)
    return token
}
```

</details>

## Ifs/guards consecutivos: blocos com chaves precisam de respiro

Dois `if` ou `guard` consecutivos com **bloco multi-linha** (`{ ... }`) colados
formam muralha: o olho não distingue onde um bloco termina e o outro começa.
Sempre insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo
e ficam tight: a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos {} colados</summary>

```swift
func processOrder(_ order: Order) {
    if order.status == .pending {
        notifyCustomer(order)
        scheduleReview(order)
    }
    if order.total > 1_000 {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```swift
func processOrder(_ order: Order) {
    if order.status == .pending {
        notifyCustomer(order)
        scheduleReview(order)
    }

    if order.total > 1_000 {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

<details>
<summary>✅ Bom: guardas de uma linha ficam tight (trio atômico)</summary>

```swift
func validateInput(_ input: RegisterInput) throws -> RegisterInput {
    guard !input.name.isEmpty else { throw ValidationError.nameRequired }
    guard !input.email.isEmpty else { throw ValidationError.emailRequired }
    guard !input.password.isEmpty else { throw ValidationError.passwordRequired }

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

```swift
let userName     = "alice"
let userEmail    = "alice@example.com"
let userRole     = "admin"
let lastLoginAt  = Date.now
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```swift
let userName = "alice"
let userEmail = "alice@example.com"
let userRole = "admin"
let lastLoginAt = Date.now
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: string imensa inline, sem semântica nas partes</summary>

```swift
func buildDeliveryMessage(user: User, order: Order) -> String {
    return "Olá \(user.firstName) \(user.lastName), seu pedido #\(order.id) foi confirmado e será entregue no endereço \(order.address.street), \(order.address.city) - \(order.address.state) em até \(order.deliveryDays) dias úteis."
}
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```swift
func buildDeliveryMessage(user: User, order: Order) -> String {
    let fullName = "\(user.firstName) \(user.lastName)"
    let address = "\(order.address.street), \(order.address.city) - \(order.address.state)"

    let deliveryMessage = "Olá \(fullName), seu pedido #\(order.id) foi confirmado e será entregue em \(address) em até \(order.deliveryDays) dias úteis."
    return deliveryMessage
}
```

</details>
