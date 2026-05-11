# Visual density: Dart

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco — cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Dart 3.7.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | duas linhas com relação direta (declaração + uso, `final` + `return`) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | três declarações simples consecutivas e homogêneas (`final`/`var`); mantidas juntas sem blank — preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicado) | caso particular de `tight pair`: `final x = …` single-line + `return x;` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | objeto literal, lista literal, construtor ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem |
| **boundary** (limite) | linha que separa camadas (widget ↔ notifier, repository ↔ datasource); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a rename, gera diff ruidoso |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>

```dart
Future<Receipt> processPayment(PaymentRequest request) async {
  final user = await _userRepository.findById(request.userId);
  if (user == null) throw UserNotFoundError(request.userId);
  final method = await _paymentMethodRepository.findById(request.methodId);
  if (method == null) throw InvalidPaymentMethodError(request.methodId);
  if (method.isExpired) throw ExpiredPaymentMethodError();
  final charge = await _chargeGateway.charge(method, request.amount);
  final receipt = Receipt(userId: request.userId, amount: request.amount, chargeId: charge.id);
  await _receiptRepository.save(receipt);
  return receipt;
}
```

</details>

<details>
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>

```dart
Future<Receipt> processPayment(PaymentRequest request) async {
  final user = await _userRepository.findById(request.userId);
  if (user == null) throw UserNotFoundError(request.userId);

  final method = await _paymentMethodRepository.findById(request.methodId);
  if (method == null) throw InvalidPaymentMethodError(request.methodId);

  if (method.isExpired) throw ExpiredPaymentMethodError();

  final charge = await _chargeGateway.charge(method, request.amount);

  final receipt = Receipt(
    userId: request.userId,
    amount: request.amount,
    chargeId: charge.id,
  );

  await _receiptRepository.save(receipt);
  return receipt;
}
```

</details>

## Explaining Return: par tight

Uma `final` nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for essa `final` (single-line) e o `return` retornar
essa variável, os dois formam par de 2 linhas sem blank — não importa quantos
passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>

```dart
int mapErrorToStatus(AppError error) {
  final status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

</details>

<details>
<summary>✅ Bom — par tight</summary>

```dart
int mapErrorToStatus(AppError error) {
  final status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `final` que nomeia o valor retornado**
(Explaining Return) — e essa `final` está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (objeto/construtor/statement quebrado em várias
  linhas);
- linha acima é **side effect** (`await`, função sem retorno) que não nomeia o
  valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — return fragmentado quando a linha acima é single-line</summary>

```dart
String formatOrderDate(String isoString, {String locale = 'pt_BR'}) {
  final parsedDate = DateTime.parse(isoString);
  final formatter = DateFormat.yMd(locale).add_Hm();
  final formattedDate = formatter.format(parsedDate);

  return formattedDate;
}
```

`formatter` single-line, mas o blank foi posto antes do `return`. `formattedDate`
e `return formattedDate` formam Explaining Return tight — não devem ser separados.

</details>

<details>
<summary>✅ Bom — Explaining Return tight</summary>

```dart
String formatOrderDate(String isoString, {String locale = 'pt_BR'}) {
  final parsedDate = DateTime.parse(isoString);
  final formatter = DateFormat.yMd(locale).add_Hm();

  final formattedDate = formatter.format(parsedDate);
  return formattedDate;
}
```

O blank separa o par "preparar formatter" do par "formatar + retornar". O par
`formattedDate` + `return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom — return com blank quando construído a partir de objeto multi-linha</summary>

```dart
OrderResponse buildOrderResponse(Order order, String requestId) {
  final data = OrderData(
    id: order.id,
    total: order.total,
    items: order.items,
  );

  return OrderResponse(data: data, requestId: requestId);
}
```

`data` é construtor multi-linha; o blank antes do `return` isola o bloco grande
do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único conteúdo.

```dart
Future<List<Order>> findPendingOrders(int userId) {
  return _orderRepository.findByStatus(userId, OrderStatus.pending);
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

```dart
final order = await _fetchOrder(orderId);

if (order == null) return;
final invoice = _buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```dart
final order = await _fetchOrder(orderId);
if (order == null) return;

final invoice = _buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>

```dart
final handler = eventHandlers[eventType];

if (handler == null) {
  _logUnhandledEventType(eventType);
  return;
}

final eventPayload = event.data;
```

</details>

<details>
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```dart
final response = await _requestFn();

if (response.statusCode != 429) {
  return response;
}

final delayMs = math.pow(2, attempt).toInt() * 1000;
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria tight,
mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`final`, `var`, `const`) formam grupo
coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as
três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>

```dart
const minimumDrivingAge = 18;
const orderStatusApproved = 2;

const oneDayMs = 86400000;
```

</details>

<details>
<summary>✅ Bom — trio tight</summary>

```dart
const minimumDrivingAge = 18;
const orderStatusApproved = 2;
const oneDayMs = 86400000;
```

</details>

<details>
<summary>✅ Bom — 4 atomics viram 2+2</summary>

```dart
const minimumDrivingAge = 18;
const orderStatusApproved = 2;

const oneDayMs = 86400000;
const maxRetryAttempts = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

```dart
String buildShippingLabel(Order order) {
  final fullName = '${order.customer.firstName} ${order.customer.lastName}';
  final addressLine = '${order.address.street}, ${order.address.number}';

  final cityLine = '${order.address.city} - ${order.address.state}, ${order.address.zipCode}';

  final label = '$fullName\n$addressLine\n$cityLine\nOrder #${order.id}';
  return label;
}
```

</details>

<details>
<summary>✅ Bom — par semântico tight</summary>

```dart
String buildShippingLabel(Order order) {
  final fullName = '${order.customer.firstName} ${order.customer.lastName}';
  final addressLine = '${order.address.street}, ${order.address.number}';

  final cityLine = '${order.address.city} - ${order.address.state}, ${order.address.zipCode}';
  final label = '$fullName\n$addressLine\n$cityLine\nOrder #${order.id}';
  return label;
}
```

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

```dart
String buildDeliveryMessage(User user, Order order) {
  final fullName = '${user.firstName} ${user.lastName}';
  final address = '${order.address.street}, ${order.address.city} - ${order.address.state}';
  final deliveryMessage = 'Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis.';
  return deliveryMessage;
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e*
`order.deliveryDays`. Não é par direto com `address` — é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>

```dart
String buildDeliveryMessage(User user, Order order) {
  final fullName = '${user.firstName} ${user.lastName}';
  final address = '${order.address.street}, ${order.address.city} - ${order.address.state}';

  final deliveryMessage = 'Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis.';
  return deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>

```dart
String buildOrderSlug(Order order) {
  final normalizedTitle = order.title.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
  final slug = '${order.id}-$normalizedTitle';
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

```dart
while (attempt < maxAttempts) {
  final connection = _connectToDatabase();
  if (connection.isReady) break;
  attempt++;
}
```

</details>

<details>
<summary>✅ Bom — declaração + guarda em par, incremento separado</summary>

```dart
while (attempt < maxAttempts) {
  final connection = _connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>

```dart
Future<void> createUserHandler(CreateUserRequest request) async {
  final sanitized = sanitizeCreateUser(request.body);
  final input = CreateUserInput.parse(sanitized);
  await _createUser(input);
  final body = {'id': input.id};
  _respond(201, body);
}
```

</details>

<details>
<summary>✅ Bom — fases explícitas</summary>

```dart
Future<void> createUserHandler(CreateUserRequest request) async {
  final sanitized = sanitizeCreateUser(request.body);
  final input = CreateUserInput.parse(sanitized);

  await _createUser(input);

  final body = {'id': input.id};
  _respond(201, body);
}
```

</details>

## Testes: expect como fase própria

O `expect` é fase distinta. A linha em branco antes dele separa o que está sendo
verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — expect colado ao setup, fases invisíveis</summary>

```dart
test('applies percentage discount to order price', () {
  final order = Order(price: 100, discountPct: 10);
  final discountedOrder = applyDiscount(order);
  final expectedPrice = 90;
  expect(discountedOrder.price, expectedPrice);
});
```

</details>

<details>
<summary>✅ Bom — expect separado, assertion como fase própria</summary>

```dart
test('applies percentage discount to order price', () {
  final order = Order(price: 100, discountPct: 10);
  final discountedOrder = applyDiscount(order);
  final expectedPrice = 90;

  expect(discountedOrder.price, expectedPrice);
});
```

</details>

## Multi-linha: respiro depois do bloco

Quando um construtor, lista literal ou statement quebra em várias linhas, o
bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele
para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde o
bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — construtor multi-linha colado ao próximo statement</summary>

```dart
Future<String> createSession(User user) async {
  final claims = SessionClaims(
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issuedAt: DateTime.now().toUtc(),
  );
  final token = await _signJwt(claims);
  return token;
}
```

</details>

<details>
<summary>✅ Bom — blank depois do construtor isola o bloco</summary>

```dart
Future<String> createSession(User user) async {
  final claims = SessionClaims(
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issuedAt: DateTime.now().toUtc(),
  );

  final token = await _signJwt(claims);
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

```dart
void processOrder(Order order) {
  if (order.status == OrderStatus.pending) {
    _notifyCustomer(order);
    _scheduleReview(order);
  }
  if (order.total > 1000) {
    _flagForAudit(order);
    _notifyManager(order);
  }
}
```

</details>

<details>
<summary>✅ Bom — blank entre os blocos</summary>

```dart
void processOrder(Order order) {
  if (order.status == OrderStatus.pending) {
    _notifyCustomer(order);
    _scheduleReview(order);
  }

  if (order.total > 1000) {
    _flagForAudit(order);
    _notifyManager(order);
  }
}
```

</details>

<details>
<summary>✅ Bom — guardas de uma linha ficam tight (trio atômico)</summary>

```dart
CreateUserInput validateInput(Map<String, dynamic> input) {
  if (input.isEmpty) throw ValidationError('Input required');
  if (input['email'] == null) throw ValidationError('Email required');
  if (input['password'] == null) throw ValidationError('Password required');

  return CreateUserInput.fromMap(input);
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```dart
final userName     = 'alice';
final userEmail    = 'alice@example.com';
final userRole     = 'admin';
final lastLoginAt  = DateTime.now();
```

</details>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>

```dart
final userName = 'alice';
final userEmail = 'alice@example.com';
final userRole = 'admin';
final lastLoginAt = DateTime.now();
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — string imensa inline, sem semântica nas partes</summary>

```dart
String buildDeliveryMessage(User user, Order order) {
  return 'Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.';
}
```

</details>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>

```dart
String buildDeliveryMessage(User user, Order order) {
  final fullName = '${user.firstName} ${user.lastName}';
  final address = '${order.address.street}, ${order.address.city} - ${order.address.state}';

  final deliveryMessage = 'Olá $fullName, seu pedido #${order.id} foi confirmado e será entregue em $address em até ${order.deliveryDays} dias úteis.';
  return deliveryMessage;
}
```

</details>

## Cascade (`..`) com moderação

Cascade é idiomático para configuração de objetos. Evitar quando as operações
têm efeitos colaterais não óbvios.

<details>
<summary>❌ Ruim — cascade misturado com lógica</summary>

```dart
final buffer = StringBuffer()
  ..write(header)
  ..write(items.isEmpty ? 'No items' : items.map((i) => i.name).join(', '))
  ..writeln()
  ..write(footer);
```

</details>

<details>
<summary>✅ Bom — lógica extraída; cascade só para operações de configuração</summary>

```dart
final itemsLine = items.isEmpty ? 'No items' : items.map((i) => i.name).join(', ');

final buffer = StringBuffer()
  ..write(header)
  ..write(itemsLine)
  ..writeln()
  ..write(footer);
```

</details>
