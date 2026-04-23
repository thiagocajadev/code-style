# Elasticsearch

> Escopo: Elasticsearch 8.x. Referência: [elastic.co/guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/).
>
> Driver: `@elastic/elasticsearch`.

Elasticsearch é um motor de busca e analytics. Funciona como camada de busca sobre um banco primário (MongoDB, PostgreSQL) ou como store de logs/eventos em tempo real.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Index** (índice) | Container de documentos; equivale a uma tabela; tem mapping e settings |
| **Document** (documento) | Unidade de dado em JSON indexada e pesquisável |
| **Mapping** | Schema do índice: define tipos de campos (`text`, `keyword`, `date`, `integer`) |
| **Shard** (fragmento) | Divisão do índice em partições para paralelismo; número definido na criação |
| **Replica** (réplica) | Cópia de shard; aumenta disponibilidade e throughput de leitura |
| **Inverted index** (índice invertido) | Estrutura interna que mapeia termos para documentos; base da busca full-text |
| **Analyzer** (analisador) | Processa texto antes de indexar: tokeniza, remove stopwords, normaliza |
| **Query context** (contexto de query) | Calcula relevância (score); mais lento |
| **Filter context** (contexto de filtro) | Resultado binário sim/não; cacheado; mais rápido |
| **Aggregation** (agregação) | Cálculos sobre o resultado: métricas (avg, sum) ou buckets (terms, range) |
| **Bulk API** | Inserção ou atualização de múltiplos documentos em uma única requisição |

---

## Setup

```js
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});
```

---

## Mapping

Definir mapping antes de indexar. Campos `text` para busca full-text; `keyword` para filtro exato, ordenação e aggregation.

```js
await esClient.indices.create({
  index: 'teams',
  body: {
    mappings: {
      properties: {
        name: {
          type: 'text',    // busca full-text com analyzer
          fields: {
            keyword: { type: 'keyword' }, // .keyword para filtro exato e aggregation
          },
        },
        city: { type: 'keyword' },         // filtro exato
        foundedYear: { type: 'integer' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'date' },
      },
    },
  },
});
```

---

## Index (Inserção de Documento)

```js
class TeamIndexRepository {
  async index(team) {
    const response = await esClient.index({
      index: 'teams',
      id: team.id,
      document: {
        name: team.name,
        city: team.city,
        foundedYear: team.foundedYear,
        isActive: team.isActive,
        createdAt: new Date(),
      },
    });

    const result = response.result; // 'created' | 'updated'

    return result;
  }
}
```

---

## Bulk (Inserção em Lote)

Preferir `bulk` para inserção de múltiplos documentos. Cada item usa duas linhas: action + document.

```js
class TeamIndexRepository {
  async bulkIndex(teams) {
    const operations = teams.flatMap((team) => [
      { index: { _index: 'teams', _id: team.id } },
      {
        name: team.name,
        city: team.city,
        foundedYear: team.foundedYear,
        isActive: team.isActive,
      },
    ]);

    const response = await esClient.bulk({ operations });
    const hasErrors = response.errors;

    return { hasErrors, items: response.items };
  }
}
```

---

## Search

### match — busca full-text

```js
async function searchTeams(query) {
  const response = await esClient.search({
    index: 'teams',
    query: {
      match: { name: query }, // analisado: tokeniza, stemming, lowercase
    },
    size: 20,
  });

  const teams = response.hits.hits.map((hit) => hit._source);
  return teams;
}
```

### term — filtro exato

```js
// usar .keyword para filtro exato em campos text
async function findTeamsByCity(city) {
  const response = await esClient.search({
    index: 'teams',
    query: {
      term: { city }, // keyword field — exato, cacheado
    },
  });

  const teams = response.hits.hits.map((hit) => hit._source);
  return teams;
}
```

### bool — combinação de condições

<details>
<summary>❌ Bad — match em campo keyword; filtro no query context; sem projeção</summary>
<br>

```js
// match em campo keyword — re-analisa o termo, resultado inesperado
const response = await esClient.search({
  index: 'teams',
  query: {
    bool: {
      must: [
        { match: { city: 'São Paulo' } }, // deveria ser term em keyword
        { match: { isActive: true } },    // boolean não tem full-text; usar term/filter
      ],
    },
  },
  // sem _source para limitar campos retornados
});
```

</details>

<br>

<details>
<summary>✅ Good — term/filter para condições exatas; must para relevância; _source para projeção</summary>
<br>

```js
async function searchActiveTeamsByCity(city, nameQuery) {
  const response = await esClient.search({
    index: 'teams',
    query: {
      bool: {
        must: [
          { match: { name: nameQuery } }, // relevância: score calculado
        ],
        filter: [
          { term: { city } },             // exato: cacheado, sem score
          { term: { isActive: true } },
        ],
      },
    },
    _source: ['name', 'city', 'foundedYear'], // projeção: limita campos retornados
    size: 20,
  });

  const teams = response.hits.hits.map((hit) => hit._source);
  return teams;
}
```

</details>

### range — intervalo

```js
async function findTeamsByFoundedPeriod(fromYear, toYear) {
  const response = await esClient.search({
    index: 'teams',
    query: {
      range: {
        foundedYear: { gte: fromYear, lte: toYear },
      },
    },
    sort: [{ foundedYear: 'asc' }],
    _source: ['name', 'city', 'foundedYear'],
  });

  const teams = response.hits.hits.map((hit) => hit._source);
  return teams;
}
```

---

## Aggregations

Usar `size: 0` quando o resultado são apenas agregações, não documentos.

```js
async function computeTeamStatsByCity() {
  const response = await esClient.search({
    index: 'teams',
    size: 0, // somente agregações; sem documentos no resultado
    query: {
      term: { isActive: true },
    },
    aggs: {
      by_city: {
        terms: {
          field: 'city',  // keyword field
          size: 10,
        },
        aggs: {
          avg_founded_year: {
            avg: { field: 'foundedYear' },
          },
        },
      },
    },
  });

  const cityBuckets = response.aggregations.by_city.buckets;
  return cityBuckets;
}
```

---

## Update e Delete

```js
// update parcial
await esClient.update({
  index: 'teams',
  id: teamId,
  doc: {
    managerId,
    updatedAt: new Date(),
  },
});

// delete por ID
await esClient.delete({
  index: 'teams',
  id: teamId,
});

// delete por query
await esClient.deleteByQuery({
  index: 'teams',
  query: {
    term: { isActive: false },
  },
});
```

---

## Anti-Padrões

| Anti-padrão | Consequência | Solução |
| --- | --- | --- |
| `match` em campo `keyword` | Re-analisa o valor; resultado inconsistente | Usar `term` para campos keyword |
| `wildcard` com `*` no início | Scan do índice invertido inteiro; alto custo | Usar `match` com analyzer ou reindexar com `ngram` |
| Aggregation em campo `text` | Erro ou resultado incorreto | Usar `.keyword` ou campo separado |
| Muitos shards pequenos | Overhead de gerenciamento; queries mais lentas | 1 a 5 GB por shard como referência |
| Usar ES como banco primário | ES é eventual; re-index destrói histórico | Manter banco primário; ES como camada de busca |
| `from + size` para paginação profunda | Custo O(from + size) por shard | Usar `search_after` para paginação profunda |
