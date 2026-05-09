# Dates

> Escopo: Swift 6.1, Foundation.

`Date` armazena o ponto no tempo como intervalo desde 1 Jan 2001 em UTC. `Calendar` e
`DateComponents` lidam com aritmética de datas respeitando fusos e regras de calendário.
Toda persistência e transferência usa ISO 8601; a formatação para o usuário aplica o locale
e o fuso corretos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Date` | ponto absoluto no tempo em UTC; sem informação de calendário ou fuso |
| `Calendar` | regras de calendário para aritmética de datas (dias, meses, anos) |
| `DateComponents` | representação de partes de uma data: ano, mês, dia, hora, etc. |
| `TimeZone` | fuso horário — sempre por identificador IANA (ex: `America/Sao_Paulo`) |
| `DateFormatter` | conversão entre `Date` e `String`; configurado com locale, fuso e formato |
| `ISO8601DateFormatter` | formata datas no padrão ISO 8601 sem ambiguidade |

## String como data

<details>
<summary>❌ Bad — string comparada lexicograficamente</summary>
<br>

```swift
let dueDate = "2026-04-30"   // String, não Date
let isOverdue = dueDate < today   // comparação de string, não temporal
```

</details>

<br>

<details>
<summary>✅ Good — Date com comparação tipada</summary>
<br>

```swift
let formatter = ISO8601DateFormatter()
guard let dueDate = formatter.date(from: "2026-04-30T00:00:00Z") else { return }

let isOverdue = dueDate < Date.now
```

</details>

## Fuso horário hardcoded

<details>
<summary>❌ Bad — offset fixo ignora horário de verão</summary>
<br>

```swift
let saoPaulo = TimeZone(secondsFromGMT: -3 * 3600)!   // errado: -3h fixo ignora horário de verão
```

</details>

<br>

<details>
<summary>✅ Good — identificador IANA inclui regras de horário de verão</summary>
<br>

```swift
let saoPaulo = TimeZone(identifier: "America/Sao_Paulo")!
```

</details>

## DateFormatter reutilizado

`DateFormatter` é custoso de criar. Instanciar em cada chamada degrada performance.

<details>
<summary>❌ Bad — novo DateFormatter em cada chamada</summary>
<br>

```swift
func formatDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.locale = Locale(identifier: "pt-BR")
    return formatter.string(from: date)
}
```

</details>

<br>

<details>
<summary>✅ Good — DateFormatter como propriedade estática</summary>
<br>

```swift
private static let displayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.locale = Locale(identifier: "pt-BR")
    formatter.timeZone = TimeZone(identifier: "America/Sao_Paulo")
    return formatter
}()

func formatDate(_ date: Date) -> String {
    return Self.displayFormatter.string(from: date)
}
```

</details>

## Aritmética de datas

```swift
let calendar = Calendar.current

// adicionar componentes
let nextMonth = calendar.date(byAdding: .month, value: 1, to: Date.now)!
let lastYear = calendar.date(byAdding: .year, value: -1, to: Date.now)!

// diferença em dias
let components = calendar.dateComponents([.day], from: startDate, to: endDate)
let daysBetween = components.day!

// início do dia
let startOfDay = calendar.startOfDay(for: Date.now)
```

## Serialização ISO 8601

```swift
// persistência e APIs: ISO 8601 com UTC
let isoFormatter = ISO8601DateFormatter()
isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

let serialized = isoFormatter.string(from: order.createdAt)   // "2026-04-26T14:30:00.000Z"
let parsed = isoFormatter.date(from: serialized)
```
