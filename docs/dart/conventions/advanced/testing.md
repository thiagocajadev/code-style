# Testing

> Escopo: Dart 3.7, package:test 1.25, mocktail 1.x.

Testes seguem o padrão AAA (Arrange, Act, Assert, Arrumar, Agir, Atestar) com fases explícitas. `package:test` é o
framework padrão. `mocktail` cria mocks sem geração de código (ao contrário de `mockito`).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert, Arrumar, Agir, Atestar) | estrutura que separa setup, execução e verificação |
| `package:test` | framework de testes nativo do Dart: `test()`, `group()`, `expect()` |
| `mocktail` | mocking sem geração de código; `when()`, `verify()`, `any()` |
| `setUp` / `tearDown` | executam antes e depois de cada teste no grupo |
| `isA<T>()` | matcher de tipo para verificação semântica |

## Fases misturadas — AAA

<details>
<summary>❌ Bad — setup, ação e assert misturados</summary>
<br>

```dart
test('findOrder', () async {
  final repo = MockOrderRepository();
  when(() => repo.findById(1)).thenAnswer((_) async => Order(id: 1, status: OrderStatus.paid));
  final service = OrderService(repo);
  expect((await service.find(1)).status, OrderStatus.paid);
});
```

</details>

<br>

<details>
<summary>✅ Good — AAA explícito com nomes expressivos</summary>
<br>

```dart
test('find returns paid order when order exists', () async {
  // Arrange
  final paidOrder = Order(id: 1, status: OrderStatus.paid);
  final repository = MockOrderRepository();
  when(() => repository.findById(1)).thenAnswer((_) async => paidOrder);
  final service = OrderService(repository);

  // Act
  final foundOrder = await service.find(1);

  // Assert
  expect(foundOrder.status, OrderStatus.paid);
});
```

</details>

## Grupos e nomes de teste

<details>
<summary>❌ Bad — nomes genéricos sem contexto</summary>
<br>

```dart
test('validate', () { ... });
test('test2', () { ... });
test('order', () { ... });
```

</details>

<br>

<details>
<summary>✅ Good — group + nome descreve comportamento</summary>
<br>

```dart
group('OrderService', () {
  group('validateOrder', () {
    test('fails with emptyCart when items list is empty', () { ... });
    test('succeeds when user has sufficient credit', () { ... });
    test('throws when rate is outside 0-1 range', () { ... });
  });
});
```

</details>

## Mock com mocktail

<details>
<summary>❌ Bad — implementação fake inline dificulta leitura</summary>
<br>

```dart
class FakeOrderRepository implements OrderRepository {
  @override
  Future<Order?> findById(int id) async => Order(id: id, status: OrderStatus.paid);
  @override
  Future<void> save(Order order) async {}
}
```

</details>

<br>

<details>
<summary>✅ Good — Mock com mocktail, comportamento declarado no teste</summary>
<br>

```dart
class MockOrderRepository extends Mock implements OrderRepository {}

test('find returns order when found', () async {
  // Arrange
  final repository = MockOrderRepository();
  final order = Order(id: 1, status: OrderStatus.paid);
  when(() => repository.findById(1)).thenAnswer((_) async => order);

  final service = OrderService(repository);

  // Act
  final result = await service.find(1);

  // Assert
  expect(result, order);
  verify(() => repository.findById(1)).called(1);
});
```

</details>

## Testes de stream

<details>
<summary>❌ Bad — listen manual sem controle de tempo</summary>
<br>

```dart
test('emits orders', () {
  final events = <List<Order>>[];
  orderStream.listen(events.add);
  // sem await — expect pode rodar antes dos eventos
  expect(events, isNotEmpty);
});
```

</details>

<br>

<details>
<summary>✅ Good — expectLater com emitsInOrder</summary>
<br>

```dart
test('countDown emits from 3 to 1', () async {
  final stream = countDown(3);

  await expectLater(stream, emitsInOrder([3, 2, 1, emitsDone]));
});
```

</details>

## setUp para estado compartilhado

<details>
<summary>❌ Bad — repositório e serviço recriados em cada teste</summary>
<br>

```dart
test('find succeeds', () async {
  final repo = MockOrderRepository();
  final service = OrderService(repo);
  when(() => repo.findById(any())).thenAnswer((_) async => Order(id: 1));
  // ...
});

test('find fails on null', () async {
  final repo = MockOrderRepository();   // duplicado
  final service = OrderService(repo);   // duplicado
  // ...
});
```

</details>

<br>

<details>
<summary>✅ Good — setUp inicializa uma vez por grupo</summary>
<br>

```dart
group('OrderService.find', () {
  late MockOrderRepository repository;
  late OrderService service;

  setUp(() {
    repository = MockOrderRepository();
    service = OrderService(repository);
  });

  test('returns order when found', () async { ... });
  test('throws OrderNotFoundException when not found', () async { ... });
});
```

</details>
