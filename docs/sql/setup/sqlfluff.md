# SQLFluff

SQLFluff é o linter e formatter padrão para SQL. Enforça automaticamente as convenções de formatação deste guia.

## Instalação

SQLFluff é uma ferramenta Python. Escolha a opção que melhor se encaixa no seu ambiente:

```bash
# Python (recomendado para projetos com pipeline CI)
pip install sqlfluff

# Docker (sem Python instalado)
docker run --rm -v $(pwd):/sql sqlfluff/sqlfluff lint /sql

# VS Code
# Instale a extensão "SQLFluff" na marketplace (zero dependências locais)
```

## Arquivo pronto para uso

Copie `.sqlfluff` para a raiz do projeto e ajuste o dialeto conforme o banco.

```ini
[sqlfluff]
dialect = tsql
max_line_length = 120

[sqlfluff:indentation]
indent_unit = space
tab_space_size = 2
indented_joins = false
indented_ctes = false

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = upper

[sqlfluff:rules:capitalisation.identifiers]
extended_capitalisation_policy = pascal

[sqlfluff:rules:capitalisation.functions]
extended_capitalisation_policy = upper

[sqlfluff:rules:aliasing.table]
aliasing = explicit

[sqlfluff:rules:aliasing.column]
aliasing = explicit

[sqlfluff:rules:convention.select_trailing_commas]
select_clause_trailing_comma = forbid
```

## Dialeto por banco

| Banco | Dialeto |
| --- | --- |
| SQL Server | `tsql` |
| PostgreSQL | `postgres` |
| MySQL | `mysql` |
| SQLite | `sqlite` |

## Comandos

```bash
# verifica arquivos
sqlfluff lint queries/

# corrige automaticamente
sqlfluff fix queries/

# arquivo único com dialeto explícito
sqlfluff lint script.sql --dialect tsql
```

## Regras e convenções cobertas

| Regra SQLFluff | Convenção do guia |
| --- | --- |
| `capitalisation.keywords` | Keywords em UPPER (`SELECT`, `FROM`, `WHERE`) |
| `capitalisation.identifiers` | Identificadores em PascalCase |
| `capitalisation.functions` | Funções em UPPER (`COUNT`, `GETDATE`) |
| `aliasing.table` | Sem aliases de letra: nome completo da tabela |
| `aliasing.column` | Alias explícito com `AS` |
| `max_line_length = 120` | Sem linhas longas |
| `indented_joins = false` | JOIN alinhado com FROM, sem indentação extra |

> [!NOTE]
> SQLFluff não enforça todas as convenções do guia. Formatação vertical, ordem de cláusulas e CTEs precisam de revisão manual ou configuração adicional via rules personalizadas.
