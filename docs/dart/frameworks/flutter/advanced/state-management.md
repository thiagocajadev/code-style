# State Management

> Escopo: Flutter 3.29, Riverpod 2.x / Bloc 8.x.

Gerenciamento de estado separa a lógica de negócio da camada de UI. O widget lê estado e
despacha eventos; o ViewModel ou Notifier detém a lógica. Estado de UI (carregando, erro,
dado) é modelado com sealed classes ou `AsyncValue`.

→ Fundamentos cross-platform: [shared/mobile/state-management.md](../../../../../shared/mobile/state-management.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **UI state** | estado visual efêmero: carregando, erro, dado exibido |
| **domain state** | estado de negócio: lista de pedidos, usuário autenticado |
| **unidirectional data flow** | dados fluem em uma direção: evento → state → UI |
| `AsyncValue<T>` | sealed type do Riverpod: `loading`, `data`, `error` |
| `StateNotifier` | ViewModel no Riverpod — gerencia estado e expõe para os widgets |
| `BlocBuilder` | widget que reconstrói quando o Bloc emite novo estado |

## Lógica na UI

<details>
<summary>❌ Bad — I/O e lógica de negócio direto no build</summary>
<br>

```dart
class OrderListScreen extends StatefulWidget { ... }

class _OrderListScreenState extends State<OrderListScreen> {
  late Future<List<Order>> _ordersFuture;

  @override
  void initState() {
    super.initState();
    _ordersFuture = OrderRepository().findAll();   // instância hardcoded
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Order>>(
      future: _ordersFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        if (snapshot.hasError) return Text('Error: ${snapshot.error}');
        return OrderList(orders: snapshot.data!);
      },
    );
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — AsyncNotifier (Riverpod) separa lógica da UI</summary>
<br>

```dart
// notifier.dart
@riverpod
class OrdersNotifier extends _$OrdersNotifier {
  @override
  Future<List<Order>> build() async {
    return ref.read(orderRepositoryProvider).findAll();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(orderRepositoryProvider).findAll());
  }
}

// screen.dart
class OrderListScreen extends ConsumerWidget {
  const OrderListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersState = ref.watch(ordersNotifierProvider);

    return ordersState.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString()),
      data: (orders) => OrderList(orders: orders),
    );
  }
}
```

</details>

## Estado de UI modelado com sealed class

<details>
<summary>❌ Bad — múltiplos booleanos para estado</summary>
<br>

```dart
class OrdersState {
  final bool isLoading;
  final List<Order>? orders;
  final String? errorMessage;

  // 8 combinações, só 3 fazem sentido
  OrdersState({this.isLoading = false, this.orders, this.errorMessage});
}
```

</details>

<br>

<details>
<summary>✅ Good — sealed class com exatamente 3 estados válidos</summary>
<br>

```dart
sealed class OrdersState {}

class OrdersLoading extends OrdersState {}

class OrdersLoaded extends OrdersState {
  final List<Order> orders;
  OrdersLoaded(this.orders);
}

class OrdersError extends OrdersState {
  final String message;
  OrdersError(this.message);
}

// Bloc
class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  OrdersBloc(this._repository) : super(OrdersLoading()) {
    on<LoadOrders>(_onLoadOrders);
  }

  Future<void> _onLoadOrders(LoadOrders event, Emitter<OrdersState> emit) async {
    emit(OrdersLoading());

    try {
      final orders = await _repository.findAll();
      emit(OrdersLoaded(orders));
    } catch (e) {
      emit(OrdersError(e.toString()));
    }
  }
}
```

</details>

## Riverpod: providers como injeção de dependência

```dart
// providers.dart
@riverpod
OrderRepository orderRepository(Ref ref) {
  return SqlOrderRepository(ref.read(databaseProvider));
}

@riverpod
class OrdersNotifier extends _$OrdersNotifier {
  @override
  Future<List<Order>> build() async {
    return ref.read(orderRepositoryProvider).findAll();
  }
}
```

→ Conceitos de state management agnóstico de plataforma: [shared/mobile/state-management.md](../../../../../shared/mobile/state-management.md)
