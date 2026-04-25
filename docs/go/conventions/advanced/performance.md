# Performance

> Escopo: Go 1.26.

Meça antes de otimizar. Go tem ferramentas de profiling e benchmark na stdlib.
As otimizações mais impactantes envolvem evitar alocações desnecessárias, reutilizar
buffers com `sync.Pool` e escolher estruturas de dados adequadas.

## Benchmarks

Escreva benchmarks antes de otimizar. `go test -bench=.` mede throughput e alocações.

<details>
<summary>✅ Good — benchmark com -benchmem para medir alocações</summary>
<br>

```go
func BenchmarkBuildReport(b *testing.B) {
    orders := buildTestOrders(1000)

    b.ReportAllocs()
    b.ResetTimer()

    for b.Loop() {
        _ = buildReport(orders)
    }
}
```

```bash
go test -bench=BenchmarkBuildReport -benchmem ./...
# BenchmarkBuildReport-8   42051   28432 ns/op   4096 B/op   12 allocs/op
```

</details>

## Escape analysis — evitar heap

Variáveis no stack são mais rápidas que no heap. Use `go build -gcflags="-m"` para ver
o que o compilador move para o heap (escape).

<details>
<summary>❌ Bad — retornar ponteiro força escape para heap</summary>
<br>

```go
func buildSummary(orders []Order) *Summary {
    // &Summary força escape para heap
    return &Summary{
        Count: len(orders),
        Total: calculateTotal(orders),
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — retornar valor quando o caller não precisa do ponteiro</summary>
<br>

```go
func buildSummary(orders []Order) Summary {
    count := len(orders)
    total := calculateTotal(orders)

    summary := Summary{Count: count, Total: total}

    return summary  // compilador pode manter no stack do caller
}
```

</details>

## Pre-alocação de slices

Quando o tamanho final é conhecido, pré-aloque com `make([]T, 0, n)` para evitar
realocações durante `append`.

<details>
<summary>❌ Bad — slice cresce com realocações</summary>
<br>

```go
func extractIDs(orders []Order) []int64 {
    var ids []int64  // cresce com cada append, múltiplas realocações
    for _, order := range orders {
        ids = append(ids, order.ID)
    }
    return ids
}
```

</details>

<br>

<details>
<summary>✅ Good — pre-alocação com capacidade exata</summary>
<br>

```go
func extractIDs(orders []Order) []int64 {
    ids := make([]int64, 0, len(orders))

    for _, order := range orders {
        ids = append(ids, order.ID)
    }

    return ids
}
```

</details>

## sync.Pool — reutilização de buffers

Use `sync.Pool` para reutilizar objetos caros de alocar (buffers, encoders, decoders).

<details>
<summary>✅ Good — pool de buffers para operações de I/O frequentes</summary>
<br>

```go
var bufferPool = sync.Pool{
    New: func() any {
        return bytes.NewBuffer(make([]byte, 0, 512))
    },
}

func marshalOrder(order Order) ([]byte, error) {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    if err := json.NewEncoder(buf).Encode(order); err != nil {
        return nil, fmt.Errorf("marshal order: %w", err)
    }

    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())

    return result, nil
}
```

</details>

## strings.Builder para concatenação

Concatenação com `+` em loop cria uma nova string a cada iteração. Use `strings.Builder`.

<details>
<summary>❌ Bad — concatenação em loop, O(n²) em memória</summary>
<br>

```go
func buildCSV(orders []Order) string {
    result := ""
    for _, order := range orders {
        result += fmt.Sprintf("%d,%s,%.2f\n", order.ID, order.Status, order.Amount)
    }
    return result
}
```

</details>

<br>

<details>
<summary>✅ Good — strings.Builder: uma única alocação</summary>
<br>

```go
func buildCSV(orders []Order) string {
    var builder strings.Builder

    builder.Grow(len(orders) * 32)  // estimativa de tamanho médio por linha

    for _, order := range orders {
        fmt.Fprintf(&builder, "%d,%s,%.2f\n", order.ID, order.Status, order.Amount)
    }

    result := builder.String()

    return result
}
```

</details>

## Evitar N+1 em consultas

Carregue dados em lote, não um a um dentro de um loop.

<details>
<summary>❌ Bad — N+1: uma query por item</summary>
<br>

```go
func buildOrdersWithCustomers(ctx context.Context, orders []Order) ([]OrderWithCustomer, error) {
    var result []OrderWithCustomer

    for _, order := range orders {
        // N queries ao banco
        customer, err := customerRepo.FindByID(ctx, order.CustomerID)
        if err != nil {
            return nil, err
        }

        result = append(result, OrderWithCustomer{Order: order, Customer: customer})
    }

    return result, nil
}
```

</details>

<br>

<details>
<summary>✅ Good — carga em lote com uma query</summary>
<br>

```go
func buildOrdersWithCustomers(ctx context.Context, orders []Order) ([]OrderWithCustomer, error) {
    customerIDs := extractCustomerIDs(orders)

    customers, err := customerRepo.FindByIDs(ctx, customerIDs)
    if err != nil {
        return nil, fmt.Errorf("load customers: %w", err)
    }

    customerIndex := indexByID(customers)

    result := make([]OrderWithCustomer, 0, len(orders))

    for _, order := range orders {
        customer := customerIndex[order.CustomerID]

        result = append(result, OrderWithCustomer{Order: order, Customer: customer})
    }

    return result, nil
}
```

</details>
