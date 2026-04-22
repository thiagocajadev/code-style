# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.13.0] - 2026-04-22

### Added

- `docs/nosql/README.md`: índice da seção NoSQL — mapa de convenções, tabela de SGBD por caso de uso (80% → MongoDB + Redis; AWS → DynamoDB; escala → Cassandra; busca → Elasticsearch), conceitos fundamentais, cross-link para scripts
- `docs/nosql/quick-reference.md`: cheat-sheet tabular de dos/don'ts por SGBD (MongoDB, Redis, DynamoDB, Cassandra, Elasticsearch) + tabela de naming por contexto
- `docs/nosql/conventions/naming.md`: convenções de nomenclatura — collection/table (plural, snake_case/PascalCase por SGBD), fields (camelCase MongoDB, snake_case Cassandra/ES, PascalCase DynamoDB), Redis key namespace (`namespace:entity:id`), DynamoDB single-table design (`ENTITY#id`), index naming (`idx_`, `unq_`)
- `docs/nosql/conventions/crud.md`: padrões CRUD com BAD/GOOD — insertOne/insertMany, findOne/find com projeção, updateOne com `$set`, upsert com `$setOnInsert`, soft delete, purge; todos via repository pattern
- `docs/nosql/conventions/visual-density.md`: densidade visual para drivers JS — grupos semânticos, pipeline legível, estágios por propósito
- `docs/nosql/conventions/advanced/performance.md`: índices (quando criar/não criar), projeção obrigatória, N+1 com `$lookup`, TTL index + `expiresAt` no insert, checklist de investigação
- `docs/nosql/conventions/advanced/aggregation.md`: pipeline de agregação — ordem dos estágios, `$match` primeiro, `$group` com nomes de domínio, `$lookup` com pipeline interno, `$unwind` com `preserveNullAndEmptyArrays`
- `docs/nosql/sgbd/mongodb.md`: MongoDB 8.2 — conexão com pool singleton, insertOne/insertMany/bulkWrite, findOne/find/paginação, operadores de update, aggregation completo, createIndex (simples/composto/único/texto/TTL), diagnóstico com `explain()`
- `docs/nosql/sgbd/redis.md`: Redis 8.x — node-redis, Strings (SET/GET/INCR/MGET), cache-aside, Hashes (HSET/HGET/HGETALL/HMGET), Sorted Sets (ZADD/ZRANGE/ZREVRANK), Sets (SADD/SMEMBERS/SINTER/SDIFF), Lists, pub/sub com clientes separados, TTL, diagnóstico com redis-cli
- `docs/nosql/sgbd/dynamodb.md`: DynamoDB SDK v3 — `DynamoDBDocumentClient`, partition key design, single-table design (`ENTITY#id`), PutCommand/GetCommand/UpdateCommand/DeleteCommand/QueryCommand, GSI para access patterns, tabela de anti-padrões (Scan, hot spot, FilterExpression sem GSI)
- `docs/nosql/sgbd/cassandra.md`: Cassandra 5.x — keyspace, schema CQL com partition+clustering key, `prepare: true` obrigatório, consistency levels (LOCAL_QUORUM padrão), SELECT com LIMIT, UPDATE com IF EXISTS, TTL na inserção, batch para consistência entre tabelas, tabela de anti-padrões
- `docs/nosql/sgbd/elasticsearch.md`: Elasticsearch 8.x — mapping (text vs keyword), index/bulk, search (match/term/bool/range), aggregations com `size: 0`, update/deleteByQuery, tabela de anti-padrões (match em keyword, wildcard leading, aggregation em text)
- `docs/nosql/scripts/mongodb/` — 5 scripts JS: 01-insert (insertOne/insertMany/bulkWrite), 02-find (findOne/find/paginação/text search), 03-update ($set/$inc/upsert/updateMany), 04-delete (soft delete/purge), 05-aggregation (top scorers/$lookup/$group)
- `docs/nosql/scripts/redis/` — 4 scripts JS: 01-strings (cache-aside/invalidação/INCR/MGET), 02-hashes (HSET/HGET/HGETALL/HMGET/HINCRBY), 03-sets (SADD/SINTER/SDIFF/SCARD), 04-sorted-sets (leaderboard/standings/ZRANGE/ZRANK)

### Fixed

- `docs/shared/platform/database.md`: cross-link para `docs/nosql/` na seção "Consultas NoSQL"
- `README.md`: badge MongoDB atualizado (8.2 → `docs/nosql/`); badge Redis adicionado (8.x); NoSQL adicionado na tabela de Linguagens

## [1.12.0] - 2026-04-23

### Added

- `docs/sql/conventions/advanced/batch.md`: operações em lote — Batch INSERT multi-row, DELETE/UPDATE em lotes com TOP + WHILE + `@@ROWCOUNT`, staging table (load bruto → validar em etapas → inserir apenas válidos)
- `docs/sql/sgbd/sql-server.md`: seção `## Operações em Lote` — `BULK INSERT` com BATCHSIZE e TABLOCK; SQL Server Agent com `sp_add_job`, `sp_add_jobstep`, `sp_add_schedule`, `sp_add_jobserver`
- `docs/sql/sgbd/postgres.md`: seção `## Operações em Lote` — `COPY` (servidor) e `\copy` (cliente psql); `pg_cron` com `cron.schedule`, `cron.job`, `cron.unschedule`
- `docs/sql/sgbd/sql-server.md`: seção `## Diagnóstico` — SET STATISTICS IO/TIME, Query Store (`sys.dm_exec_query_stats` + `sys.dm_exec_sql_text`), conexões ativas (`sys.sysprocesses`)
- `docs/sql/sgbd/postgres.md`: seção `## Diagnóstico` — slow query log (`postgresql.conf`), EXPLAIN / EXPLAIN ANALYZE, `pg_stat_activity` (conexões e queries lentas/locks)
- `docs/shared/platform/etl-bi.md`: guia ETL e BI — OLTP vs OLAP, pipeline de dados em camadas, extração (full load / incremental / CDC), ETL vs ELT, modelagem dimensional (star/snowflake schema, fact/dimension tables, grain), SCD Tipo 1/2/3, BI e relatórios, pre-agregação, referência rápida

### Fixed

- `docs/shared/platform/database.md`: engine-specific removido (EXPLAIN syntax, SET STATISTICS, `pg_stat_activity`, `sys.dm_exec_query_stats`, `sys.sysprocesses`, `postgresql.conf`) — substituídos por cross-links para `sgbd/`; BAD/GOOD SQL em "Boas práticas de query" convertidos em cross-link para `sql/performance.md`; seção `## Operações em Lote` conceitual adicionada (chunk size, idempotência, padrões) com 3 conceitos novos (ETL, staging table, chunk)
- `docs/sql/conventions/advanced/performance.md`: seção `## CAST e conversão de tipo em colunas` adicionada — 4 BAD/GOOD: CAST explícito na coluna, conversão implícita por tipo incompatível (VARCHAR/NVARCHAR), CAST em condição de JOIN, data armazenada como VARCHAR
- `docs/sql/README.md`: link para `batch.md` adicionado na tabela Avançados
- `README.md`: `ETL e BI` adicionado na tabela Plataforma; descrição de `Database` atualizada com operações em lote

## [1.11.0] - 2026-04-22

### Added

- `docs/sql/sgbd/sql-server.md`: guia SQL Server 2025 — tipos de dados, UUID v7, stored procedures com TRY/CATCH, transações, OPPO (Optional Parameter Plan Optimization), RegEx nativo, JSON nativo, vector search (DiskANN)
- `docs/sql/sgbd/postgres.md`: guia PostgreSQL 18 — tipos, UUID v7 nativo (`uuidv7()`), `GENERATED ALWAYS AS IDENTITY`, `RETURNING` com `OLD/NEW`, CTEs em DML, JSONB + índice GIN, índice parcial, window functions, `LISTEN/NOTIFY`, AIO, virtual generated columns, temporal constraints
- `docs/sql/sgbd/sqlite.md`: guia SQLite 3.53 — type affinity, WAL mode, rowid, FTS5, JSON nativo (`json_array_insert`), `ALTER TABLE ADD/DROP CONSTRAINT` (3.53+), transações `IMMEDIATE`, PRAGMAs recomendados
- `docs/sql/README.md`: seção `## SGBD` com tabela linkando SQL Server, PostgreSQL e SQLite

### Fixed

- `docs/sql/conventions/visual-density.md`: Good examples de procedure T-SQL e PostgreSQL com colunas qualificadas (`FootballTeams.`); CTE Good com aliases explícitos (`Players.Id AS PlayerId`); AND ao final da linha em "Etapas em procedures" (Bad e Good)
- `docs/sql/conventions/advanced/advanced.md`: Good examples de procedure SQL Server e function PostgreSQL com colunas qualificadas; CTE "duas CTEs" com aliases explícitos
- `docs/sql/conventions/advanced/null-safety.md`: reescrito — PascalCase SQL Server como primary; `SELECT *` removido de todos os Good; aliases de letra (`o`, `c`, `u`) eliminados; `OR`/`AND` ao final da linha; exemplos PostgreSQL marcados explicitamente

## [1.10.0] - 2026-04-22

### Added

- `docs/csharp/frameworks/blazor.md`: guia Blazor .NET 10 — render modes (Static SSR, Interactive Server, WebAssembly, Auto), componentes com computed properties, EventCallback filho→pai, `[PersistentState]` sem chamada duplicada, EditForm com DataAnnotationsValidator, roteamento tipado com `@page`, JS Interop em `OnAfterRenderAsync`
- `docs/csharp/frameworks/razor-mvc.md`: guia ASP.NET Core MVC e Razor Pages .NET 10 — PageModel com `OnGet`/`OnPost`, `[BindProperty]`, Tag Helpers (`asp-for`, `asp-validation-for`), controller thin com boundary `Result<T>` → `IActionResult`, ViewModel sem exposição de entidade, layouts e partial views
- `docs/csharp/README.md`: seção `## Frameworks` com tabela linkando Blazor e Razor Pages/MVC

## [1.9.0] - 2026-04-22

### Added

- `docs/python/frameworks/reflex.md`: guia Reflex 0.8.28 — State, Vars tipadas, Event Handlers (público vs `_` privado), Computed Vars com `@rx.var`, Components sem I/O inline; nota de compatibilidade Python 3.14 (Pydantic v1 + operador `~`); estrutura de projeto
- `docs/python/frameworks/fastapi.md`: guia FastAPI 0.136.0 — schemas separados (Input/Response), Path Operations finas, Dependency Injection via `Depends()`, async sem bloqueio do event loop com httpx
- `docs/python/frameworks/htmx.md`: guia HTMX 2.0.10 integrado com FastAPI e Jinja2 — respostas parciais (fragmentos vs página completa), hx-target e hx-swap intencionais, out-of-band swaps, estados de loading com hx-indicator
- `docs/python/README.md`: seção `## Frameworks` com tabela linkando FastAPI, HTMX e Reflex

## [1.8.4] - 2026-04-22

### Fixed

- `docs/python/conventions/variables.md`: t-string SQL vertical sem `SELECT *`; seção `pathlib` migrada de setup — stdlib, não configuração de projeto
- `docs/python/conventions/visual-density.md`: exemplo declaração+guarda expandido com múltiplos pares para contraste legível entre Bad e Good
- `docs/python/conventions/control-flow.md`: match/case estrutural com domínio de negócio (`order_placed`, `payment_received`) — sem variáveis genéricas `x`/`y`
- `docs/python/setup/project-foundation.md`: ruff select comentado com nomes dos rule sets; `app.py` removido (apenas `main.py`); Configuração centralizada movida antes de Entry point; Bad example em Módulos por domínio; estrutura de arquivos com `pyproject.toml`, `.editorconfig`, `.env.example`, `scripts/`; pathlib removido
- `docs/python/quick-reference.md`: Bad/Good com `<details>` em type hints, strings e destructuring; bare return no Good de destructuring

## [1.8.3] - 2026-04-21

### Fixed

- `docs/shared/architecture/patterns.md`: 8 padrões GoF adicionados com seção completa (Singleton, Adapter, Facade, Proxy, Chain of Responsibility, Command, State, Template Method); 9 padrões especializados em tabela compacta (Abstract Factory, Prototype, Bridge, Composite, Flyweight, Iterator, Mediator, Memento, Visitor); Referência rápida movida para o topo (após Conceitos fundamentais), dividida em duas tabelas com anchors; Conceitos fundamentais expandido (Handler, Middleware); writing-soul aplicado (em dash, voz passiva, tradução write side)

## [1.8.2] - 2026-04-21

### Fixed

- `README.md`: badge HTML corrigido para inglês ("Semantic & Accessible")
- `docs/shared/standards/testing.md`: seção `## Complexidade ciclomática` adicionada — faixas 1–10/11–20/21–50/>50, relação com número mínimo de casos de teste, e ações de refatoração; entrada adicionada em `## Conceitos fundamentais`

## [1.8.1] - 2026-04-21

### Fixed

- `docs/typescript/frameworks/react-nextjs.md`: Fluxo de Operação reestruturado por cenário de uso (Next.js como frontend vs fullstack); webhook handler adicionado (HMAC, idempotência, enqueue); estrutura de pastas com slice vertical (`features/`); coluna Domínio nas tabelas; writing soul (em dashes removidos)
- `docs/typescript/frameworks/angular.md`: Fluxo de Operação com fluxo linear, tabela passo a passo e coluna Domínio (features/ vs core/); estrutura de pastas com slice vertical; writing soul (em dashes removidos)

## [1.8.0] - 2026-04-21

### Added

- `docs/typescript/frameworks/react-nextjs.md`: guia React 19.2 + Next.js 16 — RSC vs RCC, Props tipadas, hooks com pipeline Component→Service→apiClient, proxy.ts guards, formulários Zod+Server Action+useActionState, API Routes (GET/POST), Caching (`use cache`, `cacheLife`, `updateTag`); exemplos dogfoodam code style completo
- `docs/typescript/frameworks/angular.md`: guia Angular 21 Standalone — Signals, Smart/Dumb Components, Services com `inject()`, `CanActivateFn` guards, `ResolveFn` loaders, formulários reativos tipados com `FormBuilder`, HTTP Interceptors (auth + error handling); exemplos dogfoodam code style completo
- `docs/typescript/README.md`: seção `## Frameworks` com links para react-nextjs.md e angular.md

## [1.7.1] - 2026-04-21

### Fixed

- `docs/shared/platform/database.md`: exemplos NoSQL adicionados (Consultas NoSQL — projeção, filtro, N+1/$lookup com JS code style); exemplos SQL corrigidos para o formato vertical do guia (SELECT/FROM/WHERE/JOIN com recuo, AND ao final da linha, nomes de tabela qualificados); queries de diagnóstico (slow query, connection pool, locks) no mesmo padrão; `db.` → `database.`; `qs`/`qt` → `queryStats`/`queryText`; SUBSTRING verboso simplificado para `queryText.text`
- `docs/shared/platform/integrations.md`: novo arquivo — GraphQL, TOML, YAML (modernos) + XML/SOAP, SPED, CNAB, ZPL, RS-232 (legado); exemplos em JavaScript com code style completo; nomes internacionalizados (`companyRegistrationNumber`, `periodStart`, `taxId` → `companyRegistrationNumber`); RTS/CTS expandidos e traduzidos

## [1.7.0] - 2026-04-21

### Added

- `docs/shared/process/methodologies.md`: DDD, BDD, TDD, XGH, XP, desenvolvimento intuitivo e orgânico; estilos arquiteturais Monolito, Microsserviços e Monolito Modular com posição opinionada sobre o padrão recomendado em 2026
- `docs/shared/architecture/patterns.md`: CQRS (separado explicitamente de CQS), AI-Driven Development e SDD (Spec-Driven Development) com tabela de referência rápida atualizada
- `docs/shared/platform/performance.md`: seção Big O com tabela de notações e 4 armadilhas comuns (loop aninhado, N+1, filter+map, sort) em `<details>` com exemplos no code style do projeto
- `docs/shared/architecture/scaling.md`: escala vertical e horizontal, Load Balancing (algoritmos, health checks, SSL termination), API Gateway, estratégias de cache/CDN/read replicas e seção anti-overengineering com sequência de escala recomendada
- `docs/shared/platform/database.md`: SQL vs NoSQL (4 modelos), tuning de queries (índices, boas práticas em `<details>`), plano de execução (`EXPLAIN` PostgreSQL e SQL Server), troubleshooting de gargalos (slow query log, N+1, pool exhaustion, locks/deadlocks)
- `REFERENCES.md`: links centralizados na raiz, organizados em 10 grupos semânticos; `README.md` aponta em uma linha para o arquivo

## [1.6.2] - 2026-04-21

### Fixed

- `docs/shared/`: seção `## Conceitos fundamentais` adicionada em 18 arquivos (architecture×7, platform×5, standards×3, process×3); tabela `| Conceito | O que é |` logo após a introdução, com bold nos termos e tradução PT entre parênteses; `PR (Pull Request)` traduzido como "Pedido de Integração" em git.md; `CI/CD` expandido para 3 entradas distintas (CI, Entrega Contínua, Deploy Contínuo) na tabela de processos

## [1.6.1] - 2026-04-21

### Fixed

- Padrão unificado de introdução de termos e siglas: `**SIGLA** (Full English Name, tradução PT)` com bold no termo, aplicado em 19 arquivos `docs/` (shared + vbnet); regras atualizadas em `tasks.md` e `writing-soul.md`

## [1.6.0] - 2026-04-21

### Added

- `docs/shared/architecture/frontend-flow.md`: routing (guard de rota, loaders, layouts aninhados) e forms (schema como contrato, erros por campo/formulário, in-flight, optimistic updates) — agnóstico de framework, baseado em padrões consolidados de 2026
- `docs/shared/architecture/backend-flow.md`: background job (outbox pattern, idempotência, entrega de resultado), webhook (validação HMAC, idempotência por chave externa, roteamento de eventos) e event-driven (DLQ, at-least-once, envelope CloudEvents, outbox como ponte)

## [1.5.0] - 2026-04-21

### Added

- `docs/vbnet/setup/legacy-desktop.md`: setup enxuto para desktop Windows Forms — `App.config`, módulo `DataAccess` thin, form → banco → resultado, fail-fast de connection string ausente
- `docs/vbnet/scripts/`: 5 scripts de referência — `variables.vb`, `control-flow.vb`, `methods.vb`, `async.vb`, `error-handling.vb`
- `docs/vbnet/scripts/test/`: 2 test scripts — `testing.mstest.vb`, `testing.nunit.vb`
- `docs/typescript/scripts/`: 6 scripts de referência — `variables.ts`, `control-flow.ts`, `functions.ts`, `async.ts`, `error-handling.ts`, `types.ts`
- `docs/typescript/scripts/test/`: 2 test scripts — `testing.jest.ts`, `testing.vitest.ts` (com `// @ts-nocheck` para suprimir alarmes do Language Server)
- `docs/css/scripts/`: 3 scripts de referência — `naming.css`, `variables.css`, `layout.css`

### Changed

- `docs/shared/`: fluxos lineares adicionados e padronizados em 6 arquivos (security, governance, cloud, testing, null-safety, configuration) — flows `→` horizontais para processos curtos, `↓` vertical com anotações para pipelines detalhados
- `docs/shared/architecture/component-architecture.md`: reescrito com visão geral linear no topo, fluxo de decisão de estado, direção de import visual, traduções de termos técnicos na primeira ocorrência, link `.ai` interno removido e substituído por explicação inline
- `docs/shared/platform/feature-flags.md`: seção "Estrutura do condicional" com blocos de código separados por padrão, realce `js`, explicações acima de cada bloco; traduções de termos técnicos na primeira ocorrência; link `ci-cd.md` corrigido para `../process/ci-cd.md`
- `.ai/backlog/tasks.md`: Standing Directive formalizada para tradução de termos técnicos em inglês na primeira ocorrência; task adicionada para revisar 10 docs shared restantes
- `docs/shared/`: tradução de termos técnicos em inglês na primeira ocorrência aplicada em 9 arquivos (observability, ui-ux, editorconfig, operation-flow, principles, architecture, patterns, ci-cd, git) — ~50 termos cobertos incluindo `output`, `retry`, `fallback`, `stack trace`, `header`, `runtime`, `APM`, `viewport`, `tokens`, `spinner`, `skeleton`, `Toast`, `caller`, `pipeline`, `timeout`, `hooks`, `stakeholders`, entre outros
- `docs/shared/platform/performance.md`: diagramas linearizados (esquerda para a direita); seções Webhook, Polling e WebSocket adicionadas; termos traduzidos na primeira ocorrência (cache, endpoint, Offset/limit, CPU, miss, query, join, full scan, Lazy loading, Connection pooling, workers, handshake, viewport)
- `docs/shared/platform/messaging.md`: novo — broker, queue vs pub/sub, garantias de entrega (at-most-once, at-least-once, exactly-once), idempotência, DLQ, backpressure e ferramentas
- `README.md`: tabela Plataforma atualizada com Messaging; descrição de Performance expandida
- `.ai/backlog/tasks.md`: Standing Directive de fluxos lineares (esquerda para a direita) adicionada

## [1.4.2] - 2026-04-21

### Added

- `docs/shared/architecture/operation-flow.md`: pipeline conceitual backend e frontend — pure nas bordas, I/O no meio, Result<T> como contrato, CQS separando Save de Read
- `docs/shared/process/governance.md`: seções "Processo auditável" (pipeline Spec→Observação com tabela de auditabilidade), "Checklists como ferramenta de qualidade" (tabela por etapa) e convicção "Processo, não pessoa"

### Changed

- `docs/shared/`: reorganizado em 4 subpastas — `architecture/` (principles, architecture, component-architecture, patterns, operation-flow), `platform/` (security, configuration, feature-flags, performance, cloud), `process/` (governance, git, ci-cd), `standards/` (testing, observability, null-safety, visual-density, editorconfig, ui-ux). Todas as referências cruzadas atualizadas
- `README.md`: seções Linguagens e Conceitos Compartilhados em `<details>`, shared dividido em 4 tabelas temáticas (Processo, Arquitetura, Qualidade, Plataforma) com ordem semântica
- `docs/shared/process/ci-cd.md`: overlap com git.md removido (TBD); fluxos lineares adicionados em Pipeline, Ambientes, Pós-deploy, Deploy e Release, Pre-commit, Fix Forward e Rollback; seção Ambientes com SVG e tabela de responsabilidades; tabelas de troubleshoot em Fix Forward e Rollback
- `docs/shared/process/git.md`: seções Deploy e Release, Incidentes e Correções e Pipeline de Desenvolvimento removidas (delegadas a ci-cd.md com referência)
- `docs/shared/standards/null-safety.md`: exemplos reescritos em JS puro seguindo code style — sem TypeScript, sem C#, sem `SELECT *`, sem `item`/`sum` banidos, explaining return em todos os Good

## [1.4.1] - 2026-04-21

### Added

- `docs/csharp/setup/vertical-slice.md`: guia completo de Vertical Slice Architecture — IModule com auto-discovery via reflexão, Program.cs com AddDefaults/UseDefaults, pipeline de 6 steps invariantes (Sanitize → Validate → BusinessRules → Save → Read → FilterOutput), ValidationFilter, TypedResults aliases, todos os arquivos da fatia documentados com exemplos completos, testes AAA e anti-patterns

### Changed

- `docs/csharp/conventions/advanced/api-design.md`: 3 seções novas — [AsParameters] context records, TypedResults aliases (global using por feature), CQS void Save + IOrderReader separado; fixes de Explaining Returns em exemplos Good
- `docs/csharp/conventions/advanced/error-handling.md`: `implicit operator` adicionado a `Result<T>` com Bad/Good mostrando happy path sem cerimônia (`return request` em vez de `Result<T>.Success(request)`)
- `docs/csharp/README.md`: entrada Vertical Slice adicionada na tabela de Setup

## [1.4.0] - 2026-04-20

### Added

- `.ai/tooling/scripts/audit-docs.mjs` (gitignored, local tooling): linter que varre `docs/` e reporta violações dos princípios do guia em exemplos `✅ Good`. Ruleset v1: banned-abbreviations (req/res/ctx/…), no-logic-in-return, db-direct-access (JS/TS), minimal-api-untyped-results (C#), density-double-blank, section-banners. Exemplos `❌ Bad` são isentos. Relatório em `.ai/backlog/audit-report.md`. Scripts: `npm run audit:docs` e `npm run test:docs`
- `docs/csharp/conventions/advanced/api-design.md`: seção **TypedResults vs Results** — diferença de tipagem, quando usar qual, assinatura rica com `Results<Ok<T>, NotFound>`, e Bad/Good de Location header sem lógica no return

### Changed

- **Wave 1 — TypedResults migration**: 17 ocorrências de `Results.*` em Good examples migradas para `TypedResults.*` (api-design, error-handling, control-flow, quick-reference, setup/security em C#; shared/null-safety)
- **Wave 2 — Repository idiom**: 23 ocorrências de `db.*` em Good examples JS/TS substituídas por `userRepository.*`, `orderRepository.*`, `productRepository.*` conforme o domínio (error-handling, null-safety, validation, functions, visual-density, narrowing, async, shared/null-safety)
- **Wave 3 — Abreviações banidas**: 17 ocorrências de `req`/`res`/`ctx` em Good examples substituídas por `request`/`response`/`httpContext` (csharp/observability, javascript/visual-density + setup, typescript/observability + visual-density + validation)
- `docs/csharp/conventions/advanced/api-design.md`: Bad examples anotados com comentário inicial explicitando o conjunto de anti-patterns concentrados (DbContext direto, lógica inline, sem TypedResults, interpolação no return)

**Resultado**: 74 → 0 violações em 712 blocos Good / 136 arquivos. Audit clean.

## [1.3.0] - 2026-04-20

### Added

- `docs/shared/component-architecture.md`: composição sobre herança, container vs presentational, estado (lifting/prop drilling/context/store), memoization, fronteiras de módulo (feature-based vs layer-based), regras de import — agnóstico de framework
- `docs/shared/configuration.md`: config vs secret, precedência em camadas (código → arquivo → env → CLI → secrets manager), layering base+override, tipagem, fail-fast no startup, mudanças em runtime
- `docs/shared/feature-flags.md`: toggle por propósito (release/experiment/ops/permission), rollout gradual, dark launch (shadow/silent metrics/write-to-shadow), kill switch, avaliação build-time/startup/runtime, estrutura no código, dívida, testes
- `docs/csharp/conventions/types.md`: interface vs abstract, sealed default, record, Nullable Reference Types, pattern matching, generics, evitar dynamic
- `docs/vbnet/conventions/types.md`: Interface vs MustInherit, NotInheritable default, Structure vs Class, Nullable(Of T), TryCast, generics, evitar Object
- `docs/vbnet/conventions/advanced/api-design.md`: Web API 2, controller thin, handler pattern, envelope, async sem deadlock
- `docs/vbnet/conventions/advanced/dependency-injection.md`: Unity IoC, constructor injection, lifetimes, assembly scanning
- Linha de escopo em blockquote no topo de 65 arquivos: 18 em `docs/shared/` (`Escopo: transversal`) e 47 em `docs/<lang>/conventions/advanced/` (`Escopo: <Lang>` com cross-link para shared/ quando há correspondência)

### Changed

- `docs/csharp/setup/security.md`, `docs/javascript/setup/security.md`, `docs/vbnet/setup/security.md`: slim para apenas especificidades do ecossistema (dotnet user-secrets, dotenv, Web.config transforms, Options pattern, policies, `<Authorize>`, httpCookies); princípios gerais delegados a `shared/security.md` via link
- `docs/javascript/quick-reference.md`, `docs/typescript/quick-reference.md`, `docs/html/quick-reference.md`, `docs/css/quick-reference.md`, `docs/csharp/quick-reference.md`, `docs/vbnet/quick-reference.md`, `docs/sql/quick-reference.md`: convertidos em cheat-sheet tabular denso (~60 linhas), blocos `<details>` removidos, snippets essenciais preservados quando adicionam valor não capturado em tabela
- `README.md`: tabela Shared ganhou Component Architecture, Configuration e Feature Flags; alinhamento de colunas regularizado
- 11 skills em `.ai/` convertidos em stubs redirectores (api-design, ci-cd, cloud, data-access, observability, security, sql-style, testing, ui-ux, idioms/csharp/patterns, idioms/javascript/patterns); `code-style.md` ganhou nota de hierarquia SSOT — canônico agora é `docs/`

## [1.2.0] - 2026-04-20

### Added

- `docs/shared/governance.md`: pensamento de staff engineer, SDLC, onboarding, complexidade em camadas, naming como governança, ADRs, code review como governança
- `docs/shared/architecture.md`: Vertical Slice, MVC, Legacy, XP e XGH — cada padrão com estrutura de pastas, tabela de navegação e "Como escolher"
- `docs/shared/patterns.md`: Result, Factory, Repository, Strategy, Observer, Builder, Decorator — pseudocódigo, quando usar e tabela de referência rápida
- `docs/shared/performance.md`: paginação offset/cursor, cache TTL e estratégias, filas, lazy loading, N+1, índices e connection pool
- `docs/shared/testing.md`: AAA, no logic no assert, nomenclatura de testes, isolamento, unitário vs integração — links por linguagem
- `docs/shared/ci-cd.md`: pipeline por estágios, deploy vs release, feature flags, Trunk-Based Development, pre-commit, fix forward vs rollback
- `docs/shared/cloud.md`: serviços gerenciados vs self-hosted, least privilege/IAM, containers (multi-stage, sem root, health check), limites de recursos, ambientes
- `docs/shared/ui-ux.md`: escala de espaçamento 4px, hierarquia tipográfica, variáveis semânticas para temas claro/escuro, acessibilidade WCAG 2.1 AA, estados de interface

### Fixed

- `docs/shared/security.md`: opener e regra de segredos reescritos — binary contrast removido (writing soul)
- `docs/shared/null-safety.md`: binary contrasts em prosa e em dashes em labels e comentários removidos (writing soul)
- `README.md`: seção "O que eu penso sobre código" adicionada; tabela Shared expandida com todos os novos links

## [1.1.0] - 2026-04-20

### Added

- `docs/typescript/conventions/advanced/`: performance, observability, testing, validation, dates — tópicos avançados com ângulo TypeScript-específico (branded types, `z.infer`, `satisfies`, mocks tipados, logger interface)
- `docs/typescript/conventions/`: control-flow e visual-density — narrowing como guard, discriminated unions, exhaustiveness check, densidade visual com anotações de tipo
- `docs/vbnet/conventions/advanced/performance.md`: `StringBuilder`, boxing, `HashSet`, `For` vs `For Each` em hot paths
- `docs/vbnet/conventions/advanced/null-safety.md`: `Is Nothing`, `Nullable(Of T)`, `If()` null-coalescing, guard em construtor
- `docs/css/conventions/performance.md`: reflow, `transform`/`opacity`, `will-change`, `contain`, especificidade

### Fixed

- `docs/javascript/conventions/advanced/dates.md`: Temporal API atualizada de ES2025 Stage 4 para ES2026; nota de suporte de browser com Chrome 144 e Firefox 139
- `docs/vbnet/README.md`: versão VB.NET corrigida de 14 para 16 (par correto com .NET Framework 4.8)

## [1.0.1] - 2026-04-20

### Changed

- `README.md`: badge de versão dinâmica via `shields.io/github/package-json/v` sincronizado com `package.json`
- `docs/typescript/`: atualização para TypeScript 6 — badge 6.x, tsconfig com `target: ES2025`, `lib: ["ES2025"]`, campo `types` explícito, depreciação de `baseUrl` e padrões `ES6`/`commonjs` documentada

## [1.0.0] - 2026-04-20

### Added

- `docs/shared/security.md`: guia conceitual de segurança agnóstico de linguagem (segredos, configuração em camadas, frontend, validação, autenticação vs autorização, cookies)
- `README.md`: seção Changelog e entrada de Security na tabela Shared
- Setup de bumpp para gerenciamento de versão e changelog
