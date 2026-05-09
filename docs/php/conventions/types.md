# Types

> Escopo: PHP 8.4.

PHP tem tipagem gradual: tipos são opcionais mas fortemente recomendados com
`declare(strict_types=1)`. PHP 8.x adicionou union types, enums, readonly classes e
property hooks. Use tipos sempre; `mixed` só quando genuinamente inevitável.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **union type** (tipo união) | `int\|string` — aceita mais de um tipo; disponível desde PHP 8.0 |
| **intersection type** (tipo interseção) | `Countable&Stringable` — deve satisfazer todos os tipos; desde PHP 8.1 |
| `enum` | Tipo de enumeração com casos tipados (`string` ou `int`); desde PHP 8.1 |
| **readonly class** (classe somente leitura) | Todas as propriedades são `readonly` por padrão; desde PHP 8.2 |
| **property hooks** (ganchos de propriedade) | `get`/`set` inline na declaração da propriedade; desde PHP 8.4 |
| `never` | Tipo de retorno que indica função que nunca retorna (sempre lança ou termina o processo) |

## Union types

Use union types quando uma função aceita ou retorna tipos legitimamente distintos.
Não use como escape para falta de tipagem.

<details>
<summary>❌ Bad — mixed onde union type seria preciso</summary>
<br>

```php
function findByIdentifier(mixed $identifier): mixed
{
    // $identifier pode ser int ou string, mas mixed esconde essa informação
}
```

</details>

<br>

<details>
<summary>✅ Good — union type expressa os tipos aceitos</summary>
<br>

```php
function findByIdentifier(int|string $identifier): ?User
{
    if (is_int($identifier)) {
        return $this->repository->findByID($identifier);
    }

    $user = $this->repository->findByEmail($identifier);

    return $user;
}
```

</details>

## Enums

Use `enum` para conjuntos fechados de valores. Backed enums (`string` ou `int`) são
serializáveis; enums puros são para modelagem sem serialização.

<details>
<summary>❌ Bad — strings mágicas para status</summary>
<br>

```php
class Order
{
    public string $status; // 'pending'? 'active'? 'shipped'? sem garantia de valor

    public function isPending(): bool
    {
        return $this->status === 'pending'; // frágil
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — enum backed para status com serialização</summary>
<br>

```php
enum OrderStatus: string
{
    case Pending    = 'pending';
    case Processing = 'processing';
    case Shipped    = 'shipped';
    case Delivered  = 'delivered';
    case Canceled   = 'canceled';

    public function isTerminal(): bool
    {
        $isTerminal = match($this) {
            self::Delivered, self::Canceled => true,
            default                         => false,
        };

        return $isTerminal;
    }
}

class Order
{
    public OrderStatus $status;

    public function isPending(): bool
    {
        $isPending = $this->status === OrderStatus::Pending;

        return $isPending;
    }
}
```

</details>

## Readonly classes

Use `readonly class` para value objects e DTOs que não devem mudar após criação.
Toda propriedade de uma readonly class é implicitamente `readonly`.

<details>
<summary>✅ Good — readonly class para value object imutável</summary>
<br>

```php
readonly class Money
{
    public function __construct(
        public int $amountInCents,
        public string $currency,
    ) {
        if ($this->amountInCents < 0) {
            throw new \InvalidArgumentException(
                "Amount must be non-negative, got {$this->amountInCents}"
            );
        }

        if (strlen($this->currency) !== 3) {
            throw new \InvalidArgumentException(
                "Currency must be 3 chars, got {$this->currency}"
            );
        }
    }

    public function add(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException(
                "Cannot add {$this->currency} and {$other->currency}"
            );
        }

        $result = new self(
            amountInCents: $this->amountInCents + $other->amountInCents,
            currency: $this->currency,
        );

        return $result;
    }
}
```

</details>

## never — funções que não retornam

Use `never` como tipo de retorno para funções que sempre lançam exceção ou terminam o processo.

<details>
<summary>✅ Good — never para helper de falha e redirect</summary>
<br>

```php
function abort(int $statusCode, string $message): never
{
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

function fail(string $message, \Throwable $previous = null): never
{
    throw new \RuntimeException($message, previous: $previous);
}
```

</details>

## Interfaces e contratos

Defina interfaces para dependências que serão trocadas (repositórios, serviços externos).
Prefira interfaces pequenas e específicas.

<details>
<summary>✅ Good — interface mínima por consumidor</summary>
<br>

```php
// Interface no namespace do consumidor
interface OrderRepositoryInterface
{
    public function findByID(int $orderID): ?Order;
    public function save(Order $order): Order;
}

final class OrderService
{
    public function __construct(
        private readonly OrderRepositoryInterface $repository,
    ) {}
}

// Implementação no namespace de infraestrutura
final class PostgresOrderRepository implements OrderRepositoryInterface
{
    public function __construct(private readonly \PDO $connection) {}

    public function findByID(int $orderID): ?Order
    {
        // ...
    }

    public function save(Order $order): Order
    {
        // ...
    }
}
```

</details>
