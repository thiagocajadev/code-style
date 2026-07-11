# Functions

> Escopo: Swift 6.1.

Swift tem funções de topo (top-level), métodos de struct/class/enum e computed properties.
Todas seguem as mesmas regras: orquestrador visível no topo, detalhes abaixo, retorno explicado
por uma `let`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | uma função orquestra OU implementa, nunca os dois ao mesmo tempo |
| **Explaining Return** (retorno explicado) | Atribuir o resultado a uma `let` nomeada antes de retornar |
| **Stepdown Rule** (regra do stepdown) | Chamador visível antes do detalhe; helpers abaixo do chamador |
| **helper** (função auxiliar) | Função de apoio que implementa um passo do orquestrador; dá nome ao detalhe |
| **argument label** (rótulo de argumento) | Rótulo externo de parâmetro que torna a chamada legível como prosa |
| `@discardableResult` | indica que o valor de retorno pode ser ignorado sem warning |

## God function: múltiplas responsabilidades

<details>
<summary>❌ Ruim: busca, valida, calcula e persiste em uma função só</summary>

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

<details>
<summary>✅ Bom: orquestrador limpo, detalhes em funções dedicadas</summary>

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

<a id="single-level-of-abstraction"></a>

## SLA: orquestrador ou implementação

<details>
<summary>❌ Ruim: função mistura nível de abstração</summary>

```swift
func generateReport(orders: [Order]) -> Report {
    let settledOrders = orders.filter { $0.status == .settled }

    var total = 0.0
    for order in settledOrders {
        total += order.items.reduce(0) { $0 + $1.price * Double($1.quantity) }
    }

    return Report(orderCount: settledOrders.count, revenue: total)
}
```

</details>

<details>
<summary>✅ Bom: cada função em um único nível</summary>

```swift
func generateReport(orders: [Order]) -> Report {
    let settledOrders = filterSettledOrders(orders)
    let revenue = calculateRevenue(settledOrders)

    let report = Report(orderCount: settledOrders.count, revenue: revenue)
    return report
}

private func filterSettledOrders(_ orders: [Order]) -> [Order] {
    orders.filter { $0.status == .settled }
}

private func calculateRevenue(_ orders: [Order]) -> Double {
    orders.flatMap(\.items).reduce(0) { $0 + $1.price * Double($1.quantity) }
}
```

</details>

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

<details>
<summary>❌ Ruim: lógica inline no return</summary>

```swift
func findActiveCustomers(_ customers: [Customer]) -> [Customer] {
    return customers.filter { $0.isActive && $0.hasPendingOrders }
        .sorted { $0.lastName < $1.lastName }
        .prefix(10)
        .map { $0 }
}
```

</details>

<details>
<summary>✅ Bom: explaining return com let nomeada</summary>

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
<summary>❌ Ruim: chamada ambígua sem labels</summary>

```swift
func move(_ source: Index, _ destination: Index) { }

move(2, 5)   // o que é 2 e o que é 5?
```

</details>

<details>
<summary>✅ Bom: labels que leem como prosa</summary>

```swift
func move(from source: Index, to destination: Index) { }

move(from: 2, to: 5)
```

</details>

## `@discardableResult` para comandos opcionais

<details>
<summary>❌ Ruim: warning desnecessário em função de efeito colateral</summary>

```swift
func registerEvent(_ event: AnalyticsEvent) -> Bool {
    return analyticsService.track(event)
}

registerEvent(.pageView("Home"))   // ⚠️ result of call is unused
```

</details>

<details>
<summary>✅ Bom: @discardableResult quando o retorno é opcional para o chamador</summary>

```swift
@discardableResult
func registerEvent(_ event: AnalyticsEvent) -> Bool {
    return analyticsService.track(event)
}

registerEvent(.pageView("Home"))   // sem warning
let tracked = registerEvent(.purchase(orderId))   // retorno usado quando necessário
```

</details>
