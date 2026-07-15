# Modelagem de entidades

> Escopo: Java 25 LTS. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `record` nativo para value objects, `sealed interface` para hierarquias de estado, `Optional` para ausência semântica, `List.copyOf` para coleções imutáveis e classe `abstract` genérica para a base de entidade.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Java e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem Java 25 LTS com `--enable-preview` desligado; qualquer recurso usado está estável.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItems` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor compacto do record ou pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Linha entre dois contextos onde os dados são validados ao atravessar (entrada do método, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `String` ou `UUID` cru, para impedir trocas acidentais entre IDs |
| **record** (registro imutável) | Tipo de dados conciso introduzido no Java 14; gera construtor, getters, `equals`, `hashCode` e `toString` automaticamente; adequado para value objects |
| **compact constructor** (construtor compacto) | Construtor especial de `record` sem lista de parâmetros; ideal para validação de invariantes antes da atribuição dos campos |
| **sealed interface** (interface selada) | Interface com `permits` explícito; o compilador verifica exaustividade no `switch`, adequada para hierarquias de estado com dados associados |
| **Optional** (opcional, contêiner de ausência) | `java.util.Optional<T>`; retorno que declara explicitamente que o valor pode estar ausente; nunca usado em campos de instância ou parâmetros |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo que aceita `null` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Hibernate, Spring Data JPA, JOOQ) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits; em Java representado por `java.util.UUID` |

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

```java
public final class Customer {
    private final String id;
    private final String firstName;
    private final String lastName;
    private final String email;
    private final String phone;
    private final String street;
    private final String number;
    private final String city;
    private final String state;
    private final String zipCode;
    private final String country;
    private final boolean newsletterOptIn;
    private final boolean smsOptIn;
    private final String preferredLanguage;
    private final String taxId;
    private final String taxRegime;
    private final String invoiceEmail;

    public Customer(
        String id, String firstName, String lastName, String email,
        String phone, String street, String number, String city,
        String state, String zipCode, String country,
        boolean newsletterOptIn, boolean smsOptIn,
        String preferredLanguage, String taxId,
        String taxRegime, String invoiceEmail
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.street = street;
        this.number = number;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.country = country;
        this.newsletterOptIn = newsletterOptIn;
        this.smsOptIn = smsOptIn;
        this.preferredLanguage = preferredLanguage;
        this.taxId = taxId;
        this.taxRegime = taxRegime;
        this.invoiceEmail = invoiceEmail;
    }
}
```

17 campos em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```java
public final class Customer extends Entity<CustomerId> {
    private final String name;
    private final String email;
    private final Address address;
    private final CustomerPreferences preferences;
    private final TaxInfo taxInfo; // null quando pessoa física

    private Customer(
        CustomerId id,
        String name,
        String email,
        Address address,
        CustomerPreferences preferences,
        TaxInfo taxInfo
    ) {
        super(id);
        this.name = name;
        this.email = email;
        this.address = address;
        this.preferences = preferences;
        this.taxInfo = taxInfo;
    }
}

// Address é um record: value object imutável com igualdade estrutural grátis
public record Address(
    String street,
    String number,
    String complement,
    String city,
    String state,
    String zipCode,
    String country
) {
    public Address {
        if (street == null || street.isBlank()) {
            throw new IllegalArgumentException("Address requires street.");
        }
        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("Address requires city.");
        }
    }
}

public record CustomerPreferences(
    boolean newsletterOptIn,
    boolean smsOptIn,
    String preferredLanguage
) {}

public record TaxInfo(String taxId, String taxRegime, String invoiceEmail) {
    public TaxInfo {
        if (taxId == null || taxId.isBlank()) {
            throw new IllegalArgumentException("TaxInfo requires taxId.");
        }
        if (taxRegime == null || taxRegime.isBlank()) {
            throw new IllegalArgumentException("TaxInfo requires taxRegime.");
        }
    }
}
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro; quando presente, vem completo e validado.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`null` em 8 de 17).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Java, use `record` para igualdade estrutural grátis e imutabilidade garantida pelo compilador. Quando o value object precisa de comportamento adicional (métodos que calculam ou transformam), prefira classe `final` com campos `private final`.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `null` quando ausente; quando presente, traz o conceito completo (todos os campos juntos, validados juntos pelo construtor compacto).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. O satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```java
public final class Customer extends Entity<CustomerId> {
    private final String name;
    private final String email;
    private final String taxId;      // null quando PF
    private final String taxRegime;  // null quando PF
    private final String invoiceEmail; // null quando PF

    public boolean hasTaxInfo() {
        return taxId != null && taxRegime != null;
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `taxId` preenchido e `taxRegime` `null`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como record opcional, invariante no construtor compacto</summary>

```java
public record TaxInfo(String taxId, String taxRegime, String invoiceEmail) {
    public TaxInfo {
        if (taxId == null || taxId.isBlank()) {
            throw new IllegalArgumentException("TaxInfo requires taxId.");
        }
        if (taxRegime == null || taxRegime.isBlank()) {
            throw new IllegalArgumentException("TaxInfo requires taxRegime.");
        }
    }
}

public final class Customer extends Entity<CustomerId> {
    private final String name;
    private final String email;
    private final TaxInfo taxInfo; // null quando PF

    public boolean hasTaxInfo() {
        return taxInfo != null;
    }
}
```

A invariante "se imposto existe, é completo" mora no construtor compacto de `TaxInfo`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` parcial: o compilador chama o construtor compacto em toda instanciação.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `UUID` ou `String`, o compilador e os testes não enxergam a troca, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em Java é barata: usar `record` para embrulhar cada ID em um tipo próprio (`CustomerId`, `OrderId`, `ProductId`). O `record` entrega `equals` e `hashCode` estruturais de graça, baseados no campo `value`. A troca entre `CustomerId` e `OrderId` quebra em tempo de compilação. O factory `of` é o único ponto que produz o tipo, com validação concentrada.

<details>
<summary>❌ Ruim: IDs como UUID cru, fáceis de trocar de lugar</summary>

```java
public void transferOwnership(UUID customerId, UUID orderId) {
    // assinatura: customerId primeiro, orderId depois
    // se o caller inverter, o bug passa silencioso
    orderRepository.update(orderId, customerId);
}

// uso longe daqui, com nomes locais diferentes:
var targetOrder = order.getId();
var newOwner = customer.getId();

// inverte argumentos; nada acusa: ambos são UUID
transferOwnership(targetOrder, newOwner);
```

</details>

<details>
<summary>✅ Bom: ID embrulhado em record próprio, factory com validação</summary>

```java
public record CustomerId(UUID value) {
    public CustomerId {
        if (value == null) {
            throw new IllegalArgumentException("CustomerId requires a value.");
        }
    }

    public static CustomerId of(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("CustomerId requires a non-blank string.");
        }
        var parsed = UUID.fromString(raw); // lança se o formato for inválido
        var customerId = new CustomerId(parsed);
        return customerId;
    }
}

public record OrderId(UUID value) {
    public OrderId {
        if (value == null) {
            throw new IllegalArgumentException("OrderId requires a value.");
        }
    }

    public static OrderId of(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("OrderId requires a non-blank string.");
        }
        var parsed = UUID.fromString(raw);
        var orderId = new OrderId(parsed);
        return orderId;
    }
}

public void transferOwnership(CustomerId customerId, OrderId orderId) {
    orderRepository.update(orderId, customerId);
}

var targetOrder = OrderId.of(order.getRawId());
var newOwner = CustomerId.of(customer.getRawId());

// trocar a ordem: erro de compilação
// transferOwnership(targetOrder, newOwner);
// error: incompatible types: OrderId cannot be converted to CustomerId
```

O `record` declara `equals` e `hashCode` pelo campo `value`, então `CustomerId("abc").equals(CustomerId("abc"))` retorna `true` sem nenhum código extra. O compilador rejeita a troca cedo, antes do código chegar perto do banco.

</details>

Em projeto pequeno, dá para começar com `UUID` cru e migrar quando o primeiro bug de troca aparecer. Em projeto com vários IDs parecidos (`customerId`, `orderId`, `productId`, `invoiceId`), o investimento se paga rápido: cada bug de troca evitado poupa horas de diagnóstico em produção.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `AuditFields`) ou por interface opcional (`Auditable`) implementada apenas onde faz sentido.
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```java
public abstract class BaseEntity {
    protected final String id;
    protected final Instant createdAt;
    protected final Instant updatedAt;
    protected final Instant deletedAt;
    protected final int version;
    protected final String tenantId;
    protected final String createdBy;
    protected final String updatedBy;

    protected BaseEntity(
        String id, Instant createdAt, Instant updatedAt, Instant deletedAt,
        int version, String tenantId, String createdBy, String updatedBy
    ) {
        this.id = id;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.deletedAt = deletedAt;
        this.version = version;
        this.tenantId = tenantId;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }
}

public final class OrderItem extends BaseEntity {
    private final String productId;
    private final int quantity;

    public OrderItem(String id, String productId, int quantity) {
        // passa null/0/"" para campos que OrderItem não usa
        super(id, Instant.now(), Instant.now(), null, 0, "", "", "");
        this.productId = productId;
        this.quantity = quantity;
    }
}
```

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. Os valores vazios no `super(...)` denunciam o problema. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica + composição para comportamentos extras</summary>

```java
public abstract class Entity<TId> {
    protected final TId id;

    protected Entity(TId id) {
        if (id == null) {
            throw new IllegalArgumentException("Entity requires id.");
        }
        this.id = id;
    }

    public TId getId() {
        return id;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (other == null || getClass() != other.getClass()) return false;
        var entity = (Entity<?>) other;
        return id.equals(entity.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

// auditoria por composição, aplicada onde faz sentido
public record AuditFields(
    Instant createdAt,
    Instant updatedAt,
    String createdBy,
    String updatedBy
) {}

public final class Customer extends Entity<CustomerId> {
    private final String name;
    private final String email;
    private final AuditFields audit;

    public Customer(CustomerId id, String name, String email, AuditFields audit) {
        super(id);
        this.name = name;
        this.email = email;
        this.audit = audit;
    }
}

public final class OrderItem extends Entity<OrderItemId> {
    private final ProductId productId;
    private final int quantity;

    public OrderItem(OrderItemId id, ProductId productId, int quantity) {
        super(id);
        this.productId = productId;
        this.quantity = quantity;
        // sem auditoria: faz parte do agregado Order, não vive sozinho
    }
}
```

`Entity<TId>` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria porque faz parte do agregado `Order` e não vive sozinho. O `equals` compara por ID, conforme a definição de entidade.

</details>

Em Java, `interface` com método `default` pode adicionar comportamento sem herança. `Auditable`, `SoftDeletable` e similares ficam como interfaces com campo de composição injetado pelo repositório, mantendo a base enxuta.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, e ignora o estado do momento. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos Java:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `Customer.name`, `Order.total` |
| Zero ou um | Campo `@Nullable` ou `Optional<T>` em retorno | `Optional<TaxInfo> getTaxInfo()` |
| Zero ou mais | `List<T>` (vazia, nunca null) | `order.getItems()`, `customer.getPhones()` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Listas internas são `private final List<T>` com `ArrayList` como implementação; retornos públicos usam `List.copyOf(items)` ou `Collections.unmodifiableList(items)` para impedir que callers façam `add` direto. A mutação passa por um método de domínio.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```java
public final class Customer extends Entity<CustomerId> {
    private String phone1;
    private String phone2;
    private String phone3;

    public void addPhone(String number) {
        if (phone1 == null) {
            phone1 = number;
            return;
        }
        if (phone2 == null) {
            phone2 = number;
            return;
        }
        if (phone3 == null) {
            phone3 = number;
            return;
        }

        throw new IllegalStateException("Customer can have at most 3 phones.");
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone vira uma mudança de schema, quando deveria ser só uma mudança de regra.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição imutável via List.copyOf</summary>

```java
public enum PhoneType { MOBILE, HOME, WORK }

public record Phone(String number, PhoneType type) {
    public Phone {
        if (number == null || number.isBlank()) {
            throw new IllegalArgumentException("Phone requires number.");
        }
    }
}

public final class Customer extends Entity<CustomerId> {
    private final String name;
    private final List<Phone> phones = new ArrayList<>();

    public Customer(CustomerId id, String name) {
        super(id);
        this.name = name;
    }

    public List<Phone> getPhones() {
        var snapshot = List.copyOf(phones);
        return snapshot;
    }

    public void addPhone(Phone phone) {
        if (phones.size() >= 3) {
            throw new IllegalStateException("Customer can have at most 3 phones.");
        }
        phones.add(phone);
    }

    public void removePhone(String number) {
        phones.removeIf(phone -> phone.number().equals(number));
    }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá para mudar sem mexer no schema. A lista exposta é imutável (`List.copyOf`): callers iteram à vontade mas não conseguem `add` direto, então o limite continua valendo. Lista vazia (`[]`) é o estado neutro.

</details>

Listas seguem a regra de [`null-safety`](null-safety.md): nunca null, sempre lista vazia. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. O construtor de `OrderItem` pode ser package-private para que só o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência cruza limite de agregado por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, ciclo bidirecional sem dono</summary>

```java
public final class Order extends Entity<OrderId> {
    private final List<OrderItem> items = new ArrayList<>();

    public Order(OrderId id) {
        super(id);
    }
}

public final class OrderItem extends Entity<OrderItemId> {
    private final Order order; // referência completa ao Order
    private final ProductId productId;
    private final int quantity;

    public OrderItem(OrderItemId id, Order order, ProductId productId, int quantity) {
        super(id);
        this.order = order;
        this.productId = productId;
        this.quantity = quantity;
    }
}
```

Quem valida que `items.size()` não passa do limite? Quem garante que `removeItem` remove a referência correta? A regra fica diluída entre as duas classes.

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```java
public final class OrderItem extends Entity<OrderItemId> {
    private final ProductId productId;
    private final int quantity;
    private final BigDecimal unitPrice;

    // package-private: só Order instancia OrderItem diretamente
    OrderItem(OrderItemId id, ProductId productId, int quantity, BigDecimal unitPrice) {
        super(id);
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive.");
        }
        this.productId = productId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    public BigDecimal subtotal() {
        var total = unitPrice.multiply(BigDecimal.valueOf(quantity));
        return total;
    }
}

public final class Order extends Entity<OrderId> {
    private final CustomerId customerId; // ID, não Customer (outro agregado)
    private final List<OrderItem> items = new ArrayList<>();

    private Order(OrderId id, CustomerId customerId) {
        super(id);
        this.customerId = customerId;
    }

    public static Order place(OrderId id, CustomerId customerId) {
        var order = new Order(id, customerId);
        return order;
    }

    public List<OrderItem> getItems() {
        var snapshot = List.copyOf(items);
        return snapshot;
    }

    public void addItem(OrderItemId itemId, ProductId productId, int quantity, BigDecimal unitPrice) {
        if (items.size() >= 50) {
            throw new IllegalStateException("Order can have at most 50 items.");
        }
        var item = new OrderItem(itemId, productId, quantity, unitPrice);
        items.add(item);
    }

    public void removeItem(OrderItemId itemId) {
        items.removeIf(item -> item.getId().equals(itemId));
    }

    public BigDecimal total() {
        var total = items.stream()
            .map(OrderItem::subtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total;
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. O relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```java
public final class Student extends Entity<StudentId> {
    private final String name;
    private final List<CourseId> courseIds = new ArrayList<>();
    private final List<Instant> enrollmentDates = new ArrayList<>(); // paralelo a courseIds, por índice

    // como saber a data de matrícula do curso 'COURSE-42'?
    // procurar o índice em courseIds, usar esse índice em enrollmentDates.
    // se um deles sair de ordem, os dados ficam inconsistentes.
}
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```java
public enum EnrollmentStatus { ACTIVE, COMPLETED, WITHDRAWN }

public final class Enrollment extends Entity<EnrollmentId> {
    private final StudentId studentId;
    private final CourseId courseId;
    private final Instant enrolledAt;
    private EnrollmentStatus status;
    private Integer finalGrade; // null enquanto não concluída

    private Enrollment(
        EnrollmentId id,
        StudentId studentId,
        CourseId courseId,
        Instant enrolledAt
    ) {
        super(id);
        this.studentId = studentId;
        this.courseId = courseId;
        this.enrolledAt = enrolledAt;
        this.status = EnrollmentStatus.ACTIVE;
        this.finalGrade = null;
    }

    public static Enrollment open(
        EnrollmentId id,
        StudentId studentId,
        CourseId courseId,
        Instant enrolledAt
    ) {
        var enrollment = new Enrollment(id, studentId, courseId, enrolledAt);
        return enrollment;
    }

    public void complete(int grade) {
        if (status != EnrollmentStatus.ACTIVE) {
            throw new IllegalStateException("Only active enrollments can be completed.");
        }
        if (grade < 0 || grade > 10) {
            throw new IllegalArgumentException("Grade must be between 0 and 10.");
        }
        status = EnrollmentStatus.COMPLETED;
        finalGrade = grade;
    }
}

public final class Student extends Entity<StudentId> {
    private final String name;

    public Student(StudentId id, String name) {
        super(id);
        this.name = name;
    }
}

public final class Course extends Entity<CourseId> {
    private final String title;

    public Course(CourseId id, String title) {
        super(id);
        this.title = title;
    }
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `List<CourseId>` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, a referência direta é o caminho natural: `Order.items` guarda os próprios `OrderItem`, com o objeto inteiro dentro da lista. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId: CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Com dois agregados donos da mesma invariante, uma alteração feita por um deles quebra a garantia que o outro achava manter.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```java
public final class Order extends Entity<OrderId> {
    private final Customer customer; // Customer completo
    private final List<OrderItem> items = new ArrayList<>();

    public Order(OrderId id, Customer customer) {
        super(id);
        this.customer = customer;
    }
}

// para criar Order, preciso buscar Customer inteiro do banco
var customer = customerRepository.findById(targetCustomerId)
    .orElseThrow(() -> new IllegalArgumentException("Customer not found."));
var order = new Order(newOrderId, customer);

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```java
public final class Order extends Entity<OrderId> {
    private final CustomerId customerId; // ID, não Customer
    private final List<OrderItem> items = new ArrayList<>();

    private Order(OrderId id, CustomerId customerId) {
        super(id);
        this.customerId = customerId;
    }

    public static Order place(OrderId id, CustomerId customerId) {
        var order = new Order(id, customerId);
        return order;
    }

    public CustomerId getCustomerId() {
        return customerId;
    }
}

var order = Order.place(newOrderId, targetCustomerId);

// quem precisa do Customer resolve o ID no momento certo
var customer = customerRepository.findById(order.getCustomerId())
    .orElseThrow(() -> new IllegalArgumentException("Customer not found."));
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Assim, buscar um pedido não arrasta junto o cliente inteiro e tudo que ele referencia.

</details>

Quando o status carrega dados além do nome, use `sealed interface` com `permits` em vez de `enum` simples. O compilador verifica exaustividade no `switch` e estreita o tipo automaticamente nos blocos onde o discriminante foi checado:

<details>
<summary>✅ Bom: sealed interface quando o estado carrega dados próprios</summary>

```java
public sealed interface OrderState
    permits OrderState.Pending, OrderState.Settled, OrderState.Shipped, OrderState.Cancelled {

    record Pending() implements OrderState {}
    record Settled(Instant settledAt) implements OrderState {}
    record Shipped(Instant settledAt, String trackingCode) implements OrderState {}
    record Cancelled(Instant cancelledAt, String reason) implements OrderState {}
}

public String summarize(OrderState state) {
    var summary = switch (state) {
        case OrderState.Pending p -> "Pending";
        case OrderState.Settled p -> "Settled at " + p.settledAt();
        case OrderState.Shipped s -> "Shipped, tracking " + s.trackingCode();
        case OrderState.Cancelled c -> "Cancelled: " + c.reason();
    };
    return summary;
}
```

Para estado simples (sem dados associados), `enum OrderStatus { PENDING, SETTLED, SHIPPED, CANCELLED }` em um único campo basta. A `sealed interface` só ganha tração quando cada estado carrega informação própria.

</details>

<a id="multitenancy"></a>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenantId`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.tenantId`, `Customer.tenantId`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenantId`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```java
public final class Order extends Entity<OrderId> {
    private final TenantId tenantId;
    private final CustomerId customerId;
    private final List<OrderItem> items = new ArrayList<>();
}

public final class OrderItem extends Entity<OrderItemId> {
    private final TenantId tenantId; // duplica o tenantId do Order
    private final ProductId productId;
    private final int quantity;
}

// e agora cada serviço precisa checar tenantId em toda operação:
public BigDecimal calculateTotal(Order order, TenantId currentTenant) {
    if (!order.getTenantId().equals(currentTenant)) {
        throw new SecurityException("Tenant mismatch on order.");
    }
    for (var item : order.getItems()) {
        if (!item.getTenantId().equals(currentTenant)) {
            throw new SecurityException("Tenant mismatch on item.");
        }
    }

    var total = order.total();
    return total;
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```java
public final class Order extends Entity<OrderId> {
    private final TenantId tenantId; // único campo de tenant no agregado
    private final CustomerId customerId;
    private final List<OrderItem> items = new ArrayList<>();

    private Order(OrderId id, TenantId tenantId, CustomerId customerId) {
        super(id);
        this.tenantId = tenantId;
        this.customerId = customerId;
    }

    public static Order place(OrderId id, TenantId tenantId, CustomerId customerId) {
        var order = new Order(id, tenantId, customerId);
        return order;
    }

    public TenantId getTenantId() {
        return tenantId;
    }
}

public final class OrderItem extends Entity<OrderItemId> {
    private final ProductId productId;
    private final int quantity;

    // sem tenantId: pertence ao agregado Order, que já carrega o campo
    OrderItem(OrderItemId id, ProductId productId, int quantity) {
        super(id);
        this.productId = productId;
        this.quantity = quantity;
    }
}

public final class OrderRepository {
    private final DataSource dataSource;
    private final TenantContext tenantContext;

    public OrderRepository(DataSource dataSource, TenantContext tenantContext) {
        this.dataSource = dataSource;
        this.tenantContext = tenantContext;
    }

    public Optional<Order> findById(OrderId orderId) {
        var activeTenant = tenantContext.current();
        // repositório aplica o filtro automaticamente
        var row = queryOne(
            "SELECT * FROM orders WHERE id = ? AND tenant_id = ?",
            orderId.value(), activeTenant.value()
        );
        if (row == null) {
            return Optional.empty();
        }
        var order = OrderMapper.toDomain(row);
        return Optional.of(order);
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Java real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects como `record` ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa, e o construtor da base recebe oito parâmetros. Tratamento: deixar só `id: TId` na base genérica; demais campos viram composição (`AuditFields`) ou interfaces opcionais (`Auditable`).

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller precisa checar nulos a cada acesso. Tratamento: extrair os opcionais em record opcional, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: `List<Phone>` interna, exposta como `List.copyOf`.

**Mapa mascarado como lista**. Lista de pares `{ key, value }` quando o domínio diz "acesso por chave". Sintoma: `stream().filter().findFirst()` em loop toda vez que se quer um valor específico. Tratamento: `Map` com chave tipada.

**Referência direta cruzando agregado**. `Order.customer: Customer` em vez de `Order.customerId: CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas e serializa mais do que o necessário. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Entidade sem identidade**. Classe sem `id` consultada como se fosse entidade. Sintoma: comparações por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar nome". Tratamento: dar identidade explícita via `record CustomerId(UUID value)`, ou aceitar que é value object e usar `record` com igualdade estrutural.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos; `OrderItem` não guarda referência a `Order`.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático Java

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-and-domain-modeling).
