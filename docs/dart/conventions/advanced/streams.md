# Streams

> Escopo: Dart 3.7.

`Stream<T>` é a primitiva de sequências assíncronas no Dart. Um Stream emite zero ou mais
eventos ao longo do tempo e sinaliza conclusão ou erro no final. É a base do modelo reativo
de UI em Flutter e de I/O em Dart puro.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `Stream<T>` | sequência assíncrona de eventos do tipo `T` |
| **single-subscription** | um único listener; padrão para I/O (arquivo, socket) |
| **broadcast** | múltiplos listeners simultâneos; padrão para eventos de UI |
| `StreamController<T>` | fonte programática de eventos; expõe `.stream` e `.sink` |
| `StreamSubscription` | handle do listener; cancelar ao descartar o receptor |
| `async*` / `yield` | gerador assíncrono; produz eventos em uma função |
| `StreamTransformer` | operador que transforma o stream sem consumir |

## Single-subscription vs broadcast

<details>
<summary>❌ Bad — múltiplos listeners em single-subscription stream</summary>
<br>

```dart
final stream = File('data.json').openRead();

stream.listen((chunk) => processChunk(chunk));
stream.listen((chunk) => logChunk(chunk));   // StateError: Stream has already been listened to
```

</details>

<br>

<details>
<summary>✅ Good — broadcast para múltiplos listeners</summary>
<br>

```dart
final controller = StreamController<List<int>>.broadcast();

controller.stream.listen((chunk) => processChunk(chunk));
controller.stream.listen((chunk) => logChunk(chunk));

// emitir
controller.add(data);
```

</details>

## `async*` para gerador de stream

<details>
<summary>❌ Bad — StreamController manual para sequência simples</summary>
<br>

```dart
Stream<int> countDown(int from) {
  final controller = StreamController<int>();
  Timer.periodic(const Duration(seconds: 1), (timer) {
    if (from <= 0) {
      timer.cancel();
      controller.close();
    } else {
      controller.add(from--);
    }
  });
  return controller.stream;
}
```

</details>

<br>

<details>
<summary>✅ Good — async* é mais legível e gerencia ciclo de vida automaticamente</summary>
<br>

```dart
Stream<int> countDown(int from) async* {
  for (var i = from; i > 0; i--) {
    await Future.delayed(const Duration(seconds: 1));
    yield i;
  }
}
```

</details>

## Cancelamento de subscription

<details>
<summary>❌ Bad — subscription sem cancelamento — memory leak</summary>
<br>

```dart
class OrderWidget extends StatefulWidget { ... }

class _OrderWidgetState extends State<OrderWidget> {
  @override
  void initState() {
    super.initState();
    orderStream.listen((orders) => setState(() => _orders = orders));
    // subscription nunca cancelada
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — subscription cancelada no dispose</summary>
<br>

```dart
class _OrderWidgetState extends State<OrderWidget> {
  late StreamSubscription<List<Order>> _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = orderStream.listen((orders) {
      setState(() => _orders = orders);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
```

</details>

## Transformações de stream

```dart
// map: transforma cada evento
final nameStream = orderStream.map((order) => order.customerName);

// where: filtra eventos
final paidStream = orderStream.where((order) => order.isPaid);

// expand: um evento → múltiplos eventos
final itemStream = orderStream.expand((order) => order.items);

// asyncMap: transformação assíncrona
final enrichedStream = orderStream.asyncMap(
  (order) async => enrichOrderWithCustomer(order),
);

// debounce (com rxdart ou implementação manual)
final debouncedStream = searchStream.debounceTime(
  const Duration(milliseconds: 300),
);
```

## StreamController com fechamento correto

<details>
<summary>❌ Bad — controller nunca fechado</summary>
<br>

```dart
class EventBus {
  final _controller = StreamController<AppEvent>.broadcast();
  Stream<AppEvent> get events => _controller.stream;

  void emit(AppEvent event) => _controller.add(event);
  // sem dispose — stream nunca fecha
}
```

</details>

<br>

<details>
<summary>✅ Good — dispose fecha o controller</summary>
<br>

```dart
class EventBus {
  final _controller = StreamController<AppEvent>.broadcast();
  Stream<AppEvent> get events => _controller.stream;

  void emit(AppEvent event) => _controller.add(event);

  Future<void> dispose() => _controller.close();
}
```

</details>
