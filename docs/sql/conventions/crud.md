# CRUD

INSERT, SELECT, UPDATE, DELETE — formatação vertical e estratégia de exclusão.

## INSERT horizontal

<details>
<summary>❌ Bad — colunas e valores em linha única</summary>
<br>

```sql
INSERT INTO Users(Id, Name, Email) VALUES(1, 'Alice', 'alice@email.com');
```

</details>

<br>

<details>
<summary>✅ Good — colunas e valores em blocos verticais separados</summary>
<br>

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
<summary>❌ Bad — SELECT inline, sem correspondência visual entre colunas</summary>
<br>

```sql
INSERT INTO Users(Id, Name, Email) SELECT ExternalId, FullName, ContactEmail FROM ExternalUsers WHERE IsVerified = 1;
```

</details>

<br>

<details>
<summary>✅ Good — colunas do INSERT alinhadas com colunas do SELECT</summary>
<br>

```sql
INSERT INTO Users
(
  Id,
  Name,
  Email
)
SELECT
  ExternalId,
  FullName,
  ContactEmail
FROM
  ExternalUsers
WHERE
  IsVerified = 1; -- verified account
```

</details>

## UPDATE usando outra tabela

<details>
<summary>❌ Bad — subquery correlacionada no SET</summary>
<br>

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

<br>

<details>
<summary>✅ Good — UPDATE ... FROM ... WHERE</summary>
<br>

```sql
UPDATE
  Users
SET
  Email = EmailUpdates.NewEmail
FROM
  EmailUpdates
WHERE
  Users.Id = EmailUpdates.UserId;
```

</details>

## Hard DELETE

Dados deletados são irrecuperáveis. Soft delete — coluna `IsActive = 0` — preserva histórico e permite auditoria.

<details>
<summary>❌ Bad — remoção permanente sem rastro</summary>
<br>

```sql
DELETE FROM
  Users
WHERE
  Id = 1;
```

</details>

<br>

<details>
<summary>✅ Good — soft delete com timestamp de inativação</summary>
<br>

```sql
UPDATE
  Users
SET
  IsActive = 0, -- inactive
  InactivatedAt = GETDATE()
WHERE
  Id = 1;
```

</details>

## UPDATE condicional em massa

<details>
<summary>❌ Bad — um UPDATE por condição, duas passagens na tabela</summary>
<br>

```sql
UPDATE Orders SET StatusId = 2 WHERE IsActive = 1 AND CustomerId IN (SELECT Id FROM PremiumCustomers);
UPDATE Orders SET StatusId = 3 WHERE IsActive = 1 AND CustomerId NOT IN (SELECT Id FROM PremiumCustomers);
```

</details>

<br>

<details>
<summary>✅ Good — CASE numa única passagem</summary>
<br>

```sql
UPDATE
  Orders
SET
  StatusId = (
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
<summary>❌ Bad — filtro aplicado depois do JOIN em tabela grande</summary>
<br>

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

<br>

<details>
<summary>✅ Good — CTE filtra a tabela principal antes do JOIN</summary>
<br>

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

## Ordenação explícita

Nunca assumir ordem natural. Declarar ORDER BY em todo SELECT que retorna lista.

<details>
<summary>❌ Bad — sem ORDER BY, ordem indefinida</summary>
<br>

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

<br>

<details>
<summary>✅ Good — ORDER BY explícito</summary>
<br>

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

## Magic numbers — comentário inline

Literais numéricos fixos perdem o significado fora do contexto. Comentário inline expõe a intenção sem criar abstração desnecessária.

<details>
<summary>❌ Bad — números sem contexto</summary>
<br>

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

<br>

<details>
<summary>✅ Good — comentário inline expõe a intenção</summary>
<br>

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

## Parâmetros nomeados — sem valores mágicos

Literais inline tornam a query frágil e difícil de reusar. Usar parâmetros nomeados.

<details>
<summary>❌ Bad — literais inline, sem contexto</summary>
<br>

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

<br>

<details>
<summary>✅ Good — parâmetros nomeados (SQL Server / PostgreSQL)</summary>
<br>

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
