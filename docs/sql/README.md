# SQL

Convenções de SQL voltadas a quem vai ler a query depois. Os exemplos usam SQL Server como referência, e as diferenças do PostgreSQL aparecem sinalizadas onde importam.

Uma linha divide este guia: o banco guarda e devolve dados, e a aplicação decide o que os dados significam. As regras de negócio, as validações e a orquestração ficam na aplicação. As procedures e as functions ficam reservadas ao que só o banco faz bem, que é otimizar acesso e montar relatório.

## Fundamentos

| Tópico                                                | Conceitos                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| [Formatação](conventions/formatting.md)               | Estilo vertical, indentação, JOIN, condições verticais             |
| [Nomes](conventions/naming.md)                        | Inglês, plural/singular, qualificação, prefixos, constraints       |
| [CRUD](conventions/crud.md)                           | INSERT, SELECT, UPDATE, DELETE, soft delete, filtros, ordenação    |
| [Densidade visual](conventions/visual-density.md)     | CTEs encadeadas, etapas em procedures                              |

## Avançados

| Tópico                                                        | Conceitos                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Recursos avançados](conventions/advanced/advanced.md)        | CTEs, subqueries, functions                                         |
| [Procedures](conventions/advanced/procedures.md)              | Temp tables, etapas nomeadas, queries complexas                     |
| [Performance](conventions/advanced/performance.md)            | SELECT *, índices, subquery correlacionada, FK sem índice, paginação |
| [Segurança contra nulos](conventions/advanced/null-safety.md) | IS NULL, COALESCE, NULLIF, NOT NULL + DEFAULT, NULL em JOIN          |
| [Migrations](conventions/advanced/migrations.md)              | Naming YYYYMMDDHHMMSS, forward only, uma responsabilidade           |
| [Operações em lote](conventions/advanced/batch.md)            | Batch INSERT, DELETE/UPDATE em lotes com TOP + WHILE, staging table |
| [Modelagem de entidades](conventions/advanced/entity-modeling.md) | `DOMAIN` type para IDs, embedded columns vs satellite, ENUM/CHECK, FK por id, RLS |
| [Referência rápida](quick-reference.md)                       | Nomenclatura, verbos, taboos, query estruturada                     |

## SGBD

Idioms e recursos específicos de cada banco de dados.

| SGBD | Versão | Conceitos |
| --- | --- | --- |
| [SQL Server](sgbd/sql-server.md) | 2025 | T-SQL, tipos, procedures, TRY/CATCH, OPPO, RegEx, JSON nativo, vector search |
| [PostgreSQL](sgbd/postgres.md) | 18 | PL/pgSQL, RETURNING, JSONB, UUID v7, CTEs em DML, window functions, LISTEN/NOTIFY |
| [SQLite](sgbd/sqlite.md) | 3.53 | Type affinity, WAL, rowid, FTS5, JSON, ALTER TABLE, PRAGMAs |

## Princípios

**Legibilidade e nomes**: formatação, estilo visual e nomenclatura

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#portuguese-names)                                                | Tabelas, colunas e objetos nomeados em inglês                               |
| [Escrita vertical](conventions/formatting.md#single-line-query)                                        | Uma cláusula por linha: SELECT, FROM, JOIN, WHERE, ORDER BY                 |
| [Baixa densidade visual](conventions/formatting.md#rule-of-three-inline)                                | Inline somente com ≤3 campos e ≤1 condição                                  |
| [Indentação consistente](conventions/formatting.md#indentation)                                        | 2 espaços sob cada cláusula, blocos alinhados por nível                     |
| [Nomes expressivos](conventions/naming.md#explicit-qualification)                        | Aliases descritivos pelo domínio; nunca `t`, `c`, `x`                       |
| [Qualificação explícita](conventions/naming.md#explicit-qualification)                   | Sempre `Tabela.Coluna`, nunca colunas nuas                                  |
| [Joins legíveis](conventions/formatting.md#join-simple-on)                                              | JOIN e ON em linhas separadas; ON complexo expandido                        |
| [Condições verticais](conventions/formatting.md#vertical-conditions)                                         | Uma condição por linha, AND e OR ao final da linha                          |
| [Sem valores mágicos](conventions/crud.md#named-parameters)                           | Parâmetros nomeados em vez de literais inline                               |
| [Ordenação explícita](conventions/crud.md#explicit-ordering)                                               | ORDER BY sempre declarado                                                   |
| [Objetos nomeados](conventions/naming.md#object-prefixes)                                                | `SP_`, `FN_`, `IX_`, `VW_`: prefixo declara a intenção                     |
| [Constraints nomeadas](conventions/naming.md#named-constraints)                                           | `PK_`, `FK_`, `UQ_`, `CK_`: toda constraint tem nome explícito             |

<br>

**Estrutura**: organização de queries complexas

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Fluxo linear](conventions/formatting.md#single-line-query)                                            | Leitura de cima para baixo: filtros antes de JOINs, resultado no final      |
| [Etapas explícitas](conventions/advanced/procedures.md#monolithic-query-vs-temp-tables)           | Queries complexas decompostas em passos nomeados com temp tables            |
| [Sem subqueries profundas](conventions/advanced/advanced.md#nested-subquery)                               | Subqueries substituídas por CTEs nomeadas                                   |
| [CTE vs temp table](conventions/advanced/advanced.md#chained-ctes)                                        | CTE para leitura simples; temp table (`#`) para reuso e performance         |
| [Filtros antecipados](conventions/crud.md#early-filters)                                               | WHERE na tabela principal antes dos JOINs                                   |

<br>

**Performance e integridade**: otimizações e restrições

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Consultas enxutas](conventions/advanced/performance.md#select-star)                                             | Sem `SELECT *`; trazer apenas as colunas necessárias                        |
| [FK com índice](conventions/advanced/performance.md#fk-without-index)                                           | FK sempre acompanhada de índice na coluna referenciadora                    |
| [Migrations incrementais](conventions/advanced/migrations.md#naming-convention)                      | `YYYYMMDDHHMMSS_descricao.sql`: uma mudança por arquivo                     |
| [Forward only](conventions/advanced/migrations.md#forward-only)                         | Nunca editar migration existente; ajuste = nova migration                   |
