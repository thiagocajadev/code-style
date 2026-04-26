# Concurrency

> Escopo: Go 1.26.

Go foi projetado para concorrência. Goroutines são leves (2 KB de stack inicial) e channels
são o mecanismo de comunicação idiomático. A regra fundamental: _"Do not communicate by sharing
memory; instead, share memory by communicating."_ (Não comunique compartilhando memória;
comunique para compartilhar memória.)

→ Para cancelamento e timeouts com `context.Context`, veja [async.md](async.md).

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **goroutine** | Função executada de forma concorrente; iniciada com `go`; muito mais leve que uma thread do SO |
| **channel** (canal) | Pipe tipado para comunicação entre goroutines; sincroniza e transfere dados |
| **buffered channel** (canal com buffer) | Channel com capacidade N; produtor não bloqueia até o buffer encher |
| `select` | Aguarda múltiplos channels simultaneamente; executa o primeiro que estiver pronto |
| `sync.WaitGroup` | Contador que aguarda N goroutines terminarem |
| `sync.Mutex` | Exclusão mútua para proteger acesso a estado compartilhado |

## Goroutine sem controle

Toda goroutine precisa de um dono que espera seu término e propaga cancelamento.
Goroutines soltas vazam e podem corromper estado.

<details>
<summary>❌ Bad — goroutine lançada sem espera ou cancelamento</summary>
<br>

```go
func processOrders(orders []Order) {
    for _, order := range orders {
        go processOrder(order)  // goroutine solta: sem espera, sem cancelamento
    }
    // função retorna antes de todas as goroutines terminarem
}
```

</details>

<br>

<details>
<summary>✅ Good — WaitGroup garante que todas as goroutines terminam</summary>
<br>

```go
func processOrders(ctx context.Context, orders []Order) error {
    var wg sync.WaitGroup
    errCh := make(chan error, len(orders))

    for _, order := range orders {
        wg.Add(1)

        go func(o Order) {
            defer wg.Done()

            if err := processOrder(ctx, o); err != nil {
                errCh <- fmt.Errorf("process order %d: %w", o.ID, err)
            }
        }(order)
    }

    wg.Wait()
    close(errCh)

    for err := range errCh {
        return err  // retorna o primeiro erro
    }

    return nil
}
```

</details>

## Channels para comunicação

Use channels para transferir propriedade de dados entre goroutines. Prefira channels
a mutexes quando o fluxo de dados é unidirecional.

<details>
<summary>❌ Bad — slice compartilhado sem sincronização</summary>
<br>

```go
var results []Result

for _, item := range items {
    go func(i Item) {
        result := process(i)
        results = append(results, result)  // data race: acesso concorrente sem lock
    }(item)
}
```

</details>

<br>

<details>
<summary>✅ Good — channel transfere propriedade, sem data race</summary>
<br>

```go
func processAllItems(ctx context.Context, items []Item) ([]Result, error) {
    resultCh := make(chan Result, len(items))

    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)

        go func(i Item) {
            defer wg.Done()

            result := process(ctx, i)
            resultCh <- result
        }(item)
    }

    go func() {
        wg.Wait()
        close(resultCh)
    }()

    var results []Result

    for result := range resultCh {
        results = append(results, result)
    }

    return results, nil
}
```

</details>

## select com timeout

Use `select` para multiplexar channels com cancelamento e timeout.

<details>
<summary>✅ Good — select com contexto e canal de resultado</summary>
<br>

```go
func fetchWithTimeout(ctx context.Context, orderID int64) (*Order, error) {
    resultCh := make(chan *Order, 1)
    errCh := make(chan error, 1)

    go func() {
        order, err := expensiveQuery(orderID)
        if err != nil {
            errCh <- err
            return
        }

        resultCh <- order
    }()

    select {
    case order := <-resultCh:
        return order, nil
    case err := <-errCh:
        return nil, fmt.Errorf("fetch order: %w", err)
    case <-ctx.Done():
        return nil, fmt.Errorf("fetch order: %w", ctx.Err())
    }
}
```

</details>

## sync.Mutex para estado compartilhado

Quando múltiplas goroutines precisam ler e escrever no mesmo estado, use `sync.RWMutex`.
Leitura usa `RLock`; escrita usa `Lock`.

<details>
<summary>✅ Good — cache thread-safe com RWMutex</summary>
<br>

```go
type OrderCache struct {
    mu     sync.RWMutex
    orders map[int64]*Order
}

func (c *OrderCache) Get(orderID int64) (*Order, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    order, ok := c.orders[orderID]

    return order, ok
}

func (c *OrderCache) Set(order *Order) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.orders[order.ID] = order
}
```

</details>

## sync.Once — inicialização única

Use `sync.Once` para inicialização que deve acontecer exatamente uma vez,
independente de quantas goroutines a acionem.

<details>
<summary>✅ Good — singleton thread-safe com sync.Once</summary>
<br>

```go
type ConnectionPool struct {
    once sync.Once
    pool *pgx.Pool
}

func (c *ConnectionPool) Pool(ctx context.Context, dsn string) (*pgx.Pool, error) {
    var initErr error

    c.once.Do(func() {
        pool, err := pgx.Connect(ctx, dsn)
        if err != nil {
            initErr = fmt.Errorf("connect to database: %w", err)
            return
        }

        c.pool = pool
    })

    if initErr != nil {
        return nil, initErr
    }

    return c.pool, nil
}
```

</details>

## Worker pool

Use um pool de workers para limitar a concorrência em processamento de filas.

<details>
<summary>✅ Good — worker pool com channel de trabalho</summary>
<br>

```go
const maxWorkers = 5

func processOrderQueue(ctx context.Context, orders <-chan Order) error {
    g, groupCtx := errgroup.WithContext(ctx)

    for range maxWorkers {
        g.Go(func() error {
            for {
                select {
                case <-groupCtx.Done():
                    return groupCtx.Err()
                case order, ok := <-orders:
                    if !ok {
                        return nil
                    }

                    if err := processOrder(groupCtx, order); err != nil {
                        return fmt.Errorf("process order %d: %w", order.ID, err)
                    }
                }
            }
        })
    }

    err := g.Wait()

    return err
}
```

</details>
