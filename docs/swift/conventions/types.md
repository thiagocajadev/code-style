# Types

> Escopo: Swift 6.1.

Swift favorece structs (value types) sobre classes (reference types). Structs têm semântica
de cópia, não sofrem race conditions e não precisam de `deinit`. Classes são necessárias quando
a identidade importa ou o ciclo de vida é gerenciado externamente.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **value type** | cópia em atribuição ou passagem como argumento; `struct`, `enum`, `tuple` |
| **reference type** | referência compartilhada; `class`, `actor` |
| `struct` | tipo de valor imutável por padrão; cópia eficiente com copy-on-write |
| `enum` com associated values | hierarquia fechada de estados; pattern matching exaustivo |
| `protocol` | contrato sem implementação; favorito sobre herança |
| `actor` | reference type com proteção automática de estado em concorrência |
| `Sendable` | protocolo que certifica tipo como seguro para transferência entre tasks |

## Struct vs Class

<details>
<summary>❌ Bad — classe onde struct é suficiente</summary>
<br>

```swift
class Point {
    var x: Double
    var y: Double

    init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }
}

let a = Point(x: 1, y: 2)
let b = a
b.x = 99   // muta 'a' também — referência compartilhada
```

</details>

<br>

<details>
<summary>✅ Good — struct: cópia independente, sem surpresas</summary>
<br>

```swift
struct Point {
    var x: Double
    var y: Double
}

let a = Point(x: 1, y: 2)
var b = a
b.x = 99   // 'a' não muda — cópia independente
```

</details>

## Enum com associated values para estados

<details>
<summary>❌ Bad — Bool + optional para modelar estado</summary>
<br>

```swift
struct LoadingState {
    var isLoading: Bool
    var data: [Order]?
    var errorMessage: String?
}
```

</details>

<br>

<details>
<summary>✅ Good — enum exaustivo com associated values</summary>
<br>

```swift
enum OrdersState {
    case loading
    case loaded([Order])
    case failed(String)
}

// switch exaustivo — novo case é erro de compilação
switch state {
case .loading: showSpinner()
case .loaded(let orders): renderList(orders)
case .failed(let message): showError(message)
}
```

</details>

## Protocol para abstração

<details>
<summary>❌ Bad — herança de classe para compartilhar comportamento</summary>
<br>

```swift
class BaseRepository {
    func logQuery(_ query: String) { ... }
    func handleError(_ error: Error) -> Never { fatalError(error.localizedDescription) }
}

class OrderRepository: BaseRepository { ... }
class UserRepository: BaseRepository { ... }
```

</details>

<br>

<details>
<summary>✅ Good — protocol define contrato; struct implementa sem herança</summary>
<br>

```swift
protocol OrderRepository {
    func find(id: UUID) async throws -> Order?
    func save(_ order: Order) async throws
}

struct SQLOrderRepository: OrderRepository {
    private let database: Database

    func find(id: UUID) async throws -> Order? { ... }
    func save(_ order: Order) async throws { ... }
}
```

</details>

## Actor para estado compartilhado

<details>
<summary>❌ Bad — classe com estado mutável acessado de múltiplas tasks</summary>
<br>

```swift
class Cache {
    private var storage: [String: Data] = [:]

    func set(_ key: String, value: Data) {
        storage[key] = value   // data race em Swift 6 strict mode
    }

    func get(_ key: String) -> Data? {
        storage[key]
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — actor serializa acessos automaticamente</summary>
<br>

```swift
actor Cache {
    private var storage: [String: Data] = [:]

    func set(_ key: String, value: Data) {
        storage[key] = value
    }

    func get(_ key: String) -> Data? {
        storage[key]
    }
}

// uso: await cache.set("key", value: data)
```

</details>

## Sendable para transferência entre tasks

<details>
<summary>❌ Bad — tipo não-Sendable passado entre tasks (warning no Swift 6)</summary>
<br>

```swift
class OrderRequest {
    var items: [Item]
    init(items: [Item]) { self.items = items }
}

Task {
    let result = await process(request: orderRequest)   // ⚠️ capture of non-Sendable type
}
```

</details>

<br>

<details>
<summary>✅ Good — struct imutável é automaticamente Sendable</summary>
<br>

```swift
struct OrderRequest: Sendable {
    let items: [Item]
}

Task {
    let result = await process(request: orderRequest)   // seguro
}
```

</details>
