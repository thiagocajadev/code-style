# Swift — Quick Reference

> Escopo: Swift 6.1, Swift 6 language mode. Cheat-sheet tabular — decisões rápidas sem contexto narrativo.

## Nomenclatura

| Contexto | Convenção | Exemplo |
| --- | --- | --- |
| Tipos, structs, enums, protocolos | `UpperCamelCase` | `OrderService`, `PaymentResult` |
| Funções, métodos, propriedades, variáveis | `lowerCamelCase` | `calculateTotal`, `isActive` |
| Constantes (módulo ou tipo) | `lowerCamelCase` | `maxRetries`, `defaultTimeout` |
| Enums cases | `lowerCamelCase` | `.success`, `.failure`, `.pending` |
| Protocolos de conformidade | sufixo `-able`, `-ing`, `-Provider` | `Sendable`, `Codable`, `UserProvider` |

## Booleans

| Prefixo | Uso |
| --- | --- |
| `is` | estado ou classificação: `isActive`, `isValid` |
| `has` | posse: `hasPermission`, `hasPendingItems` |
| `can` | capacidade: `canDelete`, `canRetry` |
| `should` | intenção: `shouldRefresh`, `shouldRetry` |

## `let` vs `var`

| Situação | Escolha |
| --- | --- |
| Valor não muda após atribuição | `let` |
| Estado mutável, acumulação | `var` |
| Propriedade computada (sem armazenamento) | `var { get }` ou `var { get set }` |

## Controle de fluxo

| Construto | Quando usar |
| --- | --- |
| `guard let x = opt else { return }` | unwrap + saída antecipada na falha |
| `if let x = opt { }` | bloco condicional somente quando não-nil |
| `switch` exaustivo | 3+ branches; pattern matching em enums |
| `for item in collection` | iteração sem índice |
| `where` em switch/for | filtro inline sem if aninhado |

## Tipos

| Construto | Quando usar |
| --- | --- |
| `struct` | modelo de dados; value type; cópia em atribuição |
| `class` | identidade compartilhada; ciclo de vida explícito; herança |
| `enum` com associated values | hierarquia de estados ou resultados |
| `protocol` | contrato sem implementação; favorito sobre herança |
| `actor` | estado compartilhado em ambiente concorrente |
| `@MainActor` | garante execução na main thread (UI) |

## Optionals

| Operador | Uso |
| --- | --- |
| `?` em tipo | declara opcional: `String?` pode ser `nil` |
| `??` | coalescência: valor padrão quando `nil` |
| `?.` | safe member access: retorna `nil` se receptor for `nil` |
| `!` | forced unwrap — proibido em produção |
| `guard let` | unwrap + retorno antecipado na falha |
| `if let` | bloco executado somente quando não-nil |

## Concorrência (Swift 6)

| Construto | Uso |
| --- | --- |
| `async`/`await` | função assíncrona sem callback |
| `Task { }` | unit de trabalho assíncrono com escopo |
| `async let` | execução paralela de múltiplas tarefas |
| `actor` | proteção de estado compartilhado contra data race |
| `@Sendable` | closure ou tipo seguro para transferência entre tasks |
| `withTaskGroup` | grupo de tasks com resultado agregado |

## Modificadores de acesso

| Modificador | Visibilidade |
| --- | --- |
| `private` | escopo da declaração (e extensões no mesmo arquivo) |
| `fileprivate` | arquivo inteiro |
| `internal` (padrão) | módulo inteiro |
| `package` | pacote Swift Package Manager |
| `public` | qualquer módulo; não subclassificável |
| `open` | qualquer módulo; subclassificável e sobrescrevível |
