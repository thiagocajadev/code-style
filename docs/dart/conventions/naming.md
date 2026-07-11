# Naming

> Escopo: Dart 3.7.

Nomes bons tornam comentários desnecessários. Dart usa `camelCase` para identificadores e
`snake_case` para arquivos. O prefixo `_` é o único mecanismo de visibilidade de biblioteca:
não há `private` por classe.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **lowerCamelCase** (camelo minúsculo) | funções, métodos, variáveis, parâmetros e constantes; primeira letra minúscula |
| **UpperCamelCase** (camelo maiúsculo) | classes, enums, typedefs e extensions; primeira letra maiúscula |
| **lowercase_with_underscores** (minúsculas com sublinhado) | nomes de arquivos, diretórios e bibliotecas Dart |
| **library privacy** (privacidade de biblioteca) | prefixo `_` torna o membro privado à biblioteca; único mecanismo de visibilidade |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `can`, `should` revelam intenção em variáveis e métodos lógicos |
| **domain-first naming** (nome do domínio primeiro) | nome reflete o conceito de negócio, não a infraestrutura (`chargeCustomer` vs `callStripe`) |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```dart
dynamic apply(dynamic x, Map<String, dynamic> p, Function c) {
  if (p['inadimplente'] == true) return null;
  return c(x);
}
```

</details>

<details>
<summary>✅ Bom</summary>

```dart
Order? applyDiscount(Order order, Order Function(Order) calculate) {
  if (order.customer.hasDefaulted) return null;

  final discountedOrder = calculate(order);
  return discountedOrder;
}
```

</details>

<a id="portuguese-names"></a>

## Nomes em português

<details>
<summary>❌ Ruim: identificadores em português ficam desajeitados no idioma Dart</summary>

```dart
final nomeDoUsuario = 'Alice';
final listaDeIds = [1, 2, 3];

User? retornaUsuario(int id) { ... }
Address? buscaEnderecoDoCliente(int id) { ... }
```

</details>

<details>
<summary>✅ Bom: inglês: curto, direto, universal</summary>

```dart
final userName = 'Alice';
final idList = [1, 2, 3];

User? findUser(int userId) { ... }
Address? findCustomerAddress(int customerId) { ... }
```

</details>

<a id="case-conventions"></a>

## Convenções de case

| Contexto | Convenção | Exemplos |
| --- | --- | --- |
| Classes, enums, typedefs, extensions | `UpperCamelCase` | `OrderService`, `PaymentResult` |
| Funções, métodos, variáveis, parâmetros | `camelCase` | `calculateTotal`, `isActive` |
| Constantes | `camelCase` | `maxRetries`, `defaultTimeout` |
| Arquivos e diretórios | `snake_case` | `order_service.dart`, `payment_result.dart` |
| Privado à biblioteca | prefixo `_` | `_userId`, `_buildHeader()` |

<details>
<summary>❌ Ruim: case errado</summary>

```dart
const MAX_RETRIES = 3;          // SCREAMING_SNAKE não é idiomático em Dart
class order_service {}          // classe com snake_case
void Calculate_Total() {}       // função com underscore
```

</details>

<details>
<summary>✅ Bom: convenções Dart respeitadas</summary>

```dart
const maxRetries = 3;

class OrderService {}

double calculateTotal(List<Item> items) { ... }
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```dart
final loading = true;
final active = user.status == 'active';
final valid = email.contains('@');
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

```dart
final isActive = user.status == 'active';
final hasPermission = user.roles.contains('admin');

final canDelete = isActive && hasPermission;
final shouldRetry = attempt < maxRetries;
```

</details>

## Domain-first naming

<details>
<summary>❌ Ruim: nome revela infraestrutura</summary>

```dart
Future<void> callStripe(double amount) async { ... }
Future<User?> getUserFromDB(int userId) async { ... }
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```dart
Future<void> chargeCustomer(double amount) async { ... }
Future<User?> findUser(int userId) async { ... }
```

</details>

## Prefixo `_` para membro privado

<details>
<summary>❌ Ruim: membro público que não faz parte da API</summary>

```dart
class OrderService {
  final OrderRepository repository;   // exposto ao barrel
  double calculateSubtotal(List<Item> items) { ... }   // detalhe interno exposto
}
```

</details>

<details>
<summary>✅ Bom: `_` sinaliza que é detalhe de implementação</summary>

```dart
class OrderService {
  final OrderRepository _repository;

  double _calculateSubtotal(List<Item> items) { ... }
}
```

</details>
