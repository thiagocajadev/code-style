# Formatting

Uma cláusula por linha, colunas indentadas com 2 espaços. **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) legível de cima pra baixo, sem scroll horizontal.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **clause-per-line** (uma cláusula por linha) | `SELECT`, `FROM`, `WHERE`, `JOIN` em linhas separadas; cada cláusula é um marco visual |
| **indentation** (indentação) | 2 espaços para colunas, expressões e subqueries; mantém alinhamento sem ambiguidade |
| **vertical layout** (layout vertical) | Query cresce para baixo, não para a direita; elimina scroll horizontal |
| **comma style** (estilo de vírgula) | Vírgula no final da linha (padrão); vírgula no início preserva diffs limpos |
| **keyword case** (caixa de palavra-chave) | `UPPERCASE` para palavras reservadas (`SELECT`, `WHERE`); identificadores em PascalCase ou snake_case |
| **trailing whitespace** (espaço em branco final) | Remover sempre; ruído invisível em diffs |
| **line length** (comprimento de linha) | Limite de 120 colunas; sqlfluff aplica automaticamente |

## Consulta em linha única

<details>
<summary>❌ Ruim</summary>

```sql
SELECT Id, Name, Email FROM Users WHERE Id = 1 AND IsActive = 1
```

</details>

<details>
<summary>✅ Bom</summary>

```sql
SELECT
  Users.Id,
  Users.Name,
  Users.Email
FROM
  Users
WHERE
  Users.Id = 1 AND
  Users.IsActive = 1;
```

</details>

## Regra de 3: exceção inline

Expressão inline é aceita somente quando há ≤3 campos E ≤1 condição. Qualquer coisa além disso vai para o estilo vertical.

<details>
<summary>❌ Ruim: inline com 4+ campos ou 2+ condições</summary>

```sql
SELECT Users.Id, Users.Name, Users.Email, Users.Phone FROM Users WHERE Users.IsActive = 1 AND Users.CreatedAt > '2024-01-01';
```

</details>

<details>
<summary>✅ Bom: inline só para operações triviais (≤3 campos, ≤1 condição)</summary>

```sql
SELECT Users.Id, Users.Name FROM Users WHERE Users.IsActive = 1;

DELETE FROM Logs WHERE Logs.Id = 123;
```

</details>

## Colunas sem recuo

<details>
<summary>❌ Ruim: alinhadas com SELECT, sem indentação</summary>

```sql
SELECT 
Id, 
Name, 
Email
FROM Users
WHERE Id = 1
AND IsActive = 1
```

</details>

<details>
<summary>✅ Bom: 2 espaços sob cada cláusula</summary>

```sql
SELECT
  Users.Id,
  Users.Name,
  Users.Email
FROM
  Users
WHERE
  Users.Id = 1 AND
  Users.IsActive = 1;
```

</details>

## JOIN com ON simples

<details>
<summary>❌ Ruim: linha longa misturando JOIN e ON</summary>

```sql
SELECT Users.Name, Statuses.Description
FROM Users JOIN Statuses ON Users.StatusId = Statuses.Id
WHERE Users.Id = 1;
```

</details>

<details>
<summary>✅ Bom: ON na mesma linha do JOIN quando há uma única condição</summary>

```sql
SELECT
  Users.Name,
  Statuses.Description
FROM
  Users
JOIN
  Statuses ON Users.StatusId = Statuses.Id
WHERE
  Users.Id = 1;
```

</details>

## JOIN com ON complexo

<details>
<summary>❌ Ruim: múltiplas condições em linha única</summary>

```sql
SELECT
  Users.Name,
  Statuses.Description
FROM
  Users
JOIN
  Statuses ON Users.StatusId = Statuses.Id AND Users.IsActive = Statuses.IsActive AND Statuses.Type = 'DEFAULT'
WHERE
  Users.Id = 1;
```

</details>

<details>
<summary>✅ Bom: uma condição por linha, alinhadas após ON</summary>

```sql
SELECT
  Users.Name,
  Statuses.Description
FROM
  Users
JOIN
  Statuses
  ON Users.StatusId = Statuses.Id AND
     Users.IsActive = Statuses.IsActive AND
     Statuses.Type = 'DEFAULT'
WHERE
  Users.Id = 1;
```

</details>

## Condições verticais

Uma condição por linha. AND e OR ao final da linha, nunca no início.

<details>
<summary>❌ Ruim: AND no início da linha</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
  AND FootballTeams.Country = 'Brazil'
  AND FootballTeams.ChampionshipsWon > 0
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
```

</details>

<details>
<summary>✅ Bom: AND ao final da linha, fluxo de cima pra baixo</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1 AND -- active
  FootballTeams.Country = 'Brazil' AND
  FootballTeams.ChampionshipsWon > 0 -- at least one title
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
```

</details>
