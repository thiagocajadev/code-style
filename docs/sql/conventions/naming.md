# Nomes em SQL

O nome de uma tabela ou coluna é lido muito mais vezes do que é escrito, e trocá-lo depois sai caro: você precisa de uma migration, e toda query, view e linha de código que citam aquele nome mudam junto. Escreva tudo em inglês, use plural na tabela e singular na coluna. Um nome descritivo em inglês raramente colide com uma palavra que a linguagem SQL já reservou para si, então você não precisa de colchetes nem de aspas para escapar o nome.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PascalCase** (caixa Pascal) | Convenção do SQL Server: `FootballTeams`, `SquadNumber` |
| **snake_case** (caixa com sublinhado) | Convenção do PostgreSQL: `football_teams`, `squad_number` |
| **reserved keyword** (palavra reservada) | Termo da linguagem SQL: `Date`, `Time`, `Status`; evitar como nome de coluna |
| **delimiter** (delimitador) | `[ ]` (T-SQL) ou `" "` (PostgreSQL) para escapar nomes; sintoma de naming ruim |
| **plural table** (tabela no plural) | `Users`, `Players`; coleção de entidades |
| **singular column** (coluna no singular) | `Name`, `Email`; representa uma propriedade da entidade |
| **prefix convention** (convenção de prefixo) | `IX_` para índice, `FK_` para foreign key, `SP_` para procedure |

> Os exemplos deste guia seguem a convenção do SQL Server. No PostgreSQL, aplique `snake_case` em
> minúsculas; os princípios de nomenclatura são os mesmos.
>
> | Conceito             | SQL Server            | PostgreSQL            |
> | -------------------- | --------------------- | --------------------- |
> | Tabela               | `FootballTeams`       | `football_teams`      |
> | Coluna               | `SquadNumber`         | `squad_number`        |
> | Procedure / Function | `SP_GET_ORDERS_BY_ID` | `fn_get_orders_by_id` |
> | Index                | `IX_PLAYERS_TEAM_ID`  | `ix_players_team_id`  |

<a id="portuguese-names"></a>

## Todo identificador é escrito em inglês

Palavras comuns do português colidem com tipos e funções que a linguagem **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) já usa: `Data` é um tipo de data, `Time` é um tipo de hora e `Status` aparece em comandos. Quando o nome colide, o banco só aceita a query se você escapar o identificador com colchetes ou aspas, e a partir daí todo mundo que tocar naquela tabela carrega os delimitadores junto.

<details>
<summary>❌ Ruim: delimitadores para escapar palavras reservadas</summary>

```sql
SELECT [Data], [Time] FROM [TimesDeFutebol];
```

</details>

<details>
<summary>✅ Bom: inglês elimina a ambiguidade</summary>

```sql
SELECT MatchDate, TeamName FROM FootballTeams;
```

</details>

<a id="plural-table-singular-column"></a>

## Tabela no plural, coluna no singular

A tabela guarda uma coleção, então ela recebe o plural: `FootballTeams`. Cada coluna descreve uma propriedade de um único registro, então ela recebe o singular: `Name`, `FoundedYear`. Ler `FootballTeams.Name` já diz que estamos olhando o nome de um time dentro da coleção de times.

<details>
<summary>❌ Ruim: singular em tabelas, português, sem padrão</summary>

```sql
CREATE TABLE Time
(
  TimeId INT,
  NomeDoTime NVARCHAR(100),
  TotalTitulos INT
);
```

</details>

<details>
<summary>✅ Bom: plural na tabela, singular nas colunas, inglês</summary>

```sql
CREATE TABLE FootballTeams
(
  Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  Name NVARCHAR(100) NOT NULL,
  FoundedYear INT,
  Stadium NVARCHAR(150),
  City NVARCHAR(100),
  Country NVARCHAR(100),
  Coach NVARCHAR(100),
  ChampionshipsWon INT DEFAULT 0,

  CONSTRAINT PK_FootballTeams PRIMARY KEY (Id)
);
```

</details>

<a id="table-name-in-column"></a>

## A coluna não repete o nome da tabela

`Users.UserName` diz "usuário" duas vezes. A tabela já dá o contexto, então a coluna carrega só a propriedade: `Users.Name`, `Users.Email`. O prefixo repetido cresce em cada `SELECT` e não acrescenta informação nenhuma.

<details>
<summary>❌ Ruim: nome da tabela repetido em cada coluna</summary>

```sql
SELECT
  UserId,
  UserName,
  UserEmail
FROM
  Users;
```

</details>

<details>
<summary>✅ Bom: nome da tabela qualifica a coluna diretamente</summary>

```sql
SELECT
  Users.Id,
  Users.Name,
  Users.Email
FROM
  Users;
```

</details>

<a id="explicit-qualification"></a>

## Toda coluna aparece como Tabela.Coluna

Em uma query com mais de uma tabela, a coluna sozinha esconde de onde ela veio. `Name` pode ser o nome do usuário ou o nome do pedido, e descobrir qual dos dois exige abrir o schema. Escrever `Users.Name` responde a pergunta na própria linha. Pelo mesmo motivo, o alias de uma letra (`u`, `t`, `c`) fica de fora: ele economiza três caracteres e devolve a dúvida ao leitor.

<details>
<summary>❌ Ruim: colunas sem qualificação, alias de letra</summary>

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

<details>
<summary>✅ Bom: nome completo da tabela em todas as referências</summary>

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

<a id="object-prefixes"></a>

## Prefixos de objetos

Cada tipo de objeto do banco carrega um prefixo no nome. Ao encontrar `IX_PLAYERS_TEAM_ID` em um script, você já sabe que é um índice antes de ler o resto da linha, e ao encontrar `SP_GET_ORDER_BY_ID` já sabe que é uma procedure que busca um pedido por identificador.

No SQL Server, procedures e functions ficam em maiúsculas com sublinhado (`SP_GET_ORDER_BY_ID`). No PostgreSQL, o mesmo objeto segue o `snake_case` minúsculo da linguagem (`fn_get_order_by_id`). O prefixo é o mesmo em ideia; a caixa acompanha o idioma do banco.

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

<a id="named-constraints"></a>

## Toda constraint tem nome explícito

Declare cada **constraint** (regra que o banco impõe sobre os dados) com a palavra `CONSTRAINT` e um nome seu. Quando você deixa a constraint inline e sem nome, o banco inventa um nome como `CK__Players__SquadN__3B75D760`. Duas coisas quebram a partir daí: a mensagem de erro que chega ao desenvolvedor cita esse nome ilegível, e o `ALTER TABLE ... DROP CONSTRAINT` fica impossível de escrever numa migration, porque o nome gerado muda de ambiente para ambiente.

<details>
<summary>❌ Ruim: constraints inline sem nome</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  TeamId UNIQUEIDENTIFIER NOT NULL REFERENCES FootballTeams(Id),
  SquadNumber INT CHECK (SquadNumber BETWEEN 1 AND 99)
);
```

</details>

<details>
<summary>✅ Bom: constraints nomeadas, removíveis e identificáveis</summary>

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

### Verbos de stored procedure

O verbo abre o nome da procedure e diz o que ela faz com os dados. `GET` traz um registro, `LIST` traz uma coleção filtrada, e essa diferença evita que o chamador espere uma linha e receba mil.

| Verbo    | Intenção                           | Exemplo                                      |
| -------- | ---------------------------------- | -------------------------------------------- |
| `GET`    | Busca por identificador único      | `SP_GET_ORDER_BY_ID`                         |
| `LIST`   | Busca com filtros, retorna coleção | `SP_LIST_ORDERS_BY_CUSTOMER_ID`              |
| `ADD`    | Inserção de novo registro          | `SP_ADD_ORDER`, `SP_ADD_PLAYER`              |
| `UPDATE` | Atualização de registro existente  | `SP_UPDATE_ORDER_STATUS`, `SP_UPDATE_PLAYER` |
| `DELETE` | Exclusão (preferencialmente soft)  | `SP_DELETE_ORDER_BY_ID`                      |
