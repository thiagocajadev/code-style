# Procedures: quebrar a query grande em etapas

> Escopo: SQL. Idioms específicos deste ecossistema.

Uma **stored procedure** (procedimento armazenado) é um bloco de SQL que fica guardado dentro do banco e roda quando alguém chama pelo nome. O ganho está em poder quebrar uma query grande em etapas: cada passo grava o resultado parcial em uma **temp table** (tabela temporária que existe só durante a sessão) e o passo seguinte lê dali.

Com as etapas separadas, você consegue rodar uma de cada vez e olhar o que saiu de cada uma. Quando o relatório vem com o número errado, a etapa que errou aparece na conferência. Na query monolítica, com subqueries dentro de subqueries, o mesmo diagnóstico exige desmontar a query à mão.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **stored procedure** (procedimento armazenado) | Bloco SQL compilado e armazenado no banco; executável com `EXEC`/`CALL` |
| **temp table** (tabela temporária) | Tabela criada em sessão com `#` (T-SQL) ou `TEMP` (PostgreSQL); descartada ao final |
| **table variable** (variável de tabela) | `DECLARE @t TABLE` em T-SQL; vive em memória, sem estatísticas |
| **transaction** (transação) | `BEGIN`/`COMMIT`/`ROLLBACK`; agrupa operações como unidade atômica |
| **TRY/CATCH** (tentar/capturar) | Bloco de tratamento de erro em T-SQL; equivalente do `try/except` em PL/pgSQL |
| **idempotent procedure** (procedure idempotente) | Pode ser executada várias vezes com o mesmo efeito; chave para retry seguro |
| **stepdown rule** (regra de descida) | Orquestrador no topo, etapas detalhadas abaixo na ordem de leitura |

<a id="monolithic-query-vs-temp-tables"></a>

## Cada etapa do relatório vira uma temp table nomeada

A procedure abaixo monta o relatório em três passos: primeiro separa os times campeões ativos, depois calcula as estatísticas dos jogadores desses times, e só então junta os dois. Cada passo tem um comentário dizendo o que faz e grava o resultado numa temp table com nome descritivo (`#ActiveChampionTeams`, `#PlayerStatsByTeam`).

<details>
<summary>❌ Ruim: query única com subqueries aninhadas, difícil de debugar</summary>

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
    COUNT(Players.Id) AS TotalPlayers,
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
<summary>✅ Bom: procedure com temp tables, uma etapa por responsabilidade</summary>

```sql
CREATE OR ALTER PROCEDURE SP_GET_TEAM_PERFORMANCE_REPORT
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
    FootballTeams.IsActive = 1 AND -- active
    FootballTeams.ChampionshipsWon > 0; -- at least one title

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
    Players.IsActive = 1 AND -- active
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

-- EXEC SP_GET_TEAM_PERFORMANCE_REPORT;
```

</details>

<a id="procedure-with-parameters"></a>

## Procedure com parâmetros segue a mesma divisão em etapas

Receber parâmetros não muda a estrutura. A procedure abaixo filtra os jogadores em uma etapa, busca o contexto do time em outra, e junta as duas no final. O verbo `LIST` no nome avisa que ela devolve uma coleção filtrada, e o verbo `GET` ficaria reservado para a busca que devolve um único registro.

<details>
<summary>❌ Ruim: JOIN direto sem materializar contexto, lógica misturada em uma query</summary>

```sql
CREATE OR ALTER PROCEDURE SP_LIST_PLAYERS_BY_TEAM_AND_POSITION
(
  @TeamId UNIQUEIDENTIFIER,
  @Position NVARCHAR(50)
)
AS

BEGIN
  SELECT
    FootballTeams.Name AS TeamName,
    FootballTeams.Stadium AS TeamStadium,
    Players.Name AS PlayerName,
    Players.SquadNumber,
    Players.Nationality,
    Players.JoinedAt
  FROM
    Players
  JOIN
    FootballTeams ON Players.TeamId = FootballTeams.Id
  WHERE
    Players.TeamId = @TeamId AND
    Players.Position = @Position AND
    Players.IsActive = 1
  ORDER BY
    Players.SquadNumber;
END;
```

</details>

<details>
<summary>✅ Bom: parâmetros nomeados, contexto materializado antes do JOIN final</summary>

```sql
CREATE OR ALTER PROCEDURE SP_LIST_PLAYERS_BY_TEAM_AND_POSITION
(
  @TeamId UNIQUEIDENTIFIER,
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
    Players.IsActive = 1; -- active

  -- Etapa 2: contexto do time (sempre 1 linha: CROSS JOIN intencional)
  SELECT
    FootballTeams.Name AS TeamName,
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
    #FilteredPlayers.Name AS PlayerName,
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

-- EXEC SP_LIST_PLAYERS_BY_TEAM_AND_POSITION
-- @TeamId = '9585E296-1114-4F35-9B34-1130987BA6D0',
-- @Position = 'Forward';
```

</details>
