# Async

> Escopo: Dart 3.7.

`async`/`await` é a forma idiomática de escrever código assíncrono em Dart. `Future<T>`
representa um valor único que estará disponível no futuro. `Future.wait` paraleliza múltiplas
operações. `unawaited` marca fire-and-forget intencional.

→ Streams e sequências assíncronas: [streams.md](streams.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Future<T>` | valor assíncrono único; completa com sucesso ou erro |
| `async`/`await` | marca função como assíncrona; `await` suspende sem bloquear a thread |
| `Future.wait` | aguarda múltiplos Futures em paralelo; falha se qualquer um falhar |
| `unawaited` | fire-and-forget explícito; suprime lint `unawaited_futures` |
| `Completer<T>` | cria Future manualmente para integração com APIs de callback |
| `FutureOr<T>` | aceita valor síncrono ou Future — usado em APIs que podem ser ambas |

## `await` sequencial quando paralelismo é possível

<details>
<summary>❌ Bad — awaits em série sem necessidade de ordem</summary>
<br>

```dart
Future<Dashboard> loadDashboard(int userId) async {
  final orders = await _orderRepository.findByUser(userId);
  final profile = await _profileRepository.findById(userId);   // espera orders terminar

  return Dashboard(orders: orders, profile: profile);
}
```

</details>

<br>

<details>
<summary>✅ Good — Future.wait executa em paralelo</summary>
<br>

```dart
Future<Dashboard> loadDashboard(int userId) async {
  final results = await Future.wait([
    _orderRepository.findByUser(userId),
    _profileRepository.findById(userId),
  ]);

  final dashboard = Dashboard(
    orders: results[0] as List<Order>,
    profile: results[1] as UserProfile,
  );

  return dashboard;
}
```

</details>

## `unawaited` para fire-and-forget intencional

<details>
<summary>❌ Bad — await esquecido ou Future ignorado sem intenção clara</summary>
<br>

```dart
void confirmOrder(Order order) async {
  await _orderRepository.save(order);
  _analyticsService.track('order.confirmed', orderId: order.id);   // ⚠️ unawaited_futures lint
}
```

</details>

<br>

<details>
<summary>✅ Good — unawaited declara a intenção de não esperar</summary>
<br>

```dart
import 'dart:async' show unawaited;

void confirmOrder(Order order) async {
  await _orderRepository.save(order);
  unawaited(_analyticsService.track('order.confirmed', orderId: order.id));
}
```

</details>

## `Completer` para integração com callbacks

<details>
<summary>❌ Bad — callback exposto ao chamador sem Future</summary>
<br>

```dart
void fetchUser(int id, void Function(User) onSuccess, void Function(Object) onError) {
  _httpClient.get('/users/$id', onSuccess, onError);
}
```

</details>

<br>

<details>
<summary>✅ Good — Completer wraps callback em Future</summary>
<br>

```dart
Future<User> fetchUser(int id) {
  final completer = Completer<User>();

  _httpClient.get(
    '/users/$id',
    onSuccess: completer.complete,
    onError: completer.completeError,
  );

  return completer.future;
}
```

</details>

## Timeout em operações externas

<details>
<summary>❌ Bad — sem limite de tempo em chamada externa</summary>
<br>

```dart
Future<double> fetchExchangeRate(String currency) async {
  final rate = await _httpClient.get('/rates/$currency');
  return rate.value;
}
```

</details>

<br>

<details>
<summary>✅ Good — timeout cancela se exceder o prazo</summary>
<br>

```dart
Future<double> fetchExchangeRate(String currency) async {
  final response = await _httpClient
      .get('/rates/$currency')
      .timeout(const Duration(seconds: 3));

  return response.value;
}
```

</details>

## Tratamento de erro em async

<details>
<summary>❌ Bad — catchError com tipo Any</summary>
<br>

```dart
Future<Order> findOrder(int id) {
  return _repository.findById(id).catchError((e) {
    return Order.empty();   // engole qualquer erro, retorna dado inválido
  });
}
```

</details>

<br>

<details>
<summary>✅ Good — try/catch com tipo explícito</summary>
<br>

```dart
Future<Order?> findOrder(int id) async {
  try {
    return await _repository.findById(id);
  } on OrderNotFoundException {
    return null;
  }
}
```

</details>
