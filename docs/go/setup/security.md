# Security

> Escopo: Go 1.26. Especificidades do ecossistema Go para secrets, validação e autenticação.
> Princípios gerais de segurança em [shared/platform/security.md](../../shared/platform/security.md).

Secrets em Go ficam em variáveis de ambiente, nunca em arquivos versionados. O pacote `internal/config`
é o único ponto de leitura; todos os outros módulos recebem a configuração já validada via injeção.

## Secrets e variáveis de ambiente

<details>
<summary>❌ Bad — secret no código-fonte</summary>
<br>

```go
const jwtSecret = "supersecret123"

func validateToken(token string) bool {
    // secret hardcoded
    return verify(token, jwtSecret)
}
```

</details>

<br>

<details>
<summary>✅ Good — secret lido de variável de ambiente, fail-fast se ausente</summary>
<br>

```go
// internal/config/config.go
jwtSecret, ok := os.LookupEnv("JWT_SECRET")
if !ok {
    return nil, fmt.Errorf("JWT_SECRET is required")
}
```

</details>

## Validação na fronteira

Valide toda entrada na camada de handler, antes de chegar ao service.
Use o pacote `github.com/go-playground/validator/v10` para struct tags.

<details>
<summary>❌ Bad — validação ausente na fronteira</summary>
<br>

```go
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    json.NewDecoder(r.Body).Decode(&req)

    // req.CustomerID pode ser zero, req.Amount pode ser negativo
    order, err := h.service.Create(req)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    json.NewEncoder(w).Encode(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — validação explícita antes de delegar ao service</summary>
<br>

```go
type CreateOrderRequest struct {
    CustomerID int64   `json:"customer_id" validate:"required,gt=0"`
    Amount     float64 `json:"amount"      validate:"required,gt=0"`
    Currency   string  `json:"currency"    validate:"required,len=3"`
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid body", http.StatusBadRequest)
        return
    }

    if err := h.validator.Struct(req); err != nil {
        http.Error(w, err.Error(), http.StatusUnprocessableEntity)
        return
    }

    order, err := h.service.Create(r.Context(), req)
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}
```

</details>

## SQL — queries parametrizadas

Nunca concatene input do usuário em queries. Use sempre placeholders parametrizados.

<details>
<summary>❌ Bad — concatenação de string em query SQL</summary>
<br>

```go
query := "SELECT * FROM users WHERE email = '" + email + "'"
rows, err := db.Query(query)
```

</details>

<br>

<details>
<summary>✅ Good — placeholder parametrizado</summary>
<br>

```go
const queryFindUserByEmail = `
    SELECT id, name, email
    FROM users
    WHERE email = $1
`

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User

    err := r.db.QueryRowContext(ctx, queryFindUserByEmail, email).
        Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        return nil, fmt.Errorf("find user by email: %w", err)
    }

    return &user, nil
}
```

</details>

## Timeouts e contextos

Toda chamada externa (banco, HTTP, fila) deve respeitar um `context.Context` com timeout.

<details>
<summary>❌ Bad — chamada sem timeout</summary>
<br>

```go
func fetchPrice(productID int64) (*Price, error) {
    resp, err := http.Get(fmt.Sprintf("https://pricing-api/products/%d", productID))
    // sem timeout: pode bloquear indefinidamente
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
<summary>✅ Good — contexto com timeout propagado</summary>
<br>

```go
func (c *PricingClient) FetchPrice(ctx context.Context, productID int64) (*Price, error) {
    callCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()

    url := fmt.Sprintf("%s/products/%d", c.baseURL, productID)

    req, err := http.NewRequestWithContext(callCtx, http.MethodGet, url, nil)
    if err != nil {
        return nil, fmt.Errorf("build request: %w", err)
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch price: %w", err)
    }
    defer resp.Body.Close()

    var price Price

    if err := json.NewDecoder(resp.Body).Decode(&price); err != nil {
        return nil, fmt.Errorf("decode price: %w", err)
    }

    return &price, nil
}
```

</details>
