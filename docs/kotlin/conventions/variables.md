# Variables

> Escopo: Kotlin 2.2.

Kotlin faz imutabilidade a escolha padrão. `val` declara referência não reatribuível; `var`
declara referência mutável. Prefira `val` e escreva `var` somente quando o fluxo exige.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `val` | referência que não pode ser reatribuída após a inicialização |
| `var` | referência que pode ser reatribuída |
| `const val` | constante resolvida em tempo de compilação; só em top-level ou `companion object` |
| `lazy` | inicialização adiada; calculada na primeira leitura, depois em cache |
| **smart cast** | cast automático feito pelo compilador após verificação de tipo |

## `var` onde `val` resolve

<details>
<summary>❌ Bad — var desnecessário</summary>
<br>

```kotlin
var total = 0.0
total = items.sumOf { it.price }

var isActive = false
isActive = user.status == "active"
```

</details>

<br>

<details>
<summary>✅ Good — val com inicialização direta</summary>
<br>

```kotlin
val total = items.sumOf { it.price }

val isActive = user.status == "active"
```

</details>

## `const val` para constantes de compilação

<details>
<summary>❌ Bad — número mágico inline</summary>
<br>

```kotlin
fun shouldRetry(attempt: Int): Boolean {
    return attempt < 3
}
```

</details>

<br>

<details>
<summary>✅ Good — constante nomeada</summary>
<br>

```kotlin
private const val MAX_RETRIES = 3

fun shouldRetry(attempt: Int): Boolean {
    return attempt < MAX_RETRIES
}
```

</details>

## `by lazy` para inicialização custosa

<details>
<summary>❌ Bad — recalcula em cada acesso</summary>
<br>

```kotlin
class ReportService {
    val header = buildExpensiveHeader()
}
```

</details>

<br>

<details>
<summary>✅ Good — inicializa apenas quando acessado</summary>
<br>

```kotlin
class ReportService {
    val header by lazy { buildExpensiveHeader() }
}
```

</details>

## Valores mágicos

<details>
<summary>❌ Bad — literais inline sem contexto</summary>
<br>

```kotlin
if (user.role == "admin") { ... }

Thread.sleep(5000)

val discount = price * 0.15
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas com intenção</summary>
<br>

```kotlin
private const val ADMIN_ROLE = "admin"
private const val RETRY_DELAY_MS = 5_000L
private const val SEASONAL_DISCOUNT_RATE = 0.15

if (user.role == ADMIN_ROLE) { ... }

delay(RETRY_DELAY_MS)

val discount = price * SEASONAL_DISCOUNT_RATE
```

</details>

## Destructuring declarations

<details>
<summary>❌ Bad — acesso por índice ou nome repetido</summary>
<br>

```kotlin
val pair = Pair("Alice", 30)
val name = pair.first
val age = pair.second

for (entry in map.entries) {
    println("${entry.key}: ${entry.value}")
}
```

</details>

<br>

<details>
<summary>✅ Good — destructuring que nomeia o conteúdo</summary>
<br>

```kotlin
val (name, age) = Pair("Alice", 30)

for ((key, value) in map) {
    println("$key: $value")
}
```

</details>

## Escopo de variável

Declare a variável no escopo mais restrito possível.

<details>
<summary>❌ Bad — variável declarada antes do escopo real</summary>
<br>

```kotlin
var message: String

if (order.isPaid) {
    message = "Payment confirmed"
} else {
    message = "Payment pending"
}

sendNotification(message)
```

</details>

<br>

<details>
<summary>✅ Good — val com when como expressão</summary>
<br>

```kotlin
val message = when {
    order.isPaid -> "Payment confirmed"
    else -> "Payment pending"
}

sendNotification(message)
```

</details>
