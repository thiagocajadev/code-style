# Formatting

Uma cláusula por linha, colunas indentadas com 2 espaços. SQL legível de cima pra baixo, sem scroll horizontal.

## Consulta em linha única

<details>
<br>
<summary>❌ Bad</summary>

```sql
SELECT Id, Name, Email FROM Users WHERE Id = 1 AND IsActive = 1
```

</details>

<br>

<details>
<br>
<summary>✅ Good</summary>

```sql
SELECT
  Id,
  Name,
  Email
FROM
  Users
WHERE
  Id = 1 AND
  IsActive = 1;
```

</details>

## Regra de 3 — exceção inline

Expressão inline é aceita somente quando há ≤3 campos E ≤1 condição. Qualquer coisa além disso vai para o estilo vertical.

<details>
<br>
<summary>❌ Bad — inline com 4+ campos ou 2+ condições</summary>

```sql
SELECT Users.Id, Users.Name, Users.Email, Users.Phone FROM Users WHERE Users.IsActive = 1 AND Users.CreatedAt > '2024-01-01';
```

</details>

<br>

<details>
<br>
<summary>✅ Good — inline só para operações triviais (≤3 campos, ≤1 condição)</summary>

```sql
SELECT Users.Id, Users.Name FROM Users WHERE Users.IsActive = 1;

DELETE FROM Logs WHERE Logs.Id = 123;
```

</details>

## Colunas sem recuo

<details>
<br>
<summary>❌ Bad — alinhadas com SELECT, sem indentação</summary>

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

<br>

<details>
<br>
<summary>✅ Good — 2 espaços sob cada cláusula</summary>

```sql
SELECT
  Id,
  Name,
  Email
FROM
  Users
WHERE
  Id = 1 AND
  IsActive = 1;
```

</details>

## JOIN com ON simples

<details>
<br>
<summary>❌ Bad — linha longa misturando JOIN e ON</summary>

```sql
SELECT Users.Name, Statuses.Description
FROM Users JOIN Statuses ON Users.StatusId = Statuses.Id
WHERE Users.Id = 1;
```

</details>

<br>

<details>
<br>
<summary>✅ Good — ON na mesma linha do JOIN quando há uma única condição</summary>

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
<br>
<summary>❌ Bad — múltiplas condições em linha única</summary>

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

<br>

<details>
<br>
<summary>✅ Good — uma condição por linha, alinhadas após ON</summary>

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

Uma condição por linha. AND e OR ao final da linha — nunca no início.

<details>
<br>
<summary>❌ Bad — AND no início da linha</summary>

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

<br>

<details>
<br>
<summary>✅ Good — AND ao final da linha, fluxo de cima pra baixo</summary>

```sql
SELECT
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1 AND           -- active
  FootballTeams.Country = 'Brazil' AND
  FootballTeams.ChampionshipsWon > 0       -- at least one title
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
```

</details>
