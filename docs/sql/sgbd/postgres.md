# PostgreSQL

> Escopo: PostgreSQL 18. Referência: [postgresql.org/docs/18](https://www.postgresql.org/docs/18/).
>
> Este documento cobre idiomas e recursos específicos do PostgreSQL. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).
>
> **Naming no PostgreSQL**: `snake_case` para tabelas, colunas e funções — conforme a convenção da
> comunidade. Princípios de nomenclatura são os mesmos do guia principal.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PL/pgSQL** | Linguagem procedural nativa do PostgreSQL para functions e procedures |
| **RETURNING** | Cláusula que retorna linhas afetadas por INSERT, UPDATE, DELETE ou MERGE |
| **JSONB** | JSON armazenado em formato binário com suporte a índices GIN; preferível a `JSON` |
| **CTE** (Common Table Expression, Expressão de Tabela Comum) | Resultado nomeado via `WITH`; no PostgreSQL, `WITH` em DML pode ser usado com `RETURNING` |
| **AIO** (Asynchronous I/O, Entrada e Saída Assíncrona) | Subsistema do PostgreSQL 18 que emite múltiplas operações de I/O em paralelo |
| **UUID v7** | UUID com prefixo de timestamp; gerado via `uuidv7()` nativo no PostgreSQL 18 |
| **Temporal constraint** | Constraint sobre intervalos de tempo (PRIMARY KEY, UNIQUE, FK); disponível no PostgreSQL 18 |

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
<summary>❌ Bad — tipos imprecisos e sem timezone</summary>
<br>

```sql
CREATE TABLE orders (
  id         SERIAL,            -- serial é alias legado; prefira GENERATED ALWAYS AS IDENTITY
  price      FLOAT,             -- ponto flutuante: impreciso para moeda
  created_at TIMESTAMP          -- sem fuso horário: problema em sistemas distribuídos
);
```

</details>

<br>

<details>
<summary>✅ Good — tipos explícitos, UUID v7, TIMESTAMPTZ</summary>
<br>

```sql
CREATE TABLE orders (
  id          UUID         NOT NULL DEFAULT uuidv7(),
  customer_id UUID         NOT NULL,
  total       NUMERIC(10, 2) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id)
);
```

</details>

## UUID v7 nativo (PostgreSQL 18)

PostgreSQL 18 inclui `uuidv7()` nativo: UUID com prefixo de timestamp de alta resolução.
Sequencial, sem fragmentação de índice, com unicidade global.

<details>
<summary>✅ Good — UUID v7 como DEFAULT, sem geração na aplicação</summary>
<br>

```sql
CREATE TABLE events (
  id         UUID        NOT NULL DEFAULT uuidv7(),
  type       VARCHAR(50) NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_events PRIMARY KEY (id)
);
```

</details>

## GENERATED ALWAYS AS IDENTITY

Substitui `SERIAL`. Padrão SQL, compatível com `INSERT ... RETURNING`, sem a sequência implícita
criada pelo `SERIAL`.

<details>
<summary>❌ Bad — SERIAL cria uma sequência implícita difícil de inspecionar</summary>
<br>

```sql
CREATE TABLE customers (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL
);
```

</details>

<br>

<details>
<summary>✅ Good — GENERATED ALWAYS AS IDENTITY</summary>
<br>

```sql
CREATE TABLE customers (
  id   INTEGER GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(200) NOT NULL,

  CONSTRAINT pk_customers PRIMARY KEY (id)
);
```

</details>

## RETURNING

`RETURNING` retorna as linhas afetadas por INSERT, UPDATE, DELETE ou MERGE — sem query adicional.

No PostgreSQL 18, `RETURNING` suporta `OLD` e `NEW` em UPDATE e DELETE para acessar o valor
antes e depois da operação.

<details>
<summary>❌ Bad — query adicional para recuperar o ID após INSERT</summary>
<br>

```sql
INSERT INTO orders (customer_id, total) VALUES (@customer_id, @total);
SELECT LASTVAL(); -- necessário para recuperar o ID
```

</details>

<br>

<details>
<summary>✅ Good — RETURNING retorna o ID na mesma operação</summary>
<br>

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
UPDATE orders
SET
  status = 'shipped'
WHERE
  orders.id = $1
RETURNING
  OLD.status AS previous_status,
  NEW.status AS current_status;
```

</details>

## Functions (PL/pgSQL)

### RETURNS TABLE

Prefira `RETURNS TABLE` a `RETURNS SETOF` para funções que retornam linhas com colunas nomeadas.

<details>
<summary>❌ Bad — RETURNS VOID, SELECT * dentro de function</summary>
<br>

```sql
CREATE FUNCTION get_team(team_id INT) RETURNS VOID AS $$
BEGIN
  SELECT * FROM football_teams WHERE id = team_id;
END;
$$ LANGUAGE plpgsql;
```

</details>

<br>

<details>
<summary>✅ Good — RETURNS TABLE com colunas declaradas, RETURN QUERY</summary>
<br>

```sql
CREATE OR REPLACE FUNCTION fn_get_football_team_by_id
(
  p_team_id UUID
)
RETURNS TABLE
(
  id                UUID,
  name              VARCHAR,
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

## CTEs em DML

No PostgreSQL, CTEs podem ser usadas com INSERT, UPDATE e DELETE via `WITH ... RETURNING`.
Permite encadear operações em uma única instrução.

<details>
<summary>✅ Good — mover registro de tabela de origem para destino em uma instrução</summary>
<br>

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

## JSONB: índice GIN

`JSONB` suporta índice GIN para busca eficiente em documentos JSON, sem precisar conhecer a
estrutura completa em tempo de definição do schema.

<details>
<summary>❌ Bad — coluna JSON sem índice: full table scan em todo acesso</summary>
<br>

```sql
CREATE TABLE events (
  id      UUID  NOT NULL DEFAULT uuidv7(),
  payload JSON  NOT NULL -- JSON, não JSONB: sem suporte a índice GIN
);

-- full scan: lento em tabelas grandes
SELECT events.id
FROM events
WHERE events.payload->>'type' = 'order.created';
```

</details>

<br>

<details>
<summary>✅ Good — JSONB com índice GIN e operador @></summary>
<br>

```sql
CREATE TABLE events (
  id      UUID  NOT NULL DEFAULT uuidv7(),
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

## Índice parcial

Índice criado apenas sobre as linhas que satisfazem uma condição. Menor que o índice completo,
mais eficiente para queries que sempre filtram pelo mesmo critério.

<details>
<summary>✅ Good — índice apenas em pedidos pendentes</summary>
<br>

```sql
-- sem índice parcial: índice cobre todos os status, incluindo os finalizados
CREATE INDEX ix_orders_status ON orders (status);

-- com índice parcial: cobre apenas os pedidos ativos — menores e mais rápidos
CREATE INDEX ix_orders_pending
  ON orders (created_at)
  WHERE status = 'pending';
```

</details>

## Paginação

<details>
<summary>✅ Good — LIMIT / OFFSET</summary>
<br>

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

## Window functions

Window functions calculam agregações sem colapsar as linhas, permitindo ranking, acumulados e
comparações com linhas adjacentes.

<details>
<summary>✅ Good — ranking de jogadores por número de camisa por time</summary>
<br>

```sql
SELECT
  players.name,
  players.squad_number,
  players.team_id,
  ROW_NUMBER() OVER (
    PARTITION BY players.team_id
    ORDER BY players.squad_number
  ) AS PositionInTeam
FROM
  players
WHERE
  players.is_active = TRUE;
```

</details>

## LISTEN / NOTIFY

Mecanismo de pub/sub nativo do PostgreSQL para notificações assíncronas entre sessões.
Útil para invalidar cache ou disparar processamento sem polling.

<details>
<summary>✅ Good — notificar canal quando pedido é criado</summary>
<br>

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

### AIO — Asynchronous I/O

PostgreSQL 18 introduz um subsistema de **AIO** que emite múltiplas operações de I/O em paralelo,
em vez de aguardar cada leitura em sequência. Benchmarks mostram ganhos de até 3x em sequential
scans e vacuum em cargas de trabalho I/O-bound. Não requer configuração: ativo por padrão.

### uuidv7() nativo

`uuidv7()` está disponível sem extensão a partir do PostgreSQL 18. Combina prefixo de timestamp
de microsegundo com aleatoriedade, produzindo UUIDs sequenciais que não fragmentam índices B-tree.

```sql
SELECT uuidv7(); -- ex: 01926ef0-b4d7-7c3a-a0e1-2f3b4c5d6e7f
```

### Virtual generated columns (padrão)

Colunas geradas agora são virtuais por padrão: calculadas na leitura, sem armazenamento em disco.

```sql
CREATE TABLE orders (
  id          UUID           NOT NULL DEFAULT uuidv7(),
  amount      NUMERIC(10, 2) NOT NULL,
  tax_rate    NUMERIC(5, 4)  NOT NULL DEFAULT 0.12,
  total       NUMERIC(10, 2) GENERATED ALWAYS AS (amount * (1 + tax_rate)) VIRTUAL,

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

### Temporal constraints (PostgreSQL 18)

Constraints sobre intervalos de tempo para PRIMARY KEY, UNIQUE e FOREIGN KEY. Garantem unicidade
ou integridade referencial dentro de um período específico.

```sql
CREATE TABLE employee_roles (
  employee_id UUID     NOT NULL,
  role        VARCHAR  NOT NULL,
  valid_from  DATE     NOT NULL,
  valid_until DATE     NOT NULL,

  CONSTRAINT pk_employee_roles
    PRIMARY KEY (employee_id, valid_from, valid_until)
    WITHOUT OVERLAPS
);
```

## Recursos relacionados

- [Formatting](../conventions/formatting.md) — estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md) — snake_case no PostgreSQL, prefixos, constraints
- [Performance](../conventions/advanced/performance.md) — índices, UUID vs BIGINT
- [Null Safety](../conventions/advanced/null-safety.md) — IS DISTINCT FROM, NULL em ORDER BY
- [SQL Server](./sql-server.md) — idiomas específicos do SQL Server
