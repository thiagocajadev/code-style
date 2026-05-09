# Naming

> Escopo: Go 1.26.

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```go
func apply(x interface{}, p map[string]interface{}, c func(interface{}) interface{}) interface{} {
    if p["inadimplente"].(bool) {
        return nil
    }
    return c(x)
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```go
func applyDiscount(order Order, calculate func(Order) Order) *Order {
    if order.Customer.Defaulted {
        return nil
    }

    discountedOrder := calculate(order)

    return &discountedOrder
}
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — identificadores em português ficam desajeitados no idioma Go</summary>
<br>

```go
nomeDoUsuario := "Alice"
listaDeIDs := []int{1, 2, 3}

func retornaUsuario(id int) *Usuario { ... }
func buscaEnderecoDoCliente(id int) *Endereco { ... }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```go
userName := "Alice"
idList := []int{1, 2, 3}

func findUser(userID int) *User { ... }
func findCustomerAddress(customerID int) *Address { ... }
```

</details>

## Convenções de case

Go diferencia `exported` (público ao pacote) de `unexported` (interno ao pacote) pela capitalização.
Essa não é uma convenção opcional — é parte da semântica da linguagem.

| Contexto                           | Convenção         | Exemplos                                  |
| ---------------------------------- | ----------------- | ----------------------------------------- |
| Tipos, funções e vars exportadas   | `PascalCase`      | `UserService`, `FindByID`, `MaxRetries`   |
| Vars e funções unexported          | `camelCase`       | `userService`, `findByID`, `maxRetries`   |
| Constantes exportadas              | `PascalCase`      | `DefaultTimeout`, `ErrNotFound`           |
| Interfaces                         | `PascalCase` `-er`| `Reader`, `Stringer`, `UserRepository`    |
| Receptor de método                 | 1–2 letras        | `u *User`, `s *Service`                   |
| Pacotes                            | `lowercase` simples | `order`, `auth`, `httputil`             |

<details>
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```go
const max_retries = 3           // underscore em Go não é idiomático
func Calculate_Total() float64  // underscore em função
type order_service struct {}    // tipo unexported com underscore

// receptor longo
func (service *OrderService) FindByID(id int64) { ... }
```

</details>

<br>

<details>
<summary>✅ Good — convenções Go respeitadas</summary>
<br>

```go
const MaxRetries = 3

func CalculateTotal() float64 { ... }

type OrderService struct{}

// receptor: 1–2 letras baseadas no tipo
func (s *OrderService) FindByID(id int64) { ... }
```

</details>

## Ordem semântica

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```go
func GetProfileUser(userID int64) {}
func UpdateStatusOrder(orderID int64) {}
func CalculateTotalInvoice(invoiceID int64) {}
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```go
func GetUserProfile(userID int64) {}
func UpdateOrderStatus(orderID int64) {}
func CalculateInvoiceTotal(invoiceID int64) {}
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — Handle, Process, Manage não dizem nada</summary>
<br>

```go
func Handle(data interface{}) {}
func Process(input interface{}) {}
func Manage(items []interface{}) {}
func DoStuff(x interface{}) {}
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```go
func ValidatePayment(payment Payment) error { ... }
func CalculateOrderTotal(items []Item) float64 { ... }
func NotifyCustomerDefault(order Order) error { ... }
func ApplySeasonalDiscount(order Order) Order { ... }
```

</details>

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de onde a operação acontece.

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```go
func CallStripe(amount float64) error { ... }
func GetUserFromDB(userID int64) (*User, error) { ... }
func PostToSlack(message string) error { ... }
func SaveToS3(file []byte) error { ... }
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```go
func ChargeCustomer(amount float64) error { ... }
func FindUser(userID int64) (*User, error) { ... }
func NotifyTeam(message string) error { ... }
func ArchiveDocument(file []byte) error { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```go
loading := true
active := user.Status == "active"
valid := strings.Contains(email, "@")
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```go
isActive := user.Status == "active"
hasPermission := slices.Contains(user.Roles, "admin")

canDelete := isActive && hasPermission
shouldRetry := attempt < MaxRetries
```

</details>

## Nomes de erros

Variáveis de erro exportadas recebem o prefixo `Err`; tipos de erro recebem o sufixo `Error`.

<details>
<summary>❌ Bad — nome de erro sem convenção</summary>
<br>

```go
var NotFound = errors.New("not found")
var InvalidInput = errors.New("invalid input")

type ValidationProblem struct { Field string }
```

</details>

<br>

<details>
<summary>✅ Good — prefixo Err + sufixo Error</summary>
<br>

```go
var ErrNotFound = errors.New("not found")
var ErrInvalidInput = errors.New("invalid input")

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s — %s", e.Field, e.Message)
}
```

</details>
