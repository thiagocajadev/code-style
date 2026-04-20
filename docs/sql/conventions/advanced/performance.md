# Performance

Erros comuns que tornam consultas lentas e como corrigi-los.

## SELECT *

Trazer todas as colunas transfere dados desnecessários, impede covering indexes e acopla a query ao schema.

<details>
<br>
<summary>❌ Bad — todas as colunas, inclusive as não usadas</summary>

```sql
SELECT
  *
FROM
  Players
WHERE
  Players.IsActive = 1;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — somente as colunas necessárias</summary>

```sql
SELECT
  Players.Id,
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.IsActive = 1  -- active
ORDER BY
  Players.SquadNumber;
```

</details>

## Função aplicada à coluna no WHERE

Aplicar função sobre a coluna filtrada impede o uso do índice — o banco precisa avaliar cada linha.

<details>
<br>
<summary>❌ Bad — função no WHERE, índice ignorado</summary>

```sql
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  YEAR(Players.JoinedAt) = 2022;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — intervalo direto na coluna, índice aproveitado</summary>

```sql
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  Players.JoinedAt >= '2022-01-01' AND
  Players.JoinedAt < '2023-01-01'
ORDER BY
  Players.JoinedAt;
```

</details>

## Subquery correlacionada no SELECT

Subquery no SELECT executa uma vez por linha retornada. Com mil linhas, são mil queries adicionais.

<details>
<br>
<summary>❌ Bad — subquery executa N vezes, uma por time</summary>

```sql
SELECT
  FootballTeams.Name,
  (
    SELECT COUNT(Players.Id)
    FROM Players
    WHERE
      Players.TeamId = FootballTeams.Id AND
      Players.IsActive = 1
  ) AS TotalPlayers
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — CTE agrega uma vez, JOIN cruza o resultado</summary>

```sql
WITH ActivePlayerCountCTE AS
(
  SELECT
    Players.TeamId,
    COUNT(Players.Id) AS TotalPlayers
  FROM
    Players
  WHERE
    Players.IsActive = 1  -- active
  GROUP BY
    Players.TeamId
)

SELECT
  FootballTeams.Name,
  ActivePlayerCountCTE.TotalPlayers
FROM
  FootballTeams
JOIN
  ActivePlayerCountCTE ON FootballTeams.Id = ActivePlayerCountCTE.TeamId
WHERE
  FootballTeams.IsActive = 1  -- active
ORDER BY
  ActivePlayerCountCTE.TotalPlayers DESC;
```

</details>

## Índice simples

Colunas usadas em WHERE, JOIN e ORDER BY sem índice forçam full table scan.

<details>
<br>
<summary>❌ Bad — full scan em tabela grande sem índice na coluna filtrada</summary>

```sql
-- sem índice em TeamId: o banco lê todos os registros da tabela
SELECT
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.TeamId = @TeamId AND
  Players.IsActive = 1;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — índice na coluna principal do filtro</summary>

```sql
CREATE INDEX IX_Players_TeamId
  ON Players (TeamId);
```

</details>

## Índice composto — ordem de seletividade

A coluna de maior seletividade (mais valores distintos) deve vir primeiro.

<details>
<br>
<summary>❌ Bad — coluna de baixa seletividade isolada</summary>

```sql
-- IsActive tem apenas dois valores (0 / 1): índice ineficiente sozinho
CREATE INDEX IX_Players_IsActive
  ON Players (IsActive);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — alta seletividade primeiro, baixa seletividade filtra dentro do grupo</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive
  ON Players (TeamId, IsActive);
```

</details>

## Covering index

Sem INCLUDE, o banco faz key lookup na tabela principal para cada linha — mesmo com índice.

<details>
<br>
<summary>❌ Bad — índice sem cobertura, key lookup para Name / Position / SquadNumber</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive
  ON Players (TeamId, IsActive);

-- esta query ainda acessa a tabela principal para buscar as colunas do SELECT
SELECT
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.TeamId = @TeamId AND
  Players.IsActive = 1;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — INCLUDE cobre todas as colunas do SELECT, zero key lookup</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive_Cover
  ON Players (TeamId, IsActive)
  INCLUDE (Name, Position, SquadNumber);
```

</details>

## FK sem índice

Foreign key sem índice na coluna referenciadora força full table scan a cada `DELETE` ou `UPDATE` na tabela pai. O banco precisa verificar se existem filhos antes de executar a operação.

<details>
<br>
<summary>❌ Bad — FK declarada, coluna sem índice</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER NOT NULL,
  TeamId UNIQUEIDENTIFIER NOT NULL,

  CONSTRAINT PK_Players PRIMARY KEY (Id),
  CONSTRAINT FK_Players_FootballTeams FOREIGN KEY (TeamId)
    REFERENCES FootballTeams (Id)
);

-- DELETE em FootballTeams faz full scan em Players para checar filhos
```

</details>

<br>

<details>
<br>
<summary>✅ Good — índice na coluna FK, lookup eficiente</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER NOT NULL,
  TeamId UNIQUEIDENTIFIER NOT NULL,

  CONSTRAINT PK_Players PRIMARY KEY (Id),
  CONSTRAINT FK_Players_FootballTeams FOREIGN KEY (TeamId)
    REFERENCES FootballTeams (Id)
);

CREATE INDEX IX_Players_TeamId
  ON Players (TeamId);
```

</details>

> [!NOTE]
> Alguns sistemas de alta escala — como o GitHub — optam por **não usar FK no banco**, transferindo a responsabilidade de integridade referencial para a aplicação. O trade-off é consciente: FK tem custo em toda operação de escrita (INSERT, UPDATE, DELETE precisa validar a referência), e em volumes muito grandes esse overhead se torna relevante. O ganho é performance de escrita e flexibilidade de deploy; a contrapartida é que o banco não garante a integridade — qualquer falha na camada de aplicação pode gerar dados órfãos. Para a maioria dos sistemas, FK com índice é a escolha certa. A remoção é uma decisão arquitetural, não uma otimização prematura.

## Tipo de ID — BIGINT vs UUID

A escolha do tipo de ID impacta diretamente o tamanho do índice e a frequência de page splits.
UUID v4 insere em posições aleatórias na B-tree — o banco divide páginas constantemente. Em tabelas
com alto volume de inserções, a fragmentação degrada progressivamente leituras e escritas.

| Tipo | Tamanho | Unicidade global | Sequencial | Page splits |
| --- | --- | --- | --- | --- |
| `BIGINT IDENTITY` | 8 bytes | ❌ | ✅ | mínimo |
| `UUID v4` (`NEWID`) | 16 bytes | ✅ | ❌ | alto |
| `UUID v7` | 16 bytes | ✅ | ✅ | mínimo |

UUID v7 combina timestamp de alta resolução com aleatoriedade — insere sempre próximo ao fim da
B-tree, como um `BIGINT`, mas com unicidade global. É gerado na aplicação, não pelo banco.

<details>
<br>
<summary>❌ Bad — NEWID() gera UUID v4: random, fragmenta índice progressivamente</summary>

```sql
CREATE TABLE Orders
(
    Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- random: page splits constantes
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — BIGINT quando unicidade global não é requisito</summary>

```sql
CREATE TABLE Orders
(
    Id         BIGINT    NOT NULL IDENTITY(1, 1),
    CustomerId BIGINT    NOT NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — UUID v7 gerado na aplicação: unicidade global + sequencial</summary>

```sql
-- o ID é gerado na aplicação antes do INSERT
-- Guid.CreateVersion7() — .NET 9+
-- uuidv7() — npm uuid
-- pg_uuidv7 — extensão PostgreSQL
CREATE TABLE Orders
(
    Id         UNIQUEIDENTIFIER NOT NULL, -- sem DEFAULT: valor vem da aplicação
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

`NEWSEQUENTIALID()` (SQL Server) é uma alternativa nativa sequencial, mas só funciona como
`DEFAULT` — não é portável entre bancos e impede geração de ID antes do INSERT.

## Paginação — OFFSET / FETCH

Nunca trazer todos os registros para paginar em memória. Delegar a paginação ao banco.

<details>
<br>
<summary>❌ Bad — traz tudo e descarta em memória</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
-- aplicação filtra a página no código
```

</details>

<br>

<details>
<br>
<summary>✅ Good — OFFSET / FETCH (SQL Server e PostgreSQL)</summary>

```sql
-- SQL Server
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC
OFFSET @Page * @PageSize ROWS
FETCH NEXT @PageSize ROWS ONLY;

-- PostgreSQL
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC
LIMIT :pageSize OFFSET :page * :pageSize;
```

</details>
