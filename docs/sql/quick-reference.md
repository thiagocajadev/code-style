# Quick Reference

Tabelas de consulta rápida para as convenções SQL deste guia.

## Nomenclatura

| Objeto | Convenção | Padrão | Exemplo |
| --- | --- | --- | --- |
| Tabelas | PascalCase plural | — | `FootballTeams`, `Players`, `Orders` |
| Colunas | PascalCase singular | — | `SquadNumber`, `IsActive`, `CreatedAt` |
| Stored Procedure | UPPER_SNAKE | `SP_VERBO_TABELA` | `SP_GET_ORDERS_BY_ID` |
| Function | UPPER_SNAKE | `FN_VERBO_CONCEITO` | `FN_CALCULATE_ORDER_TOTAL` |
| Index | UPPER_SNAKE | `IX_TABELA_CAMPO` | `IX_PLAYERS_TEAM_ID` |
| View | UPPER_SNAKE | `VW_DESCRICAO` | `VW_ACTIVE_ORDERS` |
| Trigger | UPPER_SNAKE | `TRG_TABELA_EVENTO` | `TRG_ORDERS_ON_INSERT` |

## Verbos de procedure

| Verbo | Intenção | Exemplo |
| --- | --- | --- |
| `GET` | Busca por identificador único | `SP_GET_ORDER_BY_ID` |
| `LIST` | Coleção com filtros | `SP_LIST_ORDERS_BY_CUSTOMER_ID` |
| `ADD` | Inserção | `SP_ADD_ORDER`, `SP_ADD_PLAYER` |
| `UPDATE` | Atualização | `SP_UPDATE_ORDER_STATUS` |
| `DELETE` | Exclusão (preferencialmente soft) | `SP_DELETE_ORDER_BY_ID` |

## Taboos

| Evitar | Usar |
| --- | --- |
| `SELECT *` | colunas explícitas e necessárias |
| Aliases de letra (`t`, `c`, `u`) | nome completo da tabela |
| `AND` / `OR` no início da linha | `AND` / `OR` ao final da linha |
| Função na coluna do WHERE (`YEAR(date)`) | intervalo direto (`date >= '...'`) |
| Subquery correlacionada no SELECT | CTE com agregação |
| `ORDER BY` ausente | `ORDER BY` sempre declarado |
| `UPDATE` / `DELETE` sem `WHERE` | `WHERE` obrigatório |
| Literais inline (`Status = 2`) | parâmetros nomeados (`@StatusId`) |
| Número fixo sem contexto (`StatusId = 2`) | comentário inline (`StatusId = 2  -- Approved`) |

## Constraints

| Prefixo | Tipo | Padrão | Exemplo |
| --- | --- | --- | --- |
| `PK_` | Primary Key | `PK_TABELA` | `PK_Players`, `PK_FootballTeams` |
| `FK_` | Foreign Key | `FK_TABELA_REFERENCIA` | `FK_Players_FootballTeams` |
| `UQ_` | Unique | `UQ_TABELA_CAMPO` | `UQ_Users_Email` |
| `CK_` | Check | `CK_TABELA_CAMPO` | `CK_Players_SquadNumber` |

Constraints sempre nomeadas com `CONSTRAINT` — sem inline sem nome. FK sempre acompanhada de índice na coluna referenciadora.

## Query estruturada

Ordem canônica das cláusulas — qualificação explícita, condições verticais, AND ao final.

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon,
  Players.Name AS PlayerName,
  Players.Position
FROM
  FootballTeams
JOIN
  Players ON FootballTeams.Id = Players.TeamId
WHERE
  FootballTeams.IsActive = 1 AND
  FootballTeams.Country = 'Brazil' AND
  Players.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC,
  Players.SquadNumber;
```

## CTE vs temp table

```sql
-- CTE: leitura simples, derivação única
WITH ActivePlayersCTE AS
(
  SELECT
    Players.TeamId,
    COUNT(Players.Id) AS Total
  FROM
    Players
  WHERE
    Players.IsActive = 1
  GROUP BY
    Players.TeamId
)

SELECT
  FootballTeams.Name,
  ActivePlayersCTE.Total
FROM
  FootballTeams
JOIN
  ActivePlayersCTE ON FootballTeams.Id = ActivePlayersCTE.TeamId;

-- Temp table: resultado reutilizado mais de uma vez, ou com índice próprio
SELECT
  Players.TeamId,
  COUNT(Players.Id) AS Total
INTO
  #ActivePlayerCount
FROM
  Players
WHERE
  Players.IsActive = 1
GROUP BY
  Players.TeamId;

-- índice vale quando a temp table tem muitas linhas e será reutilizada; criar após todos os INSERTs
CREATE INDEX IX_ActivePlayerCount_TeamId
  ON #ActivePlayerCount (TeamId);
```
