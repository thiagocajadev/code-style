# Validation

> Escopo: Go 1.26.

Validação acontece na fronteira do sistema: handler HTTP, worker de fila, consumer de evento.
Use o pacote `github.com/go-playground/validator/v10` com struct tags para validações declarativas.
Valide cedo; nunca confie em input não validado dentro do service.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **validation boundary** (limite de validação) | ponto onde dados externos entram no sistema (handler, worker, consumer) |
| **struct tag** (etiqueta de struct) | metadado em campo: `validate:"required,email"` — lido por reflection |
| **parse, don't validate** (decodifique, não valide) | converter input bruto em tipo de domínio uma única vez na fronteira |
| **sentinel error** (erro sentinela) | erro exportado (`var ErrXxx = errors.New(...)`) comparado com `errors.Is` |
| **domain invariant** (invariante de domínio) | regra que deve ser verdadeira em qualquer estado válido do objeto |
| `validator/v10` | pacote idiomático de validação por struct tag para input externo |

## Validação com struct tags

<details>
<summary>❌ Ruim — validação manual espalhada no service</summary>
<br>

```go
func (s *OrderService) CreateOrder(ctx context.Context, input CreateOrderInput) (*Order, error) {
    if input.CustomerID == 0 {
        return nil, errors.New("customer_id is required")
    }
    if input.Amount <= 0 {
        return nil, errors.New("amount must be positive")
    }
    if len(input.Currency) != 3 {
        return nil, errors.New("currency must be 3 characters")
    }
    // lógica de negócio misturada com validação
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Bom — struct tags + validação no handler antes de chamar o service</summary>
<br>

```go
type CreateOrderInput struct {
    CustomerID int64   `json:"customer_id" validate:"required,gt=0"`
    Amount     float64 `json:"amount"      validate:"required,gt=0"`
    Currency   string  `json:"currency"    validate:"required,len=3"`
    Notes      string  `json:"notes"       validate:"max=500"`
}

var validator = validator.New()

func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var input CreateOrderInput

    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        http.Error(w, "invalid body", http.StatusBadRequest)
        return
    }

    if err := validator.Struct(input); err != nil {
        http.Error(w, err.Error(), http.StatusUnprocessableEntity)
        return
    }

    order, err := h.service.CreateOrder(r.Context(), input)
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(order)
}
```

</details>

## Erros de validação detalhados

Converta `validator.ValidationErrors` em resposta estruturada com o campo e a regra violada.

<details>
<summary>✅ Bom — resposta estruturada de validação</summary>
<br>

```go
type FieldError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

type ValidationResponse struct {
    Errors []FieldError `json:"errors"`
}

func buildValidationResponse(err error) ValidationResponse {
    var validErrs validator.ValidationErrors

    if !errors.As(err, &validErrs) {
        response := ValidationResponse{Errors: []FieldError{{Field: "body", Message: err.Error()}}}
        return response
    }

    fieldErrors := make([]FieldError, 0, len(validErrs))

    for _, ve := range validErrs {
        fieldErrors = append(fieldErrors, FieldError{
            Field:   strings.ToLower(ve.Field()),
            Message: buildValidationMessage(ve),
        })
    }

    response := ValidationResponse{Errors: fieldErrors}

    return response
}

func buildValidationMessage(ve validator.FieldError) string {
    switch ve.Tag() {
    case "required":
        return "is required"
    case "gt":
        return fmt.Sprintf("must be greater than %s", ve.Param())
    case "len":
        return fmt.Sprintf("must be exactly %s characters", ve.Param())
    case "max":
        return fmt.Sprintf("must not exceed %s characters", ve.Param())
    default:
        return "is invalid"
    }
}
```

</details>

## Validações customizadas

Registre validações de domínio como tags customizadas quando a lógica se repete.

<details>
<summary>✅ Bom — tag customizada para validação de moeda</summary>
<br>

```go
var supportedCurrencies = map[string]bool{
    "BRL": true,
    "USD": true,
    "EUR": true,
}

func registerCustomValidations(v *validator.Validate) {
    v.RegisterValidation("currency", func(fl validator.FieldLevel) bool {
        currency := fl.Field().String()

        return supportedCurrencies[currency]
    })
}

type PaymentInput struct {
    Amount   float64 `json:"amount"   validate:"required,gt=0"`
    Currency string  `json:"currency" validate:"required,currency"`
}
```

</details>

## Validação de path params e query strings

Valide parâmetros de URL e query string antes de usar. Nunca assuma que são válidos.

<details>
<summary>✅ Bom — validação explícita de path param e query string</summary>
<br>

```go
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
    pageStr := r.URL.Query().Get("page")
    if pageStr == "" {
        pageStr = "1"
    }

    page, err := strconv.Atoi(pageStr)
    if err != nil || page < 1 {
        http.Error(w, "page must be a positive integer", http.StatusBadRequest)
        return
    }

    limitStr := r.URL.Query().Get("limit")
    if limitStr == "" {
        limitStr = "20"
    }

    limit, err := strconv.Atoi(limitStr)
    if err != nil || limit < 1 || limit > 100 {
        http.Error(w, "limit must be between 1 and 100", http.StatusBadRequest)
        return
    }

    orders, err := h.service.ListOrders(r.Context(), page, limit)
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(orders)
}
```

</details>
