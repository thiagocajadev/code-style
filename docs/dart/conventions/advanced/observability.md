# Observability

> Escopo: Dart 3.7, dart:developer.

Dart fornece `dart:developer` como API de logging e diagnóstico. Em Flutter, o **DevTools**
consome os eventos e timelines emitidos. Logs estruturados facilitam diagnóstico em ambientes
de produção com ferramentas externas.

→ Princípios gerais: [shared/platform/observability.md](../../../shared/platform/observability.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `dart:developer` | biblioteca nativa de logging e instrumentação para Dart/Flutter |
| `developer.log` | emite evento de log com nome, nível e contexto de erro |
| `Timeline` | marca eventos para visualização no Flutter DevTools |
| `zones` | escopo de execução que intercepta erros e logs assíncronos |
| `FlutterError.onError` | callback de último recurso para erros não capturados em Flutter |

## `print()` em produção

<details>
<summary>❌ Bad — print() não tem contexto, nível nem filtro</summary>
<br>

```dart
void processOrder(int orderId) {
  print('Processing order $orderId');
  // ...
  print('Done');
}
```

</details>

<br>

<details>
<summary>✅ Good — developer.log com name e contexto</summary>
<br>

```dart
import 'dart:developer' as developer;

void processOrder(int orderId) {
  developer.log('order.processing.started', name: 'OrderService', error: orderId);
  // ...
  developer.log('order.processing.completed', name: 'OrderService', error: orderId);
}
```

</details>

## Níveis de log

`developer.log` usa o parâmetro `level` mapeado para `java.util.logging` levels:

| Nível (valor) | Quando usar |
| --- | --- |
| `FINEST` (300) | rastreamento interno — verbose |
| `FINE` (500) | debug de fluxo |
| `INFO` (800) | evento de negócio relevante |
| `WARNING` (900) | situação inesperada mas recuperável |
| `SEVERE` (1000) | falha que afeta o fluxo |

```dart
import 'dart:developer' as developer;

const levelInfo = 800;
const levelWarning = 900;
const levelSevere = 1000;

developer.log('payment.initiated', name: 'PaymentService', level: levelInfo);
developer.log('retry.triggered', name: 'RetryPolicy', level: levelWarning);
developer.log('payment.failed', name: 'PaymentService', level: levelSevere, error: exception);
```

## Zone para captura de erros não tratados

<details>
<summary>❌ Bad — erros assíncronos escapam sem captura</summary>
<br>

```dart
void main() {
  runApp(const MyApp());
}
```

</details>

<br>

<details>
<summary>✅ Good — runZonedGuarded captura erros de qualquer zona</summary>
<br>

```dart
void main() {
  runZonedGuarded(
    () => runApp(const MyApp()),
    (error, stackTrace) {
      developer.log(
        'unhandled.error',
        name: 'App',
        error: error,
        stackTrace: stackTrace,
        level: 1000,
      );
      // enviar para serviço de monitoramento (ex: Sentry, Firebase Crashlytics)
    },
  );
}
```

</details>

## Timeline para profiling no DevTools

```dart
import 'dart:developer';

Future<Report> buildReport() async {
  Timeline.startSync('buildReport');

  try {
    final report = await assembleReport();
    return report;
  } finally {
    Timeline.finishSync();
  }
}
```

Visualizar em Flutter DevTools → Performance → Timeline events.
