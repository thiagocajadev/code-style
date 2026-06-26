# Modelagem de entidades

> Escopo: Go 1.23+. Visão transversal: [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: **named types** sobre primitivos, **embedding** no lugar de herança, **pointer receivers** para métodos que alteram estado, e retorno `T, error` como contrato de factory.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Go e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido usar uma struct base `Entity`. Os exemplos assumem Go 1.23+ com `go vet` e `staticcheck` ativos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade pública do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada de função, limite do agregado, limite do sistema) |
| **named type** (tipo nomeado) | Tipo com nome próprio baseado em primitivo (`type CustomerId string`); o compilador rejeita atribuição cruzada entre tipos nomeados distintos |
| **embedding** (incorporação) | Incluir um struct como campo anônimo dentro de outro para reutilizar campos e métodos sem herança |
| **pointer receiver** (receptor ponteiro) | Método declarado em `*T` que pode alterar o estado do receptor; contraposto ao **value receiver** (cópia) |
| **value receiver** (receptor de valor) | Método declarado em `T` que opera em cópia; indicado para leitura sem efeito colateral |
| **comparable constraint** (restrição comparável) | Restrição de parâmetro de tipo genérico (`comparable`) que aceita tipos que suportam `==` e `!=` |
| **iota** | Enumeração Go: constantes incrementais declaradas em bloco `const`; valor ordinal automático |
| **sentinel error** (erro sentinela) | Variável de erro pré-declarada (`var ErrOrderShipped = errors.New(...)`) comparada via `errors.Is` |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Pointer `*T` quando ausência tem semântica própria; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto os campos e métodos de uma struct pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, struct que sabe demais) | Antipadrão de struct que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Interface que encapsula a persistência de uma entidade ou agregado, isolando SQL e drivers do domínio |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`DeletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo, e ninguém deveria comprometer-se com um. O sinal que funciona é a coesão: os campos mudam juntos, são consultados juntos, fazem sentido juntos. Quando um subconjunto começa a mudar em outro ritmo, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 10 campos**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre é sinal de dois conceitos colados na mesma struct. Quebrar.

Quando o nome da struct não descreve mais o que ela faz e vira lista (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```go
type Customer struct {
	ID                CustomerId
	FirstName         string
	LastName          string
	Email             string
	Phone             string
	BirthDate         time.Time
	Street            string
	Number            string
	Complement        string
	City              string
	State             string
	ZipCode           string
	Country           string
	NewsletterOptIn   bool
	SmsOptIn          bool
	PreferredLanguage string
	TaxId             string
	TaxRegime         string
	InvoiceEmail      string
}
```

19 campos em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a struct. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```go
type Customer struct {
	id          CustomerId
	name        string
	email       string
	address     Address
	preferences CustomerPreferences
	taxInfo     *TaxInfo // nil para pessoa física
}

type Address struct {
	Street     string
	Number     string
	Complement string
	City       string
	State      string
	ZipCode    string
	Country    string
}

type CustomerPreferences struct {
	NewsletterOptIn   bool
	SmsOptIn          bool
	PreferredLanguage string
}

type TaxInfo struct {
	TaxId        string
	TaxRegime    string
	InvoiceEmail string
}
```

Cada struct responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é pointer: `nil` para pessoa física, presente e completo para pessoa jurídica.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida outro).
- Campos opcionais demais (`nil` pointer em 8 de 20).
- Persistência precisa de duas tabelas no banco para uma única struct no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Go, vira struct com campos exportados (ou unexported) e construtor `NewAddress` que valida.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `*TaxInfo`; quando não é `nil`, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `CustomerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```go
type Customer struct {
	id       CustomerId
	name     string
	email    string
	// se PJ, esses três aparecem; se PF, ficam zero value
	taxId        string
	taxRegime    string
	invoiceEmail string
}

func (c *Customer) HasTaxInfo() bool {
	hasTax := c.taxId != "" && c.taxRegime != ""
	return hasTax
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `HasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. Go não tem `null` em string, então zero value `""` e "não informado" ficam indistinguíveis.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, criado via factory</summary>

```go
type TaxInfo struct {
	taxId        string
	taxRegime    string
	invoiceEmail string
}

func NewTaxInfo(taxId, taxRegime, invoiceEmail string) (TaxInfo, error) {
	if taxId == "" || taxRegime == "" {
		return TaxInfo{}, errors.New("TaxInfo requires both taxId and taxRegime")
	}

	info := TaxInfo{taxId: taxId, taxRegime: taxRegime, invoiceEmail: invoiceEmail}
	return info, nil
}

type Customer struct {
	id      CustomerId
	name    string
	email   string
	taxInfo *TaxInfo // nil para pessoa física
}

func (c *Customer) HasTaxInfo() bool {
	return c.taxInfo != nil
}
```

A invariante "se imposto existe, é completo" mora no factory `NewTaxInfo`. Quem cria um cliente sem imposto passa `nil`. Não tem como criar um `TaxInfo` parcial: o construtor retorna erro cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Em Go, a solução idiomática é o **named type** sobre `string` (ou `uuid.UUID`). Diferente de TypeScript, o custo é zero em runtime e a proteção vem do compilador.

<details>
<summary>❌ Ruim: IDs como string crua, fáceis de trocar de lugar</summary>

```go
func TransferOwnership(customerId string, orderId string) error {
	// assinatura: customerId primeiro, orderId depois
	// se o caller inverter, o bug passa silencioso
	return orderRepository.Update(orderId, customerId)
}

// uso longe daqui, com nomes locais diferentes:
a := order.ID
b := customer.ID

TransferOwnership(a, b) // inverte argumentos; nada acusa
```

</details>

<details>
<summary>✅ Bom: named type sobre string; o compilador rejeita a troca</summary>

```go
type CustomerId string
type OrderId string

func NewCustomerId(raw string) (CustomerId, error) {
	if raw == "" {
		return "", errors.New("CustomerId requires a non-empty value")
	}

	id := CustomerId(raw)
	return id, nil
}

func NewOrderId(raw string) (OrderId, error) {
	if raw == "" {
		return "", errors.New("OrderId requires a non-empty value")
	}

	id := OrderId(raw)
	return id, nil
}

func TransferOwnership(customerId CustomerId, orderId OrderId) error {
	return orderRepository.Update(orderId, customerId)
}

// trocar a ordem: erro de compilação
customerId, _ := NewCustomerId("cust-1")
orderId, _ := NewOrderId("ord-1")

TransferOwnership(orderId, customerId)
// cannot use orderId (variable of type OrderId) as type CustomerId
// in argument to TransferOwnership
```

`CustomerId` e `OrderId` têm a mesma representação subjacente (`string`) mas são tipos distintos para o compilador. A factory valida e a troca de argumentos é rejeitada antes de compilar.

</details>

Named type é o idiom preferido em Go porque tem custo zero (nenhuma alocação adicional) e não precisa de generics. Para IDs baseados em UUID, o mesmo padrão se aplica: `type CustomerId uuid.UUID`.

## BaseEntity: o que entra, o que sai

Go não tem herança. A reutilização de `id` e `equals` se dá via **embedding** ou via struct base com generics (Go 1.18+). O risco é o mesmo de qualquer linguagem: o tipo base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `ID`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`). Vão por composição (campo `audit AuditFields`) ou por embedding de `AuditFields` onde fizer sentido.
- **Caso à parte**: `TenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: struct base inchada, todo mundo herda tudo via embedding</summary>

```go
type BaseEntity struct {
	ID        string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
	Version   int
	TenantId  string
	CreatedBy string
	UpdatedBy string
}

type OrderItem struct {
	BaseEntity // carrega TenantId, Version, CreatedBy que não usa
	ProductId  string
	Quantity   int
}
```

`OrderItem` carrega `TenantId`, `CreatedBy`, `Version` que não usa nem precisa. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity genérica mínima + composição para comportamentos extras</summary>

```go
// Entity[TId comparable] encapsula só o que toda entidade precisa.
// O parâmetro TId é restrito a comparable para permitir Equals por valor.
type Entity[TId comparable] struct {
	ID TId
}

func (e Entity[TId]) Equals(other Entity[TId]) bool {
	isSameId := e.ID == other.ID
	return isSameId
}

// AuditFields compostos onde faz sentido, não forçados na base.
type AuditFields struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	CreatedBy string
	UpdatedBy string
}

type Customer struct {
	Entity[CustomerId]
	name    string
	email   string
	audit   AuditFields
}

type OrderItem struct {
	Entity[OrderItemId]
	productId ProductId
	quantity  int
	unitPrice Money
	// sem auditoria: faz parte do agregado Order, não vive sozinho
}
```

`Entity[TId]` carrega só o que toda entidade precisa, e o ID já é tipado. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho.

</details>

O parâmetro genérico `comparable` é a restrição mínima necessária para o `==` em `Equals`. Para IDs que são `string` ou `uuid.UUID`, `comparable` cobre os dois casos sem código extra.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos Go:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `name string`, `total Money` |
| Zero ou um | Pointer `*T` | `taxInfo *TaxInfo` (nil para PF) |
| Zero ou mais | Slice `[]T` (vazio, nunca nil) | `items []OrderItem` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{Street, City, Country}` |

Em Go, listas internas são `[]T` (slice). O método público retorna uma cópia defensiva para que callers não alterem o slice interno diretamente. A mutação passa por método (`AddItem`, `RemoveItem`).

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```go
type Customer struct {
	id     CustomerId
	name   string
	phone1 string
	phone2 string
	phone3 string
}

func (c *Customer) AddPhone(value string) error {
	if c.phone1 == "" {
		c.phone1 = value
		return nil
	}
	if c.phone2 == "" {
		c.phone2 = value
		return nil
	}
	if c.phone3 == "" {
		c.phone3 = value
		return nil
	}

	return errors.New("Customer can have at most 3 phones")
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: slice interno com cópia defensiva na exposição</summary>

```go
type PhoneType string

const (
	PhoneTypeMobile PhoneType = "mobile"
	PhoneTypeHome   PhoneType = "home"
	PhoneTypeWork   PhoneType = "work"
)

type Phone struct {
	Number string
	Type   PhoneType
}

type Customer struct {
	id     CustomerId
	name   string
	phones []Phone
}

func (c *Customer) Phones() []Phone {
	snapshot := make([]Phone, len(c.phones))
	copy(snapshot, c.phones)
	return snapshot
}

func (c *Customer) AddPhone(phone Phone) error {
	if len(c.phones) >= 3 {
		return errors.New("Customer can have at most 3 phones")
	}

	c.phones = append(c.phones, phone)
	return nil
}

func (c *Customer) RemovePhone(number string) {
	filtered := c.phones[:0]
	for _, phone := range c.phones {
		if phone.Number != number {
			filtered = append(filtered, phone)
		}
	}

	c.phones = filtered
}
```

A regra "no máximo 3" mora em `AddPhone`, onde dá pra mudar sem mexer no schema. `Phones()` retorna cópia: callers iteram à vontade, mas não conseguem `append` direto no slice interno. Slice vazio (`[]Phone{}` ou `nil` com `len == 0`) é o estado neutro: itera sem verificação de nil.

</details>

Listas seguem a convenção de [`null-safety`](null-safety.md): inicializar como `nil` é aceitável em Go (o `range` sobre `nil` não quebra), mas retornar cópia explícita do slice evita aliasing acidental.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em Go, a struct da aggregate root é exportada; os campos internos ficam unexported para proteger as invariantes.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza limite de agregado, então vai por ID (`CustomerId`), nunca por struct completa.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, ciclo bidirecional sem dono</summary>

```go
type Order struct {
	ID    OrderId
	items []*OrderItem
}

type OrderItem struct {
	ID        OrderItemId
	Order     *Order // referência completa ao Order
	ProductId ProductId
	Quantity  int
}

order := &Order{ID: orderId}
item := &OrderItem{ID: itemId, Order: order, ProductId: productId, Quantity: 2}
order.items = append(order.items, item)

// quem valida que items nunca passa do limite? quem garante que removeItem
// limpa item.Order? a regra fica diluída entre as duas structs.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```go
type OrderItem struct {
	id        OrderItemId
	productId ProductId
	quantity  int
	unitPrice Money
}

func newOrderItem(productId ProductId, quantity int, unitPrice Money) (OrderItem, error) {
	if quantity <= 0 {
		return OrderItem{}, errors.New("quantity must be positive")
	}

	item := OrderItem{
		id:        OrderItemId(uuid.NewString()),
		productId: productId,
		quantity:  quantity,
		unitPrice: unitPrice,
	}
	return item, nil
}

func (i OrderItem) Subtotal() Money {
	subtotal := i.unitPrice.Multiply(i.quantity)
	return subtotal
}

type Order struct {
	Entity[OrderId]
	customerId CustomerId // ID, não Customer (outro agregado)
	items      []OrderItem
}

func Place(orderId OrderId, customerId CustomerId) *Order {
	order := &Order{
		Entity:     Entity[OrderId]{ID: orderId},
		customerId: customerId,
		items:      []OrderItem{},
	}
	return order
}

func (o *Order) AddItem(productId ProductId, quantity int, unitPrice Money) error {
	if len(o.items) >= 50 {
		return errors.New("Order can have at most 50 items")
	}

	item, err := newOrderItem(productId, quantity, unitPrice)
	if err != nil {
		return fmt.Errorf("AddItem: %w", err)
	}

	o.items = append(o.items, item)
	return nil
}

func (o *Order) RemoveItem(itemId OrderItemId) {
	filtered := o.items[:0]
	for _, item := range o.items {
		if item.id != itemId {
			filtered = append(filtered, item)
		}
	}

	o.items = filtered
}

func (o *Order) Total() Money {
	total := Money{}
	for _, item := range o.items {
		total = total.Add(item.Subtotal())
	}

	return total
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. `newOrderItem` é unexported: só o root produz instâncias. A relação é unidirecional, do dono para os dependentes.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `[]OrderItem`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`../../../shared/platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em slices paralelos</summary>

```go
type Student struct {
	id              StudentId
	name            string
	courseIds       []CourseId
	enrollmentDates []time.Time // paralelo a courseIds, por índice
}

// como saber a data de matrícula do curso "COURSE-42"?
// procurar o índice de COURSE-42 em courseIds, usar esse índice em enrollmentDates
// se um deles sair de ordem ou perder um elemento, dados ficam inconsistentes.
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```go
type EnrollmentStatus string

const (
	EnrollmentStatusActive    EnrollmentStatus = "active"
	EnrollmentStatusCompleted EnrollmentStatus = "completed"
	EnrollmentStatusWithdrawn EnrollmentStatus = "withdrawn"
)

var ErrEnrollmentNotActive = errors.New("only active enrollments can be completed")

type Enrollment struct {
	Entity[EnrollmentId]
	studentId  StudentId
	courseId   CourseId
	enrolledAt time.Time
	status     EnrollmentStatus
	finalGrade *float64 // nil até conclusão
}

func OpenEnrollment(studentId StudentId, courseId CourseId) *Enrollment {
	enrollment := &Enrollment{
		Entity:     Entity[EnrollmentId]{ID: EnrollmentId(uuid.NewString())},
		studentId:  studentId,
		courseId:   courseId,
		enrolledAt: time.Now(),
		status:     EnrollmentStatusActive,
		finalGrade: nil,
	}
	return enrollment
}

func (e *Enrollment) Complete(grade float64) error {
	if e.status != EnrollmentStatusActive {
		return ErrEnrollmentNotActive
	}
	if grade < 0 || grade > 10 {
		return fmt.Errorf("grade must be between 0 and 10, got %.2f", grade)
	}

	e.status = EnrollmentStatusCompleted
	e.finalGrade = &grade
	return nil
}

type Student struct {
	Entity[StudentId]
	name string
}

type Course struct {
	Entity[CourseId]
	title string
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de slice.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo de domínio pode expor `[]CourseId` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.items` é um `[]OrderItem`, não um `[]OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId CustomerId`, nunca pela struct `Customer` completa. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```go
type Order struct {
	Entity[OrderId]
	customer *Customer // Customer completo
	items    []OrderItem
}

// para criar Order, preciso buscar Customer inteiro do banco
customer, err := customerRepository.FindById(ctx, customerId)
if err != nil {
	return nil, fmt.Errorf("Order: %w", err)
}

order := &Order{customer: customer, items: []OrderItem{}}

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```go
type Order struct {
	Entity[OrderId]
	customerId CustomerId // ID, não Customer
	items      []OrderItem
}

order := Place(orderId, customerId)

// quem precisa do Customer resolve o ID no momento certo:
customer, err := customerRepository.FindById(ctx, order.customerId)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Em Go, o status de uma entidade pode usar `type OrderStatus string` com constantes nomeadas quando os estados são simples, ou uma struct discriminada quando cada estado carrega dados próprios:

<details>
<summary>✅ Bom: status como named type com sentinel errors por estado</summary>

```go
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusSettled      OrderStatus = "settled"
	OrderStatusShipped   OrderStatus = "shipped"
	OrderStatusCancelled OrderStatus = "cancelled"
)

var ErrOrderShipped = errors.New("order is already shipped")
var ErrOrderCancelled = errors.New("order is already cancelled")

func (o *Order) Cancel() error {
	if o.status == OrderStatusShipped {
		return ErrOrderShipped
	}
	if o.status == OrderStatusCancelled {
		return ErrOrderCancelled
	}

	o.status = OrderStatusCancelled
	return nil
}
```

`errors.Is` compara por valor de ponteiro de `ErrOrderShipped`, não por string. Caller usa `errors.Is(err, ErrOrderShipped)` para tratar casos distintos. Quando o status carrega dados associados (data de pagamento, código de rastreio), extrair para struct própria e usar `iota` ou string constante como discriminante.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `TenantId`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.TenantId`, `Customer.TenantId`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `TenantId`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: TenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```go
type Order struct {
	Entity[OrderId]
	tenantId   TenantId
	customerId CustomerId
	items      []OrderItem
}

type OrderItem struct {
	Entity[OrderItemId]
	tenantId  TenantId // duplica o tenantId do Order
	productId ProductId
	quantity  int
}

func CalculateOrderTotal(order *Order, currentTenant TenantId) (Money, error) {
	if order.tenantId != currentTenant {
		return Money{}, errors.New("forbidden: tenant mismatch on order")
	}
	for _, item := range order.items {
		if item.tenantId != currentTenant {
			return Money{}, errors.New("forbidden: tenant mismatch on item")
		}
	}

	total := order.Total()
	return total, nil
}
```

</details>

<details>
<summary>✅ Bom: TenantId só no aggregate root, enforcement no repositório</summary>

```go
type TenantId string

type Order struct {
	Entity[OrderId]
	tenantId   TenantId // único campo de tenant no agregado
	customerId CustomerId
	items      []OrderItem
}

type OrderItem struct {
	Entity[OrderItemId]
	productId ProductId
	quantity  int
	// sem tenantId: pertence ao agregado Order
}

type TenantContext interface {
	Current() TenantId
}

type orderRepository struct {
	db            *sql.DB
	tenantContext TenantContext
}

func (r *orderRepository) FindById(ctx context.Context, id OrderId) (*Order, error) {
	activeTenant := r.tenantContext.Current()
	row := r.db.QueryRowContext(
		ctx,
		"SELECT id, customer_id, tenant_id FROM orders WHERE id = $1 AND tenant_id = $2",
		string(id), string(activeTenant),
	)

	order, err := scanOrder(row)
	if err != nil {
		return nil, fmt.Errorf("FindById: %w", err)
	}

	return order, nil
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`../../../shared/platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Go real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Struct com 20+ campos misturando conceitos. Sintoma: o nome vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**Embedding cego de struct base**. `BaseEntity` carregando audit + soft delete + multitenancy + versionamento, forçada em todo struct via embedding. Sintoma: `OrderItem` expõe `TenantId` que nunca usa. Tratamento: deixar só `ID` na base genérica; demais campos viram composição explícita.

**Campos opcionais por design ruim**. Struct com 8 dos 20 campos sempre nil pointer. Sintoma: caller precisa verificar nil a cada acesso. Tratamento: extrair os opcionais em value object com pointer (`*TaxInfo`), ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `Phone1`, `Phone2`, `Phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: `[]Phone` com invariante no método `AddPhone`.

**Mapa mascarado como slice**. Slice de pares `{Key, Value}` quando o domínio diz "acesso por chave". Sintoma: `range` em loop linear toda vez que se quer um valor específico. Tratamento: `map[Key]Value` ou struct indexada.

**Referência direta cruzando agregado**. `Order.Customer *Customer` em vez de `Order.customerId CustomerId`. Sintoma: para carregar um pedido, o repositório puxa cinco tabelas via JOIN. Tratamento: referência por ID; quem precisa da struct resolve no momento certo.

**Struct sem identidade tratada como entidade**. Struct sem `id` consultada por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar nome". Sintoma: comparações com `==` entre structs que deveriam ser distintas. Tratamento: dar identidade explícita com `Entity[TId]`, ou aceitar que é value object e usar igualdade por campos.

**Bidirecionalidade por ponteiro**. `Order.items []*OrderItem` com `OrderItem.order *Order`. Sintoma: bug onde `Order` foi atualizado mas `OrderItem.order` aponta para versão antiga; ciclo de ponteiros dificulta garbage collection. Tratamento: relação unidirecional do aggregate root para os filhos; filhos não conhecem o pai.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`null-safety.md`](null-safety.md): null-safety idiomático Go

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
