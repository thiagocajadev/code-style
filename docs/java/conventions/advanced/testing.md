# Testes em Java

> Escopo: Java 25 LTS com JUnit 6 + AssertJ + Mockito.

Um teste bem escrito faz três coisas: mostra como o código deve se comportar, aponta a falha quando algo quebra, e continua passando depois de uma refatoração que não muda o comportamento. O **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) dá o esqueleto: monte o cenário, execute a ação, verifique o resultado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | estrutura que separa o preparo, a execução e a verificação |
| **AssertJ** (biblioteca de asserções fluentes para Java) | biblioteca de asserções encadeadas, com mensagem de falha legível |
| **Mockito** (biblioteca de dados fictícios para Java) | biblioteca que cria os dados fictícios das dependências |
| **mock** (dados fictícios) | substituto de uma dependência real, programado para responder o que o teste precisa |
| `@Mock` | cria um dado fictício gerenciado pelo Mockito |
| `@InjectMocks` | injeta os dados fictícios na classe sob teste |
| `@Nested` | agrupa testes relacionados dentro de uma classe |
| `@BeforeEach` | roda o preparo antes de cada método de teste |

<a id="mixed-phases-aaa"></a>

## Fases misturadas contra o AAA

Quando o preparo, a ação e a verificação ficam grudados sem separação, o leitor precisa decidir linha a linha em que fase cada uma está. Uma linha em branco antes da primeira asserção separa o que o teste faz do que ele verifica, e as três fases ficam visíveis de relance.

<details>
<summary>❌ Ruim: preparo, ação e asserção grudados na mesma parede</summary>

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

<details>
<summary>✅ Bom: preparo e ação juntos, a asserção separada por uma linha em branco</summary>

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

## Asserção que diz o que falhou, com AssertJ

Um `assertTrue(users.size() > 0)` que falha só informa "esperava true, veio false", e você fica sem saber o tamanho real da lista. O AssertJ descreve a intenção na chamada (`assertThat(users).isNotEmpty()`) e, quando falha, imprime o valor que encontrou, então a mensagem já aponta o problema sem depurar.

<details>
<summary>❌ Ruim: assertTrue genérico, a falha não diz o valor encontrado</summary>

```java
@Test
void findsActiveUsers() {
    final var users = userService.findActive();
    assertTrue(users.size() > 0);
    assertTrue(users.get(0).isActive());
}
```

</details>

<details>
<summary>✅ Bom: AssertJ diz a intenção e imprime o valor na falha</summary>

```java
@Test
void findsActiveUsers() {
    final var users = userService.findActive();

    assertThat(users).isNotEmpty();
    assertThat(users).allMatch(User::isActive);
}
```

</details>

## Nomes de teste que descrevem o caso

O nome do teste conta o caso em uma frase: dado um contexto, quando acontece uma ação, então este é o resultado. `testOrder` não diz nada disso, e quando ele quebra na esteira, o nome sozinho não conta o que parou de funcionar. `appliesPercentageDiscountWhenOrderQualifies` conta.

<details>
<summary>❌ Ruim: nome genérico não conta o que o teste cobre</summary>

```java
@Test
void testOrder() { /* ... */ }

@Test
void test1() { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: o nome descreve o cenário e o resultado esperado</summary>

```java
@Test
void appliesPercentageDiscountWhenOrderQualifies() { /* ... */ }

@Test
void throwsNotFoundExceptionWhenOrderDoesNotExist() { /* ... */ }

@Test
void returnsEmptyListWhenNoActiveUsersExist() { /* ... */ }
```

</details>

## Mockito para isolar as dependências

O Mockito cria dados fictícios das dependências, então o teste exercita só a classe alvo e não o banco de verdade por trás dela. Marque cada dependência com `@Mock` e a classe alvo com `@InjectMocks`. Um teste que usa o repositório real precisa de um banco no ar, fica lento e falha por motivos que não têm a ver com a lógica sob teste.

<details>
<summary>❌ Ruim: o teste depende do repositório real e de um banco no ar</summary>

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

<details>
<summary>✅ Bom: os dados fictícios isolam a dependência e o teste foca no serviço</summary>

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

## @Nested para agrupar por contexto

O `@Nested` junta os testes que partem do mesmo cenário dentro de uma classe interna com nome, como "quando o pedido existe". A saída da esteira passa a se ler como uma lista de casos por situação, e fica claro qual contexto ficou sem cobertura.

<details>
<summary>✅ Bom: @Nested organiza os testes por cenário</summary>

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

## @BeforeEach para o preparo compartilhado

Tire o preparo repetido dos testes e coloque num método `@BeforeEach`. O JUnit o executa antes de cada teste, então cada um começa com um objeto novo e nenhum herda o estado deixado pelo anterior.

<details>
<summary>✅ Bom: @BeforeEach monta o estado antes de cada teste</summary>

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

## Verificar só o que o chamador observa

Cada teste verifica um comportamento visível de fora. Conferir cada chamada interna que o método faz prende o teste ao jeito atual de implementar: no dia em que alguém troca o `findByEmail` por outra busca, sem mudar o resultado, o teste quebra sem que nada de fato tenha parado de funcionar.

<details>
<summary>❌ Ruim: verifica chamadas internas que não são o contrato público</summary>

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

<details>
<summary>✅ Bom: verifica o resultado e o efeito que o chamador observa</summary>

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
