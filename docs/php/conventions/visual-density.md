# Visual Density

> Escopo: PHP 8.4.

Densidade visual regula o espaçamento entre linhas para comunicar agrupamento lógico.
Linhas relacionadas ficam juntas; grupos distintos ficam separados por uma linha em branco.
Nunca duas linhas em branco consecutivas. PSR-12 define o estilo de chaves e indentação;
a densidade visual é a camada do desenvolvedor por cima.

## Parede de código

<details>
<summary>❌ Bad — bloco sem separação entre grupos lógicos</summary>
<br>

```php
public function processOrder(int $orderID): Order
{
    $order = $this->repository->findByID($orderID);
    if ($order === null) {
        throw new OrderNotFoundException($orderID);
    }
    if ($order->status === OrderStatus::Canceled) {
        throw new OrderCanceledException($orderID);
    }
    $discount = $this->calculateDiscount($order);
    $order->amount = $order->amount - $discount;
    $savedOrder = $this->repository->save($order);
    $this->notifier->notifyOrderUpdated($savedOrder);
    return $savedOrder;
}
```

</details>

<br>

<details>
<summary>✅ Good — grupos separados por linha em branco; return separado do último grupo</summary>
<br>

```php
public function processOrder(int $orderID): Order
{
    $order = $this->repository->findByID($orderID);

    if ($order === null) {
        throw new OrderNotFoundException($orderID);
    }

    if ($order->status === OrderStatus::Canceled) {
        throw new OrderCanceledException($orderID);
    }

    $discount      = $this->calculateDiscount($order);
    $order->amount = $order->amount - $discount;

    $savedOrder = $this->repository->save($order);
    $this->notifier->notifyOrderUpdated($savedOrder);

    return $savedOrder;
}
```

</details>

## Explaining return

A linha de `return` nomeia o resultado. Um blank antes do `return` separa a saída
do último grupo de processamento.

<details>
<summary>❌ Bad — return com lógica inline, sem separação</summary>
<br>

```php
public function buildOrderSummary(array $orders): array
{
    return [
        'count'   => count($orders),
        'total'   => array_sum(array_column($orders, 'amount')),
        'average' => array_sum(array_column($orders, 'amount')) / max(count($orders), 1),
    ];
}
```

</details>

<br>

<details>
<summary>✅ Good — resultado calculado antes, return limpo</summary>
<br>

```php
public function buildOrderSummary(array $orders): array
{
    $count   = count($orders);
    $total   = array_sum(array_column($orders, 'amount'));
    $average = $count > 0 ? $total / $count : 0.0;

    $summary = ['count' => $count, 'total' => $total, 'average' => $average];

    return $summary;
}
```

</details>

## Propriedades de classe

Agrupe propriedades por responsabilidade com linha em branco entre grupos.

<details>
<summary>❌ Bad — propriedades sem separação lógica</summary>
<br>

```php
class OrderService
{
    private string $id;
    private string $name;
    private OrderRepository $repository;
    private Notifier $notifier;
    private Logger $logger;
    private int $maxRetries;
    private float $timeout;
}
```

</details>

<br>

<details>
<summary>✅ Good — propriedades agrupadas por responsabilidade</summary>
<br>

```php
class OrderService
{
    private string $id;
    private string $name;

    private OrderRepository $repository;
    private Notifier $notifier;
    private Logger $logger;

    private int $maxRetries;
    private float $timeout;
}
```

</details>

## Fases de função

Funções com múltiplas fases (leitura → transformação → escrita) devem ter cada fase
separada por linha em branco.

<details>
<summary>❌ Bad — fases misturadas, sem separação</summary>
<br>

```php
public function generateInvoice(int $orderID): Invoice
{
    $order = $this->orderRepository->findByID($orderID);
    $customer = $this->customerRepository->findByID($order->customerID);
    $lineItems = $this->buildLineItems($order->items);
    $total = $this->calculateTotal($lineItems);
    $invoice = new Invoice(orderID: $orderID, customer: $customer, items: $lineItems, total: $total);
    $saved = $this->invoiceRepository->save($invoice);
    $this->notifier->notifyInvoiceGenerated($saved);
    return $saved;
}
```

</details>

<br>

<details>
<summary>✅ Good — fases distintas separadas por linha em branco</summary>
<br>

```php
public function generateInvoice(int $orderID): Invoice
{
    $order    = $this->orderRepository->findByID($orderID);
    $customer = $this->customerRepository->findByID($order->customerID);

    $lineItems = $this->buildLineItems($order->items);
    $total     = $this->calculateTotal($lineItems);

    $invoice = new Invoice(
        orderID: $orderID,
        customer: $customer,
        items: $lineItems,
        total: $total,
    );

    $saved = $this->invoiceRepository->save($invoice);
    $this->notifier->notifyInvoiceGenerated($saved);

    return $saved;
}
```

</details>

## Construtor com promoted properties

Com PHP 8.0+ promoted properties, use uma declaração por linha para manter legibilidade.

<details>
<summary>✅ Good — promoted properties em múltiplas linhas</summary>
<br>

```php
final class OrderService
{
    public function __construct(
        private readonly OrderRepository $repository,
        private readonly Notifier $notifier,
        private readonly Logger $logger,
        private readonly int $maxRetries = 3,
    ) {}
}
```

</details>
