# Testing

> Escopo: Go 1.26.

Go tem um framework de testes na stdlib. O padrão idiomático é **table-driven tests**
(testes orientados por tabela): uma tabela de casos cobre múltiplos cenários em um
único teste. `testify` adiciona asserts expressivos sem overhead de setup.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **table-driven test** (teste por tabela) | Slice de structs onde cada elemento é um caso de teste; reduz duplicação e facilita adição de cenários |
| **subtest** (subteste) | `t.Run("nome", func(t *testing.T){})` — cria testes nomeados dentro de um teste |
| **AAA** (Arrange, Act, Assert) | Padrão de estruturação: preparar, executar, verificar — fases visualmente separadas |
| `testify` | Biblioteca `github.com/stretchr/testify` com `assert` e `require` para mensagens de erro claras |
| `t.Helper()` | Marca a função auxiliar como helper; erros aparecem na linha do chamador, não na helper |

## Fases misturadas — AAA

Cada teste deve ter fases explícitas: Arrange (preparar), Act (executar), Assert (verificar).

<details>
<summary>❌ Bad — fases misturadas, sem separação visual</summary>
<br>

```go
func TestApplyDiscount(t *testing.T) {
    order := Order{Amount: 100}
    result := applyDiscount(order, 0.1)
    if result.Amount != 90 {
        t.Errorf("expected 90, got %f", result.Amount)
    }
    order2 := Order{Amount: 200}
    result2 := applyDiscount(order2, 0.2)
    if result2.Amount != 160 {
        t.Errorf("expected 160, got %f", result2.Amount)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — table-driven + AAA + testify</summary>
<br>

```go
func TestApplyDiscount(t *testing.T) {
    tests := []struct {
        name     string
        amount   float64
        rate     float64
        expected float64
    }{
        {name: "10% discount on 100", amount: 100, rate: 0.1, expected: 90},
        {name: "20% discount on 200", amount: 200, rate: 0.2, expected: 160},
        {name: "zero discount", amount: 50, rate: 0, expected: 50},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // Arrange
            order := Order{Amount: tc.amount}

            // Act
            result := applyDiscount(order, tc.rate)

            // Assert
            assert.Equal(t, tc.expected, result.Amount)
        })
    }
}
```

</details>

## require vs assert

Use `require` quando o teste não tem sentido se falhar nesse ponto (guarda o cenário).
Use `assert` para verificações adicionais onde a execução pode continuar.

<details>
<summary>✅ Good — require para precondição, assert para verificações</summary>
<br>

```go
func TestCreateOrder(t *testing.T) {
    // Arrange
    service := NewOrderService(fakeRepository{})
    input := CreateOrderInput{CustomerID: 42, Amount: 150.0, Currency: "BRL"}

    // Act
    order, err := service.CreateOrder(context.Background(), input)

    // Assert
    require.NoError(t, err)               // se err != nil, para aqui
    require.NotNil(t, order)              // se order == nil, para aqui

    assert.Equal(t, int64(42), order.CustomerID)
    assert.Equal(t, 150.0, order.Amount)
    assert.Equal(t, OrderStatusPending, order.Status)
}
```

</details>

## Mocks com interfaces

Defina uma interface mínima no pacote sendo testado. Implemente um fake (estrutura falsa)
na suite de testes. Prefira fakes a mocks gerados automaticamente para lógica simples.

<details>
<summary>❌ Bad — dependência concreta no teste, impossível isolar</summary>
<br>

```go
func TestOrderService(t *testing.T) {
    // conecta no banco real — lento, frágil, com efeitos colaterais
    repo := postgres.NewOrderRepository(realDB)
    service := NewOrderService(repo)
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — interface + fake em memória para testes unitários</summary>
<br>

```go
// em order/service.go — interface mínima
type orderRepository interface {
    FindByID(ctx context.Context, id int64) (*Order, error)
    Save(ctx context.Context, order Order) (*Order, error)
}

// em order/service_test.go — fake em memória
type fakeOrderRepository struct {
    orders map[int64]*Order
}

func newFakeOrderRepository() *fakeOrderRepository {
    return &fakeOrderRepository{orders: make(map[int64]*Order)}
}

func (r *fakeOrderRepository) FindByID(_ context.Context, id int64) (*Order, error) {
    order, ok := r.orders[id]
    if !ok {
        return nil, fmt.Errorf("order %d: %w", id, ErrNotFound)
    }

    return order, nil
}

func (r *fakeOrderRepository) Save(_ context.Context, order Order) (*Order, error) {
    r.orders[order.ID] = &order

    return &order, nil
}

// teste
func TestFindOrder_NotFound(t *testing.T) {
    // Arrange
    repo := newFakeOrderRepository()
    service := NewOrderService(repo)

    // Act
    _, err := service.FindOrder(context.Background(), 999)

    // Assert
    assert.ErrorIs(t, err, ErrNotFound)
}
```

</details>

## Teste de erro

Sempre teste o caminho de erro além do caminho feliz. Use `assert.ErrorIs` para
sentinel errors e `assert.ErrorAs` para tipos customizados.

<details>
<summary>✅ Good — happy path + error path + edge case</summary>
<br>

```go
func TestValidateOrder(t *testing.T) {
    tests := []struct {
        name        string
        order       Order
        expectedErr error
    }{
        {
            name:        "valid order",
            order:       Order{CustomerID: 1, Amount: 100, Currency: "BRL"},
            expectedErr: nil,
        },
        {
            name:        "missing customer id",
            order:       Order{Amount: 100, Currency: "BRL"},
            expectedErr: ErrValidation,
        },
        {
            name:        "negative amount",
            order:       Order{CustomerID: 1, Amount: -10, Currency: "BRL"},
            expectedErr: ErrValidation,
        },
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // Act
            err := validateOrder(tc.order)

            // Assert
            if tc.expectedErr == nil {
                assert.NoError(t, err)
                return
            }

            assert.ErrorIs(t, err, tc.expectedErr)
        })
    }
}
```

</details>

## Helpers de teste

Extraia setup repetitivo em helpers. Marque-os com `t.Helper()` para que erros
apareçam na linha do teste, não no helper.

<details>
<summary>✅ Good — helper com t.Helper()</summary>
<br>

```go
func buildTestOrder(t *testing.T, overrides ...func(*Order)) Order {
    t.Helper()

    order := Order{
        ID:         1,
        CustomerID: 42,
        Amount:     100.0,
        Currency:   "BRL",
        Status:     OrderStatusPending,
    }

    for _, override := range overrides {
        override(&order)
    }

    return order
}

func TestCancelOrder(t *testing.T) {
    // Arrange
    order := buildTestOrder(t, func(o *Order) {
        o.Status = OrderStatusProcessing
    })

    // Act
    err := order.Cancel()

    // Assert
    require.NoError(t, err)
    assert.Equal(t, OrderStatusCanceled, order.Status)
}
```

</details>
