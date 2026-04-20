# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
