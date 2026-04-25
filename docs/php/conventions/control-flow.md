# Control Flow

> Escopo: PHP 8.4.

PHP favorece fluxo linear e retorno antecipado. Use `===` para comparação estrita.
O `match` (PHP 8.0+) substitui cadeias de `if/elseif` para mapeamento de valores.
O operador nullsafe `?->` elimina verificações de null encadeadas.

## if e else

Após um `return` ou `throw`, o `else` é desnecessário e cria aninhamento sem valor.

<details>
<summary>❌ Bad — else após return</summary>
<br>

```php
function findActiveOrder(int $orderID): ?Order
{
    $order = $this->repository->findByID($orderID);
    if ($order !== null) {
        if ($order->status === OrderStatus::Canceled) {
            throw new OrderCanceledException($orderID);
        } else {
            return $order;
        }
    } else {
        return null;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clauses, sem else após return</summary>
<br>

```php
function findActiveOrder(int $orderID): Order
{
    $order = $this->repository->findByID($orderID);

    if ($order === null) {
        throw new OrderNotFoundException($orderID);
    }

    if ($order->status === OrderStatus::Canceled) {
        throw new OrderCanceledException($orderID);
    }

    return $order;
}
```

</details>

## Comparação estrita

Use `===` e `!==` sempre. PHP tem coerção de tipo agressiva com `==` que leva a bugs sutis.

<details>
<summary>❌ Bad — comparação fraca com ==</summary>
<br>

```php
if ($userID == "0") {}    // true se $userID for 0 ou false ou ""
if ($status == null) {}   // true se $status for false, "", 0 ou "0"
if ($result == false) {}  // true para 0, "", "0", null, []
```

</details>

<br>

<details>
<summary>✅ Good — comparação estrita com ===</summary>
<br>

```php
if ($userID === 0) {}
if ($status === null) {}
if ($result === false) {}
```

</details>

## match — mapeamento de valores

`match` usa comparação estrita, não faz fallthrough automático e lança `UnhandledMatchError`
para valores não cobertos. Substitui `switch` para mapeamento de valores.

<details>
<summary>❌ Bad — switch para mapeamento de valores</summary>
<br>

```php
switch ($status) {
    case 'pending':
        $label = 'Pendente';
        break;
    case 'processing':
        $label = 'Processando';
        break;
    case 'shipped':
        $label = 'Enviado';
        break;
    default:
        $label = 'Desconhecido';
}
```

</details>

<br>

<details>
<summary>✅ Good — match: conciso, estrito, sem fallthrough</summary>
<br>

```php
$label = match($order->status) {
    OrderStatus::Pending    => 'Pendente',
    OrderStatus::Processing => 'Processando',
    OrderStatus::Shipped    => 'Enviado',
    OrderStatus::Delivered  => 'Entregue',
    OrderStatus::Canceled   => 'Cancelado',
};
```

</details>

## Aninhamento em cascata

Máximo 2 níveis de indentação. Guard clauses substituem a pirâmide de condicionais.

<details>
<summary>❌ Bad — pyramid of doom</summary>
<br>

```php
function processPayment(Order $order): void
{
    if ($order->isValid()) {
        if ($order->customer->hasCreditLimit()) {
            if ($order->amount <= $order->customer->creditLimit) {
                if ($this->chargeCustomer($order)) {
                    $this->notifyCustomer($order);
                } else {
                    throw new ChargeFailedException();
                }
            } else {
                throw new CreditLimitExceededException();
            }
        } else {
            throw new NoCreditLimitException();
        }
    } else {
        throw new InvalidOrderException();
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clauses, fluxo linear</summary>
<br>

```php
function processPayment(Order $order): void
{
    if (!$order->isValid()) {
        throw new InvalidOrderException($order->id);
    }

    if (!$order->customer->hasCreditLimit()) {
        throw new NoCreditLimitException($order->customer->id);
    }

    if ($order->amount > $order->customer->creditLimit) {
        throw new CreditLimitExceededException($order->amount, $order->customer->creditLimit);
    }

    $this->chargeCustomer($order);
    $this->notifyCustomer($order);
}
```

</details>

## Operador nullsafe (?->)

Use `?->` para encadear acessos opcionais sem verificações de null intermediárias.

<details>
<summary>❌ Bad — verificações de null encadeadas</summary>
<br>

```php
$city = null;

if ($user !== null) {
    if ($user->address !== null) {
        if ($user->address->city !== null) {
            $city = $user->address->city;
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — nullsafe operator elimina o aninhamento</summary>
<br>

```php
$city = $user?->address?->city;
```

</details>

## Null coalescing (??)

Use `??` para fornecer um valor padrão quando a expressão da esquerda é null.

<details>
<summary>✅ Good — ?? para valores opcionais com default</summary>
<br>

```php
$page = (int) ($_GET['page'] ?? 1);
$limit = (int) ($_GET['limit'] ?? 20);

$customerName = $order->customer?->name ?? 'Guest';
```

</details>

## foreach e iteração

Use `foreach` para iterar sobre arrays e coleções. Prefira funções de array (`array_map`,
`array_filter`, `array_reduce`) para transformações declarativas.

<details>
<summary>✅ Good — foreach para iteração; array_map para transformação</summary>
<br>

```php
// Iteração com efeito colateral: foreach
foreach ($orders as $order) {
    $this->processOrder($order);
}

// Transformação sem efeito colateral: array_map
$ids = array_map(fn(Order $order): int => $order->id, $orders);

// Filtro: array_filter
$activeOrders = array_filter($orders, fn(Order $order): bool => $order->isActive());
```

</details>
