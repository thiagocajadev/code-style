# Performance

> Escopo: Kotlin 2.2, JVM.

Performance no JVM começa por não alocar o que não precisa. Funções inline eliminam o overhead
de lambdas. Sequências (Sequence) adiam operações em pipelines longos. `buildList`/`buildMap`
evitam cópias intermediárias.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **inline function** | compilador substitui a chamada pelo corpo da função — sem alocação de lambda |
| `Sequence` | stream lazy; operações só executam ao materializar com `toList`/`first`/etc. |
| `buildList` / `buildMap` | constroem coleções mutáveis internamente e retornam imutáveis — sem cópia final |
| `lazy` | inicializa propriedade na primeira leitura e armazena em cache |
| **escape analysis** | JVM detecta objetos que não saem do escopo e os aloca na stack |

## Operações encadeadas em listas grandes

<details>
<summary>❌ Bad — cada operação cria uma lista intermediária</summary>
<br>

```kotlin
fun findTopSpenders(customers: List<Customer>, limit: Int): List<String> {
    return customers
        .filter { it.totalSpent > 1000.0 }
        .map { it.name }
        .sorted()
        .take(limit)
}
```

</details>

<br>

<details>
<summary>✅ Good — Sequence processa elemento a elemento sem cópias intermediárias</summary>
<br>

```kotlin
fun findTopSpenders(customers: List<Customer>, limit: Int): List<String> {
    val topSpenderNames = customers.asSequence()
        .filter { it.totalSpent > 1000.0 }
        .map { it.name }
        .sorted()
        .take(limit)
        .toList()

    return topSpenderNames
}
```

</details>

## Lambda com alocação desnecessária

<details>
<summary>❌ Bad — lambda captura contexto, aloca objeto a cada chamada</summary>
<br>

```kotlin
fun <T> List<T>.forEachLogged(logger: Logger, action: (T) -> Unit) {
    forEach { item ->
        logger.debug("Processing $item")
        action(item)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — inline elimina alocação do lambda</summary>
<br>

```kotlin
inline fun <T> List<T>.forEachLogged(logger: Logger, action: (T) -> Unit) {
    forEach { item ->
        logger.debug("Processing $item")
        action(item)
    }
}
```

</details>

## buildList para construção com lógica

<details>
<summary>❌ Bad — mutableListOf + toList gera cópia extra</summary>
<br>

```kotlin
fun buildMenuItems(user: User): List<MenuItem> {
    val items = mutableListOf<MenuItem>()
    items.add(MenuItem.Home)
    items.add(MenuItem.Profile)
    if (user.isAdmin) {
        items.add(MenuItem.AdminPanel)
    }
    return items.toList()
}
```

</details>

<br>

<details>
<summary>✅ Good — buildList sem cópia final</summary>
<br>

```kotlin
fun buildMenuItems(user: User): List<MenuItem> {
    return buildList {
        add(MenuItem.Home)
        add(MenuItem.Profile)
        if (user.isAdmin) {
            add(MenuItem.AdminPanel)
        }
    }
}
```

</details>

## Inicialização custosa com lazy

<details>
<summary>❌ Bad — objeto pesado inicializado mesmo quando não usado</summary>
<br>

```kotlin
class ReportService {
    val pdfRenderer = PdfRenderer()   // inicializado no construtor sempre
}
```

</details>

<br>

<details>
<summary>✅ Good — lazy adia até o primeiro acesso</summary>
<br>

```kotlin
class ReportService {
    val pdfRenderer by lazy { PdfRenderer() }
}
```

</details>

## Benchmarks com kotlinx-benchmark

```kotlin
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
open class FilterBenchmark {

    private val customers = (1..10_000).map {
        Customer(id = it.toLong(), totalSpent = it.toDouble())
    }

    @Benchmark
    fun listFilter(): List<Customer> {
        return customers.filter { it.totalSpent > 5000.0 }
    }

    @Benchmark
    fun sequenceFilter(): List<Customer> {
        return customers.asSequence()
            .filter { it.totalSpent > 5000.0 }
            .toList()
    }
}
```

Execute: `./gradlew benchmark` — compare médias antes de otimizar.
