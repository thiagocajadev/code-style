# SQL

Convenções SQL focadas em legibilidade e manutenção. Os exemplos usam SQL Server como referência; diferenças com PostgreSQL são destacadas onde relevantes.

O banco de dados é um **store**: armazena e devolve dados. Regras de negócio, validações e orquestrações pertencem à aplicação. Procedures e functions têm espaço para otimizações de performance e relatórios, não para lógica de domínio.

## Fundamentos

| Tópico                                          | Conceitos                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [Formatting](conventions/formatting.md)         | Estilo vertical, indentação, JOIN, condições verticais             |
| [Naming](conventions/naming.md)                 | Inglês, plural/singular, qualificação, prefixos, constraints       |
| [CRUD](conventions/crud.md)                     | INSERT, SELECT, UPDATE, DELETE, soft delete, filtros, ordenação    |
| [Visual Density](conventions/visual-density.md) | CTEs encadeadas, etapas em procedures                              |

## Avançados

| Tópico                                                        | Conceitos                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Advanced](conventions/advanced/advanced.md)                  | CTEs, subqueries, functions                                         |
| [Procedures](conventions/advanced/procedures.md)              | Temp tables, etapas nomeadas, queries complexas                     |
| [Performance](conventions/advanced/performance.md)            | SELECT *, índices, subquery correlacionada, FK sem índice, paginação |
| [Migrations](conventions/advanced/migrations.md)              | Naming YYYYMMDDHHMMSS, forward only, uma responsabilidade           |
| [Quick Reference](quick-reference.md)                         | Nomenclatura, verbos, taboos, query estruturada                     |

## Princípios

**Legibilidade e nomes**: formatação, estilo visual e nomenclatura

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                                | Tabelas, colunas e objetos nomeados em inglês                               |
| [Escrita vertical](conventions/formatting.md#consulta-em-linha-única)                                        | Uma cláusula por linha: SELECT, FROM, JOIN, WHERE, ORDER BY                 |
| [Baixa densidade visual](conventions/formatting.md#regra-de-3-exceção-inline)                                | Inline somente com ≤3 campos e ≤1 condição                                  |
| [Indentação consistente](conventions/formatting.md#colunas-sem-recuo)                                        | 2 espaços sob cada cláusula, blocos alinhados por nível                     |
| [Nomes expressivos](conventions/naming.md#qualificação-explícita-sempre-tabelacoluna)                        | Aliases descritivos pelo domínio; nunca `t`, `c`, `x`                       |
| [Qualificação explícita](conventions/naming.md#qualificação-explícita-sempre-tabelacoluna)                   | Sempre `Tabela.Coluna`, nunca colunas nuas                                  |
| [Joins legíveis](conventions/formatting.md#join-com-on-simples)                                              | JOIN e ON em linhas separadas; ON complexo expandido                        |
| [Condições verticais](conventions/formatting.md#condições-verticais)                                         | Uma condição por linha, AND e OR ao final da linha                          |
| [Sem valores mágicos](conventions/crud.md#parâmetros-nomeados-sem-valores-mágicos)                           | Parâmetros nomeados em vez de literais inline                               |
| [Ordenação explícita](conventions/crud.md#ordenação-explícita)                                               | ORDER BY sempre declarado                                                   |
| [Objetos nomeados](conventions/naming.md#prefixos-de-objetos)                                                | `SP_`, `FN_`, `IX_`, `VW_`: prefixo declara a intenção                     |
| [Constraints nomeadas](conventions/naming.md#constraints-nomeadas)                                           | `PK_`, `FK_`, `UQ_`, `CK_`: toda constraint tem nome explícito             |

<br>

**Estrutura**: organização de queries complexas

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Fluxo linear](conventions/formatting.md#consulta-em-linha-única)                                            | Leitura de cima pra baixo: filtros antes de JOINs, resultado no final       |
| [Etapas explícitas](conventions/advanced/procedures.md#query-monolítica-vs-etapas-com-temp-tables)           | Queries complexas decompostas em passos nomeados com temp tables            |
| [Sem subqueries profundas](conventions/advanced/advanced.md#subquery-aninhada)                               | Subqueries substituídas por CTEs nomeadas                                   |
| [CTE vs temp table](conventions/advanced/advanced.md#ctes-encadeadas)                                        | CTE para leitura simples; temp table (`#`) para reuso e performance         |
| [Filtros antecipados](conventions/crud.md#filtros-antecipados)                                               | WHERE na tabela principal antes dos JOINs                                   |

<br>

**Performance e integridade**: otimizações e restrições

| Princípio                                                                                                    | Descrição                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Consultas enxutas](conventions/advanced/performance.md#select-)                                             | Sem `SELECT *`; trazer apenas as colunas necessárias                        |
| [FK com índice](conventions/advanced/performance.md#fk-sem-índice)                                           | FK sempre acompanhada de índice na coluna referenciadora                    |
| [Migrations incrementais](conventions/advanced/migrations.md#convenção-de-nomenclatura)                      | `YYYYMMDDHHMMSS_descricao.sql`: uma mudança por arquivo                     |
| [Forward only](conventions/advanced/migrations.md#somente-para-frente-forward-only)                         | Nunca editar migration existente; ajuste = nova migration                   |
