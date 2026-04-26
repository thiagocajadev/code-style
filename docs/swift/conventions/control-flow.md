# Control Flow

> Escopo: Swift 6.1.

`guard` é a ferramenta de retorno antecipado do Swift. `switch` é exaustivo por padrão e
suporta pattern matching avançado. `if let` e `guard let` fazem unwrap de optionals sem `!`.
Máximo dois níveis de indentação.

## Ternário — atribuição de 2 valores

Ternário `? :` somente para atribuição de 2 valores em uma linha. Três ou mais alternativas
→ `switch`. Nunca aninhar ternários.

<details>
<summary>❌ Bad — if/else imperativo para atribuição simples</summary>
<br>

```swift
var label: String
if order.isPaid {
    label = "Paid"
} else {
    label = "Pending"
}
```

</details>

<br>

<details>
<summary>✅ Good — ternário na atribuição</summary>
<br>

```swift
let label = order.isPaid ? "Paid" : "Pending"
```

</details>

<details>
<summary>❌ Bad — ternário aninhado para 3+ alternativas</summary>
<br>

```swift
let priority = isUrgent ? isCritical ? "Critical" : "High" : "Normal"
```

</details>

<br>

<details>
<summary>✅ Good — switch expression para 3+ alternativas</summary>
<br>

```swift
let priority = switch (isUrgent, isCritical) {
case (true, true): "Critical"
case (true, false): "High"
default: "Normal"
}
```

</details>

## `guard let` para unwrap

<details>
<summary>❌ Bad — if let aninhado aumenta indentação</summary>
<br>

```swift
func processOrder(userId: Int64?, items: [Item]?) -> Result<Order, OrderError> {
    if let userId = userId {
        if let items = items {
            if !items.isEmpty {
                let order = createOrder(userId: userId, items: items)
                return .success(order)
            } else {
                return .failure(.emptyCart)
            }
        } else {
            return .failure(.missingItems)
        }
    } else {
        return .failure(.missingUserId)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — guard flatten o fluxo feliz</summary>
<br>

```swift
func processOrder(userId: Int64?, items: [Item]?) -> Result<Order, OrderError> {
    guard let userId else { return .failure(.missingUserId) }
    guard let items else { return .failure(.missingItems) }
    guard !items.isEmpty else { return .failure(.emptyCart) }

    let order = createOrder(userId: userId, items: items)

    return .success(order)
}
```

</details>

## `guard` com múltiplos bindings

<details>
<summary>❌ Bad — guard aninhado para múltiplos optionals</summary>
<br>

```swift
guard let name = user.name else { return }
guard let email = user.email else { return }
guard let phone = user.phone else { return }
```

</details>

<br>

<details>
<summary>✅ Good — guard com vírgula une condições no mesmo bloco</summary>
<br>

```swift
guard let name = user.name,
      let email = user.email,
      let phone = user.phone else {
    return
}
```

</details>

## `switch` exaustivo com enums

<details>
<summary>❌ Bad — if/else chain sem exaustividade</summary>
<br>

```swift
func describeStatus(_ status: OrderStatus) -> String {
    if status == .pending {
        return "Waiting for payment"
    } else if status == .processing {
        return "Being prepared"
    } else {
        return "Unknown"   // novo case adicionado passa despercebido
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — switch garante exaustividade em tempo de compilação</summary>
<br>

```swift
func describeStatus(_ status: OrderStatus) -> String {
    switch status {
    case .pending: "Waiting for payment"
    case .processing: "Being prepared"
    case .shipped: "On the way"
    case .delivered: "Delivered"
    }
}
```

</details>

## Dictionary como lookup

`Dictionary` mapeia chave → valor sem if/else chain. Usar quando o mapeamento não é um enum
(chaves dinâmicas, strings, inteiros). Para enums, preferir `switch` — garante exaustividade
em tempo de compilação.

<details>
<summary>❌ Bad — if chain para mapeamento de chave string</summary>
<br>

```swift
func httpMessage(for code: Int) -> String {
    if code == 200 { return "OK" }
    else if code == 201 { return "Created" }
    else if code == 400 { return "Bad Request" }
    else if code == 404 { return "Not Found" }
    else { return "Unknown" }
}
```

</details>

<br>

<details>
<summary>✅ Good — Dictionary + ?? para o fallback</summary>
<br>

```swift
func httpMessage(for code: Int) -> String {
    let messages: [Int: String] = [
        200: "OK",
        201: "Created",
        400: "Bad Request",
        404: "Not Found",
    ]
    let message = messages[code] ?? "Unknown"
    return message
}
```

</details>

## Pattern matching com associated values

<details>
<summary>❌ Bad — extração manual via propriedade</summary>
<br>

```swift
func handleResult(_ result: OrderResult) -> String {
    if result.isSuccess {
        return "Order \(result.order!.id) confirmed"
    } else {
        return "Failed: \(result.errorMessage!)"
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — switch com pattern binding nos associated values</summary>
<br>

```swift
func handleResult(_ result: OrderResult) -> String {
    switch result {
    case .success(let order): "Order \(order.id) confirmed"
    case .failure(let reason): "Failed: \(reason)"
    case .pending: "Processing..."
    }
}
```

</details>

## `for...where` como filtro inline

<details>
<summary>❌ Bad — guard/continue dentro do loop</summary>
<br>

```swift
for order in orders {
    if order.status != .paid { continue }
    processInvoice(for: order)
}
```

</details>

<br>

<details>
<summary>✅ Good — where filtra sem corpo extra</summary>
<br>

```swift
for order in orders where order.status == .paid {
    processInvoice(for: order)
}
```

</details>

## `defer` para cleanup garantido

<details>
<summary>❌ Bad — cleanup duplicado em cada caminho de saída</summary>
<br>

```swift
func processFile(at url: URL) throws {
    let file = try FileHandle(forReadingFrom: url)
    let data = try file.readToEnd()
    file.closeFile()
    guard let data else {
        file.closeFile()   // duplicado
        throw FileError.empty
    }
    // ...
    file.closeFile()   // duplicado
}
```

</details>

<br>

<details>
<summary>✅ Good — defer garante cleanup em qualquer caminho</summary>
<br>

```swift
func processFile(at url: URL) throws {
    let file = try FileHandle(forReadingFrom: url)
    defer { file.closeFile() }

    guard let data = try file.readToEnd() else {
        throw FileError.empty
    }

    processData(data)
}
```

</details>
