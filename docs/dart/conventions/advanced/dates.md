# Dates

> Escopo: Dart 3.7.

`DateTime` é o tipo nativo de data e hora do Dart. `DateTime.utc()` cria instâncias em UTC;
`DateTime.now()` usa o fuso local. Toda persistência e transferência usa ISO 8601;
a formatação para o usuário usa `intl`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `DateTime` | ponto no tempo com data, hora e informação de fuso (`isUtc`) |
| `DateTime.utc()` | cria instância em UTC — usar para persistência e transferência |
| `DateTime.now()` | cria instância no fuso local — usar somente para exibição |
| `Duration` | intervalo de tempo: `Duration(days: 7, hours: 2)` |
| `intl` | pacote para formatação de datas com locale e fuso |
| **ISO 8601** | formato padrão: `2026-04-26T14:30:00.000Z` (UTC) ou `2026-04-26` (data) |

## Fuso de DateTime.now() em persistência

<details>
<summary>❌ Bad — DateTime.now() em UTC sem conversão</summary>
<br>

```dart
final order = Order(
  id: 1,
  createdAt: DateTime.now(),   // fuso local — varia por servidor
);

final json = {'id': 1, 'createdAt': order.createdAt.toString()};   // formato não-padrão
```

</details>

<br>

<details>
<summary>✅ Good — DateTime.now().toUtc() + toIso8601String()</summary>
<br>

```dart
final order = Order(
  id: 1,
  createdAt: DateTime.now().toUtc(),   // UTC para persistência
);

final json = {'id': 1, 'createdAt': order.createdAt.toIso8601String()};
// "2026-04-26T14:30:00.000Z"
```

</details>

## String como data

<details>
<summary>❌ Bad — string comparada como texto</summary>
<br>

```dart
final dueDate = '2026-04-30';
final isOverdue = dueDate.compareTo(DateTime.now().toString()) < 0;   // comparação de string
```

</details>

<br>

<details>
<summary>✅ Good — DateTime.parse com comparação tipada</summary>
<br>

```dart
final dueDate = DateTime.parse('2026-04-30T00:00:00Z');
final isOverdue = dueDate.isBefore(DateTime.now().toUtc());
```

</details>

## Formatação para exibição com intl

<details>
<summary>❌ Bad — toString() com formato indefinido</summary>
<br>

```dart
Text(order.createdAt.toString())   // "2026-04-26 14:30:00.000Z" — não é label para usuário
```

</details>

<br>

<details>
<summary>✅ Good — DateFormat com locale e fuso do usuário</summary>
<br>

```dart
import 'package:intl/intl.dart';

final _displayFormatter = DateFormat('dd/MM/yyyy HH:mm', 'pt_BR');

String formatForDisplay(DateTime utcDate, String userTimezone) {
  final localDate = utcDate.toLocal();   // converte para fuso do dispositivo
  return _displayFormatter.format(localDate);
}
```

</details>

## Aritmética de datas

```dart
final today = DateTime.now().toUtc();

// adicionar intervalos
final nextWeek = today.add(const Duration(days: 7));
final lastMonth = DateTime(today.year, today.month - 1, today.day);

// diferença
final daysBetween = nextWeek.difference(today).inDays;

// início do dia em UTC
final startOfDay = DateTime.utc(today.year, today.month, today.day);

// comparação
final isInRange = invoiceDate.isAfter(startDate) &&
    invoiceDate.isBefore(endDate.add(const Duration(days: 1)));
```

## Serialização ISO 8601

```dart
// serializar
final isoString = createdAt.toUtc().toIso8601String();   // "2026-04-26T14:30:00.000Z"

// deserializar
final parsedDate = DateTime.parse(isoString).toUtc();
```
