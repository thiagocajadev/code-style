# Async

> Escopo: Kotlin 2.2, kotlinx.coroutines 1.9.

`suspend` é a palavra-chave que marca uma função que pode suspender a execução sem bloquear
a thread. O compilador transforma funções `suspend` em máquinas de estado eficientes.

→ Primitivas de concorrência (Flow, Channel, supervisorScope): [coroutines.md](coroutines.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `suspend` | marca função que pode suspender sem bloquear a thread |
| `withContext` | muda o `Dispatcher` da coroutine atual sem criar novo escopo |
| `Dispatchers.IO` | pool de threads otimizado para I/O bloqueante (banco, disco, rede) |
| `Dispatchers.Default` | pool de threads para CPU-bound (cálculo, parsing) |
| `Dispatchers.Main` | thread principal; UI updates no Android |
| `timeout` | cancela a coroutine se o tempo limite for excedido |

## Bloqueio de thread em suspend function

<details>
<summary>❌ Ruim: Thread.sleep() bloqueia a thread da coroutine</summary>

```kotlin
suspend fun retryWithDelay(block: suspend () -> Unit) {
    block()
    Thread.sleep(1000)   // bloqueia a thread
    block()
}
```

</details>

<details>
<summary>✅ Bom: delay() suspende sem bloquear</summary>

```kotlin
suspend fun retryWithDelay(block: suspend () -> Unit) {
    block()
    delay(1_000)
    block()
}
```

</details>

## I/O sem withContext

<details>
<summary>❌ Ruim: JDBC no Main dispatcher (travaria a UI)</summary>

```kotlin
suspend fun findOrder(id: Long): Order {
    return jdbcTemplate.queryForObject("SELECT ...", id)   // I/O bloqueante sem troca de dispatcher
}
```

</details>

<details>
<summary>✅ Bom: withContext(Dispatchers.IO) isola o I/O bloqueante</summary>

```kotlin
suspend fun findOrder(id: Long): Order {
    val order = withContext(Dispatchers.IO) {
        jdbcTemplate.queryForObject("SELECT ...", id)
    }

    return order
}
```

</details>

## Timeout em operações externas

<details>
<summary>❌ Ruim: sem limite de tempo em chamada externa</summary>

```kotlin
suspend fun fetchExchangeRate(currency: String): Double {
    return httpClient.get("https://api.rates.io/latest/$currency").body()
}
```

</details>

<details>
<summary>✅ Bom: withTimeout cancela se exceder o prazo</summary>

```kotlin
suspend fun fetchExchangeRate(currency: String): Double {
    val rate = withTimeout(3_000) {
        httpClient.get("https://api.rates.io/latest/$currency").body<ExchangeRateResponse>()
    }

    return rate.value
}
```

</details>

## Propagação de cancelamento

<details>
<summary>❌ Ruim: try/catch engole CancellationException</summary>

```kotlin
suspend fun loadData(): Data {
    return try {
        repository.fetchData()
    } catch (e: Exception) {
        logger.error("Failed", e)
        Data.empty()
    }
}
```

</details>

<details>
<summary>✅ Bom: CancellationException é relançada</summary>

```kotlin
suspend fun loadData(): Data {
    return try {
        repository.fetchData()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        logger.error("Failed to load data", e)
        Data.empty()
    }
}
```

</details>

## runCatching para resultado tipado

<details>
<summary>❌ Ruim: try/catch na camada errada retorna null</summary>

```kotlin
suspend fun findUser(id: Long): User? {
    return try {
        userRepository.findById(id)
    } catch (e: Exception) {
        null
    }
}
```

</details>

<details>
<summary>✅ Bom: Result propaga contexto do erro</summary>

```kotlin
suspend fun findUser(id: Long): Result<User> {
    return runCatching { userRepository.findById(id) }
}

// consumo
val result = userService.findUser(userId)
result.onSuccess { user -> renderProfile(user) }
result.onFailure { error -> showError(error.message) }
```

</details>
