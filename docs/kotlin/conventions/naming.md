# Naming

> Escopo: Kotlin 2.2.

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **camelCase** (camelo minúsculo) | funções, métodos, variáveis e parâmetros — primeira letra minúscula |
| **PascalCase** (camelo maiúsculo) | classes, interfaces, enums, objects e type aliases — primeira letra maiúscula |
| **SCREAMING_SNAKE_CASE** (maiúsculas com sublinhado) | `const val` em top-level ou `companion object` |
| **file naming** (nome de arquivo) | nome do arquivo reflete a classe principal em PascalCase (`OrderService.kt`) |
| **package naming** (nome de pacote) | minúsculas, sem underscore, hierárquico por domínio (`com.acme.order`) |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `can`, `should` revelam intenção em variáveis e métodos lógicos |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```kotlin
fun apply(x: Any, p: Map<String, Any>, c: (Any) -> Any): Any {
    if (p["inadimplente"] == true) {
        return Unit
    }
    return c(x)
}
```

</details>

<details>
<summary>✅ Bom</summary>

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
<summary>❌ Ruim — identificadores em português ficam desajeitados no idioma Kotlin</summary>

```kotlin
val nomeDoUsuario = "Alice"
val listaDeIds = listOf(1, 2, 3)

fun retornaUsuario(id: Long): User? { ... }
fun buscaEnderecoDoCliente(id: Long): Address? { ... }
```

</details>

<details>
<summary>✅ Bom — inglês: curto, direto, universal</summary>

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
<summary>❌ Ruim — case errado para o contexto</summary>

```kotlin
val MAX_retries = 3              // mistura de case
fun Calculate_Total(): Double    // underscore em função
class order_service              // tipo com underscore

val UserName = "Alice"           // var com PascalCase
```

</details>

<details>
<summary>✅ Bom — convenções Kotlin respeitadas</summary>

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
<summary>❌ Ruim — ordem invertida</summary>

```kotlin
fun getUserProfile(userId: Long): UserProfile { ... }   // correto, mas mostrando o anti-padrão abaixo:

fun getProfileUser(userId: Long): UserProfile { ... }
fun updateStatusOrder(orderId: Long) { ... }
fun totalCalculateInvoice(invoiceId: Long): Double { ... }
```

</details>

<details>
<summary>✅ Bom — ordem natural</summary>

```kotlin
fun getUserProfile(userId: Long): UserProfile { ... }
fun updateOrderStatus(orderId: Long) { ... }
fun calculateInvoiceTotal(invoiceId: Long): Double { ... }
```

</details>

## Verbos genéricos

<details>
<summary>❌ Ruim — handle, process, manage não dizem nada</summary>

```kotlin
fun handle(data: Any) { }
fun process(input: Any) { }
fun manage(items: List<Any>) { }
fun doStuff(x: Any) { }
```

</details>

<details>
<summary>✅ Bom — verbo de intenção</summary>

```kotlin
fun validatePayment(payment: Payment): Result<Unit> { ... }
fun calculateOrderTotal(items: List<Item>): Double { ... }
fun notifyCustomerDefault(order: Order) { ... }
fun applySeasonalDiscount(order: Order): Order { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim — booleanos sem prefixo semântico</summary>

```kotlin
val loading = true
val active = user.status == "active"
val valid = email.contains("@")
```

</details>

<details>
<summary>✅ Bom — prefixos is, has, can, should</summary>

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
<summary>❌ Ruim — nome revela infraestrutura, não domínio</summary>

```kotlin
fun callStripe(amount: Double): Result<Unit> { ... }
fun getUserFromDB(userId: Long): User? { ... }
fun postToSlack(message: String) { ... }
fun saveToS3(file: ByteArray) { ... }
```

</details>

<details>
<summary>✅ Bom — nome fala a linguagem do negócio</summary>

```kotlin
fun chargeCustomer(amount: Double): Result<Unit> { ... }
fun findUser(userId: Long): User? { ... }
fun notifyTeam(message: String) { ... }
fun archiveDocument(file: ByteArray) { ... }
```

</details>
