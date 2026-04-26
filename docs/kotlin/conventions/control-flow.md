# Control Flow

> Escopo: Kotlin 2.2.

Fluxo limpo sai cedo na falha, nunca aninha o caminho feliz. `when` substitui chains de
`if/else if`. `?.let` e `?:` eliminam blocos de null-check. Máximo dois níveis de indentação.

## if-expression — atribuição de 2 valores

`if/else` em Kotlin é uma expressão que retorna valor — substitui o ternário `? :` de outras
linguagens. Limite: 2 alternativas. Três ou mais → `when`.

<details>
<summary>❌ Bad — if/else imperativo para atribuição simples</summary>
<br>

```kotlin
var label: String
if (order.isPaid) {
    label = "Paid"
} else {
    label = "Pending"
}
```

</details>

<br>

<details>
<summary>✅ Good — if-expression na atribuição</summary>
<br>

```kotlin
val label = if (order.isPaid) "Paid" else "Pending"
```

</details>

<details>
<summary>❌ Bad — if-expression aninhada para 3+ alternativas</summary>
<br>

```kotlin
val label = if (score >= 90) "A" else if (score >= 80) "B" else if (score >= 70) "C" else "F"
```

</details>

<br>

<details>
<summary>✅ Good — when para 3+ alternativas</summary>
<br>

```kotlin
val label = when {
    score >= 90 -> "A"
    score >= 80 -> "B"
    score >= 70 -> "C"
    else -> "F"
}
```

</details>

## Guard clauses — retorno antecipado

<details>
<summary>❌ Bad — lógica principal aninhada</summary>
<br>

```kotlin
fun processOrder(order: Order?): Result<Invoice> {
    if (order != null) {
        if (order.isPaid) {
            if (order.items.isNotEmpty()) {
                val invoice = generateInvoice(order)
                return Result.success(invoice)
            } else {
                return Result.failure(EmptyOrderError())
            }
        } else {
            return Result.failure(UnpaidOrderError())
        }
    } else {
        return Result.failure(NullOrderError())
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — guards eliminam aninhamento</summary>
<br>

```kotlin
fun processOrder(order: Order?): Result<Invoice> {
    if (order == null) {
        return Result.failure(NullOrderError())
    }

    if (!order.isPaid) {
        return Result.failure(UnpaidOrderError())
    }

    if (order.items.isEmpty()) {
        return Result.failure(EmptyOrderError())
    }

    val invoice = generateInvoice(order)

    return Result.success(invoice)
}
```

</details>

## Aninhamento em cascata

<details>
<summary>❌ Bad — else após return</summary>
<br>

```kotlin
fun classify(score: Int): String {
    if (score >= 90) {
        return "A"
    } else if (score >= 80) {
        return "B"
    } else if (score >= 70) {
        return "C"
    } else {
        return "F"
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — when como expressão</summary>
<br>

```kotlin
fun classify(score: Int): String {
    return when {
        score >= 90 -> "A"
        score >= 80 -> "B"
        score >= 70 -> "C"
        else -> "F"
    }
}
```

</details>

## `when` como lookup

<details>
<summary>❌ Bad — chain de if/else para mapeamento de valor</summary>
<br>

```kotlin
fun describeStatus(status: OrderStatus): String {
    if (status == OrderStatus.PENDING) {
        return "Waiting for payment"
    } else if (status == OrderStatus.PROCESSING) {
        return "Being prepared"
    } else if (status == OrderStatus.SHIPPED) {
        return "On the way"
    } else {
        return "Unknown"
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — when exaustivo com sealed class</summary>
<br>

```kotlin
fun describeStatus(status: OrderStatus): String {
    return when (status) {
        OrderStatus.PENDING -> "Waiting for payment"
        OrderStatus.PROCESSING -> "Being prepared"
        OrderStatus.SHIPPED -> "On the way"
        OrderStatus.DELIVERED -> "Delivered"
    }
}
```

</details>

## Elvis como guard clause

<details>
<summary>❌ Bad — null-check verboso com if</summary>
<br>

```kotlin
fun findCustomerEmail(customerId: Long): String {
    val customer = repository.findById(customerId)
    if (customer == null) {
        return "unknown@email.com"
    }
    return customer.email
}
```

</details>

<br>

<details>
<summary>✅ Good — elvis direto</summary>
<br>

```kotlin
fun findCustomerEmail(customerId: Long): String {
    val customer = repository.findById(customerId)
        ?: return "unknown@email.com"

    return customer.email
}
```

</details>

## `?.let` para bloco condicional null-safe

<details>
<summary>❌ Bad — null-check explícito antes de bloco</summary>
<br>

```kotlin
val discount = order.promotion
if (discount != null) {
    applyDiscount(order, discount)
    logDiscount(discount)
}
```

</details>

<br>

<details>
<summary>✅ Good — let executa somente quando não-null</summary>
<br>

```kotlin
order.promotion?.let { discount ->
    applyDiscount(order, discount)
    logDiscount(discount)
}
```

</details>

## Smart cast

Após verificação de tipo, o compilador converte automaticamente — sem cast manual.

<details>
<summary>❌ Bad — cast manual desnecessário</summary>
<br>

```kotlin
fun describeShape(shape: Shape): String {
    if (shape is Circle) {
        val circle = shape as Circle
        return "Circle with radius ${circle.radius}"
    }
    return "Unknown shape"
}
```

</details>

<br>

<details>
<summary>✅ Good — smart cast automático</summary>
<br>

```kotlin
fun describeShape(shape: Shape): String {
    if (shape is Circle) {
        return "Circle with radius ${shape.radius}"
    }

    return "Unknown shape"
}
```

</details>

## Circuit break

Antes de escrever um loop, verifique se `firstOrNull`, `any` ou `all` já resolve. Essas funções
param no primeiro match — sem percorrer o resto.

<details>
<summary>❌ Bad — loop com flag percorre tudo mesmo após encontrar</summary>
<br>

```kotlin
var expiredProduct: Product? = null

for (product in products) {
    if (expiredProduct == null && product.isExpired) {
        expiredProduct = product // continua iterando mesmo após encontrar
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — firstOrNull sai no primeiro match</summary>
<br>

```kotlin
// para no primeiro match
val expiredProduct = products.firstOrNull { it.isExpired }

// para no primeiro true
val hasExpired = products.any { it.isExpired }

// para no primeiro false
val allActive = products.all { it.isActive }
```

</details>

## Iteração

<details>
<summary>❌ Bad — índice manual quando não necessário</summary>
<br>

```kotlin
for (i in 0 until items.size) {
    println(items[i].name)
}
```

</details>

<br>

<details>
<summary>✅ Good — for idiomático ou operações de coleção</summary>
<br>

```kotlin
for (item in items) {
    println(item.name)
}

// quando índice é necessário
for ((index, item) in items.withIndex()) {
    println("$index: ${item.name}")
}

// transformação: preferir funções de coleção
val names = items.map { it.name }
```

</details>

## while

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice, `while`
é a escolha natural.

<details>
<summary>❌ Bad — for com índice quando o critério é condição de estado</summary>
<br>

```kotlin
for (attempt in 0 until maxAttempts) {
    val connection = connectToDatabase()
    if (connection.isReady) break  // o índice não representa nada aqui
}
```

</details>

<br>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>
<br>

```kotlin
var attempt = 0

while (attempt < maxAttempts) {
    val connection = connectToDatabase()
    if (connection.isReady) break

    attempt++
}
```

</details>

## do-while

Use `do-while` quando a primeira iteração deve sempre executar, independente da condição.

<details>
<summary>❌ Bad — while quando a fila deve processar ao menos um item</summary>
<br>

```kotlin
// verifica antes de executar — se a fila já estiver vazia, nunca executa
while (taskQueue.isNotEmpty()) {
    val task = taskQueue.dequeue()
    executeTask(task)
}
```

</details>

<br>

<details>
<summary>✅ Good — do-while quando a primeira execução é garantida</summary>
<br>

```kotlin
// drena a fila — processa pelo menos um item antes de verificar
do {
    val task = taskQueue.dequeue()
    executeTask(task)
} while (taskQueue.isNotEmpty())
```

</details>
