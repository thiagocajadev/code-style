# Performance

> Escopo: SQL. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

Erros comuns que tornam consultas lentas e como corrigi-los.

## SELECT *

Trazer todas as colunas transfere dados desnecessários, impede covering indexes e acopla a query ao schema.

<details>
<summary>❌ Bad — todas as colunas, inclusive as não usadas</summary>
<br>

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
<summary>✅ Good — somente as colunas necessárias</summary>
<br>

```sql
SELECT
  Players.Id,
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.IsActive = 1 -- active
ORDER BY
  Players.SquadNumber;
```

</details>

## Função aplicada à coluna no WHERE

Aplicar função sobre a coluna filtrada impede o uso do índice: o banco precisa avaliar cada linha.

<details>
<summary>❌ Bad — função no WHERE, índice ignorado</summary>
<br>

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
<summary>✅ Good — intervalo direto na coluna, índice aproveitado</summary>
<br>

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

## CAST e conversão de tipo em colunas

Aplicar `CAST` ou `CONVERT` sobre uma coluna indexada tem o mesmo efeito de qualquer função no
`WHERE`: o banco avalia cada linha individualmente e descarta o índice. O caso mais insidioso é a
conversão implícita: quando o tipo do parâmetro não corresponde ao tipo da coluna, o banco converte
em silêncio, sem aviso, sem erro, com full scan.

### CAST explícito na coluna de filtro

<details>
<summary>❌ Bad — CAST na coluna: índice em SquadNumber ignorado</summary>
<br>

```sql
-- SquadNumber é INT; comparação como texto força conversão de cada linha
SELECT
  Players.Name,
  Players.SquadNumber,
  Players.Position
FROM
  Players
WHERE
  CAST(Players.SquadNumber AS NVARCHAR) = @SquadParam AND
  Players.IsActive = 1;
```

</details>

<br>

<details>
<summary>✅ Good — parâmetro com o tipo correto, coluna intocada</summary>
<br>

```sql
-- @SquadNumber declarado como INT na aplicação; zero conversão no banco
SELECT
  Players.Name,
  Players.SquadNumber,
  Players.Position
FROM
  Players
WHERE
  Players.SquadNumber = @SquadNumber AND
  Players.IsActive = 1 -- active
ORDER BY
  Players.SquadNumber;
```

</details>

### Conversão implícita por tipo incompatível

**SQL** (Structured Query Language, Linguagem de Consulta Estruturada) Server converte o tipo da coluna quando o literal ou parâmetro não corresponde. A query roda,
nenhum erro aparece, e o índice é ignorado em silêncio.

<details>
<summary>❌ Bad — literal VARCHAR comparado com coluna NVARCHAR: conversão implícita linha a linha</summary>
<br>

```sql
-- Players.Name é NVARCHAR; literal sem prefixo N é VARCHAR
-- SQL Server converte cada Name para VARCHAR antes de comparar
SELECT
  Players.Id,
  Players.Name,
  Players.Position
FROM
  Players
WHERE
  Players.Name = 'Alice Smith'; -- VARCHAR literal, índice ignorado
```

</details>

<br>

<details>
<summary>✅ Good — prefixo N alinha o tipo do literal com a coluna NVARCHAR</summary>
<br>

```sql
SELECT
  Players.Id,
  Players.Name,
  Players.Position
FROM
  Players
WHERE
  Players.Name = N'Alice Smith'; -- NVARCHAR literal, índice aproveitado
```

</details>

### CAST em condição de JOIN

Type mismatch entre colunas de JOIN força conversão em cada linha de uma das tabelas. Converter
a coluna não indexada preserva o índice da principal.

<details>
<summary>❌ Bad — CAST na coluna indexada da tabela principal</summary>
<br>

```sql
-- FootballTeams.Id é INT; ExternalTeams.TeamReference é NVARCHAR
-- CAST em FootballTeams.Id descarta o índice em Id
SELECT
  FootballTeams.Name,
  ExternalTeams.LeagueName
FROM
  FootballTeams
JOIN
  ExternalTeams ON CAST(FootballTeams.Id AS NVARCHAR) = ExternalTeams.TeamReference;
```

</details>

<br>

<details>
<summary>✅ Good — CAST na coluna não indexada; preferível: corrigir o schema</summary>
<br>

```sql
-- opção 1: converter o lado não indexado — índice em FootballTeams.Id preservado
SELECT
  FootballTeams.Name,
  ExternalTeams.LeagueName
FROM
  FootballTeams
JOIN
  ExternalTeams ON FootballTeams.Id = CAST(ExternalTeams.TeamReference AS INT);

-- opção 2 (ideal): alinhar os tipos no schema e eliminar a conversão
-- ALTER TABLE ExternalTeams ALTER COLUMN TeamReference INT NOT NULL;
```

</details>

### Data armazenada como texto

Coluna de data armazenada como `VARCHAR` obriga `CONVERT` em toda query de filtro por período.
A correção é normalizar o tipo no schema: `DATE` ou `DATETIME2` na definição da coluna e
converter na aplicação antes do `INSERT`.

<details>
<summary>❌ Bad — data como VARCHAR: CONVERT em todo filtro, índice inutilizável</summary>
<br>

```sql
-- JoinedAt definido como VARCHAR(10): '2024-01-15', '15/01/2024', '2024/01/15'
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  CONVERT(DATE, Players.JoinedAt) >= '2024-01-01' AND
  CONVERT(DATE, Players.JoinedAt) <  '2025-01-01';
```

</details>

<br>

<details>
<summary>✅ Good — JoinedAt como DATE: filtro direto, índice aproveitado</summary>
<br>

```sql
-- schema correto: JoinedAt DATE NOT NULL
-- aplicação envia Date, não string; zero conversão no banco
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  Players.JoinedAt >= '2024-01-01' AND
  Players.JoinedAt <  '2025-01-01'
ORDER BY
  Players.JoinedAt;
```

</details>

## Subquery correlacionada no SELECT

Subquery no SELECT executa uma vez por linha retornada. Com mil linhas, são mil queries adicionais.

<details>
<summary>❌ Bad — subquery executa N vezes, uma por time</summary>
<br>

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
<summary>✅ Good — CTE agrega uma vez, JOIN cruza o resultado</summary>
<br>

```sql
WITH ActivePlayerCountCTE AS
(
  SELECT
    Players.TeamId,
    COUNT(Players.Id) AS TotalPlayers
  FROM
    Players
  WHERE
    Players.IsActive = 1 -- active
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
  FootballTeams.IsActive = 1 -- active
ORDER BY
  ActivePlayerCountCTE.TotalPlayers DESC;
```

</details>

## Índice simples

Colunas usadas em WHERE, JOIN e ORDER BY sem índice forçam full table scan.

<details>
<summary>❌ Bad — full scan em tabela grande sem índice na coluna filtrada</summary>
<br>

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
<summary>✅ Good — índice na coluna principal do filtro</summary>
<br>

```sql
CREATE INDEX IX_Players_TeamId
  ON Players (TeamId);
```

</details>

## Índice composto: ordem de seletividade

A coluna de maior seletividade (mais valores distintos) deve vir primeiro.

<details>
<summary>❌ Bad — coluna de baixa seletividade isolada</summary>
<br>

```sql
-- IsActive tem apenas dois valores (0 / 1): índice ineficiente sozinho
CREATE INDEX IX_Players_IsActive
  ON Players (IsActive);
```

</details>

<br>

<details>
<summary>✅ Good — alta seletividade primeiro, baixa seletividade filtra dentro do grupo</summary>
<br>

```sql
CREATE INDEX IX_Players_TeamId_IsActive
  ON Players (TeamId, IsActive);
```

</details>

## Covering index

Sem INCLUDE, o banco faz key lookup na tabela principal para cada linha, mesmo com índice.

<details>
<summary>❌ Bad — índice sem cobertura, key lookup para Name / Position / SquadNumber</summary>
<br>

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
<summary>✅ Good — INCLUDE cobre todas as colunas do SELECT, zero key lookup</summary>
<br>

```sql
CREATE INDEX IX_Players_TeamId_IsActive_Cover
  ON Players (TeamId, IsActive)
  INCLUDE (Name, Position, SquadNumber);
```

</details>

## FK sem índice

Foreign key sem índice na coluna referenciadora força full table scan a cada `DELETE` ou `UPDATE` na tabela pai. O banco precisa verificar se existem filhos antes de executar a operação.

<details>
<summary>❌ Bad — FK declarada, coluna sem índice</summary>
<br>

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
<summary>✅ Good — índice na coluna FK, lookup eficiente</summary>
<br>

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

## Tipo de ID: BIGINT vs UUID

A escolha do tipo de ID impacta diretamente o tamanho do índice e a frequência de page splits.
**UUID** (Universally Unique Identifier, Identificador Universalmente Único) v4 insere em posições aleatórias na B-tree e o banco divide páginas constantemente. Em tabelas
com alto volume de inserções, a fragmentação degrada leituras e escritas.

| Tipo | Tamanho | Unicidade global | Sequencial | Page splits |
| --- | --- | --- | --- | --- |
| `BIGINT IDENTITY` | 8 bytes | ❌ | ✅ | mínimo |
| `UUID v4` (`NEWID`) | 16 bytes | ✅ | ❌ | alto |
| `UUID v7` | 16 bytes | ✅ | ✅ | mínimo |

UUID v7 combina timestamp de alta resolução com aleatoriedade e insere sempre próximo ao fim da
B-tree, como um `BIGINT`, mas com unicidade global. É gerado na aplicação, não pelo banco.

<details>
<summary>❌ Bad — NEWID() gera UUID v4: random, fragmenta índice progressivamente</summary>
<br>

```sql
CREATE TABLE Orders
(
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- random: page splits constantes
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<br>

<details>
<summary>✅ Good — BIGINT quando unicidade global não é requisito</summary>
<br>

```sql
CREATE TABLE Orders
(
    Id BIGINT NOT NULL IDENTITY(1, 1),
    CustomerId BIGINT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<br>

<details>
<summary>✅ Good — UUID v7 gerado na aplicação: unicidade global + sequencial</summary>
<br>

```sql
-- o ID é gerado na aplicação antes do INSERT
-- Guid.CreateVersion7() — .NET 9+
-- uuidv7() — npm uuid
-- pg_uuidv7 — extensão PostgreSQL
CREATE TABLE Orders
(
    Id UNIQUEIDENTIFIER NOT NULL, -- sem DEFAULT: valor vem da aplicação
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

`NEWSEQUENTIALID()` (SQL Server) é uma alternativa nativa sequencial, mas só funciona como
`DEFAULT`: não é portável entre bancos e impede geração de ID antes do INSERT.

## Paginação: OFFSET / FETCH

Nunca trazer todos os registros para paginar em memória. Delegar a paginação ao banco.

<details>
<summary>❌ Bad — traz tudo e descarta em memória</summary>
<br>

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
<summary>✅ Good — OFFSET / FETCH (SQL Server e PostgreSQL)</summary>
<br>

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
