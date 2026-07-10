# Testing

> Escopo: Kotlin 2.2, JUnit 5, Kotest 5.9, MockK 1.13.

Testes seguem o padrão AAA (Arrange, Act, Assert · Arranjar, Agir, Atestar) com fases explícitas. Todo comportamento novo
ganha um teste; toda correção de bug ganha um teste de regressão. Coroutines têm suporte nativo
via `runTest`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | estrutura que separa setup, execução e verificação |
| **kotest** (framework de testes Kotlin) | asserções expressivas e estilos `Spec` (`StringSpec`, `BehaviorSpec`) |
| **mockk** (biblioteca de mocking) | mocks idiomáticos para Kotlin com suporte a `suspend`, `object` e `companion` |
| `runTest` | executor de coroutines em testes; controla tempo virtual com `advanceTimeBy` |
| **table-driven test** (teste guiado por tabela) | parametrização de cenários via `@ParameterizedTest` ou `forAll` do Kotest |

## Fases misturadas: AAA

<details>
<summary>❌ Ruim: setup, ação e assert misturados</summary>

```kotlin
@Test
fun testOrder() {
    val repo = mockk<OrderRepository>()
    every { repo.findById(1L) } returns Order(id = 1L, status = OrderStatus.SETTLED)
    val service = OrderService(repo)
    assertEquals(OrderStatus.SETTLED, service.findOrder(1L).getOrThrow().status)
}
```

</details>

<details>
<summary>✅ Bom: AAA explícito com nomes expressivos</summary>

```kotlin
@Test
fun `findOrder returns settled order when found`() {
    val settledOrder = Order(id = 1L, status = OrderStatus.SETTLED)
    val repository = mockk<OrderRepository> {
        every { findById(1L) } returns settledOrder
    }
    val service = OrderService(repository)
    val result = service.findOrder(1L)

    result shouldBeSuccess { order ->
        order.status shouldBe OrderStatus.SETTLED
    }
}
```

</details>

## Nomes de teste expressivos

<details>
<summary>❌ Ruim: nomes genéricos sem contexto</summary>

```kotlin
@Test
fun testValidate() { ... }

@Test
fun test2() { ... }

@Test
fun orderTest() { ... }
```

</details>

<details>
<summary>✅ Bom: backtick notation descreve comportamento</summary>

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
<summary>❌ Ruim: runBlocking não controla tempo virtual</summary>

```kotlin
@Test
fun testRetryWithDelay() = runBlocking {
    val service = NotificationService()
    service.retryWithDelay { sendNotification() }   // espera o delay real
}
```

</details>

<details>
<summary>✅ Bom: runTest com advanceTimeBy</summary>

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
<summary>❌ Ruim: stub genérico sem verificação de comportamento</summary>

```kotlin
@Test
fun testSendNotification() {
    val service = mockk<NotificationService>(relaxed = true)
    val handler = OrderHandler(service)

    handler.confirmOrder(order)

    // sem verificação: o teste não garante nada
}
```

</details>

<details>
<summary>✅ Bom: verify com exatamente o que deve ser chamado</summary>

```kotlin
@Test
fun `confirmOrder sends confirmation email to customer`() {
    val notificationService = mockk<NotificationService>()
    every { notificationService.send(any(), any()) } returns Unit
    val handler = OrderHandler(notificationService)
    val order = Order(id = 1L, customerEmail = "alice@email.com")
    handler.confirmOrder(order)

    verify(exactly = 1) {
        notificationService.send("alice@email.com", match { it.contains("confirmed") })
    }
}
```

</details>

## Testes parametrizados

<details>
<summary>❌ Ruim: testes duplicados com dados diferentes</summary>

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

<details>
<summary>✅ Bom: tabela de dados cobre todos os cenários</summary>

```kotlin
@ParameterizedTest
@CsvSource("0.0,true", "0.5,true", "1.0,true", "-0.1,false", "1.1,false")
fun `validateRate succeeds only for values in 0-1 range`(rate: Double, isValid: Boolean) {
    val result = validateRate(rate)
    result.isSuccess shouldBe isValid
}
```

</details>
