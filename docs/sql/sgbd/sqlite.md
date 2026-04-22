# SQLite

> Escopo: SQLite 3.53. Referência: [sqlite.org/docs.html](https://sqlite.org/docs.html).
>
> Este documento cobre idiomas e recursos específicos do SQLite. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).
>
> SQLite é um banco embutido: sem servidor, sem usuários, sem roles. O arquivo `.db` é o banco.
> Indicado para apps mobile, desktop, CLI, testes e edge computing. Não substitui PostgreSQL ou
> SQL Server em workloads de alta concorrência com múltiplas escritas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Type affinity** | Sistema de tipos do SQLite: colunas têm "afinidade" de tipo, não tipo rígido — qualquer valor pode ser armazenado em qualquer coluna |
| **WAL** (Write-Ahead Logging, Registro Antecipado de Escrita) | Modo de journaling que permite leituras concorrentes durante uma escrita; ativar em produção |
| **rowid** | ID inteiro implícito em toda tabela SQLite; PRIMARY KEY INTEGER é um alias de rowid |
| **FTS5** (Full-Text Search 5, Busca de Texto Integral 5) | Extensão embutida para indexação e busca textual eficiente |
| **OPFS** (Origin Private File System) | Sistema de arquivos privado de origem do navegador; suportado via WebAssembly no SQLite 3.53 |

## Type affinity

SQLite não enforce tipos rígidos. Uma coluna `INTEGER` aceita texto; uma coluna `TEXT` aceita
número. O tipo declarado define a **afinidade** usada para conversões implícitas.

| Afinidade | Regra de mapeamento | Exemplo de declaração |
| --- | --- | --- |
| `INTEGER` | Contém "INT" no tipo | `INT`, `INTEGER`, `BIGINT` |
| `TEXT` | Contém "CHAR", "CLOB" ou "TEXT" | `VARCHAR(n)`, `TEXT`, `NVARCHAR` |
| `REAL` | Contém "REAL", "FLOA" ou "DOUB" | `REAL`, `FLOAT`, `DOUBLE` |
| `NUMERIC` | Contém "NUM" ou "DEC"; ou "DATE"/"DATETIME" | `NUMERIC`, `DECIMAL`, `DATE` |
| `BLOB` | Sem correspondência — armazena como recebido | `BLOB`, ou coluna sem tipo |

<details>
<summary>❌ Bad — tipo não declarado, comportamento imprevisível</summary>
<br>

```sql
CREATE TABLE Orders (
  Id,         -- sem tipo: afinidade BLOB, aceita qualquer coisa
  TotalAmount -- sem tipo: somas podem retornar resultados inesperados
);
```

</details>

<br>

<details>
<summary>✅ Good — tipo declarado com afinidade explícita</summary>
<br>

```sql
CREATE TABLE Orders
(
  Id          INTEGER  NOT NULL,
  CustomerId  INTEGER  NOT NULL,
  TotalAmount NUMERIC  NOT NULL,
  Status      TEXT     NOT NULL DEFAULT 'Pending',
  CreatedAt   DATETIME NOT NULL DEFAULT (DATETIME('now')),

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);
```

</details>

## Foreign keys: ativação explícita

Foreign keys estão **desativadas por padrão** no SQLite. Precisam ser ativadas por conexão.

<details>
<summary>❌ Bad — FK declarada mas não enforçada: dados inválidos inseridos sem erro</summary>
<br>

```sql
-- sem PRAGMA foreign_keys = ON, esta inserção passa silenciosamente
INSERT INTO Orders (Id, CustomerId) VALUES (1, 999); -- CustomerId 999 não existe
```

</details>

<br>

<details>
<summary>✅ Good — ativar FK no início de cada conexão</summary>
<br>

```sql
PRAGMA foreign_keys = ON;

INSERT INTO Orders
(
  Id,
  CustomerId,
  TotalAmount
)
VALUES
(
  1,
  @CustomerId,
  @TotalAmount
);
```

</details>

## IDs no SQLite

`INTEGER PRIMARY KEY` é um alias direto para o `rowid` interno. A sequência é automática e
eficiente. Para unicidade global, armazene UUID como `TEXT`.

<details>
<summary>✅ Good — BIGINT sequencial via rowid alias</summary>
<br>

```sql
CREATE TABLE Customers
(
  Id   INTEGER NOT NULL,
  Name TEXT    NOT NULL,
  Email TEXT   NOT NULL,

  CONSTRAINT PK_Customers PRIMARY KEY (Id),  -- alias de rowid: auto-increment implícito
  CONSTRAINT UQ_Customers_Email UNIQUE (Email)
);
```

</details>

<br>

<details>
<summary>✅ Good — UUID como TEXT quando unicidade global é requisito</summary>
<br>

```sql
CREATE TABLE Events
(
  Id        TEXT     NOT NULL,
  Type      TEXT     NOT NULL,
  Payload   TEXT     NOT NULL DEFAULT '{}', -- JSON armazenado como TEXT
  CreatedAt DATETIME NOT NULL DEFAULT (DATETIME('now')),

  CONSTRAINT PK_Events PRIMARY KEY (Id) -- UUID v7 gerado na aplicação
);
```

</details>

## WAL mode

O modo padrão `DELETE` serializa leituras e escritas. O modo `WAL` permite leituras concorrentes
durante uma escrita, melhorando performance em aplicações com múltiplos leitores.

```sql
PRAGMA journal_mode = WAL;
```

Ativar junto com `PRAGMA synchronous = NORMAL` para melhor equilíbrio entre durabilidade e
performance em produção.

```sql
PRAGMA journal_mode  = WAL;
PRAGMA synchronous   = NORMAL;
PRAGMA foreign_keys  = ON;
PRAGMA cache_size    = -64000; -- 64 MB de cache em memória
```

## Transações

SQLite suporta três tipos de transações. O padrão é `DEFERRED` (leitura inicial, escrita ao
primeiro acesso). Para operações de escrita, use `IMMEDIATE` para adquirir o lock logo no início.

| Tipo | Comportamento | Quando usar |
| --- | --- | --- |
| `DEFERRED` (padrão) | Lock de leitura inicial; escrita ao primeiro `INSERT`/`UPDATE`/`DELETE` | Operações de leitura |
| `IMMEDIATE` | Lock de escrita imediato | Operações de escrita desde o início |
| `EXCLUSIVE` | Lock exclusivo total | Operações críticas sem leitores concorrentes |

<details>
<summary>✅ Good — transação IMMEDIATE para operação de escrita</summary>
<br>

```sql
BEGIN IMMEDIATE;

INSERT INTO Orders
(
  Id,
  CustomerId,
  TotalAmount
)
VALUES
(
  @Id,
  @CustomerId,
  @TotalAmount
);

INSERT INTO OrderItems
(
  OrderId,
  ProductId,
  Quantity
)
VALUES
(
  @Id,
  @ProductId,
  @Quantity
);

COMMIT;
```

</details>

## JSON: funções nativas

SQLite suporta funções JSON sem extensão desde a versão 3.38. Armazene JSON como `TEXT` e acesse
via `json_extract`, `json_object`, `json_array` e demais funções.

SQLite 3.53 adicionou `json_array_insert()` para inserir elemento em posição específica de um
array JSON.

<details>
<summary>✅ Good — armazenar e consultar JSON em coluna TEXT</summary>
<br>

```sql
-- armazenar
INSERT INTO Events
(
  Id,
  Type,
  Payload
)
VALUES
(
  @Id,
  'order.created',
  json_object('orderId', @OrderId, 'customerId', @CustomerId)
);

-- consultar campo específico do JSON
SELECT
  Events.Id,
  json_extract(Events.Payload, '$.orderId') AS OrderId,
  json_extract(Events.Payload, '$.customerId') AS CustomerId
FROM
  Events
WHERE
  Events.Type = 'order.created';
```

</details>

## FTS5: full-text search

`FTS5` (Full-Text Search 5) é uma extensão embutida para indexação e busca textual eficiente.
Crie uma tabela virtual com `USING fts5`.

<details>
<summary>✅ Good — tabela FTS5 para busca textual em produtos</summary>
<br>

```sql
-- tabela virtual FTS5
CREATE VIRTUAL TABLE ProductSearch USING fts5
(
  Name,
  Description,
  content=Products,  -- content table: sincroniza com a tabela principal
  content_rowid=Id
);

-- buscar produtos que contêm "notebook" no nome ou descrição
SELECT
  Products.Id,
  Products.Name,
  Products.Price
FROM
  Products
JOIN
  ProductSearch ON Products.Id = ProductSearch.rowid
WHERE
  ProductSearch MATCH 'notebook'
ORDER BY
  rank;
```

</details>

## ALTER TABLE: limitações

SQLite tem suporte limitado a `ALTER TABLE`. Operações não suportadas exigem recriar a tabela.

| Operação | Suporte |
| --- | --- |
| `ADD COLUMN` | Suportado |
| `RENAME TABLE` | Suportado |
| `RENAME COLUMN` | Suportado (3.25+) |
| `DROP COLUMN` | Suportado (3.35+) |
| `ADD CONSTRAINT` / `DROP CONSTRAINT` | Suportado (3.53+) |
| `MODIFY COLUMN` (alterar tipo) | Não suportado — recriar a tabela |

<details>
<summary>✅ Good — adicionar constraint NOT NULL (SQLite 3.53+)</summary>
<br>

```sql
-- antes do SQLite 3.53: era necessário recriar a tabela
-- a partir do 3.53: ALTER TABLE ADD CONSTRAINT é suportado
ALTER TABLE Orders
  ADD CONSTRAINT CK_Orders_TotalAmount CHECK (TotalAmount >= 0);
```

</details>

<br>

<details>
<summary>✅ Good — recriar tabela para alterar tipo de coluna</summary>
<br>

```sql
-- passo 1: criar nova tabela com o schema correto
CREATE TABLE Orders_New
(
  Id          INTEGER  NOT NULL,
  CustomerId  INTEGER  NOT NULL,
  TotalAmount NUMERIC  NOT NULL,
  Status      TEXT     NOT NULL DEFAULT 'Pending',

  CONSTRAINT PK_Orders_New PRIMARY KEY (Id)
);

-- passo 2: copiar dados
INSERT INTO Orders_New
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount,
  Orders.Status
FROM
  Orders;

-- passo 3: substituir a tabela original dentro de uma transação
BEGIN IMMEDIATE;
DROP TABLE Orders;
ALTER TABLE Orders_New RENAME TO Orders;
COMMIT;
```

</details>

## Funções do sistema

| Função | Retorna | Uso |
| --- | --- | --- |
| `DATETIME('now')` | Data e hora UTC atual como TEXT | Timestamp de criação |
| `DATETIME('now', 'localtime')` | Data e hora local | Apenas para exibição |
| `strftime('%Y-%m-%d', coluna)` | Data formatada | Formatação para exibição |
| `last_insert_rowid()` | Último rowid inserido na conexão | Recuperar ID após INSERT |
| `changes()` | Linhas afetadas pelo último comando | Validar UPDATE/DELETE |
| `total_changes()` | Total de linhas modificadas desde a conexão | Diagnóstico de operações em lote |
| `json_extract(json, path)` | Valor no caminho JSON | Extrair campo de coluna JSON |
| `json_object(key, val, ...)` | Objeto JSON | Construir JSON inline |
| `json_array_insert(json, path, val)` | Array JSON com elemento inserido | Novo em 3.53 |

## PRAGMAs recomendados

```sql
PRAGMA journal_mode  = WAL;
PRAGMA synchronous   = NORMAL;
PRAGMA foreign_keys  = ON;
PRAGMA cache_size    = -64000; -- 64 MB
PRAGMA temp_store    = MEMORY;
PRAGMA mmap_size     = 268435456; -- 256 MB de mmap
```

## Recursos relacionados

- [Formatting](../conventions/formatting.md) — estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md) — PascalCase, prefixos, constraints
- [Null Safety](../conventions/advanced/null-safety.md) — NULL, COALESCE, IS NULL
- [Migrations](../conventions/advanced/migrations.md) — forward only, uma responsabilidade
- [SQL Server](./sql-server.md) — idiomas específicos do SQL Server
- [PostgreSQL](./postgres.md) — idiomas específicos do PostgreSQL
