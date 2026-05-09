# Testing

> Escopo: Java 25 LTS — JUnit 6 + AssertJ + Mockito.

Testes bem estruturados documentam o comportamento, isolam falhas e resistem ao refactor
(refatoração). **AAA** (Arrange, Act, Assert — Preparar, Agir, Verificar) é o esqueleto de
todo teste.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert — Preparar, Agir, Verificar) | estrutura que separa setup, execução e verificação |
| **AssertJ** | biblioteca de assertions (afirmações) fluentes para Java |
| **Mockito** | biblioteca de mocks (objetos simulados) para Java |
| **mock** (objeto simulado) | substituto de uma dependência real que responde conforme programado |
| `@Mock` | cria um mock gerenciado pelo Mockito |
| `@InjectMocks` | injeta os mocks nas dependências da classe sob teste |
| `@Nested` | agrupa testes relacionados dentro de uma classe pai |
| `@BeforeEach` | executa setup antes de cada método de teste |

## Fases misturadas — AAA

<details>
<summary>❌ Bad — fases misturadas, sem separação visual</summary>
<br>

```java
@Test
void appliesDiscountToOrder() {
    final var order = new Order("ord-1", new BigDecimal("100"));
    order.setDiscountPct(10);
    final var result = discountService.apply(order);
    assertThat(result.getTotal()).isEqualByComparingTo("90");
    assertThat(result.getDiscount()).isEqualByComparingTo("10");
}
```

</details>

<br>

<details>
<summary>✅ Good — AAA explícito: fases separadas por blank line</summary>
<br>

```java
@Test
void appliesDiscountToOrder() {
    final var order = new Order("ord-1", new BigDecimal("100"));
    order.setDiscountPct(10);

    final var actualOrder = discountService.apply(order);

    assertThat(actualOrder.getTotal()).isEqualByComparingTo("90");
    assertThat(actualOrder.getDiscount()).isEqualByComparingTo("10");
}
```

</details>

## Assert semântico com AssertJ

AssertJ (biblioteca de assertions fluentes) produz mensagens de falha legíveis e elimina o
`assertTrue(a.equals(b))` genérico.

<details>
<summary>❌ Bad — assert genérico, mensagem de falha obscura</summary>
<br>

```java
@Test
void findsActiveUsers() {
    final var users = userService.findActive();
    assertTrue(users.size() > 0);
    assertTrue(users.get(0).isActive());
}
```

</details>

<br>

<details>
<summary>✅ Good — AssertJ: assert expressivo, mensagem de falha clara</summary>
<br>

```java
@Test
void findsActiveUsers() {
    final var users = userService.findActive();

    assertThat(users).isNotEmpty();
    assertThat(users).allMatch(User::isActive);
}
```

</details>

## Nomes de teste expressivos

O nome do teste documenta o comportamento: **dado um contexto, quando uma ação, então um
resultado**.

<details>
<summary>❌ Bad — nome genérico não documenta o comportamento</summary>
<br>

```java
@Test
void testOrder() { /* ... */ }

@Test
void test1() { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — nome descreve o cenário e o resultado esperado</summary>
<br>

```java
@Test
void appliesPercentageDiscountWhenOrderQualifies() { /* ... */ }

@Test
void throwsNotFoundExceptionWhenOrderDoesNotExist() { /* ... */ }

@Test
void returnsEmptyListWhenNoActiveUsersExist() { /* ... */ }
```

</details>

## Mockito — isolamento de dependências

Mockito cria mocks (objetos simulados) que isolam a unidade testada das suas dependências
reais. Use `@Mock` para dependências e `@InjectMocks` para a classe sob teste.

<details>
<summary>❌ Bad — teste depende de implementação real do repositório</summary>
<br>

```java
@Test
void findsUserById() {
    final var repository = new JpaUserRepository(dataSource); // depende de DB real
    final var service = new UserService(repository);

    final var user = service.findUser("u-1");
    assertThat(user).isPresent();
}
```

</details>

<br>

<details>
<summary>✅ Good — mock isola a dependência; teste foca no comportamento do serviço</summary>
<br>

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void findsUserById() {
        final var expectedUser = new User("u-1", "Alice", "alice@example.com");
        when(userRepository.findById("u-1")).thenReturn(Optional.of(expectedUser));

        final var actualUser = userService.findUser("u-1");

        assertThat(actualUser).isPresent();
        assertThat(actualUser.get().getName()).isEqualTo("Alice");
    }

    @Test
    void throwsNotFoundExceptionWhenUserDoesNotExist() {
        when(userRepository.findById("u-99")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUser("u-99"))
            .isInstanceOf(NotFoundException.class)
            .hasMessageContaining("u-99");
    }
}
```

</details>

## @Nested — agrupamento por contexto

`@Nested` agrupa testes por estado ou contexto, deixando a estrutura legível como documentação.

<details>
<summary>✅ Good — @Nested organiza por cenário</summary>
<br>

```java
class OrderServiceTest {

    @Nested
    class WhenOrderExists {

        @Test
        void processesOrderSuccessfully() { /* ... */ }

        @Test
        void appliesDiscountForPremiumCustomers() { /* ... */ }
    }

    @Nested
    class WhenOrderDoesNotExist {

        @Test
        void throwsNotFoundException() { /* ... */ }
    }
}
```

</details>

## @BeforeEach — setup compartilhado

Extraia setup repetido para `@BeforeEach`. Cada teste inicia com estado limpo.

<details>
<summary>✅ Good — @BeforeEach inicializa o estado compartilhado</summary>
<br>

```java
@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @Mock
    private DiscountRepository discountRepository;

    @InjectMocks
    private DiscountService discountService;

    private Order baseOrder;

    @BeforeEach
    void setUp() {
        baseOrder = new Order("ord-1", new BigDecimal("100"));
    }

    @Test
    void appliesTenPercentDiscount() {
        baseOrder.setDiscountPct(10);

        final var actualOrder = discountService.apply(baseOrder);

        assertThat(actualOrder.getTotal()).isEqualByComparingTo("90");
    }
}
```

</details>

## Verificar apenas o que importa

Cada teste verifica um comportamento. Verificar demais acopla o teste ao detalhe de implementação.

<details>
<summary>❌ Bad — verifica estado interno que não é contrato público</summary>
<br>

```java
@Test
void createsUser() {
    userService.create(new UserInput("Alice", "alice@example.com"));

    verify(userRepository, times(1)).save(any());
    verify(userRepository, times(1)).findByEmail(any()); // detalhe interno
    verify(emailService, times(1)).sendWelcome(any());   // detalhe interno
}
```

</details>

<br>

<details>
<summary>✅ Good — verifica o contrato: o que o chamador observa</summary>
<br>

```java
@Test
void createsUserAndSendsWelcomeEmail() {
    final var input = new UserInput("Alice", "alice@example.com");

    final var createdUser = userService.create(input);

    assertThat(createdUser.getName()).isEqualTo("Alice");
    verify(emailService).sendWelcome(createdUser.getEmail(), any());
}
```

</details>
