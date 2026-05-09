# Visual Density

> Escopo: Dart 3.7.

Densidade visual é o sinal de intenção no código. Uma linha em branco separa
grupos lógicos. Zero linhas dentro de um grupo. Nunca duas linhas em branco
consecutivas.

## Parede de código

<details>
<summary>❌ Bad — sem separação entre fases</summary>
<br>

```dart
Future<Receipt> processPayment(PaymentRequest request) async {
  final user = await _userRepository.findById(request.userId);
  if (user == null) throw UserNotFoundError(request.userId);
  final method = await _paymentMethodRepository.findById(request.methodId);
  if (method == null) throw InvalidPaymentMethodError(request.methodId);
  if (method.isExpired) throw ExpiredPaymentMethodError();
  final charge = await _chargeGateway.charge(method, request.amount);
  final receipt = Receipt(userId: request.userId, amount: request.amount, chargeId: charge.id);
  await _receiptRepository.save(receipt);
  return receipt;
}
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas por linha em branco</summary>
<br>

```dart
Future<Receipt> processPayment(PaymentRequest request) async {
  final user = await _userRepository.findById(request.userId);
  if (user == null) throw UserNotFoundError(request.userId);

  final method = await _paymentMethodRepository.findById(request.methodId);
  if (method == null) throw InvalidPaymentMethodError(request.methodId);

  if (method.isExpired) throw ExpiredPaymentMethodError();

  final charge = await _chargeGateway.charge(method, request.amount);

  final receipt = Receipt(
    userId: request.userId,
    amount: request.amount,
    chargeId: charge.id,
  );

  await _receiptRepository.save(receipt);
  return receipt;
}
```

</details>

## Explaining Return — tight

<details>
<summary>❌ Bad — blank entre final e return</summary>
<br>

```dart
String buildWelcomeMessage(User user) {
  final greeting = 'Hello, ${user.firstName}! Your account is ready.';

  return greeting;
}
```

</details>

<br>

<details>
<summary>✅ Good — final + return sem blank (explaining return tight)</summary>
<br>

```dart
String buildWelcomeMessage(User user) {
  final greeting = 'Hello, ${user.firstName}! Your account is ready.';
  return greeting;
}
```

</details>

## Chains longas

<details>
<summary>❌ Bad — chain em uma linha só</summary>
<br>

```dart
final result = orders.where((o) => o.isPaid).toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));
```

</details>

<br>

<details>
<summary>✅ Good — uma operação por linha</summary>
<br>

```dart
final recentPaidOrders = orders
    .where((o) => o.isPaid)
    .toList()
  ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

final recentPaid = recentPaidOrders.take(5).toList();
return recentPaid;
```

</details>

## Construção de objetos — sem lógica inline

<details>
<summary>❌ Bad — lógica embutida no construtor</summary>
<br>

```dart
return Order(
  userId: userId,
  items: items.where((i) => i.stock > 0).toList(),
  total: items.where((i) => i.stock > 0).fold(0.0, (s, i) => s + i.price),
  createdAt: DateTime.now(),
);
```

</details>

<br>

<details>
<summary>✅ Good — lógica extraída antes da construção</summary>
<br>

```dart
final availableItems = items.where((i) => i.stock > 0).toList();
final total = availableItems.fold(0.0, (sum, item) => sum + item.price);

final order = Order(
  userId: userId,
  items: availableItems,
  total: total,
  createdAt: DateTime.now(),
);

return order;
```

</details>

## Cascade (`..`) com moderação

Cascade é idiomático para configuração de objetos. Evitar quando as operações
têm efeitos colaterais não óbvios.

<details>
<summary>❌ Bad — cascade misturado com lógica</summary>
<br>

```dart
final buffer = StringBuffer()
  ..write(header)
  ..write(items.isEmpty ? 'No items' : items.map((i) => i.name).join(', '))
  ..writeln()
  ..write(footer);
```

</details>

<br>

<details>
<summary>✅ Good — lógica extraída; cascade apenas para operações de configuração</summary>
<br>

```dart
final itemsLine = items.isEmpty ? 'No items' : items.map((i) => i.name).join(', ');

final buffer = StringBuffer()
  ..write(header)
  ..write(itemsLine)
  ..writeln()
  ..write(footer);
```

</details>
