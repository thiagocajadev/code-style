# Null Safety

> Escopo: Go 1.26.

Em Go não existe `null`: o equivalente é `nil`. Todo tipo tem um **zero value** (valor zero)
bem definido, o que elimina a maioria dos casos de null inesperado. Ponteiros, interfaces,
maps, slices, channels e funções podem ser `nil` — verifique antes de usar.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **zero value** (valor zero) | Valor inicial de qualquer variável não atribuída: `0`, `false`, `""`, `nil` conforme o tipo |
| `nil` | Valor zero de ponteiros, interfaces, maps, slices, channels e funções |
| **nil pointer dereference** | Panic ao acessar campo ou método de um ponteiro nil; a verificação é a defesa |
| **optional pattern** (padrão opcional) | Retornar `*T, error` ou `T, bool` para sinalizar ausência sem nil implícito |

## Nil pointer dereference

Verifique ponteiros antes de acessar campos ou métodos.

<details>
<summary>❌ Bad — acesso sem verificação de nil</summary>
<br>

```go
func describeOrder(order *Order) string {
    return fmt.Sprintf("order %d: %s", order.ID, order.Status)
    // panic se order for nil
}
```

</details>

<br>

<details>
<summary>✅ Good — verificação explícita antes do acesso</summary>
<br>

```go
func describeOrder(order *Order) string {
    if order == nil {
        return "no order"
    }

    description := fmt.Sprintf("order %d: %s", order.ID, order.Status)

    return description
}
```

</details>

## Zero value ao invés de ponteiro

Prefira valor ao invés de ponteiro para structs que têm um estado "vazio" representável
pelo zero value. Ponteiro só quando nil tem semântica de "ausente".

<details>
<summary>❌ Bad — ponteiro para representar "vazio" onde zero value bastaria</summary>
<br>

```go
type Address struct {
    Street string
    City   string
    State  string
}

type User struct {
    ID      int64
    Name    string
    Address *Address  // ponteiro: nil significa "sem endereço"?
}

func printAddress(user User) {
    if user.Address != nil {
        fmt.Println(user.Address.City)
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — zero value é estado vazio válido; ponteiro apenas com semântica clara</summary>
<br>

```go
type Address struct {
    Street string
    City   string
    State  string
}

func (a Address) IsEmpty() bool {
    return a.Street == "" && a.City == "" && a.State == ""
}

type User struct {
    ID      int64
    Name    string
    Address Address  // zero value: Address{} é endereço não preenchido
}

func printAddress(user User) {
    if !user.Address.IsEmpty() {
        fmt.Println(user.Address.City)
    }
}
```

</details>

## Maps e slices nil

Maps nil causam panic ao escrever. Slices nil são válidos para leitura e `append`,
mas comunique a ausência explicitamente.

<details>
<summary>❌ Bad — escrita em map nil</summary>
<br>

```go
type OrderIndex struct {
    byCustomer map[int64][]Order
}

func (oi *OrderIndex) Add(order Order) {
    oi.byCustomer[order.CustomerID] = append(oi.byCustomer[order.CustomerID], order)
    // panic se byCustomer for nil
}
```

</details>

<br>

<details>
<summary>✅ Good — map inicializado no construtor</summary>
<br>

```go
type OrderIndex struct {
    byCustomer map[int64][]Order
}

func NewOrderIndex() *OrderIndex {
    return &OrderIndex{
        byCustomer: make(map[int64][]Order),
    }
}

func (oi *OrderIndex) Add(order Order) {
    oi.byCustomer[order.CustomerID] = append(oi.byCustomer[order.CustomerID], order)
}
```

</details>

## Interface nil — armadilha

Uma interface Go contém dois campos internos: tipo e valor. Uma interface é nil apenas
se ambos forem nil. Um ponteiro nil atribuído a uma interface não é nil.

<details>
<summary>❌ Bad — comparação incorreta de interface com nil</summary>
<br>

```go
type Logger interface {
    Log(msg string)
}

func newLogger(debug bool) Logger {
    if !debug {
        var l *FileLogger  // ponteiro nil
        return l            // interface não é nil! tem tipo *FileLogger com valor nil
    }
    return &FileLogger{}
}

logger := newLogger(false)
if logger == nil {  // FALSO: interface tem tipo, não é nil
    fmt.Println("no logger")
}
```

</details>

<br>

<details>
<summary>✅ Good — retornar nil de interface diretamente</summary>
<br>

```go
func newLogger(debug bool) Logger {
    if !debug {
        return nil  // nil de interface: sem tipo, sem valor
    }

    return &FileLogger{}
}

logger := newLogger(false)
if logger == nil {  // VERDADEIRO: nil de interface
    fmt.Println("no logger")
}
```

</details>

## ok idiom — presença explícita

Para mapas e type assertions, use a forma de dois retornos para distinguir ausência
de zero value.

<details>
<summary>✅ Good — ok idiom para map lookup e type assertion</summary>
<br>

```go
// map: distingue "chave ausente" de "valor é zero"
order, ok := orderCache[orderID]
if !ok {
    return nil, ErrNotFound
}

// type assertion: sem panic em caso de tipo errado
orderEvent, ok := event.(*OrderEvent)
if !ok {
    return fmt.Errorf("unexpected event type: %T", event)
}
```

</details>
