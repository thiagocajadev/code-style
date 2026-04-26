# Visual Density

> Escopo: Swift 6.1.

Densidade visual é o sinal de intenção no código. Uma linha em branco separa grupos lógicos.
Zero linhas dentro de um grupo. Nunca duas linhas em branco consecutivas.

## Parede de código

<details>
<summary>❌ Bad — sem separação entre fases</summary>
<br>

```swift
func processPayment(request: PaymentRequest) async throws -> Receipt {
    guard let user = await userRepository.find(id: request.userId) else {
        throw PaymentError.userNotFound(request.userId)
    }
    guard let method = await paymentMethodRepository.find(id: request.methodId) else {
        throw PaymentError.invalidMethod(request.methodId)
    }
    guard !method.isExpired else { throw PaymentError.expiredMethod }
    let charge = try await chargeGateway.charge(method, amount: request.amount)
    let receipt = Receipt(userId: request.userId, amount: request.amount, chargeId: charge.id)
    try await receiptRepository.save(receipt)
    return receipt
}
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas por linha em branco</summary>
<br>

```swift
func processPayment(request: PaymentRequest) async throws -> Receipt {
    guard let user = await userRepository.find(id: request.userId) else {
        throw PaymentError.userNotFound(request.userId)
    }

    guard let method = await paymentMethodRepository.find(id: request.methodId) else {
        throw PaymentError.invalidMethod(request.methodId)
    }

    guard !method.isExpired else { throw PaymentError.expiredMethod }

    let charge = try await chargeGateway.charge(method, amount: request.amount)

    let receipt = Receipt(userId: request.userId, amount: request.amount, chargeId: charge.id)
    try await receiptRepository.save(receipt)

    return receipt
}
```

</details>

## Explaining Return — tight

<details>
<summary>❌ Bad — blank entre let e return</summary>
<br>

```swift
func buildWelcomeMessage(for user: User) -> String {
    let greeting = "Hello, \(user.firstName)! Your account is ready."

    return greeting
}
```

</details>

<br>

<details>
<summary>✅ Good — let + return sem blank (explaining return tight)</summary>
<br>

```swift
func buildWelcomeMessage(for user: User) -> String {
    let greeting = "Hello, \(user.firstName)! Your account is ready."
    return greeting
}
```

</details>

## Chains longas

<details>
<summary>❌ Bad — chain em uma linha só</summary>
<br>

```swift
let result = orders.filter { $0.isPaid }.sorted { $0.createdAt > $1.createdAt }.prefix(5).map { $0.toSummary() }
```

</details>

<br>

<details>
<summary>✅ Good — uma operação por linha</summary>
<br>

```swift
let recentPaidSummaries = orders
    .filter { $0.isPaid }
    .sorted { $0.createdAt > $1.createdAt }
    .prefix(5)
    .map { $0.toSummary() }

let recentPaid = Array(recentPaidSummaries)
return recentPaid
```

</details>

## Construção de structs — sem lógica inline

<details>
<summary>❌ Bad — lógica embutida na inicialização</summary>
<br>

```swift
return Order(
    userId: userId,
    items: items.filter { $0.stock > 0 },
    total: items.filter { $0.stock > 0 }.reduce(0) { $0 + $1.price },
    createdAt: Date()
)
```

</details>

<br>

<details>
<summary>✅ Good — lógica extraída antes da construção</summary>
<br>

```swift
let availableItems = items.filter { $0.stock > 0 }
let total = availableItems.reduce(0) { $0 + $1.price }

let order = Order(
    userId: userId,
    items: availableItems,
    total: total,
    createdAt: Date()
)

return order
```

</details>

## Extensions — separação por responsabilidade

Extensions organizam conformances sem aumentar a densidade do tipo principal.

<details>
<summary>❌ Bad — tudo no corpo da struct</summary>
<br>

```swift
struct Order: Codable, Equatable, CustomStringConvertible {
    let id: UUID
    let total: Double

    static func == (lhs: Order, rhs: Order) -> Bool { lhs.id == rhs.id }

    var description: String { "Order(\(id), \(total))" }

    func encode(to encoder: Encoder) throws { ... }
    init(from decoder: Decoder) throws { ... }
}
```

</details>

<br>

<details>
<summary>✅ Good — uma extension por conformance</summary>
<br>

```swift
struct Order {
    let id: UUID
    let total: Double
}

extension Order: Equatable {
    static func == (lhs: Order, rhs: Order) -> Bool { lhs.id == rhs.id }
}

extension Order: CustomStringConvertible {
    var description: String { "Order(\(id), \(total))" }
}

extension Order: Codable { }
```

</details>
