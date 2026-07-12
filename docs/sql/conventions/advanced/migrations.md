# Migrations: como o schema evolui

> Escopo: SQL. Idioms específicos deste ecossistema.

Uma **migration** (migração) é um arquivo SQL versionado que altera a estrutura do banco. Cada arquivo carrega uma mudança e roda uma vez, na ordem do timestamp que abre o nome. O schema de produção é a soma de todas as migrations que já rodaram, na ordem em que rodaram.

Este guia adota a política **forward-only** (apenas para frente): nenhuma migration escreve o script de volta. Para desfazer algo, você escreve uma migration nova que desfaz. Assim existe um único caminho do banco vazio até o schema atual, e o pipeline de **CI** (Continuous Integration · Integração Contínua) só precisa rodar os arquivos em ordem.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **migration** (migração) | Arquivo SQL versionado que altera o schema; ordenado por timestamp |
| **forward-only** (apenas para frente) | Política de não escrever rollback; reverte aplicando nova migração |
| **idempotent migration** (migração idempotente) | Pode ser aplicada várias vezes sem efeito colateral; usar `IF NOT EXISTS` |
| **schema drift** (desvio de schema) | Diferença entre o schema esperado e o real; sintoma de migrações fora de versionamento |
| **DDL** (Data Definition Language · linguagem de definição de dados) | `CREATE`, `ALTER`, `DROP`; o que migrações executam |
| **breaking change** (alteração quebradora) | Mudança incompatível com código antigo; aplicar em duas etapas (expand → contract) |
| **backfill** (preenchimento retroativo) | Popular nova coluna ou tabela com dados históricos; rodar em lotes |

<a id="naming-convention"></a>

## O nome do arquivo começa pelo timestamp

O formato é `YYYYMMDDHHMMSS_descricao_da_migracao.sql`, o mesmo que o Rails popularizou. O timestamp resolve a ordem de execução mesmo quando dois desenvolvedores criam migrations no mesmo dia, em branches diferentes: a hora de criação decide quem roda primeiro. A numeração sequencial (`01-`, `02-`) quebra nesse cenário, porque os dois escolhem o mesmo número.

<details>
<summary>❌ Ruim: numeração sequencial, sem contexto temporal</summary>

```
01-CreateTables.sql
02-AlterTables.sql
```

</details>

<details>
<summary>✅ Bom: timestamp + descrição em snake_case</summary>

```
20260419000000_create_football_teams.sql
20260419000001_create_players.sql
20260419120000_alter_football_teams_add_ticket_price.sql
```

</details>

<a id="forward-only"></a>

## Uma migration que já rodou nunca é editada

Editar o arquivo depois que ele rodou cria dois bancos diferentes com o mesmo histórico. O seu banco local, recriado do zero, ganha a coluna nova; produção, que já marcou aquela migration como executada, continua sem ela. Para corrigir o schema, escreva uma migration nova.

<details>
<summary>❌ Ruim: editar migration existente para corrigir schema</summary>

```sql
-- editando 20260419000000_create_football_teams.sql depois de já ter sido rodada
CREATE TABLE FootballTeams
(
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(100) NOT NULL,
  IsActive BIT DEFAULT 1 -- adicionado depois
);
```

</details>

<details>
<summary>✅ Bom: nova migration para cada mudança</summary>

```sql
-- 20260420000000_alter_football_teams_add_is_active.sql
ALTER TABLE
  FootballTeams
ADD
  IsActive BIT DEFAULT 1;
```

</details>

<a id="one-change-per-file"></a>

## Cada migration faz uma coisa

Criação de tabela, carga de dados iniciais e criação de índice vão em arquivos separados. Quando a migration junta tudo e falha no meio, você fica com metade aplicada e precisa descobrir onde parou. Com um arquivo por mudança, a que falhou é a que você lê, e o nome dela já diz o que estava tentando fazer.

<details>
<summary>❌ Ruim: migration faz tudo de uma vez</summary>

```sql
-- 20260419000000_setup.sql
CREATE TABLE FootballTeams ( /* ... */ );
CREATE TABLE Players ( /* ... */ );
INSERT INTO FootballTeams VALUES ( /* seeds */ );
CREATE INDEX IX_Players_TeamId ON Players(TeamId);
```

</details>

<details>
<summary>✅ Bom: arquivos separados por responsabilidade</summary>

```
20260419000000_create_football_teams.sql   -- CREATE TABLE
20260419000001_create_players.sql          -- CREATE TABLE
20260419000002_seed_football_teams.sql     -- INSERT (seeds)
20260419000003_index_players_team_id.sql   -- CREATE INDEX
```

</details>
