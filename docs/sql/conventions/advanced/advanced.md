# Advanced

Subqueries aninhadas são difíceis de rastrear. CTEs nomeiam os passos e tornam a intenção legível.

## Subquery aninhada

<details>
<summary>❌ Bad — subquery no WHERE sem nome</summary>
<br>

```sql
SELECT
  Name,
  ChampionshipsWon
FROM
  FootballTeams
WHERE
  Id IN (
    SELECT
      TeamId
    FROM
      Players
    WHERE
      IsActive = 1
  );
```

</details>

<br>

<details>
<summary>✅ Good — CTE nomeada no topo</summary>
<br>

```sql
WITH ActivePlayerTeamsCTE AS
(
  SELECT
    TeamId
  FROM
    Players
  WHERE
    IsActive = 1 -- active
)

SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
JOIN
  ActivePlayerTeamsCTE ON FootballTeams.Id = ActivePlayerTeamsCTE.TeamId;
```

</details>

## CTEs encadeadas

<details>
<summary>❌ Bad — JOIN de subqueries, difícil de acompanhar</summary>
<br>

```sql
SELECT t.Name, t.ChampionshipsWon, p.PlayerName
FROM
  (SELECT Id, Name, ChampionshipsWon FROM FootballTeams WHERE Id = 1) t
JOIN
  (SELECT PlayerId, PlayerName, TeamId FROM Players WHERE IsActive = 1) p
  ON t.Id = p.TeamId;
```

</details>

<br>

<details>
<summary>✅ Good — duas CTEs separadas, JOIN no SELECT final</summary>
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
    IsActive = 1 -- active
)

SELECT
  TeamCTE.Name,
  TeamCTE.ChampionshipsWon,
  ActivePlayersCTE.PlayerName
FROM
  TeamCTE
JOIN
  ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

## Procedure — SQL Server

<details>
<summary>❌ Bad — prefixo genérico, nome vago, sem formatação vertical</summary>
<br>

```sql
CREATE PROCEDURE sp_GetData @id INT AS
BEGIN
  SELECT Id, Name, ChampionshipsWon FROM FootballTeams WHERE Id = @id
END
```

</details>

<br>

<details>
<summary>✅ Good — nome descritivo, parâmetro tipado, formatação vertical</summary>
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

## Function — PostgreSQL

<details>
<summary>❌ Bad — RETURNS VOID, sem RETURNS TABLE, parâmetro sem tipo explícito</summary>
<br>

```sql
CREATE FUNCTION get_team(id INT) RETURNS VOID AS $$
BEGIN
  SELECT * FROM FootballTeams WHERE Id = id;
END;
$$ LANGUAGE plpgsql;
```

</details>

<br>

<details>
<summary>✅ Good — RETURNS TABLE com colunas declaradas, RETURN QUERY</summary>
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
