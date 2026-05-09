# Error Handling

> Escopo: PHP 8.4.

Em PHP, erros são comunicados via exceções tipadas. `try/catch` fica nas fronteiras
do sistema (handlers HTTP, workers de fila). O domínio lança exceções; a fronteira
as converte em resposta apropriada. Nunca capture `\Throwable` ou `\Exception` sem
propósito específico.

## Exceção como string

Nunca lance strings ou `\Exception` diretamente. Crie uma hierarquia de exceções
de domínio para que os callers possam tratar tipos específicos.

<details>
<summary>❌ Bad — Exception genérica sem tipo</summary>
<br>

```php
function findOrder(int $orderID): Order
{
    $order = $this->repository->findByID($orderID);
    if ($order === null) {
        throw new \Exception('Order not found'); // string genérica
    }
    return $order;
}

// caller não consegue distinguir "not found" de outros erros
try {
    $order = findOrder(42);
} catch (\Exception $e) {
    // captura tudo, incluindo erros de banco, rede, etc.
}
```

</details>

<br>

<details>
<summary>✅ Good — hierarquia de exceções de domínio</summary>
<br>

```php
// Exceção base do domínio
class DomainException extends \RuntimeException {}

// Exceções específicas
class OrderNotFoundException extends DomainException
{
    public function __construct(int $orderID, \Throwable $previous = null)
    {
        parent::__construct("Order {$orderID} not found", previous: $previous);
    }
}

class OrderCanceledException extends DomainException
{
    public function __construct(int $orderID, \Throwable $previous = null)
    {
        parent::__construct("Order {$orderID} is already canceled", previous: $previous);
    }
}

// service
public function findActiveOrder(int $orderID): Order
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

// caller
try {
    $order = $this->service->findActiveOrder($orderID);
} catch (OrderNotFoundException $e) {
    $response = new Response(status: 404, body: ['error' => 'order not found']);

    return $response;
} catch (OrderCanceledException $e) {
    $response = new Response(status: 409, body: ['error' => 'order is canceled']);

    return $response;
}
```

</details>

## try/catch espalhado

`try/catch` pertence às fronteiras do sistema. O domínio lança, a fronteira captura e traduz.

<details>
<summary>❌ Bad — try/catch no meio do domínio</summary>
<br>

```php
class OrderService
{
    public function processOrder(Order $order): void
    {
        try {
            $this->validateOrder($order);
        } catch (\Exception $e) {
            // captura dentro do domínio, perde contexto
            error_log($e->getMessage());
        }

        try {
            $this->repository->save($order);
        } catch (\Exception $e) {
            error_log($e->getMessage());
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — domínio lança, fronteira captura</summary>
<br>

```php
// Domínio: apenas lança
class OrderService
{
    public function processOrder(Order $order): Order
    {
        $this->validateOrder($order);

        $savedOrder = $this->repository->save($order);
        $this->notifier->notifyOrderCreated($savedOrder);

        return $savedOrder;
    }
}

// Handler (fronteira): captura e traduz para HTTP
class OrderHandler
{
    public function createOrder(Request $request): Response
    {
        try {
            $input = $this->parseInput($request);
            $order    = $this->service->processOrder($input);
            $response = new Response(status: 201, body: $order->toArray());

            return $response;
        } catch (ValidationException $e) {
            $response = new Response(status: 422, body: ['errors' => $e->getErrors()]);

            return $response;
        } catch (DomainException $e) {
            $response = new Response(status: 409, body: ['error' => $e->getMessage()]);

            return $response;
        } catch (\Throwable $e) {
            $this->logger->error('Unexpected error', ['exception' => $e]);

            $response = new Response(status: 500, body: ['error' => 'internal error']);

            return $response;
        }
    }
}
```

</details>

## Validação tardia

Valide na fronteira antes de chegar ao domínio. O service não deve receber dados inválidos.

<details>
<summary>❌ Bad — validação no service, tarde demais</summary>
<br>

```php
class OrderService
{
    public function createOrder(array $data): Order
    {
        // validação misturada com lógica de negócio
        if (empty($data['customer_id'])) {
            throw new \InvalidArgumentException('customer_id is required');
        }
        if ($data['amount'] <= 0) {
            throw new \InvalidArgumentException('amount must be positive');
        }
        // ...
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — validação na fronteira, service recebe dados válidos</summary>
<br>

```php
// Fronteira: valida e converte
class OrderHandler
{
    public function createOrder(Request $request): Response
    {
        $input = $this->validator->validate(
            $request->body(),
            CreateOrderInput::class
        );

        $order    = $this->service->createOrder($input);
        $response = new Response(status: 201, body: $order->toArray());

        return $response;
    }
}

// Service: recebe CreateOrderInput já validado
class OrderService
{
    public function createOrder(CreateOrderInput $input): Order
    {
        $discountedInput = $this->applyCustomerDiscount($input);
        $savedOrder      = $this->repository->save($discountedInput);

        return $savedOrder;
    }
}
```

</details>

## finally para cleanup

Use `finally` para liberar recursos independente de sucesso ou falha.

<details>
<summary>✅ Good — finally garante cleanup em qualquer saída</summary>
<br>

```php
public function processWithLock(int $orderID): Order
{
    $lockKey = "order:{$orderID}:lock";

    $this->cache->acquire($lockKey);

    try {
        $order = $this->findActiveOrder($orderID);
        $processedOrder = $this->applyProcessing($order);

        return $this->repository->save($processedOrder);
    } finally {
        $this->cache->release($lockKey); // sempre executado
    }
}
```

</details>
