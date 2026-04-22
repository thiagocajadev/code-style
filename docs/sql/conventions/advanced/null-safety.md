# Null safety

> Escopo: SQL. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

NULL em SQL não é `false`, não é `0`, não é string vazia. É a ausência de valor com comportamento
único: qualquer comparação com NULL retorna NULL, não `true` nem `false`.

> Conceito geral: [Null Safety](../../../../shared/standards/null-safety.md)

> Os exemplos seguem a convenção SQL Server (PascalCase). Exemplos específicos de PostgreSQL são
> marcados com `-- PostgreSQL`.

## `= NULL` nunca funciona

A armadilha mais comum. `= NULL` sempre retorna NULL: a condição nunca é verdadeira. Use
`IS NULL` e `IS NOT NULL`.

<details>
<summary>❌ Bad — = NULL não retorna nenhuma linha</summary>
<br>

```sql
SELECT *
FROM orders
WHERE assigned_to = NULL;     -- retorna 0 linhas sempre

SELECT *
FROM orders
WHERE assigned_to != NULL;    -- retorna 0 linhas sempre
```

</details>

<br>

<details>
<summary>✅ Good — IS NULL / IS NOT NULL</summary>
<br>

```sql
SELECT
  Orders.Id,
  Orders.Status,
  Orders.AssignedTo
FROM
  Orders
WHERE
  Orders.AssignedTo IS NULL;

SELECT
  Orders.Id,
  Orders.Status,
  Orders.AssignedTo
FROM
  Orders
WHERE
  Orders.AssignedTo IS NOT NULL;

-- combinando com outras condições
SELECT
  Orders.Id,
  Orders.Status,
  Orders.AssignedTo
FROM
  Orders
WHERE
  Orders.Status = 'Pending' AND
  Orders.AssignedTo IS NULL;
```

</details>

## COALESCE: primeiro valor não-nulo

`COALESCE` retorna o primeiro argumento não-nulo. Substitui `CASE WHEN x IS NULL THEN ...`.
Indispensável para fallbacks e para tornar cálculos seguros.

<details>
<summary>❌ Bad — CASE WHEN para fallback: verboso e difícil de encadear</summary>
<br>

```sql
-- fallback com CASE WHEN: repetitivo para cada nível
SELECT
  UserId,
  CASE
    WHEN Nickname IS NOT NULL THEN Nickname
    WHEN FirstName IS NOT NULL THEN FirstName
    ELSE 'Anonymous'
  END AS DisplayName
FROM Users;

-- cálculo sem proteção: NULL Discount = NULL Total
SELECT
  OrderId,
  Discount + BaseAmount AS Total -- NULL se Discount for NULL
FROM Orders;
```

</details>

<br>

<details>
<summary>✅ Good — fallback e cálculo null-safe</summary>
<br>

```sql
-- fallback em cascata
SELECT
  Users.Id,
  COALESCE(Users.Nickname, Users.FirstName, 'Anonymous') AS DisplayName
FROM
  Users;

-- cálculo null-safe
SELECT
  Orders.Id,
  COALESCE(Orders.Discount, 0) + Orders.BaseAmount AS Total -- NULL Discount = NULL Total sem COALESCE
FROM
  Orders;

-- normalizar dados legados
SELECT
  Products.Id,
  COALESCE(Products.NewPrice, Products.LegacyPrice, 0.00) AS Price
FROM
  Products;
```

</details>

## NULLIF: converter valor em NULL

`NULLIF(a, b)` retorna NULL se `a = b`, senão retorna `a`. Resolve dois casos comuns: divisão
por zero e tratar string vazia como NULL.

<details>
<summary>❌ Bad — CASE WHEN para divisão segura e normalização: mais verboso</summary>
<br>

```sql
-- divisão por zero com CASE
SELECT
  OrderId,
  CASE
    WHEN Quantity = 0 THEN NULL
    ELSE Amount / Quantity
  END AS UnitPrice
FROM Orders;

-- string vazia tratada manualmente
SELECT
  UserId,
  CASE
    WHEN TRIM(PhoneNumber) = '' THEN NULL
    ELSE TRIM(PhoneNumber)
  END AS PhoneNumber
FROM Users;
```

</details>

<br>

<details>
<summary>✅ Good — divisão segura e normalização de string vazia</summary>
<br>

```sql
-- divisão por zero sem CASE
SELECT
  Orders.Id,
  Orders.Amount / NULLIF(Orders.Quantity, 0) AS UnitPrice -- NULL se Quantity for 0
FROM
  Orders;

-- tratar string vazia como NULL
SELECT
  Users.Id,
  NULLIF(TRIM(Users.PhoneNumber), '') AS PhoneNumber -- '' vira NULL
FROM
  Users;
```

</details>

## NOT NULL + DEFAULT: fechar null no schema

A melhor defesa contra null é não deixá-lo entrar. `NOT NULL` e `DEFAULT` juntos garantem que
a coluna sempre tem valor, sem precisar de `COALESCE` em cada query.

<details>
<summary>❌ Bad — coluna nullable sem default obriga COALESCE em todo lugar</summary>
<br>

```sql
CREATE TABLE Orders
(
  Id        INT,
  Status    VARCHAR(20),   -- nullable, sem default
  Priority  VARCHAR(20),   -- nullable, sem default
  CreatedAt DATETIME2      -- nullable, sem default
);

-- toda query precisa se defender
SELECT
  Orders.Id,
  COALESCE(Orders.Status, 'unknown')  AS Status,
  COALESCE(Orders.Priority, 'normal') AS Priority
FROM
  Orders;
```

</details>

<br>

<details>
<summary>✅ Good — NOT NULL + DEFAULT fecha o problema na origem</summary>
<br>

```sql
CREATE TABLE Orders
(
  Id        INT          NOT NULL IDENTITY(1, 1),
  Status    NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  Priority  NVARCHAR(20) NOT NULL DEFAULT 'Normal',
  CreatedAt DATETIME2    NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id)
);

-- queries simples, sem defesa
SELECT
  Orders.Id,
  Orders.Status,
  Orders.Priority
FROM
  Orders;
```

</details>

## NULL em agregações

`SUM`, `AVG`, `MIN` e `MAX` ignoram NULL como se a linha não existisse para o cálculo.
`COUNT(coluna)` ignora NULL; `COUNT(*)` conta todas as linhas.

<details>
<summary>❌ Bad — assumir que COUNT(*) e COUNT(coluna) são equivalentes</summary>
<br>

```sql
-- COUNT(*) conta nulos — o resultado pode enganar
SELECT
  Status,
  COUNT(*) AS AssignedOrders -- inclui linhas onde AssignedTo IS NULL
FROM Orders
GROUP BY Status;

-- SUM pode retornar NULL quando não há linhas no grupo
SELECT
  TeamId,
  SUM(Salary) AS TotalSalary -- retorna NULL se não houver funcionários
FROM Employees
GROUP BY TeamId;
```

</details>

<br>

<details>
<summary>✅ Good — comportamento de NULL em agregações</summary>
<br>

```sql
-- COUNT(*) vs COUNT(coluna)
SELECT
  Orders.Status,
  COUNT(*)                          AS TotalOrders,    -- conta todas as linhas
  COUNT(Orders.AssignedTo)          AS AssignedOrders, -- ignora NULL
  COUNT(DISTINCT Orders.CustomerId) AS Customers
FROM
  Orders
GROUP BY
  Orders.Status;

-- AVG ignora NULL — divisor é count de não-nulos
SELECT
  Reviews.ProductId,
  AVG(Reviews.Rating)   AS AvgRating,  -- apenas ratings preenchidos
  COUNT(Reviews.Rating) AS RatingCount -- quantos avaliaram
FROM
  Reviews
GROUP BY
  Reviews.ProductId;

-- garantir resultado 0 em vez de NULL quando não há linhas
SELECT
  Employees.TeamId,
  COALESCE(SUM(Employees.Salary), 0) AS TotalSalary,
  COUNT(*)                           AS Headcount
FROM
  Employees
GROUP BY
  Employees.TeamId;
```

</details>

## NULL em JOIN

NULL nunca iguala NULL em condições de JOIN. Chaves estrangeiras devem ser `NOT NULL` para evitar
linhas fantasmas e comportamento inesperado.

<details>
<summary>❌ Bad — JOIN com chave nullable perde linhas silenciosamente</summary>
<br>

```sql
-- se CustomerId for NULL em algum pedido, a linha some no INNER JOIN
SELECT
  o.Id,
  c.Name AS CustomerName
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id;

-- LEFT JOIN traz a linha, mas CustomerName será NULL — difícil de depurar
```

</details>

<br>

<details>
<summary>✅ Good — chave estrangeira NOT NULL, comportamento previsível</summary>
<br>

```sql
CREATE TABLE Orders
(
  Id         INT NOT NULL IDENTITY(1, 1),
  CustomerId INT NOT NULL,
  Status     NVARCHAR(20) NOT NULL DEFAULT 'Pending',

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

-- JOIN previsível — CustomerId sempre existe
SELECT
  Orders.Id,
  Customers.Name AS CustomerName
FROM
  Orders
JOIN
  Customers ON Orders.CustomerId = Customers.Id;
```

</details>

## NOT IN com subquery: armadilha de NULL

Se a subquery retornar qualquer NULL, `NOT IN` retorna vazio: comportamento silencioso que não
gera erro. Filtre NULL da subquery ou use `NOT EXISTS`.

<details>
<summary>❌ Bad — NOT IN retorna vazio se a subquery contiver NULL</summary>
<br>

```sql
-- se Users tiver algum Id NULL, essa query retorna 0 linhas
SELECT
  Orders.Id,
  Orders.Status
FROM
  Orders
WHERE
  Orders.CustomerId NOT IN (SELECT Users.Id FROM Users);
```

</details>

<br>

<details>
<summary>✅ Good — filtrar NULL da subquery ou usar NOT EXISTS</summary>
<br>

```sql
-- opção 1: filtrar NULL explicitamente
SELECT
  Orders.Id,
  Orders.Status
FROM
  Orders
WHERE
  Orders.CustomerId NOT IN (
    SELECT Users.Id FROM Users WHERE Users.Id IS NOT NULL
  );

-- opção 2: NOT EXISTS — null-safe por design
SELECT
  Orders.Id,
  Orders.Status
FROM
  Orders
WHERE
  NOT EXISTS (
    SELECT 1 FROM Users WHERE Users.Id = Orders.CustomerId
  );
```

</details>

## NULL em UNIQUE

Múltiplos NULL são permitidos em colunas `UNIQUE` porque NULL não é igual a NULL. Use índice filtrado
quando quiser "único entre os preenchidos".

<details>
<summary>❌ Bad — intenção de "único quando preenchido" não está declarada explicitamente</summary>
<br>

```sql
CREATE TABLE Users
(
  Id    INT          NOT NULL IDENTITY(1, 1),
  Email VARCHAR(255) NOT NULL,
  Phone VARCHAR(20)  UNIQUE NULL -- intenção ambígua

  CONSTRAINT PK_Users PRIMARY KEY (Id)
);
```

</details>

<br>

<details>
<summary>✅ Good — índice filtrado declara explicitamente a intenção</summary>
<br>

```sql
CREATE TABLE Users
(
  Id    INT          NOT NULL IDENTITY(1, 1),
  Email VARCHAR(255) NOT NULL,
  Phone VARCHAR(20)  NULL,

  CONSTRAINT PK_Users   PRIMARY KEY (Id),
  CONSTRAINT UQ_Users_Email UNIQUE (Email)
);

-- SQL Server: índice filtrado para unicidade apenas em valores preenchidos
CREATE UNIQUE NONCLUSTERED INDEX UQ_Users_Phone_NotNull
  ON Users (Phone)
  WHERE Phone IS NOT NULL;

-- PostgreSQL: índice parcial equivalente
CREATE UNIQUE INDEX uq_users_phone_not_null
  ON users (phone)
  WHERE phone IS NOT NULL;
```

</details>

## IS DISTINCT FROM (PostgreSQL)

`IS DISTINCT FROM` é uma comparação null-safe: `NULL IS DISTINCT FROM NULL` retorna `false`
(os valores são iguais). Útil para detectar mudanças reais em auditorias e updates condicionais.

<details>
<summary>❌ Bad — comparação sem IS DISTINCT FROM perde mudanças envolvendo NULL</summary>
<br>

```sql
-- NULL != 'shipped' → NULL — linha ignorada no WHERE, mudança some silenciosamente
SELECT
  OrderId
FROM
  OrderHistory
WHERE
  NewStatus != OldStatus;
```

</details>

<br>

<details>
<summary>✅ Good — IS DISTINCT FROM detecta qualquer mudança, incluindo de/para NULL</summary>
<br>

```sql
-- PostgreSQL
SELECT
  order_history.order_id
FROM
  order_history
WHERE
  order_history.new_status IS DISTINCT FROM order_history.old_status;

-- SQL Server: equivalente sem IS DISTINCT FROM
SELECT
  OrderHistory.Id
FROM
  OrderHistory
WHERE
  OrderHistory.NewStatus != OrderHistory.OldStatus OR
  (OrderHistory.NewStatus IS NULL AND OrderHistory.OldStatus IS NOT NULL) OR
  (OrderHistory.NewStatus IS NOT NULL AND OrderHistory.OldStatus IS NULL);
```

</details>

## NULL em ORDER BY

NULL ocupa uma posição diferente dependendo do banco. Controle explícito da posição evita surpresas.

<details>
<summary>❌ Bad — ORDER BY sem controle de NULL: posição varia por banco</summary>
<br>

```sql
-- PostgreSQL: NULL vai para o fim em ASC (NULLS LAST implícito)
-- SQL Server: NULL vai para o início em ASC
-- resultado diferente no mesmo código
SELECT
  Orders.Id,
  Orders.DueDate
FROM
  Orders
ORDER BY
  Orders.DueDate ASC;
```

</details>

<br>

<details>
<summary>✅ Good — controle explícito da posição de NULL na ordenação</summary>
<br>

```sql
-- PostgreSQL: NULLS FIRST / NULLS LAST
SELECT
  orders.id,
  orders.due_date
FROM
  orders
ORDER BY
  orders.due_date ASC NULLS LAST; -- sem data ficam no fim

-- SQL Server: CASE para simular NULLS LAST
SELECT
  Orders.Id,
  Orders.DueDate
FROM
  Orders
ORDER BY
  CASE WHEN Orders.DueDate IS NULL THEN 1 ELSE 0 END,
  Orders.DueDate ASC;
```

</details>

## Schema evolution: adicionar coluna em tabela existente

Ver [Null Safety — Schema Evolution](../../../../shared/standards/null-safety.md#schema-evolution--campo-novo-em-tabela-existente)
para a estratégia completa. O padrão SQL:

<details>
<summary>❌ Bad — NOT NULL sem DEFAULT: migration falha em tabelas com dados</summary>
<br>

```sql
-- falha se a tabela já tiver registros: registros existentes não têm valor para a nova coluna
-- SQL Server
ALTER TABLE Orders ADD Priority NVARCHAR(20) NOT NULL;

-- PostgreSQL
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL;
```

</details>

<br>

<details>
<summary>✅ Good — DEFAULT garante que registros antigos nunca ficam NULL</summary>
<br>

```sql
-- SQL Server: uma instrução, registros antigos recebem 'Normal'
ALTER TABLE Orders ADD Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal';

-- PostgreSQL: equivalente
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
```

</details>

<br>

<details>
<summary>✅ Good — migration em lotes para tabelas grandes em produção</summary>
<br>

```sql
-- SQL Server

-- passo 1: adiciona nullable para não bloquear a tabela
ALTER TABLE Orders ADD Priority NVARCHAR(20) NULL;

-- passo 2: preenche os registros existentes em lote
UPDATE Orders SET Orders.Priority = 'Normal' WHERE Orders.Priority IS NULL;

-- passo 3: aplica o constraint depois que todos os registros têm valor
ALTER TABLE Orders ALTER COLUMN Priority NVARCHAR(20) NOT NULL;
ALTER TABLE Orders ADD DEFAULT 'Normal' FOR Priority;
```

</details>
