-- update single record
UPDATE
  FootballTeams
SET
  FootballTeams.Manager = 'Telê Santana',
  FootballTeams.TicketPrice = 120.00
WHERE
  FootballTeams.Id = '9585E296-1114-4F35-9B34-1130987BA6D0';

-- update using data from another table (UPDATE ... FROM)
UPDATE
  Players
SET
  Players.IsActive = FootballTeams.IsActive
FROM
  FootballTeams
WHERE
  Players.TeamId = FootballTeams.Id AND
  FootballTeams.IsActive = 0;

-- conditional bulk update (CASE)
UPDATE
  Players
SET
  Players.Position = (
    CASE
      WHEN Players.SquadNumber BETWEEN 1  AND 1  THEN 'Goalkeeper'
      WHEN Players.SquadNumber BETWEEN 2  AND 5  THEN 'Defender'
      WHEN Players.SquadNumber BETWEEN 6  AND 8  THEN 'Midfielder'
      WHEN Players.SquadNumber BETWEEN 9  AND 11 THEN 'Forward'
      ELSE Players.Position
    END
  )
WHERE
  Players.IsActive = 1;
