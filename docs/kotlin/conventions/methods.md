# Methods

> Escopo: Kotlin 2.2.

Kotlin tem funções de topo (top-level), métodos de classe e extension functions. Todas seguem as
mesmas regras: orquestrador visível no topo, detalhes abaixo, retorno explicado por uma `val`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | uma função orquestra OU implementa, nunca os dois ao mesmo tempo |
| **Explaining Return** (retorno explicado) | atribuir o resultado a uma `val` nomeada antes de retornar |
| **Stepdown Rule** (regra de descida) | chamador visível antes do detalhe; helpers abaixo do chamador |
| **helper** (função auxiliar) | função de apoio que implementa um passo do orquestrador; dá nome ao detalhe |
| **extension function** (função de extensão) | função adicionada a um tipo existente sem herança; sintaxe `fun Type.name()` |
| **top-level function** (função de topo) | função declarada fora de qualquer classe; favorita ao utilitário estático |

<a id="god-function"></a>

## God function: múltiplas responsabilidades

<details>
<summary>❌ Ruim: busca, valida, calcula e persiste em uma função só</summary>

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

<details>
<summary>✅ Bom: orquestrador limpo, detalhes em funções dedicadas</summary>

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

<a id="single-level-of-abstraction"></a>

## SLA: orquestrador ou implementação

<details>
<summary>❌ Ruim: função mistura nível de abstração</summary>

```kotlin
fun generateReport(orders: List<Order>): Report {
    val settled = orders.filter { it.status == OrderStatus.SETTLED }

    var total = 0.0
    for (order in settled) {
        total += order.items.sumOf { it.price * it.quantity }
    }

    return Report(orderCount = settled.size, revenue = total)
}
```

</details>

<details>
<summary>✅ Bom: cada função em um único nível</summary>

```kotlin
fun generateReport(orders: List<Order>): Report {
    val settledOrders = filterSettledOrders(orders)
    val revenue = calculateRevenue(settledOrders)

    return Report(orderCount = settledOrders.size, revenue = revenue)
}

private fun filterSettledOrders(orders: List<Order>): List<Order> =
    orders.filter { it.status == OrderStatus.SETTLED }

private fun calculateRevenue(orders: List<Order>): Double =
    orders.sumOf { order -> order.items.sumOf { it.price * it.quantity } }
```

</details>

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

<details>
<summary>❌ Ruim: lógica inline no return</summary>

```kotlin
fun findActiveCustomers(customers: List<Customer>): List<Customer> {
    return customers.filter { it.isActive && it.hasPendingOrders }
        .sortedBy { it.lastName }
        .take(10)
}
```

</details>

<details>
<summary>✅ Bom: explaining return com val nomeada</summary>

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
<summary>❌ Ruim: utilitário genérico sem contexto</summary>

```kotlin
// StringUtils.kt
fun formatCurrency(value: Double): String {
    return "R$ %.2f".format(value)
}

// uso
val label = formatCurrency(order.total)
```

</details>

<details>
<summary>✅ Bom: extension function no tipo correto</summary>

```kotlin
// Order.kt
fun Double.toCurrencyLabel(): String {
    return "R$ %.2f".format(this)
}

// uso
val label = order.total.toCurrencyLabel()
```

</details>

## Parâmetros: objeto para 4+

<details>
<summary>❌ Ruim: assinatura com muitos parâmetros posicionais</summary>

```kotlin
fun createOrder(userId: Long, productId: Long, quantity: Int, discount: Double, notes: String): Order { ... }
```

</details>

<details>
<summary>✅ Bom: data class agrupa parâmetros com semântica</summary>

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
