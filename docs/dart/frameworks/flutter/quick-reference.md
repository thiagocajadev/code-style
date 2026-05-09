# Flutter — Quick Reference

> Escopo: Flutter 3.29, Dart 3.7. Cheat-sheet tabular — decisões rápidas sem contexto narrativo.

## Widget — qual usar

| Situação | Widget |
| --- | --- |
| Sem estado local | `StatelessWidget` |
| Estado local de UI (animação, foco, controlador) | `StatefulWidget` |
| Estado observável injetado | `ConsumerWidget` (Riverpod) / `BlocBuilder` |
| Widget com ciclo de vida (initState/dispose) | `StatefulWidget` |

## Layout

| Widget | Uso |
| --- | --- |
| `Column` / `Row` | eixo vertical / horizontal |
| `Flex` + `Expanded` | distribuição proporcional de espaço |
| `Stack` + `Positioned` | sobreposição com posição absoluta |
| `Padding` | espaçamento interno |
| `SizedBox` | espaço fixo ou container com dimensão |
| `ConstrainedBox` | limitar min/max width e height |
| `Wrap` | linha que quebra automaticamente |
| `ListView.builder` | lista virtualizada para itens dinâmicos |
| `GridView.builder` | grade virtualizada |

## Const

| Situação | Usar const? |
| --- | --- |
| Widget sem parâmetros externos | `const Text('Hello')` |
| Parâmetros são constantes de compilação | `const EdgeInsets.all(16)` |
| Parâmetros vêm de variável runtime | não pode ser const |

## Estado

| Opção | Quando usar |
| --- | --- |
| `setState` | estado local de UI simples (visibilidade, animação) |
| `ValueNotifier` | estado simples compartilhado entre widgets próximos |
| `Riverpod` (`StateNotifier`/`AsyncNotifier`) | estado global ou de feature; testável |
| `Bloc`/`Cubit` | estado com eventos explícitos; BDD |
| `Provider` | injeção de dependência; estado derivado simples |

## Navegação (GoRouter)

| Caso | Código |
| --- | --- |
| Navegar para rota | `context.go('/orders')` |
| Empilhar (push) | `context.push('/orders/1')` |
| Voltar | `context.pop()` |
| Redirect condicional | `redirect: (context, state) => ...` |
| Parâmetro de rota | `GoRoute(path: '/orders/:id')` |

## Testes

| Tipo | Ferramenta |
| --- | --- |
| Widget isolado | `testWidgets` + `WidgetTester` |
| Fluxo completo com navegação | `testWidgets` + `GoRouter` in-memory |
| Snapshot visual | `matchesGoldenFile` |
| Integração (dispositivo real) | `integration_test` |
