# Visual Density — NoSQL

> Escopo: NoSQL. Aplica as regras de densidade visual a queries, pipelines e drivers de bancos não-relacionais.

As regras gerais estão em [shared/standards/visual-density.md](../../../shared/standards/visual-density.md). Esta seção aplica os mesmos princípios ao contexto **NoSQL** (Not Only SQL, Não Apenas SQL): filtros, projeções, pipelines de agregação e código host (JS) que chama o driver.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **blank line** (linha em branco) | Separador entre grupos coesos; uma só, nunca duas seguidas |
| **tight pair** (par grudado) | Duas linhas com relação direta sem linha em branco entre elas |
| **explaining return** (retorno explicativo) | `const X = await ...; return X;` em uma única linha + `return X` sem linha em branco entre eles |
| **multi-line block** (bloco multi-linha) | Filtro, projeção, update ou pipeline expandido em várias linhas; pede linha em branco depois |
| **pipeline stage** (estágio de pipeline) | Objeto `$match`, `$lookup`, `$group`, `$project`; cada um é uma fase visível |
| **stage group** (grupo de estágios) | Estágios consecutivos com mesmo propósito (filtro inicial, agrupamento, ordenação) ficam juntos; troca de propósito pede linha em branco |
| **query options** (opções de query) | `projection`, `sort`, `limit`; coladas ao filtro como parte do mesmo grupo |
| **driver call** (chamada ao driver) | Invocação do cliente (`collection.findOne(...)`, `aggregate(...).toArray()`); cada operação com `await` em linha própria |
| **orphan line** (linha órfã) | Declaração isolada entre linhas em branco que pertencia ao grupo anterior; cria pausa sem motivo |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `:` ou `=` verticalmente; antipadrão |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| **Multi-linha pede respiro depois** | Filtro, projeção, update ou pipeline expandido isola o bloco grande do próximo passo |
| **Fases do pipeline visíveis** | Estágios com propósitos distintos (`$match` → `$lookup` → `$group` → `$sort`) separados por linha em branco |
| **Grupo de estágios coesos fica junto** | `$sort + $limit`, `$unwind + $project` consecutivos não precisam de respiro entre si |
| **Retorno explicativo grudado** | `const result = await ...; return result;` é par sem linha em branco |
| **Retorno separado por linha em branco** | Quando a linha acima é multi-linha (chain `.find().sort().toArray()`) ou efeito colateral |
| **Query options coladas ao filtro** | `filter` e `projection` declarados em sequência formam grupo coeso |
| **Operações consecutivas** | Duas queries independentes na mesma função podem ter linha em branco entre si |
| **4+ quebra em 2+2** | Quatro ou mais declarações homogêneas dividem em pares |
| **Sem alinhamento de coluna** | Espaço único ao redor de `:` em objetos |
| **Nunca duplo respiro** | Exatamente uma linha em branco entre grupos |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Filtro + projeção formam um grupo; a chamada ao driver é o próximo grupo; o retorno é a montagem final. Cada fase ganha respiro próprio, sem fragmentar pares semânticos (a `const` que nomeia o resultado fica grudada no `return`).

## Multi-linha pede respiro depois

Filtros, projeções, updates e pipelines em várias linhas ocupam peso visual próprio. Cole linha em branco **depois** do bloco para isolá-lo do próximo passo.

<details>
<summary>❌ Ruim — projeção multi-linha colada à chamada ao driver</summary>

```js
async function findTeamById(teamId) {
  const filter = { _id: teamId };
  const projection = {
    name: 1,
    city: 1,
    foundedYear: 1,
    _id: 0,
  };
  const team = await teamsCollection.findOne(filter, { projection });
  return team;
}
```

A projeção multi-linha termina e o `await` vem colado. O olho não distingue onde a definição da query acaba e a execução começa.

</details>

<details>
<summary>✅ Bom — linha em branco depois do bloco multi-linha; retorno explicativo grudado</summary>

```js
async function findTeamById(teamId) {
  const filter = { _id: teamId };
  const projection = {
    name: 1,
    city: 1,
    foundedYear: 1,
    _id: 0,
  };

  const team = await teamsCollection.findOne(filter, { projection });
  return team;
}
```

Duas fases visíveis: "definir query" (filtro + projeção multi-linha) e "executar + retornar" (retorno explicativo grudado).

</details>

## Filtro + projeção: par coeso

Quando o filtro e a projeção cabem em uma linha cada um, eles formam um grupo coeso — sem respiro entre eles. A linha em branco vem **depois** do par, antes da chamada ao driver.

<details>
<summary>✅ Bom — filtro e projeção como par; chamada isolada</summary>

```js
async function fetchTeamSummary(teamId) {
  const filter = { _id: teamId };
  const projection = { name: 1, city: 1, _id: 0 };

  const team = await teamsCollection.findOne(filter, { projection });
  return team;
}
```

</details>

## Fases do pipeline: cada propósito ganha respiro

Em um pipeline de agregação, estágios com **propósitos distintos** são fases. Linha em branco entre fases. Estágios com **mesmo propósito** (ordenar + limitar, desempacotar + projetar) ficam juntos.

Sequência típica:

```
filtro → join → desempacotar → agrupar → ordenar → limitar → projeção final
```

<details>
<summary>❌ Ruim — estágios colados sem distinção de propósito</summary>

```js
const pipeline = [
  { $match: { season } },
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
    },
  },
  { $sort: { totalGoals: -1 } },
  { $limit: 10 },
];
```

Todas as fases coladas viram muralha. O olho não vê onde o filtro termina e onde o agrupamento começa.

</details>

<details>
<summary>✅ Bom — fases isoladas; sort + limit coesos como mesmo propósito</summary>

```js
async function fetchTopScorersBySeason(season) {
  const pipeline = [
    { $match: { season } },

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
      },
    },

    { $sort: { totalGoals: -1 } },
    { $limit: 10 },
  ];

  const topScorers = await matchEventsCollection.aggregate(pipeline).toArray();
  return topScorers;
}
```

Quatro fases visíveis: filtro, join, agrupamento, "ordenar e limitar" (par coeso de mesmo propósito).

</details>

## Retorno explicativo grudado

Quando a chamada ao driver cabe em uma linha e o `return` retorna exatamente a variável recém declarada, os dois formam par sem linha em branco — não importa quantos passos haja acima.

<details>
<summary>❌ Ruim — retorno fragmentado quando a linha acima é uma única linha que nomeia o valor</summary>

```js
async function findActivePlayers(teamId) {
  const filter = { teamId, isActive: true };
  const projection = { name: 1, position: 1, _id: 1 };

  const players = await playersCollection.find(filter, { projection }).toArray();

  return players;
}
```

A linha em branco isola o `return` como parágrafo de encerramento, mas só há uma linha acima — par semântico fragmentado.

</details>

<details>
<summary>✅ Bom — par grudado</summary>

```js
async function findActivePlayers(teamId) {
  const filter = { teamId, isActive: true };
  const projection = { name: 1, position: 1, _id: 1 };

  const players = await playersCollection.find(filter, { projection }).toArray();
  return players;
}
```

</details>

## Retorno separado por linha em branco

Vai linha em branco antes do `return` quando:

- linha acima é **chain multi-linha** (`.find().sort().limit().toArray()` quebrado);
- linha acima é **efeito colateral** (`await client.expire(...)`) sem nomear o valor;
- valor retornado foi criado **vários passos antes** sem par direto;
- `return` monta **objeto** com múltiplos fragmentos preparados acima.

<details>
<summary>✅ Bom — chain multi-linha exige respiro antes do return</summary>

```js
async function findPlayersByTeam(teamId) {
  const filter = { teamId, isActive: true };
  const projection = { name: 1, position: 1, squadNumber: 1, _id: 1 };

  const players = await playersCollection
    .find(filter, { projection })
    .sort({ squadNumber: 1 })
    .toArray();

  return players;
}
```

A chain ocupa quatro linhas físicas — peso visual próprio. O respiro antes do `return` marca a fronteira entre execução e entrega.

</details>

<details>
<summary>✅ Bom — fragmentos → montagem com linha em branco antes do return</summary>

```js
async function fetchTeamsPaged(page, pageSize) {
  const filter = { isActive: true };
  const projection = { name: 1, city: 1, _id: 1 };
  const skip = (page - 1) * pageSize;

  const [teams, total] = await Promise.all([
    teamsCollection.find(filter, { projection }).skip(skip).limit(pageSize).toArray(),
    teamsCollection.countDocuments(filter),
  ]);

  const hasNextPage = skip + teams.length < total;

  return { teams, total, hasNextPage };
}
```

O `return` costura `teams`, `total` e `hasNextPage` — fase de montagem isolada por linha em branco.

</details>

## Operações consecutivas: linha em branco entre queries

Duas queries independentes na mesma função são fases distintas. Linha em branco entre elas, ainda que cada uma caiba em poucas linhas.

<details>
<summary>✅ Bom — duas operações separadas como fases</summary>

```js
async function softDeleteTeamAndPlayers(teamId) {
  const teamFilter = { _id: teamId };
  const playerFilter = { teamId, isDeleted: { $ne: true } };
  const patch = { $set: { isDeleted: true, deletedAt: new Date() } };

  const teamResult = await teamsCollection.updateOne(teamFilter, patch);
  const playerResult = await playersCollection.updateMany(playerFilter, patch);

  return {
    teamModified: teamResult.modifiedCount,
    playersModified: playerResult.modifiedCount,
  };
}
```

Duas operações homogêneas formam par coeso; o objeto multi-linha do `return` pede linha em branco antes.

</details>

## Update parcial: filtro + patch como par

Filtro e objeto de update (`$set`, `$inc`, etc.) formam um grupo coeso quando o patch é multi-linha — a linha em branco vem **depois** do bloco, separando a definição da query da execução.

<details>
<summary>✅ Bom — filtro + patch coesos; chamada isolada; retorno explicativo grudado</summary>

```js
async function updateManager(teamId, managerId) {
  const filter = { _id: teamId };
  const patch = {
    $set: {
      managerId,
      updatedAt: new Date(),
    },
  };

  const result = await teamsCollection.updateOne(filter, patch);
  const modifiedCount = result.modifiedCount;
  return modifiedCount;
}
```

Trio final coeso: `result` é declarado, `modifiedCount` extrai dele (par semântico encadeado) e o `return` fecha (retorno explicativo grudado).

</details>

## Sem alinhamento de coluna

Não alinhe verticalmente `:` ou `=` em objetos literais com espaços extras. Um espaço único.

<details>
<summary>❌ Ruim — projeção com colunas alinhadas</summary>

```js
const projection = {
  name        : 1,
  city        : 1,
  foundedYear : 1,
  _id         : 0,
};
```

</details>

<details>
<summary>✅ Bom — espaço único após o `:`</summary>

```js
const projection = {
  name: 1,
  city: 1,
  foundedYear: 1,
  _id: 0,
};
```

</details>

---

## Por estilo idiomático de cada SGBD

Os mesmos princípios aplicados a cada driver:

- [MongoDB](../sgbd/mongodb.md)
- [Cassandra](../sgbd/cassandra.md)
- [DynamoDB](../sgbd/dynamodb.md)
- [Elasticsearch](../sgbd/elasticsearch.md)
- [Redis](../sgbd/redis.md)
