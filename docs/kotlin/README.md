# Kotlin

[![Kotlin](https://img.shields.io/badge/Kotlin-2.2-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/docs/home.html)

Convenções Kotlin aplicando os mesmos princípios do guia. Os exemplos usam Kotlin 2.2 (K2
compiler) como referência; diferenças relevantes com versões anteriores são destacadas onde
necessário.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Kotlin: estrutura, tooling e segurança.

| Tópico | Conceitos |
| --- | --- |
| [Tooling](setup/tooling.md) | Gradle KTS, ktlint, detekt, estrutura de módulos, entry point |

## Fundamentos

| Tópico | Conceitos |
| --- | --- |
| [Naming](conventions/naming.md) | camelCase/PascalCase, companion, booleans, taboos |
| [Variables](conventions/variables.md) | `val`/`var`, `const val`, lazy, imutabilidade por padrão |
| [Control Flow](conventions/control-flow.md) | Guard clauses, `when`, retorno antecipado, `?.let`, `run` |
| [Methods](conventions/methods.md) | Funções de topo vs métodos, SLA, explaining return, stepdown, extension functions |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função |
| [Types](conventions/types.md) | Data classes, sealed classes, interfaces, generics, null safety, inline value classes |

## Avançados

| Tópico | Conceitos |
| --- | --- |
| [Coroutines](conventions/advanced/coroutines.md) | `suspend`, `CoroutineScope`, `Flow`, `Channel`, structured concurrency |
| [Async](conventions/advanced/async.md) | `async`/`await`, `withContext`, `Dispatchers`, `launch` |
| [Error Handling](conventions/advanced/error-handling.md) | `Result`, `runCatching`, sealed classes de erro, fronteiras |
| [Null Safety](conventions/advanced/null-safety.md) | `?.`, `?:`, `!!`, `let`, `run`, smart cast |
| [Testing](conventions/advanced/testing.md) | JUnit 5, `kotest`, `mockk`, estrutura AAA, coroutine tests |
| [Performance](conventions/advanced/performance.md) | Inline functions, lazy, `buildList`, evitar alocação, benchmarks |
| [Observability](conventions/advanced/observability.md) | `slf4j`, structured logging, MDC, níveis, correlação |
| [Validation](conventions/advanced/validation.md) | `require`/`check`, Bean Validation, validação na fronteira |
| [Dates](conventions/advanced/dates.md) | `java.time`, `Instant`, `LocalDate`, ISO 8601, fusos horários |

## Mobile

Kotlin é a linguagem principal para **Android** nativo. Os fundamentos cross-platform vivem em
[shared/mobile/](../shared/mobile/README.md):

| Conceito | Referência |
| --- | --- |
| Ciclo de vida do app | [App Lifecycle](../shared/mobile/app-lifecycle.md) |
| Navegação | [Navigation](../shared/mobile/navigation.md) |
| Gerenciamento de estado | [State Management](../shared/mobile/state-management.md) |
| Offline e sincronização | [Offline-first](../shared/mobile/offline-first.md) |
| Permissões em runtime | [Permissions](../shared/mobile/permissions.md) |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio | Descrição |
| --- | --- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português) | Código universal, nomes curtos e sem ambiguidade |
| [PascalCase para tipos](conventions/naming.md#convenções-de-case) | Classes/interfaces: `PascalCase`; funções/vars: `camelCase` |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado) | Variáveis e funções que dispensam explicação |
| [Orquestrador no topo](conventions/methods.md#god-function--múltiplas-responsabilidades) | Chamada visível antes dos detalhes (top-down) |
| [SLA](conventions/methods.md#sla--orquestrador-ou-implementação) | Uma responsabilidade, um nível de abstração |
| [Sem lógica no retorno](conventions/methods.md#sem-lógica-no-retorno) | Saída de uma linha: o retorno nomeia o resultado, não o computa |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio | Descrição |
| --- | --- |
| [Retorno antecipado](conventions/control-flow.md#aninhamento-em-cascata) | Saída cedo na falha, sem else após return |
| [Fluxo linear](conventions/control-flow.md#when-como-lookup) | `when` substitui chains de if/else |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código) | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [`val` por padrão](conventions/variables.md#var-onde-val-resolve) | Imutabilidade como default; `var` apenas quando necessário |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos) | Constantes nomeadas no lugar de literais inline |

<br>

**Controle de qualidade**: erros, coroutines e testes

| Princípio | Descrição |
| --- | --- |
| [Result explícito](conventions/advanced/error-handling.md#exceção-como-controle-de-fluxo) | `Result`/sealed class; exceção só para invariantes |
| [Falhar rápido](conventions/advanced/error-handling.md#erro-silencioso) | Validar cedo, interromper fluxo inválido |
| [Structured concurrency](conventions/advanced/coroutines.md#goroutine-solta) | Toda coroutine tem escopo, cancelamento e espera definidos |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa) | AAA explícito; assert semântico via `kotest` |
