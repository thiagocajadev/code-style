# Null safety

> Escopo: SQL. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

NULL em SQL não é `false`, não é `0`, não é string vazia. É a ausência de valor com comportamento
único: qualquer comparação com NULL retorna NULL, não `true` nem `false`.

> Conceito geral: [Null Safety](../../../../shared/standards/null-safety.md)

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
SELECT *
FROM orders
WHERE assigned_to IS NULL;

SELECT *
FROM orders
WHERE assigned_to IS NOT NULL;

-- combinando com outras condições
SELECT *
FROM orders
WHERE status = 'pending'
  AND assigned_to IS NULL;
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
  user_id,
  CASE
    WHEN nickname IS NOT NULL THEN nickname
    WHEN first_name IS NOT NULL THEN first_name
    ELSE 'Anonymous'
  END AS display_name
FROM users;

-- cálculo sem proteção: NULL discount = NULL total
SELECT
  order_id,
  discount + base_amount AS total   -- NULL se discount for NULL
FROM orders;
```

</details>

<br>

<details>
<summary>✅ Good — fallback e cálculo null-safe</summary>
<br>

```sql
-- fallback em cascata
SELECT
  user_id,
  COALESCE(nickname, first_name, 'Anonymous') AS display_name
FROM users;

-- cálculo null-safe: NULL + qualquer valor = NULL
SELECT
  order_id,
  COALESCE(discount, 0) + base_amount AS total   -- sem COALESCE, NULL desconto = NULL total
FROM orders;

-- normalizar dados legados
SELECT
  product_id,
  COALESCE(new_price, legacy_price, 0.00) AS price
FROM products;
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
  order_id,
  CASE
    WHEN quantity = 0 THEN NULL
    ELSE amount / quantity
  END AS unit_price
FROM orders;

-- string vazia tratada manualmente
SELECT
  user_id,
  CASE
    WHEN TRIM(phone_number) = '' THEN NULL
    ELSE TRIM(phone_number)
  END AS phone
FROM users;
```

</details>

<br>

<details>
<summary>✅ Good — divisão segura e normalização de string vazia</summary>
<br>

```sql
-- divisão por zero sem CASE
SELECT
  order_id,
  amount / NULLIF(quantity, 0) AS unit_price   -- NULL se quantity for 0
FROM orders;

-- tratar string vazia como NULL
SELECT
  user_id,
  NULLIF(TRIM(phone_number), '') AS phone      -- '' vira NULL
FROM users;
```

</details>

## NOT NULL + DEFAULT: fechar null no schema

A melhor defesa contra null é não deixá-lo entrar. `NOT NULL` e `DEFAULT` juntos garantem que
a coluna sempre tem valor, sem precisar de `COALESCE` em cada query.

<details>
<summary>❌ Bad — coluna nullable sem default obriga COALESCE em todo lugar</summary>
<br>

```sql
CREATE TABLE orders (
  order_id   INT           PRIMARY KEY,
  status     VARCHAR(20),              -- nullable, sem default
  priority   VARCHAR(20),              -- nullable, sem default
  created_at TIMESTAMP                 -- nullable, sem default
);

-- toda query precisa se defender
SELECT
  order_id,
  COALESCE(status, 'unknown')   AS status,
  COALESCE(priority, 'normal')  AS priority
FROM orders;
```

</details>

<br>

<details>
<summary>✅ Good — NOT NULL + DEFAULT fecha o problema na origem</summary>
<br>

```sql
CREATE TABLE orders (
  order_id   INT           PRIMARY KEY,
  status     VARCHAR(20)   NOT NULL DEFAULT 'pending',
  priority   VARCHAR(20)   NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- queries simples, sem defesa
SELECT order_id, status, priority FROM orders;
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
  status,
  COUNT(*) AS assigned_orders   -- inclui linhas onde assigned_to IS NULL
FROM orders
GROUP BY status;

-- SUM pode retornar NULL quando não há linhas no grupo
SELECT
  team_id,
  SUM(salary)  AS total_salary  -- retorna NULL se não houver funcionários
FROM employees
GROUP BY team_id;
```

</details>

<br>

<details>
<summary>✅ Good — comportamento de NULL em agregações</summary>
<br>

```sql
-- COUNT(*) vs COUNT(coluna)
SELECT
  status,
  COUNT(*)             AS total_orders,       -- conta todas as linhas
  COUNT(assigned_to)   AS assigned_orders,    -- ignora NULL
  COUNT(DISTINCT customer_id) AS customers
FROM orders
GROUP BY status;

-- AVG ignora NULL — divisor é count de não-nulos
SELECT
  product_id,
  AVG(rating) AS avg_rating,           -- apenas ratings preenchidos
  COUNT(rating) AS rating_count        -- quantos avaliaram
FROM reviews
GROUP BY product_id;

-- garantir resultado 0 em vez de NULL quando não há linhas
SELECT
  team_id,
  COALESCE(SUM(salary), 0)  AS total_salary,
  COALESCE(COUNT(*), 0)     AS headcount
FROM employees
GROUP BY team_id;
```

</details>

## NULL em JOIN

NULL nunca iguala NULL em condições de JOIN. Chaves estrangeiras devem ser `NOT NULL` para evitar
linhas fantasmas e comportamento inesperado.

<details>
<summary>❌ Bad — JOIN com chave nullable perde linhas silenciosamente</summary>
<br>

```sql
-- se customer_id for NULL em alguma ordem, a linha some no INNER JOIN
SELECT
  o.order_id,
  c.name AS customer_name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;

-- LEFT JOIN traz a linha, mas customer_name será NULL — difícil de depurar
```

</details>

<br>

<details>
<summary>✅ Good — chave estrangeira NOT NULL, comportamento previsível</summary>
<br>

```sql
CREATE TABLE orders (
  order_id    INT     PRIMARY KEY,
  customer_id INT     NOT NULL REFERENCES customers(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
);

-- JOIN previsível — customer_id sempre existe
SELECT
  o.order_id,
  c.name AS customer_name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;
```

</details>

## NOT IN com subquery: armadilha de NULL

Se a subquery retornar qualquer NULL, `NOT IN` retorna vazio: comportamento silencioso que não
gera erro. Filtre NULL da subquery ou use `NOT EXISTS`.

<details>
<summary>❌ Bad — NOT IN retorna vazio se a subquery contiver NULL</summary>
<br>

```sql
-- se users tiver algum user_id NULL, essa query retorna 0 linhas
SELECT *
FROM orders
WHERE customer_id NOT IN (
  SELECT user_id FROM users
);
```

</details>

<br>

<details>
<summary>✅ Good — filtrar NULL da subquery ou usar NOT EXISTS</summary>
<br>

```sql
-- opção 1: filtrar NULL explicitamente
SELECT *
FROM orders
WHERE customer_id NOT IN (
  SELECT user_id FROM users WHERE user_id IS NOT NULL
);

-- opção 2: NOT EXISTS — null-safe por design
SELECT *
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.user_id = o.customer_id
);
```

</details>

## NULL em UNIQUE

Múltiplos NULL são permitidos em colunas `UNIQUE` porque NULL não é igual a NULL. Use índice filtrado
quando quiser "único entre os preenchidos".

<details>
<summary>❌ Bad — índice UNIQUE padrão bloqueia múltiplos NULL</summary>
<br>

```sql
-- constraint UNIQUE normal: apenas um NULL permitido na coluna
-- segundo INSERT com phone NULL vai falhar ou ser aceito dependendo do banco
CREATE TABLE users (
  user_id INT PRIMARY KEY,
  email   VARCHAR(255) UNIQUE NOT NULL,
  phone   VARCHAR(20)  UNIQUE          -- SQL Server: aceita múltiplos NULL; PostgreSQL: aceita múltiplos NULL
  -- mas a intenção de "único quando preenchido" não está declarada explicitamente
);
```

</details>

<br>

<details>
<summary>✅ Good — índice filtrado para unicidade apenas em valores preenchidos</summary>
<br>

```sql
-- múltiplos NULLs são aceitos em UNIQUE (comportamento padrão)
CREATE TABLE users (
  user_id INT PRIMARY KEY,
  email   VARCHAR(255) UNIQUE NOT NULL,
  phone   VARCHAR(20)  UNIQUE NULL      -- vários NULLs permitidos
);

-- PostgreSQL: índice parcial para unicidade apenas quando preenchido
CREATE UNIQUE INDEX uix_users_phone_notnull
  ON users (phone)
  WHERE phone IS NOT NULL;

-- SQL Server: índice filtrado equivalente
CREATE UNIQUE NONCLUSTERED INDEX uix_users_phone_notnull
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
SELECT order_id
FROM order_history
WHERE new_status != old_status;
```

</details>

<br>

<details>
<summary>✅ Good — IS DISTINCT FROM detecta qualquer mudança, incluindo de/para NULL</summary>
<br>

```sql
-- PostgreSQL
SELECT order_id
FROM order_history
WHERE new_status IS DISTINCT FROM old_status;

-- SQL Server: equivalente sem IS DISTINCT FROM
SELECT order_id
FROM order_history
WHERE (new_status != old_status)
   OR (new_status IS NULL AND old_status IS NOT NULL)
   OR (new_status IS NOT NULL AND old_status IS NULL);
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
SELECT *
FROM orders
ORDER BY due_date ASC;

SELECT *
FROM orders
ORDER BY priority DESC;
```

</details>

<br>

<details>
<summary>✅ Good — controle explícito da posição de NULL na ordenação</summary>
<br>

```sql
-- PostgreSQL: NULLS FIRST / NULLS LAST
SELECT *
FROM orders
ORDER BY due_date ASC NULLS LAST;    -- sem data ficam no fim

SELECT *
FROM orders
ORDER BY priority DESC NULLS FIRST;  -- sem prioridade ficam no início

-- SQL Server: CASE para simular NULLS LAST
SELECT *
FROM orders
ORDER BY
  CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
  due_date ASC;
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
ALTER TABLE orders
  ADD COLUMN priority VARCHAR(20) NOT NULL;
```

</details>

<br>

<details>
<summary>✅ Good — DEFAULT garante que registros antigos nunca ficam NULL</summary>
<br>

```sql
-- opção preferida: uma única instrução, registros antigos recebem 'normal'
ALTER TABLE orders
  ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
```

</details>

<br>

<details>
<summary>✅ Good — migration em lotes para tabelas grandes em produção</summary>
<br>

```sql
-- passo 1: adiciona nullable para não bloquear a tabela
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NULL;

-- passo 2: preenche os registros existentes em lote
UPDATE orders SET priority = 'normal' WHERE priority IS NULL;

-- passo 3: aplica o constraint depois que todos os registros têm valor
ALTER TABLE orders ALTER COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
```

</details>
