# Modelagem de entidades

> Escopo: TypeScript. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: branded types, `readonly`, classes abstratas com generics, string literal unions e discriminated unions.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em TypeScript e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem `strict: true` no `tsconfig.json` e não usam `any` em ponto nenhum.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItems` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item, telefone não passa de 11 dígitos) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `string` ou `GUID` cru, para impedir trocas acidentais entre IDs |
| **branded type** (tipo marcado) | Padrão TS para identificadores tipados: `string & { readonly __brand: 'X' }`; distingue valores semânticos sem custo em runtime |
| **discriminated union** (união discriminada) | Union de shapes com um campo literal em comum (`status`) que permite narrowing automático do compilador |
| **ReadonlyArray** (array somente leitura) | `ReadonlyArray<T>` ou `readonly T[]`: array que não aceita `push`, `pop` nem atribuição; usado em retornos públicos de coleções |
| **type guard** (guarda de tipo) | Função com retorno `value is T` que estreita o tipo dentro do bloco onde retorna `true` |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo que aceita `null` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Prisma, TypeORM, MikroORM, Drizzle) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

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

```ts
interface CustomerProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: Date;
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  newsletterOptIn: boolean;
  smsOptIn: boolean;
  preferredLanguage: string;
  taxId: string | null;
  taxRegime: string | null;
  invoiceEmail: string | null;
}

class Customer {
  constructor(public readonly props: CustomerProps) {}
}
```

19 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a interface. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `null` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```ts
interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
  readonly email: string;
  readonly address: Address;
  readonly preferences: CustomerPreferences;
  readonly taxInfo: TaxInfo | null;
}

class Customer {
  constructor(private readonly props: CustomerProps) {}
}

interface Address {
  readonly street: string;
  readonly number: string;
  readonly complement: string | null;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
}

interface CustomerPreferences {
  readonly newsletterOptIn: boolean;
  readonly smsOptIn: boolean;
  readonly preferredLanguage: string;
}

interface TaxInfo {
  readonly taxId: string;
  readonly taxRegime: string;
  readonly invoiceEmail: string;
}
```

Cada interface responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro, e quando presente vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T | null` demais (8 de 20 sempre `null`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em TypeScript, vira `interface` com todos os campos `readonly` ou `type` literal congelado.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `T | null`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```ts
interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
  readonly email: string;
  readonly taxId: string | null;
  readonly taxRegime: string | null;
  readonly invoiceEmail: string | null;
}

class Customer {
  constructor(private readonly props: CustomerProps) {}

  hasTaxInfo(): boolean {
    const isFiscallyRegistered =
      this.props.taxId !== null && this.props.taxRegime !== null;
    return isFiscallyRegistered;
  }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `taxId` preenchido e `taxRegime` `null`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, criado via factory</summary>

```ts
interface TaxInfoProps {
  readonly taxId: string;
  readonly taxRegime: string;
  readonly invoiceEmail: string;
}

class TaxInfo {
  private constructor(private readonly props: TaxInfoProps) {}

  static create(props: TaxInfoProps): TaxInfo {
    if (!props.taxId || !props.taxRegime) {
      throw new ValidationError({
        message: "TaxInfo requires both taxId and taxRegime.",
      });
    }

    const taxInfo = new TaxInfo(props);
    return taxInfo;
  }
}

interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
  readonly email: string;
  readonly taxInfo: TaxInfo | null;
}

class Customer {
  constructor(private readonly props: CustomerProps) {}

  hasTaxInfo(): boolean {
    const isFiscallyRegistered = this.props.taxInfo !== null;
    return isFiscallyRegistered;
  }
}
```

A invariante "se imposto existe, é completo" mora no factory `TaxInfo.create`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` parcial: o construtor é privado e o factory falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `string`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em TypeScript é barata: **branded types**. Um `string & { readonly __brand: 'CustomerId' }` é, em runtime, uma string normal (custo zero); em compile time, é um tipo distinto que rejeita atribuição cruzada com outros brands. O factory de criação é o único ponto que produz o tipo.

<details>
<summary>❌ Ruim: IDs como string crua, fáceis de trocar de lugar</summary>

```ts
function transferOwnership(customerId: string, orderId: string): Promise<void> {
  const updated = orderRepository.update(orderId, { customerId });
  return updated;
}

const newOwnerId = customer.id;
const targetOrderId = order.id;

// inverte argumentos: nada acusa, tipo de ambos é string
transferOwnership(targetOrderId, newOwnerId);
```

</details>

<details>
<summary>✅ Bom: branded types via intersection + factory tipada</summary>

```ts
type CustomerId = string & { readonly __brand: "CustomerId" };
type OrderId = string & { readonly __brand: "OrderId" };

function customerId(value: string): CustomerId {
  if (!value) {
    throw new ValidationError({ message: "CustomerId requires a value." });
  }

  const branded = value as CustomerId;
  return branded;
}

function orderId(value: string): OrderId {
  if (!value) {
    throw new ValidationError({ message: "OrderId requires a value." });
  }

  const branded = value as OrderId;
  return branded;
}

function transferOwnership(
  customerId: CustomerId,
  orderId: OrderId,
): Promise<void> {
  const updated = orderRepository.update(orderId, { customerId });
  return updated;
}

const newOwnerId = customerId(customer.idValue);
const targetOrderId = orderId(order.idValue);

// trocar a ordem: erro de compilação
transferOwnership(targetOrderId, newOwnerId);
//                ^^^^^^^^^^^^^^ Argument of type 'OrderId' is not assignable
//                               to parameter of type 'CustomerId'.
```

O brand existe só no sistema de tipos. Em runtime, `customerId(value)` retorna a própria string. O compilador rejeita a troca cedo, antes do código chegar perto do banco.

</details>

Quando há vários IDs no projeto, vale generalizar o padrão em um utility:

<details>
<summary>✅ Bom: utility genérico Brand para reduzir boilerplate</summary>

```ts
type Brand<TValue, TTag extends string> = TValue & {
  readonly __brand: TTag;
};

type CustomerId = Brand<string, "CustomerId">;
type OrderId = Brand<string, "OrderId">;
type ProductId = Brand<string, "ProductId">;
type InvoiceId = Brand<string, "InvoiceId">;

function brandedId<TId extends Brand<string, string>>(
  value: string,
  label: string,
): TId {
  if (!value) {
    throw new ValidationError({ message: `${label} requires a value.` });
  }

  const branded = value as TId;
  return branded;
}

const newOwnerId = brandedId<CustomerId>(rawCustomerId, "CustomerId");
const targetOrderId = brandedId<OrderId>(rawOrderId, "OrderId");
```

Cada ID novo custa uma linha de `type`. O factory permanece o único ponto que produz o brand, e a validação fica concentrada num único helper.

</details>

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `audit: AuditFields`) ou por intersection type quando a auditoria for genuinamente ortogonal.
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```ts
abstract class BaseEntity {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
    public readonly version: number,
    public readonly tenantId: string,
    public readonly createdBy: string,
    public readonly updatedBy: string,
  ) {}
}

class OrderItem extends BaseEntity {
  constructor(
    id: string,
    public readonly productId: string,
    public readonly quantity: number,
  ) {
    super(id, new Date(), new Date(), null, 1, "", "", "");
  }
}
```

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. O construtor da base aceita oito argumentos para devolver um item de pedido com três. Os valores vazios em `super(...)` denunciam o problema. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica + composição para comportamentos extras</summary>

```ts
abstract class Entity<TId extends Brand<string, string>> {
  protected constructor(public readonly id: TId) {}

  equals(other: Entity<TId>): boolean {
    const isSameClass = other instanceof this.constructor;
    const isSameId = isSameClass && other.id === this.id;
    return isSameId;
  }
}

interface AuditFields {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
}

interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
  readonly email: string;
  readonly audit: AuditFields;
}

class Customer extends Entity<CustomerId> {
  private constructor(private readonly props: CustomerProps) {
    super(props.id);
  }

  static rehydrate(props: CustomerProps): Customer {
    const customer = new Customer(props);
    return customer;
  }
}

interface OrderItemProps {
  readonly id: OrderItemId;
  readonly productId: ProductId;
  readonly quantity: number;
}

class OrderItem extends Entity<OrderItemId> {
  constructor(private readonly props: OrderItemProps) {
    super(props.id);
  }
}
```

`Entity<TId>` carrega só o que toda entidade precisa, e o ID já vem tipado pelo brand. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho. O `equals` compara por ID, conforme a definição de entidade.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos TS:

| Regra de negócio | Modelo | Exemplo |
|---|---|---|
| Sempre exatamente um | Campo obrigatório | `name: string`, `total: Money` |
| Zero ou um | Campo `T \| null` | `taxInfo: TaxInfo \| null` |
| Zero ou mais | `ReadonlyArray<T>` (vazio, nunca null) | `items: ReadonlyArray<OrderItem>` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em TypeScript, listas públicas usam `ReadonlyArray<T>` (ou `readonly T[]`) para impedir que callers façam `push` direto. A mutação interna passa por um array mutável `private`, e o método de domínio é a única forma de alterar.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```ts
interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
}

class Customer {
  constructor(private readonly props: CustomerProps) {}

  addPhone(value: string): void {
    if (!this.props.phone1) {
      this.props.phone1 = value;
      return;
    }
    if (!this.props.phone2) {
      this.props.phone2 = value;
      return;
    }
    if (!this.props.phone3) {
      this.props.phone3 = value;
      return;
    }

    throw new ValidationError({ message: "Customer accepts at most 3 phones." });
  }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Aceitar um quarto telefone passa a exigir mudança no schema, quando deveria exigir mudança na regra. O `readonly` precisou sair dos campos para permitir a escrita.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via ReadonlyArray</summary>

```ts
type PhoneType = "mobile" | "home" | "work";

interface Phone {
  readonly number: string;
  readonly type: PhoneType;
}

interface CustomerProps {
  readonly id: CustomerId;
  readonly name: string;
}

class Customer {
  private readonly phones: Phone[] = [];

  constructor(private readonly props: CustomerProps) {}

  get phoneList(): ReadonlyArray<Phone> {
    const snapshot = this.phones as ReadonlyArray<Phone>;
    return snapshot;
  }

  addPhone(phone: Phone): void {
    if (this.phones.length >= 3) {
      throw new ValidationError({
        message: "Customer can have at most 3 phones.",
      });
    }

    this.phones.push(phone);
  }

  removePhone(number: string): void {
    const remaining = this.phones.filter((phone) => phone.number !== number);
    this.phones.length = 0;
    this.phones.push(...remaining);
  }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá pra mudar sem mexer no schema. A lista exposta é `ReadonlyArray<Phone>`: callers iteram à vontade mas não conseguem `push` direto, então o limite continua valendo. Lista vazia (`[]`) é o estado neutro: itera sem `?.`.

</details>

Listas seguem a regra de [null-safety](./null-safety.md#collections-never-null): nunca null, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, a root é a única classe exposta do agregado, e o construtor da entidade filha pode ser `private` para que só o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza o limite de um agregado para o outro, então vai por ID (`CustomerId`), com o objeto completo ficando de fora.

<details>
<summary>❌ Ruim: filho carrega referência ao pai, ciclo bidirecional sem dono</summary>

```ts
class Order {
  public readonly items: OrderItem[] = [];

  constructor(public readonly id: OrderId) {}
}

class OrderItem {
  constructor(
    public readonly id: OrderItemId,
    public readonly order: Order, // referência completa
    public readonly productId: ProductId,
    public readonly quantity: number,
  ) {}
}

const order = new Order(orderIdentifier);
const item = new OrderItem(itemIdentifier, order, productIdentifier, 2);
order.items.push(item);

// quem valida que items.length não passa do limite? quem garante que removeItem
// limpa item.order? a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```ts
interface OrderItemProps {
  readonly id: OrderItemId;
  readonly productId: ProductId;
  readonly quantity: number;
  readonly unitPrice: Money;
}

class OrderItem {
  private constructor(private readonly props: OrderItemProps) {}

  static create(props: OrderItemProps): OrderItem {
    if (props.quantity <= 0) {
      throw new ValidationError({ message: "Quantity must be positive." });
    }

    const item = new OrderItem(props);
    return item;
  }

  get id(): OrderItemId {
    return this.props.id;
  }

  subtotal(): Money {
    const total = this.props.unitPrice.multiply(this.props.quantity);
    return total;
  }
}

interface OrderProps {
  readonly id: OrderId;
  readonly customerId: CustomerId;
}

class Order extends Entity<OrderId> {
  private readonly items: OrderItem[] = [];

  private constructor(private readonly props: OrderProps) {
    super(props.id);
  }

  static place(props: OrderProps): Order {
    const order = new Order(props);
    return order;
  }

  get lineItems(): ReadonlyArray<OrderItem> {
    const snapshot = this.items as ReadonlyArray<OrderItem>;
    return snapshot;
  }

  addItem(input: Omit<OrderItemProps, "id">): void {
    if (this.items.length >= 50) {
      throw new ValidationError({ message: "Order can have at most 50 items." });
    }

    const item = OrderItem.create({
      id: orderItemId(crypto.randomUUID()),
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    this.items.push(item);
  }

  removeItem(itemIdentifier: OrderItemId): void {
    const remaining = this.items.filter((item) => item.id !== itemIdentifier);
    this.items.length = 0;
    this.items.push(...remaining);
  }

  total(): Money {
    const total = this.items.reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.zero(),
    );
    return total;
  }
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
<summary>❌ Ruim: N:N com atributos espalhados em arrays paralelos</summary>

```ts
interface StudentProps {
  readonly id: StudentId;
  readonly name: string;
  readonly courseIds: CourseId[];
  readonly enrollmentDates: Date[]; // paralelo a courseIds, por índice
}

class Student {
  constructor(private readonly props: StudentProps) {}

  enrollmentDateOf(courseIdentifier: CourseId): Date | null {
    const position = this.props.courseIds.findIndex(
      (id) => id === courseIdentifier,
    );
    if (position === -1) {
      return null;
    }

    const enrolledAt = this.props.enrollmentDates[position] ?? null;
    return enrolledAt;
  }
}
```

Dois arrays paralelos: se um deles sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais um array paralelo. O tipo `Date[]` não impede que alguém `push` na lista errada.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```ts
type EnrollmentStatus = "active" | "completed" | "withdrawn";

interface EnrollmentProps {
  readonly id: EnrollmentId;
  readonly studentId: StudentId;
  readonly courseId: CourseId;
  readonly enrolledAt: Date;
  readonly status: EnrollmentStatus;
  readonly finalGrade: number | null;
}

class Enrollment extends Entity<EnrollmentId> {
  private constructor(private props: EnrollmentProps) {
    super(props.id);
  }

  static open(input: Omit<EnrollmentProps, "status" | "finalGrade">): Enrollment {
    const enrollment = new Enrollment({
      ...input,
      status: "active",
      finalGrade: null,
    });
    return enrollment;
  }

  complete(grade: number): void {
    if (this.props.status !== "active") {
      throw new ValidationError({
        message: "Only active enrollments can be completed.",
      });
    }
    if (grade < 0 || grade > 10) {
      throw new ValidationError({ message: "Grade must be between 0 and 10." });
    }

    this.props = { ...this.props, status: "completed", finalGrade: grade };
  }
}

class Student extends Entity<StudentId> {
  constructor(props: { readonly id: StudentId; readonly name: string }) {
    super(props.id);
  }
}

class Course extends Entity<CourseId> {
  constructor(props: { readonly id: CourseId; readonly title: string }) {
    super(props.id);
  }
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de array.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `ReadonlyArray<CourseId>` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, a referência é direta: `Order.items` é uma lista de `OrderItem`, com os objetos ali dentro. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customerId: CustomerId`, e o objeto `Customer` completo fica de fora. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Com dois donos para a mesma invariante, cada um deles pode salvar uma versão diferente do mesmo cliente, e a última escrita apaga a outra.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```ts
interface OrderProps {
  readonly id: OrderId;
  readonly customer: Customer; // Customer completo
  readonly items: ReadonlyArray<OrderItem>;
}

class Order extends Entity<OrderId> {
  constructor(private readonly props: OrderProps) {
    super(props.id);
  }
}

// para criar Order, preciso buscar Customer inteiro do banco
const customer = await customerRepository.findById(targetCustomerId);
if (!customer) {
  throw new NotFoundError({ message: "Customer not found." });
}

const order = new Order({ id: newOrderId, customer, items: [] });

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```ts
interface OrderProps {
  readonly id: OrderId;
  readonly customerId: CustomerId; // ID, não Customer
  readonly items: ReadonlyArray<OrderItem>;
}

class Order extends Entity<OrderId> {
  constructor(private readonly props: OrderProps) {
    super(props.id);
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }
}

const order = new Order({ id: newOrderId, customerId: targetCustomerId, items: [] });

// quem precisa do Customer resolve o ID no momento certo
const customer = await customerRepository.findById(order.customerId);
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Assim, pedir um pedido busca o pedido, e não o cliente, os endereços dele e o histórico de compras junto.

</details>

Quando o status carrega dados além do nome, vale subir para **discriminated union** em vez de string literal solta. O compilador estreita o tipo automaticamente nos blocos onde o discriminante foi checado:

<details>
<summary>✅ Bom: discriminated union quando o estado carrega dados</summary>

```ts
type OrderState =
  | { readonly status: "pending" }
  | { readonly status: "settled"; readonly settledAt: Date }
  | { readonly status: "shipped"; readonly settledAt: Date; readonly trackingCode: string }
  | { readonly status: "cancelled"; readonly cancelledAt: Date; readonly reason: string };

function summarize(state: OrderState): string {
  if (state.status === "settled") {
    const summary = `Settled at ${state.settledAt.toISOString()}`;
    return summary;
  }
  if (state.status === "shipped") {
    const summary = `Shipped, tracking ${state.trackingCode}`;
    return summary;
  }
  if (state.status === "cancelled") {
    const summary = `Cancelled: ${state.reason}`;
    return summary;
  }

  const summary = "Pending";
  return summary;
}
```

Para o estado simples (sem dados associados), uma `type OrderStatus = "pending" | "settled" | "shipped" | "cancelled"` em um único campo basta. A discriminated union só ganha tração quando o estado carrega informação própria.

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

```ts
type TenantId = Brand<string, "TenantId">;

interface OrderProps {
  readonly id: OrderId;
  readonly tenantId: TenantId;
  readonly customerId: CustomerId;
  readonly items: ReadonlyArray<OrderItem>;
}

interface OrderItemProps {
  readonly id: OrderItemId;
  readonly tenantId: TenantId; // duplica o tenantId do Order
  readonly productId: ProductId;
  readonly quantity: number;
}

function calculateOrderTotal(order: Order, currentTenant: TenantId): Money {
  if (order.tenantId !== currentTenant) {
    throw new ForbiddenError({ message: "Tenant mismatch on order." });
  }
  for (const item of order.lineItems) {
    if (item.tenantId !== currentTenant) {
      throw new ForbiddenError({ message: "Tenant mismatch on item." });
    }
  }

  const total = order.total();
  return total;
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```ts
type TenantId = Brand<string, "TenantId">;

interface OrderProps {
  readonly id: OrderId;
  readonly tenantId: TenantId; // único campo de tenant no agregado
  readonly customerId: CustomerId;
}

class Order extends Entity<OrderId> {
  constructor(private readonly props: OrderProps) {
    super(props.id);
  }

  get tenantId(): TenantId {
    return this.props.tenantId;
  }
}

interface OrderItemProps {
  readonly id: OrderItemId;
  readonly productId: ProductId;
  readonly quantity: number;
}

interface TenantContext {
  current(): TenantId;
}

class OrderRepository {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly tenantContext: TenantContext,
  ) {}

  async findById(identifier: OrderId): Promise<Order | null> {
    const activeTenant = this.tenantContext.current();
    const row = await this.connection.queryOne<OrderRow>(
      "SELECT id, customer_id, tenant_id FROM orders WHERE id = $1 AND tenant_id = $2",
      [identifier, activeTenant],
    );
    if (!row) {
      return null;
    }

    const order = OrderMapper.toDomain(row);
    return order;
  }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código TypeScript real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa, e o construtor da base aceita oito argumentos. Tratamento: deixar só `id: TId` na base genérica; demais campos viram intersection types ou composição.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller obrigado a `?.` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio" e perda do `readonly`. Tratamento: `ReadonlyArray<Phone>` exposta, lista mutável `private` interna.

**`any` para escapar do compilador**. Campo tipado como `any` para "não brigar com o sistema de tipos". Sintoma: erros que apareceriam no compilador só pipocam em runtime. Tratamento: `unknown` mais narrowing, validação de esquema com Zod, ou refatorar o shape.

**`as Type` em vez de validar**. `customer as Customer` para forçar a aceitação. Sintoma: o compilador some, o bug vai para produção. Tratamento: type guard, schema parsing, ou guard clause que rejeita o input no boundary.

**Strings cruas como ID**. `customerId: string` em vez de `CustomerId`. Sintoma: bug onde `orderId` foi passado no lugar de `customerId` e o compilador aceitou. Tratamento: branded type por ID, factory tipada.

**Referência direta cruzando agregado**. `Order.customer: Customer` em vez de `Order.customerId: CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado, mais ciclo na serialização para JSON. Tratamento: relação unidirecional do aggregate root para os filhos.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../../../shared/standards/null-safety.md`](../../../shared/standards/null-safety.md): boundary de validação
- [`./null-safety.md`](./null-safety.md): null-safety idiomático TS

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-and-domain-modeling).
