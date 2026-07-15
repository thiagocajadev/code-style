# Datas em Java

> Escopo: Java 25 LTS, API `java.time`.

Escreva todo código novo de data com a API `java.time`, presente desde o Java 8. As classes antigas `java.util.Date` e `java.util.Calendar` podem ser alteradas depois de criadas, quebram quando duas threads as usam ao mesmo tempo, e têm uma API que confunde. A `java.time` resolve os três problemas: cada valor nasce pronto e não muda mais.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Instant** (instante em UTC) | momento no tempo em UTC, sem fuso; a escolha para gravar no banco e em logs |
| **LocalDate** (data sem fuso) | data de calendário sem hora e sem fuso: aniversário, data de vencimento |
| **LocalDateTime** (data e hora sem fuso) | data mais hora, sem fuso; só para uso local ou temporário |
| **ZonedDateTime** (data e hora com fuso) | data mais hora mais fuso; para exibir no horário do usuário |
| **Duration** (duração em tempo físico) | intervalo medido em segundos e nanosegundos |
| **Period** (intervalo de calendário) | intervalo medido em dias, meses e anos |
| **ISO 8601** (norma ISO para datas) | formato de texto padronizado para data e hora, como `2026-04-27T14:30:00Z` |

## Tipos corretos para cada contexto

| Tipo            | Quando usar                                                |
| --------------- | ---------------------------------------------------------- |
| `Instant`       | Timestamp (carimbo de tempo) em UTC, persistência, logs   |
| `LocalDate`     | Data sem hora e sem fuso (aniversários, datas de negócio) |
| `LocalDateTime` | Data + hora sem fuso, apenas para uso local ou temporário |
| `ZonedDateTime` | Data + hora + fuso, exibição localizada ao usuário        |
| `Duration`      | Duração absoluta em segundos ou nanosegundos              |
| `Period`        | Duração em dias, meses ou anos (calendário)               |

## java.util.Date ficou para trás

Um campo `java.util.Date` pode ser alterado por qualquer um que tenha a referência, mesmo depois de você guardá-lo dentro do objeto. Trocar para `Instant` e `LocalDate` fecha essa porta: o valor nasce pronto e ninguém o altera pelas costas.

<details>
<summary>❌ Ruim: java.util.Date pode ser alterado e não guarda o fuso</summary>

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

## Guarde sempre em UTC

Grave a data como `Instant`, que é sempre UTC. A conversão para o fuso do usuário acontece só na camada que exibe o valor. Gravar um `LocalDateTime` deixa a dúvida de qual fuso aquele horário representava, e a resposta some assim que o servidor troca de região.

<details>
<summary>❌ Ruim: grava sem fuso e deixa a dúvida de qual timezone era</summary>

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

## Ler e formatar com DateTimeFormatter

O `SimpleDateFormat` guarda estado interno durante a conversão, então duas threads que compartilham a mesma instância corrompem o resultado uma da outra. O `DateTimeFormatter` não muda depois de criado, então uma constante `static final` serve a todas as threads sem risco.

<details>
<summary>❌ Ruim: SimpleDateFormat corrompe o resultado entre threads</summary>

```java
final var sdf = new SimpleDateFormat("dd/MM/yyyy"); // thread-unsafe
final var date = sdf.parse("27/04/2026");
```

</details>

<details>
<summary>✅ Bom: DateTimeFormatter não muda depois de criado e serve a todas as threads</summary>

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

## ISO 8601 no tráfego de API

Ao enviar datas numa API, use sempre o formato ISO 8601, como `2026-04-27T14:30:00Z`. Ele fixa a ordem dos campos e o fuso, então quem recebe lê a data sem adivinhar se o dia ou o mês vem primeiro. O **Jackson** (biblioteca de serialização do Spring Boot) já escreve `Instant` e `LocalDate` nesse formato quando você desliga a serialização como número.

<details>
<summary>✅ Bom: configuração do Jackson para java.time</summary>

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

## Calcular duração e período

`Duration` mede a diferença em tempo físico, em segundos e milissegundos, e serve para cronometrar uma operação. `Period` mede a diferença em unidades de calendário, em dias, meses e anos, e serve para calcular idade. Os dois nomes evitam a conta manual e a confusão entre um mês de 28 e um de 31 dias.

<details>
<summary>✅ Bom: Duration para o tempo cronometrado, Period para a diferença de calendário</summary>

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
