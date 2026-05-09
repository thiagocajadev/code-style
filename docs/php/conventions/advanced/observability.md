# Observability

> Escopo: PHP 8.4 + Monolog 3.

PHP usa **Monolog** como biblioteca de logging padrão. Implemente a interface **PSR-3**
(`Psr\Log\LoggerInterface`) para que o código de domínio não dependa de Monolog diretamente.
Logs devem ser em JSON para produção. Nunca logue **PII** (Personally Identifiable
Information, Informação Pessoalmente Identificável).

→ Princípios gerais de observabilidade em [shared/standards/observability.md](../../../../shared/standards/observability.md).

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **Monolog** | Biblioteca de logging mais usada em PHP; implementa PSR-3 com handlers e formatters configuráveis |
| **PSR-3** | Interface padrão de logger PHP: `LoggerInterface` com métodos `debug`, `info`, `warning`, `error`, etc. |
| **handler** (manipulador) | Destino do log: arquivo, stdout, Slack, Sentry; configurado no Monolog |
| **formatter** (formatador) | Define o formato de saída do log: JSON, texto simples, etc. |
| **context** (contexto) | Array de pares chave-valor passado junto com a mensagem de log |

## Configuração do logger

Configure Monolog com `JsonFormatter` para produção. Injete `LoggerInterface` via construtor,
nunca use o logger global ou Facade.

<details>
<summary>✅ Good — Monolog com JsonFormatter para produção</summary>
<br>

```php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\JsonFormatter;

function buildLogger(): Logger
{
    $handler = new StreamHandler('php://stdout', Logger::INFO);
    $handler->setFormatter(new JsonFormatter());

    $logger = new Logger('app');
    $logger->pushHandler($handler);

    return $logger;
}
```

```php
// Service recebe LoggerInterface, não Logger concreto
use Psr\Log\LoggerInterface;

final class OrderService
{
    public function __construct(
        private readonly OrderRepository $repository,
        private readonly LoggerInterface $logger,
    ) {}
}
```

</details>

## Log com contexto estruturado

Passe contexto como array de pares chave-valor. Nunca interpole variáveis na mensagem.

<details>
<summary>❌ Bad — interpolação na mensagem, sem estrutura</summary>
<br>

```php
$this->logger->info("Processing order {$order->id} for customer {$order->customerID} with amount {$order->amount}");
$this->logger->error("Error saving order {$order->id}: {$e->getMessage()}");
```

</details>

<br>

<details>
<summary>✅ Good — contexto como array, mensagem fixa</summary>
<br>

```php
$this->logger->info('Processing order', [
    'order_id'    => $order->id,
    'customer_id' => $order->customerID,
    'amount'      => $order->amount,
]);

$this->logger->error('Save order failed', [
    'order_id' => $order->id,
    'error'    => $e->getMessage(),
]);
```

</details>

## Níveis corretos

| Nível    | Quando usar                                               |
| -------- | --------------------------------------------------------- |
| `debug`  | Estado interno para diagnóstico; desligado em produção    |
| `info`   | Evento de negócio: pedido criado, pagamento processado    |
| `warning`| Situação inesperada mas recuperável; merece investigação  |
| `error`  | Falha que requer atenção; operação não foi executada      |
| `critical`| Falha grave; impacta funcionalidade central do sistema  |

<details>
<summary>❌ Bad — error para evento esperado</summary>
<br>

```php
$order = $this->repository->findByID($orderID);
if ($order === null) {
    $this->logger->error("Order {$orderID} not found"); // not found é esperado, não é error
    return null;
}
```

</details>

<br>

<details>
<summary>✅ Good — info para evento esperado; error para falha real</summary>
<br>

```php
$order = $this->repository->findByID($orderID);
if ($order === null) {
    $this->logger->info('Order not found', ['order_id' => $orderID]);
    throw new OrderNotFoundException($orderID);
}

// Falha real: error
try {
    $this->repository->save($order);
} catch (\Throwable $e) {
    $this->logger->error('Save order failed', [
        'order_id' => $orderID,
        'error'    => $e->getMessage(),
    ]);

    throw $e;
}
```

</details>

## Correlation ID

Propague um `correlation_id` (identificador de correlação) em todos os logs de uma
requisição. Use um middleware HTTP para gerar ou extrair o ID do header.

<details>
<summary>✅ Good — correlation ID via processor do Monolog</summary>
<br>

```php
use Monolog\Processor\ProcessorInterface;
use Psr\Http\Message\ServerRequestInterface;

final class CorrelationIDProcessor implements ProcessorInterface
{
    private static string $correlationID = '';

    public static function set(string $id): void
    {
        self::$correlationID = $id;
    }

    public function __invoke(array $record): array
    {
        $record['extra']['correlation_id'] = self::$correlationID;

        return $record;
    }
}

// Middleware HTTP
final class CorrelationMiddleware
{
    public function __invoke(ServerRequestInterface $request, callable $next): mixed
    {
        $id = $request->getHeaderLine('X-Correlation-ID') ?: bin2hex(random_bytes(16));

        CorrelationIDProcessor::set($id);

        $response = $next($request);

        return $response->withHeader('X-Correlation-ID', $id);
    }
}
```

</details>

## PII — dados pessoais

Nunca logue dados pessoais: nome, email, CPF, senha, token, número de cartão.

<details>
<summary>❌ Bad — PII nos logs</summary>
<br>

```php
$this->logger->info('User logged in', [
    'user_id' => $user->id,
    'email'   => $user->email,   // PII
    'cpf'     => $user->cpf,     // PII
]);
```

</details>

<br>

<details>
<summary>✅ Good — apenas ID e evento, sem PII</summary>
<br>

```php
$this->logger->info('User logged in', [
    'user_id'        => $user->id,
    'correlation_id' => CorrelationIDProcessor::get(),
]);
```

</details>
