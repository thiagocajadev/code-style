# Naming

> Escopo: Kotlin 2.2.

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```kotlin
fun apply(x: Any, p: Map<String, Any>, c: (Any) -> Any): Any {
    if (p["inadimplente"] == true) {
        return Unit
    }
    return c(x)
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```kotlin
fun applyDiscount(order: Order, calculate: (Order) -> Order): Order? {
    if (order.customer.hasDefaulted) {
        return null
    }

    val discountedOrder = calculate(order)

    return discountedOrder
}
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — identificadores em português ficam desajeitados no idioma Kotlin</summary>
<br>

```kotlin
val nomeDoUsuario = "Alice"
val listaDeIds = listOf(1, 2, 3)

fun retornaUsuario(id: Long): User? { ... }
fun buscaEnderecoDoCliente(id: Long): Address? { ... }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```kotlin
val userName = "Alice"
val idList = listOf(1, 2, 3)

fun findUser(userId: Long): User? { ... }
fun findCustomerAddress(customerId: Long): Address? { ... }
```

</details>

## Convenções de case

| Contexto | Convenção | Exemplos |
| --- | --- | --- |
| Classes, interfaces, enums, objects | `PascalCase` | `UserService`, `PaymentResult` |
| Funções, propriedades, variáveis | `camelCase` | `calculateTotal`, `isActive` |
| Constantes top-level ou em companion | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Parâmetros de tipo | `PascalCase` simples | `T`, `K`, `V` |
| Pacotes | `lowercase` sem underscores | `com.acme.order` |

<details>
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```kotlin
val MAX_retries = 3              // mistura de case
fun Calculate_Total(): Double    // underscore em função
class order_service              // tipo com underscore

val UserName = "Alice"           // var com PascalCase
```

</details>

<br>

<details>
<summary>✅ Good — convenções Kotlin respeitadas</summary>
<br>

```kotlin
const val MAX_RETRIES = 3

fun calculateTotal(): Double { ... }

class OrderService

val userName = "Alice"
```

</details>

## Ordem semântica

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```kotlin
fun getUserProfile(userId: Long): UserProfile { ... }   // correto, mas mostrando o anti-padrão abaixo:

fun getProfileUser(userId: Long): UserProfile { ... }
fun updateStatusOrder(orderId: Long) { ... }
fun totalCalculateInvoice(invoiceId: Long): Double { ... }
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```kotlin
fun getUserProfile(userId: Long): UserProfile { ... }
fun updateOrderStatus(orderId: Long) { ... }
fun calculateInvoiceTotal(invoiceId: Long): Double { ... }
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage não dizem nada</summary>
<br>

```kotlin
fun handle(data: Any) { }
fun process(input: Any) { }
fun manage(items: List<Any>) { }
fun doStuff(x: Any) { }
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```kotlin
fun validatePayment(payment: Payment): Result<Unit> { ... }
fun calculateOrderTotal(items: List<Item>): Double { ... }
fun notifyCustomerDefault(order: Order) { ... }
fun applySeasonalDiscount(order: Order): Order { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```kotlin
val loading = true
val active = user.status == "active"
val valid = email.contains("@")
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```kotlin
val isActive = user.status == "active"
val hasPermission = user.roles.contains("admin")

val canDelete = isActive && hasPermission
val shouldRetry = attempt < MAX_RETRIES
```

</details>

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de onde a operação acontece.

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```kotlin
fun callStripe(amount: Double): Result<Unit> { ... }
fun getUserFromDB(userId: Long): User? { ... }
fun postToSlack(message: String) { ... }
fun saveToS3(file: ByteArray) { ... }
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```kotlin
fun chargeCustomer(amount: Double): Result<Unit> { ... }
fun findUser(userId: Long): User? { ... }
fun notifyTeam(message: String) { ... }
fun archiveDocument(file: ByteArray) { ... }
```

</details>
