# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.25.0] - 2026-04-26

### Added

- `docs/ruby/` — skeleton completo: README, quick-reference, setup×2, conventions×6 (naming, variables, control-flow, methods, visual-density, types), advanced×7 (error-handling, async, testing, performance, observability, validation, dates)
- `docs/ruby/frameworks/rails.md` — Rails 8.0: MVC, controller thin, ActiveRecord, Strong Parameters, migrations, rotas RESTful, Solid Queue, auth generator, Concerns
- `REFERENCES.md` — seção Ruby e Rails (17 links, versões abril 2026)
- README raiz — badges Ruby 4.0 e Rails 8.0; Backend reordenado: linguagem colada ao(s) framework(s)

## [1.24.0] - 2026-04-26

### Added

- `docs/rust/` — skeleton completo: README, quick-reference, setup×2, conventions×6 (naming, variables, control-flow, functions, visual-density, types), advanced×8 (error-handling, async, null-safety, testing, performance, observability, validation, dates)
- `docs/rust/frameworks/blockchain.md` — Solana/Anchor 1.0: modelo de programa, accounts, instrução BAD/GOOD em Rust
- `docs/shared/platform/iot.md` — padrões de domínio IoT com MicroPython 1.28: naming de sensores, debounce, FSM, alertas idempotentes, watchdog, polling vs IRQ
- `docs/python/conventions/advanced/micropython.md` — diff da stdlib CPython, restrições de hardware, asyncio, boas práticas
- `REFERENCES.md` — seções Rust 1.95, Blockchain/Solana, IoT/MicroPython (26 links, versões abril 2026)

### Fixed

- `docs/rust/conventions/control-flow.md` — reescrito na ordem canônica simples→complexo (if/else · if expressão · ? · if let/let-else · lookup · match · circuit break · for · while · loop)
- `docs/rust/conventions/advanced/testing.md` — seção `assert` com `PartialEq + Debug`; AAA documentado
- `docs/shared/platform/iot.md` — debounce: `antirrepique` → `filtragem de ruído`
- `docs/shared/standards/control-flow.md` — Rust adicionado em Veja também
- AAA — `Arrumar, Agir, Atestar` padronizado em 11 arquivos (anteriormente: Preparar/Executar/Verificar, Preparar/Agir/Verificar, sem tradução)

## [Unreleased]

### Added

- `docs/shared/platform/integrations.md` — GraphQL: intro conceitual sobre grafos (nós, arestas), mini-grafo ASCII (Pedido → Cliente/Itens), schema Countries API como imagem, BAD/GOOD com query nomeada e variável de servidor

### Fixed

- `docs/javascript/conventions/control-flow.md` — 3 seções reordenadas de BAD BAD GOOD GOOD para BAD GOOD BAD GOOD: circuit break, for...of, while
- `docs/csharp/conventions/control-flow.md` — 3 seções reordenadas de BAD BAD GOOD GOOD para BAD GOOD BAD GOOD: switch expression, circuit break, while
- `docs/go/conventions/control-flow.md` — `idx` renomeado para `index` em exemplo Good (banned abbreviation)
- `README.md` — badges reorganizados em tabela semântica (Área | Stack): Frontend, Backend, Mobile, Banco de dados, Bots & Integrações, Padrões; SQL separado em SQL Server 2025, PostgreSQL 18 e SQLite 3.53 com logos individuais

## [1.23.0] - 2026-04-26

### Added

- `docs/kotlin/` skeleton completo — Kotlin 2.2 (K2 compiler): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,methods,visual-density,types}, advanced/{async,coroutines,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/swift/` skeleton completo — Swift 6.1 (strict concurrency, actors, Sendable): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,functions,visual-density,types}, advanced/{concurrency,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/dart/` skeleton completo — Dart 3.7 (null safety, records, patterns, streams): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,functions,visual-density,types}, advanced/{async,streams,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/dart/frameworks/flutter/` — Flutter 3.29 (framework dentro de Dart): README, quick-reference, conventions/widgets, advanced/{state-management,navigation,platform-channels,testing}; cross-links `shared/mobile/`
- `README.md` — badges Kotlin 2.2, Swift 6.1, Dart 3.7, Flutter 3.29; tabela de linguagens atualizada
- `REFERENCES.md` — seções Kotlin, Swift, Dart e Flutter (28 links: docs oficiais, coding conventions, linters, frameworks de teste, pub.dev)
- `docs/kotlin/conventions/control-flow.md` — `## if-expression` (ternário Kotlin via if/else expressão, limite 2 alternativas, escalada para `when`)
- `docs/swift/conventions/control-flow.md` — `## Ternário` (? : para 2 valores, ternário aninhado → switch) e `## Dictionary como lookup` (chaves dinâmicas + ?? fallback)
- `docs/dart/conventions/control-flow.md` — `## Ternário` (? : para 2 valores, aninhado → switch expression) e `## Map como lookup` (const Map + ?? fallback)

### Fixed

- `docs/kotlin/conventions/methods.md` — helpers SLA com lógica no `return` convertidos para single-expression syntax (`=`) — dogfood explaining return
- `docs/swift/conventions/functions.md` — `generateReport` GOOD: construtor `Report(...)` extraído para `let report` antes do return
- `docs/swift/conventions/advanced/performance.md` — `findTopSpenders` GOOD: conversão `Array(topSpenderNames)` extraída para `let topSpenders` antes do return
- `docs/swift/conventions/visual-density.md` — chains GOOD: `Array(recentPaidSummaries)` extraído para `let recentPaid` antes do return
- `docs/dart/conventions/visual-density.md` — chains GOOD: `.take(5).toList()` extraído para `final recentPaid` antes do return
- `docs/dart/conventions/advanced/validation.md` — `validateProfile` GOOD: list comprehension `[if (...) ...]` extraída para `final profileErrors` antes do return
- `docs/dart/frameworks/flutter/README.md` — 5 links `../../../../shared/mobile/` corrigidos para `../../../shared/mobile/`
- `docs/kotlin/conventions/control-flow.md`, `docs/swift/conventions/control-flow.md`, `docs/dart/conventions/control-flow.md` — seções reordenadas de simples para complexo (ternário/guards → switch/lookup → pattern matching → loops)
- `.ai/tooling/scripts/audit-docs.mjs` — lint auto-fix (trailing comma + semantic-spacing)

## [1.22.1] - 2026-04-25

### Fixed

- `docs/go/` — dogfood strict nos Good examples: construtores inline extraídos para variável nomeada (`NewOrderService`, `NewOrderIndex`, `newFakeOrderRepository`, `NewRepository`); chamadas de função no return extraídas (`processOrder`, `g.Wait`, `http.ListenAndServe`, `context.WithValue`, `http.HandlerFunc`, `scheduledAt.UTC`); bug real em goroutines errgroup corrigido (`fmt.Errorf("...: %w", nil)` sempre produzia erro não-nil); variável intermediária `customerResult` removida
- `docs/php/conventions/functions.md` — BAD example para arrow functions (closures com `use` explícito vs `fn() =>`); BAD example para stepdown rule (helpers antes do orquestrador); VD tight em explaining return (`$summary` + `return` sem blank); quebra de linha em `usort` (> 80 chars)

## [1.22.0] - 2026-04-25

### Added

- `docs/go/` — skeleton completo Go 1.26: `README.md` (badges + tabela de convenções), `quick-reference.md` (cheat-sheet naming/booleans/verbos/taboos/controle de fluxo/erros/goroutines), `setup/project-foundation.md` (go.mod, toolchain, estrutura de diretórios, Config, entry point, domain packages), `setup/security.md` (secrets via env, prepared statements `$1`, context timeout, validação na fronteira), `conventions/naming.md` (PascalCase/camelCase, prefixo Err, naming order, domain-first, booleanos), `conventions/variables.md` (`:=` vs `var`, zero values, magic values, iota enums, imutabilidade, blank identifier), `conventions/control-flow.md` (guard clauses, no else after return, switch, for, defer, type switch), `conventions/methods.md` (functions vs methods, value vs pointer receivers, SLA, explaining return, named params via struct, stepdown), `conventions/visual-density.md` (parágrafo de intenção, explaining return, struct grouping, import grouping), `conventions/types.md` (interfaces at consumer, structs como domain types, named types, embedding, generics, type assertions, compile-time verification), `conventions/advanced/error-handling.md` (error as value, `%w` wrapping, sentinel errors, custom error types, panic para invariantes, fronteira HTTP), `conventions/advanced/async.md` (`context.Context` propagation, `context.WithTimeout`, `errgroup` para chamadas paralelas), `conventions/advanced/concurrency.md` (goroutines + WaitGroup, channels, select com timeout, RWMutex, sync.Once, worker pool), `conventions/advanced/null-safety.md` (nil pointer check, zero value vs pointer, map nil panic, interface nil trap, ok idiom), `conventions/advanced/testing.md` (table-driven tests, `require` vs `assert`, fake in-memory repo, error path, t.Helper), `conventions/advanced/observability.md` (`log/slog` JSON handler, structured logging, correlation ID via context, PII avoidance), `conventions/advanced/performance.md` (benchmarks com -benchmem, escape analysis, pre-alloc slices, sync.Pool, strings.Builder, N+1 avoidance), `conventions/advanced/validation.md` (go-playground/validator tags, structured ValidationResponse, custom tags, path/query params), `conventions/advanced/dates.md` (time.Time com timezone explícito, RFC 3339, `*time.Time` opcional, duration constants, truncation para DB)
- `docs/php/` — skeleton completo PHP 8.4: `README.md` (badges + tabela), `quick-reference.md`, `setup/project-foundation.md` (Composer, PSR-12, PHPStan level 9, strict_types), `setup/security.md` (secrets env fail-fast, PDO prepared statements, htmlspecialchars, ARGON2ID, CSRF), `conventions/naming.md` (PSR-1/PSR-12), `conventions/variables.md` (readonly, typed properties, property hooks 8.4, constants), `conventions/control-flow.md` (strict `===`, guard clauses, match, nullsafe `?->`, null coalescing `??`), `conventions/functions.md` (SLA, named arguments, explaining return, max 3 params), `conventions/visual-density.md`, `conventions/types.md` (union types, backed enums, readonly classes, `never`), `conventions/advanced/error-handling.md` (domain exception hierarchy, try/catch nas fronteiras, finally), `conventions/advanced/traits.md` (traits coesos, métodos abstratos, conflito insteadof/as, tabela trait vs interface vs composição), `conventions/advanced/async.md` (workers/queues, Fiber, Revolt/Amp, CURLOPT_TIMEOUT), `conventions/advanced/null-safety.md` (nullable types, `?->`, `??`, null para ausência vs exceção para falha), `conventions/advanced/testing.md` (PHPUnit 11, `#[DataProvider]`, AAA, createMock, expectException), `conventions/advanced/observability.md` (Monolog + JsonFormatter, PSR-3 LoggerInterface, structured context, correlation ID via Processor), `conventions/advanced/performance.md` (OPcache, N+1 com batch loading, generators, lazy objects PHP 8.4, implode), `conventions/advanced/validation.md` (Symfony Validator attributes, structured error response, custom constraints, `#[Assert\Valid]`), `conventions/advanced/dates.md` (`DateTimeImmutable` vs `DateTime`, timezone explícito, createFromFormat, ISO 8601 serialization)
- `README.md` — badges Go e PHP + linhas nas tabelas de linguagens
- `.ai/tooling/scripts/audit-docs.mjs` — exceção `GO_IDIOMATIC_ABBREVIATIONS` (`ctx`, `req`) na regra `banned-abbreviations` para blocos de código Go

## [1.21.0] - 2026-04-25

### Added

- `docs/shared/mobile/` — subdomínio de fundamentos cross-platform: `README.md` (nativo vs cross-platform, mapa de tópicos), `app-lifecycle.md` (estados, cold/warm start, process death), `navigation.md` (stack, tab bar, modal, deep link, back stack), `state-management.md` (UI state vs domain state, unidirectional data flow, reatividade), `offline-first.md` (cache strategy, sincronia, conflict resolution, optimistic update, network-aware UX), `permissions.md` (runtime permissions, graceful degradation, permanently denied). Badge Mobile + tabela em `README.md`

## [1.20.1] - 2026-04-24

### Added

- `docs/shared/ai/security.md` — boas práticas contra prompt injection: tipos de ataque (direct injection, indirect injection, jailbreak, prompt leaking), 5 mitigações com exemplos BAD/GOOD em `<details><summary>`, tabela de erros comuns. Cross-links em `README.md` e `prompts.md`

## [1.20.0] - 2026-04-24

### Added

- ESLint v9 flat config (`eslint.config.mjs`) com SDG custom rules: `local/semantic-spacing`, `local/no-boolean-comparison`, `local/no-inline-assert`, `local/blank-before-assertion` (test files); `curly: all`, `no-nested-ternary`, `multiline-ternary`, `operator-linebreak`, `padding-line-between-statements`. `sdgTestConfig` wired para `**/*.test.*` e `**/*.spec.*`. Node.js globals + Jest globals para arquivos de teste. `docs/` incluída no lint (sem ignore). `printWidth: 80` enforça quebra de chains longas via Prettier. Script `npm run lint`. `.vscode/settings.json` com `formatOnSave` + `source.fixAll.eslint`

## [1.18.0] - 2026-04-24

### Added

- `docs/shared/platform/bots.md` — guia conceitual agnóstico de linguagem: webhook vs polling, command routing com Strategy Map, session state (opções em tabela: in-memory/Redis/DB), rate limits (global vs per-user, janela deslizante), lifecycle de shutdown limpo. `## Conceitos fundamentais` com 11 termos (Bot, Gateway, Event, Command, Handler, Webhook, Polling, Rate limit, Session, Intent, Callback). Cross-links para `bots-advanced.md`, `messaging.md`, `api-design.md`
- `docs/shared/platform/bots-advanced.md` — primitivas específicas por plataforma: Discord (tabela Gateway Intents, fluxo de registro de Slash Commands, limites de Embed), Telegram (setup BotFather, polling vs webhook, tipos de Inline Keyboard, tabela de tipos de chat), WhatsApp (tabela oficial vs não-oficial, janela de 24h da Business API, verificação de webhook). `## Conceitos fundamentais` com 9 termos (Gateway Intent, Slash Command, Embed, Inline Keyboard, BotFather, Bot Token, Business API, Unofficial Client, Template Message). Cross-links para `bots.md`
- `docs/javascript/frameworks/bot/discord.md` — discord.js v14.19 com Node.js 22: import via `Events`/`GatewayIntentBits` enum (sem strings literais), `REST({ version: '10' })` + `SlashCommandBuilder`, `isChatInputCommand()` type guard, `deferReply`/`editReply` para operações assíncronas, `EmbedBuilder` + `{ embeds: [embed] }` array syntax, eventos `GuildMemberAdd`/`MessageReactionAdd` com guards de null e bot
- `docs/javascript/frameworks/bot/telegram.md` — Telegraf v4.16 com Node.js 22: `context` (sem abreviação `ctx`), `message` filter de `telegraf/filters`, separação compute/format/action, `answerCbQuery` obrigatório após callback, `bot.createWebhook()` com `secretToken` e shutdown limpo
- `docs/javascript/frameworks/bot/whatsapp.md` — Baileys v7 (ESM-only, `makeWASocket` como default export, reconnect automático, guard `fromMe`, Strategy Map) + Meta Cloud API v21.0 (fetch nativo Node.js 22, verificação `hub.mode`+`hub.verify_token`, 200 imediato antes de processar, Template Messages)
- `docs/javascript/README.md` — seção `## Frameworks` com tabela cobrindo discord.js, Telegraf e Baileys/Meta Cloud API
- `README.md` — badge Discord (discord.js), Telegram (Telegraf), WhatsApp (Baileys | Meta API); linha `Bots` na tabela Plataforma

## [1.17.2] - 2026-04-23

### Fixed

- Estrutura pedagógica em 136 arquivos de `docs/`: 330 gaps zerados em ciclo único (ciclos A+B+C+D fundidos do relatório `audit-pedagogical-structure.md`). R1×25 (parágrafos de intro após H1), R2×18 (seções `## Conceitos fundamentais` + tabela), R3×248 (siglas `**SIGLA** (English, PT)` na 1ª ocorrência), R3b×38 (não-siglas `**termo** (tradução)`), R4×1 (título com expansão completa → tradução curta). Zero toque em código, exemplos Good/Bad ou estrutura de arquivos. Audit final: 0 gaps em 182 arquivos; `audit:docs` mantém 0 violações em 1230 blocos Good / 201 arquivos

## [1.17.1] - 2026-04-23

### Added

- `.ai/tooling/scripts/audit-pedagogy.mjs` — auditor reusável de estrutura pedagógica em `docs/` (5 regras: R1 intro paragraph após H1, R2 `## Conceitos fundamentais` + tabela `\| Conceito \| O que é \|` quando há 3+ termos em inglês, R3 sigla na 1ª ocorrência `**SIGLA** (English, PT)`, R3b não-sigla `**termo** (tradução)`, R4 títulos com expansão completa). Catálogo embutido de ~100 siglas + ~50 termos. Filtros de ruído: code fences, tabelas (exceto intro válida), headings, blockquotes, cross-link items, backticks inline e expansões de outras siglas
- `.ai/backlog/audit-pedagogical-structure.md` — relatório de gaps por pasta: 330 gaps em 136 arquivos (de 182 auditáveis). Distribuição: R1×25, R2×18, R3×248, R3b×38, R4×1. Top 10 arquivos por densidade. Serve como input para ciclos `docs:` de correção
- `package.json` — script `audit:pedagogy`

## [1.17.0] - 2026-04-23

### Added

- `docs/shared/architecture/system-design.md` — guia conceitual leve: papel do System Design (raciocínio antes do código), requisitos funcionais vs não-funcionais, processo de decomposição (Entidades → Fluxos → Fronteiras → Contratos → Componentes), trade-offs essenciais em tabela (Consistência vs Disponibilidade, Latência vs Throughput, Simplicidade vs Escala, Custo vs Performance), quando começa e quando termina. Cross-links para scaling, patterns, methodologies, messaging, database, security
- `docs/shared/architecture/system-design-advanced.md` — instrumentos quantitativos: SLA/SLO/SLI e error budget, CAP (CP vs AP), PACELC (PA/EL, PC/EC, PC/EL, PA/EC), modelos de consistência (strong, sequential, causal, read-your-writes, eventual), back-of-the-envelope (cálculo QPS com referências de ordem de grandeza), sharding (range-based, hash-based, consistent hashing, directory-based), replicação (single-leader, multi-leader, leaderless com quórum `W + R > N`), particionamento vs replicação, checklist de System Design
- `docs/shared/process/design-thinking.md` — guia conceitual leve: papel do Design Thinking (raciocínio antes de decidir o que construir), 5 fases em tabela (Empathize → Define → Ideate → Prototype → Test) com técnicas para cada uma, HMW questions, fidelidade de protótipo (papel → wireframe → mockup), Design Thinking vs UI/UX (upstream vs downstream). Cross-links para ui-ux, methodologies, system-design
- `docs/shared/process/design-thinking-advanced.md` — técnicas estruturadas: Double Diamond (Discover → Define → Develop → Deliver), Service Blueprint em 4 camadas (customer actions, frontstage, backstage, support processes), Journey Map com dimensões (ação, objetivo, emoção, ponto de contato, fricção, oportunidade), técnicas de ideação (Crazy 8s, SCAMPER, Lotus Blossom, analogia forçada), estratégia de protótipo em 5 estágios, MVP vs MLP, Usability Testing (modalidades, think-aloud, métricas SUS/NPS/task success rate), checklist
- `README.md` — tabela Processo ganhou `Design Thinking` e `Design Thinking (avançado)`; tabela Arquitetura ganhou `System Design` e `System Design (avançado)`

## [1.16.0] - 2026-04-23

### Fixed

- `docs/shared/standards/visual-density.md` — SSOT refinado: nova regra "Explaining Return: par tight" (`const X = …; return X;` é par de 2 linhas sem blank entre declaração e return, blank antes do return só quando há 2+ passos antes); nova regra "Órfão de 1 linha: pior que trio atômico" (3 declarações atômicas consecutivas ficam juntas, 4+ viram 2+2); nova regra "Par semântico encadeado" (quando linha final depende da penúltima, ficam tight). Tabela de referência rápida reorganizada com 9 regras; BAD/GOOD em details/summary para cada refinamento
- `docs/shared/platform/api-design.md` — 9 blocos Good ajustados: pares `Result.fail + return failure` e `Result.ok + return success` agora tight; `mapErrorToStatus` (`const status = … ?? 500; return status;`) tight. Multi-step (`buildErrorEnvelope` + 2 linhas) mantém blank antes do return
- `docs/shared/platform/integrations.md` — `extractField` (CNAB240 fixed-width): par `const field = line.slice(...); return field;` tight
- `docs/shared/platform/performance.md` — `findHighestScore` (Math.max O(n)): par tight
- `docs/shared/standards/null-safety.md` — `calculateDiscount` com contrato garantido: par tight
- `docs/javascript/conventions/visual-density.md` — reestruturado para refletir SSOT refinado: subseções "Explaining Return: par tight", "Return separado: quando há 2+ passos antes", "Órfão de 1 linha: pior que trio atômico", "Par semântico encadeado"; 6 novos BAD/GOOD pairs em details/summary
- `docs/typescript/conventions/visual-density.md` — mesma estrutura refinada com exemplos TypeScript; anotações de tipo na mesma linha que a declaração
- `docs/csharp/conventions/visual-density.md` — estrutura refinada com exemplos em C# 13/.NET 10; exemplo de `DomainLimits` com `public const` para trio atômico
- `docs/vbnet/conventions/visual-density.md` — estrutura refinada com exemplos em VB.NET/.NET Framework 4.8; `Public Const` para trio atômico e `$"..."` strings de interpolação
- `docs/javascript/conventions/` — 20 blocos Good ajustados em functions.md, advanced/async.md, advanced/null-safety.md, advanced/error-handling.md, advanced/performance.md, control-flow.md, naming.md, variables.md
- `docs/typescript/conventions/` — 15 blocos Good ajustados em advanced/async.md, advanced/dates.md, advanced/performance.md, functions.md, narrowing.md; `docs/typescript/frameworks/` angular.md e react-nextjs.md também alinhados
- `docs/csharp/conventions/` — 20 blocos Good ajustados em advanced/{async,null-safety,performance,validation}.md, control-flow.md, methods.md, types.md; `docs/csharp/setup/` dapper.md e entity-framework.md também alinhados
- `docs/html/setup/javascript-vanilla.md` — 1 bloco ajustado (`createdOrder` tight)
- `docs/nosql/conventions/` e `docs/nosql/sgbd/` — 16 blocos ajustados em aggregation.md, performance.md, visual-density.md, cassandra.md, elasticsearch.md, mongodb.md, redis.md

### Added

- `.ai/tooling/scripts/audit-docs.mjs` — 2 regras novas: `density-explaining-return-blank` (flagra blank entre declaração única e return, ignora multi-step) e `density-orphan-single-line` (flagra declaração atômica isolada após par de atomics; ignora quando seguida de guard clause ou código não atômico; requer todos os 3 atomics serem literais simples sem `await` ou function call, evitando falsos positivos em fases de execução). Helpers `isAtomicDeclaration`, `isDeclarationBoundary`, `isSimpleLiteralAtomic`. Suporta `const`, `let`, `var`, `Dim`, `final`, `readonly`
- `.ai/tooling/scripts/audit-docs.test.mjs` — 6 testes novos cobrindo par tight aceito, blank em 1-prep flagrado, multi-step aceito, órfão atomic flagrado, split 2+2 aceito, fases com await aceitas. Total 23 testes passando
- Audit `docs/` 100% limpo: 0 violações em 1220 blocos Good, 197 arquivos

## [1.15.0] - 2026-04-23

### Added

- `docs/shared/platform/api-design.md` — novo SSOT do pipeline de API: BFF como boundary, pipeline linear (Controller thin → Handler → Service → Repository → Storage), Conceitos fundamentais (BFF, DTO, Envelope, Correlation ID, Result, Idempotência), contratos Request/Response com DTO e validação de schema, envelope `{ data, meta }` com shape padrão e tabela de campos, verbos REST e convenções de rota (kebab-case, plural, sem verbo na URL), status codes com distinção 400 vs 422, mapeamento Result → HTTP no boundary com tabela de códigos. Exemplos BAD/GOOD em JS

### Changed

- `docs/csharp/conventions/advanced/api-design.md` — seções `## Request e Response`, `## Response Envelope`, `## Verbos e rotas` e `## Status codes` removidas (agora SSOT em shared/platform/api-design.md); adicionada seção `## Contrato, envelope, verbos e status codes` com idioma C# (`record` com `required init`) e cross-link. Blockquote de escopo atualizado
- `docs/vbnet/conventions/advanced/api-design.md` — mesmas seções agnósticas removidas; adicionada seção com idioma VB.NET (`NotInheritable Class` com `ReadOnly` e construtor) e cross-link. Blockquote de escopo atualizado
- `README.md` — linha `API Design` adicionada na tabela Platform, entre o índice de Plataforma

## [1.14.2] - 2026-04-23

### Fixed

- `docs/shared/process/governance.md` — nova seção `## Normas de referência` entre Decision Records e Code Review: tabelas agrupadas por domínio (Linguagem normativa e datas: RFC 2119, ISO 8601; Protocolos HTTP e autenticação: RFC 7231/9110/6749/7519; Qualidade e segurança: ISO/IEC 25010/27001/27035, OWASP ASVS, OWASP Top 10; Versionamento e entrega: SemVer 2.0.0, Conventional Commits, Keep a Changelog) + parágrafo de fechamento articulando que desvio registrado em ADR tem valor equivalente à conformidade

## [1.14.1] - 2026-04-22

### Added

- `docs/shared/process/git-advanced.md` — novo arquivo transversal: rotina convencional com tabela de passos (pull → branch → commits → fetch/merge → PR → squash → deletar), squash no PR (GitHub Squash and merge + BAD/GOOD), DX no PR (tabela reviewer), troubleshooting semântico (O que não fazer, Inspecionando, Stash, Conflitos com a main, Recuperando commits via Reflog, Rebase como recuperação, Conflitos graves com fix branch, Corrigindo em produção, Revertendo deploy com git revert + tabela explicativa)
- `docs/shared/process/git.md` — linha squash na tabela de PRs + cross-link para git-advanced.md

## [1.14.0] - 2026-04-22

### Added

- `docs/shared/ai/` — nova seção transversal de IA com 9 arquivos: README (índice + nota sobre o que IA realmente é), models.md (Claude/GPT/Gemini/Llama/Mistral + Ollama + quantização GGUF), agents.md (Agent, Harness, Orchestration, Multi-agent, Memory), rag.md (RAG, Embeddings, Vector store, Chunking, variações), tools-mcp.md (Tool Use, Function Calling, MCP Protocol spec 2025-11-25), tokens.md (token, context window, custo por token com preços verificados, Prompt Caching), prompts.md (engenharia de prompts com 6 pares BAD/GOOD em details/summary), skills.md (Skills/Habilidades de agentes: routing, loading, composição), advanced.md (Fine-tuning, Hallucination com BAD/GOOD, Structured outputs, Extended thinking, Inference engines, AI Gateway com ferramentas atualizadas para 2026)
- `docs/shared/platform/integrations.md` — seção `## APIs de Modelos de IA` com BAD/GOOD para autenticação, streaming e retry com exponential backoff
- `README.md` — badge IA + seção `**IA (Inteligência Artificial)**` na tabela de Conceitos Compartilhados
- `docs/shared/architecture/patterns.md` — link para specdrivenguide.org substituindo referência ao `.ai/`

## [1.13.1] - 2026-04-22

### Fixed

- `docs/nosql/conventions/crud.md`: Explaining Returns — extraída `const modifiedCount`/`deletedCount` antes do `return` em 4 métodos GOOD (updateManager, deactivate, softDelete, purgeExpired); upsert `save` passa a retornar `{ wasInserted, modifiedCount }` em vez do resultado bruto do driver
- `docs/nosql/conventions/advanced/aggregation.md`: `$unwind` GOOD — `const rows` renomeado para `const teamsWithPlayers`; `$match` GOOD — removido comentário "what" `// filtra antes do join`
- `docs/nosql/conventions/naming.md`: `managerId: 'player:7'` corrigido para ObjectId hex realista
- `docs/nosql/scripts/mongodb/01-insert.js`: campo `managerId: null` removido do exemplo de uso (campo opcional não deve ser explicitado como null)
- `docs/nosql/scripts/redis/02-hashes.js`: `const raw` renomeado para `const hashFields`
- `docs/nosql/scripts/redis/04-sorted-sets.js`: removidos comentários "what" (`// maior score primeiro`, `// retorna: [...]`)
- `docs/nosql/scripts/redis/01-strings.js`: removido comentário "what" `// simulação de busca no banco primário`
- `docs/sql/conventions/formatting.md`: 2 GOOD examples — colunas `Id, Name, Email` qualificadas como `Users.Id, Users.Name, Users.Email`
- `docs/sql/conventions/crud.md`: UPDATE FROM GOOD — `Email` → `Users.Email`; UPDATE CASE GOOD — `StatusId` → `Orders.StatusId`; soft delete GOOD — `IsActive, InactivatedAt, Id` qualificados com `Users.`
- `docs/sql/conventions/advanced/advanced.md`: CTE GOOD — `TeamId, IsActive` qualificados como `Players.TeamId, Players.IsActive`
- `docs/sql/conventions/advanced/null-safety.md`: migration batch GOOD — `Priority` qualificado como `Orders.Priority`
- `docs/sql/conventions/advanced/procedures.md`: indentação dos comentários `-- Etapa X:` corrigida de 1 espaço para 2 espaços dentro do `BEGIN`
- `docs/sql/sgbd/postgres.md`: RETURNING UPDATE GOOD — `status` qualificado como `orders.status`

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
