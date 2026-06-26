# Control Flow

> Escopo: PHP 8.4.

PHP favorece fluxo linear e retorno antecipado. Use `===` para comparação estrita.
O `match` (PHP 8.0+) substitui cadeias de `if/elseif` para mapeamento de valores.
O operador nullsafe `?->` elimina verificações de null encadeadas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `if` no topo da função que retorna cedo em caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | Sair da função assim que o resultado for conhecido, sem `else` desnecessário |
| **strict comparison** (comparação estrita) | `===` e `!==` comparam valor e tipo; `==` faz coerção e introduz bugs sutis |
| **match expression** (expressão de mapeamento) | `match($v) { ... }`: comparação estrita por valor com retorno explícito; PHP 8.0+ |
| **nullsafe operator** (operador seguro contra null) | `?->` curto-circuita encadeamentos quando o alvo é `null` |
| **null coalescing** (coalescência de nulos) | `??` retorna o operando à direita quando o da esquerda é `null` |
| **truthy / falsy** (avalia como verdadeiro / como falso) | Em PHP, `0`, `'0'`, `''`, `null` e `[]` são falsy; preferir comparação explícita |

## if e else

Após um `return` ou `throw`, o `else` é desnecessário e cria aninhamento sem valor.

<details>
<summary>❌ Ruim: else após return</summary>

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

<details>
<summary>✅ Bom: guard clauses, sem else após return</summary>

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
<summary>❌ Ruim: comparação fraca com ==</summary>

```php
if ($userID == "0") {}    // true se $userID for 0 ou false ou ""
if ($status == null) {}   // true se $status for false, "", 0 ou "0"
if ($result == false) {}  // true para 0, "", "0", null, []
```

</details>

<details>
<summary>✅ Bom: comparação estrita com ===</summary>

```php
if ($userID === 0) {}
if ($status === null) {}
if ($result === false) {}
```

</details>

## Ternário

Para atribuição de dois valores possíveis. Três ou mais alternativas → `match`. Nunca aninhar
ternários.

<details>
<summary>❌ Ruim: if/else imperativo para atribuição simples</summary>

```php
$label = '';
if ($order->isSettled) {
    $label = 'Settled';
} else {
    $label = 'Pending';
}
```

</details>

<details>
<summary>✅ Bom: ternário na atribuição</summary>

```php
$label = $order->isSettled ? 'Settled' : 'Pending';
```

</details>

<details>
<summary>❌ Ruim: ternário aninhado para 3+ alternativas</summary>

```php
$priority = $isUrgent ? ($isCritical ? 'Critical' : 'High') : 'Normal';
```

</details>

<details>
<summary>✅ Bom: match para 3+ alternativas</summary>

```php
$priority = match (true) {
    $isUrgent && $isCritical => 'Critical',
    $isUrgent => 'High',
    default => 'Normal',
};
```

</details>

## Aninhamento em cascata

Máximo 2 níveis de indentação. Guard clauses substituem a pirâmide de condicionais.

<details>
<summary>❌ Ruim: pyramid of doom</summary>

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

<details>
<summary>✅ Bom: guard clauses, fluxo linear</summary>

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

## match: mapeamento de valores

`match` usa comparação estrita, não faz fallthrough automático e lança `UnhandledMatchError`
para valores não cobertos. Substitui `switch` para mapeamento de valores.

<details>
<summary>❌ Ruim: switch para mapeamento de valores</summary>

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

<details>
<summary>✅ Bom: match: conciso, estrito, sem fallthrough</summary>

```php
$label = match($order->status) {
    OrderStatus::Pending => 'Pendente',
    OrderStatus::Processing => 'Processando',
    OrderStatus::Shipped => 'Enviado',
    OrderStatus::Delivered => 'Entregue',
    OrderStatus::Canceled => 'Cancelado',
};
```

</details>

## Operador nullsafe (?->)

Use `?->` para encadear acessos opcionais sem verificações de null intermediárias.

<details>
<summary>❌ Ruim: verificações de null encadeadas</summary>

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

<details>
<summary>✅ Bom: nullsafe operator elimina o aninhamento</summary>

```php
$city = $user?->address?->city;
```

</details>

## Null coalescing (??)

Use `??` para fornecer um valor padrão quando a expressão da esquerda é null.

<details>
<summary>✅ Bom: ?? para valores opcionais com default</summary>

```php
$page = (int) ($_GET['page'] ?? 1);
$limit = (int) ($_GET['limit'] ?? 20);

$customerName = $order->customer?->name ?? 'Guest';
```

</details>

## Circuit break

Antes de escrever um loop, verifique se `array_find` ou `array_any` (PHP 8.4) já resolve. Essas
funções param no primeiro match, sem percorrer o resto. Para lógica de saída explícita, `foreach`
com `return` antecipado é direto.

<details>
<summary>❌ Ruim: loop com flag percorre tudo mesmo após encontrar</summary>

```php
function findFirstExpiredProduct(array $products): ?Product
{
    $expired = null;

    foreach ($products as $product) {
        if ($expired === null && $product->isExpired()) {
            $expired = $product; // continua iterando mesmo após encontrar
        }
    }

    return $expired;
}
```

</details>

<details>
<summary>✅ Bom: foreach com return antecipado sai no primeiro match</summary>

```php
function findFirstExpiredProduct(array $products): ?Product
{
    foreach ($products as $product) {
        if ($product->isExpired()) return $product;
    }

    return null;
}
```

</details>

<details>
<summary>✅ Bom: array_find / array_any com circuit break nativo (PHP 8.4)</summary>

```php
// para no primeiro match: retorna o elemento ou null
$expiredProduct = array_find($products, fn(Product $p) => $p->isExpired());

// para no primeiro true
$hasExpired = array_any($products, fn(Product $p) => $p->isExpired());

// para no primeiro false
$allActive = array_all($products, fn(Product $p) => $p->isActive());
```

</details>

## foreach e iteração

Use `foreach` para iterar sobre arrays e coleções. Prefira funções de array (`array_map`,
`array_filter`, `array_reduce`) para transformações declarativas.

<details>
<summary>✅ Bom: foreach para iteração; array_map para transformação</summary>

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
