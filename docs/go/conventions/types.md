# Types

> Escopo: Go 1.26.

Go é estaticamente tipado sem herança. Composição via **embedding** (incorporação) substitui
herança. **Interfaces** são definidas implicitamente: qualquer tipo que implementa os métodos
de uma interface a satisfaz, sem declaração explícita.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **interface** | Conjunto de assinaturas de método; satisfeita implicitamente por qualquer tipo que implemente os métodos |
| **embedding** (incorporação) | Incluir um tipo dentro de outro struct para reutilizar seus métodos sem herança |
| **type assertion** (asserção de tipo) | Extrair o tipo concreto de uma interface; retorna o valor e um bool de sucesso |
| **generics** (genéricos) | Parâmetros de tipo que permitem funções e tipos reutilizáveis sem duplicação desde Go 1.18 |
| **named type** (tipo nomeado) | Tipo com nome próprio baseado em outro; permite métodos e distinção semântica no compilador |

## Interfaces

Interfaces em Go são pequenas e compostas. Defina-as no pacote consumidor, não no
pacote que implementa. Isso inverte a dependência e facilita testes.

<details>
<summary>❌ Bad — interface grande definida no pacote de implementação</summary>
<br>

```go
// package order
type OrderRepository interface {
    FindByID(ctx context.Context, id int64) (*Order, error)
    FindByCustomer(ctx context.Context, customerID int64) ([]Order, error)
    Save(ctx context.Context, order Order) (*Order, error)
    Delete(ctx context.Context, id int64) error
    FindByDateRange(ctx context.Context, from, to time.Time) ([]Order, error)
    CountByStatus(ctx context.Context, status OrderStatus) (int, error)
}
```

</details>

<br>

<details>
<summary>✅ Good — interface mínima no pacote consumidor</summary>
<br>

```go
// package order (service.go) — define apenas o que usa
type orderRepository interface {
    FindByID(ctx context.Context, id int64) (*Order, error)
    Save(ctx context.Context, order Order) (*Order, error)
}

type OrderService struct {
    repository orderRepository
}
```

</details>

## Structs como tipos de domínio

Use structs para modelar entidades de domínio. Prefira campos exportados para structs
de transferência de dados; campos unexported para structs com invariantes a proteger.

<details>
<summary>✅ Good — struct com construtor que valida invariantes</summary>
<br>

```go
type Money struct {
    amount   int64  // centavos, unexported para proteger invariante
    currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    if amount < 0 {
        return Money{}, fmt.Errorf("amount must be non-negative, got %d", amount)
    }

    if len(currency) != 3 {
        return Money{}, fmt.Errorf("currency must be 3 chars, got %q", currency)
    }

    money := Money{amount: amount, currency: currency}

    return money, nil
}

func (m Money) Amount() int64  { return m.amount }
func (m Money) Currency() string { return m.currency }
```

</details>

## Named types

Crie tipos nomeados para primitivos com semântica específica. O compilador impede
confusão entre tipos com a mesma representação subjacente.

<details>
<summary>❌ Bad — ID como int64 genérico, fácil de confundir</summary>
<br>

```go
func transferFunds(fromAccount int64, toAccount int64, amount float64) error {
    // fromAccount e toAccount são intercambiáveis para o compilador
}
```

</details>

<br>

<details>
<summary>✅ Good — tipos nomeados: o compilador impede troca acidental</summary>
<br>

```go
type AccountID int64
type CustomerID int64

func transferFunds(from AccountID, to AccountID, amount Money) error {
    // AccountID e CustomerID não são intercambiáveis
}
```

</details>

## Embedding

Use embedding para reutilizar comportamento sem herança. O tipo embedded expõe
seus métodos diretamente no tipo externo.

<details>
<summary>❌ Bad — delegação manual método a método</summary>
<br>

```go
type AuditableOrder struct {
    order Order
}

func (a *AuditableOrder) Cancel() {
    a.order.Cancel()  // delegação manual
}

func (a *AuditableOrder) IsCancelable() bool {
    return a.order.IsCancelable()
}
```

</details>

<br>

<details>
<summary>✅ Good — embedding promove métodos automaticamente</summary>
<br>

```go
type AuditableOrder struct {
    Order          // embedding: métodos de Order disponíveis diretamente
    CreatedBy string
    CreatedAt time.Time
}

// uso: AuditableOrder.Cancel(), AuditableOrder.IsCancelable()
```

</details>

## Generics

Use generics quando a lógica é idêntica para múltiplos tipos. Evite generics
quando uma interface resolve o problema com mais clareza.

<details>
<summary>❌ Bad — duplicação de lógica para diferentes tipos</summary>
<br>

```go
func containsInt(slice []int, value int) bool {
    for _, v := range slice {
        if v == value {
            return true
        }
    }
    return false
}

func containsString(slice []string, value string) bool {
    for _, v := range slice {
        if v == value {
            return true
        }
    }
    return false
}
```

</details>

<br>

<details>
<summary>✅ Good — função genérica com type constraint</summary>
<br>

```go
func Contains[T comparable](slice []T, value T) bool {
    for _, v := range slice {
        if v == value {
            return true
        }
    }

    return false
}
```

</details>

## Type assertions

Prefira type switch quando há múltiplos tipos possíveis. Use a forma de dois retornos
`val, ok := x.(T)` para evitar panic.

<details>
<summary>❌ Bad — type assertion sem verificação, pode causar panic</summary>
<br>

```go
func processEvent(event interface{}) {
    orderEvent := event.(*OrderEvent) // panic se event não for *OrderEvent
    processOrder(orderEvent)
}
```

</details>

<br>

<details>
<summary>✅ Good — type assertion com verificação de ok</summary>
<br>

```go
func processEvent(event interface{}) error {
    orderEvent, ok := event.(*OrderEvent)
    if !ok {
        return fmt.Errorf("unexpected event type: %T", event)
    }

    err := processOrder(orderEvent)

    return err
}
```

</details>

## Verificação de interface em tempo de compilação

Use a declaração `var _ Interface = (*Type)(nil)` para verificar que um tipo
implementa uma interface sem instanciar.

<details>
<summary>✅ Good — verificação de implementação em tempo de compilação</summary>
<br>

```go
// compilará com erro se postgresOrderRepo não implementar OrderRepository
var _ OrderRepository = (*postgresOrderRepo)(nil)

type postgresOrderRepo struct {
    db *sqlx.DB
}

func (r *postgresOrderRepo) FindByID(ctx context.Context, id int64) (*Order, error) {
    // ...
}

func (r *postgresOrderRepo) Save(ctx context.Context, order Order) (*Order, error) {
    // ...
}
```

</details>
