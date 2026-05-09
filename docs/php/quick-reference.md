# Quick Reference — PHP

> Escopo: PHP 8.4. Cheat-sheet de nomenclatura, tipos, controle de fluxo e padrões idiomáticos.

## Nomenclatura (PSR-1 + PSR-12)

| Contexto                        | Convenção        | Exemplos                                      |
| ------------------------------- | ---------------- | --------------------------------------------- |
| Classes, interfaces, traits     | `PascalCase`     | `OrderService`, `UserRepository`, `Auditable` |
| Métodos e funções               | `camelCase`      | `findByID`, `calculateTotal`, `applyDiscount` |
| Variáveis                       | `camelCase`      | `$orderID`, `$totalAmount`, `$isActive`       |
| Constantes de classe            | `UPPER_SNAKE`    | `MAX_RETRIES`, `DEFAULT_CURRENCY`             |
| Constantes globais              | `UPPER_SNAKE`    | `APP_ENV`, `DB_HOST`                          |
| Namespaces                      | `PascalCase`     | `App\Domain\Order`, `App\Infrastructure`      |

## Booleans

| Correto                          | Errado              |
| -------------------------------- | ------------------- |
| `$isActive`, `$hasPermission`    | `$active`, `$permission` |
| `$canDelete`, `$shouldRetry`     | `$delete`, `$retry`  |
| `$isValid`, `$hasItems`          | `$valid`, `$items`   |

## Verbos por intenção

| Intenção           | Preferir                                   | Evitar             |
| ------------------ | ------------------------------------------ | ------------------ |
| Ler de storage     | `fetch`, `load`, `find`, `get`             | `retrieve`, `pull` |
| Escrever/persistir | `save`, `persist`, `create`, `insert`      | `put`, `push`      |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build`  | `get`, `do`        |
| Transformar        | `map`, `transform`, `convert`, `format`    | `process`, `parse` |
| Validar            | `validate`, `check`, `assert`, `verify`    | `handle`, `test`   |
| Notificar          | `send`, `dispatch`, `notify`, `emit`       | `fire`, `trigger`  |

## Taboos — evitar sempre

| Banido                        | Substituir por                          |
| ----------------------------- | --------------------------------------- |
| `handle`, `do`, `run`, `execute`, `perform` | verbo de intenção            |
| `$data`, `$info`, `$obj`, `$item` | nome de domínio                     |
| `helpers.php`, `utils.php`    | nome de domínio do módulo               |
| `Manager`, `Controller` como nome de serviço | `Service`, `Repository`  |

## Declarações

| Uso                           | Forma                                     |
| ----------------------------- | ----------------------------------------- |
| Variável local                | `$orderID = 42;`                          |
| Propriedade readonly          | `public readonly string $name`            |
| Parâmetro readonly (PHP 8.4)  | `public function __construct(public readonly string $name) {}` |
| Constante de classe           | `public const int MAX_RETRIES = 3;`       |
| Enum                          | `enum OrderStatus: string { case Pending = 'pending'; }` |
| Named argument (PHP 8.0+)     | `createOrder(customerID: 42, amount: 100)` |

## Controle de fluxo

| Padrão                        | Forma idiomática                                        |
| ----------------------------- | ------------------------------------------------------- |
| Guard clause                  | `if ($order === null) { return null; }`                 |
| Match expression (PHP 8.0+)   | `$label = match($status) { Status::Active => 'Ativo', default => 'Outro' }` |
| Null coalescing               | `$name = $user?->name ?? 'Guest'`                       |
| Nullsafe operator (PHP 8.0+)  | `$city = $user?->address?->city`                        |
| Spread operator               | `$merged = [...$defaults, ...$overrides]`               |

## Tipos

| Padrão                        | Forma                                               |
| ----------------------------- | --------------------------------------------------- |
| Union type (PHP 8.0+)         | `function find(int\|string $id): ?User`             |
| Intersection type (PHP 8.1+)  | `function process(Countable&Stringable $input)`     |
| Never type                    | `function fail(string $msg): never { throw ... }`  |
| Readonly class (PHP 8.2+)     | `readonly class Money { ... }`                      |
| Property hooks (PHP 8.4+)     | `public string $name { get => ... set { ... } }`   |

## Erros

| Padrão                        | Forma                                               |
| ----------------------------- | --------------------------------------------------- |
| Lançar exceção tipada         | `throw new OrderNotFoundException($orderID)`        |
| Capturar tipo específico      | `catch (OrderNotFoundException $e) { ... }`         |
| Capturar múltiplos tipos      | `catch (NotFoundException\|ValidationException $e)` |
| Re-lançar com contexto        | `throw new ServiceException("...", previous: $e)`  |
| Finally                       | `finally { $connection->close(); }`                |
