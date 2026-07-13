# Visual Density: Go

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em Go 1.26. Cada **phase** (fase) da função ganha respiro; **atomic lines** (linhas atômicas) podem aparecer juntas; **explaining return** (retorno explicativo) destaca o resultado final.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Distribuição entre código e respiro: blocos lógicos separados por linha em branco |
| **phase** (fase da função) | Etapa lógica (validar, buscar, transformar, persistir, responder) com até 2 linhas antes do respiro |
| **atomic line** (linha atômica) | Instrução curta e independente; até 3 atômicas homogêneas podem ficar juntas |
| **explaining return** (retorno explicativo) | `x := ...` single-line + `return x` sem blank entre eles |
| **declaration + guard** (declaração e guarda) | Variável seguida do `if err != nil` que a valida; em Go o guarda é quase sempre um bloco `{ }`, fase com blank antes |
| **multi-line block** (bloco multi-linha) | Struct literal, slice/map literal ou call com args quebrados em várias linhas; pede blank depois |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; fase distinta, blank antes |
| **orphan line** (linha órfã) | Uma linha solta quando o grupo tem quatro ou mais declarações simples; quebrar em 2+2 evita |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:=` verticalmente; antipadrão, frágil a rename e gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim: bloco sem separação entre grupos lógicos</summary>

```go
func processOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }
    if order.Status == OrderStatusCanceled {
        return nil, ErrOrderCanceled
    }
    discount := calculateDiscount(order)
    order.Amount = order.Amount - discount
    savedOrder, err := repository.Save(ctx, order)
    if err != nil {
        return nil, fmt.Errorf("save order: %w", err)
    }
    return savedOrder, nil
}
```

</details>

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

```go
func processOrder(ctx context.Context, orderID int64) (*Order, error) {
    order, err := repository.FindByID(ctx, orderID)
    if err != nil {
        return nil, fmt.Errorf("find order: %w", err)
    }

    if order.Status == OrderStatusCanceled {
        return nil, ErrOrderCanceled
    }

    discount := calculateDiscount(order)
    order.Amount = order.Amount - discount

    savedOrder, err := repository.Save(ctx, order)
    if err != nil {
        return nil, fmt.Errorf("save order: %w", err)
    }

    return savedOrder, nil
}
```

</details>

## Explaining Return: par tight

Uma variável nomeada acima do `return` explica o valor retornado. Sempre que a linha imediatamente acima for essa declaração single-line (`x := ...`) e o `return` retornar exatamente essa variável, os dois formam par de 2 linhas sem blank, não importa quantos passos haja acima. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```go
func mapErrorToStatus(err error) int {
    status := errorStatusByCode[errorCode(err)]

    return status
}
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```go
func mapErrorToStatus(err error) int {
    status := errorStatusByCode[errorCode(err)]
    return status
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima **somente quando essa linha é a declaração single-line que nomeia o valor retornado** (Explaining Return).

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (struct literal, slice/map literal, call com args quebrados);
- linha acima é **side effect** (chamada sem retorno, atribuição em campo) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto;
- `return` retorna **chamada de função** ou expressão sem variável nomeada: fase própria.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é declaração single-line</summary>

```go
func calculateTotal(items []Item) float64 {
    subtotal := sumItems(items)
    tax := subtotal * TaxRate

    total := subtotal + tax

    return total
}
```

`total` é declaração single-line que nomeia o valor retornado. O blank fragmenta o par Explaining Return; deveria ficar tight.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```go
func buildOrderResponse(order Order, requestID string) OrderResponse {
    data := OrderData{
        ID:    order.ID,
        Total: order.Amount,
        Items: order.Items,
    }

    response := OrderResponse{Data: data, RequestID: requestID}
    return response
}
```

O bloco multi-linha `data` exige blank depois de si. O par `response` + `return response` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando retorna chamada (sem variável nomeada)</summary>

```go
func findPendingOrders(userID int64) ([]Order, error) {
    return orderRepository.FindByStatus(userID, OrderStatusPending)
}
```

Função de uma expressão: o `return` é o único conteúdo, ficou compacto naturalmente.

</details>

## Declaração + guarda em bloco

O padrão idiomático de Go é `result, err := fn()` seguido de `if err != nil { ... }` em bloco multi-linha. O `if` em bloco ocupa peso visual próprio: aplica-se a regra de **multi-linha pede respiro**. A declaração e o `if` formam par tight, com blank **depois** do bloco, não entre eles. O critério é visual, não semântico.

Quando o guarda cabe em **uma única linha** (raro em Go, mas válido, como `if err != nil { return err }` numa linha), o par com a declaração também é tight, e o blank vem depois.

<details>
<summary>❌ Ruim: declaração solta do seu guarda em bloco</summary>

```go
order, err := repository.FindByID(ctx, orderID)

if err != nil {
    return nil, fmt.Errorf("find order: %w", err)
}
invoice := buildInvoice(order)
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em bloco como par, blank depois</summary>

```go
order, err := repository.FindByID(ctx, orderID)
if err != nil {
    return nil, fmt.Errorf("find order: %w", err)
}

invoice := buildInvoice(order)
```

</details>

## Ifs consecutivos: blocos precisam de respiro

Dois `if` consecutivos com **bloco** colados formam muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre insira blank entre eles.

**Exceção:** guardas de uma linha (`if cond { return }`) formam trio homogêneo e ficam tight; a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos {} colados</summary>

```go
func processOrder(order Order) {
    if order.Status == OrderStatusPending {
        notifyCustomer(order)
        scheduleReview(order)
    }
    if order.Amount > 1_000 {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```go
func processOrder(order Order) {
    if order.Status == OrderStatusPending {
        notifyCustomer(order)
        scheduleReview(order)
    }

    if order.Amount > 1_000 {
        flagForAudit(order)
        notifyManager(order)
    }
}
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`const`, `:=` com literal) formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```go
const (
    MinimumDrivingAge   = 18
    OrderStatusApproved = 2

    OneDayMs = 86_400_000
)
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```go
const (
    MinimumDrivingAge   = 18
    OrderStatusApproved = 2
    OneDayMs            = 86_400_000
)
```

Atenção: `const` em bloco aqui ganha alinhamento natural do `gofmt`. Em declarações `:=` dentro de função, use **um espaço único** ao redor de `:=`, sem padding.

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```go
const (
    MinimumDrivingAge   = 18
    OrderStatusApproved = 2

    OneDayMs         = 86_400_000
    MaxRetryAttempts = 3
)
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

```go
func buildShippingLabel(order Order) string {
    fullName := fmt.Sprintf("%s %s", order.Customer.FirstName, order.Customer.LastName)
    addressLine := fmt.Sprintf("%s, %d", order.Address.Street, order.Address.Number)

    cityLine := fmt.Sprintf("%s - %s, %s", order.Address.City, order.Address.State, order.Address.ZipCode)

    label := fmt.Sprintf("%s\n%s\n%s\nOrder #%d", fullName, addressLine, cityLine, order.ID)
    return label
}
```

</details>

<details>
<summary>✅ Bom: par semântico tight</summary>

```go
func buildShippingLabel(order Order) string {
    fullName := fmt.Sprintf("%s %s", order.Customer.FirstName, order.Customer.LastName)
    addressLine := fmt.Sprintf("%s, %d", order.Address.Street, order.Address.Number)

    cityLine := fmt.Sprintf("%s - %s, %s", order.Address.City, order.Address.State, order.Address.ZipCode)
    label := fmt.Sprintf("%s\n%s\n%s\nOrder #%d", fullName, addressLine, cityLine, order.ID)
    return label
}
```

`cityLine + label` formam par semântico encadeado; `label + return label` é Explaining Return tight.

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que **consome múltiplos fragmentos** (não depende só do último), trate a montagem como fase distinta: blank antes dela. Diferente do par semântico encadeado (onde a última depende **diretamente** da penúltima e por isso fica tight).

Heurística:

- A última linha usa **só o valor recém-declarado** acima? → par semântico encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```go
func buildDeliveryMessage(user User, order Order) string {
    fullName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
    address := fmt.Sprintf("%s, %s - %s", order.Address.Street, order.Address.City, order.Address.State)
    deliveryMessage := fmt.Sprintf("Olá %s, seu pedido #%d será entregue em %s em até %d dias úteis.", fullName, order.ID, address, order.DeliveryDays)
    return deliveryMessage
}
```

`deliveryMessage` consome `fullName`, `address`, `order.ID` e `order.DeliveryDays`. Não é par direto com `address`: é a fase de montagem.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```go
func buildDeliveryMessage(user User, order Order) string {
    fullName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
    address := fmt.Sprintf("%s, %s - %s", order.Address.Street, order.Address.City, order.Address.State)

    deliveryMessage := fmt.Sprintf("Olá %s, seu pedido #%d será entregue em %s em até %d dias úteis.", fullName, order.ID, address, order.DeliveryDays)
    return deliveryMessage
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar" (Explaining Return tight).

</details>

## Multi-linha: respiro depois do bloco

Quando um struct literal, slice/map literal ou call quebra em várias linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele para isolar o bloco grande do próximo passo.

<details>
<summary>❌ Ruim: struct literal multi-linha colado ao próximo statement</summary>

```go
func createSession(user User) (string, error) {
    claims := Claims{
        Sub:      user.ID,
        Email:    user.Email,
        Roles:    user.Roles,
        IssuedAt: time.Now().UTC(),
    }
    token, err := signJWT(claims)
    if err != nil {
        return "", fmt.Errorf("sign jwt: %w", err)
    }

    return token, nil
}
```

</details>

<details>
<summary>✅ Bom: blank depois do struct literal isola o bloco</summary>

```go
func createSession(user User) (string, error) {
    claims := Claims{
        Sub:      user.ID,
        Email:    user.Email,
        Roles:    user.Roles,
        IssuedAt: time.Now().UTC(),
    }

    token, err := signJWT(claims)
    if err != nil {
        return "", fmt.Errorf("sign jwt: %w", err)
    }

    return token, nil
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `:=` ou `=` com vários espaços. Use sempre **um espaço único**. O `gofmt` preenche espaço apenas dentro de struct literais e blocos `const`/`var`, e faz isso sozinho, sempre do mesmo jeito.

<details>
<summary>❌ Ruim: espaços extras para alinhar `:=`</summary>

```go
userName     := "alice"
userEmail    := "alice@example.com"
userRole     := "admin"
lastLoginAt  := time.Now().UTC()
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```go
userName := "alice"
userEmail := "alice@example.com"
userRole := "admin"
lastLoginAt := time.Now().UTC()
```

</details>

## Importações

Agrupe importações em blocos: stdlib, externos, internos. `goimports` faz isso automaticamente.

<details>
<summary>✅ Bom: importações em 3 grupos separados por linha em branco</summary>

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/jmoiron/sqlx"
    "golang.org/x/sync/errgroup"

    "github.com/company/my-app/internal/config"
    "github.com/company/my-app/internal/order"
)
```

</details>

## Declarações de struct

Campos de um struct ficam agrupados por responsabilidade. Separação por linha em branco entre grupos lógicos (identificação, configuração, dependências).

<details>
<summary>❌ Ruim: campos sem separação lógica</summary>

```go
type OrderService struct {
    id string
    name string
    repository OrderRepository
    notifier Notifier
    logger *slog.Logger
    timeout time.Duration
    maxRetries int
}
```

</details>

<details>
<summary>✅ Bom: campos agrupados por responsabilidade</summary>

```go
type OrderService struct {
    id   string
    name string

    repository OrderRepository
    notifier   Notifier
    logger     *slog.Logger

    timeout    time.Duration
    maxRetries int
}
```

</details>

## Testes: Assert como fase própria

Em testes, o `assert`/`require` é fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: assert colado ao setup, fases invisíveis</summary>

```go
func TestAppliesTenPercentDiscount(t *testing.T) {
    order := Order{Amount: 100}
    discounted := applyDiscount(order, 0.1)
    expectedAmount := 90.0
    assert.Equal(t, expectedAmount, discounted.Amount)
}
```

</details>

<details>
<summary>✅ Bom: assert separado, assertion como fase própria</summary>

```go
func TestAppliesTenPercentDiscount(t *testing.T) {
    order := Order{Amount: 100}
    discounted := applyDiscount(order, 0.1)
    expectedAmount := 90.0

    assert.Equal(t, expectedAmount, discounted.Amount)
}
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: interpolação densa inline, sem semântica nas partes</summary>

```go
func buildShippingMessage(order Order) string {
    return fmt.Sprintf("%s %s\n%s, %d\n%s - %s, %s\nOrder #%d",
        order.Customer.FirstName, order.Customer.LastName,
        order.Address.Street, order.Address.Number,
        order.Address.City, order.Address.State, order.Address.ZipCode,
        order.ID)
}
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```go
func buildShippingMessage(order Order) string {
    fullName := fmt.Sprintf("%s %s", order.Customer.FirstName, order.Customer.LastName)
    addressLine := fmt.Sprintf("%s, %d", order.Address.Street, order.Address.Number)

    cityLine := fmt.Sprintf("%s - %s, %s", order.Address.City, order.Address.State, order.Address.ZipCode)
    message := fmt.Sprintf("%s\n%s\n%s\nOrder #%d", fullName, addressLine, cityLine, order.ID)
    return message
}
```

</details>
