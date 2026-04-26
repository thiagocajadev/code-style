# Testing

> Escopo: Swift 6.1, XCTest / Swift Testing.

Testes seguem o padrão AAA (Arrange, Act, Assert) com fases explícitas. Swift Testing (framework
moderno introduzido no Swift 5.9/Xcode 16) é preferível para novos projetos. XCTest continua
válido em projetos existentes. Mocking é feito via protocolos — sem frameworks externos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert) | estrutura que separa setup, execução e verificação |
| **Swift Testing** | framework moderno com `@Test`, `#expect`, `@Suite`; melhor diagnósticos |
| **XCTest** | framework clássico da Apple; `XCTestCase`, `XCTAssert*` |
| **protocol mock** | stub criado via conformance de protocolo; sem dependência de framework |
| `async throws` em testes | suporte nativo para funções assíncronas nos dois frameworks |

## Fases misturadas — AAA

<details>
<summary>❌ Bad — setup, ação e assert misturados</summary>
<br>

```swift
@Test func testOrder() async throws {
    let service = OrderService(repository: MockOrderRepository(order: Order(id: UUID(), status: .paid)))
    #expect(try await service.find(id: UUID()).status == .paid)
}
```

</details>

<br>

<details>
<summary>✅ Good — AAA explícito com nomes expressivos</summary>
<br>

```swift
@Test("findOrder returns paid order when found")
func findOrderReturnsPaidOrderWhenFound() async throws {
    // Arrange
    let paidOrder = Order(id: UUID(), status: .paid)
    let repository = MockOrderRepository(order: paidOrder)
    let service = OrderService(repository: repository)

    // Act
    let foundOrder = try await service.find(id: paidOrder.id)

    // Assert
    #expect(foundOrder.status == .paid)
}
```

</details>

## Mocking via protocolo

<details>
<summary>❌ Bad — dependência concreta impede teste unitário</summary>
<br>

```swift
class OrderService {
    func find(id: UUID) async throws -> Order {
        try await SQLOrderRepository().find(id: id)   // dependência hardcoded
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — protocolo injetado; mock implementa protocolo</summary>
<br>

```swift
protocol OrderRepository {
    func find(id: UUID) async throws -> Order?
}

struct MockOrderRepository: OrderRepository {
    let order: Order?

    func find(id: UUID) async throws -> Order? { order }
}

struct OrderService {
    private let repository: OrderRepository

    func find(id: UUID) async throws -> Order {
        guard let order = try await repository.find(id: id) else {
            throw OrderError.notFound(id)
        }
        return order
    }
}
```

</details>

## Testes parametrizados com Swift Testing

<details>
<summary>❌ Bad — testes duplicados com dados diferentes</summary>
<br>

```swift
@Test func rateZeroIsValid() { #expect(validateRate(0.0).isSuccess) }
@Test func rateOneIsValid() { #expect(validateRate(1.0).isSuccess) }
@Test func rateNegativeIsInvalid() { #expect(!validateRate(-0.1).isSuccess) }
```

</details>

<br>

<details>
<summary>✅ Good — @Test com argumentos cobre todos os cenários</summary>
<br>

```swift
@Test("validateRate", arguments: [
    (0.0, true),
    (0.5, true),
    (1.0, true),
    (-0.1, false),
    (1.1, false),
])
func validateRateSucceedsOnlyInRange(rate: Double, isValid: Bool) {
    let result = validateRate(rate)
    #expect(result.isSuccess == isValid)
}
```

</details>

## Teste de função async throws

<details>
<summary>❌ Bad — expectation manual para async (padrão XCTest antigo)</summary>
<br>

```swift
func testFindUser() {
    let expectation = expectation(description: "findUser")
    userService.findUser(id: userId) { result in
        XCTAssertEqual(result, .success(user))
        expectation.fulfill()
    }
    waitForExpectations(timeout: 1)
}
```

</details>

<br>

<details>
<summary>✅ Good — async throws nativo nos dois frameworks</summary>
<br>

```swift
// Swift Testing
@Test func findUserReturnsUserWhenExists() async throws {
    let service = UserService(repository: MockUserRepository(user: .alice))

    let user = try await service.find(id: User.alice.id)

    #expect(user.name == "Alice")
}

// XCTest
func testFindUserReturnsUserWhenExists() async throws {
    let service = UserService(repository: MockUserRepository(user: .alice))

    let user = try await service.find(id: User.alice.id)

    XCTAssertEqual(user.name, "Alice")
}
```

</details>
