# Null Safety

> Escopo: Kotlin 2.2.

O sistema de tipos do Kotlin separa tipos anuláveis (`String?`) de não-anuláveis (`String`). O
compilador impede `NullPointerException` em tempo de compilação. O operador `!!` (assert não-null)
é o único ponto de falha explícita e deve ser evitado em código de produção.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `T?` | tipo anulável; pode conter `null` |
| `?.` | safe call — acesso ou invocação segura; retorna `null` se receptor for `null` |
| `?:` | **Elvis operator** — valor padrão ou saída antecipada quando `null` |
| `!!` | assert não-null; lança `NullPointerException` se `null` — proibido em produção |
| **smart cast** | após verificação de null em `if`, o compilador trata como não-nulo |
| `requireNotNull` | falha rápida com mensagem na fronteira de entrada |

## `!!` em produção

<details>
<summary>❌ Bad — !! como atalho perigoso</summary>
<br>

```kotlin
fun getCustomerEmail(userId: Long): String {
    val user = userRepository.findById(userId)
    return user!!.email   // NullPointerException sem mensagem útil
}
```

</details>

<br>

<details>
<summary>✅ Good — elvis com saída antecipada e erro expressivo</summary>
<br>

```kotlin
fun getCustomerEmail(userId: Long): String {
    val user = userRepository.findById(userId)
        ?: throw UserNotFoundError("User $userId not found")

    return user.email
}
```

</details>

## Cadeia de safe calls

<details>
<summary>❌ Bad — verificações manuais aninhadas</summary>
<br>

```kotlin
fun getCity(order: Order?): String {
    if (order != null) {
        if (order.customer != null) {
            if (order.customer.address != null) {
                return order.customer.address.city
            }
        }
    }
    return "Unknown"
}
```

</details>

<br>

<details>
<summary>✅ Good — safe call chain com elvis no final</summary>
<br>

```kotlin
fun getCity(order: Order?): String {
    val city = order?.customer?.address?.city ?: "Unknown"
    return city
}
```

</details>

## `?.let` para bloco condicional

<details>
<summary>❌ Bad — if de null-check antes de bloco</summary>
<br>

```kotlin
val promo = order.activePromotion
if (promo != null) {
    applyPromotion(order, promo)
    logPromotion(promo.code)
}
```

</details>

<br>

<details>
<summary>✅ Good — let executa somente quando não-null</summary>
<br>

```kotlin
order.activePromotion?.let { promo ->
    applyPromotion(order, promo)
    logPromotion(promo.code)
}
```

</details>

## Validação na fronteira com requireNotNull

<details>
<summary>❌ Bad — null chega até a lógica de negócio</summary>
<br>

```kotlin
fun createOrder(userId: Long?, items: List<Item>?): Order {
    val id = userId ?: 0L      // valor padrão silencioso, esconde o problema
    val list = items ?: emptyList()
    return Order(userId = id, items = list)
}
```

</details>

<br>

<details>
<summary>✅ Good — falha rápida na fronteira com mensagem expressiva</summary>
<br>

```kotlin
fun createOrder(userId: Long?, items: List<Item>?): Order {
    val validUserId = requireNotNull(userId) { "userId is required to create an order" }
    val validItems = requireNotNull(items) { "items list is required" }

    require(validItems.isNotEmpty()) { "Order must contain at least one item" }

    val order = Order(userId = validUserId, items = validItems)

    return order
}
```

</details>

## Elvis como guard clause de retorno

<details>
<summary>❌ Bad — if/else para null-check com retorno</summary>
<br>

```kotlin
fun findProductPrice(productId: Long): Double {
    val product = productRepository.findById(productId)
    if (product == null) {
        return 0.0
    }
    return product.price
}
```

</details>

<br>

<details>
<summary>✅ Good — elvis guard em uma linha</summary>
<br>

```kotlin
fun findProductPrice(productId: Long): Double {
    val product = productRepository.findById(productId)
        ?: return 0.0

    return product.price
}
```

</details>

## Coleções e null — preferir empty collection

<details>
<summary>❌ Bad — null para representar lista vazia</summary>
<br>

```kotlin
fun findOrdersByUser(userId: Long): List<Order>? {
    val orders = orderRepository.findByUserId(userId)
    return if (orders.isEmpty()) null else orders
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia; null nunca representa ausência de itens</summary>
<br>

```kotlin
fun findOrdersByUser(userId: Long): List<Order> {
    return orderRepository.findByUserId(userId)
}
```

</details>
