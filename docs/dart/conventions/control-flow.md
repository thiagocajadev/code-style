# Control Flow

> Escopo: Dart 3.7.

Fluxo limpo sai cedo na falha, nunca aninha o caminho feliz. `switch` como expressão (Dart 3+)
substitui chains de `if/else if`. `?.` e `??` eliminam null-checks verbosos. Máximo dois níveis
de indentação.

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
