# SQL

Convenções SQL focadas em legibilidade e manutenção. Os exemplos usam SQL Server como referência; diferenças com PostgreSQL são destacadas onde relevantes.

O banco de dados é um **store** — ele armazena e devolve dados. Regras de negócio, validações e orquestrações pertencem à aplicação. Procedures e functions têm espaço para otimizações de performance e relatórios, não para lógica de domínio.

## Seções

| Tópico                                    | Conceitos                                                          |
| ----------------------------------------- | ------------------------------------------------------------------ |
| [Formatting](conventions/formatting.md)               | Estilo vertical, indentação, JOIN, condições verticais             |
| [Naming](conventions/naming.md)                       | Inglês, plural/singular, qualificação, prefixos, constraints       |
| [CRUD](conventions/crud.md)                           | INSERT, SELECT, UPDATE, DELETE, soft delete, filtros, ordenação    |
| [Advanced](conventions/advanced.md)                   | CTEs, procedures, functions                                        |
| [Procedures](conventions/procedures.md)               | Temp tables, etapas nomeadas, queries complexas                    |
| [Performance](conventions/performance.md)             | SELECT *, índices, subquery correlacionada, FK sem índice, paginação |
| [Migrations](conventions/migrations.md)               | Naming YYYYMMDDHHMMSS, forward only, uma responsabilidade          |
| [Quick Reference](quick-reference.md)     | Nomenclatura, verbos, taboos, query estruturada                    |

## Princípios

| Princípio                                                                                    | Descrição                                                                   |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                            | Tabelas, colunas e objetos nomeados em inglês                               |
| [Escrita vertical](conventions/formatting.md#consulta-em-linha-única)                                    | Uma cláusula por linha — SELECT, FROM, JOIN, WHERE, ORDER BY                |
| [Baixa densidade visual](conventions/formatting.md#regra-de-3--exceção-inline)                           | Inline somente com ≤3 campos e ≤1 condição                                  |
| [Indentação consistente](conventions/formatting.md#colunas-sem-recuo)                                    | 2 espaços sob cada cláusula, blocos alinhados por nível                     |
| [Fluxo linear](conventions/formatting.md#consulta-em-linha-única)                                        | Leitura de cima pra baixo — filtros antes de JOINs, resultado no final      |
| [Nomes expressivos](conventions/naming.md#qualificação-explícita--sempre-tabelacoluna)                   | Aliases descritivos pelo domínio; nunca `t`, `c`, `x`                       |
| [Qualificação explícita](conventions/naming.md#qualificação-explícita--sempre-tabelacoluna)              | Sempre `Tabela.Coluna` — nunca colunas nuas                                 |
| [Consultas enxutas](conventions/performance.md#select-)                                                  | Sem `SELECT *`; trazer apenas as colunas necessárias                        |
| [Etapas explícitas](conventions/procedures.md#query-monolítica-vs-etapas-com-temp-tables)                | Queries complexas decompostas em passos nomeados com temp tables            |
| [Joins legíveis](conventions/formatting.md#join-com-on-simples)                                          | JOIN e ON em linhas separadas; ON complexo expandido                        |
| [Sem subqueries profundas](conventions/advanced.md#subquery-aninhada)                                    | Subqueries substituídas por CTEs nomeadas                                   |
| [Condições verticais](conventions/formatting.md#condições-verticais)                                     | Uma condição por linha, AND e OR ao final da linha                          |
| [CTE vs temp table](conventions/advanced.md#ctes-encadeadas)                                             | CTE para leitura simples; temp table (`#`) para reuso e performance         |
| [Filtros antecipados](conventions/crud.md#filtros-antecipados)                                           | WHERE na tabela principal antes dos JOINs                                   |
| [Sem valores mágicos](conventions/crud.md#parâmetros-nomeados--sem-valores-mágicos)                      | Parâmetros nomeados em vez de literais inline                               |
| [Ordenação explícita](conventions/crud.md#ordenação-explícita)                                           | ORDER BY sempre declarado                                                   |
| [Objetos nomeados](conventions/naming.md#prefixos-de-objetos)                                            | `SP_`, `FN_`, `IX_`, `VW_` — prefixo declara a intenção                    |
| [Constraints nomeadas](conventions/naming.md#constraints-nomeadas)                                       | `PK_`, `FK_`, `UQ_`, `CK_` — toda constraint tem nome explícito            |
| [FK com índice](conventions/performance.md#fk-sem-índice)                                                | FK sempre acompanhada de índice na coluna referenciadora                    |
| [Migrations incrementais](conventions/migrations.md#convenção-de-nomenclatura)                           | `YYYYMMDDHHMMSS_descricao.sql` — uma mudança por arquivo                    |
| [Forward only](conventions/migrations.md#somente-para-frente--forward-only)                              | Nunca editar migration existente; ajuste = nova migration                   |
