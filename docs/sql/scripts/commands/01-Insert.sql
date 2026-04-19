INSERT INTO FootballTeams
(
  Id,
  Name,
  FoundedYear,
  Stadium,
  City,
  Country,
  Manager,
  ChampionshipsWon
)
VALUES
(
  NEWID(),
  'São Paulo Futebol Clube',
  1930,
  'Morumbi',
  'São Paulo',
  'Brazil',
  'Telê Santana',
  6
);

INSERT INTO Players
(
  Id,
  Name,
  TeamId,
  Position,
  SquadNumber,
  Nationality,
  JoinedAt
)
VALUES
(
  NEWID(),
  'Jonathan Calleri',
  '9585E296-1114-4F35-9B34-1130987BA6D0',
  'Forward',
  9,
  'Argentine',
  '2022-07-01'
);
