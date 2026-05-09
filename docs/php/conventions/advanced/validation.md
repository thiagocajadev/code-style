# Validation

> Escopo: PHP 8.4 + Symfony Validator 7.

Validação acontece na fronteira: handler HTTP, consumer de fila, comando CLI.
Use **Symfony Validator** com atributos PHP 8.x para validações declarativas.
O service recebe objetos já validados e tipados — nunca arrays brutos sem validação.

## Validação com atributos

<details>
<summary>❌ Bad — validação manual espalhada no service</summary>
<br>

```php
public function createOrder(array $data): Order
{
    if (empty($data['customer_id'])) {
        throw new \InvalidArgumentException('customer_id is required');
    }
    if (!is_int($data['customer_id']) || $data['customer_id'] <= 0) {
        throw new \InvalidArgumentException('customer_id must be a positive integer');
    }
    if (empty($data['amount']) || $data['amount'] <= 0) {
        throw new \InvalidArgumentException('amount must be positive');
    }
    // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — atributos de validação no DTO + validação na fronteira</summary>
<br>

```php
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateOrderInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public int $customerID,

        #[Assert\NotBlank]
        #[Assert\Positive]
        public float $amount,

        #[Assert\NotBlank]
        #[Assert\Length(exactly: 3)]
        public string $currency,

        #[Assert\Length(max: 500)]
        public ?string $notes = null,
    ) {}
}
```

```php
// Handler: valida antes de chamar o service
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class OrderHandler
{
    public function __construct(
        private readonly OrderService $service,
        private readonly ValidatorInterface $validator,
    ) {}

    public function createOrder(array $body): Response
    {
        $input = CreateOrderInput::fromArray($body);

        $violations = $this->validator->validate($input);

        if (count($violations) > 0) {
            $errors   = $this->buildErrorResponse($violations);
            $response = new Response(status: 422, body: $errors);

            return $response;
        }

        $order    = $this->service->createOrder($input);
        $response = new Response(status: 201, body: $order->toArray());

        return $response;
    }
}
```

</details>

## Resposta estruturada de validação

Converta `ConstraintViolationListInterface` em resposta com campo e mensagem.

<details>
<summary>✅ Good — response estruturado de validação</summary>
<br>

```php
use Symfony\Component\Validator\ConstraintViolationListInterface;

private function buildErrorResponse(ConstraintViolationListInterface $violations): array
{
    $errors = [];

    foreach ($violations as $violation) {
        $errors[] = [
            'field'   => $violation->getPropertyPath(),
            'message' => $violation->getMessage(),
        ];
    }

    $response = ['errors' => $errors];

    return $response;
}
```

</details>

## Validações customizadas com atributos

Crie constraints customizados para regras de domínio reutilizáveis.

<details>
<summary>✅ Good — constraint customizado para moeda suportada</summary>
<br>

```php
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;

#[\Attribute]
final class SupportedCurrency extends Constraint
{
    public string $message = 'Currency "{{ value }}" is not supported.';
}

final class SupportedCurrencyValidator extends ConstraintValidator
{
    private const SUPPORTED = ['BRL', 'USD', 'EUR'];

    public function validate(mixed $value, Constraint $constraint): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (!in_array($value, self::SUPPORTED, true)) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ value }}', $value)
                ->addViolation();
        }
    }
}

// Uso no DTO
final readonly class PaymentInput
{
    public function __construct(
        #[Assert\Positive]
        public float $amount,

        #[Assert\NotBlank]
        #[SupportedCurrency]
        public string $currency,
    ) {}
}
```

</details>

## Validação em cascata

Use `#[Assert\Valid]` para validar objetos nested automaticamente.

<details>
<summary>✅ Good — Valid para validação cascata em objetos aninhados</summary>
<br>

```php
final readonly class CreateOrderInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public int $customerID,

        #[Assert\NotBlank]
        #[Assert\Valid]                  // valida o objeto Address também
        public AddressInput $shipping,

        #[Assert\NotBlank]
        #[Assert\Positive]
        public float $amount,
    ) {}
}

final readonly class AddressInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 200)]
        public string $street,

        #[Assert\NotBlank]
        #[Assert\Length(max: 100)]
        public string $city,

        #[Assert\NotBlank]
        #[Assert\Length(exactly: 2)]
        public string $state,
    ) {}
}
```

</details>
