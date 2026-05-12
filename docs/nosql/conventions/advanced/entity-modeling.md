# Modelagem de entidades

> Escopo: NoSQL document-oriented. MongoDB 8.x como referência primária; notas para DynamoDB, Redis e Cassandra onde o idiom difere. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: **aggregate** (agregado) como documento único, escrita atômica no nível do documento, e a regra embedded vs referenced.

Em um document store, o **aggregate root** (raiz do agregado) vira documento completo: um único objeto BSON que pode ser gravado e lido atomicamente. Essa fronteira física coincide com a fronteira do agregado no domínio. `OrderItem` vive embutido em `Order` não por conveniência técnica, mas porque o domínio diz que um item não faz sentido fora do pedido. Quando o domínio separa os conceitos, a separação aparece em coleções distintas, com referência por `_id`.

As invariantes do agregado continuam morando no código da aplicação (driver, **ODM** (Object Document Mapper, mapeador de objeto para documento)) e no **schema validator** (validador de esquema) declarado no banco. O MongoDB não tem chave estrangeira nem constraint declarativa entre coleções; a consistência entre documentos distintos é responsabilidade da aplicação.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **document** (documento) | Objeto BSON que representa um registro; unidade mínima de leitura e escrita atômica |
| **collection** (coleção) | Agrupamento de documentos de mesmo contexto; equivale a uma tabela, mas sem schema fixo por padrão |
| **embedded document** (subdocumento embutido) | Documento aninhado dentro de outro; lido e gravado junto ao pai na mesma operação |
| **referenced document** (documento referenciado) | Documento em outra coleção, apontado por `_id`; exige operação separada para resolução |
| **ObjectId** (identificador de objeto) | Valor de 12 bytes gerado automaticamente pelo MongoDB; inclui timestamp e é indexado por padrão |
| **BSON** (Binary JSON) | Formato binário que estende JSON com tipos adicionais: `Date`, `ObjectId`, `Decimal128`, `UUID` |
| **$jsonSchema** (validador de esquema JSON) | Operador de validação que aplica regras de tipo, campos obrigatórios e enums no nível da coleção |
| **shard key** (chave de fragmentação) | Campo que o MongoDB usa para distribuir documentos entre shards; define o isolamento físico em clusters |
| **partition key** (chave de partição) | Em DynamoDB e Cassandra, campo que determina em qual nó físico o registro vai parar |
| **single-table design** (design de tabela única) | Padrão DynamoDB onde entidades de tipos diferentes coexistem na mesma tabela, separadas por PK+SK |
| **denormalization** (desnormalização) | Duplicação intencional de dados para otimizar leituras; reduz joins mas exige sincronização controlada |
| **capped collection** (coleção limitada) | Coleção de tamanho fixo que descarta documentos antigos automaticamente; usada para logs e eventos |
| **secondary index** (índice secundário) | Índice em campo que não é o `_id`; necessário para buscas por outros critérios |
| **eventual consistency** (consistência eventual) | Modelo onde réplicas convergem para o mesmo estado ao longo do tempo, sem garantia de sincronia imediata |
| **write concern** (nível de confirmação de escrita) | Configuração que define quantas réplicas precisam confirmar antes da operação retornar sucesso |

---

## Tamanho saudável do documento

O limite físico de um documento MongoDB é 16 MB, mas o sinal de design chega antes: quando um documento precisa de muitos campos opcionais, cresce sem limite em arrays embutidos, ou acumula dados de conceitos distintos, é hora de repensar o agregado.

Os mesmos critérios do canônico OO se aplicam, traduzidos para o vocabulário de documento:

- **Até 10 campos de primeiro nível**: zona confortável. Subdocumentos embutidos ajudam a organizar sem fragmentar.
- **10 a 20 campos**: revisar coesão. Se o documento já agrupa conceitos distintos (perfil, endereço, preferências, fiscal), extrair subdocumentos nomeados ou separar em coleção.
- **Arrays sem limite superior**: sinal de alerta. Array que cresce indefinidamente é candidato a coleção separada. O documento nunca deve crescer além do que cabe em memória para uma operação normal.

O teste prático: toda leitura típica precisa do documento inteiro? Se 80% das queries usam apenas 3 de 15 campos, o documento está servindo mal ao acesso. Projeção (`{ field: 1 }`) alivia, mas não resolve o problema de modelagem.

<details>
<summary>❌ Ruim: documento Order acumulando dados de Customer e histórico ilimitado</summary>

```json
{
  "_id": "order-01",
  "customerId": "customer-42",
  "customerName": "Ana Souza",
  "customerEmail": "ana@example.com",
  "customerPhone": "11999990000",
  "customerAddress": {
    "street": "Rua das Flores, 10",
    "city": "São Paulo",
    "zipCode": "01310-100"
  },
  "items": [
    { "productId": "prod-1", "quantity": 2, "unitPrice": 49.9 }
  ],
  "statusHistory": [
    { "status": "pending", "at": "2026-01-01T10:00:00Z" },
    { "status": "paid", "at": "2026-01-01T10:05:00Z" }
  ],
  "auditLog": [
    { "action": "created", "by": "user-1", "at": "2026-01-01T10:00:00Z" },
    { "action": "paid", "by": "user-2", "at": "2026-01-01T10:05:00Z" }
  ]
}
```

`statusHistory` e `auditLog` crescem sem limite a cada operação. `customerAddress` duplica dados do `Customer`, que pode mudar. O documento vai crescer junto com o ciclo de vida do pedido sem critério de parada.

</details>

<details>
<summary>✅ Bom: Order com dados estáveis embutidos e histórico em coleção separada</summary>

```json
{
  "_id": "order-01",
  "tenantId": "tenant-abc",
  "customerId": "customer-42",
  "customerSnapshot": {
    "name": "Ana Souza",
    "email": "ana@example.com"
  },
  "status": "paid",
  "paidAt": "2026-01-01T10:05:00Z",
  "items": [
    { "productId": "prod-1", "quantity": 2, "unitPrice": 49.9 }
  ],
  "createdAt": "2026-01-01T10:00:00Z",
  "updatedAt": "2026-01-01T10:05:00Z",
  "version": 2
}
```

`customerSnapshot` captura os dados relevantes no momento do pedido (desnormalização controlada). Status é um campo simples com `paidAt` ao lado. Histórico de auditoria vai para `order_events` se necessário.

</details>

---

## Composição: embedded vs referenced

A decisão entre embutir (`embedded`) ou referenciar (`referenced`) é a pergunta central de modelagem em document store. A regra prática é mais direta do que em ORM relacional porque o custo de join é explícito: cada referência é uma query separada.

**Embed quando:**

- O filho não tem ciclo de vida fora do pai (`OrderItem` sem `Order` não existe).
- O filho é sempre lido junto com o pai (nenhuma query busca `OrderItem` isolado).
- O array de filhos tem limite natural e previsível (itens de um pedido, endereços de um cliente).

**Reference quando:**

- O filho tem identidade e ciclo de vida próprios (`Customer` existe independente de `Order`).
- O filho é consultado isolado com frequência.
- O array cresceria sem limite (histórico de eventos, log de auditoria).

<details>
<summary>❌ Ruim: Customer completo embutido em Order</summary>

```js
const order = {
  _id: new ObjectId(),
  customer: {
    _id: new ObjectId("customer-42"),
    name: "Ana Souza",
    email: "ana@example.com",
    phone: "11999990000",
    address: { street: "Rua das Flores, 10", city: "São Paulo" },
    preferences: { newsletterOptIn: true, preferredLanguage: "pt-BR" },
  },
  items: [{ productId: "prod-1", quantity: 2, unitPrice: 49.9 }],
};
```

`Customer` tem ciclo de vida próprio e é consultado isolado. Embutir o objeto completo duplica dados que mudam (`email`, `phone`) e força sincronização em todos os pedidos do mesmo cliente quando ele atualiza o perfil.

</details>

<details>
<summary>✅ Bom: referência por ID + snapshot de dados estáveis</summary>

```js
const order = {
  _id: new ObjectId(),
  tenantId: "tenant-abc",
  customerId: "customer-42",
  customerSnapshot: {
    name: "Ana Souza",
    email: "ana@example.com",
  },
  items: [
    { productId: "prod-1", quantity: 2, unitPrice: 49.9 },
    { productId: "prod-2", quantity: 1, unitPrice: 89.9 },
  ],
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};
```

`customerId` é a referência cross-aggregate. `customerSnapshot` congela nome e email no momento do pedido — dado imutável por design de negócio (o pedido sempre reflete o nome do cliente na hora da compra, mesmo que ele mude de nome depois). O campo `email` ao vivo é resolvido via `customerId` quando necessário.

</details>

---

## Strongly-typed IDs em NoSQL

MongoDB usa `ObjectId` como `_id` por padrão: um valor de 12 bytes gerado pelo driver, único globalmente, com timestamp embutido. É possível usar qualquer valor como `_id` — inclusive `string` UUID ou um valor de negócio composto.

A disciplina de IDs tipados em NoSQL não vem do banco, mas do driver e do ODM. Mongoose, por exemplo, declara o tipo do `_id` no schema e rejeita documentos que não respeitam. Em código sem ODM, a convenção é nomear campos de referência com o sufixo `Id` em camelCase (`customerId`, `orderId`), para deixar explícito que é uma referência, não o objeto completo.

<details>
<summary>❌ Ruim: campo de referência sem sufixo, ambíguo entre objeto e ID</summary>

```js
async function createOrder(customerId) {
  const order = {
    _id: new ObjectId(),
    customer: customerId,
    items: [],
    createdAt: new Date(),
  };

  const result = await ordersCollection.insertOne(order);
  return result;
}
```

`customer: customerId` é ambíguo: quem lê o documento não sabe se `customer` é um ID ou o objeto completo embutido. Ao fazer `$lookup`, o campo `customer` vai ser confundido com embedded document.

</details>

<details>
<summary>✅ Bom: sufixo Id explícito + tipo consistente</summary>

```js
async function createOrder(customerId) {
  const order = {
    _id: new ObjectId(),
    tenantId: "tenant-abc",
    customerId,
    items: [],
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const result = await ordersCollection.insertOne(order);
  return result;
}
```

`customerId` deixa claro que é referência, não objeto. O `$lookup` usa `customerId` como `localField` sem ambiguidade. Se o projeto usar UUID em vez de ObjectId, o campo continua sendo `customerId: string`.

</details>

Com Mongoose, declare o tipo explicitamente no schema:

```js
const orderSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "cancelled"],
    required: true,
  },
  items: [orderItemSchema],
  version: { type: Number, default: 1 },
});
```

---

## Campos comuns do documento

Todo documento de agregado carrega um conjunto mínimo de campos de infraestrutura. A convenção MongoDB usa camelCase nos nomes de campo.

| Campo | Tipo | Obrigatório | Papel |
|---|---|---|---|
| `_id` | `ObjectId` ou `string` | Sim | Identificador único; indexado automaticamente |
| `tenantId` | `string` | Em sistemas multitenant | Isolamento de dados entre tenants |
| `createdAt` | `Date` | Sim | Timestamp de criação; imutável após insert |
| `updatedAt` | `Date` | Sim | Timestamp da última alteração; atualizado em todo `$set` |
| `version` | `number` | Recomendado | Controle de concorrência otimista; incrementado a cada escrita |

`version` habilita o padrão de **optimistic locking** (bloqueio otimista): antes de gravar, a query inclui `{ _id: id, version: currentVersion }` no filtro. Se `modifiedCount === 0`, outro processo já atualizou o documento.

```js
async function updateOrderStatus(orderId, currentVersion, status) {
  const filter = { _id: orderId, version: currentVersion };
  const update = {
    $set: { status, updatedAt: new Date() },
    $inc: { version: 1 },
  };

  const result = await ordersCollection.updateOne(filter, update);
  return result;
}
```

---

## Campo único vs array vs subdocumento embutido

A mesma regra de cardinalidade do canônico OO se aplica, com tradução direta para o modelo de documento:

| Regra de negócio | Modelo no documento | Exemplo |
|---|---|---|
| Sempre exatamente um | Campo de primeiro nível | `order.status`, `order.total` |
| Zero ou um | Campo nullable (omitido ou `null`) | `order.paidAt` (null enquanto pendente) |
| Zero ou mais, número limitado | Array embutido | `order.items`, `customer.phones` |
| Zero ou mais, ilimitado | Coleção separada | `order_events`, `audit_log` |
| Conceito com múltiplos campos | Subdocumento embutido | `order.address`, `order.customerSnapshot` |

Arrays embutidos seguem a regra: nunca `null`, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

<details>
<summary>❌ Ruim: array ilimitado embutido crescendo com o ciclo de vida</summary>

```json
{
  "_id": "order-01",
  "status": "paid",
  "statusHistory": [
    { "status": "pending", "at": "2026-01-01T10:00:00Z" },
    { "status": "paid", "at": "2026-01-01T10:05:00Z" },
    { "status": "shipped", "at": "2026-01-02T08:00:00Z" },
    { "status": "delivered", "at": "2026-01-04T14:30:00Z" }
  ]
}
```

`statusHistory` cresce a cada transição. Em um pedido com muitas etapas, o array é ilimitado. O documento aumenta de tamanho a cada update, e queries que não precisam do histórico ainda carregam tudo.

</details>

<details>
<summary>✅ Bom: estado atual no documento, histórico em coleção separada</summary>

```js
const order = {
  _id: new ObjectId(),
  status: "paid",
  paidAt: new Date("2026-01-01T10:05:00Z"),
  updatedAt: new Date(),
};

const orderEvent = {
  _id: new ObjectId(),
  orderId: order._id,
  event: "status_changed",
  previousStatus: "pending",
  nextStatus: "paid",
  occurredAt: new Date("2026-01-01T10:05:00Z"),
};

await ordersCollection.updateOne({ _id: order._id }, { $set: order });
await orderEventsCollection.insertOne(orderEvent);
```

O documento `order` mantém apenas o estado atual. O histórico vai para `order_events`, que pode crescer sem impactar o documento principal.

</details>

---

## Relacionamentos 1:N

Um para muitos em document store tem dois caminhos, e a escolha depende da pergunta "o filho existe sem o pai?":

**Array embutido**: quando os filhos são parte integral do agregado (`OrderItem` dentro de `Order`). A escrita é atômica no nível do documento. Sem query adicional para carregar os filhos.

**Coleção separada com referência**: quando os filhos têm ciclo de vida próprio ou o array cresceria sem limite. Cada filho é um documento na própria coleção, com campo referenciando o pai por `_id`.

<details>
<summary>❌ Ruim: Order referencia itens por array de IDs sem embeder o conteúdo</summary>

```js
const order = {
  _id: new ObjectId(),
  customerId: "customer-42",
  itemIds: ["item-01", "item-02", "item-03"],
  status: "pending",
};
```

Array de IDs sem o conteúdo obriga um `$lookup` ou N queries para cada leitura de pedido. Se os itens não existem sem o pedido, o design está errado: o custo de join foi adicionado sem ganho.

</details>

<details>
<summary>✅ Bom: itens embutidos quando fazem parte do agregado Order</summary>

```js
const order = {
  _id: new ObjectId(),
  tenantId: "tenant-abc",
  customerId: "customer-42",
  status: "pending",
  items: [
    { _id: new ObjectId(), productId: "prod-1", quantity: 2, unitPrice: 49.9 },
    { _id: new ObjectId(), productId: "prod-2", quantity: 1, unitPrice: 89.9 },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};
```

Os itens fazem parte do agregado: são lidos sempre junto ao pedido, não têm identidade fora dele, e o array tem limite natural (nenhum pedido razoável tem 10.000 itens). A escrita via `$push` ou `findOneAndUpdate` é atômica no documento.

</details>

<details>
<summary>✅ Bom: Reviews em coleção separada, pois existem fora do Product</summary>

```js
const product = {
  _id: new ObjectId(),
  tenantId: "tenant-abc",
  name: "Tênis Running X",
  price: 299.9,
  averageRating: 4.7,
  reviewCount: 1842,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const review = {
  _id: new ObjectId(),
  productId: product._id,
  customerId: "customer-42",
  rating: 5,
  comment: "Ótimo produto, chegou rápido.",
  publishedAt: new Date(),
};
```

`Review` tem ciclo de vida próprio: pode ser editada, moderada, excluída. O array seria ilimitado. O `Product` mantém apenas `averageRating` e `reviewCount` como dados agregados (desnormalização controlada), atualizados quando uma review é criada ou removida.

</details>

---

## Relacionamentos N:N

Muitos para muitos em document store tem dois caminhos:

**Array de IDs em um dos lados**: quando a associação não tem atributos próprios e o acesso é assimétrico (um lado acessa o outro, mas não o contrário). `Tag` nos dois lados apenas se o acesso for simétrico.

**Coleção intermediária**: quando a associação tem atributos próprios (data, status, nota) ou o acesso é frequente nos dois sentidos. A coleção intermediária tem campos sufixados com `Id` para cada lado mais os atributos do relacionamento.

<details>
<summary>❌ Ruim: N:N com arrays paralelos indexados por posição</summary>

```json
{
  "_id": "student-01",
  "name": "Carlos Mendes",
  "courseIds": ["course-10", "course-22", "course-33"],
  "enrolledDates": ["2026-01-10", "2026-01-15", "2026-02-01"]
}
```

Arrays paralelos por índice: se um elemento for removido de `courseIds` sem remover o correspondente em `enrolledDates`, os dados ficam inconsistentes. Adicionar nota final, status ou modalidade exige mais um array.

</details>

<details>
<summary>✅ Bom: Enrollment como documento próprio com atributos do relacionamento</summary>

```js
const enrollment = {
  _id: new ObjectId(),
  studentId: "student-01",
  courseId: "course-10",
  enrolledAt: new Date("2026-01-10"),
  status: "active",
  finalGrade: null,
};
```

`Enrollment` carrega a associação com seus atributos. Consultas como "cursos do aluno X" são queries sobre `enrollments` com filtro `{ studentId: "student-01" }`. Adicionar campos no relacionamento não muda o schema de `Student` nem de `Course`.

</details>

<details>
<summary>✅ Bom: N:N pura com array de IDs (sem atributos)</summary>

```js
const article = {
  _id: new ObjectId(),
  title: "Modelagem em NoSQL",
  tagIds: ["tag-nosql", "tag-mongodb", "tag-ddd"],
  createdAt: new Date(),
};
```

A relação entre `Article` e `Tag` não tem atributos próprios. Array de IDs basta. `Tag` não precisa listar `articleIds`; a query inversa vai por índice em `tagIds`.

</details>

---

## Referência por `_id` (cross-aggregate)

Cruzando a fronteira de agregado, a referência vai por `_id`. O documento `order` armazena `customerId`, nunca o `Customer` completo. Quem precisa do `Customer` resolve o ID no momento certo com um `$lookup` ou query separada.

**Desnormalização controlada** é a exceção, não a regra. Quando um subconjunto de campos do agregado externo é estável por design de negócio (nome do cliente no momento do pedido, preço do produto no momento da compra), copiar esses campos para um `snapshot` evita o join sem criar problema de sincronização. A regra de quando sincronizar o snapshot precisa estar documentada: se o email do cliente for alterado, o snapshot em pedidos antigos não é atualizado (por design).

<details>
<summary>❌ Ruim: Customer completo embutido, problema de sincronização</summary>

```js
const order = {
  _id: new ObjectId(),
  customer: {
    _id: "customer-42",
    name: "Ana Souza",
    email: "ana@example.com",
    phone: "11999990000",
    preferences: { newsletterOptIn: true },
  },
  items: [],
};
```

Qualquer alteração no `Customer` precisa ser propagada para todos os pedidos desse cliente. Com volume alto, a propagação é lenta e sujeita a falha parcial. O email errado em pedidos antigos gera confusão no suporte.

</details>

<details>
<summary>✅ Bom: referência por ID + snapshot mínimo com política de sincronização clara</summary>

```js
const order = {
  _id: new ObjectId(),
  customerId: "customer-42",
  customerSnapshot: {
    name: "Ana Souza",
    email: "ana@example.com",
  },
  items: [],
  createdAt: new Date(),
};
```

`customerSnapshot.name` e `customerSnapshot.email` são imutáveis por política: representam quem era o cliente no momento do pedido. Se o cliente mudar o email, os pedidos antigos mantêm o email original. Essa política precisa estar registrada na documentação do domínio.

</details>

---

## Multitenancy

Em sistema multitenant, `tenantId` mora na raiz de cada documento de **aggregate root** (raiz do agregado). Subdocumentos embutidos não precisam repetir `tenantId`; eles pertencem ao documento pai.

Em clusters com sharding, `tenantId` entra na **shard key** junto com `_id`, para garantir que todos os documentos de um tenant fiquem no mesmo shard. O índice composto `(tenantId, _id)` é obrigatório para queries eficientes.

- **Na aggregate root**: sim. `order.tenantId`, `customer.tenantId`.
- **Em subdocumento embutido**: não. `OrderItem` herda o tenant pelo pai.
- **Em value object / snapshot**: não. `customerSnapshot` é dado, não entidade.

<details>
<summary>❌ Ruim: tenantId duplicado em subdocumentos embutidos</summary>

```json
{
  "_id": "order-01",
  "tenantId": "tenant-abc",
  "items": [
    {
      "_id": "item-01",
      "tenantId": "tenant-abc",
      "productId": "prod-1",
      "quantity": 2
    }
  ]
}
```

`items[].tenantId` é ruído. Todo item já pertence ao tenant do documento pai. Duplicar cria superfície para inconsistência (e se um item tiver tenantId diferente do pai?).

</details>

<details>
<summary>✅ Bom: tenantId só na raiz, índice composto para queries eficientes</summary>

```js
const order = {
  _id: new ObjectId(),
  tenantId: "tenant-abc",
  customerId: "customer-42",
  items: [
    { _id: new ObjectId(), productId: "prod-1", quantity: 2, unitPrice: 49.9 },
  ],
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
};

await ordersCollection.createIndex(
  { tenantId: 1, _id: 1 },
  { name: "idx_orders_tenant_id" },
);

async function findOrderById(tenantId, orderId) {
  const filter = { tenantId, _id: new ObjectId(orderId) };
  const order = await ordersCollection.findOne(filter);
  return order;
}
```

O `tenantId` no filtro de toda query garante que um tenant nunca acessa dados de outro. O índice composto torna a query eficiente sem varredura completa.

</details>

**DynamoDB**: `tenantId` compõe a partition key (`PK = TENANT#tenantId`) ou é atributo da chave composta. Em single-table design, `PK = TENANT#tenantId#ENTITY#entityId` isola os dados por tenant e por tipo de entidade.

**Cassandra**: `tenantId` entra na partition key da tabela. Sem ele na partition key, queries por tenant resultam em `ALLOW FILTERING`, que varre o cluster inteiro.

**Redis**: prefixo de namespace inclui `tenantId` na chave: `tenant:{tenantId}:order:{orderId}`.

---

## Anti-patterns

Os padrões abaixo aparecem com frequência em projetos que começam com SQL e migram para MongoDB sem revisar o modelo. Cada um é um sinal de que a modelagem merece revisão antes que o débito cresça.

**Array ilimitado embutido**. Array de eventos, histórico de status ou log embutido no documento principal. O documento cresce sem parar. Sintoma: document size aumenta com o ciclo de vida do objeto, queries ficam lentas mesmo com índice. Tratamento: mover o array crescente para coleção separada; manter apenas o estado atual no documento principal.

**Embed de aggregate externo completo**. `customer: { name, email, phone, preferences }` dentro de `order`. Sintoma: ao mudar o email do cliente, é preciso atualizar todos os pedidos. Tratamento: referência por ID; snapshot apenas para dados imutáveis por política.

**Referência sem sufixo Id**. Campo `customer` podendo ser tanto ObjectId quanto subdocumento, dependendo de onde o documento veio. Sintoma: `$lookup` falha porque o campo não é do tipo esperado. Tratamento: campos de referência sempre com sufixo `Id` em camelCase.

**Coleção sem schema validator**. Documentos inseridos sem validação de tipo, enum ou campos obrigatórios. Sintoma: campo `status` com valores como `"PAID"`, `"paid"`, `"Paid"` convivendo na mesma coleção. Tratamento: `$jsonSchema` validator na coleção; ODM com schema explícito no código.

**tenantId ausente em aggregate root**. Documento sem `tenantId` em sistema multitenant. Sintoma: query retorna dados de todos os tenants se o filtro for esquecido. Tratamento: `tenantId` obrigatório no schema validator; índice composto `(tenantId, _id)`.

**N+1 por referências não resolvidas em lote**. Carregar uma lista de `orders` e depois buscar cada `customerId` em loop. Sintoma: 100 pedidos geram 101 queries. Tratamento: `$lookup` no pipeline de agregação, ou buscar todos os IDs referenciados em uma única query com `$in`.

**Documento gigante com projeção como solução**. Documento com 50 campos justificado por "mas usamos projeção". Projeção reduz tráfego de rede mas não reduz I/O no disco: o MongoDB carrega o documento inteiro antes de aplicar a projeção. Sintoma: queries lentas mesmo com índice cobrindo. Tratamento: separar conceitos em coleções distintas.

**Single-table design aplicado ao MongoDB**. Padrão DynamoDB onde entidades distintas coexistem na mesma coleção com discriminador de tipo. Funciona em DynamoDB porque o acesso é por partition key fixo; no MongoDB, compromete a legibilidade e dificulta a criação de índices específicos por tipo. Tratamento: cada aggregate root tem sua própria coleção.

---

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, eventual consistency
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): domain events, outbox, naming
- [`../../../shared/platform/database.md`](../../../shared/platform/database.md): SQL vs NoSQL, tuning
- [`../sgbd/mongodb.md`](../../sgbd/mongodb.md): idiom MongoDB: conexão, CRUD, aggregation, indexing

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
