# CRUD

INSERT, SELECT, UPDATE, DELETE: formatação vertical e estratégia de exclusão. **CRUD** cobre as quatro operações básicas sobre uma tabela.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **CRUD** (Create, Read, Update, Delete; criar, ler, atualizar, excluir) | As quatro operações básicas sobre uma tabela: `INSERT`, `SELECT`, `UPDATE`, `DELETE` |
| **vertical formatting** (formatação vertical) | Cada coluna ou cláusula em sua linha; legível de cima para baixo, sem scroll horizontal |
| **soft delete** (exclusão lógica) | Marcar a linha como removida (`DeletedAt`) sem apagar do disco |
| **hard delete** (exclusão física) | `DELETE` que remove do disco; irreversível |
| **upsert** (inserir ou atualizar) | `MERGE` ou `INSERT ... ON CONFLICT`; insere se a chave não existe, atualiza se existe |
| **WHERE clause** (cláusula WHERE) | Filtro de linhas; sem `WHERE`, `UPDATE`/`DELETE` afeta toda a tabela |
| **RETURNING / OUTPUT** (cláusula de retorno) | Recupera linhas afetadas pelo DML em uma única ida ao banco |

## INSERT horizontal

<details>
<summary>❌ Ruim: colunas e valores em linha única</summary>

```sql
INSERT INTO Users(Id, Name, Email) VALUES(1, 'Alice', 'alice@email.com');
```

</details>

<details>
<summary>✅ Bom: colunas e valores em blocos verticais separados</summary>

```sql
INSERT INTO Users
(
  Id,
  Name,
  Email
)
VALUES
(
  1,
  'Alice',
  'alice@email.com'
);
```

</details>

## INSERT ... SELECT

<details>
<summary>❌ Ruim: SELECT inline, sem correspondência visual entre colunas</summary>

```sql
INSERT INTO Users(Id, Name, Email) SELECT ExternalId, FullName, ContactEmail FROM ExternalUsers WHERE IsVerified = 1;
```

</details>

<details>
<summary>✅ Bom: colunas do INSERT alinhadas com colunas do SELECT</summary>

```sql
INSERT INTO Users
(
  Id,
  Name,
  Email
)
SELECT
  ExternalUsers.ExternalId,
  ExternalUsers.FullName,
  ExternalUsers.ContactEmail
FROM
  ExternalUsers
WHERE
  ExternalUsers.IsVerified = 1; -- verified account
```

</details>

## UPDATE usando outra tabela

<details>
<summary>❌ Ruim: subquery correlacionada no SET</summary>

```sql
UPDATE Users
SET Email = (
  SELECT NewEmail
  FROM EmailUpdates
  WHERE EmailUpdates.UserId = Users.Id
)
WHERE Id IN (SELECT UserId FROM EmailUpdates);
```

</details>

<details>
<summary>✅ Bom: UPDATE ... FROM ... WHERE</summary>

```sql
UPDATE
  Users
SET
  Users.Email = EmailUpdates.NewEmail
FROM
  EmailUpdates
WHERE
  Users.Id = EmailUpdates.UserId;
```

</details>

## Hard DELETE

Dados deletados são irrecuperáveis. Soft delete com coluna `IsActive = 0` preserva histórico e permite auditoria.

<details>
<summary>❌ Ruim: remoção permanente sem rastro</summary>

```sql
DELETE FROM
  Users
WHERE
  Id = 1;
```

</details>

<details>
<summary>✅ Bom: soft delete com timestamp de inativação</summary>

```sql
UPDATE
  Users
SET
  Users.IsActive = 0, -- inactive
  Users.InactivatedAt = GETUTCDATE()
WHERE
  Users.Id = 1;
```

</details>

## UPDATE condicional em massa

<details>
<summary>❌ Ruim: um UPDATE por condição, duas passagens na tabela</summary>

```sql
UPDATE Orders SET StatusId = 2 WHERE IsActive = 1 AND CustomerId IN (SELECT Id FROM PremiumCustomers);
UPDATE Orders SET StatusId = 3 WHERE IsActive = 1 AND CustomerId NOT IN (SELECT Id FROM PremiumCustomers);
```

</details>

<details>
<summary>✅ Bom: CASE numa única passagem</summary>

```sql
UPDATE
  Orders
SET
  Orders.StatusId = (
    CASE
      WHEN PremiumCustomers.Id IS NOT NULL THEN 2 -- Priority
      ELSE 3 -- Standard
    END
  )
FROM
  Orders
LEFT JOIN
  PremiumCustomers ON Orders.CustomerId = PremiumCustomers.Id
WHERE
  Orders.IsActive = 1; -- active
```

</details>

## Filtros antecipados

Filtrar na tabela principal antes dos JOINs reduz o volume processado. WHERE na tabela driving, não após o JOIN.

<details>
<summary>❌ Ruim: filtro aplicado depois do JOIN em tabela grande</summary>

```sql
SELECT
  Orders.Id,
  Orders.Total,
  Customers.Name
FROM
  Orders
JOIN
  Customers ON Orders.CustomerId = Customers.Id
WHERE
  Orders.Status = 'PENDING' AND
  Orders.CreatedAt >= '2025-01-01';
```

</details>

<details>
<summary>✅ Bom: CTE filtra a tabela principal antes do JOIN</summary>

```sql
WITH PendingOrdersCTE AS
(
  SELECT
    Orders.Id,
    Orders.Total,
    Orders.CustomerId
  FROM
    Orders
  WHERE
    Orders.Status = 'PENDING' AND
    Orders.CreatedAt >= '2025-01-01'
)

SELECT
  PendingOrdersCTE.Id,
  PendingOrdersCTE.Total,
  Customers.Name
FROM
  PendingOrdersCTE
JOIN
  Customers ON PendingOrdersCTE.CustomerId = Customers.Id;
```

</details>

<a id="explicit-ordering"></a>

## Ordenação explícita

Nunca assumir ordem natural. Declarar ORDER BY em todo SELECT que retorna lista.

<details>
<summary>❌ Ruim: sem ORDER BY, ordem indefinida</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: ORDER BY explícito</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1 -- active
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
```

</details>

## Magic numbers: comentário inline

Literais numéricos fixos perdem o significado fora do contexto. Comentário inline expõe a intenção sem criar abstração desnecessária.

<details>
<summary>❌ Ruim: números sem contexto</summary>

```sql
SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.StatusId = 2 AND
  DATEDIFF(day, Orders.CreatedAt, GETDATE()) > 30;
```

</details>

<details>
<summary>✅ Bom: comentário inline expõe a intenção</summary>

```sql
SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.StatusId = 2 AND -- Approved
  DATEDIFF(day, Orders.CreatedAt, GETDATE()) > 30; -- retention window
```

</details>

<a id="named-parameters"></a>

## Parâmetros nomeados: sem valores mágicos

Literais inline tornam a query frágil e difícil de reusar. Usar parâmetros nomeados.

<details>
<summary>❌ Ruim: literais inline, sem contexto</summary>

```sql
SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.Status = 2 AND
  Orders.CreatedAt >= '2025-01-01';
```

</details>

<details>
<summary>✅ Bom: parâmetros nomeados (SQL Server / PostgreSQL)</summary>

```sql
-- SQL Server
SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.Status = @StatusId AND
  Orders.CreatedAt >= @StartDate;

-- PostgreSQL
SELECT
  Orders.Id,
  Orders.Total
FROM
  Orders
WHERE
  Orders.Status = :statusId AND
  Orders.CreatedAt >= :startDate;
```

</details>
