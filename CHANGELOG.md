# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
