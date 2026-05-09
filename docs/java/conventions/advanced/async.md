# Async

> Escopo: Java 25 LTS — Virtual Threads (Project Loom) + CompletableFuture.

Java 21+ torna I/O assíncrono simples: **virtual threads** (threads virtuais) permitem escrever
código bloqueante com throughput (vazão) de código reativo, sem callback hell
(inferno de callbacks).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **virtual threads** (threads virtuais) | threads leves gerenciadas pela JVM; bloquear é barato |
| **platform threads** (threads de plataforma) | threads do SO; bloquear em I/O desperdiça recurso caro |
| **throughput** (vazão) | número de operações concluídas por unidade de tempo |
| **CompletableFuture** | contêiner de resultado futuro; compõe operações assíncronas |
| **Structured Concurrency** (concorrência estruturada) | escopo que garante que todas as tarefas filhas encerrem antes do pai |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é processamento; não I/O |
| **I/O-bound** (limitado por entrada e saída) | operação cujo gargalo é rede, disco ou banco |

## Thread bloqueada desnecessariamente

Antes de virtual threads, threads de plataforma eram caras — bloquear em I/O desperdiçava
recursos. Com virtual threads, bloquear é barato e o código fica simples.

<details>
<summary>❌ Bad — CompletableFuture encadeado apenas para "não bloquear"</summary>
<br>

```java
public CompletableFuture<Invoice> processOrder(String orderId) {
    return CompletableFuture.supplyAsync(() -> orderRepository.findById(orderId))
        .thenApply(order -> applyDiscount(order))
        .thenCompose(order -> CompletableFuture.supplyAsync(() -> invoiceRepository.save(order)))
        .thenApply(invoice -> {
            notificationService.send(invoice);
            return invoice;
        });
}
```

</details>

<br>

<details>
<summary>✅ Good — virtual thread: código sequencial, throughput de I/O não bloqueante</summary>
<br>

```java
// application.yml: spring.threads.virtual.enabled=true (Spring Boot 4)
public Invoice processOrder(String orderId) {
    final var order = orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order " + orderId + " not found."));

    final var discountedOrder = applyDiscount(order);
    final var invoice = invoiceRepository.save(discountedOrder);

    notificationService.send(invoice);
    return invoice;
}
```

</details>

## CompletableFuture — tarefas concorrentes independentes

Quando múltiplas operações independentes podem ocorrer em paralelo, `CompletableFuture.allOf`
combina os resultados sem bloquear por cada um sequencialmente.

<details>
<summary>❌ Bad — operações independentes executadas em sequência</summary>
<br>

```java
public DashboardData loadDashboard(String userId) {
    final var orders = orderService.findByUser(userId);     // 300ms
    final var invoices = invoiceService.findByUser(userId); // 300ms
    final var profile = profileService.findByUser(userId);  // 300ms
    // total: ~900ms

    return new DashboardData(orders, invoices, profile);
}
```

</details>

<br>

<details>
<summary>✅ Good — operações independentes em paralelo</summary>
<br>

```java
public DashboardData loadDashboard(String userId) {
    final var ordersFuture  = CompletableFuture.supplyAsync(() -> orderService.findByUser(userId));
    final var invoicesFuture = CompletableFuture.supplyAsync(() -> invoiceService.findByUser(userId));
    final var profileFuture  = CompletableFuture.supplyAsync(() -> profileService.findByUser(userId));

    CompletableFuture.allOf(ordersFuture, invoicesFuture, profileFuture).join();
    // total: ~300ms

    final var dashboard = new DashboardData(
        ordersFuture.join(),
        invoicesFuture.join(),
        profileFuture.join()
    );
    return dashboard;
}
```

</details>

## Structured Concurrency — escopo de vida explícito

Java 21+ oferece `StructuredTaskScope` (concorrência estruturada) para garantir que todas as
tarefas filhas encerrem antes que o escopo pai retorne. Mais seguro que `CompletableFuture`
livre: falha em uma cancela as demais.

<details>
<summary>✅ Good — ShutdownOnFailure: falha em uma tarefa cancela todas</summary>
<br>

```java
public DashboardData loadDashboard(String userId) throws InterruptedException, ExecutionException {
    try (final var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        final var ordersFork  = scope.fork(() -> orderService.findByUser(userId));
        final var invoicesFork = scope.fork(() -> invoiceService.findByUser(userId));
        final var profileFork  = scope.fork(() -> profileService.findByUser(userId));

        scope.join().throwIfFailed();

        final var dashboard = new DashboardData(
            ordersFork.get(),
            invoicesFork.get(),
            profileFork.get()
        );
        return dashboard;
    }
}
```

</details>

## Executors — pool explícito

Quando precisar de controle de pool, prefira `Executors.newVirtualThreadPerTaskExecutor()`
em vez de pools de threads de plataforma de tamanho fixo.

<details>
<summary>❌ Bad — pool de tamanho fixo limita throughput de I/O</summary>
<br>

```java
final var executor = Executors.newFixedThreadPool(10); // 10 threads — gargalo em I/O
```

</details>

<br>

<details>
<summary>✅ Good — executor de virtual threads: sem limite artificial</summary>
<br>

```java
final var executor = Executors.newVirtualThreadPerTaskExecutor();
```

</details>

## Quando usar CompletableFuture vs Virtual Threads

| Cenário                                             | Preferir                    |
| --------------------------------------------------- | --------------------------- |
| Serviço HTTP com Spring Boot 4                      | Virtual threads (padrão)    |
| Operações independentes em paralelo                 | CompletableFuture.allOf     |
| Cancelamento coordenado entre tarefas               | StructuredTaskScope         |
| Integração com API assíncrona legada (Reactor, RxJava) | CompletableFuture + bridge |
| CPU-bound com múltiplos núcleos                     | ForkJoinPool (pool de roubo de trabalho) |
