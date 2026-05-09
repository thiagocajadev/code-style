# Validation

> Escopo: Dart 3.7.

Validação acontece na fronteira — entrada do usuário, payload de API, parâmetros de use case.
Dentro do domínio, `assert` garante invariantes em desenvolvimento. `ArgumentError.checkNotNull`
e verificações explícitas com `throw` atuam em produção.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `assert` | verificação de invariante removida em produção — só em debug/test |
| `ArgumentError` | erro de argumento inválido; subclasse de `Error` (bug de chamada) |
| `StateError` | estado inválido do objeto; invariante quebrada |
| **fronteira de validação** | ponto onde dados externos entram no sistema |
| **domain invariant** | regra que deve ser verdadeira em qualquer estado válido do objeto |

## Validação espalhada pela lógica

<details>
<summary>❌ Bad — guards espalhados ao longo da função de negócio</summary>
<br>

```dart
Future<Order> processOrder({
  required int userId,
  required List<Item> items,
  required double discount,
}) async {
  final user = await _userRepository.findById(userId);

  if (items.isEmpty) throw EmptyCartException();

  final total = items.fold(0.0, (s, i) => s + i.price);

  if (discount < 0 || discount > 1) throw InvalidDiscountException(discount);

  final finalTotal = total * (1 - discount);

  return Order(userId: userId, items: items, total: finalTotal);
}
```

</details>

<br>

<details>
<summary>✅ Good — validação em init, lógica limpa na função</summary>
<br>

```dart
class ProcessOrderRequest {
  final int userId;
  final List<Item> items;
  final double discount;

  ProcessOrderRequest({
    required this.userId,
    required this.items,
    required this.discount,
  }) {
    if (items.isEmpty) throw ArgumentError('Order must contain at least one item');
    if (discount < 0 || discount > 1) {
      throw ArgumentError.value(discount, 'discount', 'Must be between 0 and 1');
    }
  }
}

Future<Order> processOrder(ProcessOrderRequest request) async {
  final total = request.items.fold(0.0, (s, i) => s + i.price);
  final finalTotal = total * (1 - request.discount);

  final order = Order(userId: request.userId, items: request.items, total: finalTotal);
  return order;
}
```

</details>

## Acumulação de erros de formulário

<details>
<summary>❌ Bad — para no primeiro erro (usuário corrige um por vez)</summary>
<br>

```dart
String? validateProfile(UserProfile profile) {
  if (profile.name.isEmpty) return 'Name is required';
  if (!profile.email.contains('@')) return 'Invalid email';
  if (profile.age < 18) return 'Must be 18 or older';
  return null;
}
```

</details>

<br>

<details>
<summary>✅ Good — acumula todos os erros</summary>
<br>

```dart
sealed class ProfileError {}
class EmptyName extends ProfileError {}
class InvalidEmail extends ProfileError {}
class Underage extends ProfileError {}

List<ProfileError> validateProfile(UserProfile profile) {
  final profileErrors = [
    if (profile.name.isEmpty) EmptyName(),
    if (!profile.email.contains('@')) InvalidEmail(),
    if (profile.age < 18) Underage(),
  ];
  return profileErrors;
}

// uso
final errors = validateProfile(profile);
if (errors.isNotEmpty) {
  showErrors(errors);
  return;
}
```

</details>

## `assert` para invariantes de desenvolvimento

<details>
<summary>❌ Bad — throw em código que nunca chegará em produção</summary>
<br>

```dart
double applyDiscount(double price, double rate) {
  if (rate < 0 || rate > 1) throw StateError('Rate must be between 0 and 1');
  return price * (1 - rate);
}
```

</details>

<br>

<details>
<summary>✅ Good — assert em invariantes; validação real no construtor da request</summary>
<br>

```dart
double applyDiscount(double price, double rate) {
  assert(rate >= 0 && rate <= 1, 'Discount rate must be between 0 and 1, got $rate');
  assert(price >= 0, 'Price must be non-negative, got $price');

  final discountedPrice = price * (1 - rate);
  return discountedPrice;
}
```

</details>
