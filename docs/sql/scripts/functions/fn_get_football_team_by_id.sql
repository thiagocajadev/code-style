-- PostgreSQL

CREATE OR REPLACE FUNCTION fn_get_football_team_by_id
(
  p_team_id UUID
)
RETURNS TABLE
(
  id UUID,
  name TEXT,
  founded_year INT,
  stadium TEXT,
  city TEXT,
  country TEXT,
  manager TEXT,
  championships_won INT,
  player_name TEXT,
  position TEXT,
  squad_number INT,
  nationality TEXT
) AS $$

BEGIN
  RETURN QUERY
  SELECT
    football_teams.id,
    football_teams.name,
    football_teams.founded_year,
    football_teams.stadium,
    football_teams.city,
    football_teams.country,
    football_teams.manager,
    football_teams.championships_won,
    players.name AS player_name,
    players.position,
    players.squad_number,
    players.nationality
  FROM
    football_teams
  LEFT JOIN
    players
    ON football_teams.id = players.team_id AND
       players.is_active = true
  WHERE
    football_teams.id = p_team_id AND
    football_teams.is_active = true
  ORDER BY
    players.squad_number;
END;

$$ LANGUAGE plpgsql;

-- SELECT * FROM fn_get_football_team_by_id('9585E296-1114-4F35-9B34-1130987BA6D0');
