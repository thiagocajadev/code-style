# MongoDB

> Escopo: MongoDB 8.2. Referência: [mongodb.com/docs](https://www.mongodb.com/docs/manual/).
>
> Este documento cobre idiomas e recursos específicos do MongoDB. Convenções gerais de CRUD,
> aggregation e naming estão em [conventions/](../conventions/).

MongoDB é um banco de documentos baseado em BSON, com sharding nativo, pipeline de agregação expressivo e índices especializados (compostos, geoespaciais, texto). As seções abaixo cobrem o que é idiomático do MongoDB 8.2: operadores de agregação, transações multi-documento, Change Streams e padrões de modelagem que aproveitam embedding versus referenciamento.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Collection** (coleção) | Agrupamento de documentos BSON; equivale a uma tabela SQL |
| **Document** (documento) | Objeto JSON/BSON que representa um registro; sem schema fixo |
| **ObjectId** | Identificador de 12 bytes gerado automaticamente pelo MongoDB; inclui timestamp |
| **BSON** (Binary JSON) | Formato binário que estende JSON com tipos adicionais (Date, ObjectId, Decimal128) |
| **MongoClient** | Objeto de conexão com pool interno; deve ser criado uma vez e reutilizado |
| **Connection pool** (pool de conexões) | Conjunto de conexões mantidas abertas para reutilização; `maxPoolSize` controla o limite |
| **Aggregation pipeline** (pipeline de agregação) | Sequência de estágios que transforma documentos; substitui JOIN + GROUP BY do SQL |
| **Index** (índice) | Estrutura auxiliar que acelera buscas sem varrer toda a coleção |
| **TTL index** (índice de expiração automática) | Índice especial que remove documentos automaticamente após o campo `expiresAt` |
| **$lookup** | Estágio de pipeline que faz join com outra coleção |
| **explain()** | Método que mostra o plano de execução de uma query sem executá-la |

---

## Conexão e Pool

O `MongoClient` mantém um pool interno. Criar um cliente por requisição é o anti-padrão mais comum.

```js
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 60_000,
});

await client.connect();

const database = client.db('football');
const teamsCollection = database.collection('teams');
const playersCollection = database.collection('players');
```

<details>
<summary>❌ Bad — novo cliente por requisição: pool destruído e recriado a cada chamada</summary>
<br>

```js
// cria conexão, usa e fecha — sem reuso de pool
async function findTeam(teamId) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const team = await client.db('football').collection('teams').findOne({ _id: teamId });

  await client.close();

  return team;
}
```

</details>

<br>

<details>
<summary>✅ Good — cliente singleton; pool reutilizado em toda a aplicação</summary>
<br>

```js
// db.js — singleton exportado
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
});

await client.connect();

export const database = client.db('football');

// repository.js — importa o database singleton
import { database } from './database.js';

class TeamRepository {
  constructor() {
    this.collection = database.collection('teams');
  }

  async findById(teamId) {
    const filter = { _id: teamId };
    const projection = { name: 1, city: 1, foundedYear: 1, _id: 0 };

    const team = await this.collection.findOne(filter, { projection });

    return team;
  }
}
```

</details>

---

## Insert

### insertOne

```js
const result = await collection.insertOne(document);
// result.insertedId: ObjectId
// result.acknowledged: boolean
```

### insertMany

```js
const result = await collection.insertMany(documents);
// result.insertedIds: Map<number, ObjectId>
// result.insertedCount: number
```

### bulkWrite

```js
const result = await collection.bulkWrite([
  { insertOne: { document: { name: 'Corinthians', city: 'São Paulo' } } },
  { updateOne: { filter: { _id: id }, update: { $set: { isActive: true } } } },
  { deleteOne: { filter: { _id: oldId } } },
]);
// result.insertedCount, result.modifiedCount, result.deletedCount
```

---

## Find

### findOne

```js
const team = await collection.findOne(filter, { projection });
// retorna null se não encontrado
```

### find com cursor

```js
const cursor = collection.find(filter, { projection });
const teams = await cursor.toArray();

// ou iteração com for await
for await (const team of cursor) {
  // processa um documento por vez — eficiente em volumes grandes
}
```

### Paginação

```js
async function fetchTeamsPaged(page, pageSize) {
  const filter = { isActive: true };
  const projection = { name: 1, city: 1, _id: 1 };
  const skip = (page - 1) * pageSize;

  const teams = await teamsCollection
    .find(filter, { projection })
    .sort({ name: 1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  return teams;
}
```

---

## Update

### updateOne / updateMany

```js
const result = await collection.updateOne(filter, update, options);
// result.modifiedCount: number
// result.upsertedId: ObjectId | null
```

Operadores de update:

| Operador | O que faz |
| --- | --- |
| `$set` | Define os campos especificados |
| `$unset` | Remove campos do documento |
| `$inc` | Incrementa um campo numérico |
| `$push` | Adiciona elemento ao array |
| `$pull` | Remove elemento do array por condição |
| `$addToSet` | Adiciona ao array somente se não existir |
| `$setOnInsert` | Define campos apenas na inserção (com upsert) |

---

## Delete

### deleteOne / deleteMany

```js
const result = await collection.deleteOne(filter);
// result.deletedCount: number
// result.acknowledged: boolean
```

---

## Aggregation

Referência completa de pipeline: [conventions/advanced/aggregation.md](../conventions/advanced/aggregation.md).

Exemplo completo com múltiplos estágios:

```js
async function fetchSeasonReport(season) {
  const pipeline = [
    { $match: { season, goals: { $gt: 0 } } },

    {
      $lookup: {
        from: 'players',
        localField: 'playerId',
        foreignField: '_id',
        as: 'player',
      },
    },

    { $unwind: '$player' },

    {
      $group: {
        _id: '$player.teamId',
        totalGoals: { $sum: '$goals' },
        topScorer: { $first: '$player.name' },
        matchesPlayed: { $sum: 1 },
      },
    },

    {
      $lookup: {
        from: 'teams',
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },

    { $unwind: '$team' },

    {
      $project: {
        teamName: '$team.name',
        totalGoals: 1,
        topScorer: 1,
        matchesPlayed: 1,
        _id: 0,
      },
    },

    { $sort: { totalGoals: -1 } },
  ];

  const report = await matchEventsCollection.aggregate(pipeline).toArray();
  return report;
}
```

---

## Indexing

```js
// simples
await teamsCollection.createIndex({ city: 1 });

// composto — campo seletivo primeiro, depois de ordenação
await teamsCollection.createIndex({ isActive: 1, foundedYear: -1 });

// único
await playersCollection.createIndex(
  { licenseNumber: 1 },
  { unique: true },
);

// texto para busca full-text
await teamsCollection.createIndex({ name: 'text', city: 'text' });

// TTL — remove documentos quando expiresAt < now
await sessionsCollection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
```

---

## Diagnóstico

### explain()

```js
// plano de execução sem executar a query
const plan = await teamsCollection.find({ city: 'São Paulo' }).explain('executionStats');

// campos relevantes:
// plan.executionStats.executionStages.stage
//   → 'COLLSCAN' = sem índice (preocupante em coleções grandes)
//   → 'IXSCAN' = usa índice (esperado)
// plan.executionStats.totalDocsExamined vs totalDocsReturned
//   → razão alta indica filtro ineficiente ou índice ausente
```

### O que procurar no plano

| Stage | Significado | Ação |
| --- | --- | --- |
| `COLLSCAN` | Varredura completa da coleção | Criar índice no campo de filtro |
| `IXSCAN` | Usa índice | Bom; verificar se é covering |
| `FETCH` após IXSCAN | Lê documentos após índice | Considerar índice composto com todos os campos da query |
| Alto `totalDocsExamined` / `totalDocsReturned` | Muitos documentos examinados para poucos retornados | Melhorar seletividade do índice |

### Listar e verificar índices

```js
// listar todos os índices da coleção
const indexes = await teamsCollection.indexes();

// verificar se um índice específico existe
const hasIndex = indexes.some((index) => index.key.city === 1);
```
