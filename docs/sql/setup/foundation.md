# Foundation

> [!NOTE]
> Essa estrutura reflete como costumo organizar projetos SQL. Os exemplos usam SQL Server como referência; os princípios se aplicam a qualquer banco relacional.

A fundação de um projeto **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) define três coisas: onde vivem migrations versionadas, como scripts são organizados por domínio (não por tipo de objeto) e quais convenções de naming se aplicam. Editor e formatter ficam alinhados antes da primeira migration entrar no repositório.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **migration** (migração) | Arquivo SQL versionado que altera o schema; ordenado por timestamp |
| **seed** (semente) | Script que carrega dados iniciais; restrito a ambientes não-produtivos |
| **DDL** (Data Definition Language · linguagem de definição de dados) | `CREATE`, `ALTER`, `DROP`; modificam estrutura, não dados |
| **DML** (Data Manipulation Language · linguagem de manipulação de dados) | `INSERT`, `UPDATE`, `DELETE`, `SELECT`; modificam ou leem dados |
| **EditorConfig** (padrão de configuração de editor) | Arquivo `.editorconfig` que uniformiza indentação e charset entre editores |
| **SQLFluff** (linter e formatter de SQL) | Ferramenta Python que aplica as regras de estilo automaticamente |
| **CI** (Continuous Integration · Integração Contínua) | Pipeline que valida lint e migrations a cada push |

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- [SQLFluff](./sqlfluff.md): linting e formatação SQL

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

Cada migration é um arquivo atômico com timestamp no nome, sem editar o que já foi executado.

```
migrations/
  20260419000000_create_football_teams.sql
  20260419000001_create_players.sql
  20260419120000_alter_football_teams_add_ticket_price.sql
```

Veja [Migrations](../conventions/advanced/migrations.md) para as convenções completas.
