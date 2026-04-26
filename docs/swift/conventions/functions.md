# Functions

> Escopo: Swift 6.1.

Swift tem funções de topo (top-level), métodos de struct/class/enum e computed properties.
Todas seguem as mesmas regras: orquestrador visível no topo, detalhes abaixo, retorno explicado
por uma `let`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLA** (Single Level of Abstraction) | uma função orquestra OU implementa, nunca os dois ao mesmo tempo |
| **Explaining Return** | atribuir o resultado a uma `let` nomeada antes de retornar |
| **Stepdown Rule** | chamador visível antes do detalhe; helpers abaixo do chamador |
| **label de argumento** | rótulo externo de parâmetro que torna a chamada legível como prosa |
| `@discardableResult` | indica que o valor de retorno pode ser ignorado sem warning |

## God function — múltiplas responsabilidades

<details>
<summary>❌ Bad — busca, valida, calcula e persiste em uma função só</summary>
<br>

```swift
func submitOrder(userId: UUID, items: [Item]) async throws -> Order {
    guard let user = await userRepository.find(id: userId) else {
        throw OrderError.userNotFound(userId)
    }

    guard !items.isEmpty else { throw OrderError.emptyCart }

    var total = 0.0
    for item in items {
        guard item.stock > 0 else { throw OrderError.outOfStock(item.id) }
        total += item.price * Double(item.quantity)
    }

    guard user.creditLimit >= total else { throw OrderError.insufficientCredit }

    let order = Order(userId: userId, items: items, total: total)
    try await orderRepository.save(order)
    await notificationService.send(to: user.email, message: "Order confirmed")

    return order
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador limpo, detalhes em funções dedicadas</summary>
<br>

```swift
func submitOrder(userId: UUID, items: [Item]) async throws -> Order {
    let user = try await findActiveUser(id: userId)

    try validateCart(items)
    try await validateCredit(for: user, items: items)

    let order = buildOrder(userId: userId, items: items)

    try await persistOrder(order)
    await notifyConfirmation(to: user.email)

    return order
}

private func findActiveUser(id: UUID) async throws -> User { ... }
private func validateCart(_ items: [Item]) throws { ... }
private func validateCredit(for user: User, items: [Item]) async throws { ... }
private func buildOrder(userId: UUID, items: [Item]) -> Order { ... }
private func persistOrder(_ order: Order) async throws { ... }
private func notifyConfirmation(to email: String) async { ... }
```

</details>

## SLA — orquestrador ou implementação

<details>
<summary>❌ Bad — função mistura nível de abstração</summary>
<br>

```swift
func generateReport(orders: [Order]) -> Report {
    let paidOrders = orders.filter { $0.status == .paid }

    var total = 0.0
    for order in paidOrders {
        total += order.items.reduce(0) { $0 + $1.price * Double($1.quantity) }
    }

    return Report(orderCount: paidOrders.count, revenue: total)
}
```

</details>

<br>

<details>
<summary>✅ Good — cada função em um único nível</summary>
<br>

```swift
func generateReport(orders: [Order]) -> Report {
    let paidOrders = filterPaidOrders(orders)
    let revenue = calculateRevenue(paidOrders)

    let report = Report(orderCount: paidOrders.count, revenue: revenue)
    return report
}

private func filterPaidOrders(_ orders: [Order]) -> [Order] {
    orders.filter { $0.status == .paid }
}

private func calculateRevenue(_ orders: [Order]) -> Double {
    orders.flatMap(\.items).reduce(0) { $0 + $1.price * Double($1.quantity) }
}
```

</details>

## Sem lógica no retorno

<details>
<summary>❌ Bad — lógica inline no return</summary>
<br>

```swift
func findActiveCustomers(_ customers: [Customer]) -> [Customer] {
    return customers.filter { $0.isActive && $0.hasPendingOrders }
        .sorted { $0.lastName < $1.lastName }
        .prefix(10)
        .map { $0 }
}
```

</details>

<br>

<details>
<summary>✅ Good — explaining return com let nomeada</summary>
<br>

```swift
func findActiveCustomers(_ customers: [Customer]) -> [Customer] {
    let topActiveCustomers = customers
        .filter { $0.isActive && $0.hasPendingOrders }
        .sorted { $0.lastName < $1.lastName }
        .prefix(10)
        .map { $0 }

    return topActiveCustomers
}
```

</details>

## Labels de argumento

<details>
<summary>❌ Bad — chamada ambígua sem labels</summary>
<br>

```swift
func move(_ source: Index, _ destination: Index) { }

move(2, 5)   // o que é 2 e o que é 5?
```

</details>

<br>

<details>
<summary>✅ Good — labels que leem como prosa</summary>
<br>

```swift
func move(from source: Index, to destination: Index) { }

move(from: 2, to: 5)
```

</details>

## `@discardableResult` para comandos opcionais

<details>
<summary>❌ Bad — warning desnecessário em função de efeito colateral</summary>
<br>

```swift
func registerEvent(_ event: AnalyticsEvent) -> Bool {
    return analyticsService.track(event)
}

registerEvent(.pageView("Home"))   // ⚠️ result of call is unused
```

</details>

<br>

<details>
<summary>✅ Good — @discardableResult quando o retorno é opcional para o chamador</summary>
<br>

```swift
@discardableResult
func registerEvent(_ event: AnalyticsEvent) -> Bool {
    return analyticsService.track(event)
}

registerEvent(.pageView("Home"))   // sem warning
let tracked = registerEvent(.purchase(orderId))   // retorno usado quando necessário
```

</details>
