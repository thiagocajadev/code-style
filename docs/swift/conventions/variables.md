# Variables

> Escopo: Swift 6.1.

Swift faz imutabilidade a escolha padrão. `let` declara constante; `var` declara variável.
Propriedades computadas transformam dados sem armazenar estado extra. Prefira `let` e escreva
`var` somente quando o fluxo exige.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **let** (constante) | Binding que não aceita reatribuição; default em Swift |
| **var** (variável) | Binding que aceita reatribuição; usar só quando o fluxo exige |
| **optional** (opcional) | Tipo `T?` que pode ser valor ou `nil`; modela ausência sem null pointer |
| **lazy** (avaliação tardia) | Propriedade armazenada calculada na primeira leitura; só dentro de classes/structs |
| **type inference** (inferência de tipo) | Compilador deduz o tipo a partir do valor; anote em assinaturas públicas e literais ambíguos |
| **computed property** (propriedade computada) | Calcula valor sob demanda via `get` (e opcionalmente `set`); não armazena estado |

## `var` onde `let` resolve

<details>
<summary>❌ Ruim: var desnecessário</summary>

```swift
var total = 0.0
total = items.reduce(0) { $0 + $1.price }

var isActive = false
isActive = user.status == .active
```

</details>

<details>
<summary>✅ Bom: let com inicialização direta</summary>

```swift
let total = items.reduce(0) { $0 + $1.price }

let isActive = user.status == .active
```

</details>

## Valores mágicos

<details>
<summary>❌ Ruim: literais inline sem contexto</summary>

```swift
if user.role == "admin" { ... }

try await Task.sleep(for: .seconds(5))

let discount = price * 0.15
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas com intenção</summary>

```swift
private let adminRole = "admin"
private let retryDelay = Duration.seconds(5)
private let seasonalDiscountRate = 0.15

if user.role == adminRole { ... }

try await Task.sleep(for: retryDelay)

let discount = price * seasonalDiscountRate
```

</details>

## Propriedades computadas vs funções

Propriedades computadas modelam atributos derivados (sem parâmetros). Funções modelam operações
(com parâmetros ou efeitos colaterais).

<details>
<summary>❌ Ruim: função para atributo derivado simples</summary>

```swift
struct Order {
    let items: [Item]

    func getTotal() -> Double {
        items.reduce(0) { $0 + $1.price }
    }
}
```

</details>

<details>
<summary>✅ Bom: propriedade computada para valor derivado</summary>

```swift
struct Order {
    let items: [Item]

    var total: Double {
        items.reduce(0) { $0 + $1.price }
    }
}
```

</details>

## Lazy para inicialização custosa

<details>
<summary>❌ Ruim: objeto pesado criado mesmo quando não usado</summary>

```swift
class ReportService {
    let pdfRenderer = PDFRenderer()   // criado no init sempre
}
```

</details>

<details>
<summary>✅ Bom: lazy adia até o primeiro acesso</summary>

```swift
class ReportService {
    lazy var pdfRenderer = PDFRenderer()
}
```

</details>

## Escopo de variável

Declare no escopo mais restrito possível.

<details>
<summary>❌ Ruim: var declarado antes do escopo real</summary>

```swift
var message: String

if order.isSettled {
    message = "Payment confirmed"
} else {
    message = "Payment pending"
}

sendNotification(message)
```

</details>

<details>
<summary>✅ Bom: let com expressão condicional</summary>

```swift
let message = order.isSettled ? "Payment confirmed" : "Payment pending"

sendNotification(message)
```

</details>

## `didSet` e `willSet` para reação a mudanças

<details>
<summary>❌ Ruim: observação de estado via polling</summary>

```swift
var score = 0
func updateUI() {
    if score != previousScore {
        refreshLabel()
    }
}
```

</details>

<details>
<summary>✅ Bom: didSet reage à mudança de estado</summary>

```swift
var score = 0 {
    didSet { refreshLabel() }
}
```

</details>
