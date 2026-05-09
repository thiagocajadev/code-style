# Variables

> Escopo: Go 1.26.

Go inicializa todas as variáveis com o **zero value** (valor zero) do tipo antes da primeira atribuição.
Declarações devem expressar intenção: `:=` para inicialização local com valor imediato, `var` para
zero value explícito ou declaração de pacote, `const` para valores que não mudam.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **zero value** (valor zero) | Valor padrão que Go atribui a toda variável não inicializada: `0`, `false`, `""`, `nil` conforme o tipo |
| **short declaration** (declaração curta) | Operador `:=` que declara e inicializa em uma linha; disponível apenas dentro de funções |
| `const` | Constante avaliada em tempo de compilação; imutável por definição |
| `iota` | Identificador especial em blocos `const`; incrementa a cada constante declarada |

## Zero values

Go nunca deixa variáveis sem valor. Declare com `var` quando o zero value já é o estado correto.

<details>
<summary>❌ Bad — inicialização redundante com zero value</summary>
<br>

```go
var count int = 0
var isActive bool = false
var name string = ""
var items []string = nil
```

</details>

<br>

<details>
<summary>✅ Good — zero value é o estado inicial, var declara a intenção</summary>
<br>

```go
var count int
var isActive bool
var name string
var items []string
```

</details>

## Declaração curta vs var

Use `:=` quando há um valor imediato. Use `var` para zero value explícito ou para tornar o tipo
legível em declarações longas.

<details>
<summary>❌ Bad — var onde := seria mais natural</summary>
<br>

```go
func findUser(userID int64) (*User, error) {
    var user *User
    var err error
    user, err = repository.FindByID(userID)
    return user, err
}
```

</details>

<br>

<details>
<summary>✅ Good — := para inicialização com valor imediato</summary>
<br>

```go
func findUser(userID int64) (*User, error) {
    user, err := repository.FindByID(userID)
    if err != nil {
        return nil, fmt.Errorf("find user: %w", err)
    }

    return user, nil
}
```

</details>

## Valores mágicos

Substitua literais inline por constantes nomeadas. Qualquer número ou string cujo significado não
é óbvio pelo contexto imediato é um valor mágico.

<details>
<summary>❌ Bad — literais sem nome</summary>
<br>

```go
if attempts > 3 {
    return ErrMaxRetriesReached
}

if order.Status == "pending" {
    processOrder(order)
}

time.Sleep(5 * time.Second)
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas revelam intenção</summary>
<br>

```go
const (
    MaxRetries          = 3
    OrderStatusPending  = "pending"
    RetryBackoffSeconds = 5 * time.Second
)

if attempts > MaxRetries {
    return ErrMaxRetriesReached
}

if order.Status == OrderStatusPending {
    processOrder(order)
}

time.Sleep(RetryBackoffSeconds)
```

</details>

## iota para enumerações

Use `iota` para sequências de constantes relacionadas. Exporte o tipo para que o compilador
verifique usos indevidos.

<details>
<summary>❌ Bad — strings mágicas para status</summary>
<br>

```go
func updateOrderStatus(order *Order, status string) {
    if status == "pending" || status == "processing" || status == "shipped" {
        order.Status = status
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — tipo enumerado com iota</summary>
<br>

```go
type OrderStatus int

const (
    OrderStatusPending    OrderStatus = iota
    OrderStatusProcessing
    OrderStatusShipped
    OrderStatusDelivered
    OrderStatusCanceled
)

func (s OrderStatus) String() string {
    names := [...]string{"pending", "processing", "shipped", "delivered", "canceled"}
    if int(s) >= len(names) {
        return "unknown"
    }

    return names[s]
}
```

</details>

## Imutabilidade

Go não tem `const` para structs. Use ponteiros somente quando mutação for necessária.
Prefira receber e retornar valores (não ponteiros) em structs pequenas.

<details>
<summary>❌ Bad — mutação desnecessária via ponteiro</summary>
<br>

```go
func applyTax(price *float64, rate float64) {
    *price = *price * (1 + rate) // efeito colateral oculto
}

total := 100.0
applyTax(&total, 0.1)
```

</details>

<br>

<details>
<summary>✅ Good — retornar novo valor sem efeito colateral</summary>
<br>

```go
func applyTax(price float64, rate float64) float64 {
    taxedPrice := price * (1 + rate)

    return taxedPrice
}

taxedTotal := applyTax(100.0, 0.1)
```

</details>

## Blank identifier

Use `_` para descartar retornos que não serão usados. Nunca ignore erros com `_`.

<details>
<summary>❌ Bad — erro ignorado silenciosamente</summary>
<br>

```go
result, _ := saveOrder(order)  // erro descartado
file, _ := os.Open("data.csv") // falha silenciosa
```

</details>

<br>

<details>
<summary>✅ Good — erros tratados; _ apenas para valores realmente descartáveis</summary>
<br>

```go
result, err := saveOrder(order)
if err != nil {
    return fmt.Errorf("save order: %w", err)
}

// blank identifier legítimo: índice em range não usado
for _, item := range items {
    process(item)
}
```

</details>
