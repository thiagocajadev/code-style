# Naming — NoSQL

> Escopo: NoSQL. Convenções de nomenclatura para coleções, campos, chaves e índices.

Nomenclatura consistente reduz atrito entre consumidores de uma mesma coleção e evita surpresas ao trocar de SGBD. As regras abaixo cobrem quatro contextos: collection/table names, field names, key names e index names.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Collection** (coleção) | Agrupamento de documentos em MongoDB ou Elasticsearch (equivale a uma tabela SQL) |
| **Namespace** (espaço de nomes) | Prefixo que qualifica a chave Redis para evitar colisão entre serviços (`team:profile:42`) |
| **Partition key** (chave de partição) | Atributo que determina o nó de armazenamento em DynamoDB e Cassandra |
| **Sort key** (chave de ordenação) | Atributo secundário que define a ordem dentro de uma partição DynamoDB |
| **GSI** (Global Secondary Index, Índice Secundário Global) | Índice alternativo no DynamoDB com partition key diferente da tabela base |

---

## Coleções e Tabelas

| Regra | Padrão | Exemplo |
| --- | --- | --- |
| Nome em inglês | sempre | `teams`, `players`, `matches` |
| Plural | sempre | `teams`, não `team` |
| snake_case | MongoDB, Cassandra, Elasticsearch | `match_events` |
| PascalCase | DynamoDB (convenção AWS) | `MatchEvents` |
| Sem prefixo de tipo | nunca | `tbl_teams` proibido |
| Semântico de domínio | sempre | `match_events`, não `data` ou `records` |

## Campos (Fields / Attributes)

| Regra | Padrão | Exemplo |
| --- | --- | --- |
| camelCase | MongoDB (JSON nativo) | `foundedYear`, `homeStadium` |
| snake_case | Cassandra, Elasticsearch | `founded_year`, `home_stadium` |
| PascalCase | DynamoDB | `FoundedYear`, `HomeStadium` |
| Boolean com prefixo semântico | sempre | `isActive`, `hasLicense` |
| Sem abreviações | sempre | `managerId`, não `mgr_id` |
| Nome pelo domínio, não pelo tipo | sempre | `score`, não `intScore`; `createdAt`, não `dateField` |

## Keys (Redis)

Padrão: `namespace:entity:id` com separador `:`.

```
team:profile:42
team:standings:2026
match:live:1099
player:stats:7:2026
```

Regras:

- Separador `:` entre segmentos (nunca `-`, `/` ou `.`)
- Segmentos em lowercase e singular
- ID sempre no final
- Qualificar pelo domínio para evitar colisão entre serviços

## Keys (DynamoDB — single-table design)

Partition key e sort key com prefixo de entidade:

```
PK: TEAM#42          SK: PROFILE
PK: TEAM#42          SK: PLAYER#7
PK: MATCH#1099       SK: EVENT#001
```

Regras:

- Prefixo em uppercase com `#` como separador de tipo
- Permite múltiplos tipos de entidade na mesma tabela
- **GSI** inverte PK/SK para padrões de acesso alternativos

## Índices

| Regra | Exemplo |
| --- | --- |
| Prefixo `idx_` + coleção + campo | `idx_teams_city` |
| Índice único com prefixo `unq_` | `unq_players_license_number` |
| TTL index descreve o campo de expiração | `idx_sessions_expires_at` |
| DynamoDB GSI descreve o access pattern | `GSI_ByCity` |

---

<details>
<summary>❌ Bad — nomenclatura genérica, sem padrão, sem semântica de domínio</summary>
<br>

```js
// MongoDB: coleção no singular, campos abreviados, boolean sem prefixo, nome técnico em vez de domínio
db.collection('team').insertOne({
  nm: 'São Paulo FC',      // abreviação
  yr: 1930,               // abreviação
  active: true,           // boolean sem prefixo semântico
  mgr: 'Calleri',         // abreviação
  dateField: new Date(),  // nome pelo tipo, não pelo domínio
});

// Redis: key sem namespace, separador inconsistente, sem ID no final
await redis.set('team-data', JSON.stringify(team));
await redis.set('team.standings', JSON.stringify(standings));
await redis.set('s42', JSON.stringify(stats));  // opaco
```

</details>

<br>

<details>
<summary>✅ Good — nomenclatura expressiva, plural, camelCase, namespace Redis</summary>
<br>

```js
// MongoDB: plural, camelCase, boolean com prefixo, nome de domínio
await teamsCollection.insertOne({
  name: 'São Paulo FC',
  foundedYear: 1930,
  isActive: true,
  managerId: 'player:7',
  homeStadium: 'Morumbi',
  createdAt: new Date(),
});

// Redis: namespace:entity:id com separador :
const teamKey = `team:profile:${teamId}`;
const standingsKey = `team:standings:2026`;

await redis.set(teamKey, JSON.stringify(teamProfile));
await redis.set(standingsKey, JSON.stringify(standings));
```

</details>
