# Performance

> Escopo: Swift 6.1, Apple platforms.

Performance em Swift começa por usar value types corretamente: structs não precisam de referência
contada (ARC). `@inlinable` elimina overhead de chamadas cross-módulo. Lazy collections evitam
alocações intermediárias. Instruments (Xcode) é a ferramenta de diagnóstico definitiva.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ARC** (Automatic Reference Counting) | gerenciamento automático de memória para reference types (`class`, `actor`) |
| `@inlinable` | permite ao compilador substituir chamadas cross-módulo pelo corpo da função |
| **lazy collection** | operações adiadas em sequências — sem alocação intermediária |
| **copy-on-write** | structs compartilham buffer até a primeira mutação; eficiente para coleções |
| **Instruments** | ferramenta do Xcode para profiling: Time Profiler, Allocations, Leaks |

## Classe onde struct resolve

<details>
<summary>❌ Bad — classe com ARC overhead desnecessário</summary>
<br>

```swift
class Coordinate {
    let latitude: Double
    let longitude: Double
    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }
}

let path = [Coordinate(latitude: -23.5, longitude: -46.6)]   // array de referências com ARC
```

</details>

<br>

<details>
<summary>✅ Good — struct: sem ARC, cópia eficiente</summary>
<br>

```swift
struct Coordinate {
    let latitude: Double
    let longitude: Double
}

let path = [Coordinate(latitude: -23.5, longitude: -46.6)]   // array de values, sem ARC
```

</details>

## Pipelines com lazy

<details>
<summary>❌ Bad — cada operação aloca array intermediário</summary>
<br>

```swift
func findTopSpenders(_ customers: [Customer], limit: Int) -> [String] {
    return customers
        .filter { $0.totalSpent > 1000 }     // aloca novo array
        .sorted { $0.totalSpent > $1.totalSpent }  // aloca novo array
        .prefix(limit)                        // slice
        .map { $0.name }                      // aloca novo array
}
```

</details>

<br>

<details>
<summary>✅ Good — lazy adia operações sem alocação intermediária</summary>
<br>

```swift
func findTopSpenders(_ customers: [Customer], limit: Int) -> [String] {
    let topSpenderNames = customers.lazy
        .filter { $0.totalSpent > 1000 }
        .sorted { $0.totalSpent > $1.totalSpent }
        .prefix(limit)
        .map(\.name)

    let topSpenders = Array(topSpenderNames)
    return topSpenders
}
```

</details>

## Retain cycles com closures

<details>
<summary>❌ Bad — closure captura self fortemente — memory leak</summary>
<br>

```swift
class OrderViewModel {
    var onUpdate: (() -> Void)?

    func subscribe() {
        orderService.observe { orders in
            self.orders = orders    // retain cycle: self → onUpdate → self
            self.onUpdate?()
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — [weak self] quebra o retain cycle</summary>
<br>

```swift
class OrderViewModel {
    var onUpdate: (() -> Void)?

    func subscribe() {
        orderService.observe { [weak self] orders in
            guard let self else { return }
            self.orders = orders
            self.onUpdate?()
        }
    }
}
```

</details>

## Profiling com Instruments

Sempre medir antes de otimizar. Passos para diagnóstico de performance:

1. Build com `Release` configuration (não `Debug` — otimizações são diferentes)
2. Profile com **Time Profiler**: identifica hotspots de CPU
3. Profile com **Allocations**: detecta alocações excessivas e leaks
4. Profile com **Leaks**: confirma retain cycles

```swift
// marca para Instruments — identifica regiões específicas no trace
import os.signpost

private let log = OSLog(subsystem: "com.acme.app", category: "performance")

func buildReport() -> Report {
    let signpostID = OSSignpostID(log: log)
    os_signpost(.begin, log: log, name: "buildReport", signpostID: signpostID)
    defer { os_signpost(.end, log: log, name: "buildReport", signpostID: signpostID) }

    let report = assembleReport()
    return report
}
```
