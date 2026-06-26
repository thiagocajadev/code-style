# Control Flow

> Escopo: Kotlin 2.2.

Fluxo limpo sai cedo na falha, nunca aninha o caminho feliz. `when` substitui chains de
`if/else if`. `?.let` e `?:` eliminam blocos de null-check. Máximo dois níveis de indentação.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **if-expression** (`if` como expressão) | `if/else` retorna valor; substitui o ternário de outras linguagens |
| **when** (despacho exaustivo) | substitui chains de `if/else if`; com sealed/enum o compilador exige cobrir todos os casos |
| **early return** (retorno antecipado) | sair da função assim que o resultado for conhecido, sem `else` desnecessário |
| **scope function** (função de escopo) | `let`, `run`, `also`, `apply`, `with`; operam dentro do contexto de um receptor |
| **Elvis operator** (operador Elvis, `?:`) | valor padrão ou retorno antecipado quando o lado esquerdo é `null` |
| **smart cast** (cast inteligente) | após verificação de tipo ou null em `if`/`when`, o compilador trata como o tipo testado |

## if-expression: atribuição de 2 valores

`if/else` em Kotlin é uma expressão que retorna valor. Substitui o ternário `? :` de outras
linguagens. Limite: 2 alternativas. Três ou mais → `when`.

<details>
<summary>❌ Ruim: if/else imperativo para atribuição simples</summary>

```kotlin
var label: String
if (order.isSettled) {
    label = "Settled"
} else {
    label = "Pending"
}
```

</details>

<details>
<summary>✅ Bom: if-expression na atribuição</summary>

```kotlin
val label = if (order.isSettled) "Settled" else "Pending"
```

</details>

<details>
<summary>❌ Ruim: if-expression aninhada para 3+ alternativas</summary>

```kotlin
val label = if (score >= 90) "A" else if (score >= 80) "B" else if (score >= 70) "C" else "F"
```

</details>

<details>
<summary>✅ Bom: when para 3+ alternativas</summary>

```kotlin
val label = when {
    score >= 90 -> "A"
    score >= 80 -> "B"
    score >= 70 -> "C"
    else -> "F"
}
```

</details>

## Guard clauses: retorno antecipado

<details>
<summary>❌ Ruim: lógica principal aninhada</summary>

```kotlin
fun processOrder(order: Order?): Result<Invoice> {
    if (order != null) {
        if (order.isSettled) {
            if (order.items.isNotEmpty()) {
                val invoice = generateInvoice(order)
                return Result.success(invoice)
            } else {
                return Result.failure(EmptyOrderError())
            }
        } else {
            return Result.failure(UnsettledOrderError())
        }
    } else {
        return Result.failure(NullOrderError())
    }
}
```

</details>

<details>
<summary>✅ Bom: guards eliminam aninhamento</summary>

```kotlin
fun processOrder(order: Order?): Result<Invoice> {
    if (order == null) {
        return Result.failure(NullOrderError())
    }

    if (!order.isSettled) {
        return Result.failure(UnsettledOrderError())
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
<summary>❌ Ruim: else após return</summary>

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

<details>
<summary>✅ Bom: when como expressão</summary>

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
<summary>❌ Ruim: chain de if/else para mapeamento de valor</summary>

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

<details>
<summary>✅ Bom: when exaustivo com sealed class</summary>

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
<summary>❌ Ruim: null-check verboso com if</summary>

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

<details>
<summary>✅ Bom: elvis direto</summary>

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
<summary>❌ Ruim: null-check explícito antes de bloco</summary>

```kotlin
val discount = order.promotion
if (discount != null) {
    applyDiscount(order, discount)
    logDiscount(discount)
}
```

</details>

<details>
<summary>✅ Bom: let executa somente quando não-null</summary>

```kotlin
order.promotion?.let { discount ->
    applyDiscount(order, discount)
    logDiscount(discount)
}
```

</details>

## Smart cast

Após verificação de tipo, o compilador converte automaticamente, sem cast manual.

<details>
<summary>❌ Ruim: cast manual desnecessário</summary>

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

<details>
<summary>✅ Bom: smart cast automático</summary>

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
param no primeiro match, sem percorrer o resto.

<details>
<summary>❌ Ruim: loop com flag percorre tudo mesmo após encontrar</summary>

```kotlin
var expiredProduct: Product? = null

for (product in products) {
    if (expiredProduct == null && product.isExpired) {
        expiredProduct = product // continua iterando mesmo após encontrar
    }
}
```

</details>

<details>
<summary>✅ Bom: firstOrNull sai no primeiro match</summary>

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
<summary>❌ Ruim: índice manual quando não necessário</summary>

```kotlin
for (i in 0 until items.size) {
    println(items[i].name)
}
```

</details>

<details>
<summary>✅ Bom: for idiomático ou operações de coleção</summary>

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
<summary>❌ Ruim: for com índice quando o critério é condição de estado</summary>

```kotlin
for (attempt in 0 until maxAttempts) {
    val connection = connectToDatabase()
    if (connection.isReady) break  // o índice não representa nada aqui
}
```

</details>

<details>
<summary>✅ Bom: while para condição de parada por estado</summary>

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
<summary>❌ Ruim: while quando a fila deve processar ao menos um item</summary>

```kotlin
// verifica antes de executar: se a fila já estiver vazia, nunca executa
while (taskQueue.isNotEmpty()) {
    val task = taskQueue.dequeue()
    executeTask(task)
}
```

</details>

<details>
<summary>✅ Bom: do-while quando a primeira execução é garantida</summary>

```kotlin
// drena a fila: processa pelo menos um item antes de verificar
do {
    val task = taskQueue.dequeue()
    executeTask(task)
} while (taskQueue.isNotEmpty())
```

</details>
