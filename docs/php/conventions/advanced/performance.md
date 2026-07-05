# Performance

> Escopo: PHP 8.4.

A otimização mais impactante em PHP é **OPcache** (habilitado por padrão no PHP 8+).
Além disso, evite N+1 em queries, use generators para datasets grandes e lazy objects
(PHP 8.4) para inicialização diferida de dependências pesadas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **OPcache** (cache de bytecode do PHP) | Mantém o bytecode compilado em memória, eliminando o parse a cada requisição |
| **JIT** (Just-In-Time, compilação em tempo de execução) | Componente do OPcache que compila trechos quentes para código nativo; ganhos em CPU-bound |
| **N+1 query** (consulta N+1) | Anti-padrão: uma query principal seguida de N queries derivadas; resolver com eager loading |
| **generator** (gerador) | Função com `yield` que produz valores sob demanda; uso de memória constante para datasets grandes |
| **lazy object** (objeto preguiçoso) | Instância criada apenas quando usada pela primeira vez; PHP 8.4 traz suporte nativo |
| **autoloading** (carregamento automático) | Inclusão de classes sob demanda via Composer; OPcache torna o custo desprezível |

## OPcache

OPcache armazena o bytecode compilado em memória, eliminando o parse do PHP a cada
requisição. Certifique-se que está habilitado em produção.

<details>
<summary>✅ Bom: configuração mínima do OPcache em php.ini</summary>

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
<summary>❌ Ruim: N+1: uma query por ordem</summary>

```php
$orders = $this->orderRepository->findAll();

foreach ($orders as $order) {
    // N queries ao banco
    $customer = $this->customerRepository->findByID($order->customerID);
    echo "{$order->id}: {$customer->name}\n";
}
```

</details>

<details>
<summary>✅ Bom: carregamento em lote com uma query</summary>

```php
$orders = $this->orderRepository->findAll();

$customerIDs = array_unique(array_column($orders, 'customerID'));
$customers = $this->customerRepository->findByIDs($customerIDs);
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
<summary>❌ Ruim: carrega todos os registros em memória</summary>

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

<details>
<summary>✅ Bom: generator: processa um registro por vez</summary>

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
<summary>✅ Bom: lazy initializer com Reflection (PHP 8.4)</summary>

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
<summary>❌ Ruim: concatenação em loop, O(n²)</summary>

```php
$csv = '';
foreach ($orders as $order) {
    $csv .= "{$order->id},{$order->status},{$order->amount}\n";
}
```

</details>

<details>
<summary>✅ Bom: array + implode: uma única alocação de string</summary>

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
<summary>✅ Bom: separação de transformação e efeito colateral</summary>

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
