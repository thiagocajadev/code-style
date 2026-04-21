# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
