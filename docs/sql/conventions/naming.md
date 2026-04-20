# Naming

Código em inglês. Tabelas no plural, colunas no singular. Nomes descritivos eliminam conflito com
palavras reservadas sem precisar de delimitadores.

> Os exemplos deste guia seguem a convenção do SQL Server. No PostgreSQL, aplique `snake_case` em
> minúsculas — os princípios de nomenclatura são os mesmos.
>
> | Conceito             | SQL Server            | PostgreSQL            |
> | -------------------- | --------------------- | --------------------- |
> | Tabela               | `FootballTeams`       | `football_teams`      |
> | Coluna               | `SquadNumber`         | `squad_number`        |
> | Procedure / Function | `SP_GET_ORDERS_BY_ID` | `fn_get_orders_by_id` |
> | Index                | `IX_PLAYERS_TEAM_ID`  | `ix_players_team_id`  |

## Nomes em português

Palavras comuns no português colidem com tipos e funções SQL: `Data` (data type), `Time` (time
type), `Status` (usado em comandos).

<details>
<br>
<summary>❌ Bad — delimitadores para escapar palavras reservadas</summary>

```sql
SELECT [Data], [Time] FROM [TimesDeFutebol];
```

</details>

<br>

<details>
<br>
<summary>✅ Good — inglês elimina a ambiguidade</summary>

```sql
SELECT MatchDate, TeamName FROM FootballTeams;
```

</details>

## Tabelas no plural, colunas no singular

<details>
<br>
<summary>❌ Bad — singular em tabelas, português, sem padrão</summary>

```sql
CREATE TABLE Time
(
  TimeId INT,
  NomeDoTime NVARCHAR(100),
  TotalTitulos INT
);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — plural na tabela, singular nas colunas, inglês</summary>

```sql
CREATE TABLE FootballTeams
(
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(100) NOT NULL,
  FoundedYear INT,
  Stadium NVARCHAR(150),
  City NVARCHAR(100),
  Country NVARCHAR(100),
  Coach NVARCHAR(100),
  ChampionshipsWon INT DEFAULT 0
);
```

</details>

## Prefixo da tabela no nome da coluna

<details>
<br>
<summary>❌ Bad — nome da tabela repetido em cada coluna</summary>

```sql
SELECT
  UserId,
  UserName,
  UserEmail
FROM
  Users;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — nome da tabela qualifica a coluna diretamente</summary>

```sql
SELECT
  Users.Id,
  Users.Name,
  Users.Email
FROM
  Users;
```

</details>

## Qualificação explícita — sempre Tabela.Coluna

Nunca usar colunas nuas em queries com mais de uma tabela. Sem aliases de uma letra (`u`, `t`, `c`).

<details>
<br>
<summary>❌ Bad — colunas sem qualificação, alias de letra</summary>

```sql
SELECT
  u.Id,
  Name,
  Email
FROM
  Users u
JOIN
  Orders o ON u.Id = o.UserId;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — nome completo da tabela em todas as referências</summary>

```sql
SELECT
  Users.Id,
  Users.Name,
  Users.Email
FROM
  Users
JOIN
  Orders ON Users.Id = Orders.UserId;
```

</details>

## Prefixos de objetos

Cada tipo de objeto carrega um prefixo que declara a intenção antes mesmo de ler o nome.

| Prefixo | Objeto            | Padrão do nome                                  | Exemplos                                             |
| ------- | ----------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `SP_`   | Stored Procedure  | `SP_VERBO_TABELA` ou `SP_VERBO_TABELA_BY_CAMPO` | `SP_GET_ORDERS_BY_ID`, `SP_LIST_ACTIVE_ORDERS`       |
| `FN_`   | Function          | `FN_VERBO_CONCEITO`                             | `FN_CALCULATE_ORDER_TOTAL`, `FN_GET_PLAYERS_BY_TEAM` |
| `IX_`   | Index             | `IX_TABELA_CAMPO`                               | `IX_PLAYERS_TEAM_ID`, `IX_ORDERS_CUSTOMER_ID_STATUS` |
| `VW_`   | View              | `VW_DESCRICAO`                                  | `VW_ACTIVE_ORDERS`, `VW_TEAM_PLAYER_SUMMARY`         |
| `TRG_`  | Trigger           | `TRG_TABELA_EVENTO`                             | `TRG_ORDERS_ON_INSERT`, `TRG_PLAYERS_ON_UPDATE`      |
| `PK_`   | Primary Key       | `PK_TABELA`                                     | `PK_FootballTeams`, `PK_Players`                     |
| `FK_`   | Foreign Key       | `FK_TABELA_REFERENCIA`                          | `FK_Players_FootballTeams`, `FK_Orders_Customers`    |
| `UQ_`   | Unique constraint | `UQ_TABELA_CAMPO`                               | `UQ_USERS_EMAIL`, `UQ_PLAYERS_TEAM_JERSEY`           |
| `CK_`   | Check constraint  | `CK_TABELA_CAMPO`                               | `CK_Players_SquadNumber`, `CK_Orders_Amount`         |

## Constraints nomeadas

Toda constraint deve ser declarada com `CONSTRAINT` e um nome explícito. Constraints inline sem nome
tornam erros difíceis de identificar e impossibilitam `ALTER TABLE ... DROP CONSTRAINT`.

<details>
<br>
<summary>❌ Bad — constraints inline sem nome</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  TeamId UNIQUEIDENTIFIER NOT NULL REFERENCES FootballTeams(Id),
  SquadNumber INT CHECK (SquadNumber BETWEEN 1 AND 99)
);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — constraints nomeadas, removíveis e identificáveis</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  TeamId UNIQUEIDENTIFIER NOT NULL,
  SquadNumber INT NOT NULL,

  CONSTRAINT PK_Players PRIMARY KEY (Id),
  CONSTRAINT FK_Players_FootballTeams FOREIGN KEY (TeamId)
    REFERENCES FootballTeams (Id),
  CONSTRAINT CK_Players_SquadNumber CHECK (SquadNumber BETWEEN 1 AND 99)
);
```

</details>

### Verbos de Stored Procedure

| Verbo    | Intenção                           | Exemplo                                      |
| -------- | ---------------------------------- | -------------------------------------------- |
| `GET`    | Busca por identificador único      | `SP_GET_ORDER_BY_ID`                         |
| `LIST`   | Busca com filtros, retorna coleção | `SP_LIST_ORDERS_BY_CUSTOMER_ID`              |
| `ADD`    | Inserção de novo registro          | `SP_ADD_ORDER`, `SP_ADD_PLAYER`              |
| `UPDATE` | Atualização de registro existente  | `SP_UPDATE_ORDER_STATUS`, `SP_UPDATE_PLAYER` |
| `DELETE` | Exclusão (preferencialmente soft)  | `SP_DELETE_ORDER_BY_ID`                      |
