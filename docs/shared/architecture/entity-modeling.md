# Modelagem de entidades

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão de modelagem. As regras aqui valem para qualquer linguagem orientada a objetos ou que aceite a abstração de **entity** (entidade) como peça do domínio.

Esta página responde a perguntas que aparecem em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `BaseEntity`. O objetivo é dar critério, não receita fechada.

A modelagem aqui é puro domínio. Persistência (mapeamento ORM, repositórios, queries, índices) vive em [`../platform/database.md`](../platform/database.md) e em `data-access.md` de cada linguagem. Quando uma decisão de domínio toca persistência, o doc aponta o pulo para o lugar certo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); igualdade definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); igualdade por comparação estrutural |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (Order + OrderItems formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de string ou GUID cru, para impedir trocas acidentais entre IDs |
| **cardinality** (cardinalidade) | Quantidade de elementos permitidos na relação entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **GUID** (Globally Unique Identifier, identificador único global) | String de 128 bits usada como ID, geralmente em formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo. O sinal correto é a **cohesion**: as propriedades mudam juntas, são consultadas juntas, fazem sentido juntas. Quando um subconjunto começa a viver uma vida própria, ele já é outra coisa.

Heurística prática, na ordem em que a dor aparece:

- **5 a 10 propriedades**: zona confortável. Quase toda entidade de domínio cabe nessa faixa.
- **10 a 15**: hora de olhar a coesão. Se os campos representam um único conceito (`Order` com header + totais + status), tudo bem. Se já dá pra agrupar (endereço, preferências, dados fiscais), extrair.
- **15+**: quase sempre é sinal de duas entidades coladas. Quebrar.

A regra real é qualitativa: se o nome da entidade não descreve mais o que ela faz (`CustomerWithAddressAndPreferencesAndAccount`), o limite passou.

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

20 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

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

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`null` em 8 de 20).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Três padrões cobrem quase tudo: value object embutido, value object opcional e entidade satélite.

**Value object embutido** (`Address` dentro de `Customer`): conceito pequeno, sem identidade própria, faz parte do estado natural do dono. O endereço muda inteiro, não pelas partes.

**Value object opcional** (`TaxInfo` dentro de `Customer`): conceito que existe só em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é nullable; quando presente, traz o conceito completo.

**Entidade satélite** (`CustomerProfile` separada): informação acessada raramente, com volume maior, ou com regras próprias de versionamento. Vale a separação quando 80% das consultas ao `Customer` não precisam do `Profile`.

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

A regra "se um campo de imposto existe, todos existem" mora no método `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem.

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

A invariante "se imposto existe, é completo" mora no construtor de `TaxInfo`. Quem cria um cliente sem imposto passa `null`. Não tem como criar um `TaxInfo` parcial.

</details>

## Strongly-typed IDs

Em vez de passar um GUID ou string cru por todo lugar, embrulhar o ID em um tipo próprio. O ganho aparece quando o sistema cresce: a função `chargeCustomer(orderId)` deixa de compilar (em linguagens estáticas) ou falha cedo (em JavaScript com checagem em runtime). Sem isso, o bug é silencioso até alguém cobrar a fatura do cliente errado.

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

O `instanceof` falha cedo, no boundary da função. Em TypeScript ou C#, a checagem é feita em tempo de compilação e a guarda runtime nem precisa existir.

</details>

Em JavaScript puro essa abordagem custa duas linhas a mais por ID. Em projetos pequenos, dá pra começar com string crua e migrar quando o tipo de bug aparece. Em projeto grande com vários IDs parecidos (`customerId`, `orderId`, `productId`, `invoiceId`), o investimento se paga rápido.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade. Concentrar a identidade em uma classe base é razoável. O risco aparece quando alguém começa a empilhar nessa base tudo que parece "comum": `createdAt`, `updatedAt`, `deletedAt`, `version`, `tenantId`, `createdBy`, `updatedBy`. Vira um God Object e cada entidade carrega coisa que não precisa.

Regra de bolso:

- **Entra na base**: `id`. Único, motivo claro, todas as entidades têm.
- **Sai da base**: campos de auditoria. Vão por interface opcional (`IAuditable`, mixin, trait, conforme a linguagem).
- **Caso à parte**: `tenantId`. Só faz sentido em **aggregate root**, não em entidade filha. Detalhes em [Multitenancy](#multitenancy).

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

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. O construtor da base aceita oito campos para devolver um item de pedido com três. Cada nova feature que entra na base afeta toda entidade do sistema.

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

`Entity` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. Quem é filho de agregado nem expõe auditoria porque não faz sentido editar um `OrderItem` isolado.

</details>

Em linguagens com mixin, trait, protocol ou interface, a separação fica ainda mais limpa: `class Customer extends Entity implements IAuditable, ISoftDeletable`. Em JavaScript puro, composição via campo (`this.audit = ...`) é o atalho equivalente.

## Propriedade vs lista

Cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde histórico. Se diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes têm só um.

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

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

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

A regra "no máximo 3" mora no método `addPhone`, onde dá pra mudar sem mexer no schema. Lista vazia (`[]`) é o estado neutro: itera sem `?.`, sem caso especial.

</details>

Listas seguem a regra de [`null-safety`](../standards/null-safety.md#coleções-nunca-null-sempre-vazia): nunca null, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. A pergunta importante é: **quem é dono**.

Se os filhos não fazem sentido fora do pai (não dá pra existir `OrderItem` sem `Order`), eles fazem parte do mesmo **aggregate**. O **aggregate root** é quem orquestra: cria, valida, remove. O acesso direto aos filhos passa pelo root.

Se os filhos existem independentemente (`Customer` tem muitos `Order`, mas `Order` existe sem precisar do `Customer` em memória), eles são **aggregates separados**. A referência cruza fronteira de agregado, então vai por ID.

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

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre representa duas coisas:

- **Associação pura**: aluno está em curso, sem mais informação. Modelar com dois lados que conhecem o outro por ID.
- **Associação com atributos próprios**: aluno matriculado em curso com data, status, nota final. Aqui o relacionamento **vira entidade**, com nome próprio (`Enrollment`).

A regra: se o relacionamento tem informação que não pertence nem ao lado esquerdo nem ao lado direito, ele é uma entidade.

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

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de array.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo de domínio pode expor lista de IDs em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo aggregate, referência direta é natural: `Order.items` é `OrderItem[]`, não `OrderItemId[]`. O agregado é uma unidade de consistência transacional, carrega tudo junto.

Atravessando fronteira de agregado, a referência vai por ID. `Order` referencia `Customer` por `customerId`, não pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, o que é responsabilidade do agregado `Customer`.

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

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

## Multitenancy

Em sistema **multitenant**, cada cliente (tenant) é um espaço de dados isolado. A regra crítica é: dado de um tenant nunca pode vazar para outro, em consulta, log, exportação ou cache.

Onde colocar o `tenantId`:

- **No aggregate root**: sim. `Order.tenantId`, `Customer.tenantId`. Permite o repositório aplicar o filtro automático.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa de `tenantId`, porque o pai (`Order`) já carrega; consulta-se sempre pelo pai.
- **Em value object**: não. `Address`, `Money` são tenant-agnósticos.

Aplicação do isolamento mora **fora da entidade**: no repositório, em middleware, em row-level security do banco. A entidade só carrega o campo; quem usa é a infraestrutura.

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

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante isolamento mesmo se a aplicação falhar. Detalhes em [`platform/database.md`](../platform/database.md).

## Anti-patterns

Padrões que aparecem em código real e indicam que a modelagem precisa de revisão.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa. Tratamento: deixar só `id` na base; demais campos viram interfaces ou composição.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller precisa checar nulos a cada acesso. Tratamento: extrair os opcionais em value object opcional, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: lista de verdade.

**Mapa mascarado como lista**. Lista de pares `{ key, value }` quando o domínio diz "acesso por chave". Sintoma: `find` em loop linear toda vez que se quer um valor específico. Tratamento: `Map` ou objeto indexado.

**Referência direta cruzando agregado**. `Order.customer` em vez de `Order.customerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Entidade sem identidade**. Classe sem `id` consultada como se fosse entidade. Sintoma: comparações por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar nome". Tratamento: dar identidade explícita, ou aceitar que é value object e usar igualdade estrutural.

**Bidirecionalidade automática**. `Order.items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos.

## Referências

- [`architecture/patterns.md`](patterns.md): padrões de design e quando aplicar
- [`architecture/principles.md`](principles.md): princípios transversais (SLA, CQS, SSOT)
- [`architecture/component-architecture.md`](component-architecture.md): arquitetura por componentes e regras de fronteira
- [`standards/null-safety.md`](../standards/null-safety.md): fronteiras de validação e coleções vazias
- [`platform/database.md`](../platform/database.md): persistência, ORM, multi-tenancy no banco
- Bibliografia de referência: _Domain-Driven Design_ (Eric Evans, 2003), _Implementing Domain-Driven Design_ (Vaughn Vernon, 2013), _Patterns of Enterprise Application Architecture_ (Martin Fowler, 2002)
