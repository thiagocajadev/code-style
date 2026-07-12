# Formatação de SQL

Uma query bem formatada se lê de cima para baixo, como uma lista de passos. Cada cláusula da linguagem **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) começa a própria linha, e as colunas ficam indentadas com 2 espaços abaixo dela. A query cresce para baixo e nunca exige que o leitor role a tela para o lado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **clause-per-line** (uma cláusula por linha) | `SELECT`, `FROM`, `WHERE`, `JOIN` em linhas separadas; cada cláusula é um marco visual |
| **indentation** (indentação) | 2 espaços para colunas, expressões e subqueries; mantém alinhamento sem ambiguidade |
| **vertical layout** (layout vertical) | A query cresce para baixo a cada cláusula, e a tela nunca precisa rolar para o lado |
| **comma style** (estilo de vírgula) | Vírgula no final da linha (padrão); vírgula no início preserva diffs limpos |
| **keyword case** (caixa de palavra-chave) | `UPPERCASE` para palavras reservadas (`SELECT`, `WHERE`); identificadores em PascalCase ou snake_case |
| **trailing whitespace** (espaço em branco final) | Remover sempre; ruído invisível em diffs |
| **line length** (comprimento de linha) | Limite de 120 colunas; sqlfluff aplica automaticamente |

<a id="single-line-query"></a>

## Cada cláusula começa na própria linha

A query escrita em uma linha só obriga o leitor a varrer o texto atrás de onde termina o `SELECT` e começa o `WHERE`. Quebrando por cláusula, cada marco da query fica no início de uma linha e o olho encontra o filtro sem procurar.

<details>
<summary>❌ Ruim: tudo em uma linha, com as cláusulas misturadas ao conteúdo</summary>

```sql
SELECT Id, Name, Email FROM Users WHERE Id = 1 AND IsActive = 1
```

Para achar o filtro, o leitor precisa ler a linha inteira até encontrar a palavra `WHERE` no meio dela.

</details>

<details>
<summary>✅ Bom: uma cláusula por linha, com as colunas indentadas abaixo dela</summary>

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

`SELECT`, `FROM` e `WHERE` ficam à esquerda, um por linha. O olho encontra cada um deles sem precisar ler o resto.

</details>

<a id="rule-of-three-inline"></a>

## Uma query trivial pode ficar em uma linha

A exceção existe para a query que cabe inteira no campo de visão: até 3 campos e até 1 condição. `SELECT Users.Id, Users.Name FROM Users WHERE Users.IsActive = 1;` se entende de relance, e quebrar isso em oito linhas gasta espaço sem devolver clareza. Passou de 3 campos ou de 1 condição, a query vai para o estilo vertical.

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

<a id="indentation"></a>

## Dois espaços de indentação sob cada cláusula

A coluna indentada mostra que ela pertence ao `SELECT` logo acima. Sem o recuo, `Id` e `FROM Users` ficam na mesma margem e o bloco perde a hierarquia: tudo parece estar no mesmo nível.

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

<a id="join-simple-on"></a>

## JOIN com uma condição cabe em uma linha

Quando o `ON` tem uma única igualdade, ele fica na mesma linha da tabela que está entrando na query. A linha inteira se lê de uma vez: junte `Statuses` onde o identificador bate.

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

<a id="join-complex-on"></a>

## JOIN com várias condições abre uma linha por condição

Passando de uma condição, o `ON` desce para a linha seguinte e cada condição ocupa a própria linha, alinhada com as outras. Assim dá para conferir as regras da junção uma a uma, e acrescentar a próxima condição gera um diff de uma linha.

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

<a id="vertical-conditions"></a>

## Uma condição por linha, com AND ao final

Cada condição do `WHERE` ocupa uma linha. O `AND` e o `OR` ficam no final da linha, e não no começo da linha seguinte. Com o operador no fim, a linha anuncia que a condição continua abaixo, e a leitura segue de cima para baixo sem voltar.

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
<summary>✅ Bom: AND ao final da linha, fluxo de cima para baixo</summary>

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
