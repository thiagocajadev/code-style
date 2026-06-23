# Operações em Lote

> Escopo: SQL. Visão transversal: [shared/platform/database.md](../../../shared/platform/database.md#operações-em-lote).

Operações em lote reduzem round trips e aumentam throughput em inserções de alto volume. Em
atualizações e exclusões de grande escala, o padrão é dividir em lotes de tamanho fixo: uma
transação que modifica milhões de linhas mantém o lock por toda a duração, bloqueando outras
operações. Lotes menores liberam o lock entre cada commit.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **batch** (lote) | Conjunto de operações enviadas juntas para reduzir round trips com o banco |
| **multi-row INSERT** (INSERT de múltiplas linhas) | `INSERT ... VALUES (...), (...), (...)`; uma única instrução insere várias linhas |
| **chunked update** (atualização em pedaços) | Dividir um `UPDATE` grande em lotes de tamanho fixo para liberar lock entre commits |
| **bulk load** (carga em massa) | Mecanismo nativo do SGBD: `COPY` (PostgreSQL), `BULK INSERT` (SQL Server) |
| **transaction lock** (bloqueio de transação) | Lock mantido pela transação enquanto modifica linhas; lotes menores reduzem contenção |
| **round trip** (ida e volta) | Latência de uma requisição cliente-banco; lotes amortizam o custo por linha |
| **MERGE** (mesclar) | Comando que faz `INSERT` ou `UPDATE` conforme a chave existe ou não; útil para upsert em lote |

## Batch INSERT multi-row

<details>
<summary>❌ Ruim: um INSERT por linha, um round trip por registro</summary>

```sql
INSERT INTO Players (Id, Name, Position, TeamId) VALUES (1, 'Alice', 'GK', @TeamId);
INSERT INTO Players (Id, Name, Position, TeamId) VALUES (2, 'Bob',   'CB', @TeamId);
INSERT INTO Players (Id, Name, Position, TeamId) VALUES (3, 'Carol', 'ST', @TeamId);
```

</details>

<details>
<summary>✅ Bom: um INSERT com múltiplos VALUES</summary>

```sql
INSERT INTO Players
(
  Id,
  Name,
  Position,
  TeamId
)
VALUES
  (1, 'Alice', 'GK', @TeamId),
  (2, 'Bob',   'CB', @TeamId),
  (3, 'Carol', 'ST', @TeamId);
```

</details>

<br>

Quando os dados vêm de outra tabela, `INSERT ... SELECT` é preferível: uma operação, sem
construção de lista de VALUES no código.

<details>
<summary>✅ Bom: INSERT ... SELECT de tabela de origem</summary>

```sql
INSERT INTO Players
(
  Id,
  Name,
  Position,
  TeamId
)
SELECT
  ExternalPlayers.ExternalId,
  ExternalPlayers.FullName,
  ExternalPlayers.Position,
  FootballTeams.Id
FROM
  ExternalPlayers
JOIN
  FootballTeams ON FootballTeams.ExternalId = ExternalPlayers.TeamExternalId
WHERE
  ExternalPlayers.IsVerified = 1; -- verified only
```

</details>

## DELETE em lotes

<details>
<summary>❌ Ruim: DELETE único em tabela grande: lock de longa duração</summary>

```sql
-- bloqueia Players pela duração inteira da operação
DELETE FROM
  Players
WHERE
  Players.IsActive = 0 AND
  Players.InactivatedAt < @CutoffDate;
```

</details>

<details>
<summary>✅ Bom: DELETE em lotes com TOP + WHILE: lock liberado a cada commit</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsDeleted INT = 1;

WHILE @RowsDeleted > 0
BEGIN
  DELETE TOP (@ChunkSize) FROM
    Players
  WHERE
    Players.IsActive = 0 AND
    Players.InactivatedAt < @CutoffDate;

  SET @RowsDeleted = @@ROWCOUNT;
END;
```

</details>

## UPDATE em lotes

<details>
<summary>❌ Ruim: UPDATE único em tabela grande</summary>

```sql
-- deactivate players from dissolved teams: pode modificar milhões de linhas
UPDATE
  Players
SET
  Players.IsActive    = 0,
  Players.InactivatedAt = GETUTCDATE()
FROM
  Players
JOIN
  FootballTeams ON FootballTeams.Id = Players.TeamId
WHERE
  FootballTeams.IsActive = 0 AND
  Players.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: UPDATE TOP + WHILE: lotes de tamanho fixo</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsUpdated INT = 1;

WHILE @RowsUpdated > 0
BEGIN
  UPDATE TOP (@ChunkSize)
    Players
  SET
    Players.IsActive = 0,
    Players.InactivatedAt = GETUTCDATE()
  FROM
    Players
  JOIN
    FootballTeams ON FootballTeams.Id = Players.TeamId
  WHERE
    FootballTeams.IsActive = 0 AND
    Players.IsActive = 1;

  SET @RowsUpdated = @@ROWCOUNT;
END;
```

</details>

## Staging table

<details>
<summary>❌ Ruim: inserir dados externos diretamente na tabela de produção sem validação</summary>

```sql
-- dados brutos do parceiro entram direto: posições inválidas ou times inexistentes quebram no FK
INSERT INTO Players
(
  Id,
  Name,
  Position,
  TeamId
)
SELECT
  ExternalPlayers.ExternalId,
  ExternalPlayers.FullName,
  ExternalPlayers.Position,  -- pode conter valores fora do domínio
  ExternalPlayers.TeamId     -- pode referenciar time inexistente
FROM
  ExternalPlayers;
```

</details>

<details>
<summary>✅ Bom: staging → validar → inserir apenas registros válidos</summary>

```sql
-- Etapa 1: receber dados brutos na staging
SELECT
  ExternalPlayers.ExternalId,
  ExternalPlayers.FullName,
  ExternalPlayers.Position,
  ExternalPlayers.TeamExternalId,
  CAST(1 AS BIT) AS IsValid
INTO
  #PlayerImportStaging
FROM
  ExternalPlayers;

-- Etapa 2: marcar registros com posição fora do domínio
UPDATE
  #PlayerImportStaging
SET
  #PlayerImportStaging.IsValid = 0
WHERE
  #PlayerImportStaging.Position NOT IN ('GK', 'CB', 'RB', 'LB', 'CM', 'AM', 'ST', 'LW', 'RW');

-- Etapa 3: marcar registros com time inexistente
UPDATE
  #PlayerImportStaging
SET
  #PlayerImportStaging.IsValid = 0
WHERE
  NOT EXISTS (
    SELECT 1
    FROM FootballTeams
    WHERE FootballTeams.ExternalId = #PlayerImportStaging.TeamExternalId
  );

-- Etapa 4: inserir apenas os válidos na tabela de produção
INSERT INTO Players
(
  Id,
  Name,
  Position,
  TeamId
)
SELECT
  #PlayerImportStaging.ExternalId,
  #PlayerImportStaging.FullName,
  #PlayerImportStaging.Position,
  FootballTeams.Id
FROM
  #PlayerImportStaging
JOIN
  FootballTeams ON FootballTeams.ExternalId = #PlayerImportStaging.TeamExternalId
WHERE
  #PlayerImportStaging.IsValid = 1; -- valid records only

DROP TABLE #PlayerImportStaging;
```

</details>
