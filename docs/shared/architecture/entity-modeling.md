# Modelagem de entidades

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão de modelagem. As regras aqui valem para qualquer linguagem orientada a objetos ou que aceite a abstração de **entity** (entidade) como peça do domínio.

Uma entidade saudável descreve um conceito só, e a coesão é o sinal que avisa quando ela deixou de fazer isso. Esta página dá os critérios para reconhecer esse momento e decidir o que fazer: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `BaseEntity`.

O escopo é o domínio puro: como as entidades são desenhadas e como elas se relacionam. Persistência (mapeamento **ORM**, repositórios, queries, índices) vive em [`../platform/database.md`](../platform/database.md) e em `data-access.md` de cada linguagem. Quando uma decisão de domínio toca a persistência, o texto aponta para o lugar certo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); duas entidades são a mesma quando o ID é o mesmo, mesmo que as propriedades mudem |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); dois valores são iguais quando todos os campos coincidem |
| **aggregate** (agregado) | Conjunto de entidades e value objects tratado como uma unidade transacional (`Order` mais seus `OrderItems` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade do agregado visível de fora; protege as invariantes e é o ponto de entrada para o conjunto |
| **invariant** (invariante) | Regra que vale sempre, garantida pelo construtor e pelos métodos que alteram estado (pedido tem ao menos um item, telefone não passa de 11 dígitos) |
| **boundary** (limite) | Linha entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), no lugar de `string` ou `GUID` cru, para impedir trocas acidentais entre IDs |
| **cardinality** (cardinalidade) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (aceita ausência de valor) | Campo que aceita `null` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus) | Classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping · mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Sequelize, Prisma, TypeORM, Entity Framework, Hibernate) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando o histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve vários clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (RLS · segurança por linha) | Recurso do banco que filtra as linhas pelo contexto da requisição antes de a query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

---

## Tamanho saudável da entidade

A coesão decide, e não a contagem de propriedades. As propriedades de uma entidade saudável mudam juntas, são consultadas juntas e fazem sentido juntas. Quando um subconjunto delas começa a mudar em outro ritmo, esse subconjunto já é outro conceito pedindo um nome próprio.

Ainda assim, ajuda ter uma referência para reconhecer a faixa em que a entidade está. Os números abaixo são heurística:

- **5 a 10 propriedades**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre são duas entidades coladas na mesma classe. Quebrar.

Quando o nome da entidade vira uma lista de conceitos (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```js
class Customer {
  constructor({
    id,
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    street,
    number,
    complement,
    city,
    state,
    zipCode,
    country,
    newsletterOptIn,
    smsOptIn,
    preferredLanguage,
    taxId,
    taxRegime,
    invoiceEmail,
  }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.birthDate = birthDate;
    this.street = street;
    this.number = number;
    this.complement = complement;
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

20 propriedades em quatro conceitos misturados. Mudar a preferência de newsletter obriga a reler a classe inteira. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```js
class Customer {
  constructor({ id, name, email, address, preferences, taxInfo }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.address = address; // Address (value object)
    this.preferences = preferences; // CustomerPreferences (value object)
    this.taxInfo = taxInfo; // TaxInfo (value object), opcional para PF
  }
}

class Address {
  constructor({ street, number, complement, city, state, zipCode, country }) {
    this.street = street;
    this.number = number;
    this.complement = complement;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this.country = country;
  }
}

class CustomerPreferences {
  constructor({ newsletterOptIn, smsOptIn, preferredLanguage }) {
    this.newsletterOptIn = newsletterOptIn;
    this.smsOptIn = smsOptIn;
    this.preferredLanguage = preferredLanguage;
  }
}

class TaxInfo {
  constructor({ taxId, taxRegime, invoiceEmail }) {
    this.taxId = taxId;
    this.taxRegime = taxRegime;
    this.invoiceEmail = invoiceEmail;
  }
}
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, por `Order` (endereço de entrega) e por qualquer outro contexto que precise de endereço.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`null` em 8 de 20).
- A persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, três padrões clássicos resolvem a extração. Cada um atende a um cenário, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em código, `Address` mora como campo dentro de `Customer`.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo aceita `null`, e quando está presente traz o conceito completo, com todos os campos juntos e validados juntos.

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada com pouca frequência, tem volume maior ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` dispensam o `Profile`. Aqui o satélite é uma entidade própria, com ID, que referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair valor de objeto</summary>

```js
class Customer {
  constructor({
    id,
    name,
    email,
    // se PJ, esses três aparecem; se PF, ficam null
    taxId,
    taxRegime,
    invoiceEmail,
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.taxId = taxId;
    this.taxRegime = taxRegime;
    this.invoiceEmail = invoiceEmail;
  }

  hasTaxInfo() {
    return this.taxId !== null && this.taxRegime !== null;
  }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `hasTaxInfo`. Cada nova feature de imposto vai ter que reler e replicar essa checagem.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional</summary>

```js
class Customer {
  constructor({ id, name, email, taxInfo = null }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.taxInfo = taxInfo;
  }

  hasTaxInfo() {
    return this.taxInfo !== null;
  }
}

class TaxInfo {
  constructor({ taxId, taxRegime, invoiceEmail }) {
    if (!taxId || !taxRegime) {
      throw new Error("TaxInfo requires both taxId and taxRegime");
    }

    this.taxId = taxId;
    this.taxRegime = taxRegime;
    this.invoiceEmail = invoiceEmail;
  }
}
```

A invariante "se o imposto existe, ele está completo" mora no construtor de `TaxInfo`. Quem cria um cliente sem imposto passa `null`. Um `TaxInfo` parcial nem chega a existir.

</details>

## Cada ID com seu próprio tipo

Quando o sistema cresce, os IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `string` ou `GUID`, o compilador e os testes deixam a troca passar, e o erro aparece em produção, quando um cliente é cobrado pelo pedido errado.

A defesa é barata: embrulhar cada ID em um tipo próprio (`CustomerId`, `OrderId`, `ProductId`) no lugar de espalhar `GUID` ou `string` cru. Em linguagens com tipagem estática (TypeScript, C#, Kotlin), a troca quebra em tempo de compilação. Em JavaScript puro, a checagem com `instanceof` falha no limite da função, antes de a lógica rodar.

<details>
<summary>❌ Ruim: IDs como string crua, fáceis de trocar de lugar</summary>

```js
function transferOwnership(customerId, orderId) {
  // assinatura: customerId primeiro, orderId depois
  // se o caller inverter, o bug passa silencioso
  return orderRepository.update(orderId, { customerId });
}

// uso longe daqui, com nomes locais diferentes:
const a = order.id;
const b = customer.id;

transferOwnership(a, b); // inverte argumentos; nada acusa
```

O **caller** (quem chama a função) inverteu os dois argumentos e o programa seguiu em frente. Nenhuma ferramenta tem como perceber a troca, porque os dois valores são strings.

</details>

<details>
<summary>✅ Bom: ID embrulhado em classe própria</summary>

```js
class CustomerId {
  constructor(value) {
    if (!value) throw new Error("CustomerId requires value");
    this.value = value;
  }

  equals(other) {
    return other instanceof CustomerId && other.value === this.value;
  }

  toString() {
    return this.value;
  }
}

class OrderId {
  constructor(value) {
    if (!value) throw new Error("OrderId requires value");
    this.value = value;
  }

  equals(other) {
    return other instanceof OrderId && other.value === this.value;
  }

  toString() {
    return this.value;
  }
}

function transferOwnership(customerId, orderId) {
  if (!(customerId instanceof CustomerId)) {
    throw new TypeError("customerId must be CustomerId");
  }
  if (!(orderId instanceof OrderId)) {
    throw new TypeError("orderId must be OrderId");
  }

  return orderRepository.update(orderId, { customerId });
}
```

O `instanceof` falha cedo, no limite da função. Em TypeScript ou C#, a mesma checagem acontece em tempo de compilação e a guarda em tempo de execução pode nem existir.

</details>

Em JavaScript puro, essa abordagem custa duas linhas a mais por ID criado. Em projeto pequeno, dá para começar com `string` crua e migrar quando o primeiro bug de troca aparecer. Em projeto grande, com vários IDs parecidos (`customerId`, `orderId`, `productId`, `invoiceId`), o custo se paga já nos primeiros bugs evitados.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada compensa. O risco vem logo depois, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não `version` e `tenantId`?". A base engorda e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. É o único campo que toda entidade precisa, com motivo claro e sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Eles vão por composição ou por interface opcional (`IAuditable`, mixin, trait, conforme a linguagem suporta).
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes na [seção sobre multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```js
class BaseEntity {
  constructor({
    id,
    createdAt,
    updatedAt,
    deletedAt,
    version,
    tenantId,
    createdBy,
    updatedBy,
  }) {
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

class OrderItem extends BaseEntity {
  constructor({ id, productId, quantity }) {
    super({ id });
    this.productId = productId;
    this.quantity = quantity;
  }
}
```

`OrderItem` carrega `tenantId`, `createdBy` e `version` sem usar nenhum deles. O construtor da base aceita oito campos para devolver um item de pedido com três. Cada nova feature que entra na base atinge toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: BaseEntity mínima, comportamentos extras por composição</summary>

```js
class Entity {
  constructor(id) {
    if (!id) throw new Error("Entity requires id");
    this.id = id;
  }

  equals(other) {
    return other instanceof this.constructor && other.id.equals(this.id);
  }
}

// auditoria mora num helper, aplicada onde faz sentido
class AuditFields {
  constructor({ createdAt, updatedAt, createdBy = null, updatedBy = null }) {
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
  }
}

class Customer extends Entity {
  constructor({ id, name, email, audit }) {
    super(id);
    this.name = name;
    this.email = email;
    this.audit = audit; // AuditFields, populada pelo repositório
  }
}

class OrderItem extends Entity {
  constructor({ id, productId, quantity }) {
    super(id);
    this.productId = productId;
    this.quantity = quantity;
    // sem auditoria: faz parte do agregado Order, não vive sozinho
  }
}
```

`Entity` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. Um filho de agregado dispensa auditoria, porque editar um `OrderItem` isolado não é uma operação válida do domínio.

</details>

Em linguagens com interface, mixin, trait ou protocol (mecanismos que adicionam comportamento sem herança), a separação fica ainda mais limpa: `class Customer extends Entity implements IAuditable, ISoftDeletable`. Em JavaScript puro, a composição via campo (`this.audit = ...`) é o equivalente direto.

## Propriedade vs lista

A cardinalidade traduz a regra de negócio, e o estado momentâneo dos dados não muda essa tradução. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela traduz cada regra de cardinalidade para código:

| Regra de negócio | Modelo | Exemplo |
|---|---|---|
| Sempre exatamente um | Campo obrigatório | `Customer.name`, `Order.total` |
| Zero ou um | Campo nullable | `Customer.taxInfo` (só PJ tem) |
| Zero ou mais | Lista (vazia, nunca null) | `Order.items`, `Customer.phones` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```js
class Customer {
  constructor({ id, name, phone1, phone2, phone3 }) {
    this.id = id;
    this.name = name;
    this.phone1 = phone1;
    this.phone2 = phone2;
    this.phone3 = phone3;
  }

  addPhone(value) {
    if (!this.phone1) {
      this.phone1 = value;
      return;
    }
    if (!this.phone2) {
      this.phone2 = value;
      return;
    }
    if (!this.phone3) {
      this.phone3 = value;
      return;
    }
    throw new Error("max 3 phones");
  }
}
```

A regra "cliente tem até três telefones" acabou codificada no schema. Aceitar um quarto telefone vira mudança de schema, com migração de banco, quando deveria ser uma linha alterada em um método.

</details>

<details>
<summary>✅ Bom: lista de Phone com invariante explícita</summary>

```js
class Phone {
  constructor({ number, type }) {
    this.number = number;
    this.type = type; // "mobile" | "home" | "work"
  }
}

class Customer {
  constructor({ id, name, phones = [] }) {
    this.id = id;
    this.name = name;
    this.phones = phones; // sempre [], nunca null
  }

  addPhone(phone) {
    if (this.phones.length >= 3) {
      throw new Error("Customer can have at most 3 phones");
    }
    this.phones.push(phone);
  }

  removePhone(number) {
    this.phones = this.phones.filter((p) => p.number !== number);
  }
}
```

A regra "no máximo 3" mora no método `addPhone`, onde muda sem mexer no schema. A lista vazia (`[]`) é o estado neutro: quem itera não precisa de `?.` nem de caso especial.

</details>

Listas seguem a regra de [`null-safety`](../standards/null-safety.md#collections-never-null): nunca null, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Uma pergunta resolve a modelagem: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** comanda a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pela root. Em código, a root é a única classe do agregado exposta para fora.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, e o `Order` faz sentido sem o `Customer` carregado em memória), cada lado é um agregado separado. A referência entre eles cruza o limite do agregado, então vai por ID.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, círculo bidirecional sem dono</summary>

```js
class Order {
  constructor({ id, items = [] }) {
    this.id = id;
    this.items = items;
  }
}

class OrderItem {
  constructor({ id, order, productId, quantity }) {
    this.id = id;
    this.order = order; // referência completa ao Order
    this.productId = productId;
    this.quantity = quantity;
  }
}

const order = new Order({ id: orderId });
const item = new OrderItem({ id: itemId, order, productId, quantity: 2 });
order.items.push(item);

// quem valida que items.length não passa do limite? quem garante que removeItem
// limpa item.order? a regra fica diluída entre as duas classes.
```

As duas classes se conhecem e nenhuma manda. Cada regra do agregado passa a depender de as duas pontas serem atualizadas juntas, e a primeira que alguém esquecer vira estado inconsistente.

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```js
class OrderItem {
  constructor({ id, productId, quantity, unitPrice }) {
    if (quantity <= 0) throw new Error("quantity must be positive");
    this.id = id;
    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  subtotal() {
    return this.unitPrice * this.quantity;
  }
}

class Order {
  constructor({ id, customerId, items = [] }) {
    this.id = id;
    this.customerId = customerId; // ID, não Customer (outro agregado)
    this.items = items;
  }

  addItem({ productId, quantity, unitPrice }) {
    if (this.items.length >= 50) {
      throw new Error("Order can have at most 50 items");
    }

    const item = new OrderItem({
      id: OrderItemId.generate(),
      productId,
      quantity,
      unitPrice,
    });
    this.items.push(item);
  }

  removeItem(itemId) {
    this.items = this.items.filter((item) => !item.id.equals(itemId));
  }

  total() {
    return this.items.reduce((sum, item) => sum + item.subtotal(), 0);
  }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total e encapsula a criação dos filhos. `OrderItem` desconhece `Order`. A relação aponta em uma direção só, do dono para os dependentes.

</details>

Implicação prática para a persistência: o repositório carrega o agregado inteiro (`Order` mais `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, indica modelo errado. Detalhes em [`platform/database.md`](../platform/database.md).

## Relacionamentos N:N

Muitos para muitos cai sempre em uma de duas situações, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com dois lados que conhecem o outro por uma lista de IDs.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem ao aluno nem ao curso. Aqui o relacionamento vira uma entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em arrays paralelos</summary>

```js
class Student {
  constructor({ id, name, courseIds = [], enrollmentDates = [] }) {
    this.id = id;
    this.name = name;
    this.courseIds = courseIds;
    this.enrollmentDates = enrollmentDates; // paralelo ao courseIds, por índice
  }
}

// como saber a data de matrícula do curso 'COURSE-42'?
// procurar o índice de COURSE-42 em courseIds, usar esse índice em enrollmentDates
// se um deles sair de ordem ou perder um elemento, dados ficam inconsistentes.
```

As duas listas guardam metade da informação cada uma, e a ligação entre elas existe só na posição do índice. Nada no código impede que uma cresça sem a outra.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```js
class Enrollment {
  constructor({ id, studentId, courseId, enrolledAt, status, finalGrade = null }) {
    this.id = id;
    this.studentId = studentId;
    this.courseId = courseId;
    this.enrolledAt = enrolledAt;
    this.status = status; // "active" | "completed" | "withdrawn"
    this.finalGrade = finalGrade;
  }

  complete(grade) {
    if (this.status !== "active") {
      throw new Error("Only active enrollments can be completed");
    }
    if (grade < 0 || grade > 10) {
      throw new Error("Grade must be between 0 and 10");
    }

    this.status = "completed";
    this.finalGrade = grade;
  }
}

class Student {
  constructor({ id, name }) {
    this.id = id;
    this.name = name;
  }
}

class Course {
  constructor({ id, title }) {
    this.id = id;
    this.title = title;
  }
}
```

O relacionamento mora em `Enrollment`, que carrega data, status e nota. `Student` e `Course` ficam livres de listar um ao outro. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, sem navegação de array.

</details>

Quando o N:N é associação pura, sem atributos, uma tabela intermediária só de IDs basta no banco, e o modelo de domínio pode expor a lista de IDs em qualquer um dos lados. A regra continua valendo: uma entidade nova precisa ter informação própria para carregar.

## Identidade vs referência

Dentro do mesmo agregado, a referência direta é o caminho natural: `Order.items` guarda objetos `OrderItem` inteiros. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como um bloco só.

Ao cruzar o limite de outro agregado, a referência muda de forma e passa a ser o ID. `Order` referencia `Customer` por `customerId`. Se carregasse o `Customer` inteiro, o agregado `Order` teria que manter o `Customer` consistente, e essa responsabilidade pertence ao agregado `Customer`. Dois agregados donos da mesma invariante é a origem clássica de estado divergente.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```js
class Order {
  constructor({ id, customer, items = [] }) {
    this.id = id;
    this.customer = customer; // Customer completo
    this.items = items;
  }
}

// para criar Order, preciso buscar Customer inteiro do banco
const customer = await customerRepository.findById(customerId);
const order = new Order({ id: orderId, customer, items });

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

Cada leitura de pedido arrasta o cliente junto, e cada alteração no cliente repercute em tudo que guardou uma cópia dele.

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```js
class Order {
  constructor({ id, customerId, items = [] }) {
    this.id = id;
    this.customerId = customerId; // CustomerId, não Customer
    this.items = items;
  }
}

const order = new Order({ id: orderId, customerId, items });

// para exibir o nome do cliente no detalhe do pedido, o caller resolve o ID:
const customer = await customerRepository.findById(order.customerId);
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento em que for usar. A leitura de um pedido para de puxar o resto do sistema junto.

</details>

<a id="multitenancy"></a>

## Multitenancy: um sistema, vários clientes isolados

Em sistema multitenant, cada cliente (o **tenant**, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. Uma regra domina o desenho: o dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenantId`, e a resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.tenantId`, `Customer.tenantId`. É o que permite ao repositório aplicar o filtro de forma automática.
- **Em entidade filha do agregado**: não. `OrderItem` dispensa o `tenantId`, porque o pai (`Order`) já o carrega e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address` e `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na camada do banco com **row-level security**. A entidade guarda o campo, e a infraestrutura aplica o filtro.

<details>
<summary>❌ Ruim: tenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```js
class Order {
  constructor({ id, tenantId, customerId, items = [] }) {
    this.id = id;
    this.tenantId = tenantId;
    this.customerId = customerId;
    this.items = items;
  }
}

class OrderItem {
  constructor({ id, tenantId, productId, quantity }) {
    this.id = id;
    this.tenantId = tenantId; // duplica o tenantId do Order
    this.productId = productId;
    this.quantity = quantity;
  }
}

// e agora cada serviço precisa checar tenantId em toda operação:
function calculateOrderTotal(order, currentTenantId) {
  if (order.tenantId !== currentTenantId) {
    throw new Error("Forbidden");
  }
  for (const item of order.items) {
    if (item.tenantId !== currentTenantId) {
      throw new Error("Forbidden");
    }
  }
  // ...
}
```

A checagem de tenant se espalha por todo serviço que toca o pedido. Basta um esquecimento em um dos pontos para o dado de um cliente aparecer para outro.

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```js
class Order {
  constructor({ id, tenantId, customerId, items = [] }) {
    this.id = id;
    this.tenantId = tenantId; // único campo de tenant no agregado
    this.customerId = customerId;
    this.items = items;
  }
}

class OrderItem {
  constructor({ id, productId, quantity }) {
    this.id = id;
    this.productId = productId;
    this.quantity = quantity;
  }
}

// repositório aplica o filtro automaticamente, baseado no contexto da requisição
class OrderRepository {
  constructor(connection, tenantContext) {
    this.connection = connection;
    this.tenantContext = tenantContext;
  }

  async findById(orderId) {
    const tenantId = this.tenantContext.current();

    return this.connection.query(
      "SELECT * FROM orders WHERE id = $1 AND tenant_id = $2",
      [orderId.value, tenantId.value],
    );
  }
}
```

A entidade desconhece o conceito de tenant ativo, e o repositório injeta o filtro. O filtro esquecido tem um lugar só para ser procurado e corrigido.

</details>

Como reforço, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código real, e cada um avisa que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20 ou mais propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando auditoria, soft delete, multitenancy e versionamento, forçando os filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa. Tratamento: deixar só `id` na base; os demais campos viram interfaces ou composição.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: o caller precisa checar nulos a cada acesso. Tratamento: extrair os opcionais em value object opcional, ou separar em entidades distintas quando a presença e a ausência indicam conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: lista de verdade.

**Mapa mascarado como lista**. Lista de pares `{ key, value }` quando o domínio diz "acesso por chave". Sintoma: `find` em loop linear toda vez que se quer um valor específico. Tratamento: `Map` ou objeto indexado.

**Referência direta cruzando agregado**. `Order.customer` no lugar de `Order.customerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Entidade sem identidade**. Classe sem `id` consultada como se fosse entidade. Sintoma: comparações por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar de nome". Tratamento: dar identidade explícita, ou aceitar que é value object e usar igualdade estrutural.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados na mão. Sintoma: bug onde o lado A foi atualizado e o lado B ficou para trás. Tratamento: relação em uma direção só, do aggregate root para os filhos.

## Referências

Cross-links dentro do guia:

- [`architecture/patterns.md`](patterns.md): padrões de design e quando aplicar
- [`architecture/principles.md`](principles.md): princípios transversais (SLA, CQS, SSOT)
- [`architecture/component-architecture.md`](component-architecture.md): arquitetura por componentes e regras de limite
- [`standards/null-safety.md`](../standards/null-safety.md): limites de validação e coleções vazias
- [`platform/database.md`](../platform/database.md): persistência, ORM, multitenancy no banco

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../REFERENCES.md#ddd-and-domain-modeling).
