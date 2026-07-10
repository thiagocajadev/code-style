# Testing

> Escopo: Swift 6.1, XCTest / Swift Testing.

Testes seguem o padrão AAA (Arrange, Act, Assert · Arranjar, Agir, Atestar) com fases explícitas. Swift Testing (framework
moderno introduzido no Swift 5.9/Xcode 16) é preferível para novos projetos. XCTest continua
válido em projetos existentes. Mocking é feito via protocolos, sem frameworks externos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | estrutura que separa setup, execução e verificação |
| **Swift Testing** (framework de testes moderno do Swift) | `@Test`, `#expect`, `@Suite`; melhor diagnósticos |
| **XCTest** (framework de testes clássico da Apple) | `XCTestCase`, `XCTAssert*` |
| **protocol mock** (mock via protocolo) | Stub criado via conformance de protocolo; sem dependência de framework |
| `async throws` em testes | suporte nativo para funções assíncronas nos dois frameworks |

## Fases misturadas e AAA

<details>
<summary>❌ Ruim: setup, ação e assert misturados</summary>

```swift
@Test func testOrder() async throws {
    let service = OrderService(repository: MockOrderRepository(order: Order(id: UUID(), status: .settled)))
    #expect(try await service.find(id: UUID()).status == .settled)
}
```

</details>

<details>
<summary>✅ Bom: AAA explícito com nomes expressivos</summary>

```swift
@Test("findOrder returns settled order when found")
func findOrderReturnsSettledOrderWhenFound() async throws {
    let settledOrder = Order(id: UUID(), status: .settled)
    let repository = MockOrderRepository(order: settledOrder)
    let service = OrderService(repository: repository)
    let foundOrder = try await service.find(id: settledOrder.id)

    #expect(foundOrder.status == .settled)
}
```

</details>

## Mocking via protocolo

<details>
<summary>❌ Ruim: dependência concreta impede teste unitário</summary>

```swift
class OrderService {
    func find(id: UUID) async throws -> Order {
        try await SQLOrderRepository().find(id: id)   // dependência hardcoded
    }
}
```

</details>

<details>
<summary>✅ Bom: protocolo injetado; mock implementa protocolo</summary>

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
<summary>❌ Ruim: testes duplicados com dados diferentes</summary>

```swift
@Test func rateZeroIsValid() { #expect(validateRate(0.0).isSuccess) }
@Test func rateOneIsValid() { #expect(validateRate(1.0).isSuccess) }
@Test func rateNegativeIsInvalid() { #expect(!validateRate(-0.1).isSuccess) }
```

</details>

<details>
<summary>✅ Bom: @Test com argumentos cobre todos os cenários</summary>

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
<summary>❌ Ruim: expectation manual para async (padrão XCTest antigo)</summary>

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

<details>
<summary>✅ Bom: async throws nativo nos dois frameworks</summary>

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
