# Dates

> Escopo: Java 25 LTS, API `java.time`.

Use **sempre** a API `java.time` (Java 8+). `java.util.Date` e `java.util.Calendar` são
legados: mutáveis, thread-unsafe e com API confusa. Nunca os use em código novo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Instant** (instante UTC) | timestamp em UTC sem fuso; ideal para persistência e logs |
| **LocalDate** (data local sem fuso) | data calendário sem hora e sem fuso; aniversários, datas de negócio |
| **LocalDateTime** (data e hora local sem fuso) | data + hora sem fuso; só para uso local/temporário |
| **ZonedDateTime** (data e hora com fuso) | data + hora + fuso; exibição localizada ao usuário |
| **Duration** (duração absoluta) | duração em segundos e nanosegundos; tempo físico |
| **Period** (período de calendário) | duração em dias, meses, anos; tempo de calendário |
| **ISO 8601** (norma ISO de datas) | formato textual padronizado para datas e horários |

## Tipos corretos para cada contexto

| Tipo            | Quando usar                                                |
| --------------- | ---------------------------------------------------------- |
| `Instant`       | Timestamp (carimbo de tempo) em UTC, persistência, logs   |
| `LocalDate`     | Data sem hora e sem fuso (aniversários, datas de negócio) |
| `LocalDateTime` | Data + hora sem fuso, apenas para uso local ou temporário |
| `ZonedDateTime` | Data + hora + fuso, exibição localizada ao usuário        |
| `Duration`      | Duração absoluta em segundos ou nanosegundos              |
| `Period`        | Duração em dias, meses ou anos (calendário)               |

## java.util.Date: legado

<details>
<summary>❌ Ruim: java.util.Date é mutável e sem fuso</summary>

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

<details>
<summary>✅ Bom: Instant para timestamps, LocalDate para datas de negócio</summary>

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
<summary>❌ Ruim: armazena com fuso local; converte ao persistir</summary>

```java
final var now = LocalDateTime.now(); // sem fuso: qual timezone?
order.setCreatedAt(now);
```

</details>

<details>
<summary>✅ Bom: Instant.now() é sempre UTC</summary>

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
<summary>❌ Ruim: SimpleDateFormat é thread-unsafe</summary>

```java
final var sdf = new SimpleDateFormat("dd/MM/yyyy"); // thread-unsafe
final var date = sdf.parse("27/04/2026");
```

</details>

<details>
<summary>✅ Bom: DateTimeFormatter é imutável e thread-safe (seguro para uso concorrente)</summary>

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
<summary>✅ Bom: configuração Jackson para java.time</summary>

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
<summary>✅ Bom: Duration para diferença em tempo, Period para diferença em calendário</summary>

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
