# Visual Density — SQL

Os mesmos princípios de [densidade visual](../../shared/visual-density.md) aplicados a SQL.

Em SQL, as cláusulas (`SELECT`, `FROM`, `WHERE`, `JOIN`) já funcionam como separadores visuais — adicionar blank entre elas vai contra as convenções de formatadores como pgFormatter e sqlfmt. A regra não se aplica a cláusulas.

**A exceção é CTE.** Cada `WITH nome AS (...)` é uma etapa nomeada — semanticamente equivalente a uma variável. Cada CTE merece uma linha em branco de separação.

## Assinatura e corpo

Procedures e functions têm dois blocos distintos: assinatura (nome, parâmetros, tipo de retorno) e corpo (lógica). Uma linha em branco entre eles deixa essa fronteira visível.

Em T-SQL, a linha vai entre `AS` e `BEGIN`. Em PostgreSQL, vai após o `$$` de abertura e antes do `$$` de fechamento.

<details>
<summary>✅ Good — T-SQL: linha em branco entre AS e BEGIN</summary>
<br>

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

<br>

<details>
<summary>✅ Good — PostgreSQL: linha em branco após $$ e antes do fechamento</summary>
<br>

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
    Id,
    Name,
    ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    Id = TeamId;
END;

$$ LANGUAGE plpgsql;
```

</details>

## CTEs encadeadas

<details>
<summary>❌ Bad — CTEs coladas, sem separação entre as etapas</summary>
<br>

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

<br>

<details>
<summary>✅ Good — linha em branco entre CTEs, cada etapa legível</summary>
<br>

```sql
WITH TeamCTE AS
(
  SELECT
    Id,
    Name,
    ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    Id = 1
),

ActivePlayersCTE AS
(
  SELECT
    PlayerId,
    PlayerName,
    TeamId
  FROM
    Players
  WHERE
    IsActive = 1
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

## Etapas em procedures

Procedures com múltiplas etapas (filtrar, enriquecer, agregar, inserir) seguem a mesma lógica: cada bloco lógico separado por uma linha em branco. Queries longas e distintas nunca ficam coladas.

<details>
<summary>✅ Good — etapas separadas, fluxo da procedure legível</summary>
<br>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount
FROM
  Orders
WHERE
  Orders.Status = 'Active'
  AND Orders.CreatedAt >= @StartDate
  AND Orders.CreatedAt < @EndDate;

SELECT
  ActiveOrders.OrderId,
  ActiveOrders.TotalAmount,
  Customers.Name AS CustomerName,
  Customers.Tier AS CustomerTier
FROM
  #ActiveOrders ActiveOrders
JOIN
  Customers ON ActiveOrders.CustomerId = Customers.Id;
```

</details>
