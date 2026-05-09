# Functions

> Escopo: Dart 3.7.

Dart tem funções de topo (top-level), métodos de classe e funções anônimas
(lambdas). Named parameters tornam as chamadas legíveis. Arrow functions (`=>`)
para corpo de uma única expressão.

## Conceitos fundamentais

| Conceito                              | O que é                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| **SLA** (Single Level of Abstraction) | uma função orquestra OU implementa, nunca os dois ao mesmo tempo       |
| **Explaining Return**                 | atribuir o resultado a uma `final` nomeada antes de retornar           |
| **named parameter**                   | parâmetro com rótulo na chamada; `{required T param}`                  |
| **arrow function**                    | `=>` para corpo de uma única expressão — sem `{ return }`              |
| **Stepdown Rule**                     | chamador visível antes do detalhe; helpers privados abaixo do chamador |

## God function — múltiplas responsabilidades

<details>
<summary>❌ Bad — busca, valida, calcula e persiste em uma função só</summary>
<br>

```dart
Future<Order> submitOrder(int userId, List<Item> items) async {
  final user = await _userRepository.findById(userId);
  if (user == null) throw UserNotFoundError(userId);

  if (items.isEmpty) throw EmptyCartError();

  var total = 0.0;
  for (final item in items) {
    if (item.stock <= 0) throw OutOfStockError(item.id);
    total += item.price * item.quantity;
  }

  if (user.creditLimit < total) throw InsufficientCreditError();

  final order = Order(userId: userId, items: items, total: total);
  await _orderRepository.save(order);
  await _notificationService.send(user.email, 'Order confirmed');

  return order;
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador limpo, detalhes em funções dedicadas</summary>
<br>

```dart
Future<Order> submitOrder(int userId, List<Item> items) async {
  final user = await _findActiveUser(userId);

  _validateCart(items);
  await _validateCredit(user, items);

  final order = _buildOrder(userId, items);

  await _persistOrder(order);
  await _notifyConfirmation(user.email);

  return order;
}

Future<User> _findActiveUser(int userId) async { ... }
void _validateCart(List<Item> items) { ... }

Future<void> _validateCredit(User user, List<Item> items) async { ... }
Order _buildOrder(int userId, List<Item> items) { ... }

Future<void> _persistOrder(Order order) async { ... }
Future<void> _notifyConfirmation(String email) async { ... }
```

</details>

## Sem lógica no retorno

<details>
<summary>❌ Bad — lógica inline no return</summary>
<br>

```dart
List<Customer> findActiveCustomers(List<Customer> customers) {
  return customers
      .where((c) => c.isActive && c.hasPendingOrders)
      .toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));
}
```

</details>

<br>

<details>
<summary>✅ Good — explaining return com final nomeada</summary>
<br>

```dart
List<Customer> findActiveCustomers(List<Customer> customers) {
  final activeCustomers = customers
      .where((c) => c.isActive && c.hasPendingOrders)
      .toList()
    ..sort((a, b) => a.lastName.compareTo(b.lastName));

  return activeCustomers;
}
```

</details>

## Named parameters

Named parameters tornam chamadas com múltiplos argumentos legíveis e resistentes
a erros de posição.

<details>
<summary>❌ Bad — parâmetros posicionais ambíguos</summary>
<br>

```dart
Order createOrder(int userId, int productId, int quantity, double discount) { ... }

createOrder(42, 100, 3, 0.15);   // qual é qual?
```

</details>

<br>

<details>
<summary>✅ Good — named parameters com required</summary>
<br>

```dart
Order createOrder({
  required int userId,
  required int productId,
  required int quantity,
  double discount = 0.0,
}) { ... }

createOrder(userId: 42, productId: 100, quantity: 3, discount: 0.15);
```

</details>

## Arrow functions — corpo de uma expressão

<details>
<summary>❌ Bad — bloco com return para corpo trivial</summary>
<br>

```dart
bool isPaidOrder(Order order) {
  return order.status == OrderStatus.paid;
}

List<String> getOrderIds(List<Order> orders) {
  return orders.map((order) {
    return order.id.toString();
  }).toList();
}
```

</details>

<br>

<details>
<summary>✅ Good — arrow para corpo de uma expressão</summary>
<br>

```dart
bool isPaidOrder(Order order) => order.status == OrderStatus.paid;

List<String> getOrderIds(List<Order> orders) =>
    orders.map((order) => order.id.toString()).toList();
```

</details>

## Extension para comportamento adicional

<details>
<summary>❌ Bad — função de utilitário sem contexto</summary>
<br>

```dart
// string_utils.dart
String formatCurrency(double value) => 'R\$ ${value.toStringAsFixed(2)}';

// uso
final label = formatCurrency(order.total);
```

</details>

<br>

<details>
<summary>✅ Good — extension method no tipo correto</summary>
<br>

```dart
extension DoubleFormatting on double {
  String toCurrencyLabel() => 'R\$ ${toStringAsFixed(2)}';
}

// uso
final label = order.total.toCurrencyLabel();
```

</details>
