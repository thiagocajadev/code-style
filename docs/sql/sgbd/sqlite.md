# SQLite

> Escopo: SQLite 3.53. Referência: [sqlite.org/docs.html](https://sqlite.org/docs.html).
>
> Este documento cobre idioms e recursos específicos do SQLite. Convenções gerais de formatação
> e naming estão em [conventions/](../conventions/).
>
> SQLite é um banco embutido: sem servidor, sem usuários, sem roles. O arquivo `.db` é o banco.
> Indicado para apps mobile, desktop, CLI, testes e edge computing. Não substitui PostgreSQL ou
> SQL Server em workloads de alta concorrência com múltiplas escritas.

O SQLite é um banco embutido: o programa abre um arquivo `.db` e conversa com ele direto, sem servidor no meio, sem usuário e sem senha. É o que roda dentro de aplicativos de celular, de programas de desktop e da maioria das suítes de teste.

Essa arquitetura traz idioms próprios, e é deles que esta página trata: o tipo da coluna funciona como sugestão e não como regra, a configuração se faz com **PRAGMA** (comando que ajusta o comportamento da conexão), a concorrência de leitura depende de ligar o modo **WAL**, e a busca em texto vem do módulo `FTS5`. Um aviso de escopo: em carga com muitas escritas simultâneas, o SQLite não substitui um PostgreSQL ou um SQL Server, porque só uma escrita acontece por vez.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Type affinity** (afinidade de tipo) | Sistema de tipos do SQLite: colunas têm "afinidade", não tipo rígido; qualquer valor pode ser armazenado em qualquer coluna |
| **WAL** (Write-Ahead Logging, Registro Antecipado de Escrita) | Modo de journaling que permite leituras concorrentes durante uma escrita; ativar em produção |
| **rowid** (identificador de linha) | ID inteiro implícito em toda tabela SQLite; PRIMARY KEY INTEGER é um alias de rowid |
| **FTS5** (Full-Text Search 5, Busca de Texto Integral 5) | Extensão embutida para indexação e busca textual eficiente |
| **OPFS** (Origin Private File System) | Sistema de arquivos privado de origem do navegador; suportado via WebAssembly no SQLite 3.53 |

<a id="type-affinity"></a>

## O tipo da coluna é uma preferência, não uma regra

Esta é a maior surpresa para quem chega de outro banco. No SQLite, uma coluna declarada `INTEGER` aceita a string `'abacaxi'` sem reclamar. O tipo declarado define a **type affinity** (afinidade de tipo), que é a preferência do banco na hora de converter o valor recebido. Se a conversão não for possível, ele guarda o valor como veio.

A consequência prática: a validação do tipo é responsabilidade da aplicação, e o `CHECK` constraint é o que resta para exigir a garantia dentro do banco.

| Afinidade | Regra de mapeamento | Exemplo de declaração |
| --- | --- | --- |
| `INTEGER` | Contém "INT" no tipo | `INT`, `INTEGER`, `BIGINT` |
| `TEXT` | Contém "CHAR", "CLOB" ou "TEXT" | `VARCHAR(n)`, `TEXT`, `NVARCHAR` |
| `REAL` | Contém "REAL", "FLOA" ou "DOUB" | `REAL`, `FLOAT`, `DOUBLE` |
| `NUMERIC` | Contém "NUM" ou "DEC"; ou "DATE"/"DATETIME" | `NUMERIC`, `DECIMAL`, `DATE` |
| `BLOB` | Sem correspondência: armazena como recebido | `BLOB`, ou coluna sem tipo |

<details>
<summary>❌ Ruim: tipo não declarado, comportamento imprevisível</summary>

```sql
CREATE TABLE Orders (
  Id, -- sem tipo: afinidade BLOB, aceita qualquer coisa
  TotalAmount -- sem tipo: somas podem retornar resultados inesperados
);
```

</details>

<details>
<summary>✅ Bom: tipo declarado com afinidade explícita</summary>

```sql
CREATE TABLE Orders
(
  Id INTEGER NOT NULL,
  CustomerId INTEGER NOT NULL,
  TotalAmount NUMERIC NOT NULL,
  Status TEXT NOT NULL DEFAULT 'Pending',
  CreatedAt DATETIME NOT NULL DEFAULT (DATETIME('now')),

  CONSTRAINT PK_Orders PRIMARY KEY (Id),
  CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
    REFERENCES Customers (Id)
);
```

</details>

<a id="foreign-keys"></a>

## As foreign keys vêm desligadas

O SQLite aceita a declaração `REFERENCES` e a guarda no schema, mas não a aplica: por compatibilidade com versões antigas, a checagem vem desligada. Você insere um pedido apontando para um cliente que não existe e o banco aceita, sem erro.

O `PRAGMA foreign_keys = ON` liga a checagem, e ele vale para uma conexão só. Toda conexão que a aplicação abrir precisa executá-lo, o que costuma virar uma linha na configuração do pool.

<details>
<summary>❌ Ruim: FK declarada mas não aplicada: dados inválidos inseridos sem erro</summary>

```sql
-- sem PRAGMA foreign_keys = ON, esta inserção passa silenciosamente
INSERT INTO Orders (Id, CustomerId) VALUES (1, 999); -- CustomerId 999 não existe
```

</details>

<details>
<summary>✅ Bom: ativar FK no início de cada conexão</summary>

```sql
PRAGMA foreign_keys = ON;

INSERT INTO Orders
(
  Id,
  CustomerId,
  TotalAmount
)
VALUES
(
  1,
  @CustomerId,
  @TotalAmount
);
```

</details>

<a id="ids"></a>

## IDs no SQLite

Toda tabela do SQLite já tem, por dentro, uma coluna chamada `rowid`. Declarar `INTEGER PRIMARY KEY` faz a sua coluna virar essa coluna interna, e aí o banco preenche o valor sozinho, em sequência, sem custo nenhum.

Quando o identificador precisa ser único entre dispositivos (o app do celular gera registros offline e sincroniza depois), guarde um **UUID** (Universally Unique Identifier · identificador universalmente único) como `TEXT`.

<details>
<summary>✅ Bom: BIGINT sequencial via rowid alias</summary>

```sql
CREATE TABLE Customers
(
  Id INTEGER NOT NULL,
  Name TEXT NOT NULL,
  Email TEXT NOT NULL,

  CONSTRAINT PK_Customers PRIMARY KEY (Id), -- alias de rowid: auto-increment implícito
  CONSTRAINT UQ_Customers_Email UNIQUE (Email)
);
```

</details>

<details>
<summary>✅ Bom: UUID como TEXT quando unicidade global é requisito</summary>

```sql
CREATE TABLE Events
(
  Id TEXT NOT NULL,
  Type TEXT NOT NULL,
  Payload TEXT NOT NULL DEFAULT '{}', -- JSON armazenado como TEXT
  CreatedAt DATETIME NOT NULL DEFAULT (DATETIME('now')),

  CONSTRAINT PK_Events PRIMARY KEY (Id) -- UUID v7 gerado na aplicação
);
```

</details>

<a id="wal-mode"></a>

## O modo WAL deixa a leitura acontecer durante a escrita

No modo padrão, uma escrita bloqueia as leituras: quem quiser ler espera a gravação terminar. O **WAL** (Write-Ahead Logging · registro antes da escrita) grava a alteração num arquivo de log à parte, e os leitores continuam lendo a versão anterior do banco enquanto isso.

Numa aplicação com vários leitores e um escritor, que é o caso comum, ligar o WAL costuma ser a mudança de maior efeito. Ele se liga uma vez e fica gravado no arquivo do banco.

```sql
PRAGMA journal_mode = WAL;
```

Ativar junto com `PRAGMA synchronous = NORMAL` para melhor equilíbrio entre durabilidade e
performance em produção.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000; -- 64 MB de cache em memória
```

<a id="transactions"></a>

## Transações: use IMMEDIATE quando for escrever

O SQLite tem três tipos de transação, e a diferença está em quando ele pega o lock de escrita.

O padrão, `DEFERRED`, só pega o lock no primeiro comando de escrita. Isso abre uma janela: duas transações começam, as duas leem, e a segunda descobre na hora de gravar que a primeira chegou antes. Ela então falha com `SQLITE_BUSY`, no meio do trabalho. O `IMMEDIATE` pega o lock logo na abertura, então a disputa se resolve antes de a transação fazer qualquer coisa.

| Tipo | Comportamento | Quando usar |
| --- | --- | --- |
| `DEFERRED` (padrão) | Lock de leitura inicial; escrita ao primeiro `INSERT`/`UPDATE`/`DELETE` | Operações de leitura |
| `IMMEDIATE` | Lock de escrita imediato | Operações de escrita desde o início |
| `EXCLUSIVE` | Lock exclusivo total | Operações críticas sem leitores concorrentes |

<details>
<summary>✅ Bom: transação IMMEDIATE para operação de escrita</summary>

```sql
BEGIN IMMEDIATE;

INSERT INTO Orders
(
  Id,
  CustomerId,
  TotalAmount
)
VALUES
(
  @Id,
  @CustomerId,
  @TotalAmount
);

INSERT INTO OrderItems
(
  OrderId,
  ProductId,
  Quantity
)
VALUES
(
  @Id,
  @ProductId,
  @Quantity
);

COMMIT;
```

</details>

<a id="json"></a>

## JSON: funções nativas

Desde a versão 3.38, o SQLite lê **JSON** (JavaScript Object Notation · notação de objetos JavaScript) sem precisar de extensão. O documento fica guardado numa coluna `TEXT`, e `json_extract` puxa um campo de dentro dele. Não existe um tipo `JSONB` como no PostgreSQL: aqui o texto é texto, e a leitura interpreta o documento a cada acesso.

SQLite 3.53 adicionou `json_array_insert()` para inserir elemento em posição específica de um
array JSON.

<details>
<summary>✅ Bom: armazenar e consultar JSON em coluna TEXT</summary>

```sql
-- armazenar
INSERT INTO Events
(
  Id,
  Type,
  Payload
)
VALUES
(
  @Id,
  'order.created',
  json_object('orderId', @OrderId, 'customerId', @CustomerId)
);

-- consultar campo específico do JSON
SELECT
  Events.Id,
  json_extract(Events.Payload, '$.orderId') AS OrderId,
  json_extract(Events.Payload, '$.customerId') AS CustomerId
FROM
  Events
WHERE
  Events.Type = 'order.created';
```

</details>

<a id="fts5"></a>

## FTS5: busca dentro do texto

Procurar uma palavra com `LIKE '%tenis%'` lê a tabela inteira e não entende plural nem acento. O `FTS5` (Full-Text Search 5) resolve isso: ele mantém um índice das palavras que aparecem em cada linha, e a busca vai direto às linhas que contêm a palavra.

Ele funciona por meio de uma tabela virtual, criada com `USING fts5`. Ela espelha o conteúdo textual da tabela real e é nela que a busca acontece.

<details>
<summary>✅ Bom: tabela FTS5 para busca textual em produtos</summary>

```sql
-- tabela virtual FTS5
CREATE VIRTUAL TABLE ProductSearch USING fts5
(
  Name,
  Description,
  content=Products, -- content table: sincroniza com a tabela principal
  content_rowid=Id
);

-- buscar produtos que contêm "notebook" no nome ou descrição
SELECT
  Products.Id,
  Products.Name,
  Products.Price
FROM
  Products
JOIN
  ProductSearch ON Products.Id = ProductSearch.rowid
WHERE
  ProductSearch MATCH 'notebook'
ORDER BY
  rank;
```

</details>

<a id="alter-table"></a>

## O ALTER TABLE faz pouca coisa

O SQLite acrescenta coluna, renomeia coluna e renomeia tabela. Fora disso, ele não altera. Mudar o tipo de uma coluna, acrescentar uma constraint ou trocar a chave primária exige o caminho longo: criar a tabela nova com o schema certo, copiar os dados para ela, apagar a antiga e renomear a nova.

Vale conhecer esse limite antes de escrever a migration, porque ele muda o formato do arquivo.

| Operação | Suporte |
| --- | --- |
| `ADD COLUMN` | Suportado |
| `RENAME TABLE` | Suportado |
| `RENAME COLUMN` | Suportado (3.25+) |
| `DROP COLUMN` | Suportado (3.35+) |
| `ADD CONSTRAINT` / `DROP CONSTRAINT` | Suportado (3.53+) |
| `MODIFY COLUMN` (alterar tipo) | Não suportado: recriar a tabela |

<details>
<summary>✅ Bom: adicionar constraint NOT NULL (SQLite 3.53+)</summary>

```sql
-- antes do SQLite 3.53: era necessário recriar a tabela
-- a partir do 3.53: ALTER TABLE ADD CONSTRAINT é suportado
ALTER TABLE Orders
  ADD CONSTRAINT CK_Orders_TotalAmount CHECK (TotalAmount >= 0);
```

</details>

<details>
<summary>✅ Bom: recriar tabela para alterar tipo de coluna</summary>

```sql
-- passo 1: criar nova tabela com o schema correto
CREATE TABLE Orders_New
(
  Id INTEGER NOT NULL,
  CustomerId INTEGER NOT NULL,
  TotalAmount NUMERIC NOT NULL,
  Status TEXT NOT NULL DEFAULT 'Pending',

  CONSTRAINT PK_Orders_New PRIMARY KEY (Id)
);

-- passo 2: copiar dados
INSERT INTO Orders_New
SELECT
  Orders.Id,
  Orders.CustomerId,
  Orders.TotalAmount,
  Orders.Status
FROM
  Orders;

-- passo 3: substituir a tabela original dentro de uma transação
BEGIN IMMEDIATE;
DROP TABLE Orders;
ALTER TABLE Orders_New RENAME TO Orders;
COMMIT;
```

</details>

## Funções do sistema

| Função | Retorna | Uso |
| --- | --- | --- |
| `DATETIME('now')` | Data e hora UTC atual como TEXT | Timestamp de criação |
| `DATETIME('now', 'localtime')` | Data e hora local | Apenas para exibição |
| `strftime('%Y-%m-%d', coluna)` | Data formatada | Formatação para exibição |
| `last_insert_rowid()` | Último rowid inserido na conexão | Recuperar ID após INSERT |
| `changes()` | Linhas afetadas pelo último comando | Validar UPDATE/DELETE |
| `total_changes()` | Total de linhas modificadas desde a conexão | Diagnóstico de operações em lote |
| `json_extract(json, path)` | Valor no caminho JSON | Extrair campo de coluna JSON |
| `json_object(key, val, ...)` | Objeto JSON | Construir JSON inline |
| `json_array_insert(json, path, val)` | Array JSON com elemento inserido | Novo em 3.53 |

## PRAGMAs recomendados

Este bloco é o ponto de partida para uma aplicação em produção. Ele liga o WAL, liga a checagem de foreign key, dá mais memória de cache ao banco e afrouxa um pouco a garantia de gravação em disco (`synchronous = NORMAL`), o que é seguro quando o WAL está ligado. Rode os PRAGMAs na abertura de cada conexão.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000; -- 64 MB
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256 MB de mmap
```

## Recursos relacionados

- [Formatting](../conventions/formatting.md): estilo vertical, JOIN, condições
- [Naming](../conventions/naming.md): PascalCase, prefixos, constraints
- [Null Safety](../conventions/advanced/null-safety.md): NULL, COALESCE, IS NULL
- [Migrations](../conventions/advanced/migrations.md): forward only, uma responsabilidade
- [SQL Server](./sql-server.md): idioms específicos do SQL Server
- [PostgreSQL](./postgres.md): idioms específicos do PostgreSQL
