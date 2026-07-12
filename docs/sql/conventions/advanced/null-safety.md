# Segurança contra nulos em SQL

> Escopo: SQL. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

`NULL` em **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) significa "o valor é desconhecido". Ele ocupa uma categoria própria, separada de `0`, de `false` e da string vazia, e é daí que vem a maior parte das surpresas.

A consequência prática está nas comparações. Perguntar se um valor desconhecido é igual a 10 devolve outro desconhecido: a resposta não é verdadeira nem falsa. Em SQL isso se chama **three-valued logic** (lógica de três valores): toda comparação devolve `TRUE`, `FALSE` ou `UNKNOWN`, e o `WHERE` só deixa passar a linha quando a resposta é `TRUE`.

> Os exemplos seguem a convenção SQL Server (PascalCase). Exemplos específicos de PostgreSQL são
> marcados com `-- PostgreSQL`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **NULL** (ausência de valor) | Marca que o valor é desconhecido; categoria própria, separada de `0`, `false` e string vazia |
| **three-valued logic** (lógica de três valores) | `TRUE`, `FALSE`, `UNKNOWN`; toda comparação com NULL devolve `UNKNOWN` |
| **IS NULL / IS NOT NULL** (é nulo / não é nulo) | Os operadores que testam a presença de NULL; `= NULL` nunca devolve linha |
| **COALESCE** (coalescência) | Retorna o primeiro argumento não-nulo; substitui NULL por valor padrão |
| **NULLIF** (anular se igual) | Retorna NULL quando dois argumentos são iguais; útil para evitar divisão por zero |
| **NOT NULL constraint** (restrição NOT NULL) | Garante que a coluna nunca aceita NULL; aplicar quando o domínio exige presença |
| **NULL-safe equals** (igualdade segura contra NULL) | `IS NOT DISTINCT FROM` (PostgreSQL) ou `INTERSECT` (SQL Server); compara tratando NULL como valor |

<a id="is-null"></a>

## Use IS NULL, porque `= NULL` nunca devolve linha

`WHERE Coach = NULL` pergunta se um valor desconhecido é igual a um valor desconhecido, e a resposta é `UNKNOWN`. Como o `WHERE` só aceita a linha quando a resposta é `TRUE`, a query devolve zero linhas, mesmo com a tabela cheia de times sem técnico. Nenhum erro aparece, o resultado vem vazio, e a query parece certa.

`IS NULL` e `IS NOT NULL` são os operadores que perguntam pela presença do valor, e eles respondem `TRUE` ou `FALSE`.

<details>
<summary>❌ Ruim: = NULL não retorna nenhuma linha</summary>

```sql
SELECT *
FROM orders
WHERE assigned_to = NULL; -- retorna 0 linhas sempre

SELECT *
FROM orders
WHERE assigned_to != NULL; -- retorna 0 linhas sempre
```

</details>

<details>
<summary>✅ Bom: IS NULL / IS NOT NULL</summary>

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

<a id="coalesce"></a>

## COALESCE devolve o primeiro valor que existir

`COALESCE(Nickname, FirstName, 'Anonymous')` percorre os argumentos da esquerda para a direita e devolve o primeiro que tiver valor. Ele resolve numa linha o que o `CASE WHEN` resolve em cinco, e a lista de alternativas cresce acrescentando um argumento.

O mesmo vale para conta: `Total + Bonus` devolve `NULL` inteiro se o bônus for desconhecido, porque qualquer operação com `NULL` resulta em `NULL`. `Total + COALESCE(Bonus, 0)` trata a ausência de bônus como zero e a soma volta a fazer sentido.

<details>
<summary>❌ Ruim: CASE WHEN para fallback: verboso e difícil de encadear</summary>

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

<details>
<summary>✅ Bom: fallback e cálculo null-safe</summary>

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

<a id="nullif"></a>

## NULLIF transforma um valor específico em NULL

`NULLIF(a, b)` devolve `NULL` quando `a` e `b` são iguais, e devolve `a` no resto dos casos. Ele serve a dois usos frequentes.

O primeiro é a divisão por zero. `Amount / NULLIF(Quantity, 0)` transforma o divisor zero em `NULL`, e a divisão devolve `NULL` no lugar de derrubar a query com erro. O segundo é a string vazia: `NULLIF(Nickname, '')` faz o apelido em branco valer como ausente, e aí o `COALESCE` que vem depois consegue cair no próximo valor.

<details>
<summary>❌ Ruim: CASE WHEN para divisão segura e normalização: mais verboso</summary>

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

<details>
<summary>✅ Bom: divisão segura e normalização de string vazia</summary>

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

<a id="not-null-and-default"></a>

## Barrar o NULL no schema poupa COALESCE em toda query

A coluna que aceita `NULL` obriga cada query a se defender. Toda soma precisa de `COALESCE`, todo filtro precisa lembrar do caso ausente, e basta um esquecimento para o resultado sair errado em silêncio.

Declarar `NOT NULL` com um `DEFAULT` resolve na origem: a coluna nasce com valor mesmo quando o `INSERT` não a menciona. Quando o domínio exige que o valor exista (todo pedido tem status, todo registro tem data de criação), essa é a declaração certa.

<details>
<summary>❌ Ruim: coluna nullable sem default obriga COALESCE em todo lugar</summary>

```sql
CREATE TABLE Orders
(
  Id INT,
  Status VARCHAR(20), -- nullable, sem default
  Priority VARCHAR(20), -- nullable, sem default
  CreatedAt DATETIME2 -- nullable, sem default
);

-- toda query precisa se defender
SELECT
  Orders.Id,
  COALESCE(Orders.Status, 'unknown') AS Status,
  COALESCE(Orders.Priority, 'normal') AS Priority
FROM
  Orders;
```

</details>

<details>
<summary>✅ Bom: NOT NULL + DEFAULT fecha o problema na origem</summary>

```sql
CREATE TABLE Orders
(
  Id INT NOT NULL IDENTITY(1, 1),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal',
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

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

<a id="null-in-aggregates"></a>

## As agregações pulam o NULL, e o AVG mente por causa disso

`SUM`, `AVG`, `MIN` e `MAX` descartam as linhas nulas antes de calcular. Isso importa muito no `AVG`: a média de `10`, `20` e `NULL` é 15, porque o divisor é 2. Se aquele `NULL` deveria valer zero, a média real era 10, e a query devolveu 15 sem avisar.

A diferença entre as duas formas de contar segue a mesma lógica. `COUNT(*)` conta as linhas da tabela. `COUNT(AssignedTo)` conta as linhas em que `AssignedTo` tem valor. Trocar uma pela outra muda o número do relatório.

<details>
<summary>❌ Ruim: assumir que COUNT(*) e COUNT(coluna) são equivalentes</summary>

```sql
-- COUNT(*) conta nulos: o resultado pode enganar
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

<details>
<summary>✅ Bom: comportamento de NULL em agregações</summary>

```sql
-- COUNT(*) vs COUNT(coluna)
SELECT
  Orders.Status,
  COUNT(*) AS TotalOrders, -- conta todas as linhas
  COUNT(Orders.AssignedTo) AS AssignedOrders, -- ignora NULL
  COUNT(DISTINCT Orders.CustomerId) AS Customers
FROM
  Orders
GROUP BY
  Orders.Status;

-- AVG ignora NULL: divisor é count de não-nulos
SELECT
  Reviews.ProductId,
  AVG(Reviews.Rating) AS AvgRating, -- apenas ratings preenchidos
  COUNT(Reviews.Rating) AS RatingCount -- quantos avaliaram
FROM
  Reviews
GROUP BY
  Reviews.ProductId;

-- garantir resultado 0 em vez de NULL quando não há linhas
SELECT
  Employees.TeamId,
  COALESCE(SUM(Employees.Salary), 0) AS TotalSalary,
  COUNT(*) AS Headcount
FROM
  Employees
GROUP BY
  Employees.TeamId;
```

</details>

<a id="null-in-join"></a>

## A linha com chave nula desaparece do INNER JOIN

O `JOIN` compara a chave dos dois lados, e a comparação com `NULL` devolve `UNKNOWN`. O pedido cujo `CustomerId` está nulo não casa com cliente nenhum, e o `INNER JOIN` o descarta. O relatório de pedidos vem com menos pedidos do que a tabela tem, e nada na saída indica que faltou alguém.

Declarar a chave estrangeira como `NOT NULL` fecha o caso na origem. Quando a ausência é legítima (um pedido de balcão sem cliente cadastrado), o `LEFT JOIN` preserva a linha e deixa as colunas do cliente nulas.

<details>
<summary>❌ Ruim: JOIN com chave nullable perde linhas silenciosamente</summary>

```sql
-- se CustomerId for NULL em algum pedido, a linha some no INNER JOIN
SELECT
  o.Id,
  c.Name AS CustomerName
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id;

-- LEFT JOIN traz a linha, mas CustomerName será NULL: difícil de depurar
```

</details>

<details>
<summary>✅ Bom: chave estrangeira NOT NULL, comportamento previsível</summary>

```sql
CREATE TABLE Orders
(
  Id INT NOT NULL IDENTITY(1, 1),
  CustomerId INT NOT NULL,
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);

-- JOIN previsível: CustomerId sempre existe
SELECT
  Orders.Id,
  Customers.Name AS CustomerName
FROM
  Orders
JOIN
  Customers ON Orders.CustomerId = Customers.Id;
```

</details>

<a id="not-in-with-null"></a>

## Um NULL na subquery faz o NOT IN devolver zero linhas

Essa é a mais traiçoeira da página. `WHERE Id NOT IN (SELECT UserId FROM Users)` pergunta, para cada pedido, se o identificador é diferente de todos os valores da lista. Se um dos valores da lista é `NULL`, a comparação com ele devolve `UNKNOWN`, e a resposta final nunca chega a `TRUE`. A query devolve vazio, sempre, mesmo com as duas tabelas cheias.

`NOT EXISTS` faz a mesma pergunta e não cai nessa armadilha, porque ele testa a existência da linha em vez de comparar valores. Use `NOT EXISTS` por padrão.

<details>
<summary>❌ Ruim: NOT IN retorna vazio se a subquery contiver NULL</summary>

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

<details>
<summary>✅ Bom: filtrar NULL da subquery ou usar NOT EXISTS</summary>

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

-- opção 2: NOT EXISTS: null-safe por design
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

<a id="null-in-unique"></a>

## A coluna UNIQUE aceita vários NULL

A restrição `UNIQUE` impede valores repetidos, e como um `NULL` nunca é considerado igual a outro `NULL`, ela deixa passar quantas linhas nulas você quiser. Uma coluna de CPF `UNIQUE` aceita mil usuários sem CPF, e isso costuma ser o que se quer.

Quando a regra é "único entre os que têm valor", declare um índice filtrado (`WHERE Cpf IS NOT NULL`). Assim a intenção fica escrita no schema.

<details>
<summary>❌ Ruim: intenção de "único quando preenchido" não está declarada explicitamente</summary>

```sql
CREATE TABLE Users
(
  Id INT NOT NULL IDENTITY(1, 1),
  Email VARCHAR(255) NOT NULL,
  Phone VARCHAR(20) UNIQUE NULL, -- intenção ambígua

  CONSTRAINT PK_Users PRIMARY KEY (Id)
);
```

</details>

<details>
<summary>✅ Bom: índice filtrado declara explicitamente a intenção</summary>

```sql
CREATE TABLE Users
(
  Id INT NOT NULL IDENTITY(1, 1),
  Email VARCHAR(255) NOT NULL,
  Phone VARCHAR(20) NULL,

  CONSTRAINT PK_Users PRIMARY KEY (Id),
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

<a id="is-distinct-from"></a>

## IS DISTINCT FROM compara tratando NULL como um valor

No PostgreSQL, `IS DISTINCT FROM` responde `TRUE` ou `FALSE` mesmo quando um dos lados é `NULL`. Dois nulos contam como iguais, e um nulo contra um texto conta como diferente.

Isso resolve a comparação de auditoria. Para detectar que o status mudou de `NULL` para `'shipped'`, o `<>` comum devolve `UNKNOWN` e a linha some do resultado, então a mudança passa despercebida. `IS DISTINCT FROM` devolve `TRUE` e a mudança aparece.

<details>
<summary>❌ Ruim: comparação sem IS DISTINCT FROM perde mudanças envolvendo NULL</summary>

```sql
-- NULL != 'shipped' retorna NULL: linha ignorada no WHERE, mudança some silenciosamente
SELECT
  OrderId
FROM
  OrderHistory
WHERE
  NewStatus != OldStatus;
```

</details>

<details>
<summary>✅ Bom: IS DISTINCT FROM detecta qualquer mudança, incluindo de/para NULL</summary>

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

<a id="null-in-order-by"></a>

## Cada banco põe o NULL num lugar diferente da ordenação

Ordenando em ordem crescente, o PostgreSQL joga os nulos para o fim e o SQL Server os joga para o começo. A mesma query, o mesmo dado, duas telas diferentes. Isso morde quem desenvolve num banco e roda em produção no outro.

O PostgreSQL aceita `NULLS FIRST` e `NULLS LAST` no `ORDER BY`. No SQL Server, a posição se declara com uma coluna auxiliar no `ORDER BY` que ordena primeiro pelo `CASE WHEN ... IS NULL`.

<details>
<summary>❌ Ruim: ORDER BY sem controle de NULL: posição varia por banco</summary>

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

<details>
<summary>✅ Bom: controle explícito da posição de NULL na ordenação</summary>

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

<a id="new-column-on-existing-table"></a>

## A coluna nova numa tabela com dados precisa de DEFAULT

`ALTER TABLE Orders ADD Priority NVARCHAR(20) NOT NULL` funciona na tabela vazia e falha na tabela com dados. A migration para na hora: os pedidos que já existem não têm valor para a coluna nova, e a restrição `NOT NULL` proíbe deixá-los nulos.

Declarar o `DEFAULT` junto resolve, porque o banco preenche as linhas antigas com ele. A estratégia completa, para quando o valor padrão não serve, está em [Segurança contra nulos: campo novo em tabela existente](../../../shared/standards/null-safety.md#new-column-on-existing-table).

<details>
<summary>❌ Ruim: NOT NULL sem DEFAULT: migration falha em tabelas com dados</summary>

```sql
-- falha se a tabela já tiver registros: registros existentes não têm valor para a nova coluna
-- SQL Server
ALTER TABLE Orders ADD Priority NVARCHAR(20) NOT NULL;

-- PostgreSQL
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL;
```

</details>

<details>
<summary>✅ Bom: DEFAULT garante que registros antigos nunca ficam NULL</summary>

```sql
-- SQL Server: uma instrução, registros antigos recebem 'Normal'
ALTER TABLE Orders ADD Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal';

-- PostgreSQL: equivalente
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
```

</details>

<details>
<summary>✅ Bom: migration em lotes para tabelas grandes em produção</summary>

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
