# Error Handling

> Escopo: Dart 3.7.

Erros esperados são valores — um sealed class `Result` ou sealed class de erros retorna a
falha ao chamador sem lançar exceção. `Exception` cobre erros recuperáveis. `Error` cobre
bugs de programação (não capturar em produção).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Exception` | erro recuperável — definir subclasse para cada tipo de domínio |
| `Error` | bug de programação (ex: `RangeError`, `StateError`) — não capturar em produção |
| `throw` | lança Exception ou Error |
| `try/catch/finally` | captura exceção; `finally` sempre executa |
| `on ExceptionType` | captura tipo específico — mais preciso que `catch (e)` genérico |
| **Result pattern** | sealed class com `Success` e `Failure` como alternativa ao throw |

## Exception genérica

<details>
<summary>❌ Bad — throw de string ou Exception genérica</summary>
<br>

```dart
Future<Order> findOrder(int id) async {
  final order = await _repository.findById(id);
  if (order == null) {
    throw Exception('Order not found');   // sem tipo específico
  }
  return order;
}
```

</details>

<br>

<details>
<summary>✅ Good — Exception subclassificada por tipo de erro</summary>
<br>

```dart
class OrderNotFoundException implements Exception {
  final int orderId;
  const OrderNotFoundException(this.orderId);

  @override
  String toString() => 'OrderNotFoundException: Order $orderId not found';
}

Future<Order> findOrder(int id) async {
  final order = await _repository.findById(id);
  if (order == null) throw OrderNotFoundException(id);

  return order;
}
```

</details>

## Erro silencioso

<details>
<summary>❌ Bad — catch engole sem log</summary>
<br>

```dart
Future<void> sendNotification(int userId) async {
  try {
    await _notificationService.send(userId);
  } catch (e) {
    // silêncio — falha invisível
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — log estruturado + decisão explícita de continuar</summary>
<br>

```dart
Future<void> sendNotification(int userId) async {
  try {
    await _notificationService.send(userId);
  } on NotificationException catch (e) {
    developer.log(
      'notification.failed',
      name: 'NotificationService',
      error: e,
    );
  }
}
```

</details>

## Captura por tipo específico

<details>
<summary>❌ Bad — catch genérico captura até Errors de programação</summary>
<br>

```dart
Future<Order?> processOrder(int orderId) async {
  try {
    return await _orderService.process(orderId);
  } catch (e) {
    return null;   // captura RangeError, StateError, etc. — bugs mascarados
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — on com tipo específico; re-throw o resto</summary>
<br>

```dart
Future<Order?> processOrder(int orderId) async {
  try {
    return await _orderService.process(orderId);
  } on OrderNotFoundException {
    return null;
  }
  // outros erros se propagam
}
```

</details>

## Result pattern com sealed class

<details>
<summary>❌ Bad — Exception para controle de fluxo no chamador</summary>
<br>

```dart
Future<void> submitOrder(OrderRequest request) async {
  try {
    final order = await _orderService.submit(request);
    showConfirmation(order);
  } on EmptyCartException {
    showError('Cart is empty');
  } on InsufficientCreditException {
    showError('Insufficient credit');
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — Result como valor; switch exaustivo no chamador</summary>
<br>

```dart
sealed class SubmitOrderResult {}
class SubmitSuccess extends SubmitOrderResult { final Order order; SubmitSuccess(this.order); }
class SubmitFailure extends SubmitOrderResult { final String reason; SubmitFailure(this.reason); }

Future<SubmitOrderResult> submitOrder(OrderRequest request) async { ... }

// consumo
final result = await _orderService.submitOrder(request);
switch (result) {
  case SubmitSuccess(:final order) => showConfirmation(order),
  case SubmitFailure(:final reason) => showError(reason),
}
```

</details>
