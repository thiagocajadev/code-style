# Control Flow

> Escopo: Go 1.26.

Go favorece fluxo linear e retorno antecipado. O padrão idiomático é: valide na entrada,
retorne cedo na falha, execute no caminho feliz sem aninhamento.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **guard clause** (cláusula de proteção) | `if` no topo da função que retorna cedo no caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | sair da função assim que o resultado for conhecido, sem `else` desnecessário |
| **switch** (selecionar caso) | despacho por valor; cada `case` não cai no próximo, `fallthrough` é explícito |
| **type switch** (switch por tipo) | `switch v := x.(type)` extrai o tipo concreto de uma interface |
| **for** (laço) | único laço de Go: `for cond`, `for init; cond; post`, `for range` |
| **defer** (adiar execução) | empilha chamada para executar no retorno; ideal para fechar recursos |

## if e else

Após um `return`, `panic` ou `continue`, o `else` é desnecessário e cria aninhamento sem valor.

<details>
<summary>❌ Ruim — else após return</summary>

```go
func findActiveOrder(orderID int64) (*Order, error) {
    order, err := repository.FindByID(orderID)
    if err != nil {
        return nil, err
    } else {
        if order.Status == "canceled" {
            return nil, ErrOrderCanceled
        } else {
            return order, nil
        }
    }
}
```

</details>

<details>
<summary>✅ Bom — guard clauses, sem else após return</summary>

```go
func findActiveOrder(orderID int64) (*Order, error) {
    order, err := repository.FindByID(orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }

    if order.Status == OrderStatusCanceled {
        return nil, ErrOrderCanceled
    }

    return order, nil
}
```

</details>

## Aninhamento em cascata

Máximo 2 níveis de indentação. Extraia funções quando o aninhamento crescer.

<details>
<summary>❌ Ruim — pyramid of doom</summary>

```go
func processPayment(order Order) error {
    if order.IsValid() {
        if order.Customer.HasCreditLimit() {
            if order.Amount <= order.Customer.CreditLimit {
                if err := chargeCustomer(order); err == nil {
                    notifyCustomer(order)
                    return nil
                } else {
                    return err
                }
            } else {
                return ErrCreditLimitExceeded
            }
        } else {
            return ErrNoCreditLimit
        }
    } else {
        return ErrInvalidOrder
    }
}
```

</details>

<details>
<summary>✅ Bom — guard clauses, fluxo linear</summary>

```go
func processPayment(order Order) error {
    if !order.IsValid() {
        return ErrInvalidOrder
    }

    if !order.Customer.HasCreditLimit() {
        return ErrNoCreditLimit
    }

    if order.Amount > order.Customer.CreditLimit {
        return ErrCreditLimitExceeded
    }

    if err := chargeCustomer(order); err != nil {
        return fmt.Errorf("charge customer: %w", err)
    }

    notifyCustomer(order)

    return nil
}
```

</details>

## switch

Use `switch` para múltiplas condições sobre o mesmo valor. Go não faz fallthrough automático.

<details>
<summary>❌ Ruim — if/else chain para múltiplos valores</summary>

```go
if status == "pending" {
    enqueuePending(order)
} else if status == "processing" {
    enqueueProcessing(order)
} else if status == "shipped" {
    notifyShipment(order)
} else {
    logUnknownStatus(status)
}
```

</details>

<details>
<summary>✅ Bom — switch idiomático</summary>

```go
switch order.Status {
case OrderStatusPending:
    enqueuePending(order)
case OrderStatusProcessing:
    enqueueProcessing(order)
case OrderStatusShipped:
    notifyShipment(order)
default:
    slog.Warn("unknown order status", "status", order.Status)
}
```

</details>

## Circuit break

Antes de escrever um loop, verifique se `slices.ContainsFunc` ou `slices.IndexFunc` (Go 1.21+) já
resolve. Para busca com lógica customizada, `range` com retorno antecipado é direto.

<details>
<summary>❌ Ruim — loop com flag percorre tudo mesmo após encontrar</summary>

```go
func findFirstExpiredItem(items []Item) *Item {
    var found *Item

    for i := range items {
        if found == nil && items[i].IsExpired() {
            found = &items[i] // continua iterando mesmo após encontrar
        }
    }

    return found
}
```

</details>

<details>
<summary>✅ Bom — range com retorno antecipado sai no primeiro match</summary>

```go
func findFirstExpiredItem(items []Item) *Item {
    for i := range items {
        if items[i].IsExpired() {
            return &items[i]
        }
    }

    return nil
}
```

</details>

<details>
<summary>✅ Bom — slices declarativo com circuit break nativo (Go 1.21+)</summary>

```go
import "slices"

// para no primeiro match — verifica existência
hasExpired := slices.ContainsFunc(items, func(item Item) bool {
    return item.IsExpired()
})

// retorna o índice do primeiro match — -1 se não encontrado
index := slices.IndexFunc(items, func(item Item) bool {
    return item.IsExpired()
})
```

</details>

## for — único loop de Go

Go tem apenas `for`. Use-o para while, loop infinito e iteração com range.

<details>
<summary>❌ Ruim — loop com flag de controle desnecessária</summary>

```go
found := false
i := 0

for i < len(items) {
    if items[i].IsExpired() {
        found = true
        break
    }
    i++
}
```

</details>

<details>
<summary>✅ Bom — range + early break</summary>

```go
func hasExpiredItem(items []Item) bool {
    for _, item := range items {
        if item.IsExpired() {
            return true
        }
    }

    return false
}
```

</details>

## defer

`defer` executa ao fim da função, em ordem LIFO (Last In, First Out, Último a entrar, Primeiro a
sair). Use para cleanup de recursos: fechar arquivos, liberar locks, fechar conexões.

<details>
<summary>❌ Ruim — cleanup manual sem defer</summary>

```go
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }

    data, err := io.ReadAll(file)
    if err != nil {
        file.Close() // duplicado em cada saída
        return err
    }

    result, err := parseData(data)
    if err != nil {
        file.Close()
        return err
    }

    file.Close()
    return save(result)
}
```

</details>

<details>
<summary>✅ Bom — defer garante cleanup em qualquer saída</summary>

```go
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return fmt.Errorf("open file: %w", err)
    }
    defer file.Close()

    data, err := io.ReadAll(file)
    if err != nil {
        return fmt.Errorf("read file: %w", err)
    }

    result, err := parseData(data)
    if err != nil {
        return fmt.Errorf("parse data: %w", err)
    }

    return save(result)
}
```

</details>

## Inicialização em if

Go permite declaração curta na cláusula de inicialização do `if`. Use para limitar o escopo
de variáveis de erro ao bloco.

<details>
<summary>✅ Bom — escopo de err limitado ao bloco</summary>

```go
func findAndNotify(userID int64) error {
    if user, err := findUser(userID); err != nil {
        return fmt.Errorf("find user: %w", err)
    } else {
        return notifyUser(user)
    }
}
```

</details>

## Type switch

Use type switch para inspecionar o tipo concreto de uma interface.

<details>
<summary>✅ Bom — type switch idiomático</summary>

```go
func describeShape(shape Shape) string {
    switch s := shape.(type) {
    case Circle:
        return fmt.Sprintf("circle with radius %.2f", s.Radius)
    case Rectangle:
        return fmt.Sprintf("rectangle %dx%d", s.Width, s.Height)
    default:
        return "unknown shape"
    }
}
```

</details>
