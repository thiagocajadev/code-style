# Error Handling

> Escopo: Kotlin 2.2.

Erros esperados são valores — `Result<T>` ou sealed classes retornam o erro ao chamador sem lançar
exceções. Exceções são reservadas para falhas de programação (invariantes quebradas) e erros
irrecuperáveis de infraestrutura.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Result<T>` | tipo sealed da stdlib: `Success(value)` ou `Failure(exception)` |
| `runCatching` | executa bloco e captura qualquer exceção em `Result` |
| **sealed class de erro** | hierarquia fechada de erros de domínio com `when` exaustivo |
| `require` | lança `IllegalArgumentException` para pré-condições de entrada |
| `check` | lança `IllegalStateException` para invariantes internas |
| **erro silencioso** | capturar e ignorar uma exceção sem log ou propagação |

## Exceção como controle de fluxo

<details>
<summary>❌ Bad — exceção para erro esperado de negócio</summary>
<br>

```kotlin
fun findOrder(id: Long): Order {
    return orderRepository.findById(id)
        ?: throw OrderNotFoundException("Order $id not found")
}

// chamador precisa capturar — acoplamento implícito
fun processRequest(orderId: Long): Response {
    return try {
        val order = findOrder(orderId)
        ok(order)
    } catch (e: OrderNotFoundException) {
        notFound(e.message)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — Result comunica explicitamente a ausência</summary>
<br>

```kotlin
fun findOrder(id: Long): Result<Order> {
    val order = orderRepository.findById(id)
        ?: return Result.failure(OrderNotFoundError(id))

    return Result.success(order)
}

fun processRequest(orderId: Long): Response {
    val result = findOrder(orderId)

    return result.fold(
        onSuccess = { order -> ok(order) },
        onFailure = { error -> mapErrorToResponse(error) },
    )
}
```

</details>

## Erro silencioso

<details>
<summary>❌ Bad — exceção engolida sem rastro</summary>
<br>

```kotlin
fun sendNotification(userId: Long) {
    try {
        notificationService.send(userId)
    } catch (e: Exception) {
        // nada
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — log estruturado + decisão explícita de continuar</summary>
<br>

```kotlin
fun sendNotification(userId: Long) {
    runCatching { notificationService.send(userId) }
        .onFailure { error ->
            logger.warn("Failed to send notification to user $userId: ${error.message}")
        }
}
```

</details>

## Sealed class de erros de domínio

<details>
<summary>❌ Bad — string como discriminante de erro</summary>
<br>

```kotlin
data class ServiceError(val code: String, val message: String)

fun validateOrder(order: Order): ServiceError? {
    if (order.items.isEmpty()) return ServiceError("EMPTY_CART", "Cart is empty")
    if (order.total <= 0) return ServiceError("INVALID_TOTAL", "Total must be positive")
    return null
}
```

</details>

<br>

<details>
<summary>✅ Good — sealed class com when exaustivo</summary>
<br>

```kotlin
sealed class OrderValidationError {
    data object EmptyCart : OrderValidationError()
    data class InvalidTotal(val total: Double) : OrderValidationError()
    data class OutOfStock(val productId: Long) : OrderValidationError()
}

fun validateOrder(order: Order): Result<Unit> {
    if (order.items.isEmpty()) {
        return Result.failure(OrderValidationError.EmptyCart)
    }

    if (order.total <= 0) {
        return Result.failure(OrderValidationError.InvalidTotal(order.total))
    }

    return Result.success(Unit)
}

// consumo exaustivo
fun handleValidationError(error: OrderValidationError): String {
    return when (error) {
        is OrderValidationError.EmptyCart -> "Add at least one item"
        is OrderValidationError.InvalidTotal -> "Total ${error.total} is invalid"
        is OrderValidationError.OutOfStock -> "Product ${error.productId} is unavailable"
    }
}
```

</details>

## `require` e `check` para invariantes

<details>
<summary>❌ Bad — if manual com mensagem genérica</summary>
<br>

```kotlin
fun applyDiscount(price: Double, rate: Double): Double {
    if (rate < 0 || rate > 1) {
        throw Exception("Invalid rate")
    }
    return price * (1 - rate)
}
```

</details>

<br>

<details>
<summary>✅ Good — require com mensagem expressiva</summary>
<br>

```kotlin
fun applyDiscount(price: Double, rate: Double): Double {
    require(rate in 0.0..1.0) { "Discount rate must be between 0 and 1, got $rate" }
    require(price >= 0) { "Price must be non-negative, got $price" }

    val discountedPrice = price * (1 - rate)

    return discountedPrice
}
```

</details>

## Fronteira de erro — mapear na borda da API

<details>
<summary>❌ Bad — sealed class de domínio exposta diretamente na resposta HTTP</summary>
<br>

```kotlin
fun createOrder(request: CreateOrderRequest): ResponseEntity<Any> {
    val result = orderService.create(request)
    return if (result.isSuccess) {
        ResponseEntity.ok(result.getOrThrow())
    } else {
        ResponseEntity.badRequest().body(result.exceptionOrNull())
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — tradução explícita do erro de domínio para HTTP</summary>
<br>

```kotlin
fun createOrder(request: CreateOrderRequest): ResponseEntity<Any> {
    val result = orderService.create(request)

    return result.fold(
        onSuccess = { order -> ResponseEntity.status(201).body(order) },
        onFailure = { error -> mapDomainErrorToResponse(error) },
    )
}

private fun mapDomainErrorToResponse(error: Throwable): ResponseEntity<Any> {
    return when (error) {
        is OrderValidationError.EmptyCart -> ResponseEntity.badRequest().body(mapOf("error" to "empty_cart"))
        is OrderValidationError.OutOfStock -> ResponseEntity.unprocessableEntity().body(mapOf("error" to "out_of_stock"))
        else -> ResponseEntity.internalServerError().body(mapOf("error" to "unexpected_error"))
    }
}
```

</details>
