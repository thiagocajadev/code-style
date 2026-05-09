# Null Safety

> Escopo: Dart 3.7. Null safety ativado por padrão desde Dart 2.12.

O sistema de tipos do Dart separa tipos anuláveis (`String?`) de não-anuláveis (`String`).
O compilador impede uso não-seguro de valores nullable. O operador `!` (null assertion) é o
único ponto de falha explícita e deve ser evitado em produção.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `T?` | tipo anulável; pode conter `null` |
| `?.` | safe member access — retorna `null` se receptor for `null` |
| `??` | **null-coalescing** — valor padrão quando `null` |
| `!` | null assertion — lança `Null check operator used on a null value`; evitar |
| `late` | variável não-nullable com inicialização postergada |
| `required` | named parameter obrigatório; não pode ser omitido na chamada |

## `!` em produção

<details>
<summary>❌ Bad — ! como atalho perigoso</summary>
<br>

```dart
Future<String> getCustomerEmail(int userId) async {
  final user = await _userRepository.findById(userId);
  return user!.email;   // crash sem mensagem útil se user for null
}
```

</details>

<br>

<details>
<summary>✅ Good — null-check explícito com throw expressivo</summary>
<br>

```dart
Future<String> getCustomerEmail(int userId) async {
  final user = await _userRepository.findById(userId);
  if (user == null) throw UserNotFoundException(userId);

  return user.email;
}
```

</details>

## Cadeia de safe calls

<details>
<summary>❌ Bad — null-checks aninhados</summary>
<br>

```dart
String getCity(Order? order) {
  if (order != null) {
    if (order.customer != null) {
      if (order.customer!.address != null) {
        return order.customer!.address!.city;
      }
    }
  }
  return 'Unknown';
}
```

</details>

<br>

<details>
<summary>✅ Good — safe call chain com ?? no final</summary>
<br>

```dart
String getCity(Order? order) {
  return order?.customer?.address?.city ?? 'Unknown';
}
```

</details>

## `late` para inicialização postergada garantida

<details>
<summary>❌ Bad — nullable onde o valor sempre existirá</summary>
<br>

```dart
class UserBloc {
  UserRepository? _repository;   // nullable, mas setUp sempre é chamado

  void setUp(UserRepository repository) {
    _repository = repository;
  }

  Future<User?> findUser(int id) => _repository!.findById(id);
}
```

</details>

<br>

<details>
<summary>✅ Good — late final declara intenção sem nullable</summary>
<br>

```dart
class UserBloc {
  late final UserRepository _repository;

  void setUp(UserRepository repository) {
    _repository = repository;
  }

  Future<User?> findUser(int id) => _repository.findById(id);
}
```

</details>

## `required` em named parameters

<details>
<summary>❌ Bad — parâmetro obrigatório nullable com verificação manual</summary>
<br>

```dart
class Order {
  final int? userId;
  final List<Item>? items;

  Order({this.userId, this.items});
}

// chamada não indica o que é obrigatório
final order = Order(userId: 42, items: [item]);
```

</details>

<br>

<details>
<summary>✅ Good — required para parâmetros obrigatórios</summary>
<br>

```dart
class Order {
  final int userId;
  final List<Item> items;

  const Order({required this.userId, required this.items});
}

final order = Order(userId: 42, items: [item]);
```

</details>

## Coleções — preferir vazio a nullable

<details>
<summary>❌ Bad — null para representar lista vazia</summary>
<br>

```dart
Future<List<Order>?> findOrdersByUser(int userId) async {
  final orders = await _repository.findByUserId(userId);
  return orders.isEmpty ? null : orders;
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia; null nunca representa ausência de itens</summary>
<br>

```dart
Future<List<Order>> findOrdersByUser(int userId) async {
  return _repository.findByUserId(userId);
}
```

</details>
