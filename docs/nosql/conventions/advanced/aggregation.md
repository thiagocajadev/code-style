# Aggregation — NoSQL

> Escopo: NoSQL. Padrões de pipeline de agregação para MongoDB. Princípios aplicam-se a Elasticsearch aggregations e DynamoDB expressions.

**Aggregation pipeline** (pipeline de agregação) é a alternativa **NoSQL** (Not Only SQL, Não Apenas SQL) a `JOIN + GROUP BY` do **SQL** (Structured Query Language, Linguagem de Consulta Estruturada). Cada estágio transforma o conjunto de documentos e passa o resultado para o próximo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Stage** (estágio) | Operação do pipeline que transforma documentos (`$match`, `$group`, `$lookup`) |
| **$match** | Filtra documentos; equivale ao WHERE; usar no início para reduzir volume antes dos estágios seguintes |
| **$group** | Agrupa documentos por campo e aplica acumuladores (`$sum`, `$avg`, `$count`) |
| **$lookup** | Junta documentos de outra coleção; equivale ao LEFT JOIN |
| **$unwind** | Deconstrói um campo array em múltiplos documentos — um documento por elemento |
| **$project** | Seleciona e renomeia campos; equivale ao SELECT; eliminar campos desnecessários no final |
| **$sort** | Ordena documentos pelo campo especificado |
| **$limit** | Limita o número de documentos no resultado |
| **Accumulator** (acumulador) | Operador de `$group` que calcula valores agregados: `$sum`, `$avg`, `$min`, `$max`, `$push`, `$first` |

---

## Ordem dos Estágios

A ordem impacta performance diretamente.

```
$match → $lookup → $unwind → $group → $sort → $limit → $project
```

Regras:

- `$match` primeiro — reduz o volume antes de qualquer join ou agrupamento
- `$project` último — eliminar campos que não são necessários no resultado final
- `$limit` antes de `$sort` quando o resultado final é pequeno (top N)
- `$lookup` após `$match` — nunca fazer lookup sobre a coleção inteira

---

## $match

<details>
<summary>❌ Bad — $match após $lookup: join sobre toda a coleção antes de filtrar</summary>
<br>

```js
const pipeline = [
  {
    $lookup: {
      from: 'players',
      localField: '_id',
      foreignField: 'teamId',
      as: 'players',
    },
  },
  { $match: { 'players.isActive': true } }, // filtro após join — custo alto
];
```

</details>

<br>

<details>
<summary>✅ Good — $match primeiro; lookup apenas sobre o subconjunto filtrado</summary>
<br>

```js
async function fetchActiveTeamsWithPlayers() {
  const pipeline = [
    { $match: { isActive: true } },

    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: 'teamId',
        as: 'players',
      },
    },

    {
      $project: {
        name: 1,
        city: 1,
        playerCount: { $size: '$players' },
      },
    },
  ];

  const activeTeams = await teamsCollection.aggregate(pipeline).toArray();
  return activeTeams;
}
```

</details>

---

## $group

<details>
<summary>❌ Bad — agrupamento sem $match primeiro; acumulador sem nome de domínio</summary>
<br>

```js
// agrupa toda a coleção sem filtro prévio
const pipeline = [
  {
    $group: {
      _id: '$teamId',
      c: { $sum: 1 },         // nome genérico
      t: { $sum: '$goals' },  // nome genérico
    },
  },
];
```

</details>

<br>

<details>
<summary>✅ Good — $match antes do $group; nomes de domínio nos acumuladores</summary>
<br>

```js
async function computeTopScorersBySeason(season) {
  const pipeline = [
    { $match: { season, goals: { $gt: 0 } } },

    {
      $group: {
        _id: '$playerId',
        totalGoals: { $sum: '$goals' },
        matchesPlayed: { $sum: 1 },
        firstGoalDate: { $min: '$matchDate' },
      },
    },

    { $sort: { totalGoals: -1 } },
    { $limit: 20 },
  ];

  const topScorers = await matchEventsCollection.aggregate(pipeline).toArray();
  return topScorers;
}
```

</details>

---

## $lookup

<details>
<summary>❌ Bad — $lookup sem projeção final; trafega todos os campos dos documentos joined</summary>
<br>

```js
// retorna o documento inteiro de cada player junto ao team
const pipeline = [
  { $match: { _id: teamId } },
  {
    $lookup: {
      from: 'players',
      localField: '_id',
      foreignField: 'teamId',
      as: 'players',
    },
  },
];
```

</details>

<br>

<details>
<summary>✅ Good — $lookup com pipeline interno para projetar apenas os campos necessários</summary>
<br>

```js
async function fetchTeamRoster(teamId) {
  const pipeline = [
    { $match: { _id: teamId } },

    {
      $lookup: {
        from: 'players',
        let: { teamRef: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$teamId', '$$teamRef'] } } },
          { $project: { name: 1, position: 1, squadNumber: 1, _id: 0 } },
          { $sort: { squadNumber: 1 } },
        ],
        as: 'players',
      },
    },

    {
      $project: {
        name: 1,
        city: 1,
        players: 1,
      },
    },
  ];

  const roster = await teamsCollection.aggregate(pipeline).toArray();
  const teamRoster = roster[0] ?? null;

  return teamRoster;
}
```

</details>

---

## $unwind

`$unwind` gera um documento por elemento do array. Documentos sem o campo são descartados por padrão.

<details>
<summary>❌ Bad — $unwind sem preserveNullAndEmptyArrays; times sem jogadores são excluídos silenciosamente</summary>
<br>

```js
const pipeline = [
  {
    $lookup: {
      from: 'players',
      localField: '_id',
      foreignField: 'teamId',
      as: 'players',
    },
  },
  { $unwind: '$players' }, // descarta times sem jogadores
];
```

</details>

<br>

<details>
<summary>✅ Good — preserveNullAndEmptyArrays mantém times sem jogadores no resultado</summary>
<br>

```js
async function fetchTeamsWithOptionalPlayers() {
  const pipeline = [
    { $match: { isActive: true } },

    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: 'teamId',
        as: 'players',
      },
    },

    {
      $unwind: {
        path: '$players',
        preserveNullAndEmptyArrays: true, // why: times recém-criados ainda não têm jogadores
      },
    },

    {
      $project: {
        name: 1,
        city: 1,
        playerName: '$players.name',
        playerPosition: '$players.position',
      },
    },
  ];

  const teamsWithPlayers = await teamsCollection.aggregate(pipeline).toArray();
  return teamsWithPlayers;
}
```

</details>
