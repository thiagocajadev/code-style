# Observability

> Escopo: Go 1.26.

Go 1.21 introduziu `log/slog` como logging estruturado na stdlib. Logs devem ser em JSON
para produção, com chave-valor consistentes. Nunca logue dados pessoais (**PII**, Personally
Identifiable Information, Informação Pessoalmente Identificável). Propague `correlation_id`
(identificador de correlação) em toda a cadeia de chamadas via `context`.

→ Princípios gerais de observabilidade em [shared/standards/observability.md](../../../../shared/standards/observability.md).

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `slog` | Pacote de logging estruturado da stdlib desde Go 1.21; substitui `log` para produção |
| **structured logging** (logging estruturado) | Log com pares chave-valor em vez de strings livres; facilita busca e alerta |
| **correlation ID** | Identificador único de requisição propagado em todos os logs de uma mesma operação |
| **log level** (nível de log) | Debug, Info, Warn, Error — filtre por nível em produção para reduzir ruído |

## Configuração do logger

Configure um único logger com `slog.NewJSONHandler` para produção. Injete via contexto
ou como dependência explícita.

<details>
<summary>✅ Good — slog com JSON handler para produção</summary>
<br>

```go
// cmd/api/main.go
func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))

    slog.SetDefault(logger)

    // ...
}
```

</details>

## Log com chave-valor

Sempre use pares chave-valor nos logs. Evite interpolação de string — dificulta parsing.

<details>
<summary>❌ Bad — string interpolada, sem estrutura</summary>
<br>

```go
log.Printf("processing order %d for customer %d with amount %.2f", order.ID, order.CustomerID, order.Amount)
log.Printf("error saving order: %v", err)
```

</details>

<br>

<details>
<summary>✅ Good — slog com chave-valor</summary>
<br>

```go
slog.Info("processing order",
    "order_id", order.ID,
    "customer_id", order.CustomerID,
    "amount", order.Amount,
)

slog.Error("save order failed",
    "order_id", order.ID,
    "error", err,
)
```

</details>

## Níveis corretos

| Nível  | Quando usar                                              |
| ------ | -------------------------------------------------------- |
| Debug  | Estado interno para diagnóstico; desligado em produção   |
| Info   | Evento de negócio relevante: pedido criado, pagamento processado |
| Warn   | Situação inesperada mas recuperável; merece investigação |
| Error  | Falha que requer atenção; sistema não conseguiu executar |

<details>
<summary>❌ Bad — Error para log de fluxo normal</summary>
<br>

```go
order, err := findOrder(ctx, orderID)
if errors.Is(err, ErrNotFound) {
    slog.Error("order not found", "order_id", orderID)  // not found é esperado, não é error
    return nil, err
}
```

</details>

<br>

<details>
<summary>✅ Good — Info/Warn para fluxo esperado; Error para falha real</summary>
<br>

```go
order, err := findOrder(ctx, orderID)
if errors.Is(err, ErrNotFound) {
    slog.Info("order not found", "order_id", orderID)
    return nil, ErrNotFound
}

if err != nil {
    slog.Error("find order failed", "order_id", orderID, "error", err)
    return nil, fmt.Errorf("find order: %w", err)
}
```

</details>

## Correlation ID via context

Propague o correlation ID em todos os logs de uma requisição usando o context.

<details>
<summary>✅ Good — correlation ID extraído do context e adicionado ao log</summary>
<br>

```go
type contextKey string

const correlationIDKey contextKey = "correlation_id"

func withCorrelationID(ctx context.Context, id string) context.Context {
    newCtx := context.WithValue(ctx, correlationIDKey, id)

    return newCtx
}

func correlationIDFrom(ctx context.Context) string {
    id, _ := ctx.Value(correlationIDKey).(string)

    return id
}

// middleware HTTP
func correlationMiddleware(next http.Handler) http.Handler {
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Correlation-ID")
        if id == "" {
            id = uuid.New().String()
        }

        ctx := withCorrelationID(r.Context(), id)
        w.Header().Set("X-Correlation-ID", id)

        next.ServeHTTP(w, r.WithContext(ctx))
    })

    return handler
}

// uso no service
func (s *OrderService) ProcessOrder(ctx context.Context, order Order) error {
    slog.Info("processing order",
        "correlation_id", correlationIDFrom(ctx),
        "order_id", order.ID,
    )

    // ...

    return nil
}
```

</details>

## PII — dados pessoais

Nunca logue dados pessoais: nome, email, CPF, senha, token, número de cartão.

<details>
<summary>❌ Bad — PII nos logs</summary>
<br>

```go
slog.Info("user logged in",
    "user_id", user.ID,
    "email", user.Email,       // PII
    "password_hash", hash,     // dado sensível
)
```

</details>

<br>

<details>
<summary>✅ Good — apenas ID e evento, sem PII</summary>
<br>

```go
slog.Info("user logged in",
    "user_id", user.ID,
    "correlation_id", correlationIDFrom(ctx),
)
```

</details>
