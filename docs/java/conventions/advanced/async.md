# Código assíncrono em Java

> Escopo: Java 25 LTS, Virtual Threads (Project Loom) e CompletableFuture.

Do Java 21 em diante, o I/O assíncrono cabe em código sequencial. As **virtual threads** (threads virtuais) deixam você escrever a chamada que espera pela rede na ordem natural, e mesmo assim o servidor atende milhares de requisições ao mesmo tempo. A corrente de **callbacks** (funções chamadas quando a operação termina), que antes era o preço de não travar a thread, deixa de ser necessária.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **virtual threads** (threads virtuais) | threads leves que a JVM cria aos milhares; uma delas parar para esperar I/O ocupa pouca memória |
| **platform threads** (threads de plataforma) | threads do sistema operacional; existem em número limitado, e cada uma parada em I/O deixa um recurso escasso ocioso |
| **throughput** (vazão) | número de operações concluídas por unidade de tempo |
| **CompletableFuture** (futuro completável) | objeto que guarda um resultado que ainda vai chegar; encadeia operações assíncronas |
| **Structured Concurrency** (concorrência estruturada) | escopo que só devolve depois que todas as tarefas filhas encerram |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é o processamento, e não a espera por I/O |
| **I/O-bound** (limitado por entrada e saída) | operação cujo gargalo é a espera por rede, disco ou banco |

<a id="blocked-thread"></a>

## Thread parada sem necessidade

Uma thread de plataforma parada esperando o banco responder mantém ocupado um recurso que existe em número fixo. As virtual threads mudam a conta: a JVM cria milhares delas, e uma parada à espera de I/O ocupa pouca memória, então o código pode esperar a chamada na ordem natural sem prender uma thread do sistema.

<details>
<summary>❌ Ruim: CompletableFuture encadeado só para não parar a thread</summary>

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

<details>
<summary>✅ Bom: virtual thread, código sequencial com a vazão de I/O não bloqueante</summary>

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

## CompletableFuture para tarefas independentes

Quando três buscas não dependem uma da outra, rodá-las em sequência soma os três tempos de espera. O `CompletableFuture.supplyAsync` dispara as três ao mesmo tempo, e o `allOf` espera todas terminarem, então o tempo total cai para o da busca mais lenta.

<details>
<summary>❌ Ruim: três buscas independentes, uma esperando a outra</summary>

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

<details>
<summary>✅ Bom: operações independentes em paralelo</summary>

```java
public DashboardData loadDashboard(String userId) {
    final var ordersFuture = CompletableFuture.supplyAsync(() -> orderService.findByUser(userId));
    final var invoicesFuture = CompletableFuture.supplyAsync(() -> invoiceService.findByUser(userId));
    final var profileFuture = CompletableFuture.supplyAsync(() -> profileService.findByUser(userId));

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

## Structured Concurrency com escopo de vida explícito

Do Java 21 em diante, o `StructuredTaskScope` amarra a vida das tarefas filhas ao escopo que as criou: o bloco só devolve depois que todas terminam. Ele dá uma garantia que o `CompletableFuture` solto não dá: se uma tarefa falha, o escopo cancela as outras em vez de deixá-las rodando à toa.

<details>
<summary>✅ Bom: ShutdownOnFailure cancela as demais quando uma tarefa falha</summary>

```java
public DashboardData loadDashboard(String userId) throws InterruptedException, ExecutionException {
    try (final var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        final var ordersFork = scope.fork(() -> orderService.findByUser(userId));
        final var invoicesFork = scope.fork(() -> invoiceService.findByUser(userId));
        final var profileFork = scope.fork(() -> profileService.findByUser(userId));

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

## Executors com pool explícito

Quando o código precisa de um executor próprio, prefira `Executors.newVirtualThreadPerTaskExecutor()`. Um pool fixo de threads de plataforma limita quantas tarefas de I/O rodam ao mesmo tempo ao número de threads do pool, e as demais ficam na fila esperando uma vaga.

<details>
<summary>❌ Ruim: o pool fixo limita quantas tarefas de I/O rodam juntas</summary>

```java
final var executor = Executors.newFixedThreadPool(10); // 10 threads: gargalo em I/O
```

</details>

<details>
<summary>✅ Bom: executor de virtual threads, uma por tarefa</summary>

```java
final var executor = Executors.newVirtualThreadPerTaskExecutor();
```

</details>

## CompletableFuture ou virtual threads: quando usar cada um

| Cenário                                             | Preferir                    |
| --------------------------------------------------- | --------------------------- |
| Serviço HTTP com Spring Boot 4                      | Virtual threads (padrão)    |
| Operações independentes em paralelo                 | CompletableFuture.allOf     |
| Cancelamento coordenado entre tarefas               | StructuredTaskScope         |
| Integração com API assíncrona legada (Reactor, RxJava) | CompletableFuture + bridge |
| CPU-bound com múltiplos núcleos                     | ForkJoinPool (pool de roubo de trabalho) |
