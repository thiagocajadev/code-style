# Null Safety

> Escopo: Swift 6.1.

Optionals em Swift modelam a ausência de valor de forma explícita. `String?` pode conter `nil`;
`String` nunca pode. O compilador rejeita uso não-seguro de optionals. O operador `!` (forced
unwrap) é o único ponto de falha explícita e deve ser evitado em produção.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Optional<T>` / `T?` | tipo que pode ser `nil` ou conter um valor de tipo `T` |
| `guard let` | unwrap com saída antecipada se `nil` — flattens indentação |
| `if let` | unwrap condicional; executa bloco somente quando não-nil |
| `??` | **nil-coalescing operator** — valor padrão quando optional é `nil` |
| `?.` | optional chaining — acesso seguro em cadeia; retorna `nil` se qualquer link for `nil` |
| `!` | forced unwrap — lança runtime error se `nil`; proibido em produção |

## Forced unwrap em produção

<details>
<summary>❌ Bad — ! como atalho perigoso</summary>
<br>

```swift
func getCustomerEmail(userId: UUID) -> String {
    let user = userRepository.find(id: userId)
    return user!.email   // crash sem mensagem útil se user for nil
}
```

</details>

<br>

<details>
<summary>✅ Good — guard com saída antecipada e erro expressivo</summary>
<br>

```swift
func getCustomerEmail(userId: UUID) throws -> String {
    guard let user = userRepository.find(id: userId) else {
        throw UserError.notFound(userId)
    }

    return user.email
}
```

</details>

## Optional chaining em cadeia

<details>
<summary>❌ Bad — verificações manuais aninhadas</summary>
<br>

```swift
func getCity(order: Order?) -> String {
    if let order = order {
        if let customer = order.customer {
            if let address = customer.address {
                return address.city
            }
        }
    }
    return "Unknown"
}
```

</details>

<br>

<details>
<summary>✅ Good — optional chaining com nil-coalescing no final</summary>
<br>

```swift
func getCity(order: Order?) -> String {
    return order?.customer?.address?.city ?? "Unknown"
}
```

</details>

## Unwrap múltiplo com guard

<details>
<summary>❌ Bad — guard separado para cada optional</summary>
<br>

```swift
guard let name = user.name else { return }
guard let email = user.email else { return }
guard let phone = user.phone else { return }
```

</details>

<br>

<details>
<summary>✅ Good — guard com vírgula une condições</summary>
<br>

```swift
guard let name = user.name,
      let email = user.email,
      let phone = user.phone else {
    return
}
```

</details>

## `if let` para bloco condicional

<details>
<summary>❌ Bad — if com nil-check explícito</summary>
<br>

```swift
if order.promotion != nil {
    let promo = order.promotion!
    applyPromotion(order, promo)
}
```

</details>

<br>

<details>
<summary>✅ Good — if let faz unwrap e bind em um passo</summary>
<br>

```swift
if let promo = order.promotion {
    applyPromotion(order, promo)
}
```

</details>

## Nil-coalescing para valor padrão

<details>
<summary>❌ Bad — if/else para optional com default</summary>
<br>

```swift
let displayName: String
if let name = user.name {
    displayName = name
} else {
    displayName = "Anonymous"
}
```

</details>

<br>

<details>
<summary>✅ Good — ?? em uma linha</summary>
<br>

```swift
let displayName = user.name ?? "Anonymous"
```

</details>

## Coleções — preferir vazio a optional

<details>
<summary>❌ Bad — nil para representar lista vazia</summary>
<br>

```swift
func findOrdersByUser(userId: UUID) -> [Order]? {
    let orders = orderRepository.findByUserId(userId)
    return orders.isEmpty ? nil : orders
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia; nil nunca representa ausência de itens</summary>
<br>

```swift
func findOrdersByUser(userId: UUID) -> [Order] {
    return orderRepository.findByUserId(userId)
}
```

</details>
