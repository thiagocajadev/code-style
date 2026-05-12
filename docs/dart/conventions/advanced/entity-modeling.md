# Modelagem de entidades

> Escopo: Dart 3.x com sound null safety. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `extension type` para IDs zero-cost, `sealed class` para state pattern com dados, `final class` para value objects, `List.unmodifiable` para coleções protegidas e `final` em todo campo de domínio.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Dart e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos usam Dart 3.x com sound null safety ativo e seguem as convenções de `lowerCamelCase` para variáveis e `PascalCase` para classes.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor ou factory e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `String` crua, para impedir trocas acidentais entre IDs |
| **extension type** (tipo de extensão) | Dart 3.3+: wrapper zero-cost sobre um tipo base; o compilador rejeita uso cruzado sem overhead em runtime |
| **sound null safety** (segurança de ausência completa) | Garantia do compilador Dart de que valores não-anuláveis nunca são `null`; `T?` declara ausência aceita, `T` proíbe |
| **sealed class** (classe fechada) | Dart 3.0+: hierarquia fechada onde o compilador verifica exaustividade no `switch`; ideal para state pattern com dados |
| **final class** (classe final) | Dart 3.0+: classe que não pode ser estendida nem implementada fora da própria biblioteca; ideal para value objects |
| **UnmodifiableListView** (visão de lista sem alteração) | Wrapper de `dart:collection` que expõe uma lista sem permitir `add`, `remove` ou atribuição por índice |
| **late** (inicialização postergada) | Modificador que adia a inicialização de um campo não-anulável; lança erro se acessado antes de atribuir |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo `T?` que aceita `null` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier, identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

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

```dart
class Customer {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final DateTime birthDate;
  final String street;
  final String number;
  final String? complement;
  final String city;
  final String state;
  final String zipCode;
  final String country;
  final bool newsletterOptIn;
  final bool smsOptIn;
  final String preferredLanguage;
  final String? taxId;
  final String? taxRegime;
  final String? invoiceEmail;

  const Customer({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.birthDate,
    required this.street,
    required this.number,
    this.complement,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
    required this.newsletterOptIn,
    required this.smsOptIn,
    required this.preferredLanguage,
    this.taxId,
    this.taxRegime,
    this.invoiceEmail,
  });
}
```

19 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `null` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```dart
final class Address {
  final String street;
  final String number;
  final String? complement;
  final String city;
  final String state;
  final String zipCode;
  final String country;

  const Address({
    required this.street,
    required this.number,
    this.complement,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
  });
}

final class CustomerPreferences {
  final bool newsletterOptIn;
  final bool smsOptIn;
  final String preferredLanguage;

  const CustomerPreferences({
    required this.newsletterOptIn,
    required this.smsOptIn,
    required this.preferredLanguage,
  });
}

final class TaxInfo {
  final String taxId;
  final String taxRegime;
  final String invoiceEmail;

  const TaxInfo({
    required this.taxId,
    required this.taxRegime,
    required this.invoiceEmail,
  });
}

class Customer {
  final CustomerId id;
  final String name;
  final String email;
  final Address address;
  final CustomerPreferences preferences;
  final TaxInfo? taxInfo;

  Customer({
    required this.id,
    required this.name,
    required this.email,
    required this.address,
    required this.preferences,
    this.taxInfo,
  });
}
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro e, quando presente, vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T?` demais (8 de 20 sempre `null`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Dart, vira `final class` com todos os campos `final` e construtor `const` quando aplicável.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `TaxInfo?`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. O satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```dart
class Customer {
  final CustomerId id;
  final String name;
  final String email;
  // se PJ, esses três aparecem; se PF, ficam null
  final String? taxId;
  final String? taxRegime;
  final String? invoiceEmail;

  Customer({
    required this.id,
    required this.name,
    required this.email,
    this.taxId,
    this.taxRegime,
    this.invoiceEmail,
  });

  bool get hasTaxInfo => taxId != null && taxRegime != null;
}
```

A regra "se um campo de imposto existe, todos existem" mora no getter `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O Dart aceita `Customer` com `taxId` preenchido e `taxRegime` `null`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, criado via factory</summary>

```dart
final class TaxInfo {
  final String taxId;
  final String taxRegime;
  final String invoiceEmail;

  TaxInfo._({
    required this.taxId,
    required this.taxRegime,
    required this.invoiceEmail,
  });

  factory TaxInfo.create({
    required String taxId,
    required String taxRegime,
    required String invoiceEmail,
  }) {
    if (taxId.isEmpty || taxRegime.isEmpty) {
      throw ArgumentError('TaxInfo requires both taxId and taxRegime.');
    }

    final taxInfo = TaxInfo._(
      taxId: taxId,
      taxRegime: taxRegime,
      invoiceEmail: invoiceEmail,
    );
    return taxInfo;
  }
}

class Customer {
  final CustomerId id;
  final String name;
  final String email;
  final TaxInfo? taxInfo;

  Customer({
    required this.id,
    required this.name,
    required this.email,
    this.taxInfo,
  });

  bool get hasTaxInfo => taxInfo != null;
}
```

A invariante "se imposto existe, é completo" mora no factory `TaxInfo.create`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` parcial: o construtor é privado (`TaxInfo._`) e o factory falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `String`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

Em Dart 3.3+, a defesa ideal é o **extension type**: um wrapper zero-cost sobre a `String` subjacente. Em runtime não existe tipo extra; em tempo de compilação, o compilador rejeita a atribuição cruzada entre `CustomerId` e `OrderId`. Para versões anteriores ao 3.3, o fallback é uma `final class` com campo `value` e override de `==`.

<details>
<summary>❌ Ruim: IDs como String crua, fáceis de trocar de lugar</summary>

```dart
void transferOwnership(String customerId, String orderId) {
  // se o caller inverter, o bug passa silencioso
  orderRepository.update(orderId, customerId: customerId);
}

final newOwnerId = customer.id;
final targetOrderId = order.id;

// inverte argumentos: nada acusa, tipo de ambos é String
transferOwnership(targetOrderId, newOwnerId);
```

</details>

<details>
<summary>✅ Bom: extension type zero-cost (Dart 3.3+)</summary>

```dart
extension type CustomerId(String value) implements String {
  factory CustomerId.create(String raw) {
    if (raw.isEmpty) throw ArgumentError('CustomerId requires a value.');

    return CustomerId(raw);
  }
}

extension type OrderId(String value) implements String {
  factory OrderId.create(String raw) {
    if (raw.isEmpty) throw ArgumentError('OrderId requires a value.');

    return OrderId(raw);
  }
}

void transferOwnership(CustomerId customerId, OrderId orderId) {
  orderRepository.update(orderId, customerId: customerId);
}

final newOwnerId = CustomerId.create(customer.id.value);
final targetOrderId = OrderId.create(order.id.value);

// trocar a ordem: erro de compilação
transferOwnership(targetOrderId, newOwnerId);
// Argument of type 'OrderId' can't be assigned to parameter of type 'CustomerId'.
```

O `extension type` existe apenas no sistema de tipos. Em runtime, `CustomerId` é a `String` subjacente sem objeto extra. O compilador rejeita a troca antes do código chegar perto do banco.

</details>

<details>
<summary>✅ Bom: fallback para Dart anterior a 3.3 — final class com ==</summary>

```dart
final class CustomerId {
  final String value;

  const CustomerId(this.value);

  @override
  bool operator ==(Object other) =>
      other is CustomerId && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}

final class OrderId {
  final String value;

  const OrderId(this.value);

  @override
  bool operator ==(Object other) =>
      other is OrderId && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}
```

A classe `final` impede extensão. O override de `==` e `hashCode` garante igualdade por valor. Como não é `extension type`, há um objeto real em runtime, mas a proteção de tipos em tempo de compilação é equivalente.

</details>

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `audit: AuditFields`) ou por mixin quando o comportamento for ortogonal.
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: Entity base inchada, todo mundo herda tudo</summary>

```dart
abstract class Entity {
  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;
  final int version;
  final String tenantId;
  final String createdBy;
  final String updatedBy;

  const Entity({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.version,
    required this.tenantId,
    required this.createdBy,
    required this.updatedBy,
  });
}

class OrderItem extends Entity {
  final String productId;
  final int quantity;

  OrderItem({
    required super.id,
    required super.createdAt,
    required super.updatedAt,
    required super.tenantId,
    required super.createdBy,
    required super.updatedBy,
    super.version = 1,
    required this.productId,
    required this.quantity,
  });
}
```

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. O construtor exige oito campos para devolver um item de pedido com dois. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica + composição para comportamentos extras</summary>

```dart
abstract class Entity<TId> {
  final TId id;

  const Entity(this.id);

  @override
  bool operator ==(Object other) =>
      other.runtimeType == runtimeType &&
      other is Entity<TId> &&
      other.id == id;

  @override
  int get hashCode => id.hashCode;
}

final class AuditFields {
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;
  final String? updatedBy;

  const AuditFields({
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.updatedBy,
  });
}

class Customer extends Entity<CustomerId> {
  final String name;
  final String email;
  final AuditFields audit;

  Customer({
    required super id,
    required this.name,
    required this.email,
    required this.audit,
  });
}

class OrderItem extends Entity<OrderItemId> {
  final ProductId productId;
  final int quantity;

  OrderItem({
    required super id,
    required this.productId,
    required this.quantity,
    // sem auditoria: faz parte do agregado Order, não vive sozinho
  });
}
```

`Entity<TId>` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho. O `==` compara por ID, conforme a definição de entidade.

</details>

Em Dart, a alternativa a composição é o **mixin**: `mixin Auditable on Entity { ... }` aplicado com `class Customer extends Entity<CustomerId> with Auditable`. O mixin adiciona comportamento sem herança de estado, mantendo a base mínima.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos Dart:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo `final` obrigatório | `final String name`, `final Money total` |
| Zero ou um | Campo `T?` | `final TaxInfo? taxInfo` |
| Zero ou mais | `List<T>` interna, `List.unmodifiable` exposto | `_items: List<OrderItem>` + getter |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em Dart, listas públicas usam `List.unmodifiable(_items)` ou `UnmodifiableListView<T>` (de `dart:collection`) para impedir que callers façam `add` direto. A mutação interna passa pela lista `_items` privada, e o método de domínio é a única forma de alterar.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```dart
class Customer {
  final CustomerId id;
  final String name;
  String? phone1;
  String? phone2;
  String? phone3;

  Customer({required this.id, required this.name});

  void addPhone(String number) {
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

    throw StateError('Customer can have at most 3 phones.');
  }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra. Os campos perderam `final` para permitir atribuição.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via List.unmodifiable</summary>

```dart
enum PhoneType { mobile, home, work }

final class Phone {
  final String number;
  final PhoneType type;

  const Phone({required this.number, required this.type});
}

class Customer extends Entity<CustomerId> {
  final String name;
  final List<Phone> _phones;

  Customer({
    required super id,
    required this.name,
    List<Phone> phones = const [],
  }) : _phones = List.of(phones);

  List<Phone> get phones => List.unmodifiable(_phones);

  void addPhone(Phone phone) {
    if (_phones.length >= 3) {
      throw StateError('Customer can have at most 3 phones.');
    }

    _phones.add(phone);
  }

  void removePhone(String number) {
    _phones.removeWhere((phone) => phone.number == number);
  }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá pra mudar sem mexer no schema. A lista exposta é `List.unmodifiable`: callers iteram à vontade mas não conseguem `add` direto, então o limite continua valendo. Lista vazia (`const []`) é o estado neutro: itera sem guard extra.

</details>

Listas seguem a regra de [null-safety](./null-safety.md): nunca `null`, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em Dart, o construtor da raiz é privado (`Order._`) e um factory `Order.place(...)` é o único ponto de criação; o construtor de `OrderItem` pode ficar no mesmo arquivo para aproveitar a visibilidade de biblioteca.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza fronteira de agregado, então vai por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência ao pai, ciclo bidirecional sem dono</summary>

```dart
class Order {
  final OrderId id;
  final List<OrderItem> items;

  Order({required this.id, this.items = const []});
}

class OrderItem {
  final OrderItemId id;
  final Order order; // referência completa ao Order
  final ProductId productId;
  final int quantity;

  OrderItem({
    required this.id,
    required this.order,
    required this.productId,
    required this.quantity,
  });
}

final order = Order(id: OrderId('ord-1'));
final item = OrderItem(
  id: OrderItemId('item-1'),
  order: order,
  productId: ProductId('prod-1'),
  quantity: 2,
);
order.items.add(item);

// quem valida que items.length não passa do limite?
// quem garante que removeItem limpa item.order?
// a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```dart
class OrderItem extends Entity<OrderItemId> {
  final ProductId productId;
  final int quantity;
  final Money unitPrice;

  OrderItem._({
    required super id,
    required this.productId,
    required this.quantity,
    required this.unitPrice,
  });

  static OrderItem create({
    required OrderItemId id,
    required ProductId productId,
    required int quantity,
    required Money unitPrice,
  }) {
    if (quantity <= 0) throw ArgumentError('Quantity must be positive.');

    final item = OrderItem._(
      id: id,
      productId: productId,
      quantity: quantity,
      unitPrice: unitPrice,
    );
    return item;
  }

  Money get subtotal => unitPrice.multiply(quantity);
}

class Order extends Entity<OrderId> {
  final CustomerId customerId;
  final List<OrderItem> _items;

  Order._({required super id, required this.customerId})
      : _items = [];

  factory Order.place({
    required OrderId id,
    required CustomerId customerId,
  }) {
    final order = Order._(id: id, customerId: customerId);
    return order;
  }

  List<OrderItem> get lineItems => List.unmodifiable(_items);

  void addItem({
    required OrderItemId id,
    required ProductId productId,
    required int quantity,
    required Money unitPrice,
  }) {
    if (_items.length >= 50) {
      throw StateError('Order can have at most 50 items.');
    }

    final item = OrderItem.create(
      id: id,
      productId: productId,
      quantity: quantity,
      unitPrice: unitPrice,
    );
    _items.add(item);
  }

  void removeItem(OrderItemId itemId) {
    _items.removeWhere((item) => item.id == itemId);
  }

  Money get total => _items.fold(
        Money.zero(),
        (sum, item) => sum.add(item.subtotal),
      );
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```dart
class Student extends Entity<StudentId> {
  final String name;
  final List<CourseId> courseIds;
  final List<DateTime> enrollmentDates; // paralelo a courseIds, por índice

  Student({
    required super id,
    required this.name,
    this.courseIds = const [],
    this.enrollmentDates = const [],
  });

  DateTime? enrollmentDateOf(CourseId courseId) {
    final position = courseIds.indexOf(courseId);
    if (position == -1) return null;

    final enrolledAt = enrollmentDates.elementAtOrNull(position);
    return enrolledAt;
  }
}
```

Duas listas paralelas: se uma sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais uma lista paralela. O Dart não impede que alguém chame `add` na lista errada.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```dart
enum EnrollmentStatus { active, completed, withdrawn }

class Enrollment extends Entity<EnrollmentId> {
  final StudentId studentId;
  final CourseId courseId;
  final DateTime enrolledAt;
  EnrollmentStatus _status;
  double? _finalGrade;

  Enrollment._({
    required super id,
    required this.studentId,
    required this.courseId,
    required this.enrolledAt,
  })  : _status = EnrollmentStatus.active,
        _finalGrade = null;

  factory Enrollment.open({
    required EnrollmentId id,
    required StudentId studentId,
    required CourseId courseId,
    required DateTime enrolledAt,
  }) {
    final enrollment = Enrollment._(
      id: id,
      studentId: studentId,
      courseId: courseId,
      enrolledAt: enrolledAt,
    );
    return enrollment;
  }

  EnrollmentStatus get status => _status;
  double? get finalGrade => _finalGrade;

  void complete(double grade) {
    if (_status != EnrollmentStatus.active) {
      throw StateError('Only active enrollments can be completed.');
    }
    if (grade < 0 || grade > 10) {
      throw ArgumentError('Grade must be between 0 and 10.');
    }

    _status = EnrollmentStatus.completed;
    _finalGrade = grade;
  }
}

class Student extends Entity<StudentId> {
  final String name;

  Student({required super id, required this.name});
}

class Course extends Entity<CourseId> {
  final String title;

  Course({required super id, required this.title});
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `List.unmodifiable` de IDs em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order._items` é uma lista de `OrderItem`, não uma lista de `OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando a fronteira de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId: CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```dart
class Order extends Entity<OrderId> {
  final Customer customer; // Customer completo
  final List<OrderItem> _items;

  Order({required super id, required this.customer}) : _items = [];
}

// para criar Order, preciso buscar Customer inteiro do banco
final customer = await customerRepository.findById(targetCustomerId);
if (customer == null) throw NotFoundException('Customer not found.');

final order = Order(id: newOrderId, customer: customer);

// para serializar Order para o frontend, vou junto enviar Customer completo;
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```dart
class Order extends Entity<OrderId> {
  final CustomerId customerId; // ID, não Customer
  final List<OrderItem> _items;

  Order._({required super id, required this.customerId}) : _items = [];

  factory Order.place({required OrderId id, required CustomerId customerId}) {
    final order = Order._(id: id, customerId: customerId);
    return order;
  }
}

final order = Order.place(id: newOrderId, customerId: targetCustomerId);

// quem precisa do Customer resolve o ID no momento certo
final customer = await customerRepository.findById(order.customerId);
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status de um pedido carrega dados além do nome, vale subir para **sealed class** em vez de `enum` simples. O compilador exige exaustividade no `switch`, e cada subclasse carrega os campos que fazem sentido para aquele estado:

<details>
<summary>✅ Bom: sealed class quando o estado carrega dados</summary>

```dart
sealed class OrderState {}

class OrderPending extends OrderState {}

class OrderPaid extends OrderState {
  final DateTime paidAt;
  OrderPaid({required this.paidAt});
}

class OrderShipped extends OrderState {
  final DateTime paidAt;
  final String trackingCode;
  OrderShipped({required this.paidAt, required this.trackingCode});
}

class OrderCancelled extends OrderState {
  final DateTime cancelledAt;
  final String reason;
  OrderCancelled({required this.cancelledAt, required this.reason});
}

String summarize(OrderState state) {
  return switch (state) {
    OrderPending() => 'Pending',
    OrderPaid(:final paidAt) => 'Paid at ${paidAt.toIso8601String()}',
    OrderShipped(:final trackingCode) => 'Shipped, tracking $trackingCode',
    OrderCancelled(:final reason) => 'Cancelled: $reason',
  };
}
```

O `switch` é exaustivo: adicionar `OrderRefunded` sem tratar o `case` é erro de compilação. Para o estado simples (sem dados associados), um `enum OrderStatus` basta. A `sealed class` só ganha tração quando o estado carrega informação própria.

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

```dart
extension type TenantId(String value) {}

class Order extends Entity<OrderId> {
  final TenantId tenantId;
  final CustomerId customerId;
  final List<OrderItem> _items;

  Order({required super id, required this.tenantId, required this.customerId})
      : _items = [];
}

class OrderItem extends Entity<OrderItemId> {
  final TenantId tenantId; // duplica o tenantId do Order
  final ProductId productId;
  final int quantity;

  OrderItem({
    required super id,
    required this.tenantId,
    required this.productId,
    required this.quantity,
  });
}

Money calculateOrderTotal(Order order, TenantId currentTenant) {
  if (order.tenantId != currentTenant) {
    throw StateError('Tenant mismatch on order.');
  }
  for (final item in order.lineItems) {
    if (item.tenantId != currentTenant) {
      throw StateError('Tenant mismatch on item.');
    }
  }

  return order.total;
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```dart
extension type TenantId(String value) {}

class Order extends Entity<OrderId> {
  final TenantId tenantId; // único campo de tenant no agregado
  final CustomerId customerId;
  final List<OrderItem> _items;

  Order._({
    required super id,
    required this.tenantId,
    required this.customerId,
  }) : _items = [];

  factory Order.place({
    required OrderId id,
    required TenantId tenantId,
    required CustomerId customerId,
  }) {
    final order = Order._(id: id, tenantId: tenantId, customerId: customerId);
    return order;
  }
}

class OrderItem extends Entity<OrderItemId> {
  final ProductId productId;
  final int quantity;

  OrderItem({
    required super id,
    required this.productId,
    required this.quantity,
  });
}

abstract interface class TenantContext {
  TenantId current();
}

class OrderRepository {
  final DatabaseConnection _connection;
  final TenantContext _tenantContext;

  OrderRepository(this._connection, this._tenantContext);

  Future<Order?> findById(OrderId id) async {
    final activeTenant = _tenantContext.current();
    final row = await _connection.queryOne(
      'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
      [id.value, activeTenant.value],
    );
    if (row == null) return null;

    final order = OrderMapper.toDomain(row);
    return order;
  }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Dart real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects com `final class` ou separar em agregados.

**Entity base inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa. Tratamento: deixar só `id` na base; demais campos viram composição com `AuditFields` ou mixin.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller obrigado a `?.` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio" e campos sem `final`. Tratamento: lista privada `_phones` com exposição via `List.unmodifiable`.

**`!` (null assertion) em campo de domínio**. `customer!.email` em vez de guard explícito. Sintoma: `Null check operator used on a null value` sem contexto em produção. Tratamento: `if (customer == null) throw ...` com mensagem expressiva.

**`dynamic` para escapar do compilador**. Campo tipado como `dynamic` para "não brigar com o sistema de tipos". Sintoma: erros que apareceriam em compilação só pipocam em runtime. Tratamento: tipo concreto, `Object` com narrowing, ou factory com validação.

**Strings cruas como ID**. `final String customerId` em vez de `CustomerId`. Sintoma: bug onde `orderId` foi passado no lugar de `customerId` e o compilador aceitou. Tratamento: `extension type CustomerId(String value)` em Dart 3.3+, ou `final class CustomerId` para versões anteriores.

**Referência direta cruzando agregado**. `Order.customer` em vez de `Order.customerId`. Sintoma: para carregar um pedido, o repositório puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order._items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos.

**`enum` onde `sealed class` cabe melhor**. Usar `enum` para estado que carrega dados associados. Sintoma: mapa paralelo `Map<OrderStatus, dynamic>` para guardar os dados do estado. Tratamento: `sealed class OrderState` com subclasses tipadas.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático Dart

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
