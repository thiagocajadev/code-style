# Performance

> Escopo: PHP 8.4.

A otimização mais impactante em PHP é **OPcache** (habilitado por padrão no PHP 8+).
Além disso, evite N+1 em queries, use generators para datasets grandes e lazy objects
(PHP 8.4) para inicialização diferida de dependências pesadas.

## OPcache

OPcache armazena o bytecode compilado em memória, eliminando o parse do PHP a cada
requisição. Certifique-se que está habilitado em produção.

<details>
<summary>✅ Good — configuração mínima do OPcache em php.ini</summary>
<br>

```ini
; php.ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0    ; desabilitar em produção: requer restart no deploy
opcache.jit=tracing
opcache.jit_buffer_size=128M
```

</details>

## Evitar N+1 em queries

Carregue dados em lote com uma única query, nunca uma query por item em loop.

<details>
<summary>❌ Bad — N+1: uma query por ordem</summary>
<br>

```php
$orders = $this->orderRepository->findAll();

foreach ($orders as $order) {
    // N queries ao banco
    $customer = $this->customerRepository->findByID($order->customerID);
    echo "{$order->id}: {$customer->name}\n";
}
```

</details>

<br>

<details>
<summary>✅ Good — carregamento em lote com uma query</summary>
<br>

```php
$orders = $this->orderRepository->findAll();

$customerIDs = array_unique(array_column($orders, 'customerID'));
$customers   = $this->customerRepository->findByIDs($customerIDs);
$customerMap = array_column($customers, null, 'id');

foreach ($orders as $order) {
    $customer = $customerMap[$order->customerID] ?? null;

    echo "{$order->id}: {$customer?->name}\n";
}
```

</details>

## Generators para datasets grandes

Use `yield` para processar grandes volumes de dados sem carregar tudo na memória.

<details>
<summary>❌ Bad — carrega todos os registros em memória</summary>
<br>

```php
public function findAllOrders(): array
{
    $stmt = $this->connection->query('SELECT * FROM orders');
    return $stmt->fetchAll(\PDO::FETCH_ASSOC); // 1 milhão de registros em memória
}

foreach ($this->repository->findAllOrders() as $order) {
    $this->processOrder($order);
}
```

</details>

<br>

<details>
<summary>✅ Good — generator: processa um registro por vez</summary>
<br>

```php
public function streamAllOrders(): \Generator
{
    $stmt = $this->connection->query('SELECT * FROM orders ORDER BY id');

    while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
        yield Order::fromRow($row);
    }
}

foreach ($this->repository->streamAllOrders() as $order) {
    $this->processOrder($order); // memória constante
}
```

</details>

## Lazy objects (PHP 8.4)

Use lazy objects para diferir a inicialização de objetos pesados até que sejam
realmente necessários.

<details>
<summary>✅ Good — lazy initializer com Reflection (PHP 8.4)</summary>
<br>

```php
use ReflectionClass;

final class ServiceContainer
{
    private array $bindings = [];

    public function bind(string $abstract, callable $factory): void
    {
        $reflection = new ReflectionClass($abstract);

        $this->bindings[$abstract] = $reflection->newLazyProxy($factory);
    }

    public function get(string $abstract): mixed
    {
        return $this->bindings[$abstract]
            ?? throw new \RuntimeException("{$abstract} not bound");
    }
}

// O objeto só é instanciado quando um método é chamado pela primeira vez
$container->bind(
    ExpensiveService::class,
    fn() => new ExpensiveService($heavyDependency)
);
```

</details>

## Concatenação eficiente

Evite concatenação em loop. Use `implode` para juntar arrays ou `sprintf`/heredoc
para strings complexas.

<details>
<summary>❌ Bad — concatenação em loop, O(n²)</summary>
<br>

```php
$csv = '';
foreach ($orders as $order) {
    $csv .= "{$order->id},{$order->status},{$order->amount}\n";
}
```

</details>

<br>

<details>
<summary>✅ Good — array + implode: uma única alocação de string</summary>
<br>

```php
$lines = array_map(
    fn(Order $order): string => "{$order->id},{$order->status},{$order->amount}",
    $orders
);

$csv = implode("\n", $lines);
```

</details>

## array_map vs foreach

Use `array_map` para transformações puras. Use `foreach` para efeitos colaterais
(salvar, enviar, logar). Nunca misture transformação e efeito colateral.

<details>
<summary>✅ Good — separação de transformação e efeito colateral</summary>
<br>

```php
// Transformação pura: array_map
$summaries = array_map(
    fn(Order $order): OrderSummary => $this->buildSummary($order),
    $orders
);

// Efeito colateral: foreach
foreach ($orders as $order) {
    $this->notifier->notifyOrderProcessed($order);
}
```

</details>
