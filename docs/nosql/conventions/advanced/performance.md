# Performance — NoSQL

> Escopo: NoSQL. Padrões de performance para bancos não-relacionais: índices, projeção, N+1 e TTL.

O gargalo mais comum não é o banco: é query sem índice, documento inteiro trafegado quando só dois campos são necessários, ou N queries onde uma bastaria.

Padrões de performance **SQL** (Structured Query Language, Linguagem de Consulta Estruturada): [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Covered query** (query coberta) | Query respondida inteiramente pelo índice, sem tocar os documentos |
| **Index cardinality** (cardinalidade do índice) | Número de valores distintos no campo indexado; baixa cardinalidade reduz a utilidade do índice |
| **Write amplification** (amplificação de escrita) | Custo extra de escrita causado pela atualização de múltiplos índices em cada insert/update |
| **Compound index** (índice composto) | Índice sobre dois ou mais campos; a ordem dos campos determina quais queries ele serve |
| **TTL index** (índice de expiração automática) | Índice MongoDB que remove documentos automaticamente após um intervalo |

---

## Projeção

Sempre limitar os campos retornados ao mínimo necessário para a operação.

<details>
<summary>❌ Bad — documento inteiro trafegado para usar dois campos</summary>
<br>

```js
// carrega todos os campos do documento
async function fetchTeamSummary(teamId) {
  const team = await teamsCollection.findOne({ _id: teamId });
  const name = team.name;
  const city = team.city;

  return { name, city };
}
```

</details>

<br>

<details>
<summary>✅ Good — projeção limita o tráfego ao mínimo</summary>
<br>

```js
async function fetchTeamSummary(teamId) {
  const filter = { _id: teamId };
  const projection = { name: 1, city: 1, _id: 0 };

  const team = await teamsCollection.findOne(filter, { projection });

  return team;
}
```

</details>

---

## Índices

### Quando indexar

- Campos usados em `filter` / `$match` com alta seletividade
- Campos usados em `sort` frequente
- Campos de lookup em `$lookup` (foreign field)
- Campos de expiração com **TTL** (Time To Live, Tempo de Vida)

### Quando não indexar

- Campos booleanos (`isActive`) — baixa cardinalidade; o banco prefere collection scan
- Campos raramente filtrados
- Coleções pequenas (< 1.000 documentos) — overhead de índice supera o ganho

### Criando índices (MongoDB)

```js
// índice simples — acelera buscas por cidade
await teamsCollection.createIndex({ city: 1 });

// índice composto — serve queries que filtram por isActive e ordenam por foundedYear
await teamsCollection.createIndex({ isActive: 1, foundedYear: -1 });

// índice único
await playersCollection.createIndex({ licenseNumber: 1 }, { unique: true });

// TTL index — remove sessões expiradas automaticamente
await sessionsCollection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
```

<details>
<summary>❌ Bad — campo de função no filtro desativa o índice; campo de baixa cardinalidade indexado</summary>
<br>

```js
// LOWER() equivalente em JS — índice em name não é usado
const teams = await teamsCollection.find({
  name: { $regex: /^são paulo/i }, // sem índice de texto
}).toArray();

// índice em boolean — alta write amplification, baixo ganho de leitura
await teamsCollection.createIndex({ isActive: 1 });
```

</details>

<br>

<details>
<summary>✅ Good — índice de texto para buscas; índice composto com campo seletivo primeiro</summary>
<br>

```js
// índice de texto serve $text queries com seletividade alta
await teamsCollection.createIndex({ name: 'text', city: 'text' });

const filter = { $text: { $search: 'São Paulo' } };
const projection = { name: 1, city: 1, score: { $meta: 'textScore' } };
const sort = { score: { $meta: 'textScore' } };

const teams = await teamsCollection
  .find(filter, { projection })
  .sort(sort)
  .toArray();

// índice composto: campo seletivo (city) primeiro, boolean por último
await teamsCollection.createIndex({ city: 1, isActive: 1 });
```

</details>

---

## N+1

N+1 não aparece no código; aparece no log. O sinal é um padrão de queries idênticas com IDs diferentes em sequência rápida.

```
// sinal de N+1 no log
{"collection":"players","filter":{"teamId":"42"}}
{"collection":"players","filter":{"teamId":"43"}}
{"collection":"players","filter":{"teamId":"44"}}
... (100 vezes)
```

<details>
<summary>❌ Bad — uma query por item para buscar documento relacionado</summary>
<br>

```js
// N queries para N times — cada iteração dispara uma roundtrip ao banco
async function fetchTeamsWithPlayers(teamIds) {
  const teams = await teamsCollection.find({ _id: { $in: teamIds } }).toArray();

  const enrichedTeams = await Promise.all(
    teams.map(async (team) => {
      const players = await playersCollection
        .find({ teamId: team._id })
        .toArray();

      return { ...team, players };
    }),
  );

  return enrichedTeams;
}
```

</details>

<br>

<details>
<summary>✅ Good — $lookup resolve em uma única passagem no banco</summary>
<br>

```js
async function fetchTeamsWithPlayers(teamIds) {
  const pipeline = [
    { $match: { _id: { $in: teamIds } } },
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
        'players.name': 1,
        'players.position': 1,
      },
    },
  ];

  const teamsWithPlayers = await teamsCollection.aggregate(pipeline).toArray();
  return teamsWithPlayers;
}
```

</details>

---

## TTL (Time To Live)

TTL é responsabilidade do código na inserção, não de um job de limpeza externo.

<details>
<summary>❌ Bad — sem TTL; acúmulo de documentos expirados; limpeza manual necessária</summary>
<br>

```js
// session sem expiração — acumula indefinidamente
async function createSession(userId, token) {
  await sessionsCollection.insertOne({
    userId,
    token,
    createdAt: new Date(),
    // sem expiresAt
  });
}
```

</details>

<br>

<details>
<summary>✅ Good — TTL index + expiresAt definido no insert</summary>
<br>

```js
// na inicialização: TTL index aponta para expiresAt
// expireAfterSeconds: 0 — MongoDB remove quando expiresAt < now
await sessionsCollection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

// no insert: expiresAt calculado pelo código
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

class SessionRepository {
  async create(userId, token) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = {
      userId,
      token,
      createdAt: new Date(),
      expiresAt,
    };

    const result = await this.collection.insertOne(session);

    return result.insertedId;
  }
}
```

</details>

---

## Checklist de Investigação

Ao receber relatório de "banco **NoSQL** (Not Only SQL, Não Apenas SQL) lento":

1. Verificar se o campo filtrado tem índice (`explain()` no MongoDB)
2. Verificar projeção — o documento inteiro está sendo trafegado?
3. Verificar N+1 no log — queries repetidas com IDs diferentes em sequência?
4. Verificar tamanho dos documentos — documentos com arrays grandes embutidos crescem sem controle
5. Verificar TTL index — sessões e caches expirados acumulam sem limpeza?
6. Verificar partition key — hot spot em Cassandra ou DynamoDB?
