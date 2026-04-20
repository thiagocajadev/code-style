# Migrations

Migrações são incrementais e irreversíveis. Cada arquivo representa uma mudança atômica no schema.

## Convenção de nomenclatura

Formato Rails: `YYYYMMDDHHMMSS_descricao_da_migracao.sql`

<details>
<br>
<summary>❌ Bad — numeração sequencial, sem contexto temporal</summary>

```
01-CreateTables.sql
02-AlterTables.sql
```

</details>

<br>

<details>
<br>
<summary>✅ Good — timestamp + descrição em snake_case</summary>

```
20260419000000_create_football_teams.sql
20260419000001_create_players.sql
20260419120000_alter_football_teams_add_ticket_price.sql
```

</details>

## Somente para frente — forward only

Nunca editar uma migration já executada. Se um ajuste for necessário, criar uma nova migration.

<details>
<br>
<summary>❌ Bad — editar migration existente para corrigir schema</summary>

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

<br>

<details>
<br>
<summary>✅ Good — nova migration para cada mudança</summary>

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
<br>
<summary>❌ Bad — migration faz tudo de uma vez</summary>

```sql
-- 20260419000000_setup.sql
CREATE TABLE FootballTeams ( /* ... */ );
CREATE TABLE Players ( /* ... */ );
INSERT INTO FootballTeams VALUES ( /* seeds */ );
CREATE INDEX IX_Players_TeamId ON Players(TeamId);
```

</details>

<br>

<details>
<br>
<summary>✅ Good — arquivos separados por responsabilidade</summary>

```
20260419000000_create_football_teams.sql   -- CREATE TABLE
20260419000001_create_players.sql          -- CREATE TABLE
20260419000002_seed_football_teams.sql     -- INSERT (seeds)
20260419000003_index_players_team_id.sql   -- CREATE INDEX
```

</details>
