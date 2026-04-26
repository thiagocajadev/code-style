# Dates

> Escopo: Go 1.26.

Go representa datas e horas com `time.Time`. Sempre use `time.Time` com fuso horário
explícito: nunca armazene horários sem localização. Para persistência e APIs, use
**RFC 3339** (Requests for Comments 3339, formato de data e hora na internet), equivalente
ao ISO 8601 com timezone obrigatório.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `time.Time` | Estrutura de data e hora com localização embutida; valor zero é 1 de janeiro, ano 1, 00:00:00 UTC |
| **RFC 3339** | Formato textual para data e hora: `2006-01-02T15:04:05Z07:00` |
| `time.UTC` | Fuso horário UTC (sem offset); use para datas de sistema e persistência |
| `time.Local` | Fuso horário local do sistema; evite em APIs e persistência |
| **zero time** | `time.Time{}` — valor zero; distingue "não informado" de "é UTC" |

## Fuso horário explícito

Nunca crie um `time.Time` sem fuso horário definido. Use `time.Now().UTC()` para
timestamps do sistema e `time.ParseInLocation` para input do usuário com timezone.

<details>
<summary>❌ Bad — time sem fuso horário definido</summary>
<br>

```go
scheduledAt, _ := time.Parse("2006-01-02", "2026-01-15")
// time.Parse sem layout de timezone usa UTC, mas perde clareza de intenção
// time.Local varia por servidor — comportamento não determinístico
```

</details>

<br>

<details>
<summary>✅ Good — fuso horário explícito em toda criação de time</summary>
<br>

```go
// timestamp do sistema: sempre UTC
now := time.Now().UTC()

// parsing com timezone explícito no input
scheduledAt, err := time.Parse(time.RFC3339, "2026-01-15T10:00:00-03:00")
if err != nil {
    return fmt.Errorf("parse scheduled_at: %w", err)
}
```

</details>

## RFC 3339 para APIs e persistência

Use `time.RFC3339` (ou `time.RFC3339Nano` para precisão de nanosegundo) ao serializar
e desserializar datas em APIs e bancos de dados.

<details>
<summary>❌ Bad — formato de data não padronizado</summary>
<br>

```go
type OrderRequest struct {
    ScheduledAt string `json:"scheduled_at"`  // "15/01/2026" — ambíguo, sem timezone
}

scheduledAt, _ := time.Parse("02/01/2006", req.ScheduledAt)
```

</details>

<br>

<details>
<summary>✅ Good — RFC 3339 com parsing explícito</summary>
<br>

```go
type OrderRequest struct {
    ScheduledAt string `json:"scheduled_at" validate:"required"`
    // esperado: "2026-01-15T10:00:00Z" ou "2026-01-15T10:00:00-03:00"
}

func parseScheduledAt(raw string) (time.Time, error) {
    scheduledAt, err := time.Parse(time.RFC3339, raw)
    if err != nil {
        return time.Time{}, fmt.Errorf("scheduled_at must be RFC 3339, got %q: %w", raw, err)
    }

    utcTime := scheduledAt.UTC()

    return utcTime, nil
}
```

</details>

## time.Time em structs

Defina campos de data como `time.Time`. Use ponteiro `*time.Time` apenas quando
o campo é opcionalmente nulo (diferente de zero time).

<details>
<summary>✅ Good — time.Time direto para campos obrigatórios</summary>
<br>

```go
type Order struct {
    ID          int64
    CustomerID  int64
    CreatedAt   time.Time  // obrigatório, nunca nulo
    UpdatedAt   time.Time  // obrigatório
    CanceledAt  *time.Time // opcional: nil = não cancelado
}

func (o Order) IsCanceled() bool {
    isCanceled := o.CanceledAt != nil

    return isCanceled
}
```

</details>

## Durations — use constantes da stdlib

Para durations, componha usando as constantes de `time`: `time.Second`, `time.Minute`,
`time.Hour`. Nunca use números mágicos de nanosegundos.

<details>
<summary>❌ Bad — número mágico de nanosegundos</summary>
<br>

```go
time.Sleep(5000000000)         // 5 segundos? 5ms? impossível ler
timeout := 300000000000        // 5 minutos em nanosegundos
```

</details>

<br>

<details>
<summary>✅ Good — constantes compostas e nomeadas</summary>
<br>

```go
const (
    sessionTimeout   = 30 * time.Minute
    requestTimeout   = 5 * time.Second
    retryBackoff     = 500 * time.Millisecond
)

time.Sleep(retryBackoff)
ctx, cancel := context.WithTimeout(ctx, requestTimeout)
defer cancel()
```

</details>

## Comparação de datas

Use `time.Before`, `time.After` e `time.Equal` para comparar `time.Time`.
Nunca compare strings de datas.

<details>
<summary>❌ Bad — comparação via string</summary>
<br>

```go
if order.ExpiresAt.Format(time.RFC3339) < time.Now().UTC().Format(time.RFC3339) {
    return ErrOrderExpired
}
```

</details>

<br>

<details>
<summary>✅ Good — comparação via métodos de time.Time</summary>
<br>

```go
func (o Order) IsExpired() bool {
    isExpired := o.ExpiresAt.Before(time.Now().UTC())

    return isExpired
}
```

</details>

## Truncamento para banco de dados

Bancos de dados têm precisão menor que Go (microsegundos vs nanosegundos). Truncar
antes de salvar evita divergência entre o que foi salvo e o que foi retornado.

<details>
<summary>✅ Good — truncar para microsegundos antes de persistir</summary>
<br>

```go
func (r *orderRepository) Save(ctx context.Context, order Order) (*Order, error) {
    order.CreatedAt = order.CreatedAt.UTC().Truncate(time.Microsecond)
    order.UpdatedAt = time.Now().UTC().Truncate(time.Microsecond)

    const queryInsertOrder = `
        INSERT INTO orders (customer_id, amount, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `

    err := r.db.QueryRowContext(ctx, queryInsertOrder,
        order.CustomerID, order.Amount, order.Currency,
        order.CreatedAt, order.UpdatedAt,
    ).Scan(&order.ID)
    if err != nil {
        return nil, fmt.Errorf("insert order: %w", err)
    }

    return &order, nil
}
```

</details>
