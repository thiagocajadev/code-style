# Quick Reference — NoSQL

> Escopo: NoSQL. Cheat-sheet de dos e don'ts por SGBD.

## Escolha de SGBD

| Caso de uso | SGBD | Driver |
| --- | --- | --- |
| Dados hierárquicos, queries variadas | MongoDB 8.2 | `mongodb` |
| Cache, sessão, ranked list, pub/sub | Redis 8.x | `redis` (node-redis) |
| Stack AWS, acesso por padrão fixo | DynamoDB | `@aws-sdk/lib-dynamodb` |
| Alto volume de escrita, séries temporais | Cassandra 5.x | `cassandra-driver` |
| Busca full-text, logs, analytics | Elasticsearch 8.x | `@elastic/elasticsearch` |

---

## MongoDB

| ✅ Fazer | ❌ Evitar |
| --- | --- |
| Projeção em todo `findOne` / `find` | Trafégar documento inteiro para usar 2 campos |
| Filtro no banco (`find({ isActive: true })`) | Filtrar no cliente após `.find({})` |
| `$lookup` para joins | N queries em loop com `Promise.all` |
| `updateOne` com `$set` | `replaceOne` (apaga campos não enviados) |
| `upsert` com `$setOnInsert` | find-then-insert (condição de corrida) |
| `insertMany({ ordered: false })` para lotes | `insertOne` em loop |
| TTL index com `expiresAt` | Job externo de limpeza |
| `explain()` antes de deployar em tabela grande | Assumir que índice existe |
| `$match` como primeiro estágio do pipeline | `$lookup` antes de filtrar |
| índice composto: campo seletivo primeiro | Indexar campo boolean (`isActive`) |

---

## Redis

| ✅ Fazer | ❌ Evitar |
| --- | --- |
| `SET key value EX seconds` com TTL | `SET` sem TTL em cache |
| `namespace:entity:id` com separador `:` | Keys sem namespace (`team-data`, `t42`) |
| `SCAN` para listar chaves por padrão | `KEYS *` em produção |
| `hSet` / `hGet` para objetos com campos fixos | Serializar objetos grandes em string |
| `zIncrBy` para leaderboard | Reescrever score sem incrementar |
| `sAdd` / `sIsMember` para membros únicos | Lista com duplicatas para membros únicos |
| Clientes separados para pub e sub | Usar o mesmo client para subscribe e outros comandos |
| `null` check antes de `JSON.parse` | Parse direto sem verificar se a chave existe |

---

## DynamoDB

| ✅ Fazer | ❌ Evitar |
| --- | --- |
| `Query` com partition key | `Scan` em produção |
| GSI para access patterns alternativos | `FilterExpression` sem GSI (paga RCUs de itens descartados) |
| Partition key com alta cardinalidade (UUID) | Partition key por status (hot spot) |
| `ConditionExpression: 'attribute_not_exists(PK)'` no Put | Put sem condição (sobrescreve silenciosamente) |
| `ExpressionAttributeNames` para atributos reservados | Usar `name`, `status`, `data` sem alias |
| `ProjectionExpression` para limitar campos | Buscar item inteiro para usar 2 atributos |
| `$setOnInsert` equivalente com `ConditionExpression` | find-then-insert (condição de corrida) |

---

## Cassandra

| ✅ Fazer | ❌ Evitar |
| --- | --- |
| `prepare: true` em toda query | Query sem prepare (re-parse a cada chamada) |
| `consistency: localQuorum` como padrão | Sem consistency level explícito |
| `LIMIT` em toda SELECT | SELECT sem LIMIT (retorna partição inteira) |
| Partition key com alta cardinalidade | Partition key de baixa cardinalidade (hot spot) |
| `USING TTL` para dados com expiração | Hard delete intensivo (acumula tombstones) |
| Query com partition key no WHERE | `ALLOW FILTERING` (full cluster scan) |
| Batch somente para consistência entre tabelas | Batch para performance (mesma tabela) |

---

## Elasticsearch

| ✅ Fazer | ❌ Evitar |
| --- | --- |
| `term` em campo `keyword` | `match` em campo `keyword` |
| `filter` para condições binárias (sem score) | `must` para condições sem relevância |
| `_source` para projetar campos | Buscar documento inteiro |
| `size: 0` em queries de aggregation | Trafégar documentos desnecessários |
| `bool.filter` + `bool.must` para combinar | Nesting profundo de `bool` |
| `search_after` para paginação profunda | `from + size` acima de 1.000 |
| `bulk` para inserção em lote | `index` individual em loop |
| Usar ES como camada de busca | Usar ES como banco primário |

---

## Naming

| Contexto | Padrão | Exemplo |
| --- | --- | --- |
| MongoDB collection | snake_case + plural | `match_events` |
| MongoDB field | camelCase | `foundedYear`, `isActive` |
| Redis key | `namespace:entity:id` | `team:profile:42` |
| DynamoDB attribute | PascalCase | `FoundedYear`, `HomeStadium` |
| DynamoDB PK/SK | `ENTITY#id` | `TEAM#42`, `PLAYER#7` |
| Cassandra table | snake_case + plural | `match_events` |
| Cassandra column | snake_case | `founded_year`, `is_active` |
| Elasticsearch field | snake_case | `founded_year`, `is_active` |
| Index MongoDB | `idx_collection_field` | `idx_teams_city` |
| Index único | `unq_collection_field` | `unq_players_license` |
