# Visual Density — NoSQL

> Escopo: NoSQL. Aplica as regras de densidade visual ao código de drivers JS (MongoDB, Redis, DynamoDB).

As regras gerais de densidade visual estão em [shared/standards/visual-density.md](../../../shared/standards/visual-density.md). Esta seção aplica essas regras ao contexto específico de drivers NoSQL em JavaScript.

## Regras

- Um grupo semântico por bloco: conexão, query, resultado
- Blank line entre grupos; zero blank lines dentro de um grupo
- Pipeline de agregação: um estágio por objeto no array, agrupado por propósito
- Options de query (projection, sort, limit) coladas ao filtro — são parte do mesmo grupo semântico
- `await` sempre em linha própria com `const` nomeado

---

<details>
<summary>❌ Bad — blocos compactados sem separação, pipeline inline, nomes genéricos</summary>
<br>

```js
// query, options e processamento misturados sem separação
async function getTeam(id) {
  const res = await db.collection('teams').findOne({_id: id}, {projection: {name:1,city:1,_id:0}});
  if (!res) return null;
  return {id: res._id, name: res.name, city: res.city};
}

// pipeline sem separação entre estágios por propósito
const data = await db.collection('matches').aggregate([{$match:{season:'2026'}},{$group:{_id:'$teamId',total:{$sum:1}}},{$sort:{total:-1}},{$limit:10}]).toArray();
```

</details>

<br>

<details>
<summary>✅ Good — grupos semânticos separados, pipeline legível, nomes de domínio</summary>
<br>

```js
async function findTeamById(teamId) {
  const filter = { _id: teamId };
  const projection = { name: 1, city: 1, foundedYear: 1, _id: 0 };

  const team = await teamsCollection.findOne(filter, { projection });

  return team;
}

async function fetchTopScorers(season) {
  const pipeline = [
    // filtro: restringir ao season antes de agregar
    { $match: { season } },

    // agrupamento: total de gols por jogador
    { $group: { _id: '$playerId', totalGoals: { $sum: '$goals' } } },

    // ordenação e limite: top 10
    { $sort: { totalGoals: -1 } },
    { $limit: 10 },
  ];

  const topScorers = await matchesCollection.aggregate(pipeline).toArray();

  return topScorers;
}
```

</details>

---

## Pipeline de Agregação

Agrupe estágios por propósito com um comentário de linha por grupo (quando o propósito não é óbvio pelo operador).

```
filtro → transformação → agrupamento → ordenação → limite → projeção final
```

Cada estágio é um objeto literal separado no array. Nunca inline todos em uma linha.

---

<details>
<summary>❌ Bad — pipeline colapsado em uma linha, sem separação por propósito</summary>
<br>

```js
const results = await col.aggregate([{$match:{status:'active'}},{$lookup:{from:'players',localField:'_id',foreignField:'teamId',as:'players'}},{$unwind:'$players'},{$group:{_id:'$_id',playerCount:{$sum:1}}},{$sort:{playerCount:-1}}]).toArray();
```

</details>

<br>

<details>
<summary>✅ Good — pipeline com estágios separados e comentários de propósito</summary>
<br>

```js
async function fetchActiveTeamsWithPlayerCount() {
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

    { $unwind: '$players' },

    {
      $group: {
        _id: '$_id',
        teamName: { $first: '$name' },
        playerCount: { $sum: 1 },
      },
    },

    { $sort: { playerCount: -1 } },
  ];

  const teamsWithCount = await teamsCollection.aggregate(pipeline).toArray();

  return teamsWithCount;
}
```

</details>
