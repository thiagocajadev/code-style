# Naming

> Escopo: Dart 3.7.

Nomes bons tornam comentários desnecessários. Dart usa `camelCase` para identificadores e
`snake_case` para arquivos. O prefixo `_` é o único mecanismo de visibilidade de biblioteca
— não há `private` por classe.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```dart
dynamic apply(dynamic x, Map<String, dynamic> p, Function c) {
  if (p['inadimplente'] == true) return null;
  return c(x);
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```dart
Order? applyDiscount(Order order, Order Function(Order) calculate) {
  if (order.customer.hasDefaulted) return null;

  final discountedOrder = calculate(order);
  return discountedOrder;
}
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — identificadores em português ficam desajeitados no idioma Dart</summary>
<br>

```dart
final nomeDoUsuario = 'Alice';
final listaDeIds = [1, 2, 3];

User? retornaUsuario(int id) { ... }
Address? buscaEnderecoDoCliente(int id) { ... }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```dart
final userName = 'Alice';
final idList = [1, 2, 3];

User? findUser(int userId) { ... }
Address? findCustomerAddress(int customerId) { ... }
```

</details>

## Convenções de case

| Contexto | Convenção | Exemplos |
| --- | --- | --- |
| Classes, enums, typedefs, extensions | `UpperCamelCase` | `OrderService`, `PaymentResult` |
| Funções, métodos, variáveis, parâmetros | `camelCase` | `calculateTotal`, `isActive` |
| Constantes | `camelCase` | `maxRetries`, `defaultTimeout` |
| Arquivos e diretórios | `snake_case` | `order_service.dart`, `payment_result.dart` |
| Privado à biblioteca | prefixo `_` | `_userId`, `_buildHeader()` |

<details>
<summary>❌ Bad — case errado</summary>
<br>

```dart
const MAX_RETRIES = 3;          // SCREAMING_SNAKE não é idiomático em Dart
class order_service {}          // classe com snake_case
void Calculate_Total() {}       // função com underscore
```

</details>

<br>

<details>
<summary>✅ Good — convenções Dart respeitadas</summary>
<br>

```dart
const maxRetries = 3;

class OrderService {}

double calculateTotal(List<Item> items) { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```dart
final loading = true;
final active = user.status == 'active';
final valid = email.contains('@');
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```dart
final isActive = user.status == 'active';
final hasPermission = user.roles.contains('admin');

final canDelete = isActive && hasPermission;
final shouldRetry = attempt < maxRetries;
```

</details>

## Domain-first naming

<details>
<summary>❌ Bad — nome revela infraestrutura</summary>
<br>

```dart
Future<void> callStripe(double amount) async { ... }
Future<User?> getUserFromDB(int userId) async { ... }
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```dart
Future<void> chargeCustomer(double amount) async { ... }
Future<User?> findUser(int userId) async { ... }
```

</details>

## Prefixo `_` para membro privado

<details>
<summary>❌ Bad — membro público que não faz parte da API</summary>
<br>

```dart
class OrderService {
  final OrderRepository repository;   // exposto ao barrel
  double calculateSubtotal(List<Item> items) { ... }   // detalhe interno exposto
}
```

</details>

<br>

<details>
<summary>✅ Good — `_` sinaliza que é detalhe de implementação</summary>
<br>

```dart
class OrderService {
  final OrderRepository _repository;

  double _calculateSubtotal(List<Item> items) { ... }
}
```

</details>
