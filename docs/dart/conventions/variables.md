# Variables

> Escopo: Dart 3.7.

Dart oferece três níveis de imutabilidade: `const` (compilação), `final` (runtime, uma atribuição),
e `var` (referência pode ser alterada). Prefira `final` em todo lugar e escreva `var` somente
quando o fluxo exige reatribuição.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **var** (referência alterável) | declara variável cuja referência pode ser reatribuída depois |
| **final** (uma atribuição) | referência atribuída uma única vez em runtime; não pode ser reatribuída |
| **const** (constante de compilação) | valor resolvido em tempo de compilação; canonicalizado pelo compilador |
| **late** (inicialização postergada) | declara não-nullable inicializado depois da declaração; falha se lido antes |
| **nullable type** (tipo anulável) | sufixo `?` permite `null`; sem sufixo, nunca pode ser `null` |
| **type inference** (inferência de tipo) | compilador deduz o tipo a partir da inicialização; reduz ruído em locais |

## `var` onde `final` resolve

<details>
<summary>❌ Ruim: var desnecessário</summary>

```dart
var total = 0.0;
total = items.fold(0, (sum, item) => sum + item.price);

var isActive = false;
isActive = user.status == 'active';
```

</details>

<details>
<summary>✅ Bom: final com inicialização direta</summary>

```dart
final total = items.fold(0.0, (sum, item) => sum + item.price);

final isActive = user.status == 'active';
```

</details>

## `const` para constantes de compilação

<details>
<summary>❌ Ruim: número mágico inline</summary>

```dart
bool shouldRetry(int attempt) {
  return attempt < 3;
}
```

</details>

<details>
<summary>✅ Bom: constante nomeada com intenção</summary>

```dart
const maxRetries = 3;

bool shouldRetry(int attempt) {
  return attempt < maxRetries;
}
```

</details>

## `late` para inicialização postergada

<details>
<summary>❌ Ruim: nullable onde o valor sempre existirá</summary>

```dart
class OrderService {
  OrderRepository? _repository;   // nullable, mas nunca será null após setUp

  void setUp(OrderRepository repository) {
    _repository = repository;
  }
}
```

</details>

<details>
<summary>✅ Bom: late final declara intenção sem nullable</summary>

```dart
class OrderService {
  late final OrderRepository _repository;

  void setUp(OrderRepository repository) {
    _repository = repository;
  }
}
```

</details>

<a id="magic-values"></a>

## Valores mágicos

<details>
<summary>❌ Ruim: literais inline sem contexto</summary>

```dart
if (user.role == 'admin') { ... }

await Future.delayed(const Duration(seconds: 5));

final discount = price * 0.15;
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas com intenção</summary>

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
<summary>❌ Ruim: anotação redundante em variável local</summary>

```dart
final List<String> names = ['Alice', 'Bob'];
final String greeting = 'Hello';
final int count = items.length;
```

</details>

<details>
<summary>✅ Bom: inferência onde é óbvio; anotação em APIs</summary>

```dart
final names = ['Alice', 'Bob'];       // List<String> inferido
final greeting = 'Hello';            // String inferido
final count = items.length;          // int inferido

// API pública: anotação explícita
List<Order> findActiveOrders(int userId) { ... }
```

</details>
