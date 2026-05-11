# Navigation

> Escopo: Flutter 3.29, GoRouter 14.x.

Navegação em Flutter é gerenciada por um **Router**. GoRouter é a solução declarativa oficial:
define rotas como URLs, suporta deep links, parâmetros, redirecionamentos condicionais e shell
routes (tabs com estado persistente).

→ Fundamentos cross-platform: [shared/mobile/navigation.md](../../../../../shared/mobile/navigation.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `GoRouter` | router declarativo baseado em URLs para Flutter |
| `GoRoute` | define uma rota com path, builder e subrotas |
| `ShellRoute` | rota container que persiste UI (ex: bottom tab bar) entre navegações |
| `context.go` | navega para rota e substitui o histórico |
| `context.push` | empilha rota no histórico (back button retorna) |
| `redirect` | função executada antes de cada navegação; guarda de autenticação |
| **deep link** (link profundo) | URL externa que abre diretamente uma tela específica do app |

## Rota imperativa

<details>
<summary>❌ Ruim: Navigator.push imperativo sem URL</summary>

```dart
ElevatedButton(
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
    );
  },
  child: const Text('View Order'),
)
```

</details>

<details>
<summary>✅ Bom: GoRouter declarativo com URL tipada</summary>

```dart
// router.dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/orders',
      builder: (context, state) => const OrderListScreen(),
      routes: [
        GoRoute(
          path: ':id',
          builder: (context, state) {
            final orderId = int.parse(state.pathParameters['id']!);
            return OrderDetailScreen(orderId: orderId);
          },
        ),
      ],
    ),
  ],
);

// uso no widget
ElevatedButton(
  onPressed: () => context.go('/orders/$orderId'),
  child: const Text('View Order'),
)
```

</details>

## Guarda de autenticação com redirect

<details>
<summary>❌ Ruim: verificação de auth dentro de cada tela</summary>

```dart
class OrderListScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    if (!AuthService.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go('/login');
      });
      return const SizedBox.shrink();
    }
    // ...
  }
}
```

</details>

<details>
<summary>✅ Bom: redirect centralizado no GoRouter</summary>

```dart
final router = GoRouter(
  redirect: (context, state) {
    final isLoggedIn = ref.read(authProvider).isLoggedIn;
    final isLoginRoute = state.matchedLocation == '/login';

    if (!isLoggedIn && !isLoginRoute) return '/login';
    if (isLoggedIn && isLoginRoute) return '/orders';

    return null;
  },
  routes: [...],
);
```

</details>

## ShellRoute para bottom tab bar

<details>
<summary>❌ Ruim: IndexedStack sem URLs (deep links impossíveis)</summary>

```dart
class MainScreen extends StatefulWidget { ... }
class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: [OrdersScreen(), ProfileScreen()],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        items: [...],
      ),
    );
  }
}
```

</details>

<details>
<summary>✅ Bom: ShellRoute com tab bar e URLs independentes</summary>

```dart
final router = GoRouter(
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),
  ],
);

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex(context),
        onTap: (i) => context.go(i == 0 ? '/orders' : '/profile'),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.list), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/orders')) return 0;
    return 1;
  }
}
```

</details>

→ Conceitos de navegação agnósticos de plataforma: [shared/mobile/navigation.md](../../../../../shared/mobile/navigation.md)
