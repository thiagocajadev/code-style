# Visual density: Java

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco — cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Java idiomático (`final var` + `return`).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, var + return) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`final var`); mantidas juntas sem blank — preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `final var X = …` single-line + `return X` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Builder fluente, lista expandida ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem |
| **boundary** (limite) | Linha que separa camadas (controller ↔ service, service ↔ repository); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a rename, gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>

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
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>

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

Uma `final var` nomeada acima do `return` explica o valor retornado. Sempre que
a linha imediatamente acima for essa `final var` (single-line) e o `return`
retornar essa variável, os dois formam par de 2 linhas sem blank — não importa
quantos passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");

    return status;
}
```

</details>

<details>
<summary>✅ Bom — par tight</summary>

```java
private String mapErrorToStatus(AppException error) {
    final var status = ERROR_STATUS_BY_CODE.getOrDefault(error.getCode(), "500");
    return status;
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `final var` que nomeia o valor retornado**
(Explaining Return) — e essa declaração está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (builder fluente, statement quebrado);
- linha acima é **side effect** (chamada void) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — return fragmentado quando a linha acima é single-line</summary>

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

`formatter` multi-linha exige blank depois de si, mas o blank foi posto antes
do `return`. `formattedDate` e `return formattedDate` formam Explaining Return
tight — não devem ser separados.

</details>

<details>
<summary>✅ Bom — multi-linha isolada, Explaining Return tight</summary>

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

O blank fica **depois** do `formatter` multi-linha. O par `formattedDate` +
`return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom — return com blank quando construído a partir de builder multi-linha</summary>

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

`data` é builder multi-linha; o blank antes do `return` isola o bloco grande do
envelope final.

</details>

**Exceção:** métodos de uma linha ficam compactos. O `return` é o único
conteúdo.

```java
public List<Order> findPendingOrders(String userId) {
    return orderRepository.findByStatus(userId, OrderStatus.PENDING);
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico **quando o
guarda cabe em uma única linha** — `if (...) return;`, `if (...) throw ...;`.
Nesse caso a linha em branco vem **depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas
físicas, mesmo com uma única instrução dentro), o `if` vira fase própria — o
bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede
respiro**: linha em branco **antes** do bloco. O critério é visual, não
semântico.

<details>
<summary>❌ Ruim — variável solta do seu guarda inline</summary>

```java
final var order = orderRepository.findById(orderId).orElse(null);

if (order == null) return null;
final var invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```java
final var order = orderRepository.findById(orderId).orElse(null);
if (order == null) return null;

final var invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>

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
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```java
final var response = requestFn.get();

if (response.statusCode() != 429) {
    return response;
}

final var delayMs = (long) Math.pow(2, attempt) * 1000L;
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`final var`, `private static final`)
formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks.
Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<details>
<summary>✅ Bom — trio tight</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;
private static final long ONE_DAY_MS = 86_400_000L;
```

</details>

<details>
<summary>✅ Bom — 4 atomics viram 2+2</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;

private static final long ONE_DAY_MS = 86_400_000L;
private static final int MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

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
<summary>✅ Bom — par semântico tight</summary>

```java
public String buildShippingLabel(Order order) {
    final var fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();
    final var addressLine = order.getAddress().getStreet() + ", " + order.getAddress().getNumber();

    final var cityLine = order.getAddress().getCity() + " - " + order.getAddress().getState();
    final var label = fullName + "\n" + addressLine + "\n" + cityLine + "\nOrder #" + order.getId();
    return label;
}
```

Dois pares tight: `cityLine + label` (par semântico encadeado) e
`label + return label` (Explaining Return). O leitor vê "nome, endereço /
cidade, label, retorne."

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta — blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim — fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();
    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e*
`order.deliveryDays`. Não é par direto com `address` — é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();

    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>

```java
public String buildOrderSlug(Order order) {
    final var normalizedTitle = order.getTitle().toLowerCase().replaceAll("\\s+", "-");
    final var slug = order.getId() + "-" + normalizedTitle;
    return slug;
}
```

`slug` depende **diretamente** de `normalizedTitle` (penúltima). Par semântico
encadeado: as duas ficam tight, e o `return` ainda tight com o último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim — 3 linhas heterogêneas coladas</summary>

```java
while (attempt < maxAttempts) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break;
    attempt++;
}
```

</details>

<details>
<summary>✅ Bom — declaração + guarda em par, incremento separado</summary>

```java
while (attempt < maxAttempts) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break;

    attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>

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
<summary>✅ Bom — fases explícitas</summary>

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

O `assertThat` é fase distinta. A linha em branco antes dele separa o que
está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — assertion colado ao setup, fases invisíveis</summary>

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
<summary>✅ Bom — assertion separado, como fase própria</summary>

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

## Multi-linha: respiro depois do bloco

Quando um builder fluente, lista expandida ou statement quebra em várias linhas,
o bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele
para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde
o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — builder multi-linha colado ao próximo statement</summary>

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
<summary>✅ Bom — blank depois do builder isola o bloco</summary>

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

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) colados formam
muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre
insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo
e ficam tight — a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos {} colados</summary>

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
<summary>✅ Bom — blank entre os blocos</summary>

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
<summary>✅ Bom — guardas de uma linha ficam tight (trio atômico)</summary>

```java
public UserInput validateInput(UserInput input) {
    if (input == null) throw new ValidationException("Input required");
    if (input.email() == null) throw new ValidationException("Email required");
    if (input.password() == null) throw new ValidationException("Password required");

    return input;
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```java
final var userName    = "alice";
final var userEmail   = "alice@example.com";
final var userRole    = "admin";
final var lastLoginAt = Instant.now();
```

</details>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>

```java
final var userName = "alice";
final var userEmail = "alice@example.com";
final var userRole = "admin";
final var lastLoginAt = Instant.now();
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — string imensa inline, sem semântica nas partes</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    return "Olá " + user.getFirstName() + " " + user.getLastName() + ", seu pedido #" + order.getId() + " foi confirmado e será entregue no endereço " + order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState() + " em até " + order.getDeliveryDays() + " dias úteis.";
}
```

</details>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>

```java
public String buildDeliveryMessage(User user, Order order) {
    final var fullName = user.getFirstName() + " " + user.getLastName();
    final var address = order.getAddress().getStreet() + ", " + order.getAddress().getCity() + " - " + order.getAddress().getState();

    final var deliveryMessage = "Olá " + fullName + ", seu pedido #" + order.getId() + " foi confirmado e será entregue em " + address + " em até " + order.getDeliveryDays() + " dias úteis.";
    return deliveryMessage;
}
```

</details>
