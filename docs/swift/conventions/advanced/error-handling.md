# Error Handling

> Escopo: Swift 6.1.

Swift tem dois mecanismos de erro: `throws`/`do-catch` para erros síncronos e `Result<T, E>`
para erros como valores. Erros esperados de domínio usam enums com conformance a `Error`.
Exceções irrecuperáveis usam `preconditionFailure` ou `fatalError`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `throws` | marca função que pode lançar erro; chamador usa `try` |
| `Result<Success, Failure>` | tipo que representa sucesso ou falha sem lançar exceção |
| `do-catch` | captura erros lançados; `catch` com pattern matching por tipo |
| `LocalizedError` | protocolo que adiciona mensagem legível ao erro |
| `try?` | converte throws em opcional: sucesso = valor, erro = `nil` |
| `try!` | força sucesso — lança fatalError se falhar; proibido em produção |

## Enum de erros de domínio

<details>
<summary>❌ Bad — String como erro (sem exaustividade)</summary>
<br>

```swift
func findOrder(id: UUID) throws -> Order {
    guard let order = repository.find(id: id) else {
        throw NSError(domain: "order", code: 404, userInfo: [NSLocalizedDescriptionKey: "not found"])
    }
    return order
}
```

</details>

<br>

<details>
<summary>✅ Good — enum tipado com LocalizedError</summary>
<br>

```swift
enum OrderError: LocalizedError {
    case notFound(UUID)
    case emptyCart
    case insufficientCredit(required: Double, available: Double)

    var errorDescription: String? {
        switch self {
        case .notFound(let id): "Order \(id) not found"
        case .emptyCart: "Order must contain at least one item"
        case .insufficientCredit(let required, let available):
            "Insufficient credit: required \(required), available \(available)"
        }
    }
}

func findOrder(id: UUID) throws -> Order {
    guard let order = repository.find(id: id) else {
        throw OrderError.notFound(id)
    }
    return order
}
```

</details>

## `try?` quando a ausência é válida

<details>
<summary>❌ Bad — do-catch para silenciar erro sem contexto</summary>
<br>

```swift
func loadCachedUser(id: UUID) -> User? {
    do {
        return try cache.fetch(id: id)
    } catch {
        return nil   // erro silenciado sem log
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — try? quando nil é a semântica correta</summary>
<br>

```swift
func loadCachedUser(id: UUID) -> User? {
    let cachedUser = try? cache.fetch(id: id)
    return cachedUser
}
```

</details>

## Propagação vs tratamento

<details>
<summary>❌ Bad — catch no lugar errado, propagação perdida</summary>
<br>

```swift
func submitOrder(_ request: OrderRequest) async throws -> Order {
    do {
        let user = try await userRepository.find(id: request.userId)
        let order = try await orderService.create(request)
        return order
    } catch {
        print("Error: \(error)")   // logou, mas re-throw esquecido
        return Order.empty()       // dado inválido retornado
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — tratar somente o que pode tratar; propagar o resto</summary>
<br>

```swift
func submitOrder(_ request: OrderRequest) async throws -> Order {
    let user = try await userRepository.find(id: request.userId)
    let order = try await orderService.create(request)

    return order
}

// tratamento na borda — controller ou ViewModel
func handleSubmit() async {
    do {
        let order = try await orderService.submitOrder(request)
        showConfirmation(order)
    } catch OrderError.emptyCart {
        showAlert("Your cart is empty")
    } catch OrderError.insufficientCredit(let required, let available) {
        showAlert("Need \(required), have \(available)")
    } catch {
        showAlert("Unexpected error: \(error.localizedDescription)")
    }
}
```

</details>

## `Result` para APIs sem throws

<details>
<summary>❌ Bad — closure com dois parâmetros opcionais ambíguos</summary>
<br>

```swift
func fetchOrder(id: UUID, completion: (Order?, Error?) -> Void) {
    // (nil, nil), (order, nil), (nil, error), (order, error) — 4 estados, só 2 válidos
}
```

</details>

<br>

<details>
<summary>✅ Good — Result torna os estados explícitos</summary>
<br>

```swift
func fetchOrder(id: UUID, completion: (Result<Order, OrderError>) -> Void) {
    guard let order = repository.find(id: id) else {
        completion(.failure(.notFound(id)))
        return
    }
    completion(.success(order))
}
```

</details>

## `preconditionFailure` para invariantes

<details>
<summary>❌ Bad — fatalError com mensagem genérica</summary>
<br>

```swift
guard let config = Configuration.shared else {
    fatalError("error")
}
```

</details>

<br>

<details>
<summary>✅ Good — preconditionFailure com contexto do invariante</summary>
<br>

```swift
guard let config = Configuration.shared else {
    preconditionFailure("Configuration must be initialized before accessing shared instance")
}
```

</details>
