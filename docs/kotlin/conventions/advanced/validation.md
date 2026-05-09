# Validation

> Escopo: Kotlin 2.2, Jakarta Validation 3.x / Spring Boot 3.x.

Validação acontece na fronteira — entrada do usuário, payload de API, parâmetros de use case.
Dentro do domínio, `require`/`check` garantem invariantes. Nunca validar no meio da lógica de
negócio: dados chegam válidos ou o fluxo para antes de começar.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Bean Validation** | anotações em data classes (`@NotNull`, `@Size`, `@Email`) processadas pelo framework |
| `require` | lança `IllegalArgumentException` — pré-condição de argumento |
| `check` | lança `IllegalStateException` — invariante interna do objeto |
| **fronteira de validação** | ponto onde dados externos entram no sistema (controller, use case input) |
| **domain invariant** | regra que deve ser verdadeira em qualquer estado válido do objeto |

## Validação no meio da lógica de negócio

<details>
<summary>❌ Bad — validação espalhada pela função</summary>
<br>

```kotlin
fun processOrder(userId: Long, items: List<Item>, discount: Double): Order {
    val user = userRepository.findById(userId)

    if (items.isEmpty()) {
        throw IllegalArgumentException("Items cannot be empty")
    }

    val total = items.sumOf { it.price }

    if (discount < 0 || discount > 1) {
        throw IllegalArgumentException("Discount must be between 0 and 1")
    }

    val finalTotal = total * (1 - discount)

    return Order(userId = userId, items = items, total = finalTotal)
}
```

</details>

<br>

<details>
<summary>✅ Good — validação na entrada, lógica limpa depois</summary>
<br>

```kotlin
data class ProcessOrderRequest(
    val userId: Long,
    val items: List<Item>,
    val discount: Double,
) {
    init {
        require(items.isNotEmpty()) { "Order must contain at least one item" }
        require(discount in 0.0..1.0) { "Discount must be between 0 and 1, got $discount" }
    }
}

fun processOrder(request: ProcessOrderRequest): Order {
    val total = request.items.sumOf { it.price }
    val finalTotal = total * (1 - request.discount)

    val order = Order(userId = request.userId, items = request.items, total = finalTotal)

    return order
}
```

</details>

## Bean Validation com Spring Boot

<details>
<summary>❌ Bad — validação manual no controller</summary>
<br>

```kotlin
@PostMapping("/orders")
fun createOrder(@RequestBody request: CreateOrderRequest): ResponseEntity<Order> {
    if (request.userId == null) {
        return ResponseEntity.badRequest().build()
    }
    if (request.items.isNullOrEmpty()) {
        return ResponseEntity.badRequest().build()
    }
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — @Valid delega ao Bean Validation; controller fica limpo</summary>
<br>

```kotlin
data class CreateOrderRequest(
    @field:NotNull val userId: Long?,
    @field:NotEmpty val items: List<@Valid OrderItemRequest>?,
    @field:DecimalMin("0.0") @field:DecimalMax("1.0") val discount: Double = 0.0,
)

@PostMapping("/orders")
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ResponseEntity<Order> {
    val order = orderService.create(request)
    return ResponseEntity.status(201).body(order)
}
```

</details>

## Acumulação de erros

<details>
<summary>❌ Bad — para no primeiro erro (usuário precisa corrigir um campo por vez)</summary>
<br>

```kotlin
fun validateProfile(profile: UserProfile): Result<Unit> {
    if (profile.name.isBlank()) return Result.failure(InvalidNameError())
    if (!profile.email.contains("@")) return Result.failure(InvalidEmailError())
    if (profile.age < 18) return Result.failure(UnderageError())
    return Result.success(Unit)
}
```

</details>

<br>

<details>
<summary>✅ Good — acumula todos os erros e retorna de uma vez</summary>
<br>

```kotlin
sealed class ProfileValidationError {
    data object InvalidName : ProfileValidationError()
    data object InvalidEmail : ProfileValidationError()
    data object Underage : ProfileValidationError()
}

fun validateProfile(profile: UserProfile): Result<Unit> {
    val errors = buildList {
        if (profile.name.isBlank()) add(ProfileValidationError.InvalidName)
        if (!profile.email.contains("@")) add(ProfileValidationError.InvalidEmail)
        if (profile.age < 18) add(ProfileValidationError.Underage)
    }

    return if (errors.isEmpty()) {
        Result.success(Unit)
    } else {
        Result.failure(ValidationErrors(errors))
    }
}
```

</details>
