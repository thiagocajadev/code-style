# Dates

> Escopo: Kotlin 2.2, java.time (JSR-310).

Datas e horas no JVM usam `java.time`. `Instant` armazena o ponto no tempo em UTC.
`LocalDate`/`LocalDateTime` representam datas sem fuso horário. Toda persistência e
transferência usa ISO 8601; a formatação para o usuário aplica o fuso e o locale corretos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Instant` | ponto absoluto no tempo em UTC; sem informação de fuso |
| `LocalDate` | data sem hora nem fuso — ex: data de nascimento, data de vencimento |
| `LocalDateTime` | data + hora sem fuso — usar com cuidado; prefira `ZonedDateTime` |
| `ZonedDateTime` | data + hora + fuso horário; correto para exibição ao usuário |
| `ZoneId` | identificador de fuso — sempre por nome (ex: `America/Sao_Paulo`), nunca offset fixo |
| **ISO 8601** | formato padrão: `2026-04-26T14:30:00Z` (UTC) ou `2026-04-26` (data) |

## Date e Calendar legados

<details>
<summary>❌ Bad — java.util.Date e Calendar têm comportamento imprevisível</summary>
<br>

```kotlin
val now = Date()
val cal = Calendar.getInstance()
cal.time = now
cal.add(Calendar.DAY_OF_MONTH, 7)
val nextWeek = cal.time
```

</details>

<br>

<details>
<summary>✅ Good — java.time é imutável e explícito</summary>
<br>

```kotlin
val now = Instant.now()
val nextWeek = now.plus(7, ChronoUnit.DAYS)
```

</details>

## Fuso horário hardcoded

<details>
<summary>❌ Bad — offset fixo quebra no horário de verão</summary>
<br>

```kotlin
val saoPaulo = ZoneId.of("GMT-3")   // errado: ignora horário de verão

val now = ZonedDateTime.now(saoPaulo)
```

</details>

<br>

<details>
<summary>✅ Good — nome IANA do fuso inclui regras de horário de verão</summary>
<br>

```kotlin
val saoPaulo = ZoneId.of("America/Sao_Paulo")

val now = ZonedDateTime.now(saoPaulo)
```

</details>

## String como data

<details>
<summary>❌ Bad — string interpretada como data sem parse explícito</summary>
<br>

```kotlin
val dueDate = "2026-04-30"   // String, não LocalDate
val isOverdue = dueDate < today.toString()   // comparação lexicográfica, não temporal
```

</details>

<br>

<details>
<summary>✅ Good — LocalDate com comparação tipada</summary>
<br>

```kotlin
val dueDate = LocalDate.parse("2026-04-30")
val isOverdue = dueDate.isBefore(LocalDate.now())
```

</details>

## Serialização ISO 8601

<details>
<summary>❌ Bad — formato de data local varia por máquina</summary>
<br>

```kotlin
data class OrderResponse(
    val id: Long,
    val createdAt: String = Date().toString(),   // formato depende do locale da JVM
)
```

</details>

<br>

<details>
<summary>✅ Good — ISO 8601 é portável e indexável</summary>
<br>

```kotlin
data class OrderResponse(
    val id: Long,
    val createdAt: String = Instant.now().toString(),   // "2026-04-26T14:30:00.000Z"
)
```

</details>

## Aritmética de datas

```kotlin
val today = LocalDate.now()

// adicionar períodos
val nextMonth = today.plusMonths(1)
val lastYear = today.minusYears(1)

// diferença
val daysUntilExpiry = ChronoUnit.DAYS.between(today, expiryDate)

// início e fim do mês
val firstDay = today.withDayOfMonth(1)
val lastDay = today.with(TemporalAdjusters.lastDayOfMonth())

// verificar período
val isInRange = !invoiceDate.isBefore(startDate) && !invoiceDate.isAfter(endDate)
```

## Formatação para exibição

```kotlin
private val displayFormatter = DateTimeFormatter
    .ofPattern("dd/MM/yyyy HH:mm")
    .withLocale(Locale.forLanguageTag("pt-BR"))

fun formatForDisplay(instant: Instant, userTimezone: ZoneId): String {
    val zonedDateTime = instant.atZone(userTimezone)
    return zonedDateTime.format(displayFormatter)
}
```
