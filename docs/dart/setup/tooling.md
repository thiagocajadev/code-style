# Tooling

> Escopo: Dart 3.7, Dart SDK.

Configuração inicial de um projeto Dart: gerenciador de pacotes, formatação, análise estática e
estrutura de diretórios.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **pub** | gerenciador de pacotes do Dart; `pubspec.yaml` descreve dependências |
| `dart analyze` | análise estática nativa; usa regras do `analysis_options.yaml` |
| `dart format` | formatador oficial; opinionado, sem configurações de estilo |
| **dart_code_metrics** | análise extra: complexidade ciclomática, linhas por método, cobertura |
| `dart fix` | aplica fixes automáticos sugeridos pelo analyzer |

## Estrutura de projeto

```
my_package/
├── pubspec.yaml              ← dependências e metadados
├── analysis_options.yaml     ← regras de lint e análise
├── lib/
│   ├── src/
│   │   ├── domain/           ← modelos e regras de negócio
│   │   ├── data/             ← repositórios e I/O
│   │   └── application/      ← use cases
│   └── my_package.dart       ← barrel file (exports públicos)
└── test/
    └── src/
        └── order_service_test.dart
```

## pubspec.yaml mínimo

```yaml
name: my_package
description: A Dart package.
version: 1.0.0
environment:
  sdk: ^3.7.0

dependencies:
  collection: ^1.18.0

dev_dependencies:
  lints: ^4.0.0
  test: ^1.25.0
  mocktail: ^1.0.4
```

## analysis_options.yaml

```yaml
include: package:lints/recommended.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true

linter:
  rules:
    - prefer_final_locals
    - avoid_dynamic_calls
    - always_declare_return_types
    - unawaited_futures
    - avoid_print
```

<details>
<summary>❌ Bad — análise estática ignorada</summary>
<br>

```dart
dynamic processData(data) {   // sem tipo de retorno, parâmetro dynamic
  print(data);                // avoid_print
}
```

</details>

<br>

<details>
<summary>✅ Good — tipos explícitos, sem print</summary>
<br>

```dart
void processOrder(Order order) {
    developer.log('order.processing', name: 'OrderService');
}
```

</details>

## Variáveis de ambiente e segredos

Nunca versionar credenciais em código-fonte ou em arquivos commitados.

| Contexto | Estratégia |
| --- | --- |
| Dart puro (CLI/backend) | `Platform.environment['KEY']` com `dart:io` |
| Flutter | `--dart-define=KEY=VALUE` no build; `String.fromEnvironment('KEY')` |
| CI / CD | secrets do GitHub Actions ou Dart pub workspace |

```dart
import 'dart:io';

final apiKey = Platform.environment['PAYMENT_API_KEY']
    ?? (throw StateError('PAYMENT_API_KEY environment variable is required'));
```

→ Princípios gerais de segurança: [shared/platform/security.md](../../shared/platform/security.md)
