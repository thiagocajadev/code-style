# Variables

> Escopo: PHP 8.4.

PHP 8.1 introduziu `readonly` para propriedades e PHP 8.4 estendeu o suporte para
**property hooks** (ganchos de propriedade) e **asymmetric visibility** (visibilidade assimétrica).
Prefira `readonly` em propriedades que não devem mudar após a inicialização. Nunca use
variáveis sem tipagem explícita onde o tipo é conhecível.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `readonly` | Propriedade ou parâmetro que não pode ser alterado após atribuição; garante imutabilidade |
| **typed property** (propriedade tipada) | Propriedade de classe com tipo declarado explicitamente; disponível desde PHP 7.4 |
| **property hook** (gancho de propriedade) | `get` e `set` inline na declaração da propriedade (PHP 8.4); substitui métodos `getX`/`setX` simples |
| **asymmetric visibility** (PHP 8.4) | `public private(set)` — leitura pública, escrita restrita ao escopo privado |
| `const` | Constante de classe avaliada em tempo de compilação; sempre `UPPER_SNAKE` |

## Mutação direta

Prefira `readonly` para propriedades que representam identidade ou configuração.
Use ponteiros (`&`) apenas quando a semântica de referência for realmente necessária.

<details>
<summary>❌ Bad — propriedade mutável sem motivo</summary>
<br>

```php
class OrderID
{
    public int $value;

    public function __construct(int $value)
    {
        $this->value = $value;
    }
}

$id = new OrderID(42);
$id->value = 99; // mutação acidental
```

</details>

<br>

<details>
<summary>✅ Good — readonly garante imutabilidade de value object</summary>
<br>

```php
class OrderID
{
    public function __construct(public readonly int $value)
    {
        if ($value <= 0) {
            throw new \InvalidArgumentException("OrderID must be positive, got {$value}");
        }
    }
}

$id = new OrderID(42);
// $id->value = 99; — Fatal error: readonly property
```

</details>

## Valores mágicos

Substitua literais inline por constantes de classe nomeadas.

<details>
<summary>❌ Bad — literais sem nome</summary>
<br>

```php
if ($attempts > 3) {
    throw new MaxRetriesException();
}

if ($order->status === 'pending') {
    $this->processOrder($order);
}
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas revelam intenção</summary>
<br>

```php
class OrderProcessor
{
    public const int MAX_RETRIES = 3;

    public function retry(int $attempts): void
    {
        if ($attempts > self::MAX_RETRIES) {
            throw new MaxRetriesException($attempts);
        }
    }
}

enum OrderStatus: string
{
    case Pending    = 'pending';
    case Processing = 'processing';
    case Shipped    = 'shipped';
    case Canceled   = 'canceled';
}

if ($order->status === OrderStatus::Pending) {
    $this->processOrder($order);
}
```

</details>

## Property hooks (PHP 8.4)

Use property hooks para encapsular lógica simples de get/set sem criar métodos
separados. Mantenha hooks simples; extraia para métodos se a lógica crescer.

<details>
<summary>❌ Bad — getters/setters boilerplate para lógica simples</summary>
<br>

```php
class User
{
    private string $_name;

    public function getName(): string
    {
        return $this->_name;
    }

    public function setName(string $name): void
    {
        $this->_name = ucwords(strtolower(trim($name)));
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — property hook com lógica inline</summary>
<br>

```php
class User
{
    public string $name {
        get => $this->name;
        set => ucwords(strtolower(trim($value)));
    }
}

$user = new User();
$user->name = '  alice smith  ';
echo $user->name; // "Alice Smith"
```

</details>

## Typed properties e nullable

Sempre declare o tipo de propriedades de classe. Use `?Type` para indicar que o valor
pode ser nulo. Evite `mixed` onde o tipo é conhecido.

<details>
<summary>❌ Bad — propriedades sem tipo</summary>
<br>

```php
class Order
{
    public $id;
    public $customerID;
    public $amount;
    public $canceledAt;  // string? DateTime? null?
}
```

</details>

<br>

<details>
<summary>✅ Good — tipos explícitos em todas as propriedades</summary>
<br>

```php
class Order
{
    public int $id;
    public int $customerID;
    public float $amount;
    public ?DateTimeImmutable $canceledAt;

    public function isCanceled(): bool
    {
        $isCanceled = $this->canceledAt !== null;

        return $isCanceled;
    }
}
```

</details>

## Evitar variáveis globais

Nunca use `global` ou `$GLOBALS`. Passe dependências via construtor ou parâmetro.

<details>
<summary>❌ Bad — variável global</summary>
<br>

```php
$db = new PDO('...');

function findUser(int $userID): ?array
{
    global $db;  // acoplamento oculto
    return $db->query("SELECT * FROM users WHERE id = $userID")->fetch();
}
```

</details>

<br>

<details>
<summary>✅ Good — dependência injetada via construtor</summary>
<br>

```php
final class UserRepository
{
    public function __construct(private readonly \PDO $connection) {}

    public function findByID(int $userID): ?User
    {
        $stmt = $this->connection->prepare(
            'SELECT id, name, email FROM users WHERE id = :id'
        );

        $stmt->bindValue(':id', $userID, \PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        return User::fromRow($row);
    }
}
```

</details>
