# Types

> Escopo: Swift 6.1.

Swift favorece structs (value types) sobre classes (reference types). Structs têm semântica
de cópia, não sofrem race conditions e não precisam de `deinit`. Classes são necessárias quando
a identidade importa ou o ciclo de vida é gerenciado externamente.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **value type** (tipo de valor) | Cópia em atribuição ou passagem como argumento; `struct`, `enum`, `tuple` |
| **reference type** (tipo de referência) | Referência compartilhada; `class`, `actor` |
| `struct` | tipo de valor imutável por padrão; cópia eficiente com copy-on-write |
| `enum` com associated values | hierarquia fechada de estados; pattern matching exaustivo |
| `protocol` | contrato sem implementação; favorito sobre herança |
| `actor` | reference type com proteção automática de estado em concorrência |
| `Sendable` | protocolo que certifica tipo como seguro para transferência entre tasks |

## Struct vs Class

<details>
<summary>❌ Ruim: classe onde struct é suficiente</summary>

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
b.x = 99   // muta 'a' também: referência compartilhada
```

</details>

<details>
<summary>✅ Bom: struct: cópia independente, sem surpresas</summary>

```swift
struct Point {
    var x: Double
    var y: Double
}

let a = Point(x: 1, y: 2)
var b = a
b.x = 99   // 'a' não muda: cópia independente
```

</details>

## Enum com associated values para estados

<details>
<summary>❌ Ruim: Bool + optional para modelar estado</summary>

```swift
struct LoadingState {
    var isLoading: Bool
    var data: [Order]?
    var errorMessage: String?
}
```

</details>

<details>
<summary>✅ Bom: enum exaustivo com associated values</summary>

```swift
enum OrdersState {
    case loading
    case loaded([Order])
    case failed(String)
}

// switch exaustivo: novo case é erro de compilação
switch state {
case .loading: showSpinner()
case .loaded(let orders): renderList(orders)
case .failed(let message): showError(message)
}
```

</details>

## Protocol para abstração

<details>
<summary>❌ Ruim: herança de classe para compartilhar comportamento</summary>

```swift
class BaseRepository {
    func logQuery(_ query: String) { ... }
    func handleError(_ error: Error) -> Never { fatalError(error.localizedDescription) }
}

class OrderRepository: BaseRepository { ... }
class UserRepository: BaseRepository { ... }
```

</details>

<details>
<summary>✅ Bom: protocol define contrato; struct implementa sem herança</summary>

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
<summary>❌ Ruim: classe com estado mutável acessado de múltiplas tasks</summary>

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

<details>
<summary>✅ Bom: actor serializa acessos automaticamente</summary>

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
<summary>❌ Ruim: tipo não-Sendable passado entre tasks (warning no Swift 6)</summary>

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

<details>
<summary>✅ Bom: struct imutável é automaticamente Sendable</summary>

```swift
struct OrderRequest: Sendable {
    let items: [Item]
}

Task {
    let result = await process(request: orderRequest)   // seguro
}
```

</details>
