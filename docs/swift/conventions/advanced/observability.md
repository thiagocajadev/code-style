# Observability

> Escopo: Swift 6.1, os.Logger (unified logging system).

O sistema de logs unificado da Apple (os.Logger) é o padrão para iOS e macOS. Logs vão para
o Console.app e são coletados pelo sistema operacional com baixo overhead. Signposts permitem
marcar regiões de código para profiling no Instruments.

→ Princípios gerais: [shared/platform/observability.md](../../../shared/platform/observability.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `os.Logger` | API de logging unificado da Apple; bufferizado, eficiente, coletável via Console.app |
| `subsystem` | identificador do app ou framework — geralmente reverse-DNS: `com.acme.app` |
| `category` | subdivisão do subsystem: `"network"`, `"payment"`, `"ui"` |
| `OSSignpostID` | marcador para regiões de código no Instruments |
| **log level** | `debug`, `info`, `notice`, `warning`, `error`, `critical`, `fault` |
| **privacy** | `\(value, privacy: .public)` vs `.private` — dados sensíveis são redacted por padrão |

## `print()` em produção

<details>
<summary>❌ Bad — print() não tem nível, subsystem nem controle de privacidade</summary>
<br>

```swift
func processPayment(userId: UUID, amount: Double) {
    print("Processing payment for \(userId): \(amount)")
    // ...
    print("Payment done")
}
```

</details>

<br>

<details>
<summary>✅ Good — os.Logger com categoria e nível correto</summary>
<br>

```swift
import OSLog

private let logger = Logger(subsystem: "com.acme.app", category: "payment")

func processPayment(userId: UUID, amount: Double) {
    logger.info("payment.started userId=\(userId, privacy: .public)")
    // ...
    logger.info("payment.completed userId=\(userId, privacy: .public)")
}
```

</details>

## Privacidade de dados nos logs

Por padrão, valores interpolados em os.Logger são redacted em builds de release — protegem dados
do usuário. Marque explicitamente o que pode ser público.

<details>
<summary>❌ Bad — dados sensíveis em log público</summary>
<br>

```swift
logger.debug("Charging card \(cardNumber)")   // número de cartão em plain text no log
```

</details>

<br>

<details>
<summary>✅ Good — privacidade explícita por campo</summary>
<br>

```swift
logger.info("Charging card ending in \(cardLast4, privacy: .public) for \(amount, privacy: .public)")
logger.debug("Full card id: \(cardId, privacy: .private)")   // redacted em release
```

</details>

## Níveis de log

| Nível | Quando usar |
| --- | --- |
| `debug` | rastreamento de execução — desabilitado em release por padrão |
| `info` | eventos de fluxo normal — buffered, disponível no Console |
| `notice` | comportamento significativo mas esperado |
| `warning` | situação inesperada que não impede o fluxo |
| `error` | falha que afeta o fluxo atual; persiste mesmo sem Console conectado |
| `critical` | falha grave que afeta múltiplos subsistemas |
| `fault` | bug no sistema — deve ser investigado |

## Signposts para profiling

<details>
<summary>✅ Good — signpost marca início e fim de operação crítica</summary>
<br>

```swift
import OSLog

private let log = OSLog(subsystem: "com.acme.app", category: .pointsOfInterest)

func buildFeed() async -> [FeedItem] {
    let id = OSSignpostID(log: log)
    os_signpost(.begin, log: log, name: "buildFeed", signpostID: id)
    defer { os_signpost(.end, log: log, name: "buildFeed", signpostID: id) }

    let feedItems = await assembleFeedItems()
    return feedItems
}
```

</details>

Ver no Instruments → Time Profiler → Signposts track para visualizar intervalos anotados.

## Logger por subsistema

```swift
// Centralize em um enum para evitar strings duplicadas
enum AppLogger {
    static let payment = Logger(subsystem: "com.acme.app", category: "payment")
    static let network = Logger(subsystem: "com.acme.app", category: "network")
    static let ui = Logger(subsystem: "com.acme.app", category: "ui")
}

// uso
AppLogger.payment.info("payment.initiated orderId=\(orderId, privacy: .public)")
```
