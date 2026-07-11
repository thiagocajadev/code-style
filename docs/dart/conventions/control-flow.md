# Control Flow

> Escopo: Dart 3.7.

Fluxo limpo sai cedo na falha, nunca aninha o caminho feliz. `switch` como expressão (Dart 3+)
substitui chains de `if/else if`. `?.` e `??` eliminam null-checks verbosos. Máximo dois níveis
de indentação.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `if` no topo da função que retorna cedo em caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | sair da função assim que o resultado for conhecido, sem `else` desnecessário |
| **ternary** (ternário) | `cond ? a : b`; expressão condicional curta para 2 alternativas |
| **switch expression** (expressão switch) | `switch` como expressão (Dart 3+) com pattern matching e exaustividade |
| **pattern matching** (correspondência por padrão) | desestruturar e casar valores em `switch` ou `if-case` |
| **null-coalescing** (coalescência de ausente) | `??` retorna o primeiro valor não-nulo; `?.` faz acesso seguro |
| **lookup map** (mapa de busca) | `Map` que substitui cadeias de `if/else` quando as chaves são dinâmicas |

## if e else

O ponto de partida. Para dois caminhos, `if/else` funciona. O `else` após um `return` é ruído:
o compilador já descartou o branch anterior.

<details>
<summary>❌ Ruim: else desnecessário após return</summary>

```dart
double getDiscount(CustomerType type) {
  if (type == CustomerType.vip) {
    return 0.20;
  } else if (type == CustomerType.premium) {
    return 0.10;
  } else {
    return 0.0;
  }
}
```

</details>

<details>
<summary>✅ Bom: early return elimina o else</summary>

```dart
double getDiscount(CustomerType type) {
  if (type == CustomerType.vip) return 0.20;
  if (type == CustomerType.premium) return 0.10;

  return 0.0;
}
```

</details>

## Ternário: atribuição de 2 valores

Ternário `? :` somente para atribuição de 2 valores em uma linha. Três ou mais alternativas
→ `switch` expression. Nunca aninhar ternários.

<details>
<summary>❌ Ruim: if/else imperativo para atribuição simples</summary>

```dart
String label;
if (order.isSettled) {
  label = 'Settled';
} else {
  label = 'Pending';
}
```

</details>

<details>
<summary>✅ Bom: ternário na atribuição</summary>

```dart
final label = order.isSettled ? 'Settled' : 'Pending';
```

</details>

<details>
<summary>❌ Ruim: ternário aninhado para 3+ alternativas</summary>

```dart
final priority = isUrgent ? isCritical ? 'Critical' : 'High' : 'Normal';
```

</details>

<details>
<summary>✅ Bom: switch expression para 3+ alternativas</summary>

```dart
final priority = switch ((isUrgent, isCritical)) {
  (true, true) => 'Critical',
  (true, false) => 'High',
  _ => 'Normal',
};
```

</details>

## Guard clauses: retorno antecipado

<details>
<summary>❌ Ruim: lógica principal aninhada</summary>

```dart
Future<Result<Invoice>> processOrder(Order? order) async {
  if (order != null) {
    if (order.isSettled) {
      if (order.items.isNotEmpty) {
        final invoice = await generateInvoice(order);
        return Result.success(invoice);
      } else {
        return Result.failure(const EmptyOrderError());
      }
    } else {
      return Result.failure(const UnsettledOrderError());
    }
  } else {
    return Result.failure(const NullOrderError());
  }
}
```

</details>

<details>
<summary>✅ Bom: guards eliminam aninhamento</summary>

```dart
Future<Result<Invoice>> processOrder(Order? order) async {
  if (order == null) return Result.failure(const NullOrderError());
  if (!order.isSettled) return Result.failure(const UnsettledOrderError());
  if (order.items.isEmpty) return Result.failure(const EmptyOrderError());

  final invoice = await generateInvoice(order);

  return Result.success(invoice);
}
```

</details>

## Null-coalescing e safe call

<details>
<summary>❌ Ruim: if/else manual para null</summary>

```dart
String getCity(Order? order) {
  if (order != null && order.customer != null && order.customer.address != null) {
    return order.customer.address.city;
  }
  return 'Unknown';
}
```

</details>

<details>
<summary>✅ Bom: optional chaining com ?? no final</summary>

```dart
String getCity(Order? order) {
  return order?.customer?.address?.city ?? 'Unknown';
}
```

</details>

## Map como lookup

`Map` mapeia chave → valor sem if/else chain. Usar quando o mapeamento não é um enum selado
(chaves dinâmicas, strings, inteiros). Para enums com todos os cases cobertos, preferir
`switch` expression, que garante exaustividade em tempo de compilação.

<details>
<summary>❌ Ruim: if chain para mapeamento de chave string</summary>

```dart
String httpMessage(int code) {
  if (code == 200) return 'OK';
  if (code == 201) return 'Created';
  if (code == 400) return 'Bad Request';
  if (code == 404) return 'Not Found';
  return 'Unknown';
}
```

</details>

<details>
<summary>✅ Bom: Map + ?? para o fallback</summary>

```dart
String httpMessage(int code) {
  const messages = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    404: 'Not Found',
  };

  final message = messages[code] ?? 'Unknown';
  return message;
}
```

</details>

<a id="switch-expression"></a>

## `switch` como expressão (Dart 3)

<details>
<summary>❌ Ruim: if/else chain para mapeamento de valor</summary>

```dart
String describeStatus(OrderStatus status) {
  if (status == OrderStatus.pending) {
    return 'Waiting for payment';
  } else if (status == OrderStatus.processing) {
    return 'Being prepared';
  } else if (status == OrderStatus.shipped) {
    return 'On the way';
  } else {
    return 'Unknown';
  }
}
```

</details>

<details>
<summary>✅ Bom: switch expression exaustivo</summary>

```dart
String describeStatus(OrderStatus status) {
  return switch (status) {
    OrderStatus.pending => 'Waiting for payment',
    OrderStatus.processing => 'Being prepared',
    OrderStatus.shipped => 'On the way',
    OrderStatus.delivered => 'Delivered',
  };
}
```

</details>

## `if-case` para pattern matching inline

<details>
<summary>❌ Ruim: verificação de tipo manual</summary>

```dart
void handleResult(OrderResult result) {
  if (result is OrderSuccess) {
    final order = result as OrderSuccess;
    showConfirmation(order.order);
  }
}
```

</details>

<details>
<summary>✅ Bom: if-case faz bind diretamente</summary>

```dart
void handleResult(OrderResult result) {
  if (result case OrderSuccess(:final order)) {
    showConfirmation(order);
  }
}
```

</details>

## Circuit break

Antes de escrever um loop, verifique se `any` ou `every` já resolve. Para encontrar o primeiro
elemento, use `for-in` com `return` antecipado; fica mais claro do que um loop com flag.

<details>
<summary>❌ Ruim: loop com flag percorre tudo mesmo após encontrar</summary>

```dart
Product? findFirstExpiredProduct(List<Product> products) {
  Product? expired;

  for (final product in products) {
    if (expired == null && product.isExpired) {
      expired = product; // continua iterando mesmo após encontrar
    }
  }

  return expired;
}
```

</details>

<details>
<summary>✅ Bom: for-in com return antecipado sai no primeiro match</summary>

```dart
Product? findFirstExpiredProduct(List<Product> products) {
  for (final product in products) {
    if (product.isExpired) return product;
  }

  return null;
}
```

</details>

<details>
<summary>✅ Bom: any / every com circuit break nativo</summary>

```dart
// para no primeiro true
final hasExpired = products.any((p) => p.isExpired);

// para no primeiro false
final allActive = products.every((p) => p.isActive);
```

</details>

## `for...in` idiomático

<details>
<summary>❌ Ruim: índice manual quando não necessário</summary>

```dart
for (var i = 0; i < items.length; i++) {
  print(items[i].name);
}
```

</details>

<details>
<summary>✅ Bom: for-in ou operações de coleção</summary>

```dart
for (final item in items) {
  print(item.name);
}

// quando índice é necessário
for (final (index, item) in items.indexed) {
  print('$index: ${item.name}');
}

// transformação: preferir métodos de coleção
final names = items.map((item) => item.name).toList();
```

</details>

## while

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice, `while`
é a escolha natural.

<details>
<summary>❌ Ruim: for com índice quando o critério é condição de estado</summary>

```dart
for (var i = 0; i < maxAttempts; i++) {
  final connection = connectToDatabase();
  if (connection.isReady) break;  // o índice não representa nada aqui
}
```

</details>

<details>
<summary>✅ Bom: while para condição de parada por estado</summary>

```dart
var attempt = 0;

while (attempt < maxAttempts) {
  final connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## do-while

Use `do-while` quando a primeira iteração deve sempre executar, independente da condição.

<details>
<summary>❌ Ruim: while quando a fila deve processar ao menos um item</summary>

```dart
// verifica antes de executar: se a fila já estiver vazia, nunca executa
while (taskQueue.isNotEmpty) {
  final task = taskQueue.removeFirst();
  executeTask(task);
}
```

</details>

<details>
<summary>✅ Bom: do-while quando a primeira execução é garantida</summary>

```dart
// drena a fila: processa pelo menos um item antes de verificar
do {
  final task = taskQueue.removeFirst();
  executeTask(task);
} while (taskQueue.isNotEmpty);
```

</details>
