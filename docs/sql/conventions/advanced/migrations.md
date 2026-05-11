# Migrations

> Escopo: SQL. Idiomas específicos deste ecossistema.

Migrações são incrementais e irreversíveis. Cada arquivo representa uma mudança atômica no schema. **Forward-only migrations** (migrações apenas para frente) eliminam ambiguidade e simplificam pipelines de **CI** (Continuous Integration, Integração Contínua).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **migration** (migração) | Arquivo SQL versionado que altera o schema; ordenado por timestamp |
| **forward-only** (apenas para frente) | Política de não escrever rollback; reverte aplicando nova migração |
| **idempotent migration** (migração idempotente) | Pode ser aplicada várias vezes sem efeito colateral; usar `IF NOT EXISTS` |
| **schema drift** (desvio de schema) | Diferença entre o schema esperado e o real; sintoma de migrações fora de versionamento |
| **DDL** (Data Definition Language, linguagem de definição de dados) | `CREATE`, `ALTER`, `DROP`; o que migrações executam |
| **breaking change** (alteração quebradora) | Mudança incompatível com código antigo; aplicar em duas etapas (expand → contract) |
| **backfill** (preenchimento retroativo) | Popular nova coluna ou tabela com dados históricos; rodar em lotes |

## Convenção de nomenclatura

Formato Rails: `YYYYMMDDHHMMSS_descricao_da_migracao.sql`

<details>
<summary>❌ Ruim — numeração sequencial, sem contexto temporal</summary>

```
01-CreateTables.sql
02-AlterTables.sql
```

</details>

<details>
<summary>✅ Bom — timestamp + descrição em snake_case</summary>

```
20260419000000_create_football_teams.sql
20260419000001_create_players.sql
20260419120000_alter_football_teams_add_ticket_price.sql
```

</details>

## Somente para frente: forward only

Nunca editar uma migration já executada. Para ajustes, criar uma nova migration.

<details>
<summary>❌ Ruim — editar migration existente para corrigir schema</summary>

```sql
-- editando 20260419000000_create_football_teams.sql depois de já ter sido rodada
CREATE TABLE FootballTeams
(
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(100) NOT NULL,
  IsActive BIT DEFAULT 1  -- adicionado depois
);
```

</details>

<details>
<summary>✅ Bom — nova migration para cada mudança</summary>

```sql
-- 20260420000000_alter_football_teams_add_is_active.sql
ALTER TABLE
  FootballTeams
ADD
  IsActive BIT DEFAULT 1;
```

</details>

## Uma responsabilidade por arquivo

Cada migration faz uma coisa. Não misturar criação de tabelas com inserção de dados ou criação de índices não relacionados.

<details>
<summary>❌ Ruim — migration faz tudo de uma vez</summary>

```sql
-- 20260419000000_setup.sql
CREATE TABLE FootballTeams ( /* ... */ );
CREATE TABLE Players ( /* ... */ );
INSERT INTO FootballTeams VALUES ( /* seeds */ );
CREATE INDEX IX_Players_TeamId ON Players(TeamId);
```

</details>

<details>
<summary>✅ Bom — arquivos separados por responsabilidade</summary>

```
20260419000000_create_football_teams.sql   -- CREATE TABLE
20260419000001_create_players.sql          -- CREATE TABLE
20260419000002_seed_football_teams.sql     -- INSERT (seeds)
20260419000003_index_players_team_id.sql   -- CREATE INDEX
```

</details>
