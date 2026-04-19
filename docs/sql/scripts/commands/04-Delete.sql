-- soft delete: preferred over hard delete
UPDATE
  FootballTeams
SET
  FootballTeams.IsActive = 0
WHERE
  FootballTeams.Id = '9585E296-1114-4F35-9B34-1130987BA6D0';

-- soft delete cascade: inactivate all players of the team
UPDATE
  Players
SET
  Players.IsActive = 0
FROM
  Players
JOIN
  FootballTeams ON Players.TeamId = FootballTeams.Id
WHERE
  FootballTeams.Id = '9585E296-1114-4F35-9B34-1130987BA6D0';
