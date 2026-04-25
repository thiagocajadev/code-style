# Async

> Escopo: Go 1.26.

Operações assíncronas em Go usam `context.Context` para propagação de cancelamento e timeout.
`context.Context` é sempre o primeiro parâmetro de qualquer função que faz I/O. Goroutines são
o mecanismo de concorrência, mas o controle de ciclo de vida fica com `context` e `errgroup`.

→ Para goroutines, channels e `select`, veja [concurrency.md](concurrency.md).

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `context.Context` | Carrega deadline, cancelamento e valores de escopo de requisição; propagado em toda cadeia de chamadas |
| **deadline** | Ponto absoluto no tempo após o qual o contexto é cancelado automaticamente |
| **timeout** (tempo limite) | Duração relativa convertida em deadline via `context.WithTimeout` |
| `errgroup` | Pacote `golang.org/x/sync/errgroup` — executa goroutines em paralelo e coleta o primeiro erro |
| **cancellation propagation** (propagação de cancelamento) | Quando o contexto pai é cancelado, todos os filhos são cancelados em cascata |

## Contexto ignorado

Toda função que faz I/O (banco, HTTP, fila) deve aceitar e propagar `context.Context`.
Nunca use `context.Background()` dentro de handlers — propague o contexto da requisição.

<details>
<summary>❌ Bad — contexto não propagado</summary>
<br>

```go
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    orderID, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)

    // contexto da requisição ignorado: sem cancelamento, sem timeout
    order, err := h.service.FindOrder(context.Background(), orderID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — contexto da requisição propagado em toda a cadeia</summary>
<br>

```go
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    orderID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
    if err != nil {
        http.Error(w, "invalid order id", http.StatusBadRequest)
        return
    }

    order, err := h.service.FindOrder(r.Context(), orderID)
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}

// service propaga o contexto
func (s *OrderService) FindOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := s.repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }

    return order, nil
}
```

</details>

## Timeout em chamadas externas

Toda chamada a sistema externo deve ter um timeout. Use `context.WithTimeout` para
criar um sub-contexto com deadline.

<details>
<summary>❌ Bad — chamada HTTP sem timeout</summary>
<br>

```go
func (c *PaymentClient) Charge(amount float64) (*ChargeResult, error) {
    resp, err := http.Post(c.baseURL+"/charge", "application/json", buildBody(amount))
    // pode bloquear indefinidamente
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — sub-contexto com timeout por chamada</summary>
<br>

```go
const paymentTimeout = 5 * time.Second

func (c *PaymentClient) Charge(ctx context.Context, amount float64) (*ChargeResult, error) {
    callCtx, cancel := context.WithTimeout(ctx, paymentTimeout)
    defer cancel()

    body, err := json.Marshal(ChargeRequest{Amount: amount})
    if err != nil {
        return nil, fmt.Errorf("marshal charge request: %w", err)
    }

    req, err := http.NewRequestWithContext(callCtx, http.MethodPost, c.baseURL+"/charge",
        bytes.NewReader(body))
    if err != nil {
        return nil, fmt.Errorf("build charge request: %w", err)
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("charge payment: %w", err)
    }
    defer resp.Body.Close()

    var result ChargeResult

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode charge result: %w", err)
    }

    return &result, nil
}
```

</details>

## errgroup — chamadas paralelas independentes

Use `errgroup.WithContext` para executar chamadas independentes em paralelo e
coletar o primeiro erro. O contexto do grupo é cancelado automaticamente no primeiro erro.

<details>
<summary>❌ Bad — chamadas sequenciais que poderiam ser paralelas</summary>
<br>

```go
func buildOrderDetails(ctx context.Context, orderID int64) (*OrderDetails, error) {
    order, err := orderRepo.FindByID(ctx, orderID)
    if err != nil {
        return nil, err
    }

    customer, err := customerRepo.FindByID(ctx, order.CustomerID)  // aguarda order
    if err != nil {
        return nil, err
    }

    shipping, err := shippingRepo.FindByOrderID(ctx, orderID)  // aguarda customer
    if err != nil {
        return nil, err
    }

    details := &OrderDetails{Order: order, Customer: customer, Shipping: shipping}

    return details, nil
}
```

</details>

<br>

<details>
<summary>✅ Good — errgroup para chamadas independentes em paralelo</summary>
<br>

```go
func buildOrderDetails(ctx context.Context, orderID int64) (*OrderDetails, error) {
    g, groupCtx := errgroup.WithContext(ctx)

    var order *Order
    var customer *Customer
    var shipping *Shipping

    g.Go(func() error {
        var err error

        order, err = orderRepo.FindByID(groupCtx, orderID)

        return fmt.Errorf("find order: %w", err)
    })

    g.Go(func() error {
        var err error

        shipping, err = shippingRepo.FindByOrderID(groupCtx, orderID)

        return fmt.Errorf("find shipping: %w", err)
    })

    if err := g.Wait(); err != nil {
        return nil, err
    }

    customerResult, err := customerRepo.FindByID(ctx, order.CustomerID)
    if err != nil {
        return nil, fmt.Errorf("find customer: %w", err)
    }

    customer = customerResult

    details := &OrderDetails{Order: order, Customer: customer, Shipping: shipping}

    return details, nil
}
```

</details>

## Cancelamento verificado

Em loops longos ou processamento em lote, verifique `ctx.Done()` periodicamente.

<details>
<summary>✅ Good — verificação de cancelamento em loop de processamento</summary>
<br>

```go
func processOrders(ctx context.Context, orders []Order) error {
    for _, order := range orders {
        select {
        case <-ctx.Done():
            return fmt.Errorf("processing canceled: %w", ctx.Err())
        default:
        }

        if err := processOrder(ctx, order); err != nil {
            return fmt.Errorf("process order %d: %w", order.ID, err)
        }
    }

    return nil
}
```

</details>
