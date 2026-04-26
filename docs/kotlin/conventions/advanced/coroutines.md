# Coroutines

> Escopo: Kotlin 2.2, kotlinx.coroutines 1.9.

Coroutines são a primitiva de concorrência do Kotlin. Structured concurrency garante que toda
coroutine tem escopo, cancelamento e espera definidos — sem goroutines soltas ou leaks de memória.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `CoroutineScope` | escopo que define o ciclo de vida das coroutines filhas |
| `launch` | inicia coroutine fire-and-forget dentro de um escopo |
| `async`/`await` | inicia coroutine com valor futuro; `await()` suspende até o resultado |
| `Flow` | stream assíncrono e reativo; cold por padrão — executa ao coletar |
| `StateFlow` | `Flow` hot com estado atual sempre disponível |
| `Dispatchers` | escolha de thread pool: `IO`, `Default`, `Main`, `Unconfined` |
| **structured concurrency** | filhos não sobrevivem ao pai; cancelamento se propaga hierarquicamente |

## Coroutine solta — sem escopo definido

<details>
<summary>❌ Bad — GlobalScope vaza ciclo de vida</summary>
<br>

```kotlin
fun loadUser(userId: Long) {
    GlobalScope.launch {
        val user = userRepository.findById(userId)
        updateUI(user)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — escopo vinculado ao ciclo de vida</summary>
<br>

```kotlin
class UserViewModel(
    private val userRepository: UserRepository,
) : ViewModel() {

    fun loadUser(userId: Long) {
        viewModelScope.launch {
            val user = userRepository.findById(userId)
            updateUI(user)
        }
    }
}
```

</details>

## `async`/`await` mal usado

<details>
<summary>❌ Bad — async sequencial não tem ganho de paralelismo</summary>
<br>

```kotlin
suspend fun loadDashboard(userId: Long): Dashboard {
    val orders = async { orderRepository.findByUser(userId) }.await()
    val profile = async { profileRepository.findById(userId) }.await()

    return Dashboard(orders = orders, profile = profile)
}
```

</details>

<br>

<details>
<summary>✅ Good — async antes do await permite execução paralela</summary>
<br>

```kotlin
suspend fun loadDashboard(userId: Long): Dashboard {
    val ordersDeferred = async { orderRepository.findByUser(userId) }
    val profileDeferred = async { profileRepository.findById(userId) }

    val orders = ordersDeferred.await()
    val profile = profileDeferred.await()

    return Dashboard(orders = orders, profile = profile)
}
```

</details>

## `withContext` para mudar dispatcher

<details>
<summary>❌ Bad — I/O no dispatcher Main (congela UI)</summary>
<br>

```kotlin
suspend fun saveOrder(order: Order) {
    orderRepository.save(order)   // I/O no Main thread
}
```

</details>

<br>

<details>
<summary>✅ Good — withContext isola o dispatcher de I/O</summary>
<br>

```kotlin
suspend fun saveOrder(order: Order) {
    withContext(Dispatchers.IO) {
        orderRepository.save(order)
    }
}
```

</details>

## Flow para streams de dados

<details>
<summary>❌ Bad — callback manual para stream de eventos</summary>
<br>

```kotlin
fun observeOrders(userId: Long, callback: (List<Order>) -> Unit) {
    orderRepository.registerObserver(userId, callback)
}
```

</details>

<br>

<details>
<summary>✅ Good — Flow tipado e cancelável</summary>
<br>

```kotlin
fun observeOrders(userId: Long): Flow<List<Order>> {
    return orderRepository.observeByUser(userId)
}

// coleta no ViewModel
viewModelScope.launch {
    orderService.observeOrders(userId)
        .catch { error -> handleError(error) }
        .collect { orders -> updateOrderList(orders) }
}
```

</details>

## StateFlow para estado de UI

<details>
<summary>❌ Bad — MutableLiveData com mutação direta</summary>
<br>

```kotlin
private val _orders = MutableLiveData<List<Order>>()
val orders: LiveData<List<Order>> = _orders

fun loadOrders() {
    _orders.value = orderRepository.findAll()
}
```

</details>

<br>

<details>
<summary>✅ Good — StateFlow com UiState sealed class</summary>
<br>

```kotlin
sealed class OrdersUiState {
    data object Loading : OrdersUiState()
    data class Success(val orders: List<Order>) : OrdersUiState()
    data class Error(val message: String) : OrdersUiState()
}

private val _uiState = MutableStateFlow<OrdersUiState>(OrdersUiState.Loading)
val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

fun loadOrders() {
    viewModelScope.launch {
        _uiState.value = OrdersUiState.Loading

        val result = runCatching { orderRepository.findAll() }

        _uiState.value = result.fold(
            onSuccess = { OrdersUiState.Success(it) },
            onFailure = { OrdersUiState.Error(it.message ?: "Unknown error") },
        )
    }
}
```

</details>

## supervisorScope para falhas independentes

<details>
<summary>❌ Bad — falha em um filho cancela todos os outros</summary>
<br>

```kotlin
suspend fun sendNotifications(users: List<User>) {
    coroutineScope {
        users.forEach { user ->
            launch { notificationService.send(user.email) }
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — supervisorScope isola falhas por filho</summary>
<br>

```kotlin
suspend fun sendNotifications(users: List<User>) {
    supervisorScope {
        users.forEach { user ->
            launch {
                runCatching { notificationService.send(user.email) }
                    .onFailure { logger.warn("Failed to notify ${user.email}: ${it.message}") }
            }
        }
    }
}
```

</details>
