# Null Safety

> Escopo: PHP 8.4.

PHP distingue `null` de zero, `false` e string vazia. Com `declare(strict_types=1)` e
tipos declarados, muitos erros de null são capturados em tempo de execução com mensagem
clara. PHP 8.0+ adicionou o operador nullsafe `?->` e PHP 7.4+ tem nullable types `?Type`
para tornar a presença de null explícita na assinatura.

## Tipos nullable — explicitar null

Declare `?Type` quando null é um retorno válido com semântica específica ("não encontrado",
"não preenchido"). Não use `?Type` para esconder que a função pode falhar.

<details>
<summary>❌ Bad — null implícito sem tipo declarado</summary>
<br>

```php
class UserRepository
{
    public function findByEmail($email) // sem tipo: retorna User ou null? ou false?
    {
        $row = $this->db->query("SELECT * FROM users WHERE email = '$email'")->fetch();
        if (!$row) {
            return false; // não é null, é false — inconsistente
        }
        return new User($row);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — nullable type explicita ausência</summary>
<br>

```php
final class UserRepository
{
    public function findByEmail(string $email): ?User
    {
        $stmt = $this->connection->prepare(
            'SELECT id, name, email FROM users WHERE email = :email'
        );

        $stmt->bindValue(':email', $email, \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        $user = User::fromRow($row);

        return $user;
    }
}
```

</details>

## Nullsafe operator (?->)

Encadeie acessos opcionais com `?->` para evitar verificações de null intermediárias.

<details>
<summary>❌ Bad — verificações manuais encadeadas</summary>
<br>

```php
$city = null;

if ($order !== null) {
    $customer = $order->customer;
    if ($customer !== null) {
        $address = $customer->address;
        if ($address !== null) {
            $city = $address->city;
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — nullsafe operator</summary>
<br>

```php
$city = $order?->customer?->address?->city;
```

</details>

## Null coalescing (??) para defaults

Use `??` para fornecer um valor padrão quando a expressão da esquerda é null (ou
variável não definida).

<details>
<summary>✅ Good — ?? para valores com default</summary>
<br>

```php
$page    = (int) ($_GET['page'] ?? 1);
$perPage = (int) ($_GET['per_page'] ?? 20);

$name = $user?->name ?? 'Guest';
$city = $order?->customer?->address?->city ?? 'Not informed';
```

</details>

## Evitar null como controle de fluxo

Null para "operação falhou" esconde o motivo da falha. Use exceções para falhas
e null apenas para "ausência esperada de um valor".

<details>
<summary>❌ Bad — null para indicar falha sem contexto</summary>
<br>

```php
public function processOrder(int $orderID): ?Order
{
    $order = $this->repository->findByID($orderID);
    if ($order === null) {
        return null; // falhou? não encontrado? cancelado?
    }

    if (!$order->isValid()) {
        return null; // inválido? qual campo?
    }

    return $this->save($order);
}
```

</details>

<br>

<details>
<summary>✅ Good — exceções para falhas; null apenas para ausência legítima</summary>
<br>

```php
public function processOrder(int $orderID): Order
{
    $order = $this->repository->findByID($orderID);

    if ($order === null) {
        throw new OrderNotFoundException($orderID);
    }

    if (!$order->isValid()) {
        throw new InvalidOrderException($orderID, $order->validationErrors());
    }

    $savedOrder = $this->repository->save($order);

    return $savedOrder;
}

// Null legítimo: busca que pode não encontrar resultado
public function findByEmail(string $email): ?User
{
    $row = $this->connection->fetchOne('SELECT * FROM users WHERE email = :email', [':email' => $email]);

    if ($row === null) {
        return null; // ausência esperada
    }

    $user = User::fromRow($row);

    return $user;
}
```

</details>

## Inicialização de propriedades

Propriedades tipadas sem valor padrão devem ser inicializadas antes do primeiro acesso.
PHP lança `Error` se você tentar ler uma propriedade não inicializada.

<details>
<summary>✅ Good — propriedades inicializadas no construtor</summary>
<br>

```php
final class Order
{
    public readonly int $id;
    public readonly int $customerID;
    public float $amount;
    public OrderStatus $status;
    public \DateTimeImmutable $createdAt;
    public ?\DateTimeImmutable $canceledAt;  // null é o estado inicial válido

    public function __construct(
        int $customerID,
        float $amount,
    ) {
        $this->customerID = $customerID;
        $this->amount     = $amount;
        $this->status     = OrderStatus::Pending;
        $this->createdAt  = new \DateTimeImmutable();
        $this->canceledAt = null;
    }
}
```

</details>
