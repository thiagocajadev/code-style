# Procedures

Procedures decompõem queries complexas em etapas nomeadas. Tabelas temporárias materializam
resultados intermediários, tornando cada passo testável e legível.

## Query monolítica vs etapas com temp tables

<details>
<summary>❌ Bad — query única com subqueries aninhadas, difícil de debugar</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon,
  PlayerStats.TotalPlayers,
  PlayerStats.AvgSquadNumber
FROM
  FootballTeams
JOIN (
  SELECT
    Players.TeamId,
    COUNT(Players.Id)         AS TotalPlayers,
    AVG(Players.SquadNumber) AS AvgSquadNumber
  FROM
    Players
  WHERE
    Players.IsActive = 1
  GROUP BY
    Players.TeamId
) PlayerStats ON FootballTeams.Id = PlayerStats.TeamId
WHERE
  FootballTeams.IsActive = 1 AND
  FootballTeams.ChampionshipsWon > 0
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
```

</details>

<details>
<summary>✅ Good — procedure com temp tables, uma etapa por responsabilidade</summary>

```sql
CREATE OR ALTER PROCEDURE GetTeamPerformanceReport
AS
BEGIN
  -- Etapa 1: times ativos com títulos
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  INTO
    #ActiveChampionTeams
  FROM
    FootballTeams
  WHERE
    FootballTeams.IsActive = 1 AND         -- active
    FootballTeams.ChampionshipsWon > 0;    -- at least one title

  -- Etapa 2: estatísticas de jogadores por time
  SELECT
    Players.TeamId,
    COUNT(Players.Id) AS TotalPlayers,
    AVG(Players.SquadNumber) AS AvgSquadNumber
  INTO
    #PlayerStatsByTeam
  FROM
    Players
  WHERE
    Players.IsActive = 1 AND  -- active
    Players.TeamId IN (SELECT #ActiveChampionTeams.Id FROM #ActiveChampionTeams)
  GROUP BY
    Players.TeamId;

  -- Resultado final: combina as etapas
  SELECT
    #ActiveChampionTeams.Name,
    #ActiveChampionTeams.ChampionshipsWon,
    #PlayerStatsByTeam.TotalPlayers,
    #PlayerStatsByTeam.AvgSquadNumber
  FROM
    #ActiveChampionTeams
  LEFT JOIN
    #PlayerStatsByTeam ON #ActiveChampionTeams.Id = #PlayerStatsByTeam.TeamId
  ORDER BY
    #ActiveChampionTeams.ChampionshipsWon DESC;
END;

-- EXEC GetTeamPerformanceReport;
```

</details>

## Procedure com parâmetros e temp tables

<details>
<summary>✅ Good — parâmetros nomeados, contexto materializado antes do JOIN final</summary>

```sql
CREATE OR ALTER PROCEDURE GetPlayersByTeamAndPosition
(
  @TeamId   UNIQUEIDENTIFIER,
  @Position NVARCHAR(50)
)
AS
BEGIN
  -- Etapa 1: jogadores ativos do time na posição solicitada
  SELECT
    Players.Id,
    Players.Name,
    Players.SquadNumber,
    Players.Nationality,
    Players.JoinedAt
  INTO
    #FilteredPlayers
  FROM
    Players
  WHERE
    Players.TeamId = @TeamId AND
    Players.Position = @Position AND
    Players.IsActive = 1;  -- active

  -- Etapa 2: contexto do time (sempre 1 linha — CROSS JOIN intencional)
  SELECT
    FootballTeams.Name    AS TeamName,
    FootballTeams.Stadium AS TeamStadium
  INTO
    #TeamContext
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = @TeamId;

  -- Resultado final
  SELECT
    #TeamContext.TeamName,
    #TeamContext.TeamStadium,
    #FilteredPlayers.Name         AS PlayerName,
    #FilteredPlayers.SquadNumber,
    #FilteredPlayers.Nationality,
    #FilteredPlayers.JoinedAt
  FROM
    #FilteredPlayers
  CROSS JOIN
    #TeamContext
  ORDER BY
    #FilteredPlayers.SquadNumber;
END;

-- EXEC GetPlayersByTeamAndPosition
--   @TeamId   = '9585E296-1114-4F35-9B34-1130987BA6D0',
--   @Position = 'Forward';
```

</details>
