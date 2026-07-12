# Densidade visual em SQL

A linha em branco é a ferramenta que separa um grupo de linhas do próximo. Este guia aplica ao **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) usados nas outras linguagens do repositório.

O SQL tem uma particularidade. As palavras-chave que abrem cada parte da query (`SELECT`, `FROM`, `WHERE`, `ORDER BY`) já funcionam como marcos visuais, então a query não precisa de linha em branco entre elas. A linha em branco fica reservada para separar coisas que são de fato independentes: uma CTE da próxima, um comando do próximo, a assinatura de uma procedure do corpo dela.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **clause** (cláusula) | Cada palavra-chave que abre uma parte da query: `SELECT`, `FROM`, `WHERE`, `JOIN`, `ORDER BY` |
| **statement** (comando) | Uma instrução SQL completa, encerrada com ponto e vírgula |
| **CTE** (Common Table Expression · expressão de tabela nomeada) | Um `WITH nome AS (...)` que dá nome a um resultado intermediário da query |
| **stored procedure** (procedimento armazenado) | Bloco SQL guardado no banco, com assinatura (nome e parâmetros) e corpo |
| **control flow** (fluxo de controle) | `IF`, `WHILE`, `BEGIN TRY / CATCH`: os blocos que decidem o que roda e quantas vezes |
| **temp table** (tabela temporária) | Tabela que só existe durante a sessão, criada com `#` no SQL Server |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| **Cláusulas da mesma query ficam juntas** | `SELECT`, `FROM`, `WHERE`, `JOIN`, `ORDER BY` são partes de uma frase só |
| **Uma linha em branco entre CTEs** | Cada `WITH nome AS (...)` é uma etapa nomeada e ganha o próprio respiro |
| **Bloco de várias linhas respira depois** | CTE, subquery ou `CASE WHEN` expandido, quando vem outro comando em seguida |
| **Comandos consecutivos se separam** | Dois `INSERT`, dois `UPDATE`, uma linha em branco entre eles |
| **Assinatura e corpo se separam** | Uma linha em branco entre `AS` (ou `$$`) e a primeira instrução |
| **Um espaço único ao redor de `=`, tipos e aliases** | Sem espaços extras para alinhar colunas na vertical |
| **Fluxo de controle respira antes e depois** | `IF ... END IF`, `WHILE`, `TRY / CATCH` ficam isolados por linha em branco |
| **O comando que consome o anterior fica junto dele** | `SET @Rows = @@ROWCOUNT` logo abaixo do DML que ele mede |
| **Quatro comandos iguais quebram em 2+2** | Série longa de `ALTER TABLE` ou `CREATE INDEX` ganha respiro a cada par |
| **Nunca duas linhas em branco seguidas** | Exatamente uma entre grupos; duas viram ruído |

<a id="clauses-without-blank"></a>

## As cláusulas da mesma query ficam juntas

O olho já reconhece `SELECT`, `FROM` e `WHERE` como marcos: cada uma abre a própria linha e começa na margem. A linha em branco entre elas quebra a query em pedaços que não são pedaços de verdade, porque as três formam uma frase só.

<details>
<summary>❌ Ruim: linha em branco entre as cláusulas de uma mesma query</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name

FROM
  FootballTeams

WHERE
  FootballTeams.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: as cláusulas da query ficam juntas e se leem como uma frase</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1;
```

</details>

<a id="signature-and-body"></a>

## Uma linha em branco entre a assinatura e o corpo

A procedure tem duas partes: a assinatura, que declara o nome, os parâmetros e o que ela devolve, e o corpo, que faz o trabalho. Uma linha em branco entre as duas mostra onde uma termina e a outra começa.

No T-SQL, a linha vai entre o `AS` e o `BEGIN`. No PostgreSQL, ela vai logo depois do `$$` que abre o corpo e logo antes do `$$` que fecha.

Repare também no nome de cada objeto. No SQL Server, a procedure segue `SP_VERBO_TABELA` em maiúsculas. No PostgreSQL, a function segue o `snake_case` da linguagem, com o prefixo `fn_`. Os detalhes estão em [prefixos de objetos](naming.md#object-prefixes).

<details>
<summary>❌ Ruim: T-SQL: a assinatura e o corpo da procedure juntos</summary>

```sql
CREATE OR ALTER PROCEDURE SP_GET_FOOTBALL_TEAM_BY_ID
(
  @TeamId INT
)
AS
BEGIN
  SELECT
    Id,
    Name,
    ChampionshipsWon
  FROM
    FootballTeams
  WHERE
    Id = @TeamId;
END;
```

</details>

<details>
<summary>✅ Bom: T-SQL: linha em branco entre AS e BEGIN</summary>

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

<details>
<summary>✅ Bom: PostgreSQL: linha em branco após $$ e antes do fechamento</summary>

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

<a id="chained-ctes"></a>

## Uma linha em branco entre uma CTE e a próxima

A CTE cumpre em SQL o papel que a variável cumpre em outras linguagens: ela dá nome a um resultado para que o próximo passo use aquele nome. Duas CTEs juntas parecem um bloco só. Separadas por uma linha em branco, cada etapa se lê por conta própria.

<details>
<summary>❌ Ruim: CTEs juntas, sem separação entre as etapas</summary>

```sql
WITH TeamCTE AS
(
  SELECT Id, Name, ChampionshipsWon
  FROM FootballTeams
  WHERE Id = 1
),
ActivePlayersCTE AS
(
  SELECT PlayerId, PlayerName, TeamId
  FROM Players
  WHERE IsActive = 1
)
SELECT TeamCTE.Name, ActivePlayersCTE.PlayerName
FROM TeamCTE
JOIN ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

<details>
<summary>✅ Bom: linha em branco entre CTEs, cada etapa legível</summary>

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
    Players.IsActive = 1
)

SELECT
  TeamCTE.Name,
  ActivePlayersCTE.PlayerName
FROM
  TeamCTE
JOIN
  ActivePlayersCTE ON TeamCTE.Id = ActivePlayersCTE.TeamId;
```

</details>

<a id="consecutive-statements"></a>

## Uma linha em branco entre um comando e o próximo

Dois comandos seguidos (`INSERT` e depois `SELECT`, por exemplo) são duas etapas independentes: cada um tem começo, meio e ponto e vírgula. Colados, o ponto e vírgula do primeiro se perde no meio do texto e o leitor precisa procurar onde um acaba.

<details>
<summary>❌ Ruim: dois comandos juntos, sem nada marcando onde o primeiro termina</summary>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount
FROM
  Orders
WHERE
  Orders.Status = 'Active';
SELECT
  ActiveOrders.OrderId,
  Customers.Name AS CustomerName
FROM
  #ActiveOrders ActiveOrders
JOIN
  Customers ON ActiveOrders.CustomerId = Customers.Id;
```

</details>

<details>
<summary>✅ Bom: uma linha em branco separa um comando do outro</summary>

```sql
INSERT INTO #ActiveOrders (OrderId, CustomerId, TotalAmount)
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount
FROM
  Orders
WHERE
  Orders.Status = 'Active';

SELECT
  ActiveOrders.OrderId,
  Customers.Name AS CustomerName
FROM
  #ActiveOrders ActiveOrders
JOIN
  Customers ON ActiveOrders.CustomerId = Customers.Id;
```

</details>

<a id="control-flow-breathing"></a>

## O bloco de fluxo de controle respira antes e depois

`IF ... END IF`, `WHILE` e `BEGIN TRY / CATCH` ocupam várias linhas e mudam o que roda. Uma linha em branco antes e outra depois isolam o bloco das declarações que o cercam.

Dentro do bloco existe uma exceção. O `SET @RowsDeleted = @@ROWCOUNT` lê o resultado do `DELETE` que veio logo acima: ele conta quantas linhas o comando anterior apagou. Como um depende do outro, os dois ficam juntos, sem linha em branco no meio.

<details>
<summary>❌ Ruim: o bloco WHILE junto do comando anterior</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsDeleted INT = 1;
WHILE @RowsDeleted > 0
BEGIN
  DELETE TOP (@ChunkSize) FROM
    Players
  WHERE
    Players.IsActive = 0;
  SET @RowsDeleted = @@ROWCOUNT;
END;
```

</details>

<details>
<summary>✅ Bom: bloco isolado por linhas em branco</summary>

```sql
DECLARE @ChunkSize INT = 1000;
DECLARE @RowsDeleted INT = 1;

WHILE @RowsDeleted > 0
BEGIN
  DELETE TOP (@ChunkSize) FROM
    Players
  WHERE
    Players.IsActive = 0;
  SET @RowsDeleted = @@ROWCOUNT;
END;
```

</details>

<a id="no-column-alignment"></a>

## Um espaço único ao redor de tipos, aliases e o sinal de igual

Use um espaço só. Encher de espaços para alinhar os tipos numa coluna vertical parece organizado até alguém renomear `Status` para `OrderStatus`: aí todas as linhas do bloco precisam ser reindentadas, e o diff mostra dez linhas alteradas quando só uma mudou de verdade. O alinhamento é comum em código SQL antigo, e vale desfazer quando aparecer.

<details>
<summary>❌ Ruim: espaços extras para alinhar tipos e atribuições</summary>

```sql
CREATE TABLE Orders
(
  Id          INT             NOT NULL IDENTITY(1, 1),
  Status      NVARCHAR(20)    NOT NULL DEFAULT 'Pending',
  Priority    NVARCHAR(20)    NOT NULL DEFAULT 'Normal',
  CreatedAt   DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders            PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers  FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

UPDATE
  Players
SET
  Players.IsActive      = 0,
  Players.InactivatedAt = GETUTCDATE()
WHERE
  Players.Id = @PlayerId;
```

</details>

<details>
<summary>✅ Bom: espaço único, sem espaçamento extra</summary>

```sql
CREATE TABLE Orders
(
  Id INT NOT NULL IDENTITY(1, 1),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal',
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

UPDATE
  Players
SET
  Players.IsActive = 0,
  Players.InactivatedAt = GETUTCDATE()
WHERE
  Players.Id = @PlayerId;
```

</details>

<a id="four-statements-split"></a>

## Quatro comandos iguais se quebram em dois pares

Quatro `ALTER TABLE` seguidos, todos com a mesma forma, viram um bloco compacto em que o olho perde a linha e você relê. Uma linha em branco no meio divide a série em dois pares, e cada par se confere de uma olhada. Até três comandos seguidos ficam juntos.

<details>
<summary>❌ Ruim: parede com quatro ALTERs seguidos, sem respiro</summary>

```sql
ALTER TABLE FootballTeams ADD Founded DATE;
ALTER TABLE FootballTeams ADD Stadium NVARCHAR(150);
ALTER TABLE FootballTeams ADD City NVARCHAR(100);
ALTER TABLE FootballTeams ADD Country NVARCHAR(100);
```

</details>

<details>
<summary>✅ Bom: os quatro ALTERs quebrados em dois pares</summary>

```sql
ALTER TABLE FootballTeams ADD Founded DATE;
ALTER TABLE FootballTeams ADD Stadium NVARCHAR(150);

ALTER TABLE FootballTeams ADD City NVARCHAR(100);
ALTER TABLE FootballTeams ADD Country NVARCHAR(100);
```

</details>
