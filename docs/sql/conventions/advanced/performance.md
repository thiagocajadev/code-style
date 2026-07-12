# Performance de queries SQL

> Escopo: SQL. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

Quase toda query lenta é lenta pelo mesmo motivo: o banco está lendo linhas demais. Ou o índice que serviria àquele filtro não existe, ou a query foi escrita de um jeito que impede o banco de usar o índice que existe. O componente do banco que decide como resolver a query, o **query optimizer** (otimizador), escolhe o melhor caminho entre os que estão disponíveis, e cabe a você deixar o caminho bom disponível.

Esta página reúne os erros que mais aparecem, cada um com o motivo pelo qual ele custa caro.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **execution plan** (plano de execução) | Sequência de operadores que o otimizador escolhe para resolver a query; visualizar com `EXPLAIN` |
| **covering index** (índice de cobertura) | Índice que contém todas as colunas necessárias; evita acesso ao heap |
| **index seek** (busca por índice) | O banco vai direto às poucas linhas que interessam, usando o índice |
| **table scan** (varredura de tabela) | O banco lê todas as linhas da tabela; aceitável só em tabela pequena |
| **N+1 query** (consulta N+1) | Uma query principal seguida de N derivadas; resolver com `JOIN` ou batch |
| **SARGable predicate** (predicado que o índice consegue pesquisar) | Filtro escrito de um jeito que permite usar o índice; envolver a coluna numa função quebra isso |
| **statistics** (estatísticas) | Distribuição de dados que o otimizador consulta para escolher o plano; manter atualizadas |

<a id="select-star"></a>

## SELECT *

O `SELECT *` traz três problemas. Ele puxa pela rede colunas que ninguém vai usar, e uma coluna de texto longo pesa. Ele impede o **covering index** (índice que já carrega todas as colunas pedidas), porque o índice nunca cobre todas as colunas da tabela, então o banco precisa voltar à tabela para buscar o resto. E ele prende a query ao schema: no dia em que alguém acrescentar uma coluna, sua query passa a trazê-la sem que você tenha pedido.

<details>
<summary>❌ Ruim: todas as colunas, inclusive as não usadas</summary>

```sql
SELECT
  *
FROM
  Players
WHERE
  Players.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: somente as colunas necessárias</summary>

```sql
SELECT
  Players.Id,
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.IsActive = 1 -- active
ORDER BY
  Players.SquadNumber;
```

</details>

<a id="function-on-filtered-column"></a>

## A função em volta da coluna desliga o índice

O índice de `JoinedAt` guarda as datas ordenadas, e é isso que permite ao banco pular direto para o trecho que interessa. Ao escrever `YEAR(Players.JoinedAt) = 2022`, você pede o ano, e o índice não guarda anos: ele guarda datas. O banco então calcula `YEAR(...)` para cada linha da tabela para descobrir quais valem, e a leitura vira uma varredura completa.

A saída é filtrar pela coluna crua, com um intervalo de datas. `JoinedAt >= '2022-01-01' AND JoinedAt < '2023-01-01'` seleciona o mesmo conjunto de linhas e o índice atende direto.

<details>
<summary>❌ Ruim: função no WHERE, índice ignorado</summary>

```sql
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  YEAR(Players.JoinedAt) = 2022;
```

</details>

<details>
<summary>✅ Bom: intervalo direto na coluna, índice aproveitado</summary>

```sql
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  Players.JoinedAt >= '2022-01-01' AND
  Players.JoinedAt < '2023-01-01'
ORDER BY
  Players.JoinedAt;
```

</details>

<a id="cast-and-type-conversion"></a>

## CAST e conversão de tipo em colunas

O `CAST` e o `CONVERT` em volta da coluna fazem o mesmo estrago que qualquer outra função no `WHERE`: o banco converte linha a linha e abandona o índice.

O caso difícil de achar é a conversão que você não escreveu. Quando o tipo do parâmetro difere do tipo da coluna, o banco converte a coluna por conta própria para poder comparar. Nenhum erro aparece, nenhum aviso aparece, a query devolve o resultado certo, e o índice ficou de fora. A query que rodava em 20 ms passa a rodar em 4 segundos, e o código-fonte da query está igual ao que sempre esteve.

A correção é sempre a mesma: converta o parâmetro e deixe a coluna intacta.

### CAST explícito na coluna de filtro

<details>
<summary>❌ Ruim: CAST na coluna: índice em SquadNumber ignorado</summary>

```sql
-- SquadNumber é INT; comparação como texto força conversão de cada linha
SELECT
  Players.Name,
  Players.SquadNumber,
  Players.Position
FROM
  Players
WHERE
  CAST(Players.SquadNumber AS NVARCHAR) = @SquadParam AND
  Players.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: parâmetro com o tipo correto, coluna intocada</summary>

```sql
-- @SquadNumber declarado como INT na aplicação; zero conversão no banco
SELECT
  Players.Name,
  Players.SquadNumber,
  Players.Position
FROM
  Players
WHERE
  Players.SquadNumber = @SquadNumber AND
  Players.IsActive = 1 -- active
ORDER BY
  Players.SquadNumber;
```

</details>

### Conversão implícita por tipo incompatível

Um detalhe do SQL Server pega muita gente: o literal `'Alice Smith'`, sem prefixo, é um `VARCHAR`. Se a coluna `Players.Name` é `NVARCHAR`, os tipos diferem, e o banco converte o `Name` de cada linha antes de comparar. O prefixo `N` no literal (`N'Alice Smith'`) resolve, porque aí os dois lados já são do mesmo tipo.

<details>
<summary>❌ Ruim: literal VARCHAR comparado com coluna NVARCHAR: conversão implícita linha a linha</summary>

```sql
-- Players.Name é NVARCHAR; literal sem prefixo N é VARCHAR
-- SQL Server converte cada Name para VARCHAR antes de comparar
SELECT
  Players.Id,
  Players.Name,
  Players.Position
FROM
  Players
WHERE
  Players.Name = 'Alice Smith'; -- VARCHAR literal, índice ignorado
```

</details>

<details>
<summary>✅ Bom: prefixo N alinha o tipo do literal com a coluna NVARCHAR</summary>

```sql
SELECT
  Players.Id,
  Players.Name,
  Players.Position
FROM
  Players
WHERE
  Players.Name = N'Alice Smith'; -- NVARCHAR literal, índice aproveitado
```

</details>

### CAST em condição de JOIN

Quando as duas colunas do `JOIN` têm tipos diferentes, uma das duas vai ser convertida linha a linha. Você escolhe qual. Convertendo a coluna que tem índice, o índice se perde; convertendo a que não tem, ele sobrevive. A saída melhor é alinhar os tipos no schema e não converter nada.

<details>
<summary>❌ Ruim: CAST na coluna indexada da tabela principal</summary>

```sql
-- FootballTeams.Id é INT; ExternalTeams.TeamReference é NVARCHAR
-- CAST em FootballTeams.Id descarta o índice em Id
SELECT
  FootballTeams.Name,
  ExternalTeams.LeagueName
FROM
  FootballTeams
JOIN
  ExternalTeams ON CAST(FootballTeams.Id AS NVARCHAR) = ExternalTeams.TeamReference;
```

</details>

<details>
<summary>✅ Bom: CAST na coluna não indexada; preferível: corrigir o schema</summary>

```sql
-- opção 1: converter o lado não indexado, índice em FootballTeams.Id preservado
SELECT
  FootballTeams.Name,
  ExternalTeams.LeagueName
FROM
  FootballTeams
JOIN
  ExternalTeams ON FootballTeams.Id = CAST(ExternalTeams.TeamReference AS INT);

-- opção 2 (ideal): alinhar os tipos no schema e eliminar a conversão
-- ALTER TABLE ExternalTeams ALTER COLUMN TeamReference INT NOT NULL;
```

</details>

### Data armazenada como texto

A data guardada em `VARCHAR` obriga um `CONVERT` em toda query que filtra por período, e o `CONVERT` em volta da coluna já derruba o índice. Ela traz um problema pior junto: como o banco aceita qualquer texto, a mesma coluna acaba guardando `2024-01-15`, `15/01/2024` e `2024/01/15`, e nenhuma comparação funciona direito.

A correção mora no schema. Declare a coluna como `DATE` ou `DATETIME2` e converta na aplicação antes do `INSERT`.

<details>
<summary>❌ Ruim: data como VARCHAR: CONVERT em todo filtro, índice inutilizável</summary>

```sql
-- JoinedAt definido como VARCHAR(10): '2024-01-15', '15/01/2024', '2024/01/15'
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  CONVERT(DATE, Players.JoinedAt) >= '2024-01-01' AND
  CONVERT(DATE, Players.JoinedAt) < '2025-01-01';
```

</details>

<details>
<summary>✅ Bom: JoinedAt como DATE: filtro direto, índice aproveitado</summary>

```sql
-- schema correto: JoinedAt DATE NOT NULL
-- aplicação envia Date, não string; zero conversão no banco
SELECT
  Players.Name,
  Players.JoinedAt
FROM
  Players
WHERE
  Players.JoinedAt >= '2024-01-01' AND
  Players.JoinedAt < '2025-01-01'
ORDER BY
  Players.JoinedAt;
```

</details>

<a id="correlated-subquery"></a>

## A subquery dentro do SELECT roda uma vez por linha

A subquery que aparece na lista de colunas é executada para cada linha que a query devolve. Se a consulta traz mil times, aquele `COUNT` de jogadores roda mil vezes. Levando a contagem para um `LEFT JOIN` com `GROUP BY`, o banco faz a conta uma vez para todos os times de uma vez.

<details>
<summary>❌ Ruim: subquery executa N vezes, uma por time</summary>

```sql
SELECT
  FootballTeams.Name,
  (
    SELECT COUNT(Players.Id)
    FROM Players
    WHERE
      Players.TeamId = FootballTeams.Id AND
      Players.IsActive = 1
  ) AS TotalPlayers
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: CTE agrega uma vez, JOIN cruza o resultado</summary>

```sql
WITH ActivePlayerCountCTE AS
(
  SELECT
    Players.TeamId,
    COUNT(Players.Id) AS TotalPlayers
  FROM
    Players
  WHERE
    Players.IsActive = 1 -- active
  GROUP BY
    Players.TeamId
)

SELECT
  FootballTeams.Name,
  ActivePlayerCountCTE.TotalPlayers
FROM
  FootballTeams
JOIN
  ActivePlayerCountCTE ON FootballTeams.Id = ActivePlayerCountCTE.TeamId
WHERE
  FootballTeams.IsActive = 1 -- active
ORDER BY
  ActivePlayerCountCTE.TotalPlayers DESC;
```

</details>

<a id="single-column-index"></a>

## A coluna que você filtra precisa de índice

Sem índice em `TeamId`, o banco lê a tabela inteira de jogadores para achar os de um time. Com o índice, ele vai direto ao grupo de linhas daquele time. A regra prática: as colunas que aparecem no `WHERE`, no `JOIN` e no `ORDER BY` são candidatas a índice.

<details>
<summary>❌ Ruim: full scan em tabela grande sem índice na coluna filtrada</summary>

```sql
-- sem índice em TeamId: o banco lê todos os registros da tabela
SELECT
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.TeamId = @TeamId AND
  Players.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: índice na coluna principal do filtro</summary>

```sql
CREATE INDEX IX_Players_TeamId
  ON Players (TeamId);
```

</details>

<a id="composite-index-order"></a>

## No índice composto, a coluna mais seletiva vem primeiro

**Seletividade** é quantos valores diferentes a coluna tem. `IsActive` guarda dois valores (0 e 1), então filtrar por ela deixa metade da tabela de fora, e olhe lá. `TeamId` guarda centenas de valores, e filtrar por ele deixa quase tudo de fora.

O índice composto ordena as linhas pela primeira coluna, depois pela segunda. Colocando `TeamId` primeiro, o banco chega ao punhado de linhas daquele time e usa `IsActive` para escolher dentro desse punhado. Na ordem inversa, ele começaria por metade da tabela.

<details>
<summary>❌ Ruim: coluna de baixa seletividade isolada</summary>

```sql
-- IsActive tem apenas dois valores (0 / 1): índice ineficiente sozinho
CREATE INDEX IX_Players_IsActive
  ON Players (IsActive);
```

</details>

<details>
<summary>✅ Bom: alta seletividade primeiro, baixa seletividade filtra dentro do grupo</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive
  ON Players (TeamId, IsActive);
```

</details>

<a id="covering-index"></a>

## O índice que carrega as colunas do SELECT dispensa a volta à tabela

O índice de `TeamId` guarda o `TeamId` e o endereço da linha. Quando a query pede `Name`, `Position` e `SquadNumber`, o banco encontra as linhas pelo índice e volta à tabela para buscar essas três colunas, uma linha de cada vez. Essa volta se chama **key lookup**, e com muitas linhas ela custa mais que a busca em si.

O `INCLUDE` guarda as três colunas dentro do próprio índice. A query se resolve sem tocar a tabela.

<details>
<summary>❌ Ruim: índice sem cobertura, key lookup para Name / Position / SquadNumber</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive
  ON Players (TeamId, IsActive);

-- esta query ainda acessa a tabela principal para buscar as colunas do SELECT
SELECT
  Players.Name,
  Players.Position,
  Players.SquadNumber
FROM
  Players
WHERE
  Players.TeamId = @TeamId AND
  Players.IsActive = 1;
```

</details>

<details>
<summary>✅ Bom: INCLUDE cobre todas as colunas do SELECT, zero key lookup</summary>

```sql
CREATE INDEX IX_Players_TeamId_IsActive_Cover
  ON Players (TeamId, IsActive)
  INCLUDE (Name, Position, SquadNumber);
```

</details>

<a id="fk-without-index"></a>

## Toda foreign key pede um índice na coluna que aponta

A **FK** (Foreign Key · chave estrangeira) declara que `Players.TeamId` aponta para um time. Antes de apagar ou atualizar um time, o banco precisa saber se algum jogador ainda aponta para ele, e vai procurar em `Players.TeamId`. Sem índice nessa coluna, cada `DELETE` na tabela de times varre a tabela de jogadores inteira.

Criar a FK não cria o índice: são duas declarações separadas, e a segunda é fácil de esquecer.

<details>
<summary>❌ Ruim: FK declarada, coluna sem índice</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER NOT NULL,
  TeamId UNIQUEIDENTIFIER NOT NULL,

  CONSTRAINT PK_Players PRIMARY KEY (Id),
  CONSTRAINT FK_Players_FootballTeams FOREIGN KEY (TeamId)
    REFERENCES FootballTeams (Id)
);

-- DELETE em FootballTeams faz full scan em Players para checar filhos
```

</details>

<details>
<summary>✅ Bom: índice na coluna FK, lookup eficiente</summary>

```sql
CREATE TABLE Players
(
  Id UNIQUEIDENTIFIER NOT NULL,
  TeamId UNIQUEIDENTIFIER NOT NULL,

  CONSTRAINT PK_Players PRIMARY KEY (Id),
  CONSTRAINT FK_Players_FootballTeams FOREIGN KEY (TeamId)
    REFERENCES FootballTeams (Id)
);

CREATE INDEX IX_Players_TeamId
  ON Players (TeamId);
```

</details>

> [!NOTE]
> Alguns sistemas de alta escala (o GitHub é um exemplo público) optam por **não usar FK no banco** e passam a checagem de integridade para a aplicação. O trade-off é assumido de propósito: a FK acrescenta trabalho a toda escrita, porque `INSERT`, `UPDATE` e `DELETE` param para validar a referência, e em volume muito grande esse custo pesa. O ganho é velocidade de escrita e liberdade no deploy. A contrapartida é que o banco para de garantir a integridade, e qualquer falha na aplicação deixa registros órfãos. Para a maioria dos sistemas, a FK com índice é a escolha certa. Removê-la é uma decisão de arquitetura tomada com números na mão.

<a id="id-type-bigint-vs-uuid"></a>

## Tipo de ID: BIGINT ou UUID

O tipo do identificador decide o tamanho do índice e a frequência com que o banco precisa reorganizar as páginas dele.

O índice fica guardado em páginas ordenadas. Quando o identificador cresce sempre (1, 2, 3), cada linha nova entra no fim do índice, e o banco só abre página nova quando a última encheu. O **UUID** (Universally Unique Identifier · Identificador Universalmente Único) v4 é aleatório, então a linha nova cai em qualquer ponto do índice, muitas vezes no meio de uma página cheia. O banco então parte a página em duas para abrir espaço, o que se chama **page split**. Em uma tabela que recebe muitas inserções, os splits se acumulam, o índice fica esparso e tanto a leitura quanto a escrita ficam mais lentas.

| Tipo | Tamanho | Unicidade global | Sequencial | Page splits |
| --- | --- | --- | --- | --- |
| `BIGINT IDENTITY` | 8 bytes | ❌ | ✅ | mínimo |
| `UUID v4` (`NEWID`) | 16 bytes | ✅ | ❌ | alto |
| `UUID v7` | 16 bytes | ✅ | ✅ | mínimo |

O UUID v7 resolve o impasse: ele começa pelo horário de criação e termina com bits aleatórios. Como o horário sempre cresce, os identificadores nascem em ordem e cada linha nova entra perto do fim do índice, do jeito que um `BIGINT` entraria, e ainda assim continuam únicos entre máquinas diferentes. Quem gera o UUID v7 é a aplicação, e o banco recebe o valor pronto.

<details>
<summary>❌ Ruim: NEWID() gera UUID v4: random, fragmenta índice progressivamente</summary>

```sql
CREATE TABLE Orders
(
  Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- random: page splits constantes
  CustomerId UNIQUEIDENTIFIER NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<details>
<summary>✅ Bom: BIGINT quando unicidade global não é requisito</summary>

```sql
CREATE TABLE Orders
(
  Id BIGINT NOT NULL IDENTITY(1, 1),
  CustomerId BIGINT NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

<details>
<summary>✅ Bom: UUID v7 gerado na aplicação: unicidade global + sequencial</summary>

```sql
-- o ID é gerado na aplicação antes do INSERT
-- Guid.CreateVersion7(): .NET 9+
-- uuidv7(): npm uuid
-- pg_uuidv7: extensão PostgreSQL
CREATE TABLE Orders
(
  Id UNIQUEIDENTIFIER NOT NULL, -- sem DEFAULT: valor vem da aplicação
  CustomerId UNIQUEIDENTIFIER NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT PK_Orders PRIMARY KEY (Id)
);
```

</details>

`NEWSEQUENTIALID()` (SQL Server) é uma alternativa nativa sequencial, mas só funciona como
`DEFAULT`: não é portável entre bancos e impede geração de ID antes do INSERT.

<a id="pagination"></a>

## Quem pagina é o banco

Trazer os cinquenta mil times para a memória da aplicação e mostrar vinte deles gasta rede, gasta memória e demora. O `OFFSET ... FETCH NEXT` diz ao banco quantas linhas pular e quantas devolver, e só as vinte atravessam a rede.

O `ORDER BY` é obrigatório aqui. Sem ele o banco não tem critério para decidir quem é a linha 21, e o mesmo registro pode aparecer em duas páginas seguidas.

<details>
<summary>❌ Ruim: traz tudo e descarta em memória</summary>

```sql
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC;
-- aplicação filtra a página no código
```

</details>

<details>
<summary>✅ Bom: OFFSET / FETCH (SQL Server e PostgreSQL)</summary>

```sql
-- SQL Server
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC
OFFSET @Page * @PageSize ROWS
FETCH NEXT @PageSize ROWS ONLY;

-- PostgreSQL
SELECT
  FootballTeams.Id,
  FootballTeams.Name,
  FootballTeams.ChampionshipsWon
FROM
  FootballTeams
WHERE
  FootballTeams.IsActive = 1
ORDER BY
  FootballTeams.ChampionshipsWon DESC
LIMIT :pageSize OFFSET :page * :pageSize;
```

</details>
