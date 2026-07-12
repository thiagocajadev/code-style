# PostgreSQL

> Escopo: PostgreSQL 18. Referência: [postgresql.org/docs/18](https://www.postgresql.org/docs/18/).
>
> Este documento cobre idioms e recursos específicos do PostgreSQL. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).
>
> **Naming no PostgreSQL**: `snake_case` para tabelas, colunas e funções, conforme a convenção da
> comunidade. Princípios de nomenclatura são os mesmos do guia principal.

O PostgreSQL resolve dentro do banco várias coisas que em outros bancos você resolveria na aplicação. Ele guarda JSON com índice, guarda listas e intervalos em uma coluna, devolve a linha que acabou de gravar e ainda agenda tarefas. Esta página cobre o que é próprio dele: a linguagem `PL/pgSQL` para escrever functions, o `EXPLAIN ANALYZE` para descobrir por que a query está lenta, o `COPY` para carregar muitos registros de uma vez e o `pg_cron` para agendar rotinas.

O naming aqui segue o costume da comunidade PostgreSQL: `snake_case` minúsculo para tabelas, colunas e funções. Os princípios de nomenclatura são os mesmos do guia; muda a caixa.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PL/pgSQL** (Procedural Language/PostgreSQL · linguagem procedural do PostgreSQL) | Linguagem nativa do PostgreSQL para functions e procedures |
| **RETURNING** (cláusula de retorno) | Cláusula que retorna linhas afetadas por INSERT, UPDATE, DELETE ou MERGE |
| **JSONB** (JSON Binário) | JSON armazenado em formato binário com suporte a índices GIN; preferível a `JSON` |
| **CTE** (Common Table Expression · Expressão de Tabela Comum) | Resultado nomeado via `WITH`; no PostgreSQL, `WITH` em DML pode ser usado com `RETURNING` |
| **AIO** (Asynchronous I/O · Entrada e Saída Assíncrona) | Subsistema do PostgreSQL 18 que emite múltiplas operações de I/O em paralelo |
| **UUID v7** (Universally Unique Identifier versão 7) | UUID com prefixo de timestamp; gerado via `uuidv7()` nativo no PostgreSQL 18 |
| **Temporal constraint** (restrição temporal) | Constraint sobre intervalos de tempo (PRIMARY KEY, UNIQUE, FK); disponível no PostgreSQL 18 |

## Tipos de dados

| Categoria | Tipo | Uso |
| --- | --- | --- |
| Inteiro | `INTEGER`, `BIGINT`, `SMALLINT` | IDs numéricos, contagens |
| Identificador | `UUID` | IDs globais; `uuidv7()` no PostgreSQL 18 |
| Texto | `VARCHAR(n)`, `TEXT` | `TEXT` sem limite; `VARCHAR(n)` com comprimento explícito |
| Data/Hora | `TIMESTAMPTZ` | Timestamp com fuso horário; preferível a `TIMESTAMP` |
| Data | `DATE` | Quando hora não é necessária |
| Booleano | `BOOLEAN` | `TRUE` / `FALSE` |
| Decimal | `NUMERIC(p, s)` | Valores monetários, nunca `FLOAT` |
| JSON binário | `JSONB` | Documentos semi-estruturados; suporta índices GIN |
| Array | `tipo[]` | Lista homogênea; prefira tabela associativa para listas grandes |
| Enum | `CREATE TYPE ... AS ENUM` | Conjunto fixo de valores; migração cuidadosa ao alterar |

<details>
<summary>❌ Ruim: tipos imprecisos e sem timezone</summary>

```sql
CREATE TABLE orders (
  id SERIAL, -- serial é alias legado; prefira GENERATED ALWAYS AS IDENTITY
  price FLOAT, -- ponto flutuante: impreciso para moeda
  created_at TIMESTAMP -- sem fuso horário: problema em sistemas distribuídos
);
```

</details>

<details>
<summary>✅ Bom: tipos explícitos, UUID v7, TIMESTAMPTZ</summary>

```sql
CREATE TABLE orders (
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id)
);
```

</details>

<a id="native-uuid-v7"></a>

## O PostgreSQL 18 gera UUID v7 sozinho

A função `uuidv7()` já vem no banco. O identificador que ela devolve começa pelo horário de criação, então cada linha nova entra no fim do índice e o banco não precisa partir páginas cheias para abrir espaço. O detalhe prático é que ele cabe num `DEFAULT` da coluna, e a aplicação não precisa gerar identificador nenhum antes de inserir.

<details>
<summary>✅ Bom: UUID v7 como DEFAULT, sem geração na aplicação</summary>

```sql
CREATE TABLE events (
  id UUID NOT NULL DEFAULT uuidv7(),
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_events PRIMARY KEY (id)
);
```

</details>

<a id="generated-always-as-identity"></a>

## GENERATED ALWAYS AS IDENTITY no lugar de SERIAL

O `SERIAL` cria por baixo uma sequência com nome próprio, e essa sequência não aparece na definição da tabela. Para descobrir o nome dela, alterar o passo ou reiniciar a contagem, você precisa ir procurar. O `GENERATED ALWAYS AS IDENTITY` faz o mesmo trabalho, está no padrão **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) e deixa a declaração inteira visível na coluna.

<details>
<summary>❌ Ruim: SERIAL cria uma sequência implícita difícil de inspecionar</summary>

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL
);
```

</details>

<details>
<summary>✅ Bom: GENERATED ALWAYS AS IDENTITY</summary>

```sql
CREATE TABLE customers (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(200) NOT NULL,

  CONSTRAINT pk_customers PRIMARY KEY (id)
);
```

</details>

<a id="returning"></a>

## RETURNING devolve a linha gravada na mesma ida ao banco

Depois de um `INSERT`, a aplicação costuma precisar do identificador que o banco gerou. Sem `RETURNING`, isso vira uma segunda query, e a segunda query custa outra ida e volta pela rede. O `RETURNING id` faz o próprio `INSERT` devolver o valor.

No PostgreSQL 18 ele ficou mais útil: em `UPDATE` e `DELETE`, você pede `OLD` e `NEW` para receber o valor antes e depois da alteração, na mesma resposta.

<details>
<summary>❌ Ruim: query adicional para recuperar o ID após INSERT</summary>

```sql
INSERT INTO orders (customer_id, total) VALUES (@customer_id, @total);
SELECT LASTVAL(); -- necessário para recuperar o ID
```

</details>

<details>
<summary>✅ Bom: RETURNING retorna o ID na mesma operação</summary>

```sql
-- INSERT com RETURNING
INSERT INTO orders
(
  customer_id,
  total
)
VALUES
(
  $1,
  $2
)
RETURNING
  orders.id,
  orders.created_at;

-- UPDATE com NEW e OLD (PostgreSQL 18)
UPDATE
  orders
SET
  orders.status = 'shipped'
WHERE
  orders.id = $1
RETURNING
  OLD.status AS previous_status,
  NEW.status AS current_status;
```

</details>

<a id="functions"></a>

## Functions em PL/pgSQL

O **PL/pgSQL** (Procedural Language/PostgreSQL · linguagem procedural do PostgreSQL) é a linguagem em que se escrevem as functions do banco. Ela acrescenta ao SQL o que o SQL não tem: variáveis, `IF`, laços e tratamento de erro.

O nome da function segue o idioma do banco: `snake_case` minúsculo com o prefixo `fn_`, e isso vale também para os parâmetros e para as colunas devolvidas. O parâmetro leva o prefixo `p_` (`p_team_id`) porque, sem ele, um parâmetro chamado `team_id` colide com a coluna `team_id` dentro do corpo, e o PL/pgSQL não sabe a qual dos dois você se refere.

### RETURNS TABLE

`RETURNS TABLE` declara o nome e o tipo de cada coluna que a function devolve, e quem chama sabe o que vai receber. `RETURNS VOID` não devolve nada: o `SELECT` de dentro da function roda e o resultado se perde.

<details>
<summary>❌ Ruim: RETURNS VOID, SELECT * dentro de function</summary>

```sql
CREATE FUNCTION get_team(team_id INT) RETURNS VOID AS $$
BEGIN
  SELECT * FROM football_teams WHERE id = team_id;
END;
$$ LANGUAGE plpgsql;
```

</details>

<details>
<summary>✅ Bom: RETURNS TABLE com colunas declaradas, RETURN QUERY</summary>

```sql
CREATE OR REPLACE FUNCTION fn_get_football_team_by_id
(
  p_team_id UUID
)
RETURNS TABLE
(
  id UUID,
  name VARCHAR,
  championships_won INT
) AS $$

BEGIN
  RETURN QUERY
  SELECT
    football_teams.id,
    football_teams.name,
    football_teams.championships_won
  FROM
    football_teams
  WHERE
    football_teams.id = p_team_id;
END;

$$ LANGUAGE plpgsql;
```

</details>

<a id="ctes-in-dml"></a>

## A CTE do PostgreSQL também escreve

Em muitos bancos a CTE só lê. No PostgreSQL ela pode conter `INSERT`, `UPDATE` ou `DELETE`, e o `RETURNING` entrega as linhas afetadas para o passo seguinte da mesma instrução.

Isso permite mover um registro de uma tabela para outra em um comando só: a CTE apaga o rascunho e devolve os dados apagados, e o `INSERT` de fora grava esses dados na tabela de pedidos. Como é uma instrução única, ou as duas coisas acontecem, ou nenhuma acontece.

<details>
<summary>✅ Bom: mover registro de tabela de origem para destino em uma instrução</summary>

```sql
WITH deleted_order AS
(
  DELETE FROM order_drafts
  WHERE
    order_drafts.id = $1
  RETURNING
    order_drafts.customer_id,
    order_drafts.total,
    order_drafts.created_at
)

INSERT INTO orders
(
  customer_id,
  total,
  created_at
)
SELECT
  deleted_order.customer_id,
  deleted_order.total,
  deleted_order.created_at
FROM
  deleted_order
RETURNING
  orders.id;
```

</details>

<a id="jsonb-gin-index"></a>

## JSONB guarda documento e ainda aceita índice

A coluna `JSONB` guarda um documento **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) em formato binário, e o banco entende o conteúdo dela. Isso serve para o dado cuja forma você não conhece de antemão, como o corpo de um evento que muda de tipo para tipo.

Escolha `JSONB` e não `JSON`. O tipo `JSON` guarda o texto cru e não aceita o índice **GIN**, o índice que o PostgreSQL usa para procurar dentro do documento. Sem ele, toda busca por uma chave do JSON lê a tabela inteira.

<details>
<summary>❌ Ruim: coluna JSON sem índice: full table scan em todo acesso</summary>

```sql
CREATE TABLE events (
  id UUID NOT NULL DEFAULT uuidv7(),
  payload JSON NOT NULL -- JSON, não JSONB: sem suporte a índice GIN
);

-- full scan: lento em tabelas grandes
SELECT events.id
FROM events
WHERE events.payload->>'type' = 'order.created';
```

</details>

<details>
<summary>✅ Bom: JSONB com índice GIN e operador @></summary>

```sql
CREATE TABLE events (
  id UUID NOT NULL DEFAULT uuidv7(),
  payload JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT pk_events PRIMARY KEY (id)
);

CREATE INDEX ix_events_payload ON events USING GIN (payload);

-- busca eficiente via operador @> (contains)
SELECT
  events.id,
  events.payload
FROM
  events
WHERE
  events.payload @> '{"type": "order.created"}';
```

</details>

<a id="partial-index"></a>

## O índice parcial cobre só as linhas que interessam

Se toda query de pedidos pendentes filtra por `status = 'pending'`, e os pendentes são 2% da tabela, um índice sobre a tabela inteira guarda 98% de linhas que aquelas queries nunca vão consultar. O índice parcial (`WHERE status = 'pending'`) indexa só os pendentes: ele ocupa menos disco, cabe mais facilmente em memória e é mais rápido de manter a cada escrita.

<details>
<summary>✅ Bom: índice apenas em pedidos pendentes</summary>

```sql
-- sem índice parcial: índice cobre todos os status, incluindo os finalizados
CREATE INDEX ix_orders_status ON orders (status);

-- com índice parcial: cobre apenas os pedidos ativos, menores e mais rápidos
CREATE INDEX ix_orders_pending
  ON orders (created_at)
  WHERE status = 'pending';
```

</details>

<a id="pagination"></a>

## Paginação

O PostgreSQL pagina com `LIMIT` e `OFFSET`: quantas linhas devolver e quantas pular. O `ORDER BY` acompanha, porque sem um critério de ordem o banco não tem como saber qual é a linha 21, e o mesmo registro pode reaparecer na página seguinte.

<details>
<summary>✅ Bom: LIMIT / OFFSET</summary>

```sql
SELECT
  football_teams.id,
  football_teams.name,
  football_teams.championships_won
FROM
  football_teams
WHERE
  football_teams.is_active = TRUE
ORDER BY
  football_teams.championships_won DESC
LIMIT $1 OFFSET $2;
```

</details>

<a id="window-functions"></a>

## Window functions calculam sem juntar as linhas

O `GROUP BY` colapsa: dez pedidos de um cliente viram uma linha com o total. A **window function** (função de janela) calcula o mesmo total e mantém as dez linhas, acrescentando o resultado como mais uma coluna em cada uma.

É o que permite responder perguntas como "qual a posição deste pedido no ranking do cliente" ou "quanto o cliente já tinha gasto até este pedido", sem perder o detalhe de cada linha.

<details>
<summary>✅ Bom: ranking de jogadores por número de camisa por time</summary>

```sql
SELECT
  players.name,
  players.squad_number,
  players.team_id,
  ROW_NUMBER() OVER (
    PARTITION BY players.team_id
    ORDER BY players.squad_number
  ) AS position_in_team
FROM
  players
WHERE
  players.is_active = TRUE;
```

</details>

<a id="listen-notify"></a>

## LISTEN e NOTIFY avisam a aplicação sem que ela pergunte

A aplicação que quer saber quando um pedido novo chega costuma perguntar ao banco de tempos em tempos, o que se chama **polling** (consulta repetida em intervalo fixo). O polling gasta query à toa quando nada mudou e ainda assim atrasa a notícia quando algo muda.

O `NOTIFY` inverte: quando a linha é gravada, o banco avisa. A aplicação declara `LISTEN` em um canal, um trigger dispara `NOTIFY` naquele canal a cada `INSERT`, e a mensagem chega na hora.

<details>
<summary>✅ Bom: notificar canal quando pedido é criado</summary>

```sql
-- função que notifica o canal 'orders' após INSERT
CREATE OR REPLACE FUNCTION fn_notify_order_created()
RETURNS TRIGGER AS $$

BEGIN
  PERFORM pg_notify('orders', row_to_json(NEW)::text);

  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

-- trigger que chama a função
CREATE TRIGGER trg_orders_on_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_order_created();
```

</details>

## Recursos do PostgreSQL 18

### Leitura de disco em paralelo (AIO)

O **AIO** (Asynchronous I/O · entrada e saída assíncrona) dispara várias leituras de disco ao mesmo tempo, em vez de pedir uma, esperar a resposta, e só então pedir a próxima. Nos testes publicados, a varredura sequencial e o vacuum chegam a ficar 3x mais rápidos quando o gargalo é o disco. Ele vem ligado, sem configuração.

### uuidv7() nativo

`uuidv7()` está disponível sem extensão a partir do PostgreSQL 18. Combina prefixo de timestamp
de microsegundo com aleatoriedade, produzindo UUIDs sequenciais que não fragmentam índices B-tree.

```sql
SELECT uuidv7(); -- ex: 01926ef0-b4d7-7c3a-a0e1-2f3b4c5d6e7f
```

### Coluna calculada na leitura, sem ocupar disco

A **generated column** (coluna gerada) guarda uma fórmula em vez de um valor: o `total` de um pedido sai de `amount * (1 + tax_rate)`, e ninguém precisa lembrar de atualizá-lo quando o valor mudar. A partir do PostgreSQL 18, ela é calculada no momento da leitura e não ocupa espaço em disco.

```sql
CREATE TABLE orders (
  id UUID NOT NULL DEFAULT uuidv7(),
  amount NUMERIC(10, 2) NOT NULL,
  tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.12,
  total NUMERIC(10, 2) GENERATED ALWAYS AS (amount * (1 + tax_rate)) VIRTUAL,

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

### Constraint que entende período de validade

O `WITHOUT OVERLAPS` faz a chave primária considerar o intervalo de datas. No exemplo, o mesmo funcionário pode ocupar o mesmo cargo em dois períodos diferentes, e o banco recusa dois períodos que se sobrepõem. A regra "ninguém tem dois cargos ao mesmo tempo" passa a ser garantida pelo banco.

```sql
CREATE TABLE employee_roles (
  employee_id UUID NOT NULL,
  role VARCHAR NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,

  CONSTRAINT pk_employee_roles
    PRIMARY KEY (employee_id, valid_from, valid_until)
    WITHOUT OVERLAPS
);
```

<a id="batch-operations"></a>

## Operações em lote

### COPY

O `COPY` move dados entre um arquivo, como um **CSV** (Comma-Separated Values · valores separados por vírgula), e uma tabela. Ele existe para a carga grande, e a diferença para um `INSERT` por linha é enorme: o banco lê o arquivo de uma vez, sem interpretar um comando novo a cada linha, e a aplicação não fica indo e voltando pela rede a cada registro.

<details>
<summary>✅ Bom: importar CSV com COPY (arquivo no servidor)</summary>

```sql
COPY players
(
  name,
  position,
  team_id
)
FROM '/imports/players.csv'
WITH
(
  FORMAT csv,
  HEADER true,
  DELIMITER ','
);
```

</details>

<details>
<summary>✅ Bom: \copy (arquivo local via cliente psql)</summary>

```sql
-- \copy lê o arquivo na máquina do cliente, não no servidor
\copy players (name, position, team_id)
FROM 'players.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',')
```

</details>

### pg_cron

O `pg_cron` é uma extensão que agenda tarefas dentro do próprio banco, com a mesma sintaxe do cron do Linux. A limpeza noturna de registros antigos deixa de precisar de um serviço à parte só para disparar um `DELETE`. Ele exige `shared_preload_libraries = 'pg_cron'` no `postgresql.conf`, o que significa reiniciar o banco uma vez.

<details>
<summary>✅ Bom: agendar limpeza diária com pg_cron</summary>

```sql
-- habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- agendar job: todo dia às 02:00
SELECT cron.schedule(
  'clean-inactive-players',
  '0 2 * * *',
  $$
    DELETE FROM players
    WHERE
      players.is_active = FALSE AND
      players.inactivated_at < NOW() - INTERVAL '1 year';
  $$
);

-- listar jobs ativos
SELECT * FROM cron.job;

-- remover job
SELECT cron.unschedule('clean-inactive-players');
```

</details>

---

<a id="diagnostics"></a>

## Diagnóstico

Quando o banco fica lento, estas quatro perguntas cobrem a maior parte dos casos: quais queries demoram, o que o banco faz para resolver uma query específica, quantas conexões estão abertas e quem está travando quem.

### Registrar as queries lentas

O `log_min_duration_statement` manda o PostgreSQL escrever no log toda query que passar do tempo que você definir. Com 500 ms, as queries rápidas não poluem o log e as lentas ficam registradas com o texto completo.

`postgresql.conf`:

```
log_min_duration_statement = 500 # loga queries acima de 500ms
log_statement = 'none'
```

### Plano de execução

O `EXPLAIN` mostra o caminho que o banco pretende seguir, sem rodar a query. O `EXPLAIN ANALYZE` roda de verdade e mostra o tempo real de cada passo, o que revela quando a estimativa do otimizador está longe do que aconteceu.

```sql
-- EXPLAIN: mostra o plano sem executar
EXPLAIN
SELECT
  orders.id,
  orders.total
FROM
  orders
WHERE
  orders.status = 'pending';

-- EXPLAIN ANALYZE: executa e mostra tempo real
EXPLAIN ANALYZE
SELECT
  orders.id,
  orders.total
FROM
  orders
WHERE
  orders.status = 'pending';
```

No plano, `Seq Scan` significa que o banco leu a tabela inteira. Numa tabela grande, acompanhado de um `Filter`, é o sinal mais direto de que falta um índice para aquele filtro.

### Conexões ativas

A tabela `pg_stat_activity` mostra o que cada conexão está fazendo. Muitas conexões em `idle in transaction` apontam para transação aberta e esquecida na aplicação, e elas seguram locks enquanto durarem.

```sql
-- conexões por estado (diagnóstico de pool exhaustion)
SELECT
  state,
  COUNT(*) AS total
FROM
  pg_stat_activity
GROUP BY
  state;
```

### Queries lentas e locks

A primeira query lista o que está rodando há mais de cinco segundos, com o texto e o `pid` de cada uma. A segunda mostra quem está esperando por quem: quando uma transação segura o lock que outra precisa, é aqui que o par aparece.

```sql
-- queries em execução há mais de 5 segundos
SELECT
  pg_stat_activity.pid,
  now() - pg_stat_activity.query_start AS duration,
  pg_stat_activity.query,
  pg_stat_activity.state
FROM
  pg_stat_activity
WHERE
  pg_stat_activity.state != 'idle' AND
  now() - pg_stat_activity.query_start > interval '5 seconds';
```

---

## Recursos relacionados

- [Formatting](../conventions/formatting.md): estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md): snake_case no PostgreSQL, prefixos, constraints
- [Performance](../conventions/advanced/performance.md): índices, UUID vs BIGINT
- [Null Safety](../conventions/advanced/null-safety.md): IS DISTINCT FROM, NULL em ORDER BY
- [SQL Server](./sql-server.md): idioms específicos do SQL Server
