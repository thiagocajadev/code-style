# Naming

> Escopo: PHP 8.4.

Nomes bons tornam comentários desnecessários. PHP segue **PSR-1** e **PSR-12** como padrões
de nomenclatura. Quando o nome carrega a intenção, o comentário deixa de fazer falta.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PSR-1** (PHP Standards Recommendation 1, padrão básico de código) | Define `PascalCase` para classes, `camelCase` para métodos e `UPPER_SNAKE_CASE` para constantes |
| **PSR-12** (PHP Standards Recommendation 12, padrão estendido de estilo) | Estende PSR-1 com regras de indentação, namespace, declarações de tipo |
| **PSR-4** (PHP Standards Recommendation 4, padrão de autoload) | Mapeia namespace para diretório; nome do arquivo casa com nome da classe |
| **namespace** (espaço de nomes) | Agrupamento lógico que evita colisão de nomes; reflete o caminho do diretório |
| **ubiquitous language** (linguagem onipresente) | Termos do domínio que aparecem idênticos no código, no banco e na conversa com produto |
| **intention-revealing name** (nome que revela intenção) | Identificador que descreve o propósito sem precisar de comentário |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

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

<details>
<summary>✅ Bom</summary>

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

<a id="portuguese-names"></a>

## Nomes em português

<details>
<summary>❌ Ruim: nomes em português no código</summary>

```php
$nomeDoUsuario = 'Alice';
$listaDeIds = [1, 2, 3];

function retornaUsuario(int $id): User { ... }
function buscaEnderecoDoCliente(int $id): Address { ... }
```

</details>

<details>
<summary>✅ Bom: inglês: curto, direto, universal</summary>

```php
$userName = 'Alice';
$idList = [1, 2, 3];

function findUser(int $userID): User { ... }
function findCustomerAddress(int $customerID): Address { ... }
```

</details>

<a id="case-conventions"></a>

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
<summary>❌ Ruim: case errado para o contexto</summary>

```php
class order_service {}          // classe com underscore
function Find_User() {}         // função com underscore

const maxRetries = 3;           // constante em camelCase

$order_id = 42;                 // variável com underscore
```

</details>

<details>
<summary>✅ Bom: convenções PSR respeitadas</summary>

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
<summary>❌ Ruim: ordem invertida</summary>

```php
function getUserProfile(int $userID): UserProfile {}
function getOrderStatus(int $orderID): OrderStatus {}
// invertido:
function profileGetUser(int $userID): UserProfile {}
function statusUpdateOrder(int $orderID): void {}
```

</details>

<details>
<summary>✅ Bom: ordem natural</summary>

```php
function getUserProfile(int $userID): UserProfile {}
function updateOrderStatus(int $orderID, OrderStatus $status): void {}
function calculateInvoiceTotal(Invoice $invoice): float {}
```

</details>

## Verbos genéricos

<details>
<summary>❌ Ruim: handle, process, manage não dizem nada</summary>

```php
function handle($data): mixed {}
function process($input): mixed {}
function manage(array $items): void {}
function doStuff($x): mixed {}
```

</details>

<details>
<summary>✅ Bom: verbo de intenção</summary>

```php
function validatePayment(Payment $payment): void {}
function calculateOrderTotal(array $items): float {}
function notifyCustomerDefault(Order $order): void {}
function applySeasonalDiscount(Order $order): Order {}
```

</details>

## Domain-first naming

<details>
<summary>❌ Ruim: nome revela infraestrutura, não domínio</summary>

```php
function callStripe(float $amount): ChargeResult {}
function getUserFromDatabase(int $userID): User {}
function postToSlack(string $message): void {}
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```php
function chargeCustomer(float $amount): ChargeResult {}
function findUser(int $userID): User {}
function notifyTeam(string $message): void {}
```

</details>

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```php
$loading = true;
$active = $user->status === 'active';
$valid = str_contains($email, '@');
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

```php
$isActive = $user->status === 'active';
$hasPermission = in_array('admin', $user->roles, true);

$canDelete = $isActive && $hasPermission;
$shouldRetry = $attempt < self::MAX_RETRIES;
```

</details>
