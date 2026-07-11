# Modelagem de entidades

> Escopo: Swift 6. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `struct` como **value object**, `final class` como **entity**, `protocol Entity` com `associatedtype`, `Sendable` em Swift 6 strict mode.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Swift e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido adotar um protocolo base `Entity`. Os exemplos assumem Swift 6 language mode e `Sendable` em todos os tipos trafegados entre tasks.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `[OrderItem]` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item, telefone não passa de 11 dígitos) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `String` ou `UUID` cru, para impedir trocas acidentais entre IDs |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo declarado como `T?` (Optional) quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Core Data, GRDB, SwiftData) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| `struct` | tipo de valor em Swift; cópia automática em atribuição; `Sendable` por padrão quando todos os campos são imutáveis |
| `final class` | tipo de referência não subclassificável; necessário quando a identidade do objeto importa (entity) |
| `protocol` | contrato sem implementação; substitui herança de classe na maioria dos casos; base para `Entity` genérico |
| `associatedtype` | placeholder de tipo em um protocolo; permite que `Entity` seja genérico sobre o tipo do ID sem custo em runtime |
| `Sendable` | protocolo que certifica o tipo como seguro para transferência entre tasks em Swift 6; `struct` com `let` conforma automaticamente |
| `Codable` | composição de `Encodable` + `Decodable`; serialização e desserialização gratuitas quando todos os campos conformam |
| `private(set)` | modificador que restringe escrita ao escopo do tipo, mas permite leitura externa; padrão para campos de entity |
| `Optional` | tipo nativo Swift para "zero ou um" (`T?`); sem ambiguidade entre `nil` e ausência intencional |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo, e ninguém deveria comprometer-se com um. O sinal que funciona é a coesão: as propriedades mudam juntas, são consultadas juntas, fazem sentido juntas. Quando um subconjunto começa a mudar em outro ritmo, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 10 propriedades**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre é sinal de duas entidades coladas na mesma classe. Quebrar.

Quando o nome da entidade não descreve mais o que ela faz e vira lista (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```swift
final class Customer {
    let id: UUID
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let birthDate: Date
    let street: String
    let number: String
    let complement: String?
    let city: String
    let state: String
    let zipCode: String
    let country: String
    let newsletterOptIn: Bool
    let smsOptIn: Bool
    let preferredLanguage: String
    let taxId: String?
    let taxRegime: String?
    let invoiceEmail: String?

    init(
        id: UUID, firstName: String, lastName: String, email: String,
        phone: String, birthDate: Date, street: String, number: String,
        complement: String?, city: String, state: String, zipCode: String,
        country: String, newsletterOptIn: Bool, smsOptIn: Bool,
        preferredLanguage: String, taxId: String?, taxRegime: String?,
        invoiceEmail: String?
    ) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.phone = phone
        self.birthDate = birthDate
        self.street = street
        self.number = number
        self.complement = complement
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.country = country
        self.newsletterOptIn = newsletterOptIn
        self.smsOptIn = smsOptIn
        self.preferredLanguage = preferredLanguage
        self.taxId = taxId
        self.taxRegime = taxRegime
        self.invoiceEmail = invoiceEmail
    }
}
```

20 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `nil` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```swift
final class Customer {
    let id: CustomerId
    let name: String
    let email: String
    let address: Address
    let preferences: CustomerPreferences
    let taxInfo: TaxInfo?

    init(
        id: CustomerId,
        name: String,
        email: String,
        address: Address,
        preferences: CustomerPreferences,
        taxInfo: TaxInfo?
    ) {
        self.id = id
        self.name = name
        self.email = email
        self.address = address
        self.preferences = preferences
        self.taxInfo = taxInfo
    }
}

struct Address: Hashable, Codable, Sendable {
    let street: String
    let number: String
    let complement: String?
    let city: String
    let state: String
    let zipCode: String
    let country: String
}

struct CustomerPreferences: Hashable, Codable, Sendable {
    let newsletterOptIn: Bool
    let smsOptIn: Bool
    let preferredLanguage: String
}

struct TaxInfo: Hashable, Codable, Sendable {
    let taxId: String
    let taxRegime: String
    let invoiceEmail: String
}
```

Cada tipo responde a uma pergunta clara. `Address` é reusado por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é `Optional` inteiro: quando presente, vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T?` demais (8 de 20 sempre `nil`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Swift, vira `struct` com todos os campos `let` (imutáveis por padrão).

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `TaxInfo?`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma `final class` própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```swift
final class Customer {
    let id: CustomerId
    let name: String
    let email: String
    // se PJ, esses três aparecem; se PF, ficam nil
    let taxId: String?
    let taxRegime: String?
    let invoiceEmail: String?

    var hasTaxInfo: Bool {
        taxId != nil && taxRegime != nil
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora na propriedade computada `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `taxId` preenchido e `taxRegime` nil, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, criado via inicializador throwing</summary>

```swift
struct TaxInfo: Hashable, Codable, Sendable {
    let taxId: String
    let taxRegime: String
    let invoiceEmail: String

    init(taxId: String, taxRegime: String, invoiceEmail: String) throws {
        guard !taxId.isEmpty, !taxRegime.isEmpty else {
            throw ValidationError.requiredFields("TaxInfo requires taxId and taxRegime")
        }

        self.taxId = taxId
        self.taxRegime = taxRegime
        self.invoiceEmail = invoiceEmail
    }
}

final class Customer {
    let id: CustomerId
    let name: String
    let email: String
    let taxInfo: TaxInfo?

    var hasTaxInfo: Bool {
        taxInfo != nil
    }

    init(id: CustomerId, name: String, email: String, taxInfo: TaxInfo?) {
        self.id = id
        self.name = name
        self.email = email
        self.taxInfo = taxInfo
    }
}
```

A invariante "se imposto existe, é completo" mora no inicializador throwing de `TaxInfo`. Quem cria um cliente sem imposto passa `nil`. Não tem como construir um `TaxInfo` parcial: o `guard` falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `UUID` ou `String`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em Swift é barata: em vez de espalhar `UUID` cru por todo lugar, embrulhar cada ID em um `struct` próprio (`CustomerId`, `OrderId`, `ProductId`). O `struct` é um **value type**, então `Hashable`, `Codable` e `Sendable` são gratuitos quando o campo interno conforma. A troca acidental quebra em tempo de compilação.

<details>
<summary>❌ Ruim: IDs como UUID cru, fáceis de trocar de lugar</summary>

```swift
func transferOwnership(customerId: UUID, orderId: UUID) {
    // assinatura: customerId primeiro, orderId depois
    // se o caller inverter, o bug passa silencioso
    orderRepository.update(orderId: orderId, customerId: customerId)
}

let newOwnerId = customer.id
let targetOrderId = order.id

// inverte argumentos: nada acusa, tipo de ambos é UUID
transferOwnership(customerId: targetOrderId, orderId: newOwnerId)
```

</details>

<details>
<summary>✅ Bom: ID embrulhado em struct tipado</summary>

```swift
struct CustomerId: Hashable, Codable, Sendable {
    let value: UUID

    static func from(_ raw: String) throws -> CustomerId {
        guard let parsed = UUID(uuidString: raw) else {
            throw ValidationError.invalidFormat("CustomerId expects UUID format, got: \(raw)")
        }

        let identifier = CustomerId(value: parsed)
        return identifier
    }
}

struct OrderId: Hashable, Codable, Sendable {
    let value: UUID

    static func from(_ raw: String) throws -> OrderId {
        guard let parsed = UUID(uuidString: raw) else {
            throw ValidationError.invalidFormat("OrderId expects UUID format, got: \(raw)")
        }

        let identifier = OrderId(value: parsed)
        return identifier
    }
}

func transferOwnership(customerId: CustomerId, orderId: OrderId) {
    orderRepository.update(orderId: orderId, customerId: customerId)
}

let newOwnerId = CustomerId(value: customer.id.value)
let targetOrderId = OrderId(value: order.id.value)

// trocar a ordem: erro de compilação
// transferOwnership(customerId: targetOrderId, orderId: newOwnerId)
// error: cannot convert value of type 'OrderId' to expected argument type 'CustomerId'
```

O compilador rejeita a troca antes do código chegar perto do banco. `struct` garante que `CustomerId` e `OrderId` são tipos distintos mesmo que ambos embrulhem `UUID`. O factory `from(_:)` centraliza a validação quando o ID chega como `String` de um boundary externo (JSON, query string).

</details>

Em projeto com vários IDs, vale criar um protocolo base:

<details>
<summary>✅ Bom: protocolo TypedId para reduzir boilerplate</summary>

```swift
protocol TypedId: Hashable, Codable, Sendable {
    var value: UUID { get }
    init(value: UUID)
}

extension TypedId {
    static func generate() -> Self {
        Self(value: UUID())
    }

    static func from(_ raw: String) throws -> Self {
        guard let parsed = UUID(uuidString: raw) else {
            throw ValidationError.invalidFormat("\(Self.self) expects UUID format, got: \(raw)")
        }

        let identifier = Self(value: parsed)
        return identifier
    }
}

struct CustomerId: TypedId { let value: UUID }
struct OrderId: TypedId { let value: UUID }
struct ProductId: TypedId { let value: UUID }
struct InvoiceId: TypedId { let value: UUID }
```

Cada ID novo custa uma linha. O factory e a validação vivem no protocolo. O compilador continua rejeitando trocas acidentais entre IDs.

</details>

## BaseEntity: o que entra, o que sai

Em Swift, o equivalente de `BaseEntity` é um `protocol Entity` com `associatedtype Id`. A escolha de protocolo em vez de classe base segue o princípio da linguagem: composição sobre herança. Um `protocol` não força herança de classe, permite que `struct` e `final class` conformem com contratos distintos, e não carrega estado próprio.

O risco da base inchada aparece na mesma sequência de sempre: "já que tem protocolo, por que não adicionar auditoria?"; depois soft delete; depois versão e tenant. A regra que funciona é mínima:

- **Entra no protocolo**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai do protocolo**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `audit: AuditFields`) ou por conformidade com um protocolo `Auditable` opcional.
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: BaseEntity inchada como classe, todo mundo herda tudo</summary>

```swift
class BaseEntity {
    let id: UUID
    let createdAt: Date
    let updatedAt: Date
    let deletedAt: Date?
    let version: Int
    let tenantId: UUID
    let createdBy: String
    let updatedBy: String

    init(
        id: UUID, createdAt: Date, updatedAt: Date, deletedAt: Date?,
        version: Int, tenantId: UUID, createdBy: String, updatedBy: String
    ) {
        self.id = id
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.version = version
        self.tenantId = tenantId
        self.createdBy = createdBy
        self.updatedBy = updatedBy
    }
}

final class OrderItem: BaseEntity {
    let productId: ProductId
    let quantity: Int

    init(id: UUID, productId: ProductId, quantity: Int) {
        self.productId = productId
        self.quantity = quantity
        super.init(
            id: id, createdAt: Date(), updatedAt: Date(), deletedAt: nil,
            version: 1, tenantId: UUID(), createdBy: "", updatedBy: ""
        )
    }
}
```

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. O `super.init` aceita oito argumentos para devolver um item de pedido com três. Os `UUID()` e strings vazias denunciam o problema. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: protocol Entity mínimo + composição para comportamentos extras</summary>

```swift
protocol Entity: AnyObject {
    associatedtype Id: TypedId
    var id: Id { get }
}

extension Entity {
    func isEqual(to other: Self) -> Bool {
        let isSameId = id == other.id
        return isSameId
    }
}

struct AuditFields: Codable, Sendable {
    let createdAt: Date
    let updatedAt: Date
    let createdBy: String?
    let updatedBy: String?
}

final class Customer: Entity {
    let id: CustomerId
    let name: String
    let email: String
    private(set) var audit: AuditFields

    init(id: CustomerId, name: String, email: String, audit: AuditFields) {
        self.id = id
        self.name = name
        self.email = email
        self.audit = audit
    }
}

final class OrderItem: Entity {
    let id: OrderItemId
    let productId: ProductId
    let quantity: Int

    init(id: OrderItemId, productId: ProductId, quantity: Int) {
        self.id = id
        self.productId = productId
        self.quantity = quantity
        // sem auditoria: faz parte do agregado Order, não vive sozinho
    }
}
```

`Entity` carrega só o que toda entidade precisa, e o ID já vem tipado via `associatedtype`. Quem quer auditoria compõe com `AuditFields`. `OrderItem` não expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho. O `isEqual` compara por ID, conforme a definição de entidade.

</details>

A escolha de `protocol Entity: AnyObject` (em vez de `class Entity`) também permite que `final class` seja a única forma concreta: ninguém subclassifica uma entidade, apenas conforma o protocolo. Isso fecha a hierarquia sem precisar de `abstract` ou `sealed`.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para Swift:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo `let` obrigatório | `name: String`, `total: Money` |
| Zero ou um | Campo `T?` | `taxInfo: TaxInfo?` |
| Zero ou mais | `[T]` (vazio, nunca nil) | `private(set) var items: [OrderItem]` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em Swift, `Array` é um **value type**: cópia automática em atribuição. Para impedir que callers alterem a lista diretamente, use `private(set) var items: [OrderItem]` na entidade e exponha leitura via propriedade ou método. Mutação interna passa por método de domínio.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```swift
final class Customer {
    let id: CustomerId
    let name: String
    var phone1: String?
    var phone2: String?
    var phone3: String?

    func addPhone(_ value: String) throws {
        if phone1 == nil {
            phone1 = value
            return
        }
        if phone2 == nil {
            phone2 = value
            return
        }
        if phone3 == nil {
            phone3 = value
            return
        }

        throw ValidationError.limitExceeded("Customer accepts at most 3 phones")
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: lista com invariante explícita no método de domínio</summary>

```swift
enum PhoneType: String, Codable, Sendable {
    case mobile, home, work
}

struct Phone: Hashable, Codable, Sendable {
    let number: String
    let type: PhoneType
}

final class Customer: Entity {
    let id: CustomerId
    let name: String
    private(set) var phones: [Phone] = []

    init(id: CustomerId, name: String) {
        self.id = id
        self.name = name
    }

    func addPhone(_ phone: Phone) throws {
        if phones.count >= 3 {
            throw ValidationError.limitExceeded("Customer can have at most 3 phones")
        }

        phones.append(phone)
    }

    func removePhone(number: String) {
        phones.removeAll { $0.number == number }
    }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá pra mudar sem mexer no schema. Lista vazia (`[]`) é o estado neutro: itera sem `?.`, sem caso especial. `private(set)` garante que callers leem, mas não fazem `append` direto.

</details>

Listas seguem a regra de [`null-safety`](null-safety.md#collections-empty-over-optional): nunca nil, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, o inicializador de `OrderItem` pode ser `internal` ou `fileprivate` para que apenas o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza o limite do agregado, então vai por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, ciclo bidirecional sem dono</summary>

```swift
final class Order {
    let id: OrderId
    var items: [OrderItem] = []

    init(id: OrderId) {
        self.id = id
    }
}

final class OrderItem {
    let id: OrderItemId
    let order: Order  // referência completa ao pai
    let productId: ProductId
    let quantity: Int

    init(id: OrderItemId, order: Order, productId: ProductId, quantity: Int) {
        self.id = id
        self.order = order
        self.productId = productId
        self.quantity = quantity
    }
}

let order = Order(id: OrderId(value: UUID()))
let item = OrderItem(id: OrderItemId(value: UUID()), order: order, productId: productId, quantity: 2)
order.items.append(item)

// quem valida que items.count não passa do limite? quem garante que removeItem
// limpa item.order? a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```swift
final class OrderItem: Entity {
    let id: OrderItemId
    let productId: ProductId
    let quantity: Int
    let unitPrice: Money

    init(id: OrderItemId, productId: ProductId, quantity: Int, unitPrice: Money) throws {
        guard quantity > 0 else {
            throw ValidationError.invalidValue("Quantity must be positive")
        }

        self.id = id
        self.productId = productId
        self.quantity = quantity
        self.unitPrice = unitPrice
    }

    func subtotal() -> Money {
        let total = unitPrice.multiplied(by: quantity)
        return total
    }
}

final class Order: Entity {
    let id: OrderId
    let customerId: CustomerId
    private(set) var items: [OrderItem] = []

    private init(id: OrderId, customerId: CustomerId) {
        self.id = id
        self.customerId = customerId
    }

    static func place(id: OrderId, customerId: CustomerId) -> Order {
        let order = Order(id: id, customerId: customerId)
        return order
    }

    func addItem(productId: ProductId, quantity: Int, unitPrice: Money) throws {
        if items.count >= 50 {
            throw ValidationError.limitExceeded("Order can have at most 50 items")
        }

        let item = try OrderItem(
            id: OrderItemId(value: UUID()),
            productId: productId,
            quantity: quantity,
            unitPrice: unitPrice
        )
        items.append(item)
    }

    func removeItem(id: OrderItemId) {
        items.removeAll { $0.id == id }
    }

    func total() -> Money {
        let total = items.reduce(Money.zero) { $0.adding($1.subtotal()) }
        return total
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo; o `private init` impede criação direta.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `[OrderItem]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em arrays paralelos</summary>

```swift
final class Student {
    let id: StudentId
    let name: String
    var courseIds: [CourseId] = []
    var enrollmentDates: [Date] = []  // paralelo a courseIds, por índice

    func enrollmentDate(for courseId: CourseId) -> Date? {
        guard let position = courseIds.firstIndex(of: courseId) else {
            return nil
        }

        let enrolledAt = enrollmentDates[safe: position]
        return enrolledAt
    }
}
```

Dois arrays paralelos: se um deles sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais um array paralelo.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```swift
enum EnrollmentStatus: String, Codable, Sendable {
    case active, completed, withdrawn
}

final class Enrollment: Entity {
    let id: EnrollmentId
    let studentId: StudentId
    let courseId: CourseId
    let enrolledAt: Date
    private(set) var status: EnrollmentStatus
    private(set) var finalGrade: Double?

    init(
        id: EnrollmentId,
        studentId: StudentId,
        courseId: CourseId,
        enrolledAt: Date
    ) {
        self.id = id
        self.studentId = studentId
        self.courseId = courseId
        self.enrolledAt = enrolledAt
        self.status = .active
        self.finalGrade = nil
    }

    func complete(grade: Double) throws {
        guard status == .active else {
            throw ValidationError.invalidState("Only active enrollments can be completed")
        }
        guard (0...10).contains(grade) else {
            throw ValidationError.invalidValue("Grade must be between 0 and 10")
        }

        status = .completed
        finalGrade = grade
    }
}

final class Student: Entity {
    let id: StudentId
    let name: String

    init(id: StudentId, name: String) {
        self.id = id
        self.name = name
    }
}

final class Course: Entity {
    let id: CourseId
    let title: String

    init(id: CourseId, title: String) {
        self.id = id
        self.title = title
    }
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de array.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `[CourseId]` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.items` é `[OrderItem]`, não `[OrderItemId]`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId: CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```swift
final class Order: Entity {
    let id: OrderId
    let customer: Customer  // Customer completo
    private(set) var items: [OrderItem] = []

    init(id: OrderId, customer: Customer) {
        self.id = id
        self.customer = customer
    }
}

// para criar Order, preciso buscar Customer inteiro do banco
let customer = try await customerRepository.find(id: targetCustomerId)
guard let customer else {
    throw NotFoundError("Customer not found")
}

let order = Order(id: OrderId(value: UUID()), customer: customer)

// para serializar Order para o frontend, vou junto enviar Customer completo
// alterações em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```swift
final class Order: Entity {
    let id: OrderId
    let customerId: CustomerId  // ID, não Customer
    private(set) var items: [OrderItem] = []

    private init(id: OrderId, customerId: CustomerId) {
        self.id = id
        self.customerId = customerId
    }

    static func place(id: OrderId, customerId: CustomerId) -> Order {
        let order = Order(id: id, customerId: customerId)
        return order
    }
}

let order = Order.place(id: OrderId(value: UUID()), customerId: targetCustomerId)

// quem precisa do Customer resolve o ID no momento certo
let customer = try await customerRepository.find(id: order.customerId)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status carrega dados além do nome, vale subir para `enum` com **associated values** em vez de campo simples. O Swift realiza pattern matching exaustivo nos `switch`, e o compilador exige tratar todos os casos:

<details>
<summary>✅ Bom: enum com associated values quando o estado carrega dados</summary>

```swift
enum OrderState: Codable, Sendable {
    case pending
    case settled(Date)
    case shipped(Date, trackingCode: String)
    case cancelled(Date, reason: String)
}

func summarize(_ state: OrderState) -> String {
    switch state {
    case .pending:
        let summary = "Pending"
        return summary
    case .settled(let settledAt):
        let summary = "Settled at \(settledAt.ISO8601Format())"
        return summary
    case .shipped(_, let trackingCode):
        let summary = "Shipped, tracking \(trackingCode)"
        return summary
    case .cancelled(_, let reason):
        let summary = "Cancelled: \(reason)"
        return summary
    }
}
```

Para o estado simples (sem dados associados), um `enum OrderStatus: String, Codable, Sendable { case pending, settled, shipped, cancelled }` em um único campo basta. O `enum` com associated values só ganha tração quando o estado carrega informação própria.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenantId`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.tenantId`, `Customer.tenantId`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenantId`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```swift
final class Order: Entity {
    let id: OrderId
    let tenantId: TenantId
    let customerId: CustomerId
    private(set) var items: [OrderItem] = []
}

final class OrderItem: Entity {
    let id: OrderItemId
    let tenantId: TenantId  // duplica o tenantId do Order
    let productId: ProductId
    let quantity: Int
}

func calculateTotal(order: Order, currentTenant: TenantId) throws -> Money {
    guard order.tenantId == currentTenant else {
        throw ForbiddenError("Tenant mismatch on order")
    }
    for item in order.items {
        guard item.tenantId == currentTenant else {
            throw ForbiddenError("Tenant mismatch on item")
        }
    }

    let total = order.total()
    return total
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```swift
final class Order: Entity {
    let id: OrderId
    let tenantId: TenantId  // único campo de tenant no agregado
    let customerId: CustomerId
    private(set) var items: [OrderItem] = []

    init(id: OrderId, tenantId: TenantId, customerId: CustomerId) {
        self.id = id
        self.tenantId = tenantId
        self.customerId = customerId
    }
}

final class OrderItem: Entity {
    let id: OrderItemId
    let productId: ProductId
    let quantity: Int

    init(id: OrderItemId, productId: ProductId, quantity: Int) {
        self.id = id
        self.productId = productId
        self.quantity = quantity
    }
}

protocol TenantContext: Sendable {
    var current: TenantId { get }
}

final class SQLOrderRepository {
    private let database: Database
    private let tenantContext: TenantContext

    init(database: Database, tenantContext: TenantContext) {
        self.database = database
        self.tenantContext = tenantContext
    }

    func find(id: OrderId) async throws -> Order? {
        let activeTenant = tenantContext.current
        let row = try await database.queryOne(
            "SELECT id, customer_id, tenant_id FROM orders WHERE id = ? AND tenant_id = ?",
            [id.value, activeTenant.value]
        )
        guard let row else {
            return nil
        }

        let order = OrderMapper.toDomain(row)
        return order
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Swift real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects (`struct`) ou separar em agregados.

**BaseEntity inchada como classe**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` herda `tenantId` que nunca usa, e o `super.init` aceita oito argumentos. Tratamento: protocolo `Entity` mínimo com `associatedtype Id`; demais campos viram composição (`AuditFields`) ou protocolos opcionais (`Auditable`).

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `nil`. Sintoma: caller obrigado a `?.` e `guard let` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio" e `var` desnecessário. Tratamento: `[Phone]` com invariante em método de domínio.

**`class` onde `struct` é suficiente**. Value object modelado como `class` quando não há identidade nem ciclo de vida compartilhado. Sintoma: referências compartilhadas onde se espera cópia; possível data race em Swift 6. Tratamento: `struct` com `let` em todos os campos; `Sendable` gratuito.

**`UUID` cru como ID**. `customerId: UUID` em vez de `CustomerId`. Sintoma: bug onde `orderId` foi passado no lugar de `customerId` e o compilador aceitou. Tratamento: `struct TypedId` por ID; factory `from(_:) throws` quando vier de boundary externo.

**Referência direta cruzando agregado**. `Order.customer: Customer` em vez de `Order.customerId: CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos; `private init` em `OrderItem` para que só o root produza instâncias.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): limite transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../null-safety.md`](null-safety.md): null-safety idiomático Swift

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-and-domain-modeling).
