# Testing

> Escopo: Kotlin 2.2, JUnit 5, Kotest 5.9, MockK 1.13.

Testes seguem o padrão AAA (Arrange, Act, Assert, Arrumar, Agir, Atestar) com fases explícitas. Todo comportamento novo
ganha um teste; toda correção de bug ganha um teste de regressão. Coroutines têm suporte nativo
via `runTest`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert, Arrumar, Agir, Atestar) | estrutura que separa setup, execução e verificação |
| **kotest** | framework de asserções expressivas para Kotlin |
| **mockk** | biblioteca de mocking idiomática para Kotlin (suporte a `suspend`, `object`, `companion`) |
| `runTest` | executor de coroutines em testes; controla tempo virtual com `advanceTimeBy` |
| **table-driven test** | parametrização de cenários via `@ParameterizedTest` ou `forAll` do Kotest |

## Fases misturadas — AAA

<details>
<summary>❌ Bad — setup, ação e assert misturados</summary>
<br>

```kotlin
@Test
fun testOrder() {
    val repo = mockk<OrderRepository>()
    every { repo.findById(1L) } returns Order(id = 1L, status = OrderStatus.PAID)
    val service = OrderService(repo)
    assertEquals(OrderStatus.PAID, service.findOrder(1L).getOrThrow().status)
}
```

</details>

<br>

<details>
<summary>✅ Good — AAA explícito com nomes expressivos</summary>
<br>

```kotlin
@Test
fun `findOrder returns paid order when found`() {
    // Arrange
    val paidOrder = Order(id = 1L, status = OrderStatus.PAID)
    val repository = mockk<OrderRepository> {
        every { findById(1L) } returns paidOrder
    }
    val service = OrderService(repository)

    // Act
    val result = service.findOrder(1L)

    // Assert
    result shouldBeSuccess { order ->
        order.status shouldBe OrderStatus.PAID
    }
}
```

</details>

## Nomes de teste expressivos

<details>
<summary>❌ Bad — nomes genéricos sem contexto</summary>
<br>

```kotlin
@Test
fun testValidate() { ... }

@Test
fun test2() { ... }

@Test
fun orderTest() { ... }
```

</details>

<br>

<details>
<summary>✅ Good — backtick notation descreve comportamento</summary>
<br>

```kotlin
@Test
fun `validateOrder fails with EmptyCart when items list is empty`() { ... }

@Test
fun `submitOrder returns Success when user has sufficient credit`() { ... }

@Test
fun `applyDiscount throws when rate is outside 0-1 range`() { ... }
```

</details>

## Testes de coroutines com runTest

<details>
<summary>❌ Bad — runBlocking não controla tempo virtual</summary>
<br>

```kotlin
@Test
fun testRetryWithDelay() = runBlocking {
    val service = NotificationService()
    service.retryWithDelay { sendNotification() }   // espera o delay real
}
```

</details>

<br>

<details>
<summary>✅ Good — runTest com advanceTimeBy</summary>
<br>

```kotlin
@Test
fun `retryWithDelay retries after 1 second`() = runTest {
    var callCount = 0
    val service = NotificationService()

    service.retryWithDelay { callCount++ }

    advanceTimeBy(1_001)

    callCount shouldBe 2
}
```

</details>

## Mocking com mockk

<details>
<summary>❌ Bad — stub genérico sem verificação de comportamento</summary>
<br>

```kotlin
@Test
fun testSendNotification() {
    val service = mockk<NotificationService>(relaxed = true)
    val handler = OrderHandler(service)

    handler.confirmOrder(order)

    // sem verificação — o teste não garante nada
}
```

</details>

<br>

<details>
<summary>✅ Good — verify com exatamente o que deve ser chamado</summary>
<br>

```kotlin
@Test
fun `confirmOrder sends confirmation email to customer`() {
    // Arrange
    val notificationService = mockk<NotificationService>()
    every { notificationService.send(any(), any()) } returns Unit

    val handler = OrderHandler(notificationService)
    val order = Order(id = 1L, customerEmail = "alice@email.com")

    // Act
    handler.confirmOrder(order)

    // Assert
    verify(exactly = 1) {
        notificationService.send("alice@email.com", match { it.contains("confirmed") })
    }
}
```

</details>

## Testes parametrizados

<details>
<summary>❌ Bad — testes duplicados com dados diferentes</summary>
<br>

```kotlin
@Test
fun `rate 0 is valid`() {
    val result = validateRate(0.0)
    result.isSuccess shouldBe true
}

@Test
fun `rate 1 is valid`() {
    val result = validateRate(1.0)
    result.isSuccess shouldBe true
}

@Test
fun `rate -0_1 is invalid`() {
    val result = validateRate(-0.1)
    result.isFailure shouldBe true
}
```

</details>

<br>

<details>
<summary>✅ Good — tabela de dados cobre todos os cenários</summary>
<br>

```kotlin
@ParameterizedTest
@CsvSource("0.0,true", "0.5,true", "1.0,true", "-0.1,false", "1.1,false")
fun `validateRate succeeds only for values in 0-1 range`(rate: Double, isValid: Boolean) {
    val result = validateRate(rate)

    result.isSuccess shouldBe isValid
}
```

</details>
