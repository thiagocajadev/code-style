# Variables

> Escopo: Dart 3.7.

Dart oferece três níveis de imutabilidade: `const` (compilação), `final` (runtime, uma atribuição),
e `var` (mutável). Prefira `final` em todo lugar e escreva `var` somente quando o fluxo exige
reatribuição.

## `var` onde `final` resolve

<details>
<summary>❌ Bad — var desnecessário</summary>
<br>

```dart
var total = 0.0;
total = items.fold(0, (sum, item) => sum + item.price);

var isActive = false;
isActive = user.status == 'active';
```

</details>

<br>

<details>
<summary>✅ Good — final com inicialização direta</summary>
<br>

```dart
final total = items.fold(0.0, (sum, item) => sum + item.price);

final isActive = user.status == 'active';
```

</details>

## `const` para constantes de compilação

<details>
<summary>❌ Bad — número mágico inline</summary>
<br>

```dart
bool shouldRetry(int attempt) {
  return attempt < 3;
}
```

</details>

<br>

<details>
<summary>✅ Good — constante nomeada com intenção</summary>
<br>

```dart
const maxRetries = 3;

bool shouldRetry(int attempt) {
  return attempt < maxRetries;
}
```

</details>

## `late` para inicialização postergada

<details>
<summary>❌ Bad — nullable onde o valor sempre existirá</summary>
<br>

```dart
class OrderService {
  OrderRepository? _repository;   // nullable, mas nunca será null após setUp

  void setUp(OrderRepository repository) {
    _repository = repository;
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — late final declara intenção sem nullable</summary>
<br>

```dart
class OrderService {
  late final OrderRepository _repository;

  void setUp(OrderRepository repository) {
    _repository = repository;
  }
}
```

</details>

## Valores mágicos

<details>
<summary>❌ Bad — literais inline sem contexto</summary>
<br>

```dart
if (user.role == 'admin') { ... }

await Future.delayed(const Duration(seconds: 5));

final discount = price * 0.15;
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas com intenção</summary>
<br>

```dart
const adminRole = 'admin';
const retryDelay = Duration(seconds: 5);
const seasonalDiscountRate = 0.15;

if (user.role == adminRole) { ... }

await Future.delayed(retryDelay);

final discount = price * seasonalDiscountRate;
```

</details>

## Type inference vs anotação explícita

Prefira inferência quando o tipo é óbvio pela atribuição. Anote explicitamente em parâmetros de
função e em declarações públicas de API.

<details>
<summary>❌ Bad — anotação redundante em variável local</summary>
<br>

```dart
final List<String> names = ['Alice', 'Bob'];
final String greeting = 'Hello';
final int count = items.length;
```

</details>

<br>

<details>
<summary>✅ Good — inferência onde é óbvio; anotação em APIs</summary>
<br>

```dart
final names = ['Alice', 'Bob'];       // List<String> inferido
final greeting = 'Hello';            // String inferido
final count = items.length;          // int inferido

// API pública: anotação explícita
List<Order> findActiveOrders(int userId) { ... }
```

</details>
