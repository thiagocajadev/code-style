# Modelagem de entidades

> Escopo: Kotlin. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `@JvmInline value class` para IDs, `data class` para value objects, `abstract class Entity` para entidades, `sealed class` para estados com dados e `companion object` para factories.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Kotlin e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem Kotlin 2.2 com null safety ativo e sem `!!` em código de domínio.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo bloco `init` e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `String` ou `UUID` cru, para impedir trocas acidentais entre IDs |
| **value class** (classe de valor inline) | `@JvmInline value class` que envolve um único valor; sem overhead de alocação em runtime, distinto em tempo de compilação |
| **data class** (classe de dados) | Classe Kotlin que gera `equals`, `hashCode`, `toString` e `copy` automaticamente; idiom natural para value objects |
| **sealed class** (classe selada) | Hierarquia fechada de subtipos; o compilador garante exaustividade no `when` |
| **companion object** | Escopo associado à classe; substitui membros estáticos do Java; idiom para factories e constantes |
| **smart cast** (conversão automática de tipo) | Após checar `is SomeType`, o compilador estreita o tipo automaticamente dentro do bloco, sem cast manual |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo do tipo `T?` que aceita `null` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Exposed, Hibernate, Spring Data JPA) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`; em Kotlin, representado como `UUID` |

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

```kotlin
class Customer(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val email: String,
    val phone: String,
    val birthDate: LocalDate,
    val street: String,
    val number: String,
    val complement: String?,
    val city: String,
    val state: String,
    val zipCode: String,
    val country: String,
    val newsletterOptIn: Boolean,
    val smsOptIn: Boolean,
    val preferredLanguage: String,
    val taxId: String?,
    val taxRegime: String?,
    val invoiceEmail: String?,
)
```

19 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `null` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```kotlin
class Customer private constructor(
    val id: CustomerId,
    val name: String,
    val email: String,
    val address: Address,
    val preferences: CustomerPreferences,
    val taxInfo: TaxInfo?,
)

// Address como data class: equals/hashCode/copy automáticos, todos os campos val
data class Address(
    val street: String,
    val number: String,
    val complement: String?,
    val city: String,
    val state: String,
    val zipCode: String,
    val country: String,
)

data class CustomerPreferences(
    val newsletterOptIn: Boolean,
    val smsOptIn: Boolean,
    val preferredLanguage: String,
)

data class TaxInfo(
    val taxId: String,
    val taxRegime: String,
    val invoiceEmail: String,
) {
    init {
        require(taxId.isNotBlank()) { "TaxInfo requires taxId" }
        require(taxRegime.isNotBlank()) { "TaxInfo requires taxRegime" }
    }
}
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro, e quando presente vem completo porque o bloco `init` garante isso.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T?` demais (8 de 20 sempre `null`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Kotlin, vira `data class` com todos os campos `val` — o compilador gera `equals`, `hashCode` e `copy` por estrutura, que é exatamente a semântica de value object.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `TaxInfo?`; quando presente, o bloco `init` da `data class` garante que vem completo.

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```kotlin
class Customer(
    val id: CustomerId,
    val name: String,
    val email: String,
    // se PJ, esses três aparecem; se PF, ficam null
    val taxId: String?,
    val taxRegime: String?,
    val invoiceEmail: String?,
) {
    fun hasTaxInfo(): Boolean {
        val isFiscallyRegistered = taxId != null && taxRegime != null
        return isFiscallyRegistered
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `taxId` preenchido e `taxRegime` null, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como data class com invariante no init</summary>

```kotlin
data class TaxInfo(
    val taxId: String,
    val taxRegime: String,
    val invoiceEmail: String,
) {
    init {
        require(taxId.isNotBlank()) { "TaxInfo requires taxId" }
        require(taxRegime.isNotBlank()) { "TaxInfo requires taxRegime" }
    }
}

class Customer private constructor(
    val id: CustomerId,
    val name: String,
    val email: String,
    val taxInfo: TaxInfo?,
) {
    fun hasTaxInfo(): Boolean {
        val isFiscallyRegistered = taxInfo != null
        return isFiscallyRegistered
    }
}
```

A invariante "se imposto existe, é completo" mora no bloco `init` da `TaxInfo`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` com campos em branco: o `require` falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `UUID` ou `String`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em Kotlin é custo zero em runtime: `@JvmInline value class`. Em runtime, o compilador substitui o wrapper pelo tipo subjacente diretamente (sem alocação de objeto). Em tempo de compilação, `CustomerId` e `OrderId` são tipos distintos, e a troca quebra antes de compilar. O `companion object` concentra a factory com validação.

<details>
<summary>❌ Ruim: IDs como UUID cru, fáceis de trocar de lugar</summary>

```kotlin
fun transferOwnership(customerId: UUID, orderId: UUID) {
    // assinatura: customerId primeiro, orderId depois
    // se o caller inverter, o bug passa silencioso
    orderRepository.update(orderId, customerId)
}

// uso longe daqui, com nomes locais diferentes:
val source = order.id
val target = customer.id

transferOwnership(source, target) // inverte argumentos; nada acusa
```

</details>

<details>
<summary>✅ Bom: @JvmInline value class elimina alocação e pega troca em compilação</summary>

```kotlin
@JvmInline
value class CustomerId(val value: UUID) {
    companion object {
        fun of(raw: String): CustomerId {
            val parsed = UUID.fromString(raw)
            return CustomerId(parsed)
        }
    }
}

@JvmInline
value class OrderId(val value: UUID) {
    companion object {
        fun of(raw: String): OrderId {
            val parsed = UUID.fromString(raw)
            return OrderId(parsed)
        }
    }
}

fun transferOwnership(customerId: CustomerId, orderId: OrderId) {
    orderRepository.update(orderId, customerId)
}

val newOwnerId = CustomerId.of(rawCustomerId)
val targetOrderId = OrderId.of(rawOrderId)

// trocar a ordem: erro de compilação
transferOwnership(targetOrderId, newOwnerId)
// error: type mismatch. Required: CustomerId, Found: OrderId
```

`@JvmInline` instrui o compilador a substituir o wrapper pelo valor subjacente na bytecode JVM. O custo de alocação desaparece. A proteção de tipo permanece em compile time.

</details>

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `audit: AuditFields`) ou por interface opcional (`Auditable`).
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

Uma decisão importante em Kotlin: nunca use `data class` para entidade. A `data class` gera `equals` por estrutura (valor de todos os campos), o que contradiz a definição de entidade, cuja igualdade é por ID. Além disso, `copy()` produz cópias com o mesmo ID e estado alterado, contornando invariantes do construtor. Use `abstract class` com `equals` e `hashCode` explícitos por ID.

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```kotlin
abstract class BaseEntity(
    val id: UUID,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant?,
    val version: Int,
    val tenantId: UUID,
    val createdBy: String,
    val updatedBy: String,
)

class OrderItem(
    id: UUID,
    val productId: UUID,
    val quantity: Int,
) : BaseEntity(
    id = id,
    createdAt = Instant.now(),
    updatedAt = Instant.now(),
    deletedAt = null,
    version = 1,
    tenantId = UUID.randomUUID(), // valor falso: OrderItem não tem tenant
    createdBy = "",
    updatedBy = "",
)
```

`OrderItem` carrega `tenantId`, `createdBy` e `version` que não usa nem precisa. O construtor da base aceita oito parâmetros para devolver um item de pedido com dois. Os valores falsos no `super(...)` denunciam o problema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica + composição para comportamentos extras</summary>

```kotlin
abstract class Entity<TId : Any>(val id: TId) {
    override fun equals(other: Any?): Boolean {
        if (other == null || other::class != this::class) return false
        val isSameId = (other as Entity<*>).id == this.id
        return isSameId
    }

    override fun hashCode(): Int = id.hashCode()
}

// auditoria por composição, aplicada onde faz sentido
data class AuditFields(
    val createdAt: Instant,
    val updatedAt: Instant,
    val createdBy: String? = null,
    val updatedBy: String? = null,
)

class Customer private constructor(
    id: CustomerId,
    val name: String,
    val email: String,
    val audit: AuditFields,
) : Entity<CustomerId>(id) {
    companion object {
        fun rehydrate(
            id: CustomerId,
            name: String,
            email: String,
            audit: AuditFields,
        ): Customer {
            val customer = Customer(id = id, name = name, email = email, audit = audit)
            return customer
        }
    }
}

class OrderItem private constructor(
    id: OrderItemId,
    val productId: ProductId,
    val quantity: Int,
) : Entity<OrderItemId>(id) {
    // sem auditoria: faz parte do agregado Order, não vive sozinho
}
```

`Entity<TId>` carrega só o que toda entidade precisa. O `equals` compara por ID, conforme a definição de entidade. `OrderItem` não expõe auditoria porque faz parte do agregado `Order` e não vive sozinho. Quem quer auditoria compõe com `AuditFields`.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para Kotlin:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo `val` obrigatório | `val name: String`, `val total: Money` |
| Zero ou um | Campo `val` nullable | `val taxInfo: TaxInfo?` |
| Zero ou mais | `List<T>` read-only exposta, `MutableList<T>` privada | `val lineItems: List<OrderItem>` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em Kotlin, listas públicas usam `List<T>` (read-only por contrato) para impedir que callers façam `add` direto. A mutação interna passa por uma `MutableList<T>` privada, e o método de domínio é a única forma de alterar.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```kotlin
class Customer(
    val id: CustomerId,
    val name: String,
    var phone1: String? = null,
    var phone2: String? = null,
    var phone3: String? = null,
) {
    fun addPhone(number: String) {
        if (phone1 == null) { phone1 = number; return }
        if (phone2 == null) { phone2 = number; return }
        if (phone3 == null) { phone3 = number; return }
        throw IllegalStateException("Customer accepts at most 3 phones")
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra. Os campos precisaram sair de `val` para `var` para permitir mutação.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via List read-only</summary>

```kotlin
enum class PhoneType { MOBILE, HOME, WORK }

data class Phone(val number: String, val type: PhoneType)

class Customer private constructor(
    id: CustomerId,
    val name: String,
) : Entity<CustomerId>(id) {
    private val _phones: MutableList<Phone> = mutableListOf()
    val phones: List<Phone> get() = _phones

    fun addPhone(phone: Phone) {
        if (_phones.size >= 3) {
            throw IllegalArgumentException("Customer can have at most 3 phones")
        }
        _phones.add(phone)
    }

    fun removePhone(number: String) {
        _phones.removeIf { it.number == number }
    }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá para mudar sem mexer no schema. A lista exposta como `List<Phone>` é read-only: callers iteram à vontade, mas não conseguem `add` direto. Lista vazia é o estado neutro: itera sem `?.`.

</details>

Listas seguem a regra de [`null-safety.md`](null-safety.md): nunca null, sempre `emptyList()`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em Kotlin, o construtor da entidade filha pode ser `private` para que só a root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza limite de agregado, então vai por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência ao pai, ciclo bidirecional sem dono</summary>

```kotlin
class Order(val id: OrderId) {
    val items: MutableList<OrderItem> = mutableListOf()
}

class OrderItem(
    val id: OrderItemId,
    val order: Order, // referência completa ao Order
    val productId: ProductId,
    val quantity: Int,
)

val order = Order(id = orderId)
val item = OrderItem(id = itemId, order = order, productId = productId, quantity = 2)
order.items.add(item)

// quem valida que items.length não passa do limite?
// quem garante que removeItem limpa item.order?
// a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```kotlin
class OrderItem private constructor(
    id: OrderItemId,
    val productId: ProductId,
    val quantity: Int,
    val unitPrice: Money,
) : Entity<OrderItemId>(id) {
    companion object {
        fun create(id: OrderItemId, productId: ProductId, quantity: Int, unitPrice: Money): OrderItem {
            require(quantity > 0) { "Quantity must be positive" }
            val item = OrderItem(id = id, productId = productId, quantity = quantity, unitPrice = unitPrice)
            return item
        }
    }

    fun subtotal(): Money {
        val total = unitPrice.multiply(quantity)
        return total
    }
}

class Order private constructor(
    id: OrderId,
    val customerId: CustomerId,
) : Entity<OrderId>(id) {
    private val _items: MutableList<OrderItem> = mutableListOf()
    val lineItems: List<OrderItem> get() = _items

    companion object {
        fun place(id: OrderId, customerId: CustomerId): Order {
            val order = Order(id = id, customerId = customerId)
            return order
        }
    }

    fun addItem(id: OrderItemId, productId: ProductId, quantity: Int, unitPrice: Money) {
        if (_items.size >= 50) {
            throw IllegalArgumentException("Order can have at most 50 items")
        }
        val item = OrderItem.create(id = id, productId = productId, quantity = quantity, unitPrice = unitPrice)
        _items.add(item)
    }

    fun removeItem(itemId: OrderItemId) {
        _items.removeIf { it.id == itemId }
    }

    fun total(): Money {
        val total = _items.fold(Money.zero()) { accumulated, item -> accumulated.add(item.subtotal()) }
        return total
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `List<OrderItem>`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`shared/platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```kotlin
class Student(
    val id: StudentId,
    val name: String,
    val courseIds: MutableList<CourseId> = mutableListOf(),
    val enrollmentDates: MutableList<Instant> = mutableListOf(), // paralelo a courseIds, por índice
) {
    fun enrollmentDateOf(courseId: CourseId): Instant? {
        val position = courseIds.indexOf(courseId)
        if (position == -1) return null
        val enrolledAt = enrollmentDates.getOrNull(position)
        return enrolledAt
    }
}

// se um deles sair de ordem ou perder um elemento, dados ficam inconsistentes
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```kotlin
enum class EnrollmentStatus { ACTIVE, COMPLETED, WITHDRAWN }

class Enrollment private constructor(
    id: EnrollmentId,
    val studentId: StudentId,
    val courseId: CourseId,
    val enrolledAt: Instant,
    private var status: EnrollmentStatus,
    private var finalGrade: Double?,
) : Entity<EnrollmentId>(id) {
    companion object {
        fun open(
            id: EnrollmentId,
            studentId: StudentId,
            courseId: CourseId,
            enrolledAt: Instant,
        ): Enrollment {
            val enrollment = Enrollment(
                id = id,
                studentId = studentId,
                courseId = courseId,
                enrolledAt = enrolledAt,
                status = EnrollmentStatus.ACTIVE,
                finalGrade = null,
            )
            return enrollment
        }
    }

    fun complete(grade: Double) {
        require(status == EnrollmentStatus.ACTIVE) { "Only active enrollments can be completed" }
        require(grade in 0.0..10.0) { "Grade must be between 0 and 10" }
        status = EnrollmentStatus.COMPLETED
        finalGrade = grade
    }
}

class Student private constructor(
    id: StudentId,
    val name: String,
) : Entity<StudentId>(id)

class Course private constructor(
    id: CourseId,
    val title: String,
) : Entity<CourseId>(id)
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `List<CourseId>` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.lineItems` é uma `List<OrderItem>`, não uma `List<OrderItemId>`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId: CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```kotlin
class Order(
    val id: OrderId,
    val customer: Customer, // Customer completo
)

// para criar Order, preciso buscar Customer inteiro do banco
val customer = customerRepository.findById(targetCustomerId)
    ?: throw NotFoundException("Customer not found")

val order = Order(id = newOrderId, customer = customer)

// para serializar Order para o frontend, vai junto Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```kotlin
class Order private constructor(
    id: OrderId,
    val customerId: CustomerId, // ID, não Customer
) : Entity<OrderId>(id) {
    companion object {
        fun place(id: OrderId, customerId: CustomerId): Order {
            val order = Order(id = id, customerId = customerId)
            return order
        }
    }
}

val order = Order.place(id = newOrderId, customerId = targetCustomerId)

// quem precisa do Customer resolve o ID no momento certo
val customer = customerRepository.findById(order.customerId)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status de uma entidade carrega dados além do nome, vale subir de `enum class` simples para `sealed class`. O `when` exaustivo com **smart cast** elimina nulls desnecessários e garante que o compilador avise quando um novo estado não for tratado:

<details>
<summary>✅ Bom: sealed class quando o estado carrega dados</summary>

```kotlin
// status simples: enum basta
enum class OrderStatus { PENDING, SETTLED, SHIPPED, CANCELLED }

// estado com dados: sealed class com smart cast
sealed class OrderState {
    data object Pending : OrderState()
    data class Settled(val settledAt: Instant) : OrderState()
    data class Shipped(val settledAt: Instant, val trackingCode: String) : OrderState()
    data class Cancelled(val cancelledAt: Instant, val reason: String) : OrderState()
}

fun summarize(state: OrderState): String {
    return when (state) {
        is OrderState.Pending -> "Aguardando pagamento"
        is OrderState.Settled -> "Pago em ${state.settledAt}" // smart cast: state.settledAt disponível
        is OrderState.Shipped -> "Enviado, rastreio ${state.trackingCode}"
        is OrderState.Cancelled -> "Cancelado: ${state.reason}"
    }
}
```

Para o estado simples (sem dados associados), `enum class OrderStatus` em um único campo basta. A `sealed class` só ganha tração quando o estado carrega informação própria.

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

```kotlin
@JvmInline
value class TenantId(val value: UUID)

class Order(
    id: OrderId,
    val tenantId: TenantId,
    val customerId: CustomerId,
) : Entity<OrderId>(id)

class OrderItem(
    id: OrderItemId,
    val tenantId: TenantId, // duplica o tenantId do Order
    val productId: ProductId,
    val quantity: Int,
) : Entity<OrderItemId>(id)

fun calculateOrderTotal(order: Order, currentTenant: TenantId): Money {
    require(order.tenantId == currentTenant) { "Tenant mismatch on order" }
    for (item in order.lineItems) {
        require(item.tenantId == currentTenant) { "Tenant mismatch on item" }
    }
    val total = order.total()
    return total
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```kotlin
@JvmInline
value class TenantId(val value: UUID)

class Order private constructor(
    id: OrderId,
    val tenantId: TenantId, // único campo de tenant no agregado
    val customerId: CustomerId,
) : Entity<OrderId>(id)

class OrderItem private constructor(
    id: OrderItemId,
    val productId: ProductId,
    val quantity: Int,
) : Entity<OrderItemId>(id)

interface TenantContext {
    fun current(): TenantId
}

class OrderRepository(
    private val connection: DatabaseConnection,
    private val tenantContext: TenantContext,
) {
    fun findById(orderId: OrderId): Order? {
        val activeTenant = tenantContext.current()
        val row = connection.queryOne(
            "SELECT id, customer_id, tenant_id FROM orders WHERE id = ? AND tenant_id = ?",
            orderId.value,
            activeTenant.value,
        )
        if (row == null) return null
        val order = OrderMapper.toDomain(row)
        return order
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`shared/platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Kotlin real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa, e o construtor da base aceita oito parâmetros. Tratamento: deixar só `id: TId` na base genérica; demais campos viram composição ou interface.

**`data class` para entidade**. Usar `data class` onde a igualdade é por ID. Sintoma: `order1 == order2` retorna `false` mesmo que sejam o mesmo pedido, porque algum campo difere. Pior: `copy()` produz um novo objeto com o mesmo ID, contornando invariantes. Tratamento: `abstract class Entity` com `equals`/`hashCode` por ID.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller obrigado a `?.` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio" e `var` nos campos. Tratamento: `List<Phone>` exposta, `MutableList<Phone>` privada.

**`!!` em código de domínio**. Forçar not-null com `!!` em vez de tratar a ausência. Sintoma: `NullPointerException` em produção onde o compilador poderia ter avisado. Tratamento: `requireNotNull`, `?: return`, `?: throw` ou modelagem que elimina o null.

**Referência direta cruzando agregado**. `Order.customer: Customer` em vez de `Order.customerId: CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático Kotlin

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
