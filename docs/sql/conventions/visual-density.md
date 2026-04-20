# Visual Density — SQL

Os mesmos princípios de [densidade visual](../../shared/visual-density.md) aplicados a SQL.

Em SQL, as cláusulas (`SELECT`, `FROM`, `WHERE`, `JOIN`) já funcionam como separadores visuais — adicionar blank entre elas vai contra as convenções de formatadores como pgFormatter e sqlfmt. A regra não se aplica a cláusulas.

**A exceção é CTE.** Cada `WITH nome AS (...)` é uma etapa nomeada — semanticamente equivalente a uma variável. Cada CTE merece uma linha em branco de separação.

## CTEs encadeadas

<details>
<br>
<summary>❌ Bad — CTEs coladas, sem separação entre as etapas</summary>

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
<br>
<summary>✅ Good — linha em branco entre CTEs, cada etapa legível</summary>

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
<br>
<summary>✅ Good — etapas separadas, fluxo da procedure legível</summary>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  o.Id,
  o.CustomerId,
  o.TotalAmount
FROM
  Orders o
WHERE
  o.Status = 'Active'
  AND o.CreatedAt >= @StartDate
  AND o.CreatedAt < @EndDate;

SELECT
  ao.OrderId,
  ao.TotalAmount,
  c.Name AS CustomerName,
  c.Tier AS CustomerTier
FROM
  #ActiveOrders ao
JOIN
  Customers c ON ao.CustomerId = c.Id;
```

</details>
