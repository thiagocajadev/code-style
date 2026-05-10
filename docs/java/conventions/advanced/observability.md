# Observability

> Escopo: Java 25 LTS — SLF4J + Logback + Micrometer.

Observabilidade cobre três pilares: **logs** (eventos), **métricas** e **traces** (rastreamentos).
O stack padrão Spring Boot 4 já inclui SLF4J (Simple Logging Facade for Java, Fachada de Log
para Java) como abstração, Logback como implementação e Micrometer para métricas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLF4J** (Simple Logging Facade for Java, Fachada de Log para Java) | abstração de log; a implementação (Logback, Log4j2) é trocável sem alterar o código |
| **Logback** (biblioteca de log padrão do Spring Boot) | implementação de log padrão do Spring Boot; sucessor do Log4j |
| **Micrometer** (fachada de métricas para JVM) | fachada de métricas da JVM; exporta para Prometheus, Datadog e outros |
| **MDC** (Mapped Diagnostic Context, Contexto de Diagnóstico Mapeado) | mapa de contexto na thread atual; propagado para todos os logs da requisição |
| **PII** (Personally Identifiable Information, Informações de Identificação Pessoal) | dados que identificam uma pessoa; nunca devem aparecer em logs |
| **correlationId** (identificador de correlação) | identificador único de uma requisição; propagado via MDC |

## SLF4J — abstração de log

Nunca use a implementação diretamente (`java.util.logging`, `Log4j`). Use sempre a fachada SLF4J:
troca a implementação sem alterar o código.

<details>
<summary>❌ Ruim — log direto para stdout, sem estrutura</summary>
<br>

```java
public class OrderService {
    public Order processOrder(String orderId) {
        System.out.println("Processing order: " + orderId); // sem estrutura, sem nível
        final var order = orderRepository.findById(orderId).orElseThrow();
        System.out.println("Done: " + order.getId());
        return order;
    }
}
```

</details>

<br>

<details>
<summary>✅ Bom — SLF4J com placeholders, sem concatenação</summary>
<br>

```java
@Slf4j // Lombok gera: private static final Logger log = LoggerFactory.getLogger(OrderService.class);
public class OrderService {

    public Order processOrder(String orderId) {
        log.info("Processing order: orderId={}", orderId);

        final var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order " + orderId + " not found."));

        log.info("Order processed: orderId={} status={}", orderId, order.getStatus());
        return order;
    }
}
```

</details>

## Níveis de log

| Nível   | Quando usar                                                            |
| ------- | ---------------------------------------------------------------------- |
| `ERROR` | Falha que afeta o usuário ou requer ação imediata                      |
| `WARN`  | Situação inesperada mas recuperável; pode virar ERROR se persistir     |
| `INFO`  | Eventos de negócio relevantes (order criada, pagamento aprovado)       |
| `DEBUG` | Detalhe de implementação útil em desenvolvimento; desligado em prod    |
| `TRACE` | Rastreamento granular de execução; nunca em prod                       |

<details>
<summary>❌ Ruim — nível errado obscurece o problema</summary>
<br>

```java
log.info("Database connection failed"); // deveria ser ERROR
log.error("User logged in: {}", user.getId()); // deveria ser INFO ou DEBUG
```

</details>

<br>

<details>
<summary>✅ Bom — nível adequado ao evento</summary>
<br>

```java
log.info("Order created: orderId={} customerId={}", order.getId(), order.getCustomer().getId());
log.warn("Payment retry: orderId={} attempt={}", orderId, attempt);
log.error("Payment failed: orderId={} reason={}", orderId, ex.getMessage(), ex);
```

</details>

## MDC — Mapped Diagnostic Context (Contexto de Diagnóstico Mapeado)

MDC adiciona contexto ao log de uma thread inteira sem alterar cada chamada de log individualmente.
Use para propagar `correlationId` e `userId` entre todas as mensagens de uma requisição.

<details>
<summary>❌ Ruim — correlationId repetido em cada log</summary>
<br>

```java
log.info("Processing order: orderId={} correlationId={}", orderId, correlationId);
log.info("Discount applied: orderId={} correlationId={}", orderId, correlationId);
log.info("Invoice saved: invoiceId={} correlationId={}", invoiceId, correlationId);
```

</details>

<br>

<details>
<summary>✅ Bom — MDC popula o contexto uma vez; Logback inclui em todos os logs</summary>
<br>

```java
// filter/CorrelationFilter.java
@Component
public class CorrelationFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        final var correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

```xml
<!-- logback-spring.xml -->
<pattern>%d{ISO8601} %-5level [%X{correlationId}] %logger{36} - %msg%n</pattern>
```

</details>

## PII — dados pessoais nos logs

Nunca logue PII (Personally Identifiable Information, Informações de Identificação Pessoal):
senhas, tokens, CPF, cartão de crédito, endereços completos.

<details>
<summary>❌ Ruim — PII nos logs</summary>
<br>

```java
log.info("User login: email={} password={}", user.getEmail(), user.getPassword());
log.debug("Payment: card={} cvv={}", card.getNumber(), card.getCvv());
```

</details>

<br>

<details>
<summary>✅ Bom — apenas identificadores não sensíveis</summary>
<br>

```java
log.info("User login: userId={}", user.getId());
log.debug("Payment initiated: orderId={} method={}", orderId, payment.getMethod());
```

</details>

## Micrometer — métricas

Micrometer é a fachada de métricas do Spring Boot 4. Exponha contadores e timers para monitorar
operações críticas.

<details>
<summary>✅ Bom — contador e timer para operação de negócio</summary>
<br>

```java
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final OrderRepository orderRepository;

    public Order processOrder(String orderId) {
        return Timer.builder("order.processing")
            .tag("status", "attempt")
            .register(meterRegistry)
            .record(() -> doProcessOrder(orderId));
    }

    private Order doProcessOrder(String orderId) {
        final var order = orderRepository.findById(orderId).orElseThrow();

        meterRegistry.counter("order.processed", "status", order.getStatus().name()).increment();

        return order;
    }
}
```

</details>
