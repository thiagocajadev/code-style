# Widgets

> Escopo: Flutter 3.29.

Em Flutter, a UI é uma árvore de widgets. Cada widget descreve uma parte da interface. Composição
de widgets pequenos e focados é preferível a widgets grandes com múltiplas responsabilidades.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `StatelessWidget` | widget sem estado mutável; `build` sempre retorna o mesmo resultado para os mesmos inputs |
| `StatefulWidget` | widget com `State` mutável; `setState` dispara rebuild |
| `build` | método chamado pelo framework para descrever a UI; deve ser puro e rápido |
| **widget tree** | hierarquia de widgets que descreve toda a UI |
| **const constructor** | widget const é comparado por identidade — Flutter evita rebuild se o mesmo widget é retornado |
| **composição** | widgets pequenos combinados formam a interface; preferível a herança |

## Widget grande com múltiplas responsabilidades

<details>
<summary>❌ Bad — widget único com layout, lista e lógica de formatação</summary>
<br>

```dart
class OrderScreen extends StatelessWidget {
  final List<Order> orders;
  const OrderScreen({super.key, required this.orders});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: Column(
        children: [
          Text('Total: R\$ ${orders.fold(0.0, (s, o) => s + o.total).toStringAsFixed(2)}'),
          Expanded(
            child: ListView.builder(
              itemCount: orders.length,
              itemBuilder: (context, index) {
                final order = orders[index];
                return ListTile(
                  title: Text('Order #${order.id}'),
                  subtitle: Text('R\$ ${order.total.toStringAsFixed(2)}'),
                  trailing: Text(order.status.label),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — widget principal compõe widgets menores e focados</summary>
<br>

```dart
class OrderScreen extends StatelessWidget {
  final List<Order> orders;
  const OrderScreen({super.key, required this.orders});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: Column(
        children: [
          OrderTotalBanner(orders: orders),
          Expanded(child: OrderList(orders: orders)),
        ],
      ),
    );
  }
}

class OrderTotalBanner extends StatelessWidget {
  final List<Order> orders;
  const OrderTotalBanner({super.key, required this.orders});

  @override
  Widget build(BuildContext context) {
    final total = orders.fold(0.0, (sum, order) => sum + order.total);
    return Text('Total: R\$ ${total.toStringAsFixed(2)}');
  }
}

class OrderList extends StatelessWidget {
  final List<Order> orders;
  const OrderList({super.key, required this.orders});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: orders.length,
      itemBuilder: (context, index) => OrderListItem(order: orders[index]),
    );
  }
}

class OrderListItem extends StatelessWidget {
  final Order order;
  const OrderListItem({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text('Order #${order.id}'),
      subtitle: Text('R\$ ${order.total.toStringAsFixed(2)}'),
      trailing: Text(order.status.label),
    );
  }
}
```

</details>

## `const` em widgets

<details>
<summary>❌ Bad — widgets sem const causam rebuild desnecessário</summary>
<br>

```dart
Widget build(BuildContext context) {
  return Column(
    children: [
      Text('Orders'),           // nova instância a cada rebuild
      Icon(Icons.shopping_cart), // nova instância a cada rebuild
      SizedBox(height: 16),
    ],
  );
}
```

</details>

<br>

<details>
<summary>✅ Good — const reutiliza a mesma instância</summary>
<br>

```dart
Widget build(BuildContext context) {
  return const Column(
    children: [
      Text('Orders'),
      Icon(Icons.shopping_cart),
      SizedBox(height: 16),
    ],
  );
}
```

</details>

## `StatefulWidget` quando necessário

`StatefulWidget` é adequado para estado local de UI: foco, animações, controladores de formulário.
Estado de negócio pertence ao ViewModel ou Notifier.

<details>
<summary>❌ Bad — lógica de negócio dentro do State</summary>
<br>

```dart
class _OrderListState extends State<OrderList> {
  List<Order> _orders = [];

  @override
  void initState() {
    super.initState();
    _loadOrders();   // I/O no widget
  }

  Future<void> _loadOrders() async {
    final orders = await OrderRepository().findAll();
    setState(() => _orders = orders);
  }
  // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — State contém somente estado de UI; dados vêm do ViewModel</summary>
<br>

```dart
class OrderListScreen extends ConsumerWidget {
  const OrderListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersState = ref.watch(ordersProvider);

    return switch (ordersState) {
      AsyncData(:final value) => OrderList(orders: value),
      AsyncLoading() => const Center(child: CircularProgressIndicator()),
      AsyncError(:final error) => ErrorView(message: error.toString()),
      _ => const SizedBox.shrink(),
    };
  }
}
```

</details>

## Composição sobre herança

<details>
<summary>❌ Bad — herança para reutilizar estilo de card</summary>
<br>

```dart
abstract class BaseCard extends StatelessWidget {
  final String title;
  const BaseCard({super.key, required this.title});

  Widget buildContent(BuildContext context);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [Text(title), buildContent(context)],
        ),
      ),
    );
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — widget de container composto recebe filho via parâmetro</summary>
<br>

```dart
class AppCard extends StatelessWidget {
  final String title;
  final Widget child;

  const AppCard({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [Text(title), child]),
      ),
    );
  }
}

// uso
AppCard(title: 'Orders', child: OrderList(orders: orders))
```

</details>
