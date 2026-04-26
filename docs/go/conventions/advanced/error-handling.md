# Error Handling

> Escopo: Go 1.26.

Em Go, erros são valores. Não há exceções: funções retornam `error` como último valor.
O chamador verifica imediatamente. `panic` é reservado para invariantes da aplicação,
nunca para fluxo de controle esperado.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `error` | Interface com método `Error() string`; valor retornado explicitamente em vez de lançado |
| **sentinel error** (erro sentinela) | Variável de erro exportada para comparação direta via `errors.Is` |
| **error wrapping** (empacotamento de erro) | Encapsular um erro com contexto usando `fmt.Errorf("context: %w", err)` |
| `errors.Is` | Verifica se um erro na cadeia de wrapping é igual a um sentinel |
| `errors.As` | Extrai um tipo de erro específico na cadeia de wrapping |

## Erro silencioso

Nunca ignore um erro com `_`. Todo erro deve ser verificado ou explicitamente propagado.

<details>
<summary>❌ Bad — erro ignorado</summary>
<br>

```go
file, _ := os.Open("config.json")  // falha silenciosa
data, _ := io.ReadAll(file)
config, _ := parseConfig(data)
```

</details>

<br>

<details>
<summary>✅ Good — todo erro verificado</summary>
<br>

```go
file, err := os.Open("config.json")
if err != nil {
    return fmt.Errorf("open config: %w", err)
}
defer file.Close()

data, err := io.ReadAll(file)
if err != nil {
    return fmt.Errorf("read config: %w", err)
}

config, err := parseConfig(data)
if err != nil {
    return fmt.Errorf("parse config: %w", err)
}
```

</details>

## Wrapping com contexto

Adicione contexto ao propagar um erro. Use `%w` para preservar a cadeia e permitir
`errors.Is`/`errors.As`.

<details>
<summary>❌ Bad — erro propagado sem contexto</summary>
<br>

```go
func findActiveOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, err  // perde contexto de onde veio
    }

    return order, nil
}
```

</details>

<br>

<details>
<summary>✅ Good — erro empacotado com contexto da operação</summary>
<br>

```go
func findActiveOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find active order %d: %w", orderID, err)
    }

    if order.Status == OrderStatusCanceled {
        return nil, fmt.Errorf("order %d is canceled: %w", orderID, ErrOrderCanceled)
    }

    return order, nil
}
```

</details>

## Sentinel errors

Use sentinel errors para condições que o chamador precisa tratar de forma específica.

<details>
<summary>❌ Bad — erro como string, difícil de comparar</summary>
<br>

```go
func findUser(userID int64) (*User, error) {
    if userID == 0 {
        return nil, errors.New("user not found")  // string sem tipagem
    }
    // ...
}

// chamador não consegue diferenciar "not found" de outros erros de forma confiável
if err.Error() == "user not found" {  // frágil
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — sentinel error exportado, verificado com errors.Is</summary>
<br>

```go
var ErrNotFound = errors.New("not found")
var ErrAlreadyExists = errors.New("already exists")

func (r *userRepository) FindByID(ctx context.Context, userID int64) (*User, error) {
    var user User

    err := r.db.QueryRowContext(ctx, queryFindUserByID, userID).
        Scan(&user.ID, &user.Name, &user.Email)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, fmt.Errorf("user %d: %w", userID, ErrNotFound)
    }

    if err != nil {
        return nil, fmt.Errorf("query user: %w", err)
    }

    return &user, nil
}

// chamador:
user, err := userRepo.FindByID(ctx, userID)
if errors.Is(err, ErrNotFound) {
    http.Error(w, "user not found", http.StatusNotFound)
    return
}
```

</details>

## Tipos de erro customizados

Use tipos de erro customizados quando o chamador precisa acessar campos do erro além
da mensagem de texto.

<details>
<summary>✅ Good — tipo de erro com campos estruturados</summary>
<br>

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: field %q — %s", e.Field, e.Message)
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

// chamador:
if err := validateOrder(order); err != nil {
    var validErr *ValidationError

    if errors.As(err, &validErr) {
        http.Error(w, validErr.Message, http.StatusUnprocessableEntity)
        return
    }

    http.Error(w, "internal error", http.StatusInternalServerError)
}
```

</details>

## Pânico como controle de fluxo

`panic` é reservado para falhas que indicam bug no programa (nil injetado, estado impossível).
Nunca use para erros esperados como "não encontrado" ou "input inválido".

<details>
<summary>❌ Bad — panic para erro esperado</summary>
<br>

```go
func findUser(userID int64) *User {
    user, err := repository.FindByID(userID)
    if err != nil {
        panic(err)  // mata o processo para erro tratável
    }
    return user
}
```

</details>

<br>

<details>
<summary>✅ Good — panic apenas para invariantes; erros esperados retornados</summary>
<br>

```go
func NewOrderService(repo OrderRepository) *OrderService {
    if repo == nil {
        panic("OrderService: repository must not be nil")  // invariante: dependência obrigatória
    }

    service := &OrderService{repository: repo}

    return service
}

func (s *OrderService) FindOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := s.repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order %d: %w", orderID, err)
    }

    return order, nil
}
```

</details>

## Fronteira HTTP

Converta `error` em resposta HTTP apenas na camada de handler. O service retorna
erros tipados; o handler decide o status code.

<details>
<summary>✅ Good — fronteira error → HTTP no handler</summary>
<br>

```go
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    orderID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
    if err != nil {
        http.Error(w, "invalid order id", http.StatusBadRequest)
        return
    }

    order, err := h.service.FindOrder(r.Context(), orderID)
    if errors.Is(err, ErrNotFound) {
        http.Error(w, "order not found", http.StatusNotFound)
        return
    }

    if err != nil {
        h.logger.Error("find order failed", "error", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}
```

</details>
