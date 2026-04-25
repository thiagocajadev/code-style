# Async

> Escopo: PHP 8.4.

PHP tem execução síncrona por padrão. **Fibers** (fibras, PHP 8.1+) são o mecanismo nativo
de corrotinas. Para I/O assíncrono real, use **Revolt** (event loop baseado em Fibers) ou
**ReactPHP**. A maioria dos projetos PHP obtém concorrência via processos separados (workers
de fila) em vez de async dentro de um único processo.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **Fiber** (fibra) | Corrotina nativa do PHP 8.1+: execução pausável e retomável dentro de um único processo |
| **event loop** (laço de eventos) | Estrutura que monitora múltiplos I/Os e despacha callbacks quando prontos; base de ReactPHP e Revolt |
| **Revolt** | Event loop moderno baseado em Fibers para PHP 8.1+; substitui o loop de callbacks do ReactPHP |
| **worker** (trabalhador) | Processo separado que consome fila de mensagens; padrão mais comum para concorrência em PHP |
| `suspend` | Método de Fiber que pausa a execução e devolve controle ao chamador externo |

## Abordagem recomendada — workers de fila

Para a maioria dos casos em PHP, concorrência é obtida com múltiplos processos workers
consumindo uma fila (RabbitMQ, SQS, Redis Streams), não com async dentro de um processo.

<details>
<summary>✅ Good — worker simples de fila para tarefas concorrentes</summary>
<br>

```php
// Worker que processa mensagens de uma fila
final class OrderWorker
{
    public function __construct(
        private readonly MessageQueue $queue,
        private readonly OrderService $service,
        private readonly Logger $logger,
    ) {}

    public function run(): void
    {
        while (true) {
            $message = $this->queue->consume('orders.process');

            if ($message === null) {
                usleep(100_000); // 100ms de backoff
                continue;
            }

            $this->processMessage($message);
        }
    }

    private function processMessage(Message $message): void
    {
        try {
            $order = OrderJob::fromMessage($message);

            $this->service->processOrder($order);
            $this->queue->ack($message);
        } catch (\Throwable $e) {
            $this->logger->error('Order processing failed', [
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);

            $this->queue->nack($message);
        }
    }
}
```

</details>

## Fibers — corrotinas nativas

Use Fibers quando precisar de cooperação explícita dentro de um processo (pipelines de
transformação, simulações de concorrência em testes).

<details>
<summary>✅ Good — Fiber básico com suspend/resume</summary>
<br>

```php
$fiber = new \Fiber(function (): void {
    $value = \Fiber::suspend('first yield');
    echo "Received: {$value}\n";

    \Fiber::suspend('second yield');
    echo "Fiber finished\n";
});

$firstYield = $fiber->start();       // executa até primeiro suspend
echo "Fiber yielded: {$firstYield}\n";

$secondYield = $fiber->resume('hello');  // retoma, envia valor
echo "Fiber yielded: {$secondYield}\n";

$fiber->resume();                    // termina
```

</details>

## Revolt — event loop com Fibers

Use Revolt para I/O assíncrono nativo dentro de um único processo PHP com Fibers.

<details>
<summary>✅ Good — múltiplas chamadas HTTP paralelas com Revolt</summary>
<br>

```php
use Revolt\EventLoop;
use Amp\Http\Client\HttpClientBuilder;

// Revolt com Amp (biblioteca sobre Revolt)
function fetchOrdersInParallel(array $orderIDs): array
{
    $client = HttpClientBuilder::buildDefault();
    $results = [];

    $futures = array_map(function (int $orderID) use ($client): \Amp\Future {
        return \Amp\async(function () use ($orderID, $client) {
            $response = $client->request(
                new \Amp\Http\Client\Request("https://orders-api/orders/{$orderID}")
            );

            return json_decode($response->getBody()->read(), true);
        });
    }, $orderIDs);

    return \Amp\Future\await($futures);
}
```

</details>

## Timeouts em chamadas síncronas

Para projetos síncronos, configure timeouts em todas as chamadas externas.
Use `curl` com `CURLOPT_TIMEOUT` ou `stream_context_create` com timeout explícito.

<details>
<summary>❌ Bad — chamada HTTP sem timeout</summary>
<br>

```php
$response = file_get_contents('https://payment-api/charge');
// bloqueia indefinidamente se a API não responder
```

</details>

<br>

<details>
<summary>✅ Good — curl com timeout explícito</summary>
<br>

```php
final class HttpClient
{
    private const int TIMEOUT_SECONDS = 5;

    public function post(string $url, array $body): array
    {
        $curl = curl_init($url);

        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => self::TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);

        $responseBody = curl_exec($curl);
        $statusCode   = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error        = curl_error($curl);

        curl_close($curl);

        if ($error !== '') {
            throw new \RuntimeException("HTTP request failed: {$error}");
        }

        $decoded = json_decode($responseBody, true);

        return ['status' => $statusCode, 'body' => $decoded];
    }
}
```

</details>
