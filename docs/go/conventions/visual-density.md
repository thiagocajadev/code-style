# Visual Density

> Escopo: Go 1.26.

Densidade visual regula o espaçamento entre linhas para comunicar agrupamento lógico.
A regra é simples: linhas relacionadas ficam juntas, grupos distintos ficam separados por
uma linha em branco. Nunca duas linhas em branco consecutivas.

## Parede de código

<details>
<summary>❌ Bad — bloco sem separação entre grupos lógicos</summary>
<br>

```go
func processOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }
    if order.Status == OrderStatusCanceled {
        return nil, ErrOrderCanceled
    }
    discount := calculateDiscount(order)
    order.Amount = order.Amount - discount
    savedOrder, err := repository.Save(ctx, order)
    if err != nil {
        return nil, fmt.Errorf("save order: %w", err)
    }
    return savedOrder, nil
}
```

</details>

<br>

<details>
<summary>✅ Good — grupos separados por linha em branco; return separado do último grupo</summary>
<br>

```go
func processOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }

    if order.Status == OrderStatusCanceled {
        return nil, ErrOrderCanceled
    }

    discount := calculateDiscount(order)
    order.Amount = order.Amount - discount

    savedOrder, err := repository.Save(ctx, order)
    if err != nil {
        return nil, fmt.Errorf("save order: %w", err)
    }

    return savedOrder, nil
}
```

</details>

## Explaining return

A linha de `return` nomeia o resultado. Um blank antes do return separa a saída do
último grupo de processamento.

<details>
<summary>❌ Bad — return com lógica inline, sem separação</summary>
<br>

```go
func buildOrderSummary(orders []Order) OrderSummary {
    return OrderSummary{
        Count: len(orders),
        Total: lo.SumBy(orders, func(o Order) float64 { return o.Amount }),
        Average: lo.SumBy(orders, func(o Order) float64 { return o.Amount }) / float64(len(orders)),
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — resultado calculado antes, return limpo</summary>
<br>

```go
func buildOrderSummary(orders []Order) OrderSummary {
    count := len(orders)
    total := lo.SumBy(orders, func(o Order) float64 { return o.Amount })
    average := total / float64(count)

    summary := OrderSummary{Count: count, Total: total, Average: average}

    return summary
}
```

</details>

## Declarações de struct

Campos de um struct ficam agrupados por responsabilidade. Separação por linha em branco
entre grupos lógicos (identificação, configuração, dependências).

<details>
<summary>❌ Bad — campos sem separação lógica</summary>
<br>

```go
type OrderService struct {
    id string
    name string
    repository OrderRepository
    notifier Notifier
    logger *slog.Logger
    timeout time.Duration
    maxRetries int
}
```

</details>

<br>

<details>
<summary>✅ Good — campos agrupados por responsabilidade</summary>
<br>

```go
type OrderService struct {
    id   string
    name string

    repository OrderRepository
    notifier   Notifier
    logger     *slog.Logger

    timeout    time.Duration
    maxRetries int
}
```

</details>

## Fases de função

Funções com múltiplas fases (leitura → transformação → escrita) devem ter cada fase
separada por uma linha em branco.

<details>
<summary>❌ Bad — fases misturadas, sem separação</summary>
<br>

```go
func generateInvoice(ctx context.Context, orderID int64) (*Invoice, error) {
    order, err := orderRepo.FindByID(ctx, orderID)
    if err != nil {
        return nil, err
    }
    customer, err := customerRepo.FindByID(ctx, order.CustomerID)
    if err != nil {
        return nil, err
    }
    lineItems := buildLineItems(order.Items)
    total := calculateTotal(lineItems)
    invoice := Invoice{OrderID: orderID, Customer: customer, Items: lineItems, Total: total}
    saved, err := invoiceRepo.Save(ctx, invoice)
    if err != nil {
        return nil, err
    }
    return saved, nil
}
```

</details>

<br>

<details>
<summary>✅ Good — fases distintas separadas por linha em branco</summary>
<br>

```go
func generateInvoice(ctx context.Context, orderID int64) (*Invoice, error) {
    order, err := orderRepo.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }

    customer, err := customerRepo.FindByID(ctx, order.CustomerID)
    if err != nil {
        return nil, fmt.Errorf("find customer: %w", err)
    }

    lineItems := buildLineItems(order.Items)
    total := calculateTotal(lineItems)

    invoice := Invoice{
        OrderID:  orderID,
        Customer: customer,
        Items:    lineItems,
        Total:    total,
    }

    saved, err := invoiceRepo.Save(ctx, invoice)
    if err != nil {
        return nil, fmt.Errorf("save invoice: %w", err)
    }

    return saved, nil
}
```

</details>

## Importações

Agrupe importações em blocos: stdlib, externos, internos. `goimports` faz isso automaticamente.

<details>
<summary>✅ Good — importações em 3 grupos separados por linha em branco</summary>
<br>

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/jmoiron/sqlx"
    "golang.org/x/sync/errgroup"

    "github.com/company/my-app/internal/config"
    "github.com/company/my-app/internal/order"
)
```

</details>

## Literals inline

Literals de struct, slice e map com múltiplos campos ficam em múltiplas linhas.
Literals de um único campo podem ficar em uma linha.

<details>
<summary>❌ Bad — literal multi-campo inline</summary>
<br>

```go
user := User{ID: 42, Name: "Alice", Email: "alice@example.com", Role: "admin", Active: true}
```

</details>

<br>

<details>
<summary>✅ Good — cada campo em sua própria linha</summary>
<br>

```go
user := User{
    ID:     42,
    Name:   "Alice",
    Email:  "alice@example.com",
    Role:   "admin",
    Active: true,
}
```

</details>
