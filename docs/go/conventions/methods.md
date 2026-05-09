# Methods

> Escopo: Go 1.26.

Go distingue **funções** (sem receptor) de **métodos** (com receptor). Ambos seguem os mesmos
princípios de SLA (Single Level of Abstraction, nível único de abstração): uma função orquestra
ou implementa, nunca os dois. O **explaining return** nomeia o resultado antes de retornar.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **receiver** (receptor) | Parâmetro especial que associa uma função a um tipo; escrito antes do nome da função |
| **value receiver** (receptor por valor) | Recebe uma cópia do tipo; não modifica o original |
| **pointer receiver** (receptor por ponteiro) | Recebe o endereço do tipo; pode modificar o original |
| **SLA** | Single Level of Abstraction — cada função opera em um único nível: orquestra chamadas OU implementa detalhe |
| **stepdown rule** (regra de descida) | Orquestrador aparece primeiro; detalhes ficam abaixo na ordem de leitura |

## Funções vs métodos

Use funções livres quando a operação não pertence semanticamente a um tipo.
Use métodos quando a operação opera sobre o estado de um struct.

<details>
<summary>❌ Bad — método onde função seria mais claro</summary>
<br>

```go
type MathHelper struct{}

func (m MathHelper) Add(a, b float64) float64 {
    return a + b
}

func (m MathHelper) Multiply(a, b float64) float64 {
    return a * b
}
```

</details>

<br>

<details>
<summary>✅ Good — funções para operações sem estado; métodos para operações com estado</summary>
<br>

```go
// função livre: não depende de estado
func calculateDiscount(price float64, rate float64) float64 {
    discountedPrice := price * (1 - rate)

    return discountedPrice
}

// método: opera sobre o estado de Order
func (o *Order) ApplyDiscount(rate float64) {
    o.TotalAmount = calculateDiscount(o.TotalAmount, rate)
}
```

</details>

## Value vs pointer receiver

Use pointer receiver quando o método modifica o estado ou quando o struct é grande.
Use value receiver para structs pequenas somente de leitura.

<details>
<summary>❌ Bad — value receiver tenta modificar estado</summary>
<br>

```go
type Order struct {
    Status string
}

// value receiver: modifica uma cópia, não o original
func (o Order) Cancel() {
    o.Status = "canceled"
}
```

</details>

<br>

<details>
<summary>✅ Good — pointer receiver para mutação; value receiver para leitura</summary>
<br>

```go
type Order struct {
    ID     int64
    Status OrderStatus
    Amount float64
}

// pointer receiver: modifica o original
func (o *Order) Cancel() {
    o.Status = OrderStatusCanceled
}

// value receiver: apenas lê, não precisa de ponteiro
func (o Order) IsCancelable() bool {
    isCancelable := o.Status == OrderStatusPending || o.Status == OrderStatusProcessing

    return isCancelable
}
```

</details>

## SLA — orquestrador ou implementação

Cada função deve operar em um único nível de abstração.

<details>
<summary>❌ Bad — god function: orquestra e implementa ao mesmo tempo</summary>
<br>

```go
func processOrder(order Order) error {
    // validação manual inline
    if order.CustomerID == 0 {
        return errors.New("customer id is required")
    }
    if order.Amount <= 0 {
        return errors.New("amount must be positive")
    }

    // cálculo de desconto inline
    if order.Customer.IsPremium {
        order.Amount = order.Amount * 0.9
    }

    // persistência inline
    _, err := db.Exec("INSERT INTO orders ...")
    if err != nil {
        return err
    }

    // notificação inline
    http.Post("https://notifications/send", ...)
    return nil
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador delega para funções de um nível abaixo</summary>
<br>

```go
func (s *OrderService) ProcessOrder(ctx context.Context, order Order) error {
    if err := validateOrder(order); err != nil {
        return fmt.Errorf("validate order: %w", err)
    }

    discountedOrder := applyCustomerDiscount(order)

    savedOrder, err := s.repository.Save(ctx, discountedOrder)
    if err != nil {
        return fmt.Errorf("save order: %w", err)
    }

    if err := s.notifier.NotifyOrderCreated(ctx, savedOrder); err != nil {
        return fmt.Errorf("notify order: %w", err)
    }

    return nil
}

func validateOrder(order Order) error {
    if order.CustomerID == 0 {
        return &ValidationError{Field: "customer_id", Message: "is required"}
    }

    if order.Amount <= 0 {
        return &ValidationError{Field: "amount", Message: "must be positive"}
    }

    return nil
}

func applyCustomerDiscount(order Order) Order {
    if !order.Customer.IsPremium {
        return order
    }

    order.Amount = order.Amount * 0.9

    return order
}
```

</details>

## Sem lógica no retorno

Atribua a uma variável nomeada antes de retornar. O retorno nomeia o resultado, não o computa.

<details>
<summary>❌ Bad — lógica inline no return</summary>
<br>

```go
func calculateOrderTotal(items []Item) float64 {
    return lo.SumBy(items, func(item Item) float64 {
        return item.Price * float64(item.Quantity)
    })
}

func findActiveUsers(users []User) []User {
    return lo.Filter(users, func(u User, _ int) bool {
        return u.Status == "active" && u.EmailVerified
    })
}
```

</details>

<br>

<details>
<summary>✅ Good — explaining return: resultado nomeado antes do return</summary>
<br>

```go
func calculateOrderTotal(items []Item) float64 {
    total := lo.SumBy(items, func(item Item) float64 {
        return item.Price * float64(item.Quantity)
    })

    return total
}

func findActiveUsers(users []User) []User {
    activeUsers := lo.Filter(users, func(u User, _ int) bool {
        return u.Status == "active" && u.EmailVerified
    })

    return activeUsers
}
```

</details>

## Parâmetros

Até 3 parâmetros na assinatura. Com 4 ou mais, agrupe em uma struct.

<details>
<summary>❌ Bad — assinatura com muitos parâmetros</summary>
<br>

```go
func createOrder(customerID int64, amount float64, currency string,
    shippingAddress string, billingAddress string, notes string) (*Order, error) {
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — struct para agrupar parâmetros relacionados</summary>
<br>

```go
type CreateOrderInput struct {
    CustomerID      int64
    Amount          float64
    Currency        string
    ShippingAddress string
    BillingAddress  string
    Notes           string
}

func createOrder(ctx context.Context, input CreateOrderInput) (*Order, error) {
    // ...
}
```

</details>

## Stepdown rule

O orquestrador aparece primeiro. Os helpers ficam abaixo, na ordem em que são chamados.

<details>
<summary>✅ Good — leitura top-down natural</summary>
<br>

```go
// Orquestrador: visível primeiro
func (s *InvoiceService) GenerateMonthlyReport(ctx context.Context, month time.Month) (*Report, error) {
    invoices, err := s.repository.FindByMonth(ctx, month)
    if err != nil {
        return nil, fmt.Errorf("find invoices: %w", err)
    }

    summary := buildInvoiceSummary(invoices)
    report := formatReport(summary, month)

    return &report, nil
}

// Helpers abaixo, na ordem de chamada
func buildInvoiceSummary(invoices []Invoice) InvoiceSummary {
    total := lo.SumBy(invoices, func(inv Invoice) float64 { return inv.Amount })
    summary := InvoiceSummary{Count: len(invoices), Total: total}

    return summary
}

func formatReport(summary InvoiceSummary, month time.Month) Report {
    report := Report{
        Month:   month.String(),
        Summary: summary,
    }

    return report
}
```

</details>
