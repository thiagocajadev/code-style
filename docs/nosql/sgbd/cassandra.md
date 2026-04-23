# Cassandra

> Escopo: Apache Cassandra 5.x. Referência: [cassandra.apache.org/doc](https://cassandra.apache.org/doc/latest/).
>
> Driver: `cassandra-driver` (DataStax Node.js Driver). Sempre usar `prepare: true`.

Cassandra é otimizado para escrita de alto volume com disponibilidade e tolerância a falhas. Adequado para séries temporais, telemetria e logs em escala de petabytes.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Keyspace** | Namespace que agrupa tabelas; define estratégia de replicação |
| **Partition key** (chave de partição) | Parte do PRIMARY KEY que determina o nó de armazenamento; design crítico |
| **Clustering key** (chave de agrupamento) | Parte do PRIMARY KEY que define a ordem dos dados dentro da partição |
| **CQL** (Cassandra Query Language) | Linguagem de query similar ao SQL; sem JOINs, sem subqueries |
| **Prepared statement** (instrução preparada) | Query pré-compilada e armazenada no driver; obrigatória em produção |
| **Consistency level** (nível de consistência) | Define quantas réplicas devem responder para confirmar a operação |
| **Tombstone** | Marcador de deleção; não remove o dado imediatamente; tem custo de leitura |
| **Compaction** | Processo de mesclagem de arquivos que remove tombstones |
| **Materialized view** (visão materializada) | Tabela derivada que mantém sincronizada automaticamente com a tabela base |

---

## Consistency Levels

| Nível | Leitura / Escrita | Uso |
| --- | --- | --- |
| `LOCAL_ONE` | 1 réplica local | Leitura de baixa latência; consistência eventual |
| `LOCAL_QUORUM` | Maioria das réplicas locais | Padrão para produção; equilíbrio entre latência e consistência |
| `QUORUM` | Maioria de todas as réplicas | Consistência forte entre datacenters |
| `ALL` | Todas as réplicas | Consistência máxima; disponibilidade mínima |

**Regra**: escrever em `LOCAL_QUORUM` e ler em `LOCAL_QUORUM` garante que o dado escrito é visto na leitura seguinte.

---

## Setup

```js
import cassandra from 'cassandra-driver';

const client = new cassandra.Client({
  contactPoints: process.env.CASSANDRA_HOSTS.split(','),
  localDataCenter: process.env.CASSANDRA_DC,
  keyspace: process.env.CASSANDRA_KEYSPACE,
  credentials: {
    username: process.env.CASSANDRA_USER,
    password: process.env.CASSANDRA_PASSWORD,
  },
});

await client.connect();
```

---

## Schema (CQL)

```sql
CREATE KEYSPACE football
  WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
  };

-- tabela para séries temporais: match_events
-- partition key: team_id + season  → distribui por time e temporada
-- clustering key: event_time DESC  → leituras retornam mais recente primeiro
CREATE TABLE football.match_events (
  team_id    UUID,
  season     TEXT,
  event_time TIMESTAMP,
  match_id   UUID,
  player_id  UUID,
  event_type TEXT,
  goals      INT,
  PRIMARY KEY ((team_id, season), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);
```

---

## Insert (Prepared Statement)

<details>
<summary>❌ Bad — query sem prepare; string interpolada; sem consistency level</summary>
<br>

```js
// query reconstruída e re-parseada em cada chamada
async function insertMatchEvent(event) {
  const query = `
    INSERT INTO match_events (team_id, season, event_time, player_id, goals)
    VALUES ('${event.teamId}', '${event.season}', toTimestamp(now()), '${event.playerId}', ${event.goals})
  `;

  await client.execute(query);
}
```

</details>

<br>

<details>
<summary>✅ Good — prepared statement; parâmetros posicionais; consistency level explícito</summary>
<br>

```js
const INSERT_MATCH_EVENT = `
  INSERT INTO match_events (team_id, season, event_time, match_id, player_id, event_type, goals)
  VALUES (?, ?, toTimestamp(now()), ?, ?, ?, ?)
`;

class MatchEventRepository {
  async create(event) {
    const params = [
      event.teamId,
      event.season,
      event.matchId,
      event.playerId,
      event.eventType,
      event.goals,
    ];

    await client.execute(INSERT_MATCH_EVENT, params, {
      prepare: true,
      consistency: cassandra.types.consistencies.localQuorum,
    });
  }
}
```

</details>

---

## Select

<details>
<summary>❌ Bad — query sem partition key: full cluster scan</summary>
<br>

```js
// sem WHERE na partition key — varre todos os nós do cluster
const query = 'SELECT * FROM match_events WHERE event_type = ? ALLOW FILTERING';
await client.execute(query, ['goal'], { prepare: true });
```

</details>

<br>

<details>
<summary>✅ Good — query com partition key; LIMIT obrigatório; projeção de campos</summary>
<br>

```js
const FETCH_TEAM_EVENTS = `
  SELECT match_id, player_id, event_type, goals, event_time
  FROM match_events
  WHERE team_id = ?
    AND season = ?
    AND event_time >= ?
  ORDER BY event_time DESC
  LIMIT ?
`;

class MatchEventRepository {
  async findByTeamAndSeason(teamId, season, fromDate, limit = 100) {
    const params = [teamId, season, fromDate, limit];

    const result = await client.execute(FETCH_TEAM_EVENTS, params, {
      prepare: true,
      consistency: cassandra.types.consistencies.localQuorum,
    });

    const events = result.rows;
    return events;
  }
}
```

</details>

---

## Update

```js
const UPDATE_PLAYER_GOALS = `
  UPDATE match_events
  SET goals = ?
  WHERE team_id = ?
    AND season = ?
    AND event_time = ?
  IF EXISTS
`;

class MatchEventRepository {
  async updateGoals(teamId, season, eventTime, goals) {
    const params = [goals, teamId, season, eventTime];

    const result = await client.execute(UPDATE_PLAYER_GOALS, params, {
      prepare: true,
      consistency: cassandra.types.consistencies.localQuorum,
    });

    const wasApplied = result.rows[0]['[applied]'];
    return wasApplied;
  }
}
```

---

## Delete e Tombstones

Delete em Cassandra gera tombstones. Tombstones se acumulam até o GC grace period. Em alto volume de deleção, o custo de leitura aumenta.

**Alternativas ao hard delete**:
- TTL na inserção — Cassandra remove automaticamente após o intervalo
- Soft delete com campo `is_deleted` — query exclui o registro por filtro

```js
// TTL na inserção — sessão expira em 24h
const INSERT_SESSION = `
  INSERT INTO sessions (user_id, token, created_at)
  VALUES (?, ?, toTimestamp(now()))
  USING TTL 86400
`;

class SessionRepository {
  async create(userId, token) {
    await client.execute(INSERT_SESSION, [userId, token], {
      prepare: true,
    });
  }
}
```

---

## Batch

Batch em Cassandra garante atomicidade lógica, não atômica como em SQL. Usar apenas para atualizar múltiplas tabelas que devem ser consistentes entre si.

```js
const batch = [
  {
    query: 'INSERT INTO match_events (team_id, season, event_time, event_type) VALUES (?, ?, ?, ?)',
    params: [teamId, season, eventTime, 'goal'],
  },
  {
    query: 'UPDATE team_stats SET total_goals = total_goals + 1 WHERE team_id = ? AND season = ?',
    params: [teamId, season],
  },
];

await client.batch(batch, {
  prepare: true,
  consistency: cassandra.types.consistencies.localQuorum,
});
```

---

## Anti-Padrões

| Anti-padrão | Consequência | Solução |
| --- | --- | --- |
| Query sem partition key (`ALLOW FILTERING`) | Full cluster scan; degrada com o volume | Redesenhar schema com partition key correta |
| Query sem `LIMIT` | Retorna partição inteira; OOM em partições grandes | Sempre incluir `LIMIT` e paginar |
| Sem `prepare: true` | Re-parse em cada chamada; overhead de CPU e rede | Sempre usar `prepare: true` |
| Hard delete intensivo | Acúmulo de tombstones; leituras lentas | Usar TTL na inserção para dados com expiração |
| Partition key de baixa cardinalidade | Hot spot em poucas partições | Incluir campo de alta cardinalidade (time bucket, UUID) |
| `IN` na partition key | Múltiplas queries paralelas ao cluster | Fazer queries individuais e reunir no cliente |
