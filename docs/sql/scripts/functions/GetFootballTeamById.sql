-- PostgreSQL

CREATE OR REPLACE FUNCTION GetFootballTeamById
(
  TeamId UUID
)
RETURNS TABLE
(
  Id UUID,
  Name TEXT,
  FoundedYear INT,
  Stadium TEXT,
  City TEXT,
  Country TEXT,
  Manager TEXT,
  ChampionshipsWon INT,
  PlayerName TEXT,
  Position TEXT,
  SquadNumber INT,
  Nationality TEXT
) AS $$
BEGIN
  RETURN QUERY
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
       Players.IsActive = true
  WHERE
    FootballTeams.Id = TeamId AND
    FootballTeams.IsActive = true
  ORDER BY
    Players.SquadNumber;
END;
$$ LANGUAGE plpgsql;

-- SELECT * FROM GetFootballTeamById('9585E296-1114-4F35-9B34-1130987BA6D0');
