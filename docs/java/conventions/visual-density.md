# Densidade visual em Java

Densidade visual é a quantidade de informação que você empilha em cada bloco de
código. Quando muitas linhas se acumulam sem espaço, o olho cansa e você perde o
fio do raciocínio. Quando linhas sem relação ficam grudadas, o leitor não sabe
onde uma ideia termina e a outra começa. A saída é direta: junte as linhas que
contam a mesma pequena história e separe cada história da próxima com uma linha
em branco. Este guia mostra como aplicar isso em Java, sempre com um exemplo ruim
e um bom lado a lado.

Os princípios gerais estão em
[densidade visual](../../shared/standards/visual-density.md). Aqui eles aparecem
adaptados a Java idiomático (`final var` e `return`).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo |
| **semantic group** (grupo semântico) | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou salvar |
| **blank line** (linha em branco) | Separa dois grupos; faz o papel que antes cabia a um comentário de seção |
| **boundary** (limite) | Linha que separa camadas, por exemplo do controller para o service; pede uma linha em branco antes |
| **multi-line block** (bloco de várias linhas) | Builder, lista ou comando quebrado em várias linhas; pede um respiro depois de si |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação |

## A regra central

A regra que resolve quase tudo: **agrupe poucas linhas por vez e separe cada
grupo com uma linha em branco.** O tamanho natural de um grupo é duas linhas.
Três valem quando dividir em duas mais uma deixaria a última linha sozinha. Com
quatro ou mais, quebre em dois grupos de duas.

<details>
<summary>❌ Ruim: tudo grudado, sem um respiro entre os passos</summary>

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

<details>
<summary>✅ Bom: cada fase visível, no máximo duas linhas por grupo</summary>

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

## O `return` fica junto da linha que nomeia o valor

Quando a linha logo acima do `return` é a `final var` que dá nome ao valor
devolvido, as duas formam uma dupla e ficam juntas, sem linha em branco entre
elas. Não importa quantos passos venham antes. A linha em branco separa essa
dupla do que veio antes; ela nunca entra no meio da dupla.

<details>
<summary>❌ Ruim: a linha em branco parte a dupla no meio</summary>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");

    return status;
}
```

</details>

<details>
<summary>✅ Bom: a `final var` e o `return` juntos</summary>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");
    return status;
}
```

</details>

## Quando o `return` cola na linha acima e quando ganha um respiro

O `return` só cola na linha imediatamente acima quando essa linha é a `final var`,
de uma única linha, que nomeia o valor devolvido. Em todos os outros casos, deixe
uma linha em branco antes do `return`:

- a linha acima ocupa várias linhas (um builder ou comando quebrado em vários
  pedaços);
- a linha acima só produz um efeito (uma chamada que não devolve valor) e não dá
  nome ao resultado;
- o valor devolvido foi criado vários passos antes, sem formar dupla com a linha
  de cima.

<details>
<summary>❌ Ruim: a linha em branco separou a `final var` do `return` que a devolve</summary>

```java
public String formatOrderDate(String isoString) {
    final var parsedDate = LocalDate.parse(isoString);
    final var formatter = DateTimeFormatter
        .ofPattern("dd/MM/yyyy")
        .withLocale(Locale.forLanguageTag("pt-BR"))
        .withZone(ZoneId.of("America/Sao_Paulo"));
    final var formattedDate = parsedDate.format(formatter);

    return formattedDate;
}
```

O `formatter` ocupa várias linhas e pede um respiro depois de si, mas aqui a
linha em branco foi parar antes do `return`. `formattedDate` e
`return formattedDate` são a dupla que nomeia e devolve o valor: não devem ser
separados.

</details>

<details>
<summary>✅ Bom: o bloco de várias linhas isolado, a `final var` e o `return` juntos</summary>

```java
public String formatOrderDate(String isoString) {
    final var parsedDate = LocalDate.parse(isoString);
    final var formatter = DateTimeFormatter
        .ofPattern("dd/MM/yyyy")
        .withLocale(Locale.forLanguageTag("pt-BR"))
        .withZone(ZoneId.of("America/Sao_Paulo"));

    final var formattedDate = parsedDate.format(formatter);
    return formattedDate;
}
```

A linha em branco fica **depois** do `formatter`, que ocupa várias linhas. A
dupla `formattedDate` + `return formattedDate` continua junta.

</details>

<details>
<summary>✅ Bom: return com respiro quando é montado a partir de um builder de várias linhas</summary>

```java
public OrderResponse buildOrderResponse(Order order, String requestId) {
    final var data = OrderData.builder()
        .id(order.getId())
        .total(order.getTotal())
        .items(order.getItems())
        .build();

    final var response = new OrderResponse(data, requestId);
    return response;
}
```

`data` é um builder de várias linhas; a linha em branco antes do `return` separa
esse bloco grande do envelope final.

</details>

**Exceção:** métodos de uma linha ficam compactos. O `return` é o único
conteúdo.

```java
public List<Order> findPendingOrders(String userId) {
    return orderRepository.findByStatus(userId, OrderStatus.PENDING);
}
```

## A variável e o `if` que a valida ficam juntos

Uma variável e o `if` que a valida logo abaixo formam uma dupla **quando o `if`
cabe em uma linha só** (`if (...) return;`, `if (...) throw ...;`). Nesse caso, a
linha em branco vem **depois** da dupla, nunca entre a variável e o seu `if`.

Quando o `if` é escrito com chaves `{ }` (mesmo com uma única instrução dentro),
ele vira uma fase à parte: o bloco já tem peso visual próprio. Aí vale a regra de
que todo bloco de várias linhas pede um respiro antes de si. O critério aqui é o
peso visual do bloco na tela.

<details>
<summary>❌ Ruim: a variável foi separada do `if` que a valida</summary>

```java
final var order = orderRepository.findById(orderId).orElse(null);

if (order == null) return null;
final var invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: `if` de uma linha, junto da variável</summary>

```java
final var order = orderRepository.findById(orderId).orElse(null);
if (order == null) return null;

final var invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: `if` com chaves, fase à parte com um respiro antes</summary>

```java
final var handler = eventHandlers.get(eventType);

if (handler == null) {
    logUnhandledEventType(eventType);
    return;
}

final var eventPayload = event.data();
```

</details>

<details>
<summary>✅ Bom: `if` com chaves pede respiro antes mesmo com uma só instrução</summary>

```java
final var response = requestFn.get();

if (response.statusCode() != 429) {
    return response;
}

final var delayMs = (long) Math.pow(2, attempt) * 1000L;
```

O bloco ocupa três linhas e tem peso visual próprio. Em uma linha só, ficaria
junto da variável; com chaves, pede uma linha em branco antes.

</details>

## Não deixe uma linha sozinha entre espaços

Três declarações simples seguidas (`final var`, `private static final`) formam um
grupo coeso. Se você quebrar em duas mais uma, a última fica sozinha entre duas
linhas em branco, parecendo esquecida. Mantenha as três juntas. Só divida quando
forem quatro, aí em dois pares.

<details>
<summary>❌ Ruim: a última linha sozinha entre espaços</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<details>
<summary>✅ Bom: as três juntas</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;
private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<details>
<summary>✅ Bom: quatro viram dois pares</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
private static final int MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Duas linhas onde a segunda usa o valor da primeira

Quando a última linha **usa o valor recém-criado** na linha de cima, as duas
formam uma dupla. O respiro natural fica antes da dupla, nunca entre uma linha e
o valor de que ela depende.

<details>
<summary>❌ Ruim: a linha foi separada do valor de que depende</summary>

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

<details>
<summary>✅ Bom: as duas linhas dependentes juntas</summary>

```java
public String buildShippingLabel(Order order) {
    final var fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();
    final var addressLine = order.getAddress().getStreet() + ", " + order.getAddress().getNumber();

    final var cityLine = order.getAddress().getCity() + " - " + order.getAddress().getState();
    final var label = fullName + "\n" + addressLine + "\n" + cityLine + "\nOrder #" + order.getId();
    return label;
}
```

Duas duplas juntas: `cityLine` com `label`, porque `label` usa `cityLine`, e
`label` com `return label`. O leitor vê "nome, endereço / cidade, label,
retorne."

</details>

## Prepare as partes, depois monte o resultado

Quando você prepara **dois ou mais pedaços** e depois tem uma linha que **junta
vários deles** (não só o último), trate essa montagem como uma fase à parte, com
uma linha em branco antes. É o padrão "preparar as partes, depois montar o
resultado". Ele é diferente do caso anterior, em que a última linha depende **só**
da linha logo acima e por isso fica junto dela.

Como decidir rápido:

- A última linha usa **só o valor recém-criado** acima? É uma dupla dependente:
  fica junto.
- A última linha **costura vários pedaços** declarados em linhas diferentes? É a
  fase de montagem: linha em branco antes.

<details>
<summary>❌ Ruim: preparação e montagem grudadas como se fossem linhas iguais</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();
    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

`deliveryMessage` usa `fullName`, `address`, `order.id` e `order.deliveryDays` ao
mesmo tempo. Não é uma dupla com `address`: é a fase de montagem. Grudada como se
as três linhas fossem iguais, as fases somem.

</details>

<details>
<summary>✅ Bom: pedaços em uma dupla, montagem à parte, `return` junto do valor</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();

    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

Duas fases ficam visíveis: preparar os pedaços, depois montar e devolver.

</details>

<details>
<summary>✅ Bom: contraste, a última linha depende só da anterior</summary>

```java
public String buildOrderSlug(Order order) {
    final var normalizedTitle = order.getTitle().toLowerCase().replaceAll("\\s+", "-");
    final var slug = order.getId() + "-" + normalizedTitle;
    return slug;
}
```

`slug` depende **só** de `normalizedTitle`, a linha logo acima. As duas ficam
juntas, e o `return` continua junto de `slug`.

</details>

## Dentro de laços e condições curtas

Em laços (`while`, `for`) e condições curtas, duas linhas mais uma continua sendo
a divisão natural quando as linhas não são todas do mesmo tipo.

<details>
<summary>❌ Ruim: três linhas de tipos diferentes grudadas</summary>

```java
while (attempt < maxAttempts) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break;
    attempt++;
}
```

</details>

<details>
<summary>✅ Bom: variável e `if` juntos, o incremento separado</summary>

```java
while (attempt < maxAttempts) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break;

    attempt++;
}
```

</details>

## Deixe cada fase do método visível

Métodos com vários passos (buscar, transformar, salvar, responder) devem deixar
cada passo visível. Uma linha em branco entre eles marca onde um termina e o
outro começa, ainda mais quando os passos cruzam um limite entre camadas, por
exemplo do controller para o service.

<details>
<summary>❌ Ruim: todos os passos grudados, sem separação visual</summary>

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

<details>
<summary>✅ Bom: cada passo visível</summary>

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

## No teste, a verificação é uma fase separada

No teste, a linha que verifica o resultado (`assertThat`) é uma fase própria. A
linha em branco antes dela separa **o que** está sendo verificado de **como** você
preparou o cenário.

<details>
<summary>❌ Ruim: `assertThat` grudado na preparação, as fases somem</summary>

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

<details>
<summary>✅ Bom: `assertThat` separado, a verificação como fase própria</summary>

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

## Depois de um bloco de várias linhas, deixe um respiro

Quando um builder, uma lista ou um comando quebra em várias linhas, esse bloco já
ocupa um espaço visual próprio. Deixe uma linha em branco **depois** dele para
separá-lo do próximo passo. Sem esse respiro, o leitor não vê onde o bloco
termina e o próximo começa.

<details>
<summary>❌ Ruim: builder de várias linhas grudado no próximo comando</summary>

```java
public String createSession(User user) {
    final var claims = Jwts.claims()
        .subject(user.getId())
        .add("email", user.getEmail())
        .add("roles", user.getRoles())
        .issuedAt(Date.from(Instant.now()))
        .build();
    final var token = signJwt(claims);
    return token;
}
```

</details>

<details>
<summary>✅ Bom: linha em branco depois do builder separa o bloco</summary>

```java
public String createSession(User user) {
    final var claims = Jwts.claims()
        .subject(user.getId())
        .add("email", user.getEmail())
        .add("roles", user.getRoles())
        .issuedAt(Date.from(Instant.now()))
        .build();

    final var token = signJwt(claims);
    return token;
}
```

</details>

## Dois `if` seguidos com chaves pedem uma linha entre eles

Dois `if` seguidos, cada um com um bloco de várias linhas entre chaves, formam
uma parede: o olho não distingue onde um bloco termina e o outro começa. Sempre
coloque uma linha em branco entre eles.

**Exceção:** os `if` de saída rápida, com uma linha só (`if (input == null) throw ...`),
são do mesmo tipo e ficam juntos, como qualquer grupo de linhas iguais.

<details>
<summary>❌ Ruim: dois blocos com chaves grudados</summary>

```java
public void processOrder(Order order) {
    if (order.getStatus() == OrderStatus.PENDING) {
        notifyCustomer(order);
        scheduleReview(order);
    }
    if (order.getTotal().compareTo(new BigDecimal("1000")) > 0) {
        flagForAudit(order);
        notifyManager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom: linha em branco entre os blocos</summary>

```java
public void processOrder(Order order) {
    if (order.getStatus() == OrderStatus.PENDING) {
        notifyCustomer(order);
        scheduleReview(order);
    }

    if (order.getTotal().compareTo(new BigDecimal("1000")) > 0) {
        flagForAudit(order);
        notifyManager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom: saídas rápidas de uma linha ficam juntas</summary>

```java
public UserInput validateInput(UserInput input) {
    if (input == null) throw new ValidationException("Input required");
    if (input.email() == null) throw new ValidationException("Email required");
    if (input.password() == null) throw new ValidationException("Password required");

    return input;
}
```

</details>

## Não alinhe o código em colunas

Não use espaços extras para alinhar `=`, `:` ou valores na vertical. Use sempre um
espaço só. O alinhamento artificial quebra assim que você renomeia qualquer
coisa, gera um diff cheio de ruído (mudanças que não importam) e treina o olho a
procurar colunas que somem na primeira refatoração.

<details>
<summary>❌ Ruim: espaços extras alinhando colunas</summary>

```java
final var userName    = "alice";
final var userEmail   = "alice@example.com";
final var userRole    = "admin";
final var lastLoginAt = Instant.now();
```

</details>

<details>
<summary>✅ Bom: um espaço só, sem preenchimento</summary>

```java
final var userName = "alice";
final var userEmail = "alice@example.com";
final var userRole = "admin";
final var lastLoginAt = Instant.now();
```

</details>

## Textos longos montados em uma linha

Um texto longo grudado dentro de um `return` esconde os pedaços que o compõem.
Separe cada pedaço em uma variável com nome antes de montar o resultado. Em Java
esse texto costuma ser uma concatenação com `+`, ou um `String.format` com os
valores no fim.

<details>
<summary>❌ Ruim: texto enorme em uma linha, sem nome nos pedaços</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    return "Olá " + user.getFirstName() + " " + user.getLastName() + ", seu pedido #" + order.getId() + " foi confirmado e será entregue no endereço " + order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState() + " em até " + order.getDeliveryDays() + " dias úteis.";
}
```

</details>

<details>
<summary>✅ Bom: pedaços com nome, texto final limpo</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();

    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

</details>
