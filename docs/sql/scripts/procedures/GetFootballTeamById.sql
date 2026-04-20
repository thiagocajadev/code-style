-- SQL Server

CREATE OR ALTER PROCEDURE GetFootballTeamById
(
  @TeamId UNIQUEIDENTIFIER
)
AS

BEGIN
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.FoundedYear,
    FootballTeams.Stadium,
    FootballTeams.City,
    FootballTeams.Country,
    FootballTeams.Manager,
    FootballTeams.ChampionshipsWon,
    Players.Name AS PlayerName,
    Players.Position,
    Players.SquadNumber,
    Players.Nationality
  FROM
    FootballTeams
  LEFT JOIN
    Players
    ON FootballTeams.Id = Players.TeamId AND
       Players.IsActive = 1
  WHERE
    FootballTeams.Id = @TeamId AND
    FootballTeams.IsActive = 1
  ORDER BY
    Players.SquadNumber;
END;

-- EXEC GetFootballTeamById @TeamId = '9585E296-1114-4F35-9B34-1130987BA6D0';
