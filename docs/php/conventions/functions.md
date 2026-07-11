# Functions

> Escopo: PHP 8.4.

PHP distingue **funções livres** de **métodos**. Ambos seguem SLA (Single Level of
Abstraction, Único Nível de Abstração): uma função orquestra ou implementa, nunca os dois.
O **explaining return** nomeia o resultado antes de retornar. PHP 8.0+ introduziu
**named arguments** (argumentos nomeados) que tornam chamadas com muitos parâmetros legíveis.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **named argument** (argumento nomeado) | Passado pelo nome do parâmetro: `create(name: 'Alice', age: 30)`; disponível desde PHP 8.0 |
| **arrow function** (função em flecha) | `fn($x) => expr`: closure de uma linha que captura escopo externo automaticamente |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | Cada função opera em um único nível: orquestra ou implementa, nunca os dois |
| **stepdown rule** (regra de descida) | Orquestrador aparece primeiro; detalhes ficam abaixo na ordem de leitura |
| **helper** (função auxiliar) | Função de apoio que implementa um passo do orquestrador; dá nome ao detalhe |

<a id="single-level-of-abstraction"></a>

## SLA: orquestrador ou implementação

<details>
<summary>❌ Ruim: god function: orquestra e implementa ao mesmo tempo</summary>

```php
public function processOrder(array $data): void
{
    // validação manual inline
    if (empty($data['customer_id'])) {
        throw new \InvalidArgumentException('customer_id is required');
    }
    if ($data['amount'] <= 0) {
        throw new \InvalidArgumentException('amount must be positive');
    }

    // desconto inline
    if ($data['is_premium']) {
        $data['amount'] = $data['amount'] * 0.9;
    }

    // persistência inline
    $stmt = $this->db->prepare('INSERT INTO orders ...');
    $stmt->execute($data);

    // notificação inline
    file_get_contents("https://notifications/send?order_id=" . $data['id']);
}
```

</details>

<details>
<summary>✅ Bom: orquestrador delega para funções de um nível abaixo</summary>

```php
public function processOrder(CreateOrderInput $input): Order
{
    $this->validateOrder($input);

    $discountedInput = $this->applyCustomerDiscount($input);

    $savedOrder = $this->repository->save($discountedInput);
    $this->notifier->notifyOrderCreated($savedOrder);

    return $savedOrder;
}

private function validateOrder(CreateOrderInput $input): void
{
    if ($input->customerID <= 0) {
        throw new ValidationException('customer_id', 'is required');
    }

    if ($input->amount <= 0) {
        throw new ValidationException('amount', 'must be positive');
    }
}

private function applyCustomerDiscount(CreateOrderInput $input): CreateOrderInput
{
    if (!$input->customer->isPremium) {
        return $input;
    }

    $discountedAmount = $input->amount * 0.9;
    $discountedInput = $input->withAmount($discountedAmount);
    return $discountedInput;
}
```

</details>

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

Atribua a uma variável nomeada antes de retornar.

<details>
<summary>❌ Ruim: lógica inline no return</summary>

```php
public function buildSummary(array $orders): array
{
    return [
        'count' => count($orders),
        'total' => array_sum(array_column($orders, 'amount')),
        'ids'   => array_column($orders, 'id'),
    ];
}
```

</details>

<details>
<summary>✅ Bom: explaining return: resultado nomeado antes do return</summary>

```php
public function buildSummary(array $orders): array
{
    $count = count($orders);
    $total = array_sum(array_column($orders, 'amount'));
    $ids = array_column($orders, 'id');

    $summary = ['count' => $count, 'total' => $total, 'ids' => $ids];
    return $summary;
}
```

</details>

## Named arguments para clareza

Use named arguments quando a posição dos parâmetros não é óbvia ou quando há muitos
parâmetros opcionais.

<details>
<summary>❌ Ruim: chamada com múltiplos literais sem contexto</summary>

```php
$order = createOrder(42, 150.0, 'BRL', true, false, null);
// O que é true? false? null?
```

</details>

<details>
<summary>✅ Bom: named arguments tornam a chamada autodocumentada</summary>

```php
$order = createOrder(
    customerID: 42,
    amount: 150.0,
    currency: 'BRL',
    isPriority: true,
    requiresSignature: false,
    notes: null,
);
```

</details>

## Parâmetros: máximo 3

Com 4 ou mais parâmetros, agrupe em um objeto de entrada.

<details>
<summary>❌ Ruim: muitos parâmetros na assinatura</summary>

```php
function createOrder(
    int $customerID,
    float $amount,
    string $currency,
    string $shippingAddress,
    string $billingAddress,
    ?string $notes
): Order {}
```

</details>

<details>
<summary>✅ Bom: objeto de entrada agrupa parâmetros relacionados</summary>

```php
final readonly class CreateOrderInput
{
    public function __construct(
        public int $customerID,
        public float $amount,
        public string $currency,
        public string $shippingAddress,
        public string $billingAddress,
        public ?string $notes = null,
    ) {}
}

function createOrder(CreateOrderInput $input): Order {}
```

</details>

## Arrow functions para transformações

Use arrow functions para transformações curtas em `array_map`, `array_filter`, `usort`.

<details>
<summary>❌ Ruim: closures tradicionais: verbosas e exigem `use` explícito</summary>

```php
$multiplier = 1.1;

$adjustedAmounts = array_map(
    function (Order $order) use ($multiplier) {
        return $order->amount * $multiplier;
    },
    $orders
);

$activeOrders = array_filter(
    $orders,
    function (Order $order) {
        return $order->isActive();
    }
);

usort($orders, function (Order $a, Order $b) {
    return $a->createdAt <=> $b->createdAt;
});
```

</details>

<details>
<summary>✅ Bom: arrow functions para pipelines de transformação</summary>

```php
$activeOrderIDs = array_map(
    fn(Order $order): int => $order->id,
    array_filter(
        $orders,
        fn(Order $order): bool => $order->isActive()
    )
);

usort(
    $orders,
    fn(Order $a, Order $b): int => $a->createdAt <=> $b->createdAt
);
```

</details>

## Stepdown rule

O método público orquestrador aparece primeiro. Os métodos privados de suporte ficam
abaixo, na ordem em que são chamados.

<details>
<summary>❌ Ruim: helpers antes do orquestrador: leitura de baixo para cima</summary>

```php
final class InvoiceService
{
    private function formatReport(Summary $summary, \DateTimeImmutable $month): Report
    {
        $report = new Report(month: $month->format('Y-m'), summary: $summary);
        return $report;
    }

    private function buildSummary(array $invoices): Summary
    {
        $count = count($invoices);
        $total = array_sum(array_column($invoices, 'amount'));
        $summary = new Summary(count: $count, total: $total);
        return $summary;
    }

    // orquestrador está no final: leitor vê detalhes antes da intenção
    public function generateMonthlyReport(\DateTimeImmutable $month): Report
    {
        $invoices = $this->repository->findByMonth($month);
        $summary  = $this->buildSummary($invoices);
        $report   = $this->formatReport($summary, $month);
        return $report;
    }
}
```

</details>

<details>
<summary>✅ Bom: leitura top-down natural</summary>

```php
final class InvoiceService
{
    public function generateMonthlyReport(\DateTimeImmutable $month): Report
    {
        $invoices = $this->repository->findByMonth($month);
        $summary = $this->buildSummary($invoices);

        $report = $this->formatReport($summary, $month);
        return $report;
    }

    private function buildSummary(array $invoices): Summary
    {
        $count = count($invoices);
        $total = array_sum(array_column($invoices, 'amount'));

        $summary = new Summary(count: $count, total: $total);
        return $summary;
    }

    private function formatReport(Summary $summary, \DateTimeImmutable $month): Report
    {
        $report = new Report(
            month: $month->format('Y-m'),
            summary: $summary,
        );

        return $report;
    }
}
```

</details>
