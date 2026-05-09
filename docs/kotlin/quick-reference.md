# Kotlin — Quick Reference

> Escopo: Kotlin 2.2. Cheat-sheet tabular — decisões rápidas sem contexto narrativo.

## Nomenclatura

| Contexto | Convenção | Exemplo |
| --- | --- | --- |
| Classes, interfaces, enums | `PascalCase` | `OrderService`, `PaymentResult` |
| Funções, propriedades, variáveis | `camelCase` | `calculateTotal`, `isActive` |
| Constantes top-level | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Parâmetros de tipo genérico | `PascalCase` simples | `T`, `K`, `V`, `Result` |
| Pacotes | `lowercase` sem underscores | `com.acme.order` |
| Arquivos top-level (múltiplos symbols) | `PascalCase` + `.kt` | `OrderExtensions.kt` |

## Booleans

| Prefixo | Uso |
| --- | --- |
| `is` | estado ou classificação: `isActive`, `isValid` |
| `has` | posse: `hasPermission`, `hasPendingItems` |
| `can` | capacidade: `canDelete`, `canRetry` |
| `should` | intenção: `shouldRefresh`, `shouldRetry` |

## Verbos proibidos (SDG Taboos)

| Proibido | Alternativa |
| --- | --- |
| `handle`, `process`, `manage`, `do`, `run` | verbo de intenção: `validate`, `notify`, `charge` |
| `get` para computação | `calculate`, `derive`, `build` |
| `data`, `info`, `obj`, `item`, `thing` | nome de domínio |

## `val` vs `var`

| Situação | Escolha |
| --- | --- |
| Valor não muda após atribuição | `val` |
| Acumulação em loop, estado mutável | `var` |
| Constante em tempo de compilação | `const val` (top-level ou `companion object`) |
| Inicialização custosa, lazy | `val x by lazy { ... }` |

## Controle de fluxo

| Construto | Quando usar |
| --- | --- |
| `if`/`return` antecipado | sair cedo na falha antes de qualquer lógica |
| `when` | substituir chains de `if/else if`; 3+ branches |
| `?.let { }` | executar bloco somente se não-null |
| `?: return` / `?: throw` | elvis como guard clause |
| `for (item in list)` | iteração sobre coleções |
| `repeat(n)` | loop com contador sem índice |

## Tipos

| Construto | Quando usar |
| --- | --- |
| `data class` | modelo de dados imutável com `equals`/`copy` automáticos |
| `sealed class` / `sealed interface` | hierarquia fechada de estados ou resultados |
| `value class` (inline) | wrapper zero-overhead sobre primitivo |
| `object` | singleton; sem estado mutável |
| `companion object` | factory methods; constantes associadas ao tipo |
| `interface` | contrato sem estado; favorito sobre herança |

## Null safety

| Operador | Uso |
| --- | --- |
| `?.` | acesso seguro; retorna null se receptor for null |
| `?:` | elvis: valor padrão ou saída antecipada |
| `!!` | assert não-null; proibido em produção |
| `requireNotNull(x)` | falha rápida com mensagem na fronteira |
| `checkNotNull(x)` | invariante interna; estado inválido |

## Coroutines

| Construto | Uso |
| --- | --- |
| `launch` | fire-and-forget com escopo definido |
| `async`/`await` | valor futuro; sempre `.await()` no mesmo escopo |
| `withContext(Dispatchers.IO)` | mudar dispatcher sem criar novo escopo |
| `flow { emit(x) }` | stream reativo; consumido com `collect` |
| `StateFlow` | estado observável; substitui LiveData em KMP |
| `supervisorScope` | filhos independentes; falha não cancela irmãos |

## Modificadores

| Modificador | Significado |
| --- | --- |
| `open` | permite herança (classes são `final` por padrão) |
| `abstract` | força implementação; não instanciável |
| `internal` | visível no módulo; fronteira de API interna |
| `inline` | substitui chamada por corpo; reduz alocação em lambdas |
| `tailrec` | otimiza recursão em tail position para loop |
