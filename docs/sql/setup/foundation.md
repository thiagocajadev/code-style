# Foundation

> [!NOTE]
> Essa estrutura reflete como costumo organizar projetos SQL. Os exemplos usam SQL Server como referência — os princípios se aplicam a qualquer banco relacional.

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/editorconfig.md) — indentação, charset, trailing whitespace
- [SQLFluff](./sqlfluff.md) — linting e formatação SQL

## Estrutura de arquivos

Separar scripts por responsabilidade facilita revisão, rollback e automação de CI.

```
sql/
  migrations/          -- alterações de schema, ordem por timestamp
  procedures/          -- stored procedures
  functions/           -- functions
  seeds/               -- dados iniciais (apenas ambientes non-prod)
```

## Migrations

Cada migration é um arquivo atômico com timestamp no nome — sem editar o que já foi executado.

```
migrations/
  20260419000000_create_football_teams.sql
  20260419000001_create_players.sql
  20260419120000_alter_football_teams_add_ticket_price.sql
```

Veja [Migrations](../conventions/migrations.md) para as convenções completas.
