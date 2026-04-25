# Control Flow

> Escopo: Go 1.26.

Go favorece fluxo linear e retorno antecipado. O padrão idiomático é: valide na entrada,
retorne cedo na falha, execute no caminho feliz sem aninhamento.

## if e else

Após um `return`, `panic` ou `continue`, o `else` é desnecessário e cria aninhamento sem valor.

<details>
<summary>❌ Bad — else após return</summary>
<br>

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

<br>

<details>
<summary>✅ Good — guard clauses, sem else após return</summary>
<br>

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
<summary>❌ Bad — pyramid of doom</summary>
<br>

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

<br>

<details>
<summary>✅ Good — guard clauses, fluxo linear</summary>
<br>

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
<summary>❌ Bad — if/else chain para múltiplos valores</summary>
<br>

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

<br>

<details>
<summary>✅ Good — switch idiomático</summary>
<br>

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

## for — único loop de Go

Go tem apenas `for`. Use-o para while, loop infinito e iteração com range.

<details>
<summary>❌ Bad — loop com flag de controle desnecessária</summary>
<br>

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

<br>

<details>
<summary>✅ Good — range + early break</summary>
<br>

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
<summary>❌ Bad — cleanup manual sem defer</summary>
<br>

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

<br>

<details>
<summary>✅ Good — defer garante cleanup em qualquer saída</summary>
<br>

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
<summary>✅ Good — escopo de err limitado ao bloco</summary>
<br>

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
<summary>✅ Good — type switch idiomático</summary>
<br>

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
