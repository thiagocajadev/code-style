# Traits

> Escopo: PHP 8.4.

**Traits** (traços) permitem reutilização horizontal de código em PHP: um conjunto de métodos
que pode ser incluído em qualquer classe independente de herança. Use traits para comportamentos
transversais (auditoria, logging, timestamps) que se repetem em domínios diferentes. Não use
traits para substituir composição quando a dependência pode ser injetada.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `trait` | Mecanismo de reutilização de código: métodos e propriedades incluídos em classes via `use` |
| **abstract method in trait** | Método declarado no trait sem implementação; força a classe que usa o trait a implementá-lo |
| **conflict resolution** (resolução de conflito) | `insteadof` e `as` para resolver colisão de nomes quando dois traits têm método com mesmo nome |
| **visibility override** | `use Trait { method as private; }` para alterar a visibilidade do método incluído |

## Uso correto de traits

Use traits para comportamentos transversais que não pertencem a uma herança natural.
O trait deve ser coeso: todos os métodos servem ao mesmo propósito.

<details>
<summary>❌ Bad — trait como dumping ground de métodos não relacionados</summary>
<br>

```php
trait Helpers
{
    public function formatCurrency(float $amount): string { ... }
    public function sendEmail(string $to, string $subject): void { ... }
    public function logAction(string $action): void { ... }
    public function validateCPF(string $cpf): bool { ... }
}
```

</details>

<br>

<details>
<summary>✅ Good — trait coeso: um propósito, um conjunto de métodos</summary>
<br>

```php
trait Auditable
{
    private ?int $createdBy = null;
    private ?\DateTimeImmutable $createdAt = null;
    private ?int $updatedBy = null;
    private ?\DateTimeImmutable $updatedAt = null;

    public function stampCreation(int $userID): void
    {
        $this->createdBy = $userID;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function stampUpdate(int $userID): void
    {
        $this->updatedBy = $userID;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
}

class Order
{
    use Auditable;

    public function __construct(
        public readonly int $customerID,
        public float $amount,
    ) {}
}

$order = new Order(customerID: 42, amount: 150.0);
$order->stampCreation(userID: 1);
```

</details>

## Abstract methods em traits

Declare um método abstrato no trait quando ele precisa de informação que só a classe
que o usa pode fornecer. Isso cria um contrato implícito.

<details>
<summary>✅ Good — trait com abstract method para contrato</summary>
<br>

```php
trait HasTimestamps
{
    abstract protected function getTableName(): string;

    public function touch(): void
    {
        $table = $this->getTableName();

        $this->connection->execute(
            "UPDATE {$table} SET updated_at = NOW() WHERE id = :id",
            ['id' => $this->id]
        );
    }
}

class Order
{
    use HasTimestamps;

    protected function getTableName(): string
    {
        return 'orders';
    }
}
```

</details>

## Resolução de conflitos

Quando dois traits declaram um método com o mesmo nome, use `insteadof` para escolher
qual usar e `as` para renomear o descartado se ainda precisar dele.

<details>
<summary>✅ Good — insteadof e as para resolver conflito</summary>
<br>

```php
trait LoggingA
{
    public function log(string $message): void
    {
        echo "[A] {$message}";
    }
}

trait LoggingB
{
    public function log(string $message): void
    {
        echo "[B] {$message}";
    }
}

class OrderService
{
    use LoggingA, LoggingB {
        LoggingA::log insteadof LoggingB;  // usa LoggingA::log
        LoggingB::log as logB;             // mantém LoggingB::log como logB
    }
}
```

</details>

## Trait vs interface vs composição

| Situação | Usar |
| -------- | ---- |
| Contrato sem implementação | Interface |
| Comportamento transversal sem estado externo | Trait |
| Dependência que pode ser trocada (repositório, serviço) | Composição via injeção |
| Herança natural de um tipo específico de entidade | Classe abstrata |

<details>
<summary>✅ Good — trait para comportamento transversal; injeção para dependências externas</summary>
<br>

```php
// Comportamento transversal sem dependência externa: trait
trait SoftDeletable
{
    private ?\DateTimeImmutable $deletedAt = null;

    public function softDelete(): void
    {
        $this->deletedAt = new \DateTimeImmutable();
    }

    public function isDeleted(): bool
    {
        $isDeleted = $this->deletedAt !== null;

        return $isDeleted;
    }
}

// Dependência externa (banco, API): injeção, não trait
final class OrderService
{
    public function __construct(
        private readonly OrderRepository $repository,  // injetado, não via trait
    ) {}
}
```

</details>
