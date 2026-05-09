# Naming

> Escopo: Swift 6.1.

Nomes bons tornam comentários desnecessários. Swift API Design Guidelines reforçam que o
ponto de uso deve ler como prosa: `users.remove(at: index)` é mais claro que `users.remove(index)`.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```swift
func apply(_ x: Any, _ p: [String: Any], _ c: (Any) -> Any) -> Any {
    guard p["defaulted"] as? Bool != true else { return () }
    return c(x)
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

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
<summary>❌ Bad — identificadores em português ficam desajeitados no idioma Swift</summary>
<br>

```swift
let nomeDoUsuario = "Alice"
let listaDeIds = [1, 2, 3]

func retornaUsuario(id: Int64) -> User? { ... }
func buscaEnderecoDoCliente(id: Int64) -> Address? { ... }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

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
<summary>❌ Bad — case errado</summary>
<br>

```swift
struct order_service { }         // struct com snake_case
enum Status { case Success }     // enum case com UpperCamelCase
let MaxRetries = 3               // constante com UpperCamelCase
```

</details>

<br>

<details>
<summary>✅ Good — convenções Swift respeitadas</summary>
<br>

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
<summary>❌ Bad — labels que repetem o tipo ou são desnecessários</summary>
<br>

```swift
func send(message message: String, toUser user: User) { }
// chamada: send(message: "Hi", toUser: alice)
```

</details>

<br>

<details>
<summary>✅ Good — chamada lê como prosa</summary>
<br>

```swift
func send(_ message: String, to user: User) { }
// chamada: send("Hi", to: alice)

func move(from source: Index, to destination: Index) { }
// chamada: move(from: i, to: j)
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```swift
let loading = true
let active = user.status == .active
let valid = email.contains("@")
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```swift
let isActive = user.status == .active
let hasPermission = user.roles.contains(.admin)

let canDelete = isActive && hasPermission
let shouldRetry = attempt < maxRetries
```

</details>

## Protocolos — sufixo descritivo

| Padrão | Quando usar |
| --- | --- |
| `Able` | capacidade: `Codable`, `Equatable`, `Hashable` |
| `ing` | ação em andamento: `Networking`, `Logging` |
| substantivo | papel: `Collection`, `Sequence`, `UserRepository` |

<details>
<summary>❌ Bad — sufixo genérico ou ambíguo</summary>
<br>

```swift
protocol UserProtocol { }
protocol IRepository { }     // prefixo I ao estilo C#, não idiomático em Swift
```

</details>

<br>

<details>
<summary>✅ Good — nome que descreve o papel</summary>
<br>

```swift
protocol UserRepository { }
protocol OrderProvider { }
protocol Cacheable { }
```

</details>

## Domain-first naming

<details>
<summary>❌ Bad — nome revela infraestrutura</summary>
<br>

```swift
func callStripe(amount: Decimal) async throws { }
func getUserFromCoreData(id: UUID) -> User? { }
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```swift
func chargeCustomer(amount: Decimal) async throws { }
func findUser(id: UUID) -> User? { }
```

</details>
