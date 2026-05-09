# Dart — Quick Reference

> Escopo: Dart 3.7. Cheat-sheet tabular — decisões rápidas sem contexto narrativo.

## Nomenclatura

| Contexto | Convenção | Exemplo |
| --- | --- | --- |
| Classes, enums, typedefs | `UpperCamelCase` | `OrderService`, `PaymentResult` |
| Funções, variáveis, parâmetros | `camelCase` | `calculateTotal`, `isActive` |
| Constantes | `camelCase` (não SCREAMING) | `maxRetries`, `defaultTimeout` |
| Prefixo `_` | visibilidade de biblioteca (privado ao arquivo) | `_userId`, `_buildHeader` |
| Pacotes e arquivos | `snake_case` | `order_service.dart`, `payment_result.dart` |
| Parâmetros de tipo genérico | `UpperCamelCase` simples | `T`, `K`, `V`, `Result` |

## Booleans

| Prefixo | Uso |
| --- | --- |
| `is` | estado: `isActive`, `isValid` |
| `has` | posse: `hasPermission`, `hasPendingItems` |
| `can` | capacidade: `canDelete`, `canRetry` |
| `should` | intenção: `shouldRefresh`, `shouldRetry` |

## `final` vs `var` vs `const`

| Situação | Escolha |
| --- | --- |
| Valor não muda após atribuição | `final` |
| Estado mutável | `var` |
| Constante de compilação (literal) | `const` |
| Inicialização postergada | `late final` |

## Controle de fluxo

| Construto | Quando usar |
| --- | --- |
| `if (...) return` | sair cedo na falha antes de qualquer lógica |
| `switch` como expressão | substituir chains de `if/else if`; Dart 3+ |
| `?.` | acesso seguro em optional — retorna `null` |
| `??` | coalescência: valor padrão quando `null` |
| `if-case` | pattern matching inline sem `switch` completo |

## Tipos

| Construto | Quando usar |
| --- | --- |
| `class` | tipo com estado e comportamento |
| `abstract class` | contrato com ou sem implementação padrão |
| `interface` (abstract class sem implementação) | contrato puro |
| `mixin` | comportamento reutilizável sem herança |
| `sealed class` | hierarquia fechada; Dart 3+; exaustividade garantida |
| `extension` | adiciona métodos a tipo existente sem herança |
| `record` | tipo de produto imutável inline; Dart 3+ |

## Null safety

| Operador | Uso |
| --- | --- |
| `T?` | tipo anulável |
| `?.` | safe member access |
| `??` | valor padrão quando `null` |
| `!` | assert não-null — lança `Null check operator used on a null value`; evitar |
| `late` | variável não-nullable com inicialização postergada |
| `required` | named parameter obrigatório |

## Async

| Construto | Uso |
| --- | --- |
| `async`/`await` | função assíncrona; `await` suspende sem bloquear |
| `Future<T>` | valor assíncrono único |
| `Stream<T>` | sequência assíncrona de valores |
| `Future.wait` | aguarda múltiplos Futures em paralelo |
| `StreamController` | fonte programática de eventos em um Stream |
| `unawaited` | fire-and-forget explícito (sem lint warning) |
