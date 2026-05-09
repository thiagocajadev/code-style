# Dates

> Escopo: Java 25 LTS — `java.time` API.

Use **sempre** a API `java.time` (Java 8+). `java.util.Date` e `java.util.Calendar` são
legados: mutáveis, thread-unsafe e com API confusa. Nunca os use em código novo.

## Tipos corretos para cada contexto

| Tipo            | Quando usar                                                |
| --------------- | ---------------------------------------------------------- |
| `Instant`       | Timestamp (carimbo de tempo) em UTC — persistência, logs  |
| `LocalDate`     | Data sem hora e sem fuso (aniversários, datas de negócio) |
| `LocalDateTime` | Data + hora sem fuso — apenas para uso local/temporário   |
| `ZonedDateTime` | Data + hora + fuso — exibição localizada ao usuário        |
| `Duration`      | Duração absoluta em segundos/nanosegundos                  |
| `Period`        | Duração em dias/meses/anos (calendário)                    |

## java.util.Date — legado

<details>
<summary>❌ Bad — java.util.Date é mutável e sem fuso</summary>
<br>

```java
import java.util.Date;

public class Order {
    private Date createdAt = new Date();     // mutável
    private Date dueDate;

    public void setDueDate(Date dueDate) {
        this.dueDate = dueDate;              // chamador pode mutar após a chamada
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — Instant para timestamps, LocalDate para datas de negócio</summary>
<br>

```java
public class Order {
    private final Instant createdAt = Instant.now(); // imutável, UTC
    private LocalDate dueDate;
}
```

</details>

## Armazenar sempre em UTC

Persistência usa `Instant` (UTC). Conversão para fuso local só na camada de apresentação.

<details>
<summary>❌ Bad — armazena com fuso local; converte ao persistir</summary>
<br>

```java
final var now = LocalDateTime.now(); // sem fuso — qual timezone?
order.setCreatedAt(now);
```

</details>

<br>

<details>
<summary>✅ Good — Instant.now() é sempre UTC</summary>
<br>

```java
final var now = Instant.now();
order.setCreatedAt(now);

// na exibição, converte para o fuso do usuário
final var userZone = ZoneId.of("America/Sao_Paulo");
final var localDateTime = now.atZone(userZone).toLocalDateTime();
```

</details>

## Parsing e formatting com DateTimeFormatter

<details>
<summary>❌ Bad — SimpleDateFormat é thread-unsafe</summary>
<br>

```java
final var sdf = new SimpleDateFormat("dd/MM/yyyy"); // thread-unsafe
final var date = sdf.parse("27/04/2026");
```

</details>

<br>

<details>
<summary>✅ Good — DateTimeFormatter é imutável e thread-safe (seguro para uso concorrente)</summary>
<br>

```java
private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

public LocalDate parseDate(String input) {
    final var parsedDate = LocalDate.parse(input, BR_DATE);
    return parsedDate;
}

public String formatDate(LocalDate date) {
    final var formatted = date.format(BR_DATE);
    return formatted;
}
```

</details>

## ISO 8601 para serialização

Ao trafegar datas em APIs, use sempre ISO 8601: `2026-04-27T14:30:00Z`. Jackson (Spring Boot)
serializa `Instant` e `LocalDate` nesse formato por padrão quando configurado corretamente.

<details>
<summary>✅ Good — configuração Jackson para java.time</summary>
<br>

```yaml
# application.yml
spring:
  jackson:
    serialization:
      write-dates-as-timestamps: false
```

```java
// request/response: usa String ISO 8601 ou deixa Jackson serializar Instant
public record OrderResponse(String id, Instant createdAt, LocalDate dueDate) {}
```

</details>

## Cálculo de duração e período

<details>
<summary>✅ Good — Duration para diferença em tempo, Period para diferença em calendário</summary>
<br>

```java
// duração absoluta
final var start = Instant.now();
// ... operação
final var elapsed = Duration.between(start, Instant.now());
log.info("Processed in {} ms", elapsed.toMillis());

// diferença em calendário (dias/meses/anos)
final var birthdate = LocalDate.of(1990, 4, 27);
final var age = Period.between(birthdate, LocalDate.now());
log.info("Age: {} years", age.getYears());
```

</details>
