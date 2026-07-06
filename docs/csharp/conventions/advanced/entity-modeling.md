# Modelagem de entidades

> Escopo: C#. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `readonly record struct` para IDs tipados, `abstract class Entity<TId>` com igualdade por ID, `IReadOnlyList<T>` em propriedades públicas e `#nullable enable` como **guard rail** (barreira de proteção).

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em C# e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity<TId>` base. Os exemplos assumem `<Nullable>enable</Nullable>` no `.csproj` e seguem o code style C# moderno: `sealed` por padrão, `private init` em setters de domínio, construtores `private` com factory estáticos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, campo a campo |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor ou factory e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Limite entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `Guid` ou `string` cru, para impedir trocas acidentais entre IDs |
| **record struct** (estrutura de registro) | `readonly record struct` em C#: value type com igualdade estrutural nativa, `IEquatable<T>` implícito, alocação em pilha |
| **init setter** (setter de inicialização) | Modificador `init` que permite atribuição apenas durante a construção do objeto, tornando a propriedade efetivamente não-alterável |
| **nullable reference types** (tipos de referência anuláveis, NRT) | Recurso de `#nullable enable` que torna ausência de valor parte do contrato: `string?` pode ser nulo, `string` não pode |
| **IReadOnlyList** (lista somente leitura) | Interface `IReadOnlyList<T>`: expõe coleção sem `Add`, `Remove` nem atribuição; usado em propriedades públicas de agregados |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Entity Framework Core, Dapper, NHibernate) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`DeletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier, identificador único global) | Valor de 128 bits usado como ID, representado como `Guid` no .NET, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

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

```csharp
public sealed class Customer
{
    public Guid Id { get; private init; }
    public string FirstName { get; private init; } = string.Empty;
    public string LastName { get; private init; } = string.Empty;
    public string Email { get; private init; } = string.Empty;
    public string Phone { get; private init; } = string.Empty;
    public DateOnly BirthDate { get; private init; }
    public string Street { get; private init; } = string.Empty;
    public string Number { get; private init; } = string.Empty;
    public string? Complement { get; private init; }
    public string City { get; private init; } = string.Empty;
    public string State { get; private init; } = string.Empty;
    public string ZipCode { get; private init; } = string.Empty;
    public string Country { get; private init; } = string.Empty;
    public bool NewsletterOptIn { get; private init; }
    public bool SmsOptIn { get; private init; }
    public string PreferredLanguage { get; private init; } = string.Empty;
    public string? TaxId { get; private init; }
    public string? TaxRegime { get; private init; }
    public string? InvoiceEmail { get; private init; }
}
```

20 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `null` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```csharp
public sealed class Customer : Entity<CustomerId>
{
    public string Name { get; private init; }
    public string Email { get; private init; }
    public Address Address { get; private init; }
    public CustomerPreferences Preferences { get; private init; }
    public TaxInfo? TaxInfo { get; private init; }

    private Customer(
        CustomerId id,
        string name,
        string email,
        Address address,
        CustomerPreferences preferences,
        TaxInfo? taxInfo)
        : base(id)
    {
        Name = name;
        Email = email;
        Address = address;
        Preferences = preferences;
        TaxInfo = taxInfo;
    }

    public static Customer Register(
        string name,
        string email,
        Address address,
        CustomerPreferences preferences,
        TaxInfo? taxInfo = null)
    {
        var customer = new Customer(
            CustomerId.New(),
            name,
            email,
            address,
            preferences,
            taxInfo);
        return customer;
    }
}

// value object: igualdade estrutural via record
public sealed record Address(
    string Street,
    string Number,
    string? Complement,
    string City,
    string State,
    string ZipCode,
    string Country);

public sealed record CustomerPreferences(
    bool NewsletterOptIn,
    bool SmsOptIn,
    string PreferredLanguage);

public sealed record TaxInfo(
    string TaxId,
    string TaxRegime,
    string InvoiceEmail);
```

Cada tipo responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro, e quando presente vem completo. O `record` entrega igualdade estrutural sem **boilerplate** (código repetitivo de cerimônia).

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T?` demais (8 de 20 sempre `null`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em C#, vira `sealed record` com todos os campos como parâmetros do construtor primário, sem alteração depois de criado.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `TaxInfo?`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `CustomerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```csharp
public sealed class Customer : Entity<CustomerId>
{
    public string Name { get; private init; }
    public string Email { get; private init; }

    // se PJ, esses três aparecem; se PF, ficam null
    public string? TaxId { get; private init; }
    public string? TaxRegime { get; private init; }
    public string? InvoiceEmail { get; private init; }

    public bool HasTaxInfo()
    {
        var isFiscallyRegistered = TaxId is not null && TaxRegime is not null;
        return isFiscallyRegistered;
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `HasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `TaxId` preenchido e `TaxRegime` nulo, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional criado via factory</summary>

```csharp
public sealed record TaxInfo
{
    public string TaxId { get; }
    public string TaxRegime { get; }
    public string InvoiceEmail { get; }

    private TaxInfo(string taxId, string taxRegime, string invoiceEmail)
    {
        TaxId = taxId;
        TaxRegime = taxRegime;
        InvoiceEmail = invoiceEmail;
    }

    public static TaxInfo Create(string taxId, string taxRegime, string invoiceEmail)
    {
        if (string.IsNullOrWhiteSpace(taxId) || string.IsNullOrWhiteSpace(taxRegime))
        {
            throw new DomainException("TaxInfo requires both TaxId and TaxRegime.");
        }

        var taxInfo = new TaxInfo(taxId, taxRegime, invoiceEmail);
        return taxInfo;
    }
}

public sealed class Customer : Entity<CustomerId>
{
    public string Name { get; private init; }
    public string Email { get; private init; }
    public TaxInfo? TaxInfo { get; private init; }

    public bool HasTaxInfo()
    {
        var isFiscallyRegistered = TaxInfo is not null;
        return isFiscallyRegistered;
    }
}
```

A invariante "se imposto existe, é completo" mora no factory `TaxInfo.Create`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` parcial: o construtor é privado e o factory falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `Guid`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em C# é barata: `readonly record struct`. Um `CustomerId(Guid Value)` é um value type que carrega `IEquatable<T>` e igualdade estrutural sem custo de alocação em heap. O compilador rejeita `CustomerId` onde se espera `OrderId` em tempo de compilação, sem nenhuma checagem em runtime.

<details>
<summary>❌ Ruim: IDs como Guid cru, fáceis de trocar de lugar</summary>

```csharp
public static void TransferOwnership(Guid customerId, Guid orderId)
{
    // assinatura: customerId primeiro, orderId depois
    // se o caller inverter, o bug passa silencioso
    orderRepository.Update(orderId, customerId);
}

// uso longe daqui, com nomes locais diferentes:
var newOwnerId = order.Id;
var targetOrderId = customer.Id;

TransferOwnership(newOwnerId, targetOrderId); // invertido; nada acusa
```

</details>

<details>
<summary>✅ Bom: readonly record struct com igualdade estrutural nativa</summary>

```csharp
public readonly record struct CustomerId(Guid Value)
{
    public static CustomerId New() => new(Guid.NewGuid());

    public static CustomerId From(Guid value)
    {
        if (value == Guid.Empty)
        {
            throw new DomainException("CustomerId cannot be empty.");
        }

        var customerId = new CustomerId(value);
        return customerId;
    }
}

public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());

    public static OrderId From(Guid value)
    {
        if (value == Guid.Empty)
        {
            throw new DomainException("OrderId cannot be empty.");
        }

        var orderId = new OrderId(value);
        return orderId;
    }
}

public static void TransferOwnership(CustomerId customerId, OrderId orderId)
{
    orderRepository.Update(orderId, customerId);
}

var newOwnerId = order.Id;      // OrderId
var targetOrderId = customer.Id; // CustomerId

// trocar a ordem: erro de compilação
TransferOwnership(newOwnerId, targetOrderId);
// Argument 1: cannot convert from 'OrderId' to 'CustomerId'
```

`readonly record struct` entrega: value type (sem alocação em heap), igualdade estrutural (`==` e `!=` por valor), `IEquatable<T>` implícito, `ToString()` legível, e suporte a pattern matching. O compilador rejeita a troca antes do código chegar perto do banco.

</details>

Em propriedades de entidade, o tipo fortemente tipado substitui o `Guid` cru em todo lugar:

```csharp
public sealed class Order : Entity<OrderId>
{
    public CustomerId CustomerId { get; private init; } // não Guid
    public TenantId TenantId { get; private init; }     // não Guid
}
```

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`). Vão por interface (`IAuditable`) ou por composição (`AuditInfo` como propriedade).
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: Entity base inchada, todo mundo herda tudo</summary>

```csharp
public abstract class Entity
{
    public Guid Id { get; protected init; }
    public DateTime CreatedAt { get; protected init; }
    public DateTime UpdatedAt { get; protected set; }
    public DateTime? DeletedAt { get; protected set; }
    public int Version { get; protected set; }
    public Guid TenantId { get; protected init; }
    public string? CreatedBy { get; protected init; }
    public string? UpdatedBy { get; protected set; }
}

public sealed class OrderItem : Entity
{
    public Guid ProductId { get; private init; }
    public int Quantity { get; private init; }

    // OrderItem carrega TenantId, CreatedBy, Version que não usa nem precisa
}
```

`OrderItem` herda oito campos para expor três. O `TenantId` vazio no construtor denuncia o problema. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica + composição para comportamentos extras</summary>

```csharp
public abstract class Entity<TId>
    where TId : struct, IEquatable<TId>
{
    public TId Id { get; protected init; }

    protected Entity(TId id)
    {
        Id = id;
    }

    public override bool Equals(object? obj)
    {
        if (obj is not Entity<TId> other) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;

        var isEqual = Id.Equals(other.Id);
        return isEqual;
    }

    public override int GetHashCode() => Id.GetHashCode();

    public static bool operator ==(Entity<TId>? left, Entity<TId>? right)
        => Equals(left, right);

    public static bool operator !=(Entity<TId>? left, Entity<TId>? right)
        => !Equals(left, right);
}

// auditoria por interface, aplicada onde faz sentido
public interface IAuditable
{
    DateTime CreatedAt { get; }
    DateTime UpdatedAt { get; }
    string? CreatedBy { get; }
    string? UpdatedBy { get; }
}

public sealed class Customer : Entity<CustomerId>, IAuditable
{
    public string Name { get; private init; }
    public string Email { get; private init; }
    public DateTime CreatedAt { get; private init; }
    public DateTime UpdatedAt { get; private set; }
    public string? CreatedBy { get; private init; }
    public string? UpdatedBy { get; private set; }
}

public sealed class OrderItem : Entity<OrderItemId>
{
    public ProductId ProductId { get; private init; }
    public int Quantity { get; private init; }
    // sem auditoria: faz parte do agregado Order, não vive sozinho
}
```

`Entity<TId>` carrega só o que toda entidade precisa, e o ID já vem tipado. Quem quer auditoria implementa `IAuditable`. `OrderItem` não expõe auditoria porque faz parte do agregado `Order` e não vive sozinho. O `Equals` compara por ID, conforme a definição de entidade.

</details>

A constraint `where TId : struct, IEquatable<TId>` fecha o tipo: só `readonly record struct` (e outros value types com igualdade) entram como `TId`. Isso impede acidentalmente passar `string` ou `Guid` cru como parâmetro de tipo.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos C#:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `string Name`, `Money Total` |
| Zero ou um | Campo `T?` | `TaxInfo? TaxInfo` (só PJ tem) |
| Zero ou mais | `IReadOnlyList<T>` (vazio, nunca null) | `IReadOnlyList<OrderItem> Items` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{Street, City, Country}` |

Em C#, listas públicas usam `IReadOnlyList<T>` para impedir que callers façam `Add` direto. A escrita interna passa por um `List<T>` `private`, e o método de domínio é a única forma de alterar.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```csharp
public sealed class Customer : Entity<CustomerId>
{
    public string? Phone1 { get; private set; }
    public string? Phone2 { get; private set; }
    public string? Phone3 { get; private set; }

    public void AddPhone(string number)
    {
        if (Phone1 is null) { Phone1 = number; return; }
        if (Phone2 is null) { Phone2 = number; return; }
        if (Phone3 is null) { Phone3 = number; return; }

        throw new DomainException("Customer accepts at most 3 phones.");
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra. Iterar os três campos exige três `if` separados.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via IReadOnlyList</summary>

```csharp
public enum PhoneType { Mobile, Home, Work }

public sealed record Phone(string Number, PhoneType Type);

public sealed class Customer : Entity<CustomerId>
{
    private readonly List<Phone> _phones = [];

    public IReadOnlyList<Phone> Phones => _phones;

    public void AddPhone(Phone phone)
    {
        if (_phones.Count >= 3)
        {
            throw new DomainException("Customer can have at most 3 phones.");
        }

        _phones.Add(phone);
    }

    public void RemovePhone(string number)
    {
        var remaining = _phones.Where(p => p.Number != number).ToList();
        _phones.Clear();
        _phones.AddRange(remaining);
    }
}
```

A regra "no máximo 3" mora em `AddPhone`, onde dá para mudar sem mexer no schema. A lista exposta é `IReadOnlyList<Phone>`: callers iteram à vontade, mas `Add` não existe na interface. Lista vazia (`[]`) é o estado neutro: itera sem verificação de nulo.

</details>

Listas seguem a regra de [null-safety](./null-safety.md): nunca `null`, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, a root é a única classe exposta do agregado, e o construtor da entidade filha pode ser `internal` ou `private` para que só o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza o limite do agregado, então vai por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência ao pai, ciclo bidirecional sem dono</summary>

```csharp
public sealed class Order : Entity<OrderId>
{
    private readonly List<OrderItem> _items = [];
    public IReadOnlyList<OrderItem> Items => _items;

    public Order(OrderId id) : base(id) { }
}

public sealed class OrderItem : Entity<OrderItemId>
{
    public Order Order { get; private init; } // referência completa
    public ProductId ProductId { get; private init; }
    public int Quantity { get; private init; }

    public OrderItem(OrderItemId id, Order order, ProductId productId, int quantity)
        : base(id)
    {
        Order = order;
        ProductId = productId;
        Quantity = quantity;
    }
}

var order = new Order(OrderId.New());
var item = new OrderItem(OrderItemId.New(), order, productId, quantity: 2);
order.Items.Add(item); // IReadOnlyList não tem Add: não compila

// quem valida que Items.Count não passa do limite?
// quem garante que RemoveItem limpa item.Order?
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```csharp
public sealed class OrderItem : Entity<OrderItemId>
{
    public ProductId ProductId { get; private init; }
    public int Quantity { get; private init; }
    public decimal UnitPrice { get; private init; }

    internal OrderItem(
        OrderItemId id,
        ProductId productId,
        int quantity,
        decimal unitPrice)
        : base(id)
    {
        if (quantity <= 0)
        {
            throw new DomainException("Quantity must be positive.");
        }

        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    public decimal Subtotal()
    {
        var subtotal = UnitPrice * Quantity;
        return subtotal;
    }
}

public sealed class Order : Entity<OrderId>
{
    private readonly List<OrderItem> _items = [];

    public CustomerId CustomerId { get; private init; }
    public IReadOnlyList<OrderItem> Items => _items;

    private Order(OrderId id, CustomerId customerId) : base(id)
    {
        CustomerId = customerId;
    }

    public static Order Place(CustomerId customerId)
    {
        var order = new Order(OrderId.New(), customerId);
        return order;
    }

    public void AddItem(ProductId productId, int quantity, decimal unitPrice)
    {
        if (_items.Count >= 50)
        {
            throw new DomainException("Order can have at most 50 items.");
        }

        var item = new OrderItem(OrderItemId.New(), productId, quantity, unitPrice);
        _items.Add(item);
    }

    public void RemoveItem(OrderItemId itemId)
    {
        var remaining = _items.Where(i => i.Id != itemId).ToList();
        _items.Clear();
        _items.AddRange(remaining);
    }

    public decimal Total()
    {
        var total = _items.Sum(i => i.Subtotal());
        return total;
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. O construtor de `OrderItem` é `internal`, disponível apenas dentro do assembly do domínio. A relação é unidirecional, do dono para os dependentes.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```csharp
public sealed class Student : Entity<StudentId>
{
    private readonly List<CourseId> _courseIds = [];
    private readonly List<DateTime> _enrollmentDates = []; // paralelo a _courseIds

    public IReadOnlyList<CourseId> CourseIds => _courseIds;
    public IReadOnlyList<DateTime> EnrollmentDates => _enrollmentDates;

    public DateTime? EnrollmentDateOf(CourseId courseId)
    {
        var position = _courseIds.IndexOf(courseId);
        if (position == -1) return null;

        // se uma lista sair de ordem, os dados ficam inconsistentes
        var enrolledAt = _enrollmentDates.ElementAtOrDefault(position);
        return enrolledAt;
    }
}
```

Duas listas paralelas: se uma sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais uma lista paralela. O compilador não detecta o desalinhamento.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```csharp
public enum EnrollmentStatus { Active, Completed, Withdrawn }

public sealed class Enrollment : Entity<EnrollmentId>
{
    public StudentId StudentId { get; private init; }
    public CourseId CourseId { get; private init; }
    public DateTime EnrolledAt { get; private init; }
    public EnrollmentStatus Status { get; private set; }
    public decimal? FinalGrade { get; private set; }

    private Enrollment(
        EnrollmentId id,
        StudentId studentId,
        CourseId courseId,
        DateTime enrolledAt)
        : base(id)
    {
        StudentId = studentId;
        CourseId = courseId;
        EnrolledAt = enrolledAt;
        Status = EnrollmentStatus.Active;
    }

    public static Enrollment Open(StudentId studentId, CourseId courseId)
    {
        var enrollment = new Enrollment(
            EnrollmentId.New(),
            studentId,
            courseId,
            DateTime.UtcNow);
        return enrollment;
    }

    public void Complete(decimal grade)
    {
        if (Status != EnrollmentStatus.Active)
        {
            throw new DomainException("Only active enrollments can be completed.");
        }
        if (grade < 0 || grade > 10)
        {
            throw new DomainException("Grade must be between 0 and 10.");
        }

        Status = EnrollmentStatus.Completed;
        FinalGrade = grade;
    }
}

public sealed class Student : Entity<StudentId>
{
    public string Name { get; private init; }

    private Student(StudentId id, string name) : base(id)
    {
        Name = name;
    }
}

public sealed class Course : Entity<CourseId>
{
    public string Title { get; private init; }

    private Course(CourseId id, string title) : base(id)
    {
        Title = title;
    }
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `IReadOnlyList<CourseId>` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.Items` é uma lista de `OrderItem`, não uma lista de `OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```csharp
public sealed class Order : Entity<OrderId>
{
    public Customer Customer { get; private init; } // Customer completo
    private readonly List<OrderItem> _items = [];

    public Order(OrderId id, Customer customer) : base(id)
    {
        Customer = customer;
    }
}

// para criar Order, preciso buscar Customer inteiro do banco
var customer = await customerRepository.FindByIdAsync(customerId, ct);
if (customer is null) return NotFound();

var order = new Order(OrderId.New(), customer);

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```csharp
public sealed class Order : Entity<OrderId>
{
    public CustomerId CustomerId { get; private init; } // ID, não Customer
    private readonly List<OrderItem> _items = [];

    public IReadOnlyList<OrderItem> Items => _items;

    private Order(OrderId id, CustomerId customerId) : base(id)
    {
        CustomerId = customerId;
    }

    public static Order Place(CustomerId customerId)
    {
        var order = new Order(OrderId.New(), customerId);
        return order;
    }
}

var order = Order.Place(customerId);

// quem precisa do Customer resolve o ID no momento certo
var customer = await customerRepository.FindByIdAsync(order.CustomerId, ct);
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status precisa carregar dados além do nome (data de pagamento, código de rastreio, motivo do cancelamento), vale usar uma hierarquia fechada de records em vez de enum simples. O pattern matching com `is` faz **narrowing** (estreitamento do tipo) automático:

<details>
<summary>✅ Bom: hierarquia de records quando o estado carrega dados</summary>

```csharp
public abstract record OrderState
{
    public sealed record Pending : OrderState;
    public sealed record Settled(DateTime SettledAt) : OrderState;
    public sealed record Shipped(DateTime SettledAt, string TrackingCode) : OrderState;
    public sealed record Cancelled(DateTime CancelledAt, string Reason) : OrderState;
}

public string Summarize(OrderState state)
{
    if (state is OrderState.Settled settled)
    {
        var summary = $"Settled at {settled.SettledAt:O}";
        return summary;
    }
    if (state is OrderState.Shipped shipped)
    {
        var summary = $"Shipped, tracking {shipped.TrackingCode}";
        return summary;
    }
    if (state is OrderState.Cancelled cancelled)
    {
        var summary = $"Cancelled: {cancelled.Reason}";
        return summary;
    }

    var pending = "Pending";
    return pending;
}
```

Para o estado simples (sem dados associados), um `enum OrderStatus` em um único campo basta. A hierarquia de records só ganha tração quando o estado carrega informação própria.

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

```csharp
public sealed class Order : Entity<OrderId>
{
    public TenantId TenantId { get; private init; }
    public CustomerId CustomerId { get; private init; }
    private readonly List<OrderItem> _items = [];
}

public sealed class OrderItem : Entity<OrderItemId>
{
    public TenantId TenantId { get; private init; } // duplica o TenantId do Order
    public ProductId ProductId { get; private init; }
    public int Quantity { get; private init; }
}

// e agora cada serviço precisa checar TenantId em toda operação:
public decimal CalculateOrderTotal(Order order, TenantId activeTenant)
{
    if (order.TenantId != activeTenant)
    {
        throw new ForbiddenException("Tenant mismatch on order.");
    }
    foreach (var item in order.Items)
    {
        if (item.TenantId != activeTenant)
        {
            throw new ForbiddenException("Tenant mismatch on item.");
        }
    }

    var total = order.Total();
    return total;
}
```

</details>

<details>
<summary>✅ Bom: TenantId só no aggregate root, filtro aplicado no repositório</summary>

```csharp
public sealed class Order : Entity<OrderId>
{
    public TenantId TenantId { get; private init; } // único campo de tenant no agregado
    public CustomerId CustomerId { get; private init; }
    private readonly List<OrderItem> _items = [];

    public IReadOnlyList<OrderItem> Items => _items;
}

public sealed class OrderItem : Entity<OrderItemId>
{
    public ProductId ProductId { get; private init; }
    public int Quantity { get; private init; }
    // sem TenantId: herdado implicitamente pelo pai
}

public interface ITenantContext
{
    TenantId Current();
}

public sealed class OrderRepository(AppDbContext db, ITenantContext tenantContext)
    : IOrderRepository
{
    public async Task<Order?> FindByIdAsync(OrderId orderId, CancellationToken ct)
    {
        var activeTenant = tenantContext.Current();

        var order = await db.Orders
            .Where(o => o.Id == orderId && o.TenantId == activeTenant)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(ct);
        return order;
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código C# real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects (`sealed record`) ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `TenantId` que nunca usa. Tratamento: deixar só `TId Id` na base genérica; demais campos viram interface (`IAuditable`) ou composição.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller obrigado a `?.` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `Phone1`, `Phone2`, `Phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: `IReadOnlyList<Phone>` exposta, lista `private List<Phone>` interna.

**`Guid` cru como ID**. `public Guid CustomerId` em vez de `public CustomerId CustomerId`. Sintoma: bug onde `OrderId` foi passado no lugar de `CustomerId` e o compilador aceitou. Tratamento: `readonly record struct` por ID, factory `From(Guid)` com validação.

**Referência direta cruzando agregado**. `Order.Customer` (tipo `Customer`) em vez de `Order.CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas via `Include`. Tratamento: referência por ID tipado; quem precisa do objeto resolve no momento certo.

**Setter público em propriedade de domínio**. `public string Name { get; set; }` em entidade de domínio. Sintoma: qualquer caller pode alterar o estado sem passar pela invariante. Tratamento: `private set` ou `private init`; alteração só via método de domínio.

**Bidirecionalidade automática**. `Order.Items` e `OrderItem.Order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos; `OrderItem` não conhece `Order`.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`./null-safety.md`](null-safety.md): null-safety idiomático C#

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
