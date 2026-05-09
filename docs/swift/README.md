# Swift

[![Swift](https://img.shields.io/badge/Swift-6.1-F05138?logo=swift&logoColor=white)](https://www.swift.org/documentation/)

Convenções Swift aplicando os mesmos princípios do guia. Os exemplos usam Swift 6.1 como
referência; o modo de linguagem Swift 6 (strict concurrency checking) é o padrão assumido.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Swift: estrutura, tooling e segurança.

| Tópico | Conceitos |
| --- | --- |
| [Tooling](setup/tooling.md) | Swift Package Manager, SwiftLint, estrutura de módulos, entry point |

## Fundamentos

| Tópico | Conceitos |
| --- | --- |
| [Naming](conventions/naming.md) | camelCase/PascalCase, protocolos com sufixo, booleans, taboos |
| [Variables](conventions/variables.md) | `let`/`var`, computed properties, imutabilidade por padrão |
| [Control Flow](conventions/control-flow.md) | Guard clauses, `switch`/pattern matching, retorno antecipado, `if let` |
| [Functions](conventions/functions.md) | Labels de argumento, SLA, explaining return, stepdown |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função |
| [Types](conventions/types.md) | Structs vs classes, protocols, enums com associated values, generics, optionals |

## Avançados

| Tópico | Conceitos |
| --- | --- |
| [Concurrency](conventions/advanced/concurrency.md) | `async`/`await`, `actor`, `Sendable`, structured concurrency, `Task` |
| [Error Handling](conventions/advanced/error-handling.md) | `throws`/`Result`, `do/catch`, erros de domínio |
| [Null Safety](conventions/advanced/null-safety.md) | Optionals, `guard let`, `if let`, `??`, `!` proibido |
| [Testing](conventions/advanced/testing.md) | XCTest, Swift Testing, mocking com protocolos, AAA |
| [Performance](conventions/advanced/performance.md) | Value types, `@inlinable`, evitar alocação, Instruments |
| [Observability](conventions/advanced/observability.md) | `os.Logger`, structured logging, signposts, níveis |
| [Validation](conventions/advanced/validation.md) | `guard`, `precondition`, validação na fronteira |
| [Dates](conventions/advanced/dates.md) | `Date`, `Calendar`, `DateComponents`, ISO 8601, `TimeZone` |

## Mobile

Swift é a linguagem principal para **iOS** e **macOS** nativos. Os fundamentos cross-platform
vivem em [shared/mobile/](../shared/mobile/README.md):

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
| [PascalCase para tipos](conventions/naming.md#convenções-de-case) | Tipos e protocolos: `PascalCase`; funções/vars: `camelCase` |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado) | Variáveis e funções que dispensam explicação |
| [Labels de argumento](conventions/functions.md#labels-de-argumento) | Chamada lê como prosa: `send(message: "Hi", to: user)` |
| [SLA](conventions/functions.md#sla--orquestrador-ou-implementação) | Uma responsabilidade, um nível de abstração |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno) | Saída de uma linha: o retorno nomeia o resultado, não o computa |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio | Descrição |
| --- | --- |
| [Guard clause](conventions/control-flow.md#guard-let-para-unwrap) | Saída cedo na falha com `guard`; sem `else` após `return` |
| [switch com pattern matching](conventions/control-flow.md#switch-exaustivo) | `switch` exaustivo substitui chains de `if/else if` |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código) | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [`let` por padrão](conventions/variables.md#var-onde-let-resolve) | Imutabilidade como default; `var` apenas quando necessário |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos) | Constantes nomeadas no lugar de literais inline |

<br>

**Controle de qualidade**: erros, concorrência e testes

| Princípio | Descrição |
| --- | --- |
| [throws / Result explícito](conventions/advanced/error-handling.md#exceção-como-controle-de-fluxo) | Erros de domínio como valores; `throw` só para erros irrecuperáveis |
| [Actors para estado compartilhado](conventions/advanced/concurrency.md#race-condition-em-classe) | `actor` protege mutação concorrente sem locks manuais |
| [Structured concurrency](conventions/advanced/concurrency.md#task-solta) | Toda `Task` tem escopo; cancelamento se propaga |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa) | AAA explícito; XCTAssert semântico ou Swift Testing `#expect` |
