# Types

> Escopo: Kotlin 2.2.

O sistema de tipos do Kotlin é expressivo por design. Data classes modelam dados. Sealed classes
fecham hierarquias de estados. Value classes eliminam alocação de wrappers. O compilador verifica
nulidade em tempo de compilação — sem NullPointerException em código idiomático.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `data class` | classe com `equals`, `hashCode`, `copy` e `toString` gerados automaticamente |
| `sealed class` | hierarquia fechada; o compilador garante exaustividade no `when` |
| `value class` (inline) | wrapper zero-overhead sobre um único valor primitivo |
| `object` | singleton declarado como tipo; estado compartilhado imutável |
| `companion object` | escopo associado à classe; substitui membros estáticos do Java |
| **NRT** (Null Reference Types) | `String?` é anulável; `String` nunca é null — verificado em compilação |

## Data class para modelos de dados

<details>
<summary>❌ Bad — classe manual com boilerplate</summary>
<br>

```kotlin
class User(val id: Long, val name: String, val email: String) {
    override fun equals(other: Any?): Boolean { ... }
    override fun hashCode(): Int { ... }
    override fun toString(): String { ... }
}
```

</details>

<br>

<details>
<summary>✅ Good — data class elimina o boilerplate</summary>
<br>

```kotlin
data class User(
    val id: Long,
    val name: String,
    val email: String,
)

// copy para modificação imutável
val updated = user.copy(email = "new@email.com")
```

</details>

## Sealed class para estados e resultados

<details>
<summary>❌ Bad — String como discriminante de estado</summary>
<br>

```kotlin
data class OrderResult(
    val status: String,   // "success", "error", "pending" — sem garantia de exaustividade
    val order: Order?,
    val errorMessage: String?,
)
```

</details>

<br>

<details>
<summary>✅ Good — sealed class: o compilador verifica todas as branches</summary>
<br>

```kotlin
sealed class OrderResult {
    data class Success(val order: Order) : OrderResult()
    data class Failure(val reason: String) : OrderResult()
    data object Pending : OrderResult()
}

// when exaustivo sem else
fun describeResult(result: OrderResult): String {
    return when (result) {
        is OrderResult.Success -> "Order ${result.order.id} confirmed"
        is OrderResult.Failure -> "Failed: ${result.reason}"
        OrderResult.Pending -> "Processing..."
    }
}
```

</details>

## Value class para wrappers tipados

<details>
<summary>❌ Bad — primitivo sem semântica, fácil de confundir</summary>
<br>

```kotlin
fun chargeCustomer(userId: Long, amount: Double) { ... }

// chamada ambígua: qual é userId e qual é amount?
chargeCustomer(100.0, 42L)  // compilador não pega
```

</details>

<br>

<details>
<summary>✅ Good — value class dá semântica sem overhead</summary>
<br>

```kotlin
@JvmInline
value class UserId(val value: Long)

@JvmInline
value class Amount(val value: Double)

fun chargeCustomer(userId: UserId, amount: Amount) { ... }

chargeCustomer(UserId(42L), Amount(100.0))
```

</details>

## Interface sobre herança

<details>
<summary>❌ Bad — herança para compartilhar comportamento</summary>
<br>

```kotlin
abstract class BaseRepository {
    fun logQuery(query: String) { ... }
    fun handleError(error: Exception): Nothing { ... }
}

class OrderRepository : BaseRepository() { ... }
class UserRepository : BaseRepository() { ... }
```

</details>

<br>

<details>
<summary>✅ Good — interface define contrato; comportamento via composição</summary>
<br>

```kotlin
interface OrderRepository {
    fun findById(id: Long): Order?
    fun save(order: Order)
}

class SqlOrderRepository(
    private val db: Database,
    private val logger: Logger,
) : OrderRepository {
    override fun findById(id: Long): Order? { ... }
    override fun save(order: Order) { ... }
}
```

</details>

## Generics com variância

<details>
<summary>❌ Bad — tipo genérico invariante força cast desnecessário</summary>
<br>

```kotlin
fun printAll(items: List<Any>) {
    for (item in items) {
        println(item)
    }
}

// não aceita List<String> diretamente sem cast
```

</details>

<br>

<details>
<summary>✅ Good — out-projection para leitura; in-projection para escrita</summary>
<br>

```kotlin
fun printAll(items: List<out Any>) {
    for (item in items) {
        println(item)
    }
}

// aceita List<String>, List<Int>, etc.
printAll(listOf("Alice", "Bob"))
```

</details>

## Companion object para factory

<details>
<summary>❌ Bad — construtor com lógica de criação</summary>
<br>

```kotlin
class Token(val value: String, val expiresAt: Instant) {
    constructor(value: String) : this(value, Instant.now().plusSeconds(3600))
}
```

</details>

<br>

<details>
<summary>✅ Good — companion object com factory method nomeado</summary>
<br>

```kotlin
class Token private constructor(
    val value: String,
    val expiresAt: Instant,
) {
    companion object {
        fun withDefaultExpiry(value: String): Token {
            val expiry = Instant.now().plusSeconds(3600)
            return Token(value = value, expiresAt = expiry)
        }
    }
}
```

</details>
