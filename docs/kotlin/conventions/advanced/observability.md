# Observability

> Escopo: Kotlin 2.2, SLF4J 2.x / Logback.

Logs são eventos estruturados, não mensagens de texto. Cada evento tem nível, contexto (quem,
o quê, com quais IDs) e dados relevantes para diagnóstico. O **MDC** (Mapped Diagnostic Context,
contexto de diagnóstico mapeado) propaga identificadores de correlação automaticamente.

→ Princípios gerais: [shared/platform/observability.md](../../../shared/platform/observability.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLF4J** (Simple Logging Facade for Java) | abstração de logging; a implementação (Logback, Log4j2) é trocável |
| **MDC** (Mapped Diagnostic Context) | mapa de contexto na thread atual; propagado para todos os logs do request |
| **structured logging** | log em JSON com campos fixos; indexável por ferramentas de observabilidade |
| `TRACE` / `DEBUG` / `INFO` / `WARN` / `ERROR` | níveis de severidade — cada um com critério de uso |

## Log sem contexto

<details>
<summary>❌ Bad — string concatenada sem campos estruturados</summary>
<br>

```kotlin
fun processOrder(orderId: Long, userId: Long) {
    logger.info("Processing order $orderId for user $userId")
    // ...
    logger.info("Order done")   // sem id — impossível correlacionar
}
```

</details>

<br>

<details>
<summary>✅ Good — campos nomeados com contexto completo</summary>
<br>

```kotlin
fun processOrder(orderId: Long, userId: Long) {
    logger.info("order.processing.started", mapOf("orderId" to orderId, "userId" to userId))
    // ...
    logger.info("order.processing.completed", mapOf("orderId" to orderId))
}
```

</details>

## MDC para correlação de request

<details>
<summary>❌ Bad — correlationId passado manualmente em cada chamada</summary>
<br>

```kotlin
fun handleRequest(requestId: String, userId: Long) {
    logger.info("Request received [requestId=$requestId, userId=$userId]")
    orderService.process(requestId, userId)
    paymentService.charge(requestId, userId)
}
```

</details>

<br>

<details>
<summary>✅ Good — MDC propagado automaticamente em todos os logs do request</summary>
<br>

```kotlin
fun handleRequest(requestId: String, userId: Long) {
    MDC.put("requestId", requestId)
    MDC.put("userId", userId.toString())

    try {
        logger.info("request.received")
        orderService.process(userId)
        paymentService.charge(userId)
    } finally {
        MDC.clear()
    }
}
```

</details>

## Níveis de log

| Nível | Quando usar |
| --- | --- |
| `TRACE` | rastreamento de execução linha a linha — apenas em desenvolvimento local |
| `DEBUG` | estado interno útil para diagnóstico — desabilitado em produção |
| `INFO` | eventos de negócio relevantes: pedido criado, pagamento confirmado |
| `WARN` | situação inesperada que não impede o fluxo: retry, fallback, degradação |
| `ERROR` | falha que impede o fluxo e requer atenção: exceção não tratada, I/O irrecuperável |

<details>
<summary>❌ Bad — ERROR para situação esperada; INFO para exceção</summary>
<br>

```kotlin
fun findOrder(id: Long): Order? {
    val order = repository.findById(id)
    if (order == null) {
        logger.error("Order not found: $id")   // 404 não é ERROR
    }
    return order
}

fun chargeCard(cardId: Long) {
    try {
        paymentGateway.charge(cardId)
    } catch (e: Exception) {
        logger.info("Charge failed: ${e.message}")   // falha é ERROR, não INFO
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — nível proporcional à severidade</summary>
<br>

```kotlin
fun findOrder(id: Long): Order? {
    val order = repository.findById(id)
    if (order == null) {
        logger.debug("order.not_found", mapOf("orderId" to id))
    }
    return order
}

fun chargeCard(cardId: Long) {
    runCatching { paymentGateway.charge(cardId) }
        .onFailure { error ->
            logger.error("payment.charge.failed", mapOf("cardId" to cardId, "error" to error.message))
        }
}
```

</details>

## Logger por classe

```kotlin
import org.slf4j.LoggerFactory

class OrderService {
    private val logger = LoggerFactory.getLogger(OrderService::class.java)
}

// ou via extension function
inline fun <reified T> loggerFor(): org.slf4j.Logger {
    return LoggerFactory.getLogger(T::class.java)
}

class OrderService {
    private val logger = loggerFor<OrderService>()
}
```
