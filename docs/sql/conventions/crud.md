# As quatro operações básicas sobre uma tabela

**CRUD** (Create, Read, Update, Delete · criar, ler, atualizar, excluir) é o apelido das quatro operações que todo sistema faz no banco: `INSERT`, `SELECT`, `UPDATE` e `DELETE`. Esta página mostra como escrever cada uma no formato vertical e como decidir o que acontece quando um registro sai de cena.

A decisão de exclusão merece atenção desde o começo. O `DELETE` apaga a linha do disco e ninguém recupera o dado depois. O **soft delete** (exclusão lógica) marca a linha como inativa e mantém o histórico disponível para auditoria.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **CRUD** (Create, Read, Update, Delete · criar, ler, atualizar, excluir) | As quatro operações básicas sobre uma tabela: `INSERT`, `SELECT`, `UPDATE`, `DELETE` |
| **vertical formatting** (formatação vertical) | Cada coluna ou cláusula em sua linha; legível de cima para baixo, sem scroll horizontal |
| **soft delete** (exclusão lógica) | Marcar a linha como removida (`DeletedAt`) sem apagar do disco |
| **hard delete** (exclusão física) | `DELETE` que remove do disco; irreversível |
| **upsert** (inserir ou atualizar) | `MERGE` ou `INSERT ... ON CONFLICT`; insere se a chave não existe, atualiza se existe |
| **WHERE clause** (cláusula WHERE) | Filtro de linhas; sem `WHERE`, `UPDATE`/`DELETE` afeta toda a tabela |
| **RETURNING / OUTPUT** (cláusula de retorno) | Recupera linhas afetadas pelo DML em uma única ida ao banco |

<a id="insert-vertical"></a>

## O INSERT separa colunas e valores em dois blocos

Escrito na vertical, o `INSERT` deixa a coluna e o valor dela na mesma posição dos dois blocos: a terceira coluna corresponde ao terceiro valor. Com tudo em uma linha só, conferir se `Email` está recebendo o e-mail vira contagem de vírgulas.

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

<a id="insert-select"></a>

## INSERT que copia de outra tabela

Quando os valores vêm de um `SELECT`, a ordem das colunas do `INSERT` precisa bater com a ordem das colunas do `SELECT`. Alinhando os dois blocos na vertical, a correspondência fica visível linha a linha: `Email` embaixo de `Email`, `ContactEmail` embaixo de `ContactEmail`.

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

<a id="update-from"></a>

## UPDATE que busca o valor em outra tabela

O `UPDATE ... FROM` junta as duas tabelas uma vez e atualiza tudo numa passagem. A alternativa comum é a **subquery correlacionada** (subconsulta que roda de novo para cada linha da tabela externa) dentro do `SET`, e ela repete trabalho: com dez mil usuários a atualizar, o banco executa dez mil vezes o `SELECT` de dentro.

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

<a id="soft-delete"></a>

## Marcar como inativo em vez de apagar

O `DELETE` tira a linha do disco e o dado se foi. Quando alguém perguntar por que aquele pedido sumiu, ou quando a auditoria pedir o histórico do cliente, não há o que responder. Marcar a linha com `IsActive = 0` e gravar o horário da inativação mantém o registro disponível para consulta e permite desfazer o engano.

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

<a id="conditional-bulk-update"></a>

## Um CASE resolve várias condições em uma passagem

Dois `UPDATE` seguidos, um para cada condição, varrem a tabela duas vezes. O `CASE` dentro do `SET` decide o valor linha a linha, e o banco percorre a tabela uma vez só.

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

<a id="early-filters"></a>

## Filtrar a tabela principal antes de juntar as outras

Cada linha que entra no `JOIN` é trabalho que o banco faz. Se a tabela de pedidos tem cinco milhões de linhas e o filtro deixa mil, aplicar o filtro primeiro faz a junção com clientes acontecer sobre mil linhas. Uma **CTE** (Common Table Expression · expressão de tabela nomeada) recorta a tabela principal e dá um nome a esse recorte, e o `JOIN` vem depois.

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

## Todo SELECT que devolve lista declara ORDER BY

Sem `ORDER BY`, o banco entrega as linhas na ordem que for mais barata para ele naquele momento, e essa ordem muda quando o plano de execução muda. A query que hoje devolve os times em ordem de cadastro pode devolver em outra ordem amanhã, depois de um índice novo. Se a ordem importa para quem lê o resultado, ela precisa estar escrita na query.

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

<a id="magic-numbers"></a>

## O número solto na query ganha um comentário

`Orders.StatusId = 2` não diz nada a quem abre a query seis meses depois. Um comentário curto no fim da linha (`-- Approved`) devolve o significado sem exigir uma tabela de constantes ou uma camada nova de abstração. O mesmo vale para o `30` de uma janela de retenção.

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

## O valor que vem de fora entra como parâmetro nomeado

O valor que a aplicação envia (o status escolhido, a data inicial do relatório) entra na query como parâmetro: `@StatusId` no SQL Server, `:statusId` no PostgreSQL. Com o valor colado direto no texto da query, duas coisas acontecem: o banco trata cada combinação como uma query nova e joga fora o plano de execução que já tinha, e uma string vinda do usuário passa a poder alterar o comando (o ataque conhecido como SQL injection).

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
