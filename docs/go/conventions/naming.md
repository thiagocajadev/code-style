# Naming

> Escopo: Go 1.26.

Nomes bons tornam comentários desnecessários. Quando o identificador carrega a intenção, o leitor entende a função sem abrir o corpo.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **MixedCaps** (CamelCase em Go) | convenção idiomática: `OrderService`, `findActiveOrder`; sem underscore em identificadores |
| **exported** (exportado) | identificador iniciado em maiúscula é visível fora do pacote |
| **unexported** (não exportado) | identificador iniciado em minúscula só é acessível dentro do pacote |
| **package name** (nome de pacote) | curto, em minúsculas, sem underscore; um nome por diretório (`order`, `payment`) |
| **receiver name** (nome de receptor) | abreviação consistente do tipo, geralmente 1–2 letras (`o *Order`, `s *Service`) |
| **boolean prefix** (prefixo booleano) | `Is`, `Has`, `Can`, `Should` revelam intenção em flags e métodos lógicos |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```go
func apply(x interface{}, p map[string]interface{}, c func(interface{}) interface{}) interface{} {
    if p["inadimplente"].(bool) {
        return nil
    }
    return c(x)
}
```

</details>

<details>
<summary>✅ Bom</summary>

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
<summary>❌ Ruim: identificadores em português ficam desajeitados no idioma Go</summary>

```go
nomeDoUsuario := "Alice"
listaDeIDs := []int{1, 2, 3}

func retornaUsuario(id int) *Usuario { ... }
func buscaEnderecoDoCliente(id int) *Endereco { ... }
```

</details>

<details>
<summary>✅ Bom: inglês: curto, direto, universal</summary>

```go
userName := "Alice"
idList := []int{1, 2, 3}

func findUser(userID int) *User { ... }
func findCustomerAddress(customerID int) *Address { ... }
```

</details>

## Convenções de case

Go diferencia `exported` (público ao pacote) de `unexported` (interno ao pacote) pela capitalização.
Essa não é uma convenção opcional: é parte da semântica da linguagem.

| Contexto                           | Convenção         | Exemplos                                  |
| ---------------------------------- | ----------------- | ----------------------------------------- |
| Tipos, funções e vars exportadas   | `PascalCase`      | `UserService`, `FindByID`, `MaxRetries`   |
| Vars e funções unexported          | `camelCase`       | `userService`, `findByID`, `maxRetries`   |
| Constantes exportadas              | `PascalCase`      | `DefaultTimeout`, `ErrNotFound`           |
| Interfaces                         | `PascalCase` `-er`| `Reader`, `Stringer`, `UserRepository`    |
| Receptor de método                 | 1–2 letras        | `u *User`, `s *Service`                   |
| Pacotes                            | `lowercase` simples | `order`, `auth`, `httputil`             |

<details>
<summary>❌ Ruim: case errado para o contexto</summary>

```go
const max_retries = 3           // underscore em Go não é idiomático
func Calculate_Total() float64  // underscore em função
type order_service struct {}    // tipo unexported com underscore

// receptor longo
func (service *OrderService) FindByID(id int64) { ... }
```

</details>

<details>
<summary>✅ Bom: convenções Go respeitadas</summary>

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
<summary>❌ Ruim: ordem invertida</summary>

```go
func GetProfileUser(userID int64) {}
func UpdateStatusOrder(orderID int64) {}
func CalculateTotalInvoice(invoiceID int64) {}
```

</details>

<details>
<summary>✅ Bom: ordem natural</summary>

```go
func GetUserProfile(userID int64) {}
func UpdateOrderStatus(orderID int64) {}
func CalculateInvoiceTotal(invoiceID int64) {}
```

</details>

## Verbos genéricos

<details>
<summary>❌ Ruim: Handle, Process, Manage não dizem nada</summary>

```go
func Handle(data interface{}) {}
func Process(input interface{}) {}
func Manage(items []interface{}) {}
func DoStuff(x interface{}) {}
```

</details>

<details>
<summary>✅ Bom: verbo de intenção</summary>

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
<summary>❌ Ruim: nome revela infraestrutura, não domínio</summary>

```go
func CallStripe(amount float64) error { ... }
func GetUserFromDB(userID int64) (*User, error) { ... }
func PostToSlack(message string) error { ... }
func SaveToS3(file []byte) error { ... }
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```go
func ChargeCustomer(amount float64) error { ... }
func FindUser(userID int64) (*User, error) { ... }
func NotifyTeam(message string) error { ... }
func ArchiveDocument(file []byte) error { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```go
loading := true
active := user.Status == "active"
valid := strings.Contains(email, "@")
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

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
<summary>❌ Ruim: nome de erro sem convenção</summary>

```go
var NotFound = errors.New("not found")
var InvalidInput = errors.New("invalid input")

type ValidationProblem struct { Field string }
```

</details>

<details>
<summary>✅ Bom: prefixo Err + sufixo Error</summary>

```go
var ErrNotFound = errors.New("not found")
var ErrInvalidInput = errors.New("invalid input")

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}
```

</details>
