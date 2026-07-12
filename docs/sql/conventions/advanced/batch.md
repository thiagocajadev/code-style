# Operações em lote

> Escopo: SQL. Visão transversal: [shared/platform/database.md](../../../shared/platform/database.md#batch-operations).

Escrever muitos registros de uma vez pede uma abordagem diferente de escrever um. Na inserção, mandar mil linhas num comando só evita mil idas e voltas pela rede, e cada ida e volta custa mais do que a gravação em si.

Na atualização e na exclusão em massa, o problema é outro: o **lock**. Um `DELETE` que apaga milhões de linhas trava essas linhas do começo ao fim da transação, e todo mundo que precisar delas fica esperando, às vezes por minutos. Quebrando o trabalho em lotes de mil, cada `COMMIT` libera o lock e deixa as outras operações passarem entre um lote e o próximo.

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

<a id="multi-row-insert"></a>

## Um INSERT com várias linhas de uma vez

O `INSERT` aceita vários blocos de `VALUES` separados por vírgula. Mil linhas viram um comando, e a aplicação faz uma viagem até o banco em vez de mil.

O SQL Server tem um limite de 1.000 linhas por `INSERT`, então uma carga maior se quebra em blocos desse tamanho.

<details>
<summary>❌ Ruim: um INSERT por linha, um round trip por registro</summary>

```sql
INSERT INTO Players (Id, Name, Position, TeamId) VALUES (1, 'Alice', 'GK', @TeamId);
INSERT INTO Players (Id, Name, Position, TeamId) VALUES (2, 'Bob', 'CB', @TeamId);
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
  (2, 'Bob', 'CB', @TeamId),
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

<a id="batched-delete"></a>

## DELETE em lotes

O `DELETE TOP (@ChunkSize)` apaga até mil linhas por vez, dentro de um `WHILE` que repete enquanto houver o que apagar. O `SET @RowsDeleted = @@ROWCOUNT` logo abaixo lê quantas linhas o comando anterior apagou, e é isso que encerra o laço quando o resultado chega a zero.

O tamanho do lote é um ajuste: mil linhas costumam ser um bom começo, e vale medir no seu banco.

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

<a id="batched-update"></a>

## UPDATE em lotes

O `UPDATE` em massa segue a mesma estrutura do `DELETE`: `TOP (@ChunkSize)` dentro de um `WHILE`, com o `@@ROWCOUNT` decidindo quando parar.

Existe uma armadilha aqui. O `WHERE` precisa excluir as linhas que o lote anterior já alterou, senão o mesmo conjunto de linhas volta a ser selecionado a cada volta e o laço nunca termina. No exemplo, `Players.IsActive = 1` cumpre esse papel: a linha atualizada deixa de casar com o filtro.

<details>
<summary>❌ Ruim: UPDATE único em tabela grande</summary>

```sql
-- deactivate players from dissolved teams: pode modificar milhões de linhas
UPDATE
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

<a id="staging-table"></a>

## Staging table: valide antes de entrar na tabela real

A **staging table** (tabela de entrada) é uma tabela intermediária, sem constraint nenhuma, que recebe o dado bruto do parceiro exatamente como ele veio. A validação acontece depois, com queries contra ela.

Sem esse passo, a carga vai direto para a tabela de produção e a primeira linha inválida derruba a operação inteira, no meio. Com a staging, você carrega tudo, descobre em uma query quais linhas têm time inexistente ou posição inválida, separa essas e promove só as boas.

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
  ExternalPlayers.Position, -- pode conter valores fora do domínio
  ExternalPlayers.TeamId -- pode referenciar time inexistente
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
