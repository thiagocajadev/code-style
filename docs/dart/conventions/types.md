# Types

> Escopo: Dart 3.7.

Dart é orientado a objetos com null safety completo. Classes modelam entidades. Mixins
adicionam comportamento sem herança. Sealed classes (Dart 3+) fecham hierarquias de estado.
Records (Dart 3+) criam tipos de produto imutáveis sem boilerplate.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `class` | tipo com estado e comportamento; herança simples |
| `abstract class` / `interface` | contrato com ou sem implementação padrão |
| `mixin` | comportamento reutilizável aplicado com `with`; sem estado próprio preferível |
| `sealed class` | hierarquia fechada (Dart 3+); switch é exaustivo sem `default` |
| `record` | tipo de produto imutável inline (Dart 3+): `(String name, int age)` |
| `extension` | adiciona métodos a tipos existentes sem herança |
| `enum` | conjunto fixo de valores; pode ter métodos e campos |

## Sealed class para estados e resultados

<details>
<summary>❌ Bad — String como discriminante de estado</summary>
<br>

```dart
class OrderResult {
  final String status;   // 'success', 'error', 'pending' — sem garantia de exaustividade
  final Order? order;
  final String? errorMessage;

  const OrderResult({required this.status, this.order, this.errorMessage});
}
```

</details>

<br>

<details>
<summary>✅ Good — sealed class com switch exaustivo</summary>
<br>

```dart
sealed class OrderResult {}

class OrderSuccess extends OrderResult {
  final Order order;
  OrderSuccess(this.order);
}

class OrderFailure extends OrderResult {
  final String reason;
  OrderFailure(this.reason);
}

class OrderPending extends OrderResult {}

// switch exaustivo — novo subtipo é erro de compilação sem o case
String describeResult(OrderResult result) {
  return switch (result) {
    OrderSuccess(:final order) => 'Order ${order.id} confirmed',
    OrderFailure(:final reason) => 'Failed: $reason',
    OrderPending() => 'Processing...',
  };
}
```

</details>

## Records para tipos de produto simples

<details>
<summary>❌ Bad — classe com boilerplate para par de valores</summary>
<br>

```dart
class Coordinate {
  final double latitude;
  final double longitude;
  const Coordinate(this.latitude, this.longitude);
}
```

</details>

<br>

<details>
<summary>✅ Good — record: imutável, destructuring, equals automático</summary>
<br>

```dart
typedef Coordinate = ({double latitude, double longitude});

final location = (latitude: -23.5, longitude: -46.6);

final (latitude: lat, longitude: lng) = location;   // destructuring
```

</details>

## Mixin para comportamento reutilizável

<details>
<summary>❌ Bad — herança para compartilhar comportamento</summary>
<br>

```dart
abstract class BaseRepository {
  void logQuery(String query) { ... }
}

class OrderRepository extends BaseRepository { ... }
class UserRepository extends BaseRepository { ... }
```

</details>

<br>

<details>
<summary>✅ Good — mixin compartilha comportamento sem acoplamento de hierarquia</summary>
<br>

```dart
mixin Loggable {
  void logQuery(String query) {
    developer.log('query: $query', name: runtimeType.toString());
  }
}

class OrderRepository with Loggable { ... }
class UserRepository with Loggable { ... }
```

</details>

## Extension para comportamento adicional

<details>
<summary>❌ Bad — método utilitário em classe separada</summary>
<br>

```dart
class OrderUtils {
  static bool isPaidAndRecent(Order order) {
    return order.isPaid && order.createdAt.isAfter(cutoff);
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — extension no tipo correto</summary>
<br>

```dart
extension OrderFiltering on Order {
  bool isPaidAndRecent(DateTime cutoff) {
    return isPaid && createdAt.isAfter(cutoff);
  }
}

// uso
final recentPaid = orders.where((o) => o.isPaidAndRecent(cutoff)).toList();
```

</details>

## Enum com métodos

<details>
<summary>❌ Bad — switch de string para mapeamento de enum</summary>
<br>

```dart
String getStatusLabel(String status) {
  if (status == 'pending') return 'Waiting for payment';
  if (status == 'paid') return 'Payment confirmed';
  return 'Unknown';
}
```

</details>

<br>

<details>
<summary>✅ Good — enum com getter carrega o comportamento</summary>
<br>

```dart
enum OrderStatus {
  pending,
  paid,
  shipped,
  delivered;

  String get label => switch (this) {
    pending => 'Waiting for payment',
    paid => 'Payment confirmed',
    shipped => 'On the way',
    delivered => 'Delivered',
  };
}

// uso
final label = order.status.label;
```

</details>
