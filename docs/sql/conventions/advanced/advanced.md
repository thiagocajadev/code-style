# Recursos avançados de SQL

> Escopo: SQL. Idioms específicos deste ecossistema.

Uma query que cresce costuma crescer para dentro: uma subquery dentro do `WHERE`, outra dentro do `FROM`, e em pouco tempo o leitor precisa desmontar três níveis para entender de onde veio um número. A **CTE** (Common Table Expression · expressão de tabela nomeada) resolve isso dando nome a cada passo e deixando a query plana. Esta página cobre as CTEs e o formato correto de procedures e functions.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **CTE** (Common Table Expression · expressão de tabela comum) | Resultado nomeado via `WITH ... AS (...)`; cada CTE é um passo legível |
| **subquery** (subconsulta) | Query aninhada dentro de outra; sem nome próprio, dificulta leitura quando aninhada |
| **window function** (função de janela) | `OVER (PARTITION BY ... ORDER BY ...)`; calcula sobre uma faixa sem agrupar |
| **recursive CTE** (CTE recursiva) | `WITH RECURSIVE`, que referencia a si mesma; usada para hierarquias e grafos |
| **derived table** (tabela derivada) | Subquery na cláusula `FROM` com alias; alternativa local à CTE |
| **lateral join** (junção lateral) | `LATERAL` permite que a subquery referencie colunas da tabela à esquerda |
| **set operation** (operação de conjunto) | `UNION`, `INTERSECT`, `EXCEPT`; combinam resultados de queries com schema compatível |

<a id="nested-subquery"></a>

## A subquery do WHERE vira uma CTE com nome

A subquery dentro do `IN (...)` não tem nome, então quem lê precisa entrar nela para descobrir o que ela seleciona. Levando aquele mesmo `SELECT` para uma CTE no topo, o nome responde antes: `ActivePlayerTeamsCTE` são os times que têm jogador ativo. A query principal fica com um `JOIN` legível e a CTE pode ser conferida sozinha.

<details>
<summary>❌ Ruim: subquery no WHERE sem nome</summary>

```sql
SELECT
  Name,
  ChampionshipsWon
FROM
  FootballTeams
WHERE
  Id IN (
    SELECT
      TeamId
    FROM
      Players
    WHERE
      IsActive = 1
  );
```

</details>

<details>
<summary>✅ Bom: CTE nomeada no topo</summary>

```sql
WITH ActivePlayerTeamsCTE AS
(
  SELECT
    Players.TeamId
  FROM
    Players
  WHERE
    Players.IsActive = 1 -- active
)

SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
JOIN
  ActivePlayerTeamsCTE ON FootballTeams.Id = ActivePlayerTeamsCTE.TeamId;
```

</details>

<a id="chained-ctes"></a>

## Duas CTEs no topo, o JOIN no final

Quando a query junta dois recortes, cada recorte vira uma CTE e o `SELECT` final junta os dois pelo nome. A alternativa é juntar duas subqueries direto no `FROM`, e aí a linha do `JOIN` carrega duas queries inteiras dentro de parênteses, com aliases de uma letra para caber.

<details>
<summary>❌ Ruim: JOIN de subqueries, difícil de acompanhar</summary>

```sql
SELECT t.Name, t.ChampionshipsWon, p.PlayerName
FROM
  (SELECT Id, Name, ChampionshipsWon FROM FootballTeams WHERE Id = 1) t
JOIN
  (SELECT PlayerId, PlayerName, TeamId FROM Players WHERE IsActive = 1) p
  ON t.Id = p.TeamId;
```

</details>

<details>
<summary>✅ Bom: duas CTEs separadas, JOIN no SELECT final</summary>

```sql
WITH TeamCTE AS
(
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = 1
),

ActivePlayersCTE AS
(
  SELECT
    Players.Id AS PlayerId,
    Players.Name AS PlayerName,
    Players.TeamId
  FROM
    Players
  WHERE
    Players.IsActive = 1 -- active
)

SELECT
  TeamCTE.Name,
  TeamCTE.ChampionshipsWon,
  ActivePlayersCTE.PlayerName
FROM
  TeamCTE
JOIN
  ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

<a id="sql-server-procedure"></a>

## Procedure no SQL Server

Três coisas definem a procedure bem escrita: o nome diz o que ela faz (`SP_GET_FOOTBALL_TEAM_BY_ID`, no formato `SP_VERBO_TABELA`), o parâmetro declara o tipo, e o corpo segue a formatação vertical. O nome `sp_GetData` falha nas três: `sp_` minúsculo é o prefixo que a Microsoft reserva para as procedures de sistema, e `GetData` não diz que dado é esse.

<details>
<summary>❌ Ruim: prefixo genérico, nome vago, sem formatação vertical</summary>

```sql
CREATE PROCEDURE sp_GetData @id INT AS
BEGIN
  SELECT Id, Name, ChampionshipsWon FROM FootballTeams WHERE Id = @id
END
```

</details>

<details>
<summary>✅ Bom: nome descritivo, parâmetro tipado, formatação vertical</summary>

```sql
CREATE OR ALTER PROCEDURE SP_GET_FOOTBALL_TEAM_BY_ID
(
  @TeamId INT
)
AS

BEGIN
  SELECT
    FootballTeams.Id,
    FootballTeams.Name,
    FootballTeams.ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    FootballTeams.Id = @TeamId;
END;
```

</details>

<a id="postgres-function"></a>

## Function no PostgreSQL

A function que devolve linhas declara `RETURNS TABLE` com as colunas e usa `RETURN QUERY`. Com `RETURNS VOID`, o `SELECT` de dentro roda e o resultado se perde, porque a function não devolve nada a quem chamou.

O nome segue o idioma do PostgreSQL: `snake_case` minúsculo com o prefixo `fn_`, e isso vale para o nome da function, para os parâmetros e para as colunas. O parâmetro leva o prefixo `p_` (`p_team_id`) para não colidir com a coluna `team_id` da tabela, porque dentro do corpo o PL/pgSQL não saberia a qual dos dois você se refere.

<details>
<summary>❌ Ruim: RETURNS VOID, sem RETURNS TABLE, parâmetro sem tipo explícito</summary>

```sql
CREATE FUNCTION get_team(id INT) RETURNS VOID AS $$
BEGIN
  SELECT * FROM FootballTeams WHERE Id = id;
END;
$$ LANGUAGE plpgsql;
```

</details>

<details>
<summary>✅ Bom: RETURNS TABLE com colunas declaradas, RETURN QUERY</summary>

```sql
CREATE OR REPLACE FUNCTION fn_get_football_team_by_id
(
  p_team_id INT
)
RETURNS TABLE
(
  id INT,
  name TEXT,
  championships_won INT
) AS $$

BEGIN
  RETURN QUERY
  SELECT
    football_teams.id,
    football_teams.name,
    football_teams.championships_won
  FROM
    football_teams
  WHERE
    football_teams.id = p_team_id;
END;

$$ LANGUAGE plpgsql;
```

</details>
