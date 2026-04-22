# NoSQL

> Escopo: transversal. Aplica-se a qualquer stack que use bancos não-relacionais.

Bancos não-relacionais otimizam para padrão de acesso, escala horizontal e flexibilidade de schema. A escolha do modelo certo determina se a stack vai crescer com o produto ou contra ele.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Document store** (banco de documentos) | Armazena documentos JSON semi-estruturados; schema flexível por documento |
| **Key-Value store** (banco chave-valor) | Acesso por chave única; valor opaco para o banco |
| **Column-Family** (família de colunas) | Colunas agrupadas por família; leitura eficiente em subconjuntos de colunas |
| **Sharding** (fragmentação horizontal) | Distribuição de dados entre nós do cluster pelo partition key |
| **Replication factor** (fator de replicação) | Número de cópias de cada dado mantidas no cluster |
| **Eventual consistency** (consistência eventual) | Réplicas convergem para o mesmo valor, mas não são garantidas como síncronas no momento da leitura |
| **Partition key** (chave de partição) | Campo que determina em qual nó o dado é armazenado; design crítico para distribuição uniforme |
| **TTL** (Time To Live, tempo de vida) | Expiração automática de registros após um intervalo configurado |
| **Projection** (projeção) | Define quais campos retornar; evita trafegar o documento inteiro |
| **Index** (índice) | Estrutura auxiliar para acelerar buscas sem varrer toda a coleção |
| **Hot spot** (ponto quente) | Nó sobrecarregado porque a partition key não distribui dados de forma uniforme |
| **Single-table design** (design de tabela única) | Padrão DynamoDB que armazena múltiplos tipos de entidade na mesma tabela usando prefixos no PK/SK |

---

## Quando usar NoSQL

| Caso | SGBD recomendado |
| --- | --- |
| 80% dos casos | MongoDB + Redis |
| Stack AWS | DynamoDB + Redis |
| Escala absurda de escrita ou séries temporais | Cassandra |
| Busca full-text ou análise de logs | Elasticsearch |

**O que não fazer**: escolher NoSQL porque "escala melhor" sem medir. Banco relacional bem indexado suporta volumes maiores do que a maioria dos projetos vai atingir. A complexidade operacional de NoSQL tem custo real.

Base conceitual de SQL vs NoSQL: [shared/platform/database.md](../../shared/platform/database.md).

---

## Convenções

| Tópico | Conceitos |
| --- | --- |
| [Naming](conventions/naming.md) | Collection, field, key name, index name |
| [CRUD](conventions/crud.md) | Insert, find, update, delete; projeção; filtros |
| [Visual Density](conventions/visual-density.md) | Paragraphs of intent em drivers JS |
| [Performance](conventions/advanced/performance.md) | Índices, projeção, N+1, TTL |
| [Aggregation](conventions/advanced/aggregation.md) | Pipeline stages, $lookup, $group, $project |

---

## SGBD

Idiomas e recursos específicos de cada banco.

| SGBD | Versão | Modelo | Melhor para |
| --- | --- | --- | --- |
| [MongoDB](sgbd/mongodb.md) | 8.2 | Document | Dados hierárquicos; schema flexível; queries variadas |
| [Redis](sgbd/redis.md) | 8.x | Key-Value | Cache, sessão, pub/sub, filas, ranked lists |
| [DynamoDB](sgbd/dynamodb.md) | — | Key-Value + Document | Stack AWS; escala serverless; acesso por padrão fixo |
| [Cassandra](sgbd/cassandra.md) | 5.x | Column-Family | Escala de escrita alta; séries temporais; telemetria |
| [Elasticsearch](sgbd/elasticsearch.md) | 8.x | Search / Document | Busca full-text; logs; análise de dados |

---

## Scripts

Exemplos reutilizáveis por banco:

- [scripts/mongodb/](scripts/mongodb/) — insert, find, update, delete, aggregation
- [scripts/redis/](scripts/redis/) — strings, hashes, sets, sorted-sets

---

## Quick Reference

Cheat-sheet de dos e don'ts: [quick-reference.md](quick-reference.md).
