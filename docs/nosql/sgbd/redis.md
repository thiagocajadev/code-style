# Redis

> Escopo: Redis 8.x. Referência: [redis.io/docs](https://redis.io/docs/latest/).
>
> Driver recomendado: `redis` (node-redis) para projetos novos. `ioredis` para clusters existentes.

Redis é um banco de dados em memória com persistência opcional. Funciona como cache, pub/sub, fila simples, leaderboard e gerenciador de sessão.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **String** | Tipo base: qualquer valor até 512 MB — texto, JSON serializado, número |
| **Hash** | Mapa de campos e valores; ideal para objetos com campos nomeados |
| **List** (lista) | Lista duplamente encadeada; suporta push/pop nas duas extremidades |
| **Set** (conjunto) | Coleção não ordenada de strings únicas |
| **Sorted Set** (conjunto ordenado) | Set com score numérico por membro; ordenado por score |
| **TTL** (Time To Live, tempo de vida) | Expiração automática da chave após o intervalo configurado |
| **Cache-aside** | Padrão: verificar cache → miss → buscar no banco → preencher cache |
| **Pub/Sub** (publish/subscribe) | Canal de mensagens: publicadores emitem, assinantes recebem |
| **Atomic operation** (operação atômica) | Operação que executa como unidade indivisível; INCR é atômico por natureza |
| **Keyspace** (espaço de chaves) | Conjunto de todas as chaves do banco Redis |

---

## Conexão

```js
import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL, // redis://localhost:6379
});

client.on('error', (error) => {
  console.error('Redis connection error:', error);
});

await client.connect();
```

<details>
<summary>❌ Bad — sem tratamento de erro de conexão; URL hardcoded</summary>
<br>

```js
const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();
// sem handler de error — falha silenciosa em produção
```

</details>

<br>

<details>
<summary>✅ Good — URL por variável de ambiente; handler de erro; connect aguardado</summary>
<br>

```js
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (error) => {
  console.error('Redis connection error:', error);
  process.exit(1);
});

await client.connect();

export { client };
```

</details>

---

## Strings

O tipo mais simples. Usar para valores atômicos, contadores e JSON serializado.

| Comando | Uso |
| --- | --- |
| `SET key value EX seconds` | Definir com TTL |
| `GET key` | Ler valor |
| `INCR key` | Incrementar contador atomicamente |
| `INCRBY key n` | Incrementar por N |
| `MGET key1 key2` | Ler múltiplos valores |

<details>
<summary>❌ Bad — SET sem TTL em cache; JSON.parse sem null check; KEYS * em produção</summary>
<br>

```js
// cache sem TTL — acumula indefinidamente
await client.set('team:profile:42', JSON.stringify(team));

// KEYS * varre todo o keyspace — bloqueia o servidor em produção
const allKeys = await client.keys('team:*');

// JSON.parse sem verificação — erro se GET retorna null
const cached = JSON.parse(await client.get('team:profile:42'));
```

</details>

<br>

<details>
<summary>✅ Good — SET com TTL; null check antes de parse; SCAN em vez de KEYS</summary>
<br>

```js
const CACHE_TTL_SECONDS = 300; // 5 minutos

class TeamCache {
  async save(teamId, team) {
    const key = `team:profile:${teamId}`;
    const value = JSON.stringify(team);

    await client.set(key, value, { EX: CACHE_TTL_SECONDS });
  }

  async find(teamId) {
    const key = `team:profile:${teamId}`;
    const cached = await client.get(key);

    if (!cached) {
      return null;
    }

    const team = JSON.parse(cached);
    return team;
  }
}
```

</details>

---

## Cache-Aside

Padrão mais comum: verificar cache antes de ir ao banco.

```
cache hit → retorna valor sem tocar o banco
cache miss → busca no banco → salva no cache → retorna valor
```

<details>
<summary>✅ Good — cache-aside com TTL; sem duplicação de lógica de busca</summary>
<br>

```js
class TeamRepository {
  async findById(teamId) {
    const cacheKey = `team:profile:${teamId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const team = JSON.parse(cached);
      return team;
    }

    const team = await teamsCollection.findOne({ _id: teamId });

    if (team) {
      await redisClient.set(cacheKey, JSON.stringify(team), { EX: 300 });
    }

    return team;
  }
}
```

</details>

---

## Hashes

Armazenam objetos com campos nomeados. Mais eficiente que serializar JSON em string quando apenas alguns campos são lidos com frequência.

| Comando | Uso |
| --- | --- |
| `HSET key field value` | Definir campo |
| `HGET key field` | Ler campo |
| `HGETALL key` | Ler todos os campos como objeto |
| `HMGET key f1 f2` | Ler múltiplos campos |
| `HDEL key field` | Remover campo |

```js
// salvar objeto como hash
await client.hSet(`team:stats:${teamId}`, {
  wins: 10,
  draws: 3,
  losses: 2,
  goalsFor: 28,
});

// ler campo específico sem carregar o objeto inteiro
const wins = await client.hGet(`team:stats:${teamId}`, 'wins');

// ler todos os campos
const stats = await client.hGetAll(`team:stats:${teamId}`);
// retorna: { wins: '10', draws: '3', losses: '2', goalsFor: '28' }
// atenção: todos os valores são strings — converter conforme necessário
```

---

## Sorted Sets

Ideal para rankings, leaderboards e filas com prioridade.

| Comando | Uso |
| --- | --- |
| `ZADD key score member` | Adicionar membro com score |
| `ZRANGE key start stop WITHSCORES` | Ler por posição (menor score primeiro) |
| `ZREVRANGE key start stop` | Ler por posição (maior score primeiro) |
| `ZRANGEBYSCORE key min max` | Ler por intervalo de score |
| `ZRANK key member` | Posição do membro (0-based, menor score = posição 0) |
| `ZSCORE key member` | Score do membro |
| `ZREM key member` | Remover membro |

<details>
<summary>✅ Good — leaderboard de gols com Sorted Set</summary>
<br>

```js
const LEADERBOARD_KEY = 'season:2026:top-scorers';

class LeaderboardRepository {
  async incrementGoals(playerId, goals) {
    await client.zIncrBy(LEADERBOARD_KEY, goals, playerId);
  }

  async fetchTopScorers(count) {
    const topScorers = await client.zRangeWithScores(
      LEADERBOARD_KEY,
      0,
      count - 1,
      { REV: true }, // maior score primeiro
    );

    return topScorers;
    // retorna: [{ value: 'player:7', score: 15 }, ...]
  }

  async fetchPlayerRank(playerId) {
    const rank = await client.zRevRank(LEADERBOARD_KEY, playerId);

    return rank; // null se não existe; 0 = primeiro lugar
  }
}
```

</details>

---

## Sets

Coleção não ordenada de strings únicas. Útil para tags, permissões, membros de grupo.

```js
// times favoritos de um usuário
const userKey = `user:favorites:${userId}`;

await client.sAdd(userKey, 'team:42');
await client.sAdd(userKey, 'team:43');

const favorites = await client.sMembers(userKey);
const isFavorite = await client.sIsMember(userKey, 'team:42');

await client.sRem(userKey, 'team:43');
```

---

## Lists

Lista ordenada por inserção. Funciona como fila (FIFO) ou pilha (LIFO).

```js
const QUEUE_KEY = 'match:notifications:queue';

// enfileirar (FIFO: push na direita, pop na esquerda)
await client.rPush(QUEUE_KEY, JSON.stringify(notification));

// desenfileirar
const raw = await client.lPop(QUEUE_KEY);
const notification = raw ? JSON.parse(raw) : null;

// leitura sem remoção
const pending = await client.lRange(QUEUE_KEY, 0, -1);
```

---

## Pub/Sub

Pub/Sub no Redis é stateless: o assinante recebe apenas mensagens publicadas após o subscribe. Usar para invalidação de cache, notificações em tempo real e eventos leves.

```js
import { createClient } from 'redis';

// clientes separados — subscribe bloqueia o cliente para outros comandos
const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = publisher.duplicate();

await publisher.connect();
await subscriber.connect();

// assinar canal
await subscriber.subscribe('match:events', (message) => {
  const event = JSON.parse(message);
  // processa evento
});

// publicar evento
await publisher.publish('match:events', JSON.stringify({
  matchId: 1099,
  type: 'goal',
  playerId: 7,
  minute: 33,
}));
```

---

## TTL e Expiração

| Comando | Uso |
| --- | --- |
| `SET key value EX seconds` | Definir com TTL em segundos |
| `SET key value PX ms` | Definir com TTL em milissegundos |
| `EXPIRE key seconds` | Definir TTL em chave existente |
| `TTL key` | Tempo restante em segundos (-1 = sem expiração, -2 = não existe) |
| `PERSIST key` | Remover TTL de uma chave |

```js
// verificar TTL antes de renovar
const ttl = await client.ttl(cacheKey);
const isExpiringSoon = ttl < 60;

if (isExpiringSoon) {
  await client.expire(cacheKey, CACHE_TTL_SECONDS);
}
```

---

## Diagnóstico

```bash
# informações de memória e conexões
redis-cli INFO memory
redis-cli INFO clients

# monitorar comandos em tempo real (somente dev/staging)
redis-cli MONITOR

# verificar TTL de uma chave
redis-cli TTL team:profile:42

# listar chaves por padrão (usar SCAN, nunca KEYS em produção)
redis-cli SCAN 0 MATCH "team:*" COUNT 100
```
