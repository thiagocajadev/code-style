# Banco de Dados

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O banco de dados é o componente com maior impacto em performance e o mais difícil de escalar retroativamente. Escolher o modelo certo, escrever queries eficientes e saber diagnosticar gargalos antes de chegarem à produção são habilidades que mudam a capacidade de um sistema.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) | Linguagem padrão para bancos relacionais; define, consulta e manipula dados em tabelas |
| **NoSQL** (Not Only SQL, Não Apenas SQL) | Família de bancos não-relacionais: document, key-value, column-family e graph |
| **ACID** (Atomicity, Consistency, Isolation, Durability, Atomicidade, Consistência, Isolamento, Durabilidade) | Garantias de transação que asseguram integridade dos dados em bancos relacionais |
| **Index** (Índice) | Estrutura auxiliar que acelera buscas em uma coluna sem varrer a tabela inteira |
| **Full scan** (varredura completa) | Leitura de todas as linhas da tabela para encontrar os registros; evitar em tabelas grandes |
| **EXPLAIN** | Comando que mostra o plano de execução de uma query sem executá-la |
| **Query plan** (plano de execução) | Sequência de operações que o banco escolhe para executar uma query |
| **Seq Scan** (varredura sequencial) | Leitura linha a linha da tabela; indica ausência de índice útil |
| **Index Scan** (varredura por índice) | Leitura via índice; muito mais eficiente que Seq Scan para filtros seletivos |
| **N+1** | Anti-padrão que executa uma query por item de uma lista em vez de uma única query em lote |
| **Slow query log** (log de queries lentas) | Registro automático de queries que excedem um tempo limite configurado |
| **Lock** (bloqueio) | Mecanismo que impede acesso simultâneo conflitante a um recurso; pode causar espera ou deadlock |
| **Deadlock** (bloqueio morto) | Situação onde duas transações esperam uma pela outra indefinidamente |
| **Connection pool exhaustion** (esgotamento do pool de conexões) | Todas as conexões do pool estão em uso; novas requisições ficam em fila ou falham |
| **Projection** (projeção) | Define quais campos retornar em uma consulta NoSQL; evita trafegar o documento inteiro |
| **Aggregation pipeline** (pipeline de agregação) | Sequência de estágios para processar documentos em lote no MongoDB; substitui JOINs e GROUP BY do SQL |
| **ETL** (Extract, Transform, Load, Extração, Transformação e Carga) | Processo de mover dados de fontes externas para o banco: extrair da origem, transformar e carregar no destino. Ver [etl-bi.md](./etl-bi.md) |
| **Staging table** (tabela de preparação) | Tabela intermediária que recebe dados brutos antes de validar e inserir na tabela de produção |
| **Chunk** (fatia, lote) | Subconjunto fixo de linhas processado por vez em operações de alto volume; mantém locks de curta duração |

---

## SQL vs NoSQL

A escolha não é sobre modernidade: é sobre o modelo de dados e os padrões de acesso.

### Bancos Relacionais (SQL)

Dados estruturados em tabelas com schema definido. Relações entre entidades expressas como foreign keys. Transações com garantias **ACID**.

| Ponto forte | Detalhe |
|---|---|
| Consistência forte | Transações garantem estado correto mesmo em falhas |
| Queries ad-hoc | SQL permite explorar dados sem planejamento prévio de acesso |
| Joins | Relacionamentos complexos consultados sem duplicar dados |
| Ferramentas maduras | Otimizadores, planos de execução, backups, replicação |

**Exemplos**: PostgreSQL, SQL Server, MySQL, SQLite.

**Quando usar**: domínio com relações entre entidades, necessidade de consistência transacional, queries variadas não definidas em tempo de design.

### Bancos Não-Relacionais (NoSQL)

Quatro modelos principais, cada um otimizado para um padrão de acesso diferente:

| Modelo | Como organiza os dados | Melhor para |
|---|---|---|
| **Document** (documento) | Documentos JSON aninhados, sem schema rígido | Dados hierárquicos com estrutura variável (catálogo, CMS, perfis) |
| **Key-Value** (chave-valor) | Acesso por chave única, valor opaco | Cache, sessão, contadores, filas simples |
| **Column-Family** (família de colunas) | Colunas agrupadas, leitura eficiente em colunas específicas | Analytics, séries temporais, telemetria em alta escala |
| **Graph** (grafo) | Nós e arestas como cidadãos de primeira classe | Redes sociais, recomendação, detecção de fraude |

**Quando usar**: escala de escrita muito alta que bancos relacionais não absorvem, dados sem schema previsível, padrão de acesso fixo e conhecido (key-value, full document), ou quando o modelo de grafo representa a estrutura natural dos dados.

**O que não fazer**: escolher NoSQL porque "escala melhor" sem medir. Banco relacional bem indexado suporta volumes muito maiores do que a maioria dos projetos vai atingir. A complexidade operacional de NoSQL tem custo real.

---

## Tuning de Queries

O gargalo mais comum não é hardware: é query mal escrita ou ausência de índice.

### Índices

Um índice cria uma estrutura auxiliar que o banco usa para encontrar linhas sem varrer a tabela inteira.

| Tipo | Quando usar |
|---|---|
| **Índice simples** | Filtros e ordenações em uma única coluna frequente no WHERE ou ORDER BY |
| **Índice composto** | Queries que filtram por duas ou mais colunas juntas; a ordem das colunas importa |
| **Índice covering** | Index que inclui todas as colunas da query; leitura sem tocar a tabela principal |
| **Índice parcial** | Index sobre um subconjunto de linhas (`WHERE status = 'active'`); menor e mais rápido |

```sql
-- índice simples: acelera buscas por email
CREATE INDEX idx_users_email ON users(email);

-- índice composto: acelera WHERE status = ? AND created_at > ?
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
```

**Regras**:

- Indexar colunas usadas em WHERE, JOIN e ORDER BY com alta seletividade
- Não indexar colunas com poucos valores distintos (`boolean`, `gender`); o banco prefere full scan
- Índices têm custo de escrita: cada INSERT/UPDATE/DELETE atualiza todos os índices da tabela
- Colunas com função no WHERE desativam o índice: `WHERE LOWER(email) = ?` não usa índice em `email`; criar índice funcional ou normalizar no insert. O mesmo vale para `CAST`/`CONVERT` na coluna: converter o parâmetro, nunca a coluna. Ver [sql/performance.md](../../../sql/conventions/advanced/performance.md#cast-e-conversão-de-tipo-em-colunas)

### Boas práticas de query

Padrões com BAD/GOOD completos: [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md).

### Consultas NoSQL

Os anti-padrões de NoSQL diferem dos SQL, mas o princípio é o mesmo: trabalho desnecessário no servidor é mais barato que trabalho no cliente.

Guia completo por SGBD: [docs/nosql/](../../../nosql/). Convenções de **CRUD** (Create Read Update Delete, Criar Ler Atualizar Excluir), naming e performance: [nosql/conventions/](../../../nosql/conventions/).

<details>
<summary>❌ Bad: sem projeção — trafega o documento inteiro para usar um campo</summary>
<br>

```js
const user = await database.collection('users').findOne({ email });
const userName = user.name;
```

</details>

<br>

<details>
<summary>✅ Good: projeção limita os campos retornados</summary>
<br>

```js
class UserRepository {
  async findByEmail(email) {
    const user = await this.collection.findOne(
      { email },
      { projection: { name: 1, _id: 0 } }
    );

    return user;
  }
}
```

</details>

<br>

<details>
<summary>❌ Bad: filtro em memória — carrega a coleção inteira para filtrar no cliente</summary>
<br>

```js
const allOrders = await database.collection('orders').find({}).toArray();
const pendingOrders = allOrders.filter(order => order.status === 'pending');
```

</details>

<br>

<details>
<summary>✅ Good: filtro na query — banco usa índice em status</summary>
<br>

```js
class OrderRepository {
  async findPending() {
    const pendingOrders = await this.collection
      .find({ status: 'pending' })
      .project({ id: 1, customerId: 1, total: 1 })
      .toArray();

    return pendingOrders;
  }
}
```

</details>

<br>

<details>
<summary>❌ Bad: N+1 em document store — uma query por item para buscar documento relacionado</summary>
<br>

```js
const orders = await database.collection('orders').find({ userId }).toArray();

const enrichedOrders = await Promise.all(
  orders.map(async order => {
    const product = await database.collection('products').findOne({ _id: order.productId });

    return { ...order, product };
  })
);
```

</details>

<br>

<details>
<summary>✅ Good: $lookup resolve em uma única passagem no banco</summary>
<br>

```js
class OrderRepository {
  async findByUserWithProduct(userId) {
    const enrichedOrders = await this.collection.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' }, // drops orders with no matching product — use preserveNullAndEmptyArrays: true if product can be missing
    ]).toArray();

    return enrichedOrders;
  }
}
```

</details>

---

## Operações em Lote

Operações em lote agrupam múltiplas linhas em uma única instrução ou dividem uma operação grande
em ciclos menores. Dois objetivos distintos: aumentar throughput em carga inicial e evitar locks
de longa duração em operações de manutenção.

| Padrão | Quando usar |
|---|---|
| **Batch INSERT** | Inserir muitos registros de uma vez: importação, ETL, seed de dados |
| **Chunked UPDATE/DELETE** | Atualizar ou remover grandes volumes sem bloquear a tabela por minutos |
| **BULK INSERT / COPY** | Importar arquivos CSV ou binários diretamente no banco, sem round trips pela aplicação |
| **Staging table** | Validar dados externos antes de inserir na tabela de produção |
| **Scheduled job** | Executar operações periódicas — limpeza, agregação, archive — sem intervenção manual |

### Chunk size

Não existe valor universal. O critério é o tempo de lock aceitável para o sistema.

- Lotes entre 1.000 e 5.000 linhas são um ponto de partida seguro para a maioria dos casos
- Lotes muito pequenos aumentam o número de round trips e o overhead de transação
- Lotes muito grandes seguram o lock por mais tempo e aumentam o risco de rollback custoso

Operações em lote que rodam em produção precisam de idempotência: se o job for interrompido, a
próxima execução deve continuar de onde parou sem duplicar ou corromper dados. O padrão é usar a
condição de filtro do próprio UPDATE/DELETE como cursor natural — o WHERE já exclui as linhas
já processadas nas iterações anteriores.

Padrões de query: [sql/conventions/advanced/batch.md](../../../sql/conventions/advanced/batch.md).

Recursos específicos por banco: [SQL Server](../../../sql/sgbd/sql-server.md#operações-em-lote) | [PostgreSQL](../../../sql/sgbd/postgres.md#operações-em-lote).

---

## Plano de Execução

O plano de execução mostra _como_ o banco vai executar a query: quais índices vai usar, como vai fazer joins, qual o custo estimado de cada operação.

**Antes de deployar qualquer query em uma tabela grande, analisar o plano.**

Sintaxe por banco: [PostgreSQL](../../../sql/sgbd/postgres.md#diagnóstico) | [SQL Server](../../../sql/sgbd/sql-server.md#diagnóstico).

### O que procurar no plano

| Operação | O que significa | Ação |
|---|---|---|
| **Seq Scan** | Varredura completa, sem índice útil | Criar índice na coluna de filtro |
| **Index Scan** | Usa índice, lê linhas da tabela | Bom; considerar Index Only Scan se possível |
| **Index Only Scan** | Usa índice sem tocar a tabela | Ótimo (query coberta pelo índice) |
| **Nested Loop** | Join com loop para cada linha externa | Aceitável para tabelas pequenas; ruim para grandes |
| **Hash Join** | Constrói hash table em memória para o join | Eficiente para joins de tabelas grandes |
| **High cost** | Número alto na estimativa de custo | Ponto de partida para investigar |

```
-- exemplo de saída EXPLAIN (PostgreSQL)
Seq Scan on orders  (cost=0.00..4521.00 rows=150000 width=16)
  Filter: ((status)::text = 'pending'::text)
```

`Seq Scan` em tabela grande com `Filter` é o sinal mais claro de índice ausente.

---

## Troubleshooting de Gargalos

### Slow query log

O primeiro passo para identificar problemas em produção é habilitar o log de queries lentas.

Configuração por banco: [PostgreSQL](../../../sql/sgbd/postgres.md#diagnóstico) | [SQL Server](../../../sql/sgbd/sql-server.md#diagnóstico).

### N+1 em runtime

N+1 raramente aparece no código; aparece no log de queries. O sinal é um padrão repetido de queries idênticas com IDs diferentes em sequência rápida.

```
-- sinal de N+1 no log
SELECT * FROM customers WHERE id = 1  -- 0.1ms
SELECT * FROM customers WHERE id = 2  -- 0.1ms
SELECT * FROM customers WHERE id = 3  -- 0.1ms
... (100 vezes)
```

Ferramentas que expõem N+1 automaticamente: **Bullet** (Rails), **Hibernate Statistics**, **EF Core logging**, **Sequelize logging mode**.

### Connection pool exhaustion

Quando todas as conexões do pool estão em uso, novas requisições ficam em fila. Sintoma: timeouts em requisições simples que normalmente são rápidas, sem aumento de **CPU** (Central Processing Unit, Unidade Central de Processamento) ou lentidão de queries.

Diagnóstico por banco: [PostgreSQL](../../../sql/sgbd/postgres.md#diagnóstico) | [SQL Server](../../../sql/sgbd/sql-server.md#diagnóstico).

Causas comuns: queries longas segurando conexão, transaction não fechada, pool subdimensionado, pico de tráfego inesperado.

### Locks e deadlocks

Lock é esperado: é o mecanismo de consistência. O problema é lock de longa duração ou deadlock.

**Identificar locks ativos**: [PostgreSQL](../../../sql/sgbd/postgres.md#diagnóstico) | [SQL Server](../../../sql/sgbd/sql-server.md#diagnóstico).

**Deadlock** aparece no log com mensagem explícita. A causa mais comum é duas transações acessando as mesmas linhas em ordem inversa. A solução é padronizar a ordem de acesso.

```
-- padrão que gera deadlock
Transação A: lock em orders(1) → tenta lock em payments(1)
Transação B: lock em payments(1) → tenta lock em orders(1)  ← deadlock

-- solução: sempre adquirir locks na mesma ordem
Transação A: lock em orders(1) → lock em payments(1)
Transação B: lock em orders(1) → lock em payments(1)  ← espera A terminar
```

### Checklist de investigação

Ao receber relatório de "banco lento":

1. Verificar slow query log (query específica ou carga geral?)
2. `EXPLAIN ANALYZE` na query suspeita (Seq Scan em tabela grande?)
3. Verificar conexões ativas (pool exhaustion?)
4. Verificar locks de longa duração (transação presa?)
5. Verificar volume de dados (a tabela cresceu e o índice ficou ineficiente?)
6. Verificar índices existentes na tabela (algum foi dropado ou nunca foi criado?)

---

## Referência rápida

| Problema | Sinal | Ação |
|---|---|---|
| Query lenta | Seq Scan no EXPLAIN, timeout em produção | Criar índice na coluna de filtro |
| N+1 | Queries repetidas com IDs sequenciais no log | Eager load em lote; JOIN ou IN clause |
| Pool exhaustion | Timeout sem lentidão de query | Aumentar pool, investigar queries longas |
| Deadlock | Erro explícito no log | Padronizar ordem de acesso às linhas |
| Índice não usado | Index Scan esperado mas Seq Scan no plano | Verificar função em coluna, tipo de dado, seletividade |
| Crescimento de tabela | Query ficou lenta sem mudança de código | Analisar plano novamente (estatísticas podem estar desatualizadas); rodar ANALYZE |
