# Visual density: Java

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em Java.

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido
quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Bad — denso demais: todos os passos colados</summary>
<br>

```java
public User registerUser(UserInput input) {
    final var name = input.name();
    final var email = input.email();
    final var exists = userRepository.findByEmail(email);
    if (exists.isPresent()) throw new ConflictException("Email taken");
    final var hash = passwordEncoder.encode(input.password());
    final var user = userRepository.save(new User(name, email, hash));
    final var token = tokenService.generate(user.getId());
    emailService.sendWelcome(email, token);
    return user;
}
```

</details>

<br>

<details>
<summary>✅ Good — fases visíveis, no máximo 2 linhas por grupo</summary>
<br>

```java
public User registerUser(UserInput input) {
    final var name = input.name();
    final var email = input.email();
    final var exists = userRepository.findByEmail(email);
    if (exists.isPresent()) throw new ConflictException("Email taken");

    final var hash = passwordEncoder.encode(input.password());
    final var user = userRepository.save(new User(name, email, hash));

    final var token = tokenService.generate(user.getId());
    emailService.sendWelcome(email, token);

    return user;
}
```

</details>

## Explaining Return: par tight

Uma `final var` nomeada acima do `return` explica o valor retornado. Quando há **apenas esse
passo** antes do `return`, os dois formam par de 2 linhas sem blank. A linha em branco separa
o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Bad — blank fragmenta o par</summary>
<br>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");

    return status;
}
```

</details>

<br>

<details>
<summary>✅ Good — par tight</summary>
<br>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");
    return status;
}
```

</details>

## Return separado: quando há 2+ passos antes

Quando há dois ou mais passos distintos antes do `return`, o blank line marca a transição do
"preparar" para o "entregar".

<details>
<summary>✅ Good — 3 passos antes do return</summary>
<br>

```java
public String formatOrderDate(String isoString) {
    final var parsedDate = LocalDate.parse(isoString);
    final var formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    final var formattedDate = parsedDate.format(formatter);

    return formattedDate;
}
```

</details>

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico. A linha em branco vem
**depois** do par, nunca entre eles.

<details>
<summary>❌ Bad — variável solta do seu guarda</summary>
<br>

```java
final var order = orderRepository.findById(orderId).orElse(null);

if (order == null) return null;
final var invoice = buildInvoice(order);
```

</details>

<br>

<details>
<summary>✅ Good — variável e guarda juntos, separados do próximo passo</summary>
<br>

```java
final var order = orderRepository.findById(orderId).orElse(null);
if (order == null) return null;

final var invoice = buildInvoice(order);
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas formam grupo coeso. Partir em 2+1 deixa a última linha
solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Bad — órfão entre blanks</summary>
<br>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<br>

<details>
<summary>✅ Good — trio tight</summary>
<br>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;
private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<br>

<details>
<summary>✅ Good — 4 atomics viram 2+2</summary>
<br>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
private static final int MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par.
A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Bad — dependência direta partida</summary>
<br>

```java
public String buildShippingLabel(Order order) {
    final var fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();
    final var addressLine = order.getAddress().getStreet() + ", " + order.getAddress().getNumber();

    final var cityLine = order.getAddress().getCity() + " - " + order.getAddress().getState();

    final var label = fullName + "\n" + addressLine + "\n" + cityLine + "\nOrder #" + order.getId();
    return label;
}
```

</details>

<br>

<details>
<summary>✅ Good — par semântico tight</summary>
<br>

```java
public String buildShippingLabel(Order order) {
    final var fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();
    final var addressLine = order.getAddress().getStreet() + ", " + order.getAddress().getNumber();

    final var cityLine = order.getAddress().getCity() + " - " + order.getAddress().getState();
    final var label = fullName + "\n" + addressLine + "\n" + cityLine + "\nOrder #" + order.getId();

    return label;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase
visível.

<details>
<summary>❌ Bad — todas as fases coladas, sem separação visual</summary>
<br>

```java
public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest request) {
    final var sanitized = sanitizer.clean(request);
    final var input = validator.validate(sanitized);
    userService.create(input);
    final var body = new UserResponse(input.id());
    return ResponseEntity.status(201).body(body);
}
```

</details>

<br>

<details>
<summary>✅ Good — fases explícitas</summary>
<br>

```java
public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest request) {
    final var sanitized = sanitizer.clean(request);
    final var input = validator.validate(sanitized);

    userService.create(input);

    final var body = new UserResponse(input.id());
    return ResponseEntity.status(201).body(body);
}
```

</details>

## Testes: assertion como fase própria

O assert é fase distinta. A linha em branco antes dele separa o que está sendo verificado do
como está sendo verificado.

<details>
<summary>❌ Bad — assertion colado ao setup, fases invisíveis</summary>
<br>

```java
@Test
void appliesPercentageDiscountToOrderPrice() {
    final var order = new Order("ord-1", new BigDecimal("100"), 10);
    final var actualOrder = discountService.applyDiscount(order);
    final var expectedPrice = new BigDecimal("90");
    assertThat(actualOrder.getTotal()).isEqualByComparingTo(expectedPrice);
}
```

</details>

<br>

<details>
<summary>✅ Good — assertion separado, como fase própria</summary>
<br>

```java
@Test
void appliesPercentageDiscountToOrderPrice() {
    final var order = new Order("ord-1", new BigDecimal("100"), 10);
    final var actualOrder = discountService.applyDiscount(order);
    final var expectedPrice = new BigDecimal("90");

    assertThat(actualOrder.getTotal()).isEqualByComparingTo(expectedPrice);
}
```

</details>
