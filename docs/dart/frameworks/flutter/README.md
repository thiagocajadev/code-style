# Flutter

[![Flutter](https://img.shields.io/badge/Flutter-3.29-02569B?logo=flutter&logoColor=white)](https://docs.flutter.dev/)

Flutter é o framework de UI da Google construído sobre Dart. Cria aplicações nativas compiladas
para Android, iOS, Web e Desktop a partir de um único código-fonte. Os exemplos usam Flutter 3.29
(Dart 3.7) como referência.

→ [Quick Reference](quick-reference.md) — widgets, estado, navegação

Idioma Dart: [../../README.md](../../README.md)

## Fundamentos

| Tópico | Conceitos |
| --- | --- |
| [Widgets](conventions/widgets.md) | StatelessWidget, StatefulWidget, composição, build, const, layout |

## Avançados

| Tópico | Conceitos |
| --- | --- |
| [State Management](advanced/state-management.md) | Provider, Riverpod, Bloc; UI state vs domain state; cross-link shared/mobile |
| [Navigation](advanced/navigation.md) | GoRouter, deep links, shell routes; cross-link shared/mobile |
| [Platform Channels](advanced/platform-channels.md) | MethodChannel, EventChannel, interop com código nativo |
| [Testing](advanced/testing.md) | Widget tests, integration tests, golden tests, `WidgetTester` |

## Mobile

Os fundamentos cross-platform vivem em [shared/mobile/](../../../shared/mobile/README.md):

| Conceito | Referência |
| --- | --- |
| Ciclo de vida do app | [App Lifecycle](../../../shared/mobile/app-lifecycle.md) |
| Navegação (conceitual) | [Navigation](../../../shared/mobile/navigation.md) |
| Gerenciamento de estado (conceitual) | [State Management](../../../shared/mobile/state-management.md) |
| Offline e sincronização | [Offline-first](../../../shared/mobile/offline-first.md) |
| Permissões em runtime | [Permissions](../../../shared/mobile/permissions.md) |

## Princípios

| Princípio | Descrição |
| --- | --- |
| [Composição sobre herança](conventions/widgets.md#composição-sobre-herança) | Widgets pequenos compostos são mais fáceis de testar e reutilizar |
| [StatelessWidget por padrão](conventions/widgets.md#stateful-quando-necessário) | Estado gerenciado externamente; StatefulWidget somente para estado local de UI |
| [const em todo widget possível](conventions/widgets.md#const-em-widgets) | Evita rebuilds desnecessários; Flutter reutiliza instâncias const |
| [Separar lógica de UI](advanced/state-management.md#lógica-na-ui) | ViewModel/Notifier fora do build; widget somente lê e renderiza |
| [Deep links declarativos](advanced/navigation.md#rota-imperativa) | GoRouter define rotas como URLs; suporta deep link e web |
