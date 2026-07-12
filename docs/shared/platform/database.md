# Banco de dados

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O banco de dados é o componente que mais afeta o desempenho, e o mais caro de corrigir depois que o produto está no ar. Trocar o modelo de dados com a tabela cheia custa migração, janela de manutenção e risco.

Três decisões respondem pela maior parte do resultado: escolher o modelo certo no começo, escrever queries que o banco consegue otimizar e encontrar o gargalo antes que ele chegue à produção.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) | Linguagem padrão para bancos relacionais; define, consulta e manipula dados em tabelas |
| **NoSQL** (Not Only SQL · Não Apenas SQL) | Família de bancos não-relacionais: document, key-value, column-family e graph |
| **ACID** (Atomicity, Consistency, Isolation, Durability, Atomicidade, Consistência, Isolamento, Durabilidade) | Garantias de transação que asseguram integridade dos dados em bancos relacionais |
| **Index** (Índice) | Estrutura auxiliar que acelera buscas em uma coluna sem varrer a tabela inteira |
| **Full scan** (varredura completa) | Leitura de todas as linhas da tabela para encontrar os registros; evitar em tabelas grandes |
| **EXPLAIN** (explicar plano) | Comando que mostra o plano de execução de uma query sem executá-la |
| **Query plan** (plano de execução) | Sequência de operações que o banco escolhe para executar uma query |
| **Seq Scan** (varredura sequencial) | Leitura linha a linha da tabela; indica ausência de índice útil |
| **Index Scan** (varredura por índice) | Leitura via índice; muito mais eficiente que Seq Scan para filtros seletivos |
| **N+1** (consulta repetida em loop) | Anti-padrão que executa uma query por item de uma lista em vez de uma única query em lote |
| **Slow query log** (log de queries lentas) | Registro automático de queries que excedem um tempo limite configurado |
| **Lock** (bloqueio) | Mecanismo que impede acesso simultâneo conflitante a um recurso; pode causar espera ou deadlock |
| **Deadlock** (impasse entre transações) | Situação onde duas transações esperam uma pela outra indefinidamente |
| **Connection pool exhaustion** (esgotamento do pool de conexões) | Todas as conexões do pool estão em uso; novas requisições ficam em fila ou falham |
| **Projection** (projeção) | Define quais campos retornar em uma consulta NoSQL; evita trafegar o documento inteiro |
| **Aggregation pipeline** (pipeline de agregação) | Sequência de estágios para processar documentos em lote no MongoDB; substitui JOINs e GROUP BY do SQL |
| **ETL** (Extract, Transform, Load, Extração, Transformação e Carga) | Processo de mover dados de fontes externas para o banco: extrair da origem, transformar e carregar no destino. Ver [etl-bi.md](./etl-bi.md) |
| **Staging table** (tabela de preparação) | Tabela intermediária que recebe dados brutos antes de validar e inserir na tabela de produção |
| **Chunk** (fatia, lote) | Subconjunto fixo de linhas processado por vez em operações de alto volume; mantém locks de curta duração |

---

## SQL vs NoSQL

Duas perguntas decidem a escolha: qual é o formato dos seus dados e como o sistema vai lê-los no dia
a dia. A idade da tecnologia fica de fora da conta.

### Bancos relacionais (SQL)

Os dados moram em tabelas com schema definido, as relações entre entidades aparecem como foreign keys e as transações trazem as garantias **ACID**.

| Ponto forte | Detalhe |
|---|---|
| Consistência forte | Transações garantem estado correto mesmo em falhas |
| Queries ad-hoc | SQL permite explorar dados sem planejamento prévio de acesso |
| Joins | Relacionamentos complexos consultados sem duplicar dados |
| Ferramentas maduras | Otimizadores, planos de execução, backups, replicação |

**Exemplos**: PostgreSQL, SQL Server, MySQL, SQLite.

**Quando usar**: o domínio tem entidades que se relacionam, a operação precisa de consistência transacional e as queries ainda vão surgir com o produto, sem estarem todas conhecidas no desenho inicial.

### Bancos não-relacionais (NoSQL)

Quatro modelos principais, cada um afiado para um padrão de acesso diferente:

| Modelo | Como organiza os dados | Melhor para |
|---|---|---|
| **Document** (documento) | Documentos JSON aninhados, sem schema rígido | Dados hierárquicos com estrutura variável (catálogo, CMS, perfis) |
| **Key-Value** (chave-valor) | Acesso por chave única, valor opaco | Cache, sessão, contadores, filas simples |
| **Column-Family** (família de colunas) | Colunas agrupadas, leitura eficiente em colunas específicas | Analytics, séries temporais, telemetria em alta escala |
| **Graph** (grafo) | Nós e arestas como estrutura primária de armazenamento | Redes sociais, recomendação, detecção de fraude |

**Quando usar**: o volume de escrita passa do que um banco relacional absorve, o schema dos dados varia de registro para registro, o acesso é sempre o mesmo e já se conhece de antemão (busca por chave, leitura do documento inteiro), ou o grafo é a forma natural dos dados.

**O que não fazer**: adotar NoSQL pela fama de "escalar melhor", sem medir nada. Um banco relacional bem indexado aguenta um volume muito maior do que a maioria dos projetos vai atingir, e o NoSQL adiciona complexidade operacional real.

---

## O que deixa uma query rápida

O gargalo quase sempre vem da query mal escrita ou do índice ausente. Trocar o hardware custa caro e
adia o problema por alguns meses.

### Índices

O índice é uma estrutura auxiliar que o banco consulta para achar as linhas sem varrer a tabela inteira.

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

- Indexe a coluna que aparece em WHERE, JOIN e ORDER BY e que separa bem os registros
- Deixe sem índice a coluna com poucos valores distintos (`boolean`, `gender`); nesse caso o banco escolhe o full scan de propósito, porque sai mais barato
- Cada índice tem custo de escrita: todo INSERT, UPDATE e DELETE atualiza os índices da tabela
- A função aplicada na coluna do WHERE desliga o índice. O `WHERE LOWER(email) = ?` ignora o índice de `email`, então crie um índice funcional ou grave o valor já normalizado no insert. O mesmo vale para `CAST` e `CONVERT`: converta o parâmetro e deixe a coluna intacta. Ver [sql/performance.md](../../sql/conventions/advanced/performance.md#cast-and-type-conversion)

### Boas práticas de query

Padrões com BAD/GOOD completos: [sql/conventions/advanced/performance.md](../../sql/conventions/advanced/performance.md).

### Consultas NoSQL

O NoSQL tem os próprios anti-padrões, e o princípio que os resolve é o mesmo do SQL: filtrar e projetar no servidor sai mais barato do que trazer o dado pela rede para descartar no cliente.

Guia completo por SGBD: [docs/nosql/](../../nosql/). Convenções de **CRUD** (Create Read Update Delete · Criar Ler Atualizar Excluir), naming e performance: [nosql/conventions/](../../nosql/conventions/).

<details>
<summary>❌ Ruim: sem projeção: trafega o documento inteiro para usar um campo</summary>

```js
const user = await database.collection('users').findOne({ email });
const userName = user.name;
```

</details>

<details>
<summary>✅ Bom: projeção limita os campos retornados</summary>

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

<details>
<summary>❌ Ruim: filtro em memória: carrega a coleção inteira para filtrar no cliente</summary>

```js
const allOrders = await database.collection('orders').find({}).toArray();
const pendingOrders = allOrders.filter(order => order.status === 'pending');
```

</details>

<details>
<summary>✅ Bom: filtro na query: banco usa índice em status</summary>

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

<details>
<summary>❌ Ruim: N+1 em document store: uma query por item para buscar documento relacionado</summary>

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

<details>
<summary>✅ Bom: $lookup resolve em uma única passagem no banco</summary>

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
      { $unwind: '$product' }, // drops orders with no matching product: use preserveNullAndEmptyArrays: true if product can be missing
    ]).toArray();

    return enrichedOrders;
  }
}
```

</details>

---

<a id="batch-operations"></a>

## Operações em lote

A operação em lote junta várias linhas em uma instrução só, ou parte uma operação enorme em ciclos
menores. São dois objetivos diferentes: o primeiro aumenta o volume que passa por segundo em uma
carga inicial, e o segundo evita que uma manutenção segure a tabela travada por minutos.

| Padrão | Quando usar |
|---|---|
| **Batch INSERT** | Inserir muitos registros de uma vez: importação, ETL, seed de dados |
| **Chunked UPDATE/DELETE** | Atualizar ou remover grandes volumes sem bloquear a tabela por minutos |
| **BULK INSERT / COPY** | Importar arquivos CSV ou binários diretamente no banco, sem round trips pela aplicação |
| **Staging table** | Validar dados externos antes de inserir na tabela de produção |
| **Scheduled job** | Executar operações periódicas (limpeza, agregação, arquivamento) sem intervenção manual |

### Tamanho do lote

Nenhum número serve para todos os casos. O que decide é quanto tempo de lock o seu sistema tolera.

- Entre 1.000 e 5.000 linhas por lote é um ponto de partida seguro na maioria dos casos
- O lote pequeno demais multiplica as idas ao banco e o custo de abrir e fechar transação
- O lote grande demais segura o lock por mais tempo e deixa o rollback caro quando algo falha

O job em lote que roda em produção precisa ser idempotente: se ele cair no meio, a execução seguinte
retoma de onde parou, sem duplicar nem corromper dado. O jeito mais simples de conseguir isso é usar
o próprio filtro do UPDATE ou do DELETE como cursor, porque o WHERE já deixa de fora as linhas que as
iterações anteriores processaram.

Padrões de query: [sql/conventions/advanced/batch.md](../../sql/conventions/advanced/batch.md).

Recursos específicos por banco: [SQL Server](../../sql/sgbd/sql-server.md#batch-operations) | [PostgreSQL](../../sql/sgbd/postgres.md#batch-operations).

---

## Plano de execução

O plano de execução mostra o caminho que o banco vai seguir para responder a query: quais índices ele usa, como resolve cada join e quanto estima gastar em cada passo.

**Antes de levar qualquer query a uma tabela grande em produção, leia o plano.**

Sintaxe por banco: [PostgreSQL](../../sql/sgbd/postgres.md#diagnostics) | [SQL Server](../../sql/sgbd/sql-server.md#diagnostics).

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

Um `Seq Scan` com `Filter` em tabela grande é o sinal mais claro de índice ausente.

---

## Diagnosticar o gargalo

### Log de queries lentas

A investigação começa aqui. Ligue o log de queries lentas e deixe o banco apontar quais consultas passaram do tempo limite que você definiu.

Configuração por banco: [PostgreSQL](../../sql/sgbd/postgres.md#diagnostics) | [SQL Server](../../sql/sgbd/sql-server.md#diagnostics).

### Como o N+1 aparece em produção

O N+1 é difícil de ver no código e fácil de ver no log de queries. O sinal é uma sequência rápida de consultas idênticas, com o ID mudando a cada linha.

```
-- sinal de N+1 no log
SELECT * FROM customers WHERE id = 1  -- 0.1ms
SELECT * FROM customers WHERE id = 2  -- 0.1ms
SELECT * FROM customers WHERE id = 3  -- 0.1ms
... (100 vezes)
```

Ferramentas que denunciam o N+1 sozinhas: **Bullet** (Rails), **Hibernate Statistics**, **EF Core logging**, **Sequelize logging mode**.

### Pool de conexões esgotado

Com todas as conexões do pool ocupadas, a requisição nova entra na fila e espera. O sintoma é enganoso: requisições simples, que sempre foram rápidas, começam a estourar timeout, enquanto a **CPU** (Central Processing Unit · Unidade Central de Processamento) permanece baixa e as queries mantêm o tempo de sempre.

Diagnóstico por banco: [PostgreSQL](../../sql/sgbd/postgres.md#diagnostics) | [SQL Server](../../sql/sgbd/sql-server.md#diagnostics).

Causas comuns: query longa segurando a conexão, transação que ninguém fechou, pool dimensionado abaixo da carga, pico de tráfego fora do previsto.

### Locks e deadlocks

O lock faz parte do funcionamento normal: ele é o mecanismo que mantém a consistência. O problema aparece quando o lock dura demais ou vira deadlock.

**Identificar locks ativos**: [PostgreSQL](../../sql/sgbd/postgres.md#diagnostics) | [SQL Server](../../sql/sgbd/sql-server.md#diagnostics).

O **deadlock** chega ao log com mensagem própria, e a causa costuma ser sempre a mesma: duas transações tocam as mesmas linhas em ordem trocada, e cada uma fica esperando o lock que a outra segura. A saída é padronizar a ordem de acesso.

```
-- padrão que gera deadlock
Transação A: lock em orders(1) → tenta lock em payments(1)
Transação B: lock em payments(1) → tenta lock em orders(1)  ← deadlock

-- solução: sempre adquirir locks na mesma ordem
Transação A: lock em orders(1) → lock em payments(1)
Transação B: lock em orders(1) → lock em payments(1)  ← espera A terminar
```

### Checklist de investigação

Quando alguém chegar dizendo que "o banco está lento", percorra esta ordem:

1. Abra o log de queries lentas (é uma query específica ou a carga inteira?)
2. Rode `EXPLAIN ANALYZE` na query suspeita (tem Seq Scan em tabela grande?)
3. Olhe as conexões ativas (o pool esgotou?)
4. Procure lock de longa duração (alguma transação ficou presa?)
5. Confira o volume de dados (a tabela cresceu e o índice perdeu eficiência?)
6. Confira os índices da tabela (algum foi removido ou nunca chegou a existir?)

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
