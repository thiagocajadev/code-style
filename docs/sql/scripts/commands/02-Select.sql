-- all active teams
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.FoundedYear,
  FootballTeams.Stadium,
  FootballTeams.City,
  FootballTeams.Country,
  FootballTeams.Manager,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC;

-- team with active players (JOIN)
SELECT
  FootballTeams.Name AS TeamName,
  Players.Name AS PlayerName,
  Players.Position,
  Players.SquadNumber
FROM
  FootballTeams
JOIN
  Players ON FootballTeams.Id = Players.TeamId
WHERE
  FootballTeams.IsActive = 1 AND
  Players.IsActive = 1
ORDER BY
  FootballTeams.Name,
  Players.SquadNumber;

-- top teams with player count (CTE)
WITH ActivePlayerCountCTE AS
(
  SELECT
    Players.TeamId,
    COUNT(*) AS TotalPlayers
  FROM
    Players
  WHERE
    Players.IsActive = 1
  GROUP BY
    Players.TeamId
)

SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon,
  ActivePlayerCountCTE.TotalPlayers
FROM
  FootballTeams
JOIN
  ActivePlayerCountCTE ON FootballTeams.Id = ActivePlayerCountCTE.TeamId
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
