# Variables

> Escopo: Swift 6.1.

Swift faz imutabilidade a escolha padrão. `let` declara constante; `var` declara variável.
Propriedades computadas transformam dados sem armazenar estado extra. Prefira `let` e escreva
`var` somente quando o fluxo exige.

## `var` onde `let` resolve

<details>
<summary>❌ Bad — var desnecessário</summary>
<br>

```swift
var total = 0.0
total = items.reduce(0) { $0 + $1.price }

var isActive = false
isActive = user.status == .active
```

</details>

<br>

<details>
<summary>✅ Good — let com inicialização direta</summary>
<br>

```swift
let total = items.reduce(0) { $0 + $1.price }

let isActive = user.status == .active
```

</details>

## Valores mágicos

<details>
<summary>❌ Bad — literais inline sem contexto</summary>
<br>

```swift
if user.role == "admin" { ... }

try await Task.sleep(for: .seconds(5))

let discount = price * 0.15
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas com intenção</summary>
<br>

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
<summary>❌ Bad — função para atributo derivado simples</summary>
<br>

```swift
struct Order {
    let items: [Item]

    func getTotal() -> Double {
        items.reduce(0) { $0 + $1.price }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — propriedade computada para valor derivado</summary>
<br>

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
<summary>❌ Bad — objeto pesado criado mesmo quando não usado</summary>
<br>

```swift
class ReportService {
    let pdfRenderer = PDFRenderer()   // criado no init sempre
}
```

</details>

<br>

<details>
<summary>✅ Good — lazy adia até o primeiro acesso</summary>
<br>

```swift
class ReportService {
    lazy var pdfRenderer = PDFRenderer()
}
```

</details>

## Escopo de variável

Declare no escopo mais restrito possível.

<details>
<summary>❌ Bad — var declarado antes do escopo real</summary>
<br>

```swift
var message: String

if order.isPaid {
    message = "Payment confirmed"
} else {
    message = "Payment pending"
}

sendNotification(message)
```

</details>

<br>

<details>
<summary>✅ Good — let com expressão condicional</summary>
<br>

```swift
let message = order.isPaid ? "Payment confirmed" : "Payment pending"

sendNotification(message)
```

</details>

## `didSet` e `willSet` para reação a mudanças

<details>
<summary>❌ Bad — observação de estado via polling</summary>
<br>

```swift
var score = 0
func updateUI() {
    if score != previousScore {
        refreshLabel()
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — didSet reage à mudança de estado</summary>
<br>

```swift
var score = 0 {
    didSet { refreshLabel() }
}
```

</details>
