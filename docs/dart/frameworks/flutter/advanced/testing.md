# Testing

> Escopo: Flutter 3.29, package:flutter_test.

Flutter tem três camadas de teste: testes unitários (Dart puro), testes de widget (componente
isolado com `WidgetTester`) e testes de integração (app completo em dispositivo). Testes de
widget são o ponto de equilíbrio entre velocidade e cobertura.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `testWidgets` | executa teste com `WidgetTester`; bombeia frames e interage com widgets |
| `WidgetTester` | API para pumpar widgets, encontrar por `Finder` e simular interações |
| `Finder` | localiza widgets: `find.byType`, `find.byKey`, `find.text` |
| `pumpAndSettle` | bombeia frames até não haver mais animações ou rebuilds pendentes |
| `matchesGoldenFile` | snapshot visual; compara renderização com imagem de referência |
| `integration_test` | testa fluxos completos no dispositivo ou emulador |

## Bombeando o widget

<details>
<summary>❌ Ruim: sem pump o widget não é construído</summary>

```dart
testWidgets('shows order list', (tester) async {
  await tester.pumpWidget(const OrderListScreen());

  expect(find.byType(OrderListItem), findsWidgets);   // zero items: widget não renderizou
});
```

</details>

<details>
<summary>✅ Bom: pumpAndSettle aguarda renders e animações</summary>

```dart
testWidgets('shows order list when orders are loaded', (tester) async {
  // Arrange
  final orders = [Order(id: 1, total: 100.0), Order(id: 2, total: 50.0)];

  await tester.pumpWidget(
    ProviderScope(
      overrides: [ordersNotifierProvider.overrideWith(() => MockOrdersNotifier(orders))],
      child: const MaterialApp(home: OrderListScreen()),
    ),
  );

  await tester.pumpAndSettle();

  // Assert
  expect(find.byType(OrderListItem), findsNWidgets(2));
});
```

</details>

## Interação com widgets

<details>
<summary>✅ Bom: tap, type e verificação de estado</summary>

```dart
testWidgets('submits form and shows confirmation', (tester) async {
  // Arrange
  await tester.pumpWidget(
    ProviderScope(
      overrides: [orderServiceProvider.overrideWithValue(MockOrderService())],
      child: const MaterialApp(home: CreateOrderScreen()),
    ),
  );

  // Act
  await tester.enterText(find.byKey(const Key('quantity-field')), '3');
  await tester.tap(find.text('Confirm Order'));
  await tester.pumpAndSettle();

  // Assert
  expect(find.text('Order confirmed!'), findsOneWidget);
});
```

</details>

## Golden test para snapshot visual

<details>
<summary>✅ Bom: golden registra e verifica aparência visual</summary>

```dart
testWidgets('OrderListItem matches golden', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: OrderListItem(
          order: Order(id: 1, total: 99.90, status: OrderStatus.settled),
        ),
      ),
    ),
  );

  await expectLater(
    find.byType(OrderListItem),
    matchesGoldenFile('goldens/order_list_item.png'),
  );
});
```

</details>

Gerar/atualizar goldens: `flutter test --update-goldens`.

## Override de provider em testes

Usar `ProviderScope` com `overrides` para isolar dependências externas sem mocks de baixo nível.

```dart
testWidgets('shows error when load fails', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ordersNotifierProvider.overrideWith(
          () => MockOrdersNotifier(error: OrderLoadException()),
        ),
      ],
      child: const MaterialApp(home: OrderListScreen()),
    ),
  );

  await tester.pumpAndSettle();

  expect(find.text('Failed to load orders'), findsOneWidget);
});
```
