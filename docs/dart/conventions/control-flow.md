# Control Flow

> Escopo: Dart 3.7.

Fluxo limpo sai cedo na falha, nunca aninha o caminho feliz. `switch` como expressão (Dart 3+)
substitui chains de `if/else if`. `?.` e `??` eliminam null-checks verbosos. Máximo dois níveis
de indentação.

## if e else

O ponto de partida. Para dois caminhos, `if/else` funciona. O `else` após um `return` é ruído:
o compilador já descartou o branch anterior.

<details>
<summary>❌ Bad — else desnecessário após return</summary>
<br>

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

<br>

<details>
<summary>✅ Good — early return elimina o else</summary>
<br>

```dart
double getDiscount(CustomerType type) {
  if (type == CustomerType.vip) return 0.20;
  if (type == CustomerType.premium) return 0.10;

  return 0.0;
}
```

</details>

## Ternário — atribuição de 2 valores

Ternário `? :` somente para atribuição de 2 valores em uma linha. Três ou mais alternativas
→ `switch` expression. Nunca aninhar ternários.

<details>
<summary>❌ Bad — if/else imperativo para atribuição simples</summary>
<br>

```dart
String label;
if (order.isPaid) {
  label = 'Paid';
} else {
  label = 'Pending';
}
```

</details>

<br>

<details>
<summary>✅ Good — ternário na atribuição</summary>
<br>

```dart
final label = order.isPaid ? 'Paid' : 'Pending';
```

</details>

<details>
<summary>❌ Bad — ternário aninhado para 3+ alternativas</summary>
<br>

```dart
final priority = isUrgent ? isCritical ? 'Critical' : 'High' : 'Normal';
```

</details>

<br>

<details>
<summary>✅ Good — switch expression para 3+ alternativas</summary>
<br>

```dart
final priority = switch ((isUrgent, isCritical)) {
  (true, true) => 'Critical',
  (true, false) => 'High',
  _ => 'Normal',
};
```

</details>

## Guard clauses — retorno antecipado

<details>
<summary>❌ Bad — lógica principal aninhada</summary>
<br>

```dart
Future<Result<Invoice>> processOrder(Order? order) async {
  if (order != null) {
    if (order.isPaid) {
      if (order.items.isNotEmpty) {
        final invoice = await generateInvoice(order);
        return Result.success(invoice);
      } else {
        return Result.failure(const EmptyOrderError());
      }
    } else {
      return Result.failure(const UnpaidOrderError());
    }
  } else {
    return Result.failure(const NullOrderError());
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — guards eliminam aninhamento</summary>
<br>

```dart
Future<Result<Invoice>> processOrder(Order? order) async {
  if (order == null) return Result.failure(const NullOrderError());
  if (!order.isPaid) return Result.failure(const UnpaidOrderError());
  if (order.items.isEmpty) return Result.failure(const EmptyOrderError());

  final invoice = await generateInvoice(order);

  return Result.success(invoice);
}
```

</details>

## Null-coalescing e safe call

<details>
<summary>❌ Bad — if/else manual para null</summary>
<br>

```dart
String getCity(Order? order) {
  if (order != null && order.customer != null && order.customer.address != null) {
    return order.customer.address.city;
  }
  return 'Unknown';
}
```

</details>

<br>

<details>
<summary>✅ Good — optional chaining com ?? no final</summary>
<br>

```dart
String getCity(Order? order) {
  return order?.customer?.address?.city ?? 'Unknown';
}
```

</details>

## Map como lookup

`Map` mapeia chave → valor sem if/else chain. Usar quando o mapeamento não é um enum selado
(chaves dinâmicas, strings, inteiros). Para enums com todos os cases cobertos, preferir
`switch` expression — garante exaustividade em tempo de compilação.

<details>
<summary>❌ Bad — if chain para mapeamento de chave string</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Map + ?? para o fallback</summary>
<br>

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

## `switch` como expressão (Dart 3)

<details>
<summary>❌ Bad — if/else chain para mapeamento de valor</summary>
<br>

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

<br>

<details>
<summary>✅ Good — switch expression exaustivo</summary>
<br>

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
<summary>❌ Bad — verificação de tipo manual</summary>
<br>

```dart
void handleResult(OrderResult result) {
  if (result is OrderSuccess) {
    final order = result as OrderSuccess;
    showConfirmation(order.order);
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — if-case faz bind diretamente</summary>
<br>

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
elemento, use `for-in` com `return` antecipado — é mais claro do que um loop com flag.

<details>
<summary>❌ Bad — loop com flag percorre tudo mesmo após encontrar</summary>
<br>

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

<br>

<details>
<summary>✅ Good — for-in com return antecipado sai no primeiro match</summary>
<br>

```dart
Product? findFirstExpiredProduct(List<Product> products) {
  for (final product in products) {
    if (product.isExpired) return product;
  }

  return null;
}
```

</details>

<br>

<details>
<summary>✅ Good — any / every com circuit break nativo</summary>
<br>

```dart
// para no primeiro true
final hasExpired = products.any((p) => p.isExpired);

// para no primeiro false
final allActive = products.every((p) => p.isActive);
```

</details>

## `for...in` idiomático

<details>
<summary>❌ Bad — índice manual quando não necessário</summary>
<br>

```dart
for (var i = 0; i < items.length; i++) {
  print(items[i].name);
}
```

</details>

<br>

<details>
<summary>✅ Good — for-in ou operações de coleção</summary>
<br>

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
<summary>❌ Bad — for com índice quando o critério é condição de estado</summary>
<br>

```dart
for (var i = 0; i < maxAttempts; i++) {
  final connection = connectToDatabase();
  if (connection.isReady) break;  // o índice não representa nada aqui
}
```

</details>

<br>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>
<br>

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
<summary>❌ Bad — while quando a fila deve processar ao menos um item</summary>
<br>

```dart
// verifica antes de executar — se a fila já estiver vazia, nunca executa
while (taskQueue.isNotEmpty) {
  final task = taskQueue.removeFirst();
  executeTask(task);
}
```

</details>

<br>

<details>
<summary>✅ Good — do-while quando a primeira execução é garantida</summary>
<br>

```dart
// drena a fila — processa pelo menos um item antes de verificar
do {
  final task = taskQueue.removeFirst();
  executeTask(task);
} while (taskQueue.isNotEmpty);
```

</details>
