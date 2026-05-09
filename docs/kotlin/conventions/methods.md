# Methods

> Escopo: Kotlin 2.2.

Kotlin tem funções de topo (top-level), métodos de classe e extension functions. Todas seguem as
mesmas regras: orquestrador visível no topo, detalhes abaixo, retorno explicado por uma `val`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLA** (Single Level of Abstraction) | uma função orquestra OU implementa, nunca os dois ao mesmo tempo |
| **Explaining Return** | atribuir o resultado a uma `val` nomeada antes de retornar |
| **Stepdown Rule** | chamador visível antes do detalhe; helpers abaixo do chamador |
| **extension function** | função adicionada a um tipo existente sem herança; sintaxe `fun Type.name()` |
| **top-level function** | função declarada fora de qualquer classe; favorita ao utilitário estático |

## God function — múltiplas responsabilidades

<details>
<summary>❌ Bad — busca, valida, calcula e persiste em uma função só</summary>
<br>

```kotlin
fun submitOrder(userId: Long, items: List<Item>): Result<Order> {
    val user = userRepository.findById(userId)
        ?: return Result.failure(UserNotFoundError(userId))

    if (items.isEmpty()) {
        return Result.failure(EmptyCartError())
    }

    var total = 0.0
    for (item in items) {
        if (item.stock <= 0) {
            return Result.failure(OutOfStockError(item.id))
        }
        total += item.price * item.quantity
    }

    if (user.creditLimit < total) {
        return Result.failure(InsufficientCreditError())
    }

    val order = Order(userId = userId, items = items, total = total)
    orderRepository.save(order)
    notificationService.send(user.email, "Order confirmed")

    return Result.success(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador limpo, detalhes em funções dedicadas</summary>
<br>

```kotlin
fun submitOrder(userId: Long, items: List<Item>): Result<Order> {
    val user = findActiveUser(userId).getOrElse { return Result.failure(it) }

    validateCart(items).getOrElse { return Result.failure(it) }
    validateCredit(user, items).getOrElse { return Result.failure(it) }

    val order = buildOrder(userId, items)

    persistOrder(order)
    notifyConfirmation(user.email)

    return Result.success(order)
}

private fun findActiveUser(userId: Long): Result<User> { ... }
private fun validateCart(items: List<Item>): Result<Unit> { ... }
private fun validateCredit(user: User, items: List<Item>): Result<Unit> { ... }
private fun buildOrder(userId: Long, items: List<Item>): Order { ... }
private fun persistOrder(order: Order) { ... }
private fun notifyConfirmation(email: String) { ... }
```

</details>

## SLA — orquestrador ou implementação

<details>
<summary>❌ Bad — função mistura nível de abstração</summary>
<br>

```kotlin
fun generateReport(orders: List<Order>): Report {
    val paid = orders.filter { it.status == OrderStatus.PAID }

    var total = 0.0
    for (order in paid) {
        total += order.items.sumOf { it.price * it.quantity }
    }

    return Report(orderCount = paid.size, revenue = total)
}
```

</details>

<br>

<details>
<summary>✅ Good — cada função em um único nível</summary>
<br>

```kotlin
fun generateReport(orders: List<Order>): Report {
    val paidOrders = filterPaidOrders(orders)
    val revenue = calculateRevenue(paidOrders)

    return Report(orderCount = paidOrders.size, revenue = revenue)
}

private fun filterPaidOrders(orders: List<Order>): List<Order> =
    orders.filter { it.status == OrderStatus.PAID }

private fun calculateRevenue(orders: List<Order>): Double =
    orders.sumOf { order -> order.items.sumOf { it.price * it.quantity } }
```

</details>

## Sem lógica no retorno

<details>
<summary>❌ Bad — lógica inline no return</summary>
<br>

```kotlin
fun findActiveCustomers(customers: List<Customer>): List<Customer> {
    return customers.filter { it.isActive && it.hasPendingOrders }
        .sortedBy { it.lastName }
        .take(10)
}
```

</details>

<br>

<details>
<summary>✅ Good — explaining return com val nomeada</summary>
<br>

```kotlin
fun findActiveCustomers(customers: List<Customer>): List<Customer> {
    val topActiveCustomers = customers
        .filter { it.isActive && it.hasPendingOrders }
        .sortedBy { it.lastName }
        .take(10)

    return topActiveCustomers
}
```

</details>

## Extension functions

Extension functions adicionam comportamento a tipos existentes sem herança. Ficam no arquivo do
domínio que as usa, não em um arquivo de utilitários genérico.

<details>
<summary>❌ Bad — utilitário genérico sem contexto</summary>
<br>

```kotlin
// StringUtils.kt
fun formatCurrency(value: Double): String {
    return "R$ %.2f".format(value)
}

// uso
val label = formatCurrency(order.total)
```

</details>

<br>

<details>
<summary>✅ Good — extension function no tipo correto</summary>
<br>

```kotlin
// Order.kt
fun Double.toCurrencyLabel(): String {
    return "R$ %.2f".format(this)
}

// uso
val label = order.total.toCurrencyLabel()
```

</details>

## Parâmetros — objeto para 4+

<details>
<summary>❌ Bad — assinatura com muitos parâmetros posicionais</summary>
<br>

```kotlin
fun createOrder(userId: Long, productId: Long, quantity: Int, discount: Double, notes: String): Order { ... }
```

</details>

<br>

<details>
<summary>✅ Good — data class agrupa parâmetros com semântica</summary>
<br>

```kotlin
data class CreateOrderRequest(
    val userId: Long,
    val productId: Long,
    val quantity: Int,
    val discount: Double = 0.0,
    val notes: String = "",
)

fun createOrder(request: CreateOrderRequest): Order { ... }
```

</details>
