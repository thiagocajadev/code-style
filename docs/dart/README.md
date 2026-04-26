# Dart

[![Dart](https://img.shields.io/badge/Dart-3.7-0175C2?logo=dart&logoColor=white)](https://dart.dev/guides)

Convenções Dart aplicando os mesmos princípios do guia. Os exemplos usam Dart 3.7 como
referência; null safety completo e records/patterns (Dart 3.0+) são assumidos como disponíveis.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Dart: estrutura, tooling e segurança.

| Tópico | Conceitos |
| --- | --- |
| [Tooling](setup/tooling.md) | `pub`, `dart_code_metrics`, `dart analyze`, `dart format`, estrutura de pacotes |

## Fundamentos

| Tópico | Conceitos |
| --- | --- |
| [Naming](conventions/naming.md) | `camelCase`/`PascalCase`, prefixo `_` para privado, booleans, taboos |
| [Variables](conventions/variables.md) | `final`/`var`/`const`, type inference, imutabilidade por padrão |
| [Control Flow](conventions/control-flow.md) | Guard clauses, `switch` expressions, retorno antecipado, `if-case` |
| [Functions](conventions/functions.md) | Named parameters, SLA, explaining return, stepdown, arrow functions |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função |
| [Types](conventions/types.md) | Classes, mixins, sealed classes, extensions, generics, null safety |

## Avançados

| Tópico | Conceitos |
| --- | --- |
| [Streams](conventions/advanced/streams.md) | `Stream`, `StreamController`, `StreamSubscription`, broadcast vs single |
| [Async](conventions/advanced/async.md) | `async`/`await`, `Future`, `FutureOr`, `Completer` |
| [Error Handling](conventions/advanced/error-handling.md) | `Exception`, `Error`, `Result` pattern, `try/catch`, `onError` |
| [Null Safety](conventions/advanced/null-safety.md) | `?`, `!`, `??`, `?.`, late, `required` |
| [Testing](conventions/advanced/testing.md) | `package:test`, `mockito`/`mocktail`, AAA, async tests |
| [Performance](conventions/advanced/performance.md) | `const` constructors, `Uint8List`, evitar alocação, benchmarks |
| [Observability](conventions/advanced/observability.md) | `dart:developer`, `log()`, níveis, zones |
| [Validation](conventions/advanced/validation.md) | `assert`, validação na fronteira, acumulação de erros |
| [Dates](conventions/advanced/dates.md) | `DateTime`, `Duration`, ISO 8601, fusos horários |

## Frameworks

| Framework | Descrição |
| --- | --- |
| [Flutter](frameworks/flutter/README.md) | Framework cross-platform de UI sobre Dart |

## Mobile

Dart é a linguagem do **Flutter**, stack cross-platform para Android, iOS, Web e Desktop.
Os fundamentos cross-platform vivem em [shared/mobile/](../shared/mobile/README.md):

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
| [PascalCase para tipos](conventions/naming.md#convenções-de-case) | Classes/enums: `PascalCase`; funções/vars: `camelCase` |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado) | Variáveis e funções que dispensam explicação |
| [Named parameters](conventions/functions.md#named-parameters) | Chamada legível: `createOrder(userId: id, items: list)` |
| [SLA](conventions/functions.md#sla--orquestrador-ou-implementação) | Uma responsabilidade, um nível de abstração |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno) | Saída de uma linha: o retorno nomeia o resultado, não o computa |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio | Descrição |
| --- | --- |
| [Retorno antecipado](conventions/control-flow.md#aninhamento-em-cascata) | Saída cedo na falha, sem else após return |
| [`switch` exaustivo](conventions/control-flow.md#switch-como-expressão) | switch expression substitui chains de if/else |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código) | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [`final` por padrão](conventions/variables.md#var-onde-final-resolve) | Imutabilidade como default; `var` apenas quando necessário |
| [Sem valores mágicos](conventions/variables.md#valores-mágicos) | Constantes nomeadas no lugar de literais inline |

<br>

**Controle de qualidade**: erros, async e testes

| Princípio | Descrição |
| --- | --- |
| [Exception tipada](conventions/advanced/error-handling.md#exception-genérica) | `Exception` subclassificada; nunca `throw 'string'` |
| [Falhar rápido](conventions/advanced/error-handling.md#erro-silencioso) | Validar cedo, interromper fluxo inválido |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa) | AAA explícito; `expect` semântico via `package:test` |
