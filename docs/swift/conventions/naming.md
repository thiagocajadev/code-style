# Naming

> Escopo: Swift 6.1.

Nomes bons tornam comentários desnecessários. Swift API Design Guidelines reforçam que o
ponto de uso deve ler como prosa: `users.remove(at: index)` é mais claro que `users.remove(index)`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **lowerCamelCase** (camelCase com inicial minúscula) | Convenção para funções, métodos, variáveis e propriedades (`findUser`, `userId`) |
| **UpperCamelCase** (PascalCase) | Convenção para tipos: `class`, `struct`, `enum`, `protocol` (`UserRepository`) |
| **argument label** (rótulo de argumento) | Nome visto no call site; lê como prosa (`remove(at:)`, `move(from:to:)`) |
| **parameter name** (nome do parâmetro) | Identificador usado dentro da função; pode diferir do argument label |
| **fluent usage** (uso fluente) | API legível como frase em inglês no call site, princípio das Swift API Design Guidelines |
| **`_` underscore label** (sem rótulo no call site) | Suprime argument label; usado quando o tipo já carrega o significado |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```swift
func apply(_ x: Any, _ p: [String: Any], _ c: (Any) -> Any) -> Any {
    guard p["defaulted"] as? Bool != true else { return () }
    return c(x)
}
```

</details>

<details>
<summary>✅ Bom</summary>

```swift
func applyDiscount(to order: Order, calculate: (Order) -> Order) -> Order? {
    guard !order.customer.hasDefaulted else { return nil }

    let discountedOrder = calculate(order)
    return discountedOrder
}
```

</details>

## Nomes em português

<details>
<summary>❌ Ruim: identificadores em português ficam desajeitados no idioma Swift</summary>

```swift
let nomeDoUsuario = "Alice"
let listaDeIds = [1, 2, 3]

func retornaUsuario(id: Int64) -> User? { ... }
func buscaEnderecoDoCliente(id: Int64) -> Address? { ... }
```

</details>

<details>
<summary>✅ Bom: inglês: curto, direto, universal</summary>

```swift
let userName = "Alice"
let idList = [1, 2, 3]

func findUser(id: Int64) -> User? { ... }
func findCustomerAddress(customerId: Int64) -> Address? { ... }
```

</details>

## Convenções de case

| Contexto | Convenção | Exemplos |
| --- | --- | --- |
| Tipos, structs, enums, protocolos | `UpperCamelCase` | `UserService`, `PaymentResult` |
| Funções, propriedades, variáveis | `lowerCamelCase` | `calculateTotal`, `isActive` |
| Enum cases | `lowerCamelCase` | `.success`, `.notFound`, `.pending` |
| Módulos e pacotes | `UpperCamelCase` | `OrderDomain`, `NetworkLayer` |

<details>
<summary>❌ Ruim: case errado</summary>

```swift
struct order_service { }         // struct com snake_case
enum Status { case Success }     // enum case com UpperCamelCase
let MaxRetries = 3               // constante com UpperCamelCase
```

</details>

<details>
<summary>✅ Bom: convenções Swift respeitadas</summary>

```swift
struct OrderService { }

enum Status { case success, pending, failed }

let maxRetries = 3
```

</details>

## Labels de argumento

Labels tornam a chamada legível como prosa. O primeiro label é frequentemente omitido quando o
nome da função já o implica.

<details>
<summary>❌ Ruim: labels que repetem o tipo ou são desnecessários</summary>

```swift
func send(message message: String, toUser user: User) { }
// chamada: send(message: "Hi", toUser: alice)
```

</details>

<details>
<summary>✅ Bom: chamada lê como prosa</summary>

```swift
func send(_ message: String, to user: User) { }
// chamada: send("Hi", to: alice)

func move(from source: Index, to destination: Index) { }
// chamada: move(from: i, to: j)
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```swift
let loading = true
let active = user.status == .active
let valid = email.contains("@")
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

```swift
let isActive = user.status == .active
let hasPermission = user.roles.contains(.admin)

let canDelete = isActive && hasPermission
let shouldRetry = attempt < maxRetries
```

</details>

## Protocolos: sufixo descritivo

| Padrão | Quando usar |
| --- | --- |
| `Able` | capacidade: `Codable`, `Equatable`, `Hashable` |
| `ing` | ação em andamento: `Networking`, `Logging` |
| substantivo | papel: `Collection`, `Sequence`, `UserRepository` |

<details>
<summary>❌ Ruim: sufixo genérico ou ambíguo</summary>

```swift
protocol UserProtocol { }
protocol IRepository { }     // prefixo I ao estilo C#, não idiomático em Swift
```

</details>

<details>
<summary>✅ Bom: nome que descreve o papel</summary>

```swift
protocol UserRepository { }
protocol OrderProvider { }
protocol Cacheable { }
```

</details>

## Domain-first naming

<details>
<summary>❌ Ruim: nome revela infraestrutura</summary>

```swift
func callStripe(amount: Decimal) async throws { }
func getUserFromCoreData(id: UUID) -> User? { }
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```swift
func chargeCustomer(amount: Decimal) async throws { }
func findUser(id: UUID) -> User? { }
```

</details>
