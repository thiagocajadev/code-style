# Validation

> Escopo: Swift 6.1.

Validação acontece na fronteira — entrada do usuário, payload de API, parâmetros de use case.
Dentro do domínio, `precondition` e `assert` garantem invariantes. Nunca validar no meio da
lógica de negócio: dados chegam válidos ou o fluxo para antes de começar.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `precondition` | falha rápida em qualquer build se a condição for falsa |
| `assert` | falha em debug apenas — removido em release; para invariantes de desenvolvimento |
| **fronteira de validação** | ponto onde dados externos entram no sistema |
| **domain invariant** | regra que deve ser verdadeira em qualquer estado válido do objeto |
| `init` com `throws` | construtor que valida e lança erro antes de criar o objeto |

## Validação no meio da lógica

<details>
<summary>❌ Bad — guard espalhado pela função de negócio</summary>
<br>

```swift
func processOrder(userId: UUID, items: [Item], discount: Double) throws -> Order {
    let user = try await userRepository.find(id: userId)

    guard !items.isEmpty else { throw OrderError.emptyCart }

    let total = items.reduce(0) { $0 + $1.price }

    guard discount >= 0, discount <= 1 else { throw OrderError.invalidDiscount(discount) }

    let finalTotal = total * (1 - discount)

    return Order(userId: userId, items: items, total: finalTotal)
}
```

</details>

<br>

<details>
<summary>✅ Good — init valida; função recebe objeto já válido</summary>
<br>

```swift
struct OrderRequest {
    let userId: UUID
    let items: [Item]
    let discount: Double

    init(userId: UUID, items: [Item], discount: Double) throws {
        guard !items.isEmpty else { throw OrderError.emptyCart }
        guard (0.0...1.0).contains(discount) else { throw OrderError.invalidDiscount(discount) }

        self.userId = userId
        self.items = items
        self.discount = discount
    }
}

func processOrder(_ request: OrderRequest) async throws -> Order {
    let total = request.items.reduce(0) { $0 + $1.price }
    let finalTotal = total * (1 - request.discount)

    let order = Order(userId: request.userId, items: request.items, total: finalTotal)
    return order
}
```

</details>

## Acumulação de erros de formulário

<details>
<summary>❌ Bad — para no primeiro erro</summary>
<br>

```swift
func validateProfile(_ profile: UserProfile) throws {
    guard !profile.name.isEmpty else { throw ProfileError.emptyName }
    guard profile.email.contains("@") else { throw ProfileError.invalidEmail }
    guard profile.age >= 18 else { throw ProfileError.underage }
}
```

</details>

<br>

<details>
<summary>✅ Good — acumula todos os erros</summary>
<br>

```swift
enum ProfileValidationError: Error {
    case emptyName
    case invalidEmail
    case underage
}

struct ValidationErrors: Error {
    let errors: [ProfileValidationError]
}

func validateProfile(_ profile: UserProfile) throws {
    var errors: [ProfileValidationError] = []

    if profile.name.isEmpty { errors.append(.emptyName) }
    if !profile.email.contains("@") { errors.append(.invalidEmail) }
    if profile.age < 18 { errors.append(.underage) }

    guard errors.isEmpty else { throw ValidationErrors(errors: errors) }
}
```

</details>

## `precondition` para invariantes de domínio

<details>
<summary>❌ Bad — guard/return silencia um invariante</summary>
<br>

```swift
func applyDiscount(_ amount: Double, rate: Double) -> Double {
    guard rate >= 0 else { return amount }   // invariante ignorado silenciosamente
    return amount * (1 - rate)
}
```

</details>

<br>

<details>
<summary>✅ Good — precondition falha com mensagem clara</summary>
<br>

```swift
func applyDiscount(_ amount: Double, rate: Double) -> Double {
    precondition((0.0...1.0).contains(rate), "Discount rate must be in 0-1 range, got \(rate)")
    precondition(amount >= 0, "Amount must be non-negative, got \(amount)")

    let discountedAmount = amount * (1 - rate)
    return discountedAmount
}
```

</details>
