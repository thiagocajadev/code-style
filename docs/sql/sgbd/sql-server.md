# SQL Server

> Escopo: SQL Server 2025. Referência: [docs.microsoft.com/sql/sql-server](https://learn.microsoft.com/en-us/sql/sql-server/).
>
> Este documento cobre idiomas e recursos específicos do SQL Server. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).

**SQL** (Structured Query Language, Linguagem de Consulta Estruturada) Server 2025 traz T-SQL moderno com **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) nativo, window functions completas, tabelas temporais, Query Store para análise de planos e recursos de tuning baseados em execução. As seções abaixo cobrem o que é idiomático da plataforma: `BULK INSERT` para carga, SQL Server **Agent** (Agente) para agendamento, `SET STATISTICS` e `sys.sysprocesses` para diagnóstico, e padrões de procedures com `SET NOCOUNT ON` + transações explícitas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **T-SQL** (Transact-SQL) | Extensão SQL da Microsoft com suporte a variáveis, fluxo de controle e funções do sistema |
| **Stored Procedure** | Bloco T-SQL compilado e armazenado no banco, executável com `EXEC` |
| **Temp Table** | Tabela temporária prefixada com `#` (sessão) ou `##` (global), útil para etapas intermediárias |
| **CTE** (Common Table Expression, Expressão de Tabela Comum) | Resultado nomeado via `WITH`, descartado após a query |
| **DiskANN** | Algoritmo de indexação vetorial usado em vector search no SQL Server 2025 |
| **OPPO** (Optional Parameter Plan Optimization, Otimização de Plano com Parâmetros Opcionais) | Recurso de SQL Server 2025 que gera planos distintos para cada valor de parâmetro, reduzindo parameter sniffing |

## Tipos de dados

Prefira tipos de precisão explícita. Evite aliases legados (`INT` é preferível a `INTEGER`).

| Categoria | Tipo | Uso |
| --- | --- | --- |
| Inteiro | `INT`, `BIGINT`, `SMALLINT` | IDs numéricos, contagens |
| Identificador | `UNIQUEIDENTIFIER` | IDs globais (UUID v4/v7) |
| Texto Unicode | `NVARCHAR(n)` | Colunas de texto; `NVARCHAR(MAX)` com cautela |
| Texto ASCII | `VARCHAR(n)` | Dados sem caracteres especiais (código, slug) |
| Data/Hora | `DATETIME2` | Preferível a `DATETIME`; precision de até 100ns |
| Data | `DATE` | Quando hora não é necessária |
| Booleano | `BIT` | `1` = verdadeiro, `0` = falso |
| Decimal | `DECIMAL(p, s)` | Valores monetários, nunca `FLOAT` |
| JSON | `NVARCHAR(MAX)` até SQL Server 2022; **native JSON** no 2025 | Documentos semi-estruturados |
| Vetor | `VECTOR(n)` | SQL Server 2025; embeddings de IA |

<details>
<summary>❌ Bad — tipos imprecisos e legados</summary>
<br>

```sql
CREATE TABLE Products
(
  Id       INTEGER,          -- alias legado
  Price    FLOAT,            -- ponto flutuante: impreciso para moeda
  IsActive TINYINT,          -- semântica obscura
  Notes    TEXT              -- obsoleto; sem comprimento explícito
);
```

</details>

<br>

<details>
<summary>✅ Good — tipos explícitos e precisos</summary>
<br>

```sql
CREATE TABLE Products
(
  Id          INT             NOT NULL IDENTITY(1, 1),
  Name        NVARCHAR(200)   NOT NULL,
  Price       DECIMAL(10, 2)  NOT NULL,
  IsActive    BIT             NOT NULL DEFAULT 1,
  Description NVARCHAR(MAX)   NULL,
  CreatedAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Products PRIMARY KEY (Id)
);
```

</details>

## Identidade e UUID

Escolha o tipo de ID pelo trade-off entre sequencialidade e unicidade global. Ver
[performance.md — Tipo de ID](../conventions/advanced/performance.md#tipo-de-id-bigint-vs-uuid).

| Tipo | Quando usar |
| --- | --- |
| `BIGINT IDENTITY(1,1)` | ID interno, sem distribuição entre sistemas |
| `UNIQUEIDENTIFIER` + UUID v7 gerado na aplicação | ID global, geração fora do banco |
| `NEWSEQUENTIALID()` | UUID sequencial gerado pelo banco; só como `DEFAULT`, não portável |

<details>
<summary>✅ Good — **UUID** (Universally Unique Identifier, Identificador Universalmente Único) v7 gerado na aplicação (.NET 9+)</summary>
<br>

```sql
-- o ID é gerado na aplicação antes do INSERT
-- Guid.CreateVersion7() — .NET 9+
CREATE TABLE Orders
(
  Id          UNIQUEIDENTIFIER NOT NULL,
  CustomerId  INT              NOT NULL,
  TotalAmount DECIMAL(10, 2)   NOT NULL,
  CreatedAt   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders            PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers  FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);
```

</details>

## Stored Procedure

Procedures decompõem queries complexas em etapas nomeadas. Ver
[procedures.md](../conventions/advanced/procedures.md) para o padrão completo de temp tables.

### Nomenclatura

Padrão: `SP_VERBO_TABELA` ou `SP_VERBO_TABELA_BY_CAMPO` em `UPPER_SNAKE_CASE`.

| Verbo | Intenção |
| --- | --- |
| `GET` | Busca por identificador único |
| `LIST` | Coleção com filtros |
| `ADD` | Inserção |
| `UPDATE` | Atualização |
| `DELETE` | Exclusão (preferencialmente soft) |

<details>
<summary>❌ Bad — nome genérico, sem parâmetros tipados, sem formatação vertical</summary>
<br>

```sql
CREATE PROCEDURE sp_GetData @id INT AS
BEGIN
  SELECT Id, Name FROM FootballTeams WHERE Id = @id
END
```

</details>

<br>

<details>
<summary>✅ Good — nome descritivo, parâmetro tipado, linha em branco entre AS e BEGIN</summary>
<br>

```sql
CREATE OR ALTER PROCEDURE SP_GET_FOOTBALL_TEAM_BY_ID
(
  @TeamId UNIQUEIDENTIFIER
)
AS

BEGIN
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = @TeamId;
END;

-- EXEC SP_GET_FOOTBALL_TEAM_BY_ID @TeamId = '9585E296-1114-4F35-9B34-1130987BA6D0';
```

</details>

## Tratamento de erros: TRY / CATCH

<details>
<summary>❌ Bad — sem tratamento de erro, falha silenciosa</summary>
<br>

```sql
CREATE OR ALTER PROCEDURE SP_ADD_ORDER
(
  @CustomerId INT,
  @TotalAmount DECIMAL(10, 2)
)
AS

BEGIN
  INSERT INTO Orders (CustomerId, TotalAmount)
  VALUES (@CustomerId, @TotalAmount);
END;
```

</details>

<br>

<details>
<summary>✅ Good — TRY/CATCH com ROLLBACK e THROW</summary>
<br>

```sql
CREATE OR ALTER PROCEDURE SP_ADD_ORDER
(
  @CustomerId INT,
  @TotalAmount DECIMAL(10, 2)
)
AS

BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO Orders
    (
      CustomerId,
      TotalAmount
    )
    VALUES
    (
      @CustomerId,
      @TotalAmount
    );

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH
END;
```

</details>

## Transações

Toda operação que modifica múltiplas tabelas deve estar em uma transação explícita.

<details>
<summary>❌ Bad — múltiplos INSERTs sem transação: estado inconsistente em caso de falha</summary>
<br>

```sql
INSERT INTO Orders (Id, CustomerId, TotalAmount) VALUES (@Id, @CustomerId, @TotalAmount);
INSERT INTO OrderItems (OrderId, ProductId, Quantity) VALUES (@Id, @ProductId, @Qty);
```

</details>

<br>

<details>
<summary>✅ Good — transação explícita garante atomicidade</summary>
<br>

```sql
BEGIN TRY
  BEGIN TRANSACTION;

  INSERT INTO Orders
  (
    Id,
    CustomerId,
    TotalAmount
  )
  VALUES
  (
    @OrderId,
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
    @OrderId,
    @ProductId,
    @Quantity
  );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  THROW;
END CATCH
```

</details>

## Paginação: OFFSET / FETCH

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC
OFFSET @Page * @PageSize ROWS
FETCH NEXT @PageSize ROWS ONLY;
```

## Recursos de SQL Server 2025

### Funções RegEx nativas

SQL Server 2025 introduz funções `REGEXP_LIKE`, `REGEXP_REPLACE`, `REGEXP_SUBSTR` e
`REGEXP_COUNT` diretamente em T-SQL.

<details>
<summary>✅ Good — validação de e-mail sem CLR ou função auxiliar</summary>
<br>

```sql
SELECT
  Users.Id,
  Users.Email
FROM
  Users
WHERE
  REGEXP_LIKE(Users.Email, '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$') = 1;
```

</details>

### Fuzzy string matching

`EDITDISTANCE` (Damerau-Levenshtein) e `JARO_WINKLER_SIMILARITY` estão disponíveis nativamente
para deduplicação e busca tolerante a erros.

<details>
<summary>✅ Good — encontrar nomes similares com tolerância a typos</summary>
<br>

```sql
SELECT
  Customers.Id,
  Customers.Name,
  EDITDISTANCE(Customers.Name, @SearchName) AS Distance
FROM
  Customers
WHERE
  EDITDISTANCE(Customers.Name, @SearchName) <= 2 -- até 2 edições de diferença
ORDER BY
  Distance ASC;
```

</details>

### Native JSON (SQL Server 2025)

O tipo `JSON` nativo armazena até 2 GB por linha com indexação direta, sem necessidade de
`NVARCHAR(MAX)` com funções JSON.

<details>
<summary>✅ Good — coluna JSON nativa com índice</summary>
<br>

```sql
CREATE TABLE Events
(
  Id        BIGINT NOT NULL IDENTITY(1, 1),
  Payload   JSON   NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Events PRIMARY KEY (Id)
);

-- índice em propriedade JSON
CREATE INDEX IX_Events_Payload_Type
  ON Events (JSON_VALUE(Payload, '$.type'));
```

</details>

### Vector search (SQL Server 2025)

O tipo `VECTOR(n)` e `VECTOR_DISTANCE` permitem busca semântica por similaridade diretamente
em T-SQL, usando **DiskANN** para indexação eficiente.

<details>
<summary>✅ Good — busca por similaridade vetorial</summary>
<br>

```sql
CREATE TABLE Documents
(
  Id        INT            NOT NULL IDENTITY(1, 1),
  Content   NVARCHAR(MAX)  NOT NULL,
  Embedding VECTOR(1536)   NOT NULL, -- dimensão do modelo de embedding

  CONSTRAINT PK_Documents PRIMARY KEY (Id)
);

-- busca semântica: documentos mais próximos do vetor de consulta
SELECT TOP (5)
  Documents.Id,
  Documents.Content,
  VECTOR_DISTANCE('cosine', Documents.Embedding, @QueryVector) AS Distance
FROM
  Documents
ORDER BY
  Distance ASC;
```

</details>

### OPPO — Optional Parameter Plan Optimization

**OPPO** gera planos distintos para cada valor de parâmetro em procedures com parâmetros opcionais,
eliminando parameter sniffing sem `OPTION (RECOMPILE)`.

<details>
<summary>✅ Good — ativar OPPO na procedure</summary>
<br>

```sql
CREATE OR ALTER PROCEDURE SP_LIST_ORDERS_BY_FILTER
(
  @CustomerId INT          = NULL,
  @Status     NVARCHAR(20) = NULL,
  @StartDate  DATE         = NULL
)
WITH OPPO
AS

BEGIN
  SELECT
    Orders.Id,
    Orders.CustomerId,
    Orders.Status,
    Orders.CreatedAt
  FROM
    Orders
  WHERE
    (Orders.CustomerId = @CustomerId OR @CustomerId IS NULL) AND
    (Orders.Status     = @Status     OR @Status IS NULL) AND
    (Orders.CreatedAt  >= @StartDate  OR @StartDate IS NULL)
  ORDER BY
    Orders.CreatedAt DESC;
END;
```

</details>

## Operações em Lote

### BULK INSERT

`BULK INSERT` importa um arquivo de texto diretamente para uma tabela. Mais eficiente que INSERT
linha a linha para volumes acima de milhares de registros.

<details>
<summary>✅ Good — importar **CSV** (Comma-Separated Values, Valores Separados por Vírgula) com BULK INSERT</summary>
<br>

```sql
BULK INSERT Players
FROM 'C:\imports\players.csv'
WITH
(
  FIELDTERMINATOR = ',',
  ROWTERMINATOR   = '\n',
  FIRSTROW        = 2,     -- ignorar cabeçalho
  BATCHSIZE       = 1000,  -- commit a cada 1000 linhas
  TABLOCK          -- lock de tabela: mais rápido, bloqueia leituras simultâneas
);
```

</details>

### SQL Server Agent

**SQL Server Agent** executa jobs agendados em T-SQL, SSIS ou PowerShell. Cada job tem uma ou
mais etapas e um ou mais schedules.

<details>
<summary>✅ Good — criar job com etapa T-SQL e agendamento diário</summary>
<br>

```sql
-- criar o job
EXEC sp_add_job
  @job_name = N'CleanInactivePlayers';

-- adicionar etapa T-SQL
EXEC sp_add_jobstep
  @job_name      = N'CleanInactivePlayers',
  @step_name     = N'DeleteInBatches',
  @subsystem     = N'TSQL',
  @database_name = N'SportsDB',
  @command       = N'
    DECLARE @ChunkSize  INT = 1000;
    DECLARE @RowsDeleted INT = 1;

    WHILE @RowsDeleted > 0
    BEGIN
      DELETE TOP (@ChunkSize) FROM Players
      WHERE
        Players.IsActive      = 0 AND
        Players.InactivatedAt < DATEADD(year, -1, GETUTCDATE());

      SET @RowsDeleted = @@ROWCOUNT;
    END;
  ';

-- agendamento: todo dia às 02:00
EXEC sp_add_schedule
  @schedule_name     = N'DailyAt2AM',
  @freq_type         = 4,      -- diário
  @freq_interval     = 1,
  @active_start_time = 20000;  -- 02:00:00

-- vincular agendamento ao job
EXEC sp_attach_schedule
  @job_name      = N'CleanInactivePlayers',
  @schedule_name = N'DailyAt2AM';

-- habilitar no servidor local
EXEC sp_add_jobserver
  @job_name = N'CleanInactivePlayers';
```

</details>

---

## Diagnóstico

### Plano de execução

```sql
-- ativar antes da query para ver I/O e tempo
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT
  orders.id,
  orders.total
FROM
  Orders
WHERE
  Orders.Status = 'pending';
```

`Logical reads` alto com `Scan count` 1 em tabela grande indica índice ausente.

### Queries lentas (Query Store)

**Query Store** está ativo por padrão no SQL Server 2016+.

```sql
-- top 20 queries por tempo médio de execução
SELECT TOP 20
  queryStats.total_elapsed_time / queryStats.execution_count AS avg_elapsed_time,
  queryStats.execution_count,
  queryText.text AS query_text
FROM
  sys.dm_exec_query_stats queryStats
CROSS APPLY
  sys.dm_exec_sql_text(queryStats.sql_handle) queryText
ORDER BY
  avg_elapsed_time DESC;
```

### Conexões ativas

```sql
-- conexões por banco (diagnóstico de pool exhaustion)
SELECT
  DB_NAME(sysprocesses.dbid) AS database_name,
  COUNT(*) AS connections
FROM
  sys.sysprocesses
WHERE
  sysprocesses.dbid > 0
GROUP BY
  sysprocesses.dbid;
```

---

## Funções do sistema

| Função | Retorna | Uso |
| --- | --- | --- |
| `GETUTCDATE()` | `DATETIME` UTC atual | Timestamp de criação/atualização |
| `SYSDATETIME()` | `DATETIME2` UTC com maior precisão | Quando microsegundos importam |
| `NEWID()` | `UNIQUEIDENTIFIER` (UUID v4) | UUID aleatório; fragmenta índice |
| `NEWSEQUENTIALID()` | `UNIQUEIDENTIFIER` sequencial | Apenas como `DEFAULT`; não portável |
| `SCOPE_IDENTITY()` | Último `IDENTITY` inserido na sessão | Recuperar ID após INSERT |
| `@@ROWCOUNT` | Linhas afetadas pelo último comando | Validar UPDATE/DELETE |
| `@@TRANCOUNT` | Transações abertas na sessão | Verificar antes de ROLLBACK |
| `ISNULL(a, b)` | `a` se não-NULL, `b` caso contrário | Equivalente SQL Server de COALESCE para 2 valores |

## Recursos relacionados

- [Formatting](../conventions/formatting.md) — estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md) — PascalCase, prefixos, constraints
- [Procedures](../conventions/advanced/procedures.md) — temp tables, etapas nomeadas
- [Performance](../conventions/advanced/performance.md) — índices, paginação, UUID vs BIGINT
- [Null Safety](../conventions/advanced/null-safety.md) — NULL, COALESCE, IS NULL
- [PostgreSQL](./postgres.md) — idiomas específicos do PostgreSQL
