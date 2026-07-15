# Observabilidade em Java

> Escopo: Java 25 LTS com SLF4J + Logback + Micrometer.

Observabilidade é o que deixa você entender, de fora, o que a aplicação fez. Ela se apoia em três frentes: os **logs** contam os eventos, as **métricas** medem os números ao longo do tempo, e os **traces** (rastreamentos) seguem uma requisição por todos os serviços que ela toca. O stack padrão do Spring Boot 4 já traz SLF4J como camada de abstração, Logback como implementação e Micrometer para as métricas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SLF4J** (Simple Logging Facade for Java · Fachada de Log para Java) | camada de log que você chama no código; a implementação por trás (Logback, Log4j2) troca sem tocar nas chamadas |
| **Logback** (biblioteca de log do Spring Boot) | a implementação de log padrão do Spring Boot; sucessora do Log4j |
| **Micrometer** (camada de métricas para a JVM) | camada de métricas da JVM; exporta para Prometheus, Datadog e outros |
| **MDC** (Mapped Diagnostic Context · Contexto de Diagnóstico Mapeado) | mapa de contexto preso à thread atual; entra em todos os logs daquela requisição |
| **PII** (Personally Identifiable Information · Informações de Identificação Pessoal) | dado que identifica uma pessoa; nunca aparece em log |
| **correlationId** (identificador de correlação) | identificador único de uma requisição, propagado pelo MDC |

## SLF4J como camada de log

Chame sempre a camada SLF4J, nunca uma implementação direta como `java.util.logging` ou `Log4j`. Assim a troca da implementação por trás não mexe em nenhuma linha que escreve log. E escreva a mensagem com os marcadores `{}` do SLF4J, que só montam o texto quando o log de fato sai, em vez de concatenar strings a cada chamada.

<details>
<summary>❌ Ruim: escrita direta no stdout, sem nível e sem estrutura</summary>

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

<details>
<summary>✅ Bom: SLF4J com marcadores, sem concatenar string</summary>

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
<summary>❌ Ruim: o nível errado esconde o problema real</summary>

```java
log.info("Database connection failed"); // deveria ser ERROR
log.error("User logged in: {}", user.getId()); // deveria ser INFO ou DEBUG
```

</details>

<details>
<summary>✅ Bom: nível adequado ao evento</summary>

```java
log.info("Order created: orderId={} customerId={}", order.getId(), order.getCustomer().getId());
log.warn("Payment retry: orderId={} attempt={}", orderId, attempt);
log.error("Payment failed: orderId={} reason={}", orderId, ex.getMessage(), ex);
```

</details>

## MDC para o contexto da requisição

O **MDC** (Mapped Diagnostic Context · Contexto de Diagnóstico Mapeado) guarda um valor preso à thread atual, e o Logback o inclui em toda mensagem daquela thread. Coloque ali o `correlationId` uma vez, no começo da requisição, e as três, cinco ou vinte linhas de log seguintes já saem com ele, sem repetir o campo em cada chamada.

<details>
<summary>❌ Ruim: o correlationId repetido à mão em cada log</summary>

```java
log.info("Processing order: orderId={} correlationId={}", orderId, correlationId);
log.info("Discount applied: orderId={} correlationId={}", orderId, correlationId);
log.info("Invoice saved: invoiceId={} correlationId={}", invoiceId, correlationId);
```

</details>

<details>
<summary>✅ Bom: o MDC recebe o valor uma vez e o Logback repete em cada log</summary>

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

## Dados pessoais fora dos logs

Nunca escreva **PII** (Personally Identifiable Information · Informações de Identificação Pessoal) em log: senha, token, CPF, número de cartão, endereço completo. O log costuma ir para um sistema de busca que muita gente acessa e que guarda o histórico por meses, então o dado pessoal ali vira um vazamento à espera de acontecer. Registre o identificador interno, que não expõe a pessoa.

<details>
<summary>❌ Ruim: senha e cartão escritos no log</summary>

```java
log.info("User login: email={} password={}", user.getEmail(), user.getPassword());
log.debug("Payment: card={} cvv={}", card.getNumber(), card.getCvv());
```

</details>

<details>
<summary>✅ Bom: só os identificadores internos, que não expõem a pessoa</summary>

```java
log.info("User login: userId={}", user.getId());
log.debug("Payment initiated: orderId={} method={}", orderId, payment.getMethod());
```

</details>

## Micrometer para as métricas

O Micrometer é a camada de métricas do Spring Boot 4. Registre um **contador** para saber quantas vezes um evento aconteceu, e um **timer** para saber quanto tempo uma operação levou. Com esses dois números numa operação crítica, o painel mostra a taxa de erro e a latência sem você abrir o log linha a linha.

<details>
<summary>✅ Bom: um contador e um timer numa operação de negócio</summary>

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
