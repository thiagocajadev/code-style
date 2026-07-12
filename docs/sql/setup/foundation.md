# Fundação de um projeto SQL

> [!NOTE]
> Essa estrutura reflete como costumo organizar projetos SQL. Os exemplos usam SQL Server como referência; os princípios se aplicam a qualquer banco relacional.

A fundação de um projeto **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) responde três perguntas: onde ficam as migrations versionadas, como os scripts se organizam em pastas e quais convenções de nome valem para todo mundo. Deixe o editor e o formatter configurados antes que a primeira migration entre no repositório, porque depois disso cada arquivo novo carrega a indentação de quem o escreveu.

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

<a id="environment"></a>

## Preparar o editor antes do primeiro arquivo

Duas configurações combinadas evitam que o estilo do SQL dependa de quem digitou:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- [SQLFluff](./sqlfluff.md): linting e formatação SQL

<a id="file-structure"></a>

## Onde cada script mora

Cada pasta guarda um tipo de script, e a pasta já diz o que esperar do arquivo. O revisor que abre um pull request sabe se está olhando uma mudança de schema ou uma carga de dados, e o pipeline de CI consegue rodar só a pasta de migrations.

```
sql/
  migrations/          -- alterações de schema, ordem por timestamp
  procedures/          -- stored procedures
  functions/           -- functions
  seeds/               -- dados iniciais (apenas ambientes non-prod)
```

## Migrations

Cada migration é um arquivo que faz uma mudança e carrega um timestamp no nome. O arquivo que já rodou fica como está, e a próxima correção entra como arquivo novo.

```
migrations/
  20260419000000_create_football_teams.sql
  20260419000001_create_players.sql
  20260419120000_alter_football_teams_add_ticket_price.sql
```

Veja [Migrations](../conventions/advanced/migrations.md) para as convenções completas.
