# Naming

> Escopo: PHP 8.4.

Nomes bons tornam comentários desnecessários. PHP segue **PSR-1** e **PSR-12** como padrões
de nomenclatura. Dentro dessas convenções, o mesmo princípio vale: o código conta a história.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```php
declare(strict_types=1);

function apply($x, array $p, callable $c)
{
    if ($p['inadimplente']) {
        return false;
    }
    return $c($x);
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```php
declare(strict_types=1);

function applyDiscount(Order $order, callable $calculateDiscount): ?Order
{
    if ($order->customer->defaulted) {
        return null;
    }

    $discountedOrder = $calculateDiscount($order);

    return $discountedOrder;
}
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — nomes em português no código</summary>
<br>

```php
$nomeDoUsuario = 'Alice';
$listaDeIds = [1, 2, 3];

function retornaUsuario(int $id): User { ... }
function buscaEnderecoDoCliente(int $id): Address { ... }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```php
$userName = 'Alice';
$idList = [1, 2, 3];

function findUser(int $userID): User { ... }
function findCustomerAddress(int $customerID): Address { ... }
```

</details>

## Convenções de case (PSR-1 + PSR-12)

| Contexto                       | Convenção        | Exemplos                                     |
| ------------------------------ | ---------------- | -------------------------------------------- |
| Classes, interfaces, traits    | `PascalCase`     | `OrderService`, `UserRepository`, `Auditable`|
| Métodos                        | `camelCase`      | `findByID`, `calculateTotal`, `isActive`     |
| Variáveis                      | `camelCase`      | `$orderID`, `$totalAmount`, `$isActive`      |
| Constantes de classe           | `UPPER_SNAKE`    | `MAX_RETRIES`, `DEFAULT_CURRENCY`            |
| Constantes globais (`define`)  | `UPPER_SNAKE`    | `APP_ENV`, `DB_HOST`                         |
| Namespaces                     | `PascalCase`     | `App\Domain\Order`, `App\Infrastructure`     |

<details>
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```php
class order_service {}          // classe com underscore
function Find_User() {}         // função com underscore

const maxRetries = 3;           // constante em camelCase

$order_id = 42;                 // variável com underscore
```

</details>

<br>

<details>
<summary>✅ Good — convenções PSR respeitadas</summary>
<br>

```php
class OrderService {}

function findUser(int $userID): ?User {}

class Order
{
    public const int MAX_AMOUNT = 10000;
}

$orderID = 42;
```

</details>

## Ordem semântica

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```php
function getUserProfile(int $userID): UserProfile {}
function getOrderStatus(int $orderID): OrderStatus {}
// invertido:
function profileGetUser(int $userID): UserProfile {}
function statusUpdateOrder(int $orderID): void {}
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```php
function getUserProfile(int $userID): UserProfile {}
function updateOrderStatus(int $orderID, OrderStatus $status): void {}
function calculateInvoiceTotal(Invoice $invoice): float {}
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage não dizem nada</summary>
<br>

```php
function handle($data): mixed {}
function process($input): mixed {}
function manage(array $items): void {}
function doStuff($x): mixed {}
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```php
function validatePayment(Payment $payment): void {}
function calculateOrderTotal(array $items): float {}
function notifyCustomerDefault(Order $order): void {}
function applySeasonalDiscount(Order $order): Order {}
```

</details>

## Domain-first naming

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```php
function callStripe(float $amount): ChargeResult {}
function getUserFromDatabase(int $userID): User {}
function postToSlack(string $message): void {}
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```php
function chargeCustomer(float $amount): ChargeResult {}
function findUser(int $userID): User {}
function notifyTeam(string $message): void {}
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```php
$loading = true;
$active = $user->status === 'active';
$valid = str_contains($email, '@');
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```php
$isActive = $user->status === 'active';
$hasPermission = in_array('admin', $user->roles, true);

$canDelete = $isActive && $hasPermission;
$shouldRetry = $attempt < self::MAX_RETRIES;
```

</details>
