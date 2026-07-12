# SQL Server

> Escopo: SQL Server 2025. Referência: [docs.microsoft.com/sql/sql-server](https://learn.microsoft.com/en-us/sql/sql-server/).
>
> Este documento cobre idioms e recursos específicos do SQL Server. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).

O SQL Server fala **T-SQL** (Transact-SQL), o dialeto da Microsoft, que acrescenta ao SQL padrão variáveis, fluxo de controle e um conjunto grande de funções de sistema. Esta página cobre o que é próprio dele: a stored procedure com transação explícita, o `BULK INSERT` para carregar arquivo, o **SQL Server Agent** (serviço que roda tarefas agendadas) e as ferramentas de diagnóstico, do plano de execução ao Query Store.

Os exemplos seguem a convenção PascalCase do SQL Server, e o nome de cada procedure segue o formato `SP_VERBO_TABELA` descrito em [prefixos de objetos](../conventions/naming.md#object-prefixes).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **T-SQL** (Transact-SQL) | Extensão SQL da Microsoft com suporte a variáveis, fluxo de controle e funções do sistema |
| **Stored Procedure** (procedimento armazenado) | Bloco T-SQL compilado e armazenado no banco, executável com `EXEC` |
| **Temp Table** (tabela temporária) | Prefixada com `#` (sessão) ou `##` (global), útil para etapas intermediárias |
| **CTE** (Common Table Expression · Expressão de Tabela Comum) | Resultado nomeado via `WITH`, descartado após a query |
| **DiskANN** (Disk-based Approximate Nearest Neighbor, vizinho mais próximo aproximado em disco) | Algoritmo de indexação vetorial usado em vector search no SQL Server 2025 |
| **OPPO** (Optional Parameter Plan Optimization · Otimização de Plano com Parâmetros Opcionais) | Recurso de SQL Server 2025 que gera planos distintos para cada valor de parâmetro, reduzindo parameter sniffing |
| **UUID** (Universally Unique Identifier · identificador único global) | Identificador de 128 bits; v7 é sequencial e amigável a índices; no SQL Server, o tipo é `UNIQUEIDENTIFIER` |

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
<summary>❌ Ruim: tipos imprecisos e legados</summary>

```sql
CREATE TABLE Products
(
  Id INTEGER, -- alias legado
  Price FLOAT, -- ponto flutuante: impreciso para moeda
  IsActive TINYINT, -- semântica obscura
  Notes TEXT -- obsoleto; sem comprimento explícito
);
```

</details>

<details>
<summary>✅ Bom: tipos explícitos e precisos</summary>

```sql
CREATE TABLE Products
(
  Id INT NOT NULL IDENTITY(1, 1),
  Name NVARCHAR(200) NOT NULL,
  Price DECIMAL(10, 2) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  Description NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Products PRIMARY KEY (Id)
);
```

</details>

## Identidade e UUID

A escolha do tipo de identificador troca uma coisa pela outra: o número sequencial mantém o índice arrumado, e o **UUID** (Universally Unique Identifier · identificador único global) permite gerar o valor fora do banco, sem consultar ninguém. O efeito de cada escolha sobre o índice está em [tipo de ID: BIGINT ou UUID](../conventions/advanced/performance.md#id-type-bigint-vs-uuid).

| Tipo | Quando usar |
| --- | --- |
| `BIGINT IDENTITY(1,1)` | ID interno, sem distribuição entre sistemas |
| `UNIQUEIDENTIFIER` + UUID v7 gerado na aplicação | ID global, geração fora do banco |
| `NEWSEQUENTIALID()` | UUID sequencial gerado pelo banco; só como `DEFAULT`, não portável |

<details>
<summary>✅ Bom: UUID v7 gerado na aplicação (.NET 9+)</summary>

```sql
-- o ID é gerado na aplicação antes do INSERT
-- Guid.CreateVersion7(): .NET 9+
CREATE TABLE Orders
(
  Id UNIQUEIDENTIFIER NOT NULL,
  CustomerId INT NOT NULL,
  TotalAmount DECIMAL(10, 2) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);
```

</details>

## Stored Procedure

A procedure quebra a query grande em etapas nomeadas, cada uma gravando o resultado parcial numa temp table. O padrão completo, com o exemplo de ponta a ponta, está em [procedures](../conventions/advanced/procedures.md).

### Nomenclatura

O nome segue `SP_VERBO_TABELA`, ou `SP_VERBO_TABELA_BY_CAMPO` quando há filtro, sempre em maiúsculas com sublinhado. O verbo diz o que a procedure faz: `GET` traz um registro, `LIST` traz uma coleção, `ADD` insere.

| Verbo | Intenção |
| --- | --- |
| `GET` | Busca por identificador único |
| `LIST` | Coleção com filtros |
| `ADD` | Inserção |
| `UPDATE` | Atualização |
| `DELETE` | Exclusão (preferencialmente soft) |

<details>
<summary>❌ Ruim: nome genérico, sem parâmetros tipados, sem formatação vertical</summary>

```sql
CREATE PROCEDURE sp_GetData @id INT AS
BEGIN
  SELECT Id, Name FROM FootballTeams WHERE Id = @id
END
```

</details>

<details>
<summary>✅ Bom: nome descritivo, parâmetro tipado, linha em branco entre AS e BEGIN</summary>

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

<a id="try-catch"></a>

## Tratamento de erros com TRY e CATCH

A procedure que grava em duas tabelas e falha na segunda deixa o banco pela metade: a primeira linha entrou, a segunda não. O `BEGIN TRY / BEGIN CATCH` captura o erro, e o `ROLLBACK` dentro do `CATCH` desfaz o que a transação já tinha feito.

O `THROW` no fim do `CATCH` é o que faz o erro chegar até a aplicação. Sem ele, a procedure trata a falha, não avisa ninguém, e devolve sucesso a quem chamou.

<details>
<summary>❌ Ruim: sem tratamento de erro, falha silenciosa</summary>

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

<details>
<summary>✅ Bom: TRY/CATCH com ROLLBACK e THROW</summary>

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

<a id="transactions"></a>

## Transações

Toda operação que grava em mais de uma tabela roda dentro de uma transação explícita. O pedido entra em `Orders` e os itens entram em `OrderItems`: se o segundo comando falhar, o pedido fica no banco sem item nenhum, e ninguém percebe até o cliente reclamar.

`BEGIN TRANSACTION` abre, `COMMIT` confirma as duas gravações juntas e `ROLLBACK` desfaz as duas juntas.

<details>
<summary>❌ Ruim: múltiplos INSERTs sem transação: estado inconsistente em caso de falha</summary>

```sql
INSERT INTO Orders (Id, CustomerId, TotalAmount) VALUES (@Id, @CustomerId, @TotalAmount);
INSERT INTO OrderItems (OrderId, ProductId, Quantity) VALUES (@Id, @ProductId, @Qty);
```

</details>

<details>
<summary>✅ Bom: transação explícita garante atomicidade</summary>

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

<a id="pagination"></a>

## Paginação com OFFSET e FETCH

O `OFFSET` diz quantas linhas pular e o `FETCH NEXT` quantas devolver. O `ORDER BY` é obrigatório: sem um critério de ordem, o banco não tem como decidir qual é a linha 21, e o mesmo registro pode aparecer em duas páginas.

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

### Expressões regulares no próprio T-SQL

O SQL Server 2025 trouxe `REGEXP_LIKE`, `REGEXP_REPLACE`, `REGEXP_SUBSTR` e `REGEXP_COUNT`. Validar o formato de um e-mail dentro do banco deixa de exigir uma função escrita em .NET e instalada no servidor.

<details>
<summary>✅ Bom: validação de e-mail sem CLR ou função auxiliar</summary>

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

### Busca que tolera erro de digitação

`EDITDISTANCE` conta quantas letras precisam mudar para uma palavra virar a outra, e `JARO_WINKLER_SIMILARITY` devolve o quanto duas palavras se parecem, de 0 a 1. As duas servem para achar `Jhon Smith` quando o usuário digitou `John Smith`, e para encontrar cadastros duplicados que diferem por uma letra.

<details>
<summary>✅ Bom: encontrar nomes similares com tolerância a typos</summary>

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

### Coluna JSON de verdade

Antes, guardar JSON no SQL Server significava jogá-lo num `NVARCHAR(MAX)` e usar funções para ler dentro. O texto era só texto para o banco, e buscar por uma chave lia a tabela inteira. O tipo `JSON` do SQL Server 2025 guarda até 2 GB por linha, o banco entende a estrutura e aceita índice sobre o conteúdo.

<details>
<summary>✅ Bom: coluna JSON nativa com índice</summary>

```sql
CREATE TABLE Events
(
  Id BIGINT NOT NULL IDENTITY(1, 1),
  Payload JSON NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Events PRIMARY KEY (Id)
);

-- índice em propriedade JSON
CREATE INDEX IX_Events_Payload_Type
  ON Events (JSON_VALUE(Payload, '$.type'));
```

</details>

### Busca por similaridade de significado

O tipo `VECTOR(n)` guarda o **embedding** (a representação numérica que um modelo de linguagem gera para um texto), e `VECTOR_DISTANCE` mede o quanto dois desses vetores estão próximos. Textos com significado parecido produzem vetores próximos, então a busca passa a encontrar "calçado esportivo" quando o usuário procurou "tênis". O índice **DiskANN** (Disk-based Approximate Nearest Neighbor · vizinho mais próximo aproximado em disco) é o que torna essa busca viável em tabelas grandes.

<details>
<summary>✅ Bom: busca por similaridade vetorial</summary>

```sql
CREATE TABLE Documents
(
  Id INT NOT NULL IDENTITY(1, 1),
  Content NVARCHAR(MAX) NOT NULL,
  Embedding VECTOR(1536) NOT NULL, -- dimensão do modelo de embedding

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

### Um plano por combinação de parâmetro opcional

A procedure de busca com filtros opcionais tem um problema conhecido. O SQL Server guarda o plano de execução da primeira vez que ela roda, e reusa esse plano nas próximas. Se a primeira chamada veio com o filtro de cliente preenchido, o plano é bom para esse caso e ruim para a chamada seguinte, que filtrou por data. Isso se chama **parameter sniffing**.

O **OPPO** (Optional Parameter Plan Optimization · otimização de plano com parâmetro opcional) guarda um plano para cada combinação de filtros, e cada chamada recebe o plano que serve a ela. A alternativa antiga era `OPTION (RECOMPILE)`, que refazia o plano em toda execução, e esse trabalho se repetia a cada chamada.

<details>
<summary>✅ Bom: ativar OPPO na procedure</summary>

```sql
CREATE OR ALTER PROCEDURE SP_LIST_ORDERS_BY_FILTER
(
  @CustomerId INT = NULL,
  @Status NVARCHAR(20) = NULL,
  @StartDate DATE = NULL
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
    (Orders.Status = @Status OR @Status IS NULL) AND
    (Orders.CreatedAt >= @StartDate OR @StartDate IS NULL)
  ORDER BY
    Orders.CreatedAt DESC;
END;
```

</details>

<a id="batch-operations"></a>

## Operações em Lote

### BULK INSERT

O `BULK INSERT` carrega um arquivo de texto, como um **CSV** (Comma-Separated Values · valores separados por vírgula), direto para dentro de uma tabela. Passando de alguns milhares de registros, ele deixa o `INSERT` linha a linha para trás, porque o banco lê o arquivo de uma vez em vez de interpretar um comando novo a cada linha.

O `BATCHSIZE` decide de quantas em quantas linhas o banco confirma a gravação. Sem ele, um arquivo de um milhão de linhas vira uma transação só, e um erro na última linha desfaz o milhão.

<details>
<summary>✅ Bom: importar CSV com BULK INSERT</summary>

```sql
BULK INSERT Players
FROM 'C:\imports\players.csv'
WITH
(
  FIELDTERMINATOR = ',',
  ROWTERMINATOR = '\n',
  FIRSTROW = 2, -- ignorar cabeçalho
  BATCHSIZE = 1000, -- commit a cada 1000 linhas
  TABLOCK -- lock de tabela: mais rápido, bloqueia leituras simultâneas
);
```

</details>

### SQL Server Agent

O **SQL Server Agent** é o serviço que roda tarefas agendadas dentro do próprio servidor, em T-SQL, SSIS ou PowerShell. A limpeza noturna de registros antigos vive aqui, sem depender de um serviço externo só para disparar um comando.

Um **job** (tarefa) reúne uma ou mais etapas e um ou mais horários. As procedures `sp_add_job`, `sp_add_jobstep` e `sp_add_schedule` que aparecem no exemplo são do próprio SQL Server, e por isso não seguem o `SP_` maiúsculo do guia.

<details>
<summary>✅ Bom: criar job com etapa T-SQL e agendamento diário</summary>

```sql
-- criar o job
EXEC sp_add_job
  @job_name = N'CleanInactivePlayers';

-- adicionar etapa T-SQL
EXEC sp_add_jobstep
  @job_name = N'CleanInactivePlayers',
  @step_name = N'DeleteInBatches',
  @subsystem = N'TSQL',
  @database_name = N'SportsDB',
  @command = N'
    DECLARE @ChunkSize INT = 1000;
    DECLARE @RowsDeleted INT = 1;

    WHILE @RowsDeleted > 0
    BEGIN
      DELETE TOP (@ChunkSize) FROM Players
      WHERE
        Players.IsActive = 0 AND
        Players.InactivatedAt < DATEADD(year, -1, GETUTCDATE());
      SET @RowsDeleted = @@ROWCOUNT;
    END;
  ';

-- agendamento: todo dia às 02:00
EXEC sp_add_schedule
  @schedule_name = N'DailyAt2AM',
  @freq_type = 4, -- diário
  @freq_interval = 1,
  @active_start_time = 20000; -- 02:00:00

-- vincular agendamento ao job
EXEC sp_attach_schedule
  @job_name = N'CleanInactivePlayers',
  @schedule_name = N'DailyAt2AM';

-- habilitar no servidor local
EXEC sp_add_jobserver
  @job_name = N'CleanInactivePlayers';
```

</details>

---

<a id="diagnostics"></a>

## Diagnóstico

Quando o banco fica lento, quatro perguntas resolvem a maior parte dos casos: o que o banco faz para resolver uma query, quais queries demoram mais, quantas conexões estão abertas e quem está travando quem.

### Plano de execução

`SET STATISTICS IO ON` mostra quantas páginas o banco precisou ler, e `SET STATISTICS TIME ON` mostra quanto tempo levou. Os dois juntos dizem se a query está lenta por ler demais ou por calcular demais.

```sql
-- ativar antes da query para ver I/O e tempo
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.Status = 'pending';
```

`Logical reads` alto com `Scan count` igual a 1, numa tabela grande, significa que o banco varreu a tabela inteira uma vez. É o sinal de que falta índice para aquele filtro.

### Queries lentas (Query Store)

O **Query Store** guarda o histórico de execução das queries: quanto cada uma demorou, quantas vezes rodou e qual plano usou. Ele vem ligado a partir do SQL Server 2016, e é por ele que se descobre a query que ficou lenta depois de um deploy.

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

A aplicação reutiliza um conjunto fixo de conexões, o **pool**. Quando todas ficam ocupadas, a próxima requisição espera, e a aplicação parece lenta mesmo com o banco ocioso. Contar as conexões por banco mostra se é isso que está acontecendo.

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

- [Formatting](../conventions/formatting.md): estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md): PascalCase, prefixos, constraints
- [Procedures](../conventions/advanced/procedures.md): temp tables, etapas nomeadas
- [Performance](../conventions/advanced/performance.md): índices, paginação, UUID vs BIGINT
- [Null Safety](../conventions/advanced/null-safety.md): NULL, COALESCE, IS NULL
- [PostgreSQL](./postgres.md): idioms específicos do PostgreSQL
