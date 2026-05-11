# Visual density: SQL

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) aplicados a **SQL** (Structured Query Language, Linguagem de Consulta Estruturada).

SQL é declarativo: não tem o mesmo fluxo de control flow das linguagens imperativas. Regras como **explaining return** e **declaration + guard** não se aplicam diretamente. O que importa em SQL é distinguir **fases de uma query** (SELECT / FROM / WHERE / ORDER BY já agem como separadores visuais) de **etapas independentes** (CTEs, blocos de procedure, statements consecutivos).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **blank line** (linha em branco) | Separador entre grupos coesos; uma só, nunca duas seguidas |
| **clause separator** (separador de cláusula) | `SELECT`, `FROM`, `WHERE`, `JOIN` já agem como marcos visuais; não adicionar blank entre cláusulas da mesma query |
| **CTE separator** (separador de CTE) | Cada `WITH nome AS (...)` é uma etapa nomeada, equivalente a uma variável; merece linha em branco antes da próxima |
| **multi-line block** (bloco multi-linha) | CTE grande, subquery multi-linha, `CASE WHEN` expandido; pede linha em branco depois quando seguido de outro statement |
| **signature / body boundary** (limite assinatura/corpo) | Em procedures e functions, blank entre `AS`/`$$` e a primeira instrução; deixa a fronteira visível |
| **statement separator** (separador de statement) | Dois ou mais statements consecutivos (`INSERT ...; SELECT ...`) ficam separados por linha em branco |
| **control flow block** (bloco de fluxo de controle) | `IF ... THEN ... END IF`, `WHILE`, `BEGIN TRY/CATCH`; bloco multi-linha que pede respiro antes e depois |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=`, tipos ou aliases verticalmente; antipadrão frágil a renomeações, gera diff ruidoso |
| **orphan statement** (statement órfão) | Statement isolado entre linhas em branco quando pertencia ao grupo anterior; em séries de 4+ statements homogêneos, quebrar em 2+2 |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| **Cláusulas da mesma query não levam blank** | `SELECT`, `FROM`, `WHERE`, `JOIN`, `ORDER BY` são partes de uma frase só |
| **CTEs separadas por blank** | Cada `WITH nome AS (...)` é uma etapa nomeada, com linha em branco entre elas |
| **Multi-linha pede blank depois** | CTE, subquery ou `CASE WHEN` expandido, quando seguidos de outro statement, exigem blank |
| **Statements consecutivos = blank** | Dois `INSERT`, dois `UPDATE`, etc. ficam separados por linha em branco |
| **Assinatura e corpo separados** | Blank entre `AS`/`$$` e a primeira instrução de procedure/function |
| **Sem alinhamento de coluna** | Um espaço único ao redor de `=`, tipos e aliases; sem espaçamento artificial |
| **Control flow é multi-linha** | `IF ... END IF`, `WHILE`, `TRY/CATCH` recebem blank antes e depois |
| **4+ statements homogêneos quebram em 2+2** | Série longa de `ALTER TABLE`, `CREATE INDEX` etc. ganha respiro a cada par |
| **Nunca duplo respiro** | Exatamente uma linha em branco entre grupos; duas é ruído |

## Cláusulas da mesma query: sem blank

`SELECT`, `FROM`, `WHERE`, `JOIN`, `ORDER BY` já são marcos visuais por si só: o olho reconhece cada palavra-chave. Adicionar linha em branco entre cláusulas da mesma query fragmenta a frase SQL.

<details>
<summary>❌ Ruim: blank entre cláusulas da mesma query</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name

FROM
  FootballTeams

WHERE
  FootballTeams.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: cláusulas grudadas formam uma frase</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1;
```

</details>

## Assinatura e corpo

Procedures e functions têm dois blocos distintos: assinatura (nome, parâmetros, tipo de retorno) e corpo (lógica). Uma linha em branco entre eles deixa essa fronteira visível.

Em T-SQL, a linha vai entre `AS` e `BEGIN`. Em PostgreSQL, vai após o `$$` de abertura e antes do `$$` de fechamento.

<details>
<summary>❌ Ruim: T-SQL: assinatura e corpo colados, sem separação visual</summary>

```sql
CREATE OR ALTER PROCEDURE GetFootballTeamById
(
  @TeamId INT
)
AS
BEGIN
  SELECT
    Id,
    Name,
    ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    Id = @TeamId;
END;
```

</details>

<details>
<summary>✅ Bom: T-SQL: linha em branco entre AS e BEGIN</summary>

```sql
CREATE OR ALTER PROCEDURE GetFootballTeamById
(
  @TeamId INT
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
```

</details>

<details>
<summary>✅ Bom: PostgreSQL: linha em branco após $$ e antes do fechamento</summary>

```sql
CREATE OR REPLACE FUNCTION GetFootballTeamById
(
  TeamId INT
)
RETURNS TABLE
(
  Id INT,
  Name TEXT,
  ChampionshipsWon INT
) AS $$

BEGIN
  RETURN QUERY
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = TeamId;
END;

$$ LANGUAGE plpgsql;
```

</details>

## CTEs encadeadas

Cada `WITH nome AS (...)` é uma etapa nomeada, semanticamente equivalente a uma variável. Cada CTE merece linha em branco antes da próxima.

<details>
<summary>❌ Ruim: CTEs coladas, sem separação entre as etapas</summary>

```sql
WITH TeamCTE AS
(
  SELECT Id, Name, ChampionshipsWon
  FROM FootballTeams
  WHERE Id = 1
),
ActivePlayersCTE AS
(
  SELECT PlayerId, PlayerName, TeamId
  FROM Players
  WHERE IsActive = 1
)
SELECT TeamCTE.Name, ActivePlayersCTE.PlayerName
FROM TeamCTE
JOIN ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

<details>
<summary>✅ Bom: linha em branco entre CTEs, cada etapa legível</summary>

```sql
WITH TeamCTE AS
(
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = 1
),

ActivePlayersCTE AS
(
  SELECT
    Players.Id AS PlayerId,
    Players.Name AS PlayerName,
    Players.TeamId
  FROM
    Players
  WHERE
    Players.IsActive = 1
)

SELECT
  TeamCTE.Name,
  ActivePlayersCTE.PlayerName
FROM
  TeamCTE
JOIN
  ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

## Statements consecutivos

Dois ou mais statements distintos (`INSERT`, `UPDATE`, `CREATE`, `ALTER`) na mesma sequência são fases independentes. Linha em branco entre eles deixa o fluxo legível.

<details>
<summary>❌ Ruim: statements colados, sem separação entre blocos distintos</summary>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount
FROM
  Orders
WHERE
  Orders.Status = 'Active';
SELECT
  ActiveOrders.OrderId,
  Customers.Name AS CustomerName
FROM
  #ActiveOrders ActiveOrders
JOIN
  Customers ON ActiveOrders.CustomerId = Customers.Id;
```

</details>

<details>
<summary>✅ Bom: statements separados, fluxo legível</summary>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount
FROM
  Orders
WHERE
  Orders.Status = 'Active';

SELECT
  ActiveOrders.OrderId,
  Customers.Name AS CustomerName
FROM
  #ActiveOrders ActiveOrders
JOIN
  Customers ON ActiveOrders.CustomerId = Customers.Id;
```

</details>

## Control flow: respiro antes e depois

Blocos `IF ... END IF`, `WHILE`, `BEGIN TRY/CATCH` ocupam peso visual próprio. Aplica-se a regra de **multi-linha pede respiro**: linha em branco antes e depois do bloco.

<details>
<summary>❌ Ruim: bloco WHILE colado ao statement anterior</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsDeleted INT = 1;
WHILE @RowsDeleted > 0
BEGIN
  DELETE TOP (@ChunkSize) FROM
    Players
  WHERE
    Players.IsActive = 0;
  SET @RowsDeleted = @@ROWCOUNT;
END;
```

</details>

<details>
<summary>✅ Bom: bloco isolado por linhas em branco</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsDeleted INT = 1;

WHILE @RowsDeleted > 0
BEGIN
  DELETE TOP (@ChunkSize) FROM
    Players
  WHERE
    Players.IsActive = 0;

  SET @RowsDeleted = @@ROWCOUNT;
END;
```

</details>

## Sem alinhamento de coluna

Não alinhe verticalmente `=`, tipos de coluna ou aliases com múltiplos espaços. Use sempre **um espaço único**. Alinhamento artificial quebra com qualquer renomeação, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refatoração.

É um padrão comum em SQL: remover quando encontrado.

<details>
<summary>❌ Ruim: espaços extras para alinhar tipos e atribuições</summary>

```sql
CREATE TABLE Orders
(
  Id          INT             NOT NULL IDENTITY(1, 1),
  Status      NVARCHAR(20)    NOT NULL DEFAULT 'Pending',
  Priority    NVARCHAR(20)    NOT NULL DEFAULT 'Normal',
  CreatedAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders            PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers  FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

UPDATE
  Players
SET
  Players.IsActive      = 0,
  Players.InactivatedAt = GETUTCDATE()
WHERE
  Players.Id = @PlayerId;
```

</details>

<details>
<summary>✅ Bom: espaço único, sem espaçamento extra</summary>

```sql
CREATE TABLE Orders
(
  Id INT NOT NULL IDENTITY(1, 1),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal',
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

UPDATE
  Players
SET
  Players.IsActive = 0,
  Players.InactivatedAt = GETUTCDATE()
WHERE
  Players.Id = @PlayerId;
```

</details>

## Quatro ou mais statements: quebra em 2+2

Quando aparecem 4+ statements homogêneos consecutivos (`ALTER TABLE`, `CREATE INDEX`, `INSERT`), uma série inteira sem respiro forma muralha. Dividir em pares devolve ritmo visual sem fragmentar o grupo.

<details>
<summary>❌ Ruim: muralha de quatro ALTERs sem respiro</summary>

```sql
ALTER TABLE FootballTeams ADD Founded DATE;
ALTER TABLE FootballTeams ADD Stadium NVARCHAR(150);
ALTER TABLE FootballTeams ADD City NVARCHAR(100);
ALTER TABLE FootballTeams ADD Country NVARCHAR(100);
```

</details>

<details>
<summary>✅ Bom: quebra em 2+2</summary>

```sql
ALTER TABLE FootballTeams ADD Founded DATE;
ALTER TABLE FootballTeams ADD Stadium NVARCHAR(150);

ALTER TABLE FootballTeams ADD City NVARCHAR(100);
ALTER TABLE FootballTeams ADD Country NVARCHAR(100);
```

</details>
