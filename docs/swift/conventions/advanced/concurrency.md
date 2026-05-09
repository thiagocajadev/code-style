# Concurrency

> Escopo: Swift 6.1, Swift concurrency model.

Swift 6 ativa strict concurrency checking por padrão: data races são erros de compilação.
`async`/`await` elimina callbacks. `actor` protege estado compartilhado. `Sendable` certifica
que tipos são seguros para transferência entre tasks.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `async`/`await` | função assíncrona sem bloqueio de thread; sem callbacks |
| `Task` | unidade de trabalho assíncrono com escopo e cancelamento |
| `async let` | inicia task sem esperar; `await` sincroniza quando o valor é necessário |
| `withTaskGroup` | grupo de tasks com resultado agregado; cancela ao falhar |
| `actor` | reference type com serialização automática de acesso ao estado |
| `@MainActor` | garante execução na main thread — UI updates e ViewModels |
| `Sendable` | protocolo que certifica transferência segura entre contextos de concorrência |

## Task solta — sem escopo estruturado

<details>
<summary>❌ Bad — Task não estruturado vaza ciclo de vida</summary>
<br>

```swift
func loadUser(userId: UUID) {
    Task {
        let user = try? await userRepository.find(id: userId)
        updateUI(user)
    }
    // Task vive além do escopo da função chamadora
}
```

</details>

<br>

<details>
<summary>✅ Good — Task vinculado ao ciclo de vida via async context</summary>
<br>

```swift
@MainActor
class UserViewModel: ObservableObject {
    @Published private(set) var user: User?

    func loadUser(userId: UUID) {
        Task {
            user = try? await userRepository.find(id: userId)
        }
    }
}
```

</details>

## `async let` para paralelismo

<details>
<summary>❌ Bad — await sequencial sem paralelismo</summary>
<br>

```swift
func loadDashboard(userId: UUID) async throws -> Dashboard {
    let orders = try await orderRepository.findByUser(userId)       // espera
    let profile = try await profileRepository.find(id: userId)     // espera

    return Dashboard(orders: orders, profile: profile)
}
```

</details>

<br>

<details>
<summary>✅ Good — async let executa em paralelo</summary>
<br>

```swift
func loadDashboard(userId: UUID) async throws -> Dashboard {
    async let orders = orderRepository.findByUser(userId)
    async let profile = profileRepository.find(id: userId)

    let dashboard = Dashboard(
        orders: try await orders,
        profile: try await profile
    )

    return dashboard
}
```

</details>

## Race condition em classe

<details>
<summary>❌ Bad — classe mutável acessada de múltiplas tasks (erro no Swift 6)</summary>
<br>

```swift
class RequestCounter {
    var count = 0

    func increment() { count += 1 }   // data race: múltiplas tasks escrevem ao mesmo tempo
}
```

</details>

<br>

<details>
<summary>✅ Good — actor serializa acesso ao estado</summary>
<br>

```swift
actor RequestCounter {
    private var count = 0

    func increment() { count += 1 }

    func currentCount() -> Int { count }
}

// uso
let counter = RequestCounter()
await counter.increment()
let total = await counter.currentCount()
```

</details>

## `@MainActor` para UI

<details>
<summary>❌ Bad — atualização de UI em background thread</summary>
<br>

```swift
func loadOrders() async {
    let orders = try? await orderRepository.findAll()
    self.orders = orders   // ⚠️ atualização em background thread
    tableView.reloadData()
}
```

</details>

<br>

<details>
<summary>✅ Good — @MainActor garante execução na main thread</summary>
<br>

```swift
@MainActor
func loadOrders() async {
    let orders = try? await orderRepository.findAll()
    self.orders = orders   // seguro: @MainActor
    tableView.reloadData()
}
```

</details>

## `withTaskGroup` para fan-out

<details>
<summary>❌ Bad — loop de tasks sem controle de falhas</summary>
<br>

```swift
func sendNotifications(to users: [User]) async {
    for user in users {
        Task { await notificationService.send(to: user.email) }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — withTaskGroup com tratamento de falhas por filho</summary>
<br>

```swift
func sendNotifications(to users: [User]) async {
    await withTaskGroup(of: Void.self) { group in
        for user in users {
            group.addTask {
                do {
                    try await notificationService.send(to: user.email)
                } catch {
                    logger.warning("Notification failed for \(user.email): \(error)")
                }
            }
        }
    }
}
```

</details>

## Cancelamento cooperativo

<details>
<summary>❌ Bad — loop longo ignora cancelamento</summary>
<br>

```swift
func processItems(_ items: [Item]) async throws {
    for item in items {
        try await process(item)   // continua mesmo após cancelamento
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — verificação explícita de cancelamento</summary>
<br>

```swift
func processItems(_ items: [Item]) async throws {
    for item in items {
        try Task.checkCancellation()
        try await process(item)
    }
}
```

</details>
