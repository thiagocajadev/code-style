# Visual Density

> Escopo: Kotlin 2.2.

Densidade visual é o sinal de intenção no código. Uma linha em branco separa grupos lógicos.
Zero linhas dentro de um grupo. Nunca duas linhas em branco consecutivas. O olho lê o código
como parágrafos — cada parágrafo é uma fase da função.

## Parede de código

<details>
<summary>❌ Bad — sem separação entre fases</summary>
<br>

```kotlin
fun processPayment(request: PaymentRequest): Result<Receipt> {
    val user = userRepository.findById(request.userId)
        ?: return Result.failure(UserNotFoundError(request.userId))
    val method = paymentMethodRepository.findById(request.methodId)
        ?: return Result.failure(InvalidPaymentMethodError(request.methodId))
    if (method.isExpired) {
        return Result.failure(ExpiredPaymentMethodError())
    }
    val charge = chargeGateway.charge(method, request.amount)
    val receipt = Receipt(userId = request.userId, amount = request.amount, chargeId = charge.id)
    receiptRepository.save(receipt)
    return Result.success(receipt)
}
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas por linha em branco</summary>
<br>

```kotlin
fun processPayment(request: PaymentRequest): Result<Receipt> {
    val user = userRepository.findById(request.userId)
        ?: return Result.failure(UserNotFoundError(request.userId))

    val method = paymentMethodRepository.findById(request.methodId)
        ?: return Result.failure(InvalidPaymentMethodError(request.methodId))

    if (method.isExpired) {
        return Result.failure(ExpiredPaymentMethodError())
    }

    val charge = chargeGateway.charge(method, request.amount)

    val receipt = Receipt(userId = request.userId, amount = request.amount, chargeId = charge.id)
    receiptRepository.save(receipt)

    return Result.success(receipt)
}
```

</details>

## Explaining Return — tight

O explaining return é a última linha da função. Atribui o resultado a uma `val` e retorna
na linha seguinte, sem linha em branco entre eles.

<details>
<summary>❌ Bad — blank entre val e return (explaining return com espaço)</summary>
<br>

```kotlin
fun buildWelcomeMessage(user: User): String {
    val greeting = "Hello, ${user.firstName}! Your account is ready."

    return greeting
}
```

</details>

<br>

<details>
<summary>✅ Good — val + return sem blank (explaining return tight)</summary>
<br>

```kotlin
fun buildWelcomeMessage(user: User): String {
    val greeting = "Hello, ${user.firstName}! Your account is ready."
    return greeting
}
```

</details>

## Órfão de 1 — evitar bloco solitário

Um único statement isolado parece "esquecido". Três atomics curtos ficam juntos; quatro ou mais
viram dois grupos de dois.

<details>
<summary>❌ Bad — statement isolado no topo</summary>
<br>

```kotlin
fun activateAccount(userId: Long) {
    val user = userRepository.findById(userId) ?: return

    user.isActive = true
    user.activatedAt = Instant.now()
    userRepository.save(user)
    auditLog.record(userId, "account_activated")
}
```

</details>

<br>

<details>
<summary>✅ Good — guard + grupo de ação bem dividido</summary>
<br>

```kotlin
fun activateAccount(userId: Long) {
    val user = userRepository.findById(userId) ?: return

    user.isActive = true
    user.activatedAt = Instant.now()

    userRepository.save(user)
    auditLog.record(userId, "account_activated")
}
```

</details>

## Chains longas

Chains longas quebram por linha, uma operação por linha.

<details>
<summary>❌ Bad — chain em uma linha só</summary>
<br>

```kotlin
val result = orders.filter { it.isPaid }.sortedByDescending { it.createdAt }.take(5).map { it.toSummary() }
```

</details>

<br>

<details>
<summary>✅ Good — uma operação por linha</summary>
<br>

```kotlin
val recentPaidSummaries = orders
    .filter { it.isPaid }
    .sortedByDescending { it.createdAt }
    .take(5)
    .map { it.toSummary() }

return recentPaidSummaries
```

</details>

## Data classes e inicialização

<details>
<summary>❌ Bad — construção de objeto inline com lógica</summary>
<br>

```kotlin
return Order(
    userId = userId,
    items = items.filter { it.stock > 0 },
    total = items.filter { it.stock > 0 }.sumOf { it.price * it.quantity },
    createdAt = Instant.now(),
)
```

</details>

<br>

<details>
<summary>✅ Good — lógica extraída antes da construção</summary>
<br>

```kotlin
val availableItems = items.filter { it.stock > 0 }
val total = availableItems.sumOf { it.price * it.quantity }

val order = Order(
    userId = userId,
    items = availableItems,
    total = total,
    createdAt = Instant.now(),
)

return order
```

</details>
