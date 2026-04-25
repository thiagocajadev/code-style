# Testing

> Escopo: PHP 8.4 + PHPUnit 11.

PHP usa **PHPUnit** como framework padrão de testes. O padrão idiomático é
**data providers** (provedores de dados) para múltiplos casos e **AAA**
(Arrange, Act, Assert) com fases visualmente separadas. Mocks de interfaces via
`createMock()` isolam dependências externas.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **data provider** (provedor de dados) | Método que retorna múltiplos conjuntos de argumentos para um teste; reduz duplicação |
| **AAA** (Arrange, Act, Assert) | Padrão de estruturação de testes: preparar, executar, verificar — fases visualmente separadas |
| `createMock` | PHPUnit gera um mock (objeto simulado) de uma interface sem implementação real |
| `createStub` | PHPUnit gera um stub (esboço) sem verificações de chamada |
| `#[DataProvider]` | Atributo PHP 8.x que liga um método de teste ao seu data provider |

## Fases misturadas — AAA

<details>
<summary>❌ Bad — fases misturadas, sem separação visual</summary>
<br>

```php
public function testApplyDiscount(): void
{
    $order = new Order(customerID: 1, amount: 100.0);
    $result = $this->service->applyDiscount($order, 0.1);
    $this->assertEquals(90.0, $result->amount);
    $order2 = new Order(customerID: 2, amount: 200.0);
    $result2 = $this->service->applyDiscount($order2, 0.2);
    $this->assertEquals(160.0, $result2->amount);
}
```

</details>

<br>

<details>
<summary>✅ Good — data provider + AAA com fases separadas</summary>
<br>

```php
#[DataProvider('discountCases')]
public function testApplyDiscount(float $amount, float $rate, float $expected): void
{
    // Arrange
    $order = new Order(customerID: 1, amount: $amount);

    // Act
    $result = $this->service->applyDiscount($order, $rate);

    // Assert
    $this->assertSame($expected, $result->amount);
}

public static function discountCases(): array
{
    return [
        '10% discount on 100' => [100.0, 0.1, 90.0],
        '20% discount on 200' => [200.0, 0.2, 160.0],
        'zero discount'       => [50.0, 0.0, 50.0],
    ];
}
```

</details>

## Mocks de interfaces

Crie mocks das interfaces que o service consome. Nunca instancie repositórios reais
em testes unitários.

<details>
<summary>✅ Good — mock de repositório + service isolado</summary>
<br>

```php
final class OrderServiceTest extends TestCase
{
    private OrderRepositoryInterface $repositoryMock;
    private NotifierInterface $notifierMock;
    private OrderService $service;

    protected function setUp(): void
    {
        $this->repositoryMock = $this->createMock(OrderRepositoryInterface::class);
        $this->notifierMock   = $this->createMock(NotifierInterface::class);

        $this->service = new OrderService(
            repository: $this->repositoryMock,
            notifier: $this->notifierMock,
        );
    }

    public function testCreateOrderSavesAndNotifies(): void
    {
        // Arrange
        $input = new CreateOrderInput(customerID: 42, amount: 150.0, currency: 'BRL');

        $expectedOrder = new Order(id: 1, customerID: 42, amount: 150.0);

        $this->repositoryMock
            ->expects($this->once())
            ->method('save')
            ->willReturn($expectedOrder);

        $this->notifierMock
            ->expects($this->once())
            ->method('notifyOrderCreated')
            ->with($expectedOrder);

        // Act
        $actualOrder = $this->service->createOrder($input);

        // Assert
        $this->assertSame(42, $actualOrder->customerID);
        $this->assertSame(150.0, $actualOrder->amount);
    }
}
```

</details>

## Teste de exceção

Use `expectException` antes da ação para verificar que a exceção certa é lançada.

<details>
<summary>✅ Good — teste de exceção com tipo e mensagem</summary>
<br>

```php
public function testCreateOrderThrowsOnMissingCustomer(): void
{
    // Arrange
    $input = new CreateOrderInput(customerID: 0, amount: 150.0, currency: 'BRL');

    // Assert (antes do Act para exceções)
    $this->expectException(ValidationException::class);
    $this->expectExceptionMessage('customer_id');

    // Act
    $this->service->createOrder($input);
}
```

</details>

## Estrutura de teste

Organize testes espelhando a estrutura de `src/`. Um arquivo de teste por classe.
Nomeie os métodos com `test` + comportamento esperado + contexto.

<details>
<summary>✅ Good — nomenclatura e estrutura</summary>
<br>

```php
final class OrderServiceTest extends TestCase
{
    // Happy path
    public function testCreateOrderReturnsOrderWithCorrectAmount(): void {}
    public function testCancelOrderSetsStatusToCanceled(): void {}

    // Error cases
    public function testCreateOrderThrowsWhenCustomerIDIsZero(): void {}
    public function testCancelOrderThrowsWhenAlreadyCanceled(): void {}

    // Edge cases
    public function testCreateOrderAppliesPremiumDiscount(): void {}
}
```

</details>

## setUp e tearDown

Use `setUp` para instanciar dependências antes de cada teste. Use `tearDown`
para liberar recursos externos (arquivos, conexões de teste).

<details>
<summary>✅ Good — setUp cria um estado limpo por teste</summary>
<br>

```php
final class UserRepositoryTest extends TestCase
{
    private \PDO $connection;
    private UserRepository $repository;

    protected function setUp(): void
    {
        $this->connection = new \PDO('sqlite::memory:');
        $this->connection->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');

        $this->repository = new UserRepository($this->connection);
    }

    protected function tearDown(): void
    {
        $this->connection->exec('DROP TABLE IF EXISTS users');
    }

    public function testFindByEmailReturnsNullWhenNotFound(): void
    {
        // Arrange — tabela vazia do setUp

        // Act
        $result = $this->repository->findByEmail('notexists@example.com');

        // Assert
        $this->assertNull($result);
    }
}
```

</details>
