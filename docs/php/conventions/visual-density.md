# Visual density: PHP

**Visual density** (densidade visual) é a quantidade de informação por bloco visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra quando trechos não relacionados ficam colados. A solução é agrupar por intenção semântica e separar grupos com linha em branco — cada grupo conta uma micro-história.

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) com exemplos em PHP 8.4. PSR-12 define o estilo de chaves e indentação; a densidade visual é a camada do desenvolvedor por cima.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, `$x = …` + `return $x`) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`$x = …;`); mantidas juntas sem blank — preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `$x = …;` single-line + `return $x;` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Array literal, construtor com named arguments ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem |
| **boundary** (limite) | Linha que separa camadas (handler ↔ service, service ↔ repository); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `=>` verticalmente; antipadrão — frágil a rename, gera diff ruidoso |
| **PSR-12 style** (estilo PSR-12) | Camada de formatação que define chaves, indentação e quebras; precede a densidade visual |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>
<br>

```php
public function registerUser(RegisterUserInput $input): User
{
    $exists = $this->userRepository->existsByEmail($input->email);
    if ($exists) throw new ConflictException('Email already taken');
    $hash = $this->passwordHasher->hash($input->password);
    $user = $this->userRepository->create($input->name, $input->email, $hash);
    $token = $this->tokenService->generate($user->id);
    $this->emailService->sendWelcome($user->email, $token);
    return $user;
}
```

</details>

<br>

<details>
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>
<br>

```php
public function registerUser(RegisterUserInput $input): User
{
    $exists = $this->userRepository->existsByEmail($input->email);
    if ($exists) throw new ConflictException('Email already taken');

    $hash = $this->passwordHasher->hash($input->password);
    $user = $this->userRepository->create($input->name, $input->email, $hash);

    $token = $this->tokenService->generate($user->id);
    $this->emailService->sendWelcome($user->email, $token);

    return $user;
}
```

</details>

## Explaining Return: par tight

Uma variável nomeada acima do `return` explica o valor retornado. Sempre que a linha imediatamente acima for essa variável (single-line) e o `return` retornar essa variável, os dois formam par de 2 linhas sem blank — não importa quantos passos haja acima. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>
<br>

```php
public function mapErrorToStatus(DomainError $error): int
{
    $status = self::ERROR_STATUS_BY_CODE[$error->code] ?? 500;

    return $status;
}
```

</details>

<br>

<details>
<summary>✅ Bom — par tight</summary>
<br>

```php
public function mapErrorToStatus(DomainError $error): int
{
    $status = self::ERROR_STATUS_BY_CODE[$error->code] ?? 500;
    return $status;
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima **somente quando essa linha é a atribuição que nomeia o valor retornado** (Explaining Return) — e essa atribuição está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (array literal, construtor com named arguments quebrado em várias linhas);
- linha acima é **efeito colateral** (chamada sem retorno) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — return fragmentado quando a linha acima é single-line</summary>
<br>

```php
public function formatOrderDate(\DateTimeImmutable $date, string $locale = 'pt-BR'): string
{
    $timezone = new \DateTimeZone('America/Sao_Paulo');
    $formatter = \IntlDateFormatter::create(
        $locale,
        \IntlDateFormatter::SHORT,
        \IntlDateFormatter::NONE,
        $timezone,
    );
    $formattedDate = $formatter->format($date);

    return $formattedDate;
}
```

`$formatter` multi-linha exige blank depois de si, mas o blank foi posto antes do `return`. `$formattedDate` e `return $formattedDate` formam Explaining Return tight — não devem ser separados.

</details>

<br>

<details>
<summary>✅ Bom — multi-linha isolada, Explaining Return tight</summary>
<br>

```php
public function formatOrderDate(\DateTimeImmutable $date, string $locale = 'pt-BR'): string
{
    $timezone = new \DateTimeZone('America/Sao_Paulo');
    $formatter = \IntlDateFormatter::create(
        $locale,
        \IntlDateFormatter::SHORT,
        \IntlDateFormatter::NONE,
        $timezone,
    );

    $formattedDate = $formatter->format($date);
    return $formattedDate;
}
```

O blank fica **depois** do `$formatter` multi-linha. O par `$formattedDate` + `return $formattedDate` permanece tight.

</details>

<br>

<details>
<summary>✅ Bom — return com blank quando construído a partir de array multi-linha</summary>
<br>

```php
public function buildOrderResponse(Order $order, string $requestId): array
{
    $data = [
        'id' => $order->id,
        'total' => $order->total,
        'items' => $order->items,
    ];

    return ['data' => $data, 'requestId' => $requestId];
}
```

`$data` é array multi-linha; o blank antes do `return` isola o bloco grande do envelope final.

</details>

**Exceção:** métodos de uma única expressão ficam compactos. O `return` é o único conteúdo.

```php
public function findPendingOrders(int $userId): array
{
    return $this->orderRepository->findByStatus($userId, OrderStatus::Pending);
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico **quando o guarda cabe em uma única linha** — `if (...) return;`, `if (...) throw ...;`. Nesse caso a linha em branco vem **depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas físicas, mesmo com uma única instrução dentro), o `if` vira fase própria — o bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede respiro**: linha em branco **antes** do bloco. O critério é visual, não semântico.

<details>
<summary>❌ Ruim — variável solta do seu guarda inline</summary>
<br>

```php
$order = $this->orderRepository->findById($orderId);

if ($order === null) return;
$invoice = $this->buildInvoice($order);
```

</details>

<br>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>
<br>

```php
$order = $this->orderRepository->findById($orderId);
if ($order === null) return;

$invoice = $this->buildInvoice($order);
```

</details>

<br>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>
<br>

```php
$handler = $this->eventHandlers[$eventType] ?? null;

if ($handler === null) {
    $this->logUnhandledEventType($eventType);
    return;
}

$eventPayload = $event->data;
```

</details>

<br>

<details>
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>
<br>

```php
$response = $this->requestFn();

if ($response->status !== 429) {
    return $response;
}

$delayMs = (2 ** $attempt) * 1000;
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`$x = …;`, `const X = …`) formam grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>
<br>

```php
final class DomainLimits
{
    public const int MINIMUM_DRIVING_AGE = 18;
    public const int ORDER_STATUS_APPROVED = 2;

    public const int ONE_DAY_MS = 86_400_000;
}
```

</details>

<br>

<details>
<summary>✅ Bom — trio tight</summary>
<br>

```php
final class DomainLimits
{
    public const int MINIMUM_DRIVING_AGE = 18;
    public const int ORDER_STATUS_APPROVED = 2;
    public const int ONE_DAY_MS = 86_400_000;
}
```

</details>

<br>

<details>
<summary>✅ Bom — 4 atomics viram 2+2</summary>
<br>

```php
final class DomainLimits
{
    public const int MINIMUM_DRIVING_AGE = 18;
    public const int ORDER_STATUS_APPROVED = 2;

    public const int ONE_DAY_MS = 86_400_000;
    public const int MAX_RETRY_ATTEMPTS = 3;
}
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam par. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>
<br>

```php
public function buildShippingLabel(Order $order): string
{
    $fullName = "{$order->customer->firstName} {$order->customer->lastName}";
    $addressLine = "{$order->address->street}, {$order->address->number}";

    $cityLine = "{$order->address->city} - {$order->address->state}, {$order->address->zipCode}";

    $label = "{$fullName}\n{$addressLine}\n{$cityLine}\nOrder #{$order->id}";
    return $label;
}
```

</details>

<br>

<details>
<summary>✅ Bom — par semântico tight</summary>
<br>

```php
public function buildShippingLabel(Order $order): string
{
    $fullName = "{$order->customer->firstName} {$order->customer->lastName}";
    $addressLine = "{$order->address->street}, {$order->address->number}";

    $cityLine = "{$order->address->city} - {$order->address->state}, {$order->address->zipCode}";
    $label = "{$fullName}\n{$addressLine}\n{$cityLine}\nOrder #{$order->id}";
    return $label;
}
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que **consome múltiplos fragmentos** (não depende só do último), trate a montagem como fase distinta — blank antes dela. É o caso clássico "preparar partes → montar resultado", diferente do par semântico encadeado (onde a última depende **diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim — fragmentos e montagem coladas como se fossem trio homogêneo</summary>
<br>

```php
public function buildDeliveryMessage(User $user, Order $order): string
{
    $fullName = "{$user->firstName} {$user->lastName}";
    $address = "{$order->address->street}, {$order->address->city} - {$order->address->state}";
    $deliveryMessage = "Olá {$fullName}, seu pedido #{$order->id} foi confirmado e será entregue em {$address} em até {$order->deliveryDays} dias úteis.";
    return $deliveryMessage;
}
```

`$deliveryMessage` consome `$fullName` *e* `$address` *e* `$order->id` *e* `$order->deliveryDays`. Não é par direto com `$address` — é a fase de montagem. Coladas como trio, as fases ficam invisíveis.

</details>

<br>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>
<br>

```php
public function buildDeliveryMessage(User $user, Order $order): string
{
    $fullName = "{$user->firstName} {$user->lastName}";
    $address = "{$order->address->street}, {$order->address->city} - {$order->address->state}";

    $deliveryMessage = "Olá {$fullName}, seu pedido #{$order->id} foi confirmado e será entregue em {$address} em até {$order->deliveryDays} dias úteis.";
    return $deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar" (Explaining Return tight).

</details>

<br>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>
<br>

```php
public function buildOrderSlug(Order $order): string
{
    $normalizedTitle = strtolower(preg_replace('/\s+/', '-', $order->title));
    $slug = "{$order->id}-{$normalizedTitle}";
    return $slug;
}
```

`$slug` depende **diretamente** de `$normalizedTitle` (penúltima). Par semântico encadeado: as duas ficam tight, e o `return` ainda tight com o último.

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>
<br>

```php
public function createUserHandler(Request $request): Response
{
    $sanitized = $this->sanitizeCreateUser($request->body);
    $input = CreateUserInput::fromArray($sanitized);
    $this->createUser($input);
    $body = ['id' => $input->id];
    return new Response(status: 201, body: $body);
}
```

</details>

<br>

<details>
<summary>✅ Bom — fases explícitas</summary>
<br>

```php
public function createUserHandler(Request $request): Response
{
    $sanitized = $this->sanitizeCreateUser($request->body);
    $input = CreateUserInput::fromArray($sanitized);

    $this->createUser($input);

    $body = ['id' => $input->id];
    $response = new Response(status: 201, body: $body);
    return $response;
}
```

</details>

## Testes: assert como fase própria

O `assert` é fase distinta. A linha em branco antes dele separa o que está sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — assert colado ao setup, fases invisíveis</summary>
<br>

```php
public function testAppliesPercentageDiscountToOrderPrice(): void
{
    $order = new Order(price: 100.0, discountPct: 10);
    $actualOrder = $this->applyDiscount($order);
    $expectedPrice = 90.0;
    $this->assertSame($expectedPrice, $actualOrder->price);
}
```

</details>

<br>

<details>
<summary>✅ Bom — assert separado, assertion como fase própria</summary>
<br>

```php
public function testAppliesPercentageDiscountToOrderPrice(): void
{
    $order = new Order(price: 100.0, discountPct: 10);
    $actualOrder = $this->applyDiscount($order);
    $expectedPrice = 90.0;

    $this->assertSame($expectedPrice, $actualOrder->price);
}
```

</details>

## Multi-linha: respiro depois do bloco

Quando um array literal, construtor com named arguments ou statement quebra em várias linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — array multi-linha colado ao próximo statement</summary>
<br>

```php
public function createSession(User $user): string
{
    $claims = [
        'sub' => $user->id,
        'email' => $user->email,
        'roles' => $user->roles,
        'issuedAt' => time(),
    ];
    $token = $this->signJwt($claims);
    return $token;
}
```

</details>

<br>

<details>
<summary>✅ Bom — blank depois do array isola o bloco</summary>
<br>

```php
public function createSession(User $user): string
{
    $claims = [
        'sub' => $user->id,
        'email' => $user->email,
        'roles' => $user->roles,
        'issuedAt' => time(),
    ];

    $token = $this->signJwt($claims);
    return $token;
}
```

</details>

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) colados formam muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo e ficam tight — a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos {} colados</summary>
<br>

```php
public function processOrder(Order $order): void
{
    if ($order->status === OrderStatus::Pending) {
        $this->notifyCustomer($order);
        $this->scheduleReview($order);
    }
    if ($order->total > 1_000) {
        $this->flagForAudit($order);
        $this->notifyManager($order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Bom — blank entre os blocos</summary>
<br>

```php
public function processOrder(Order $order): void
{
    if ($order->status === OrderStatus::Pending) {
        $this->notifyCustomer($order);
        $this->scheduleReview($order);
    }

    if ($order->total > 1_000) {
        $this->flagForAudit($order);
        $this->notifyManager($order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Bom — guardas de uma linha ficam tight (trio atômico)</summary>
<br>

```php
public function validateInput(CreateUserInput $input): void
{
    if ($input->name === '') throw new ValidationException('Name required');
    if ($input->email === '') throw new ValidationException('Email required');
    if ($input->password === '') throw new ValidationException('Password required');
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `=>` ou valores com múltiplos espaços. Use sempre **um espaço único**. Alinhamento artificial quebra com qualquer rename, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>
<br>

```php
$userName     = 'alice';
$userEmail    = 'alice@example.com';
$userRole     = 'admin';
$lastLoginAt  = new \DateTimeImmutable();
```

</details>

<br>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>
<br>

```php
$userName = 'alice';
$userEmail = 'alice@example.com';
$userRole = 'admin';
$lastLoginAt = new \DateTimeImmutable();
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — string imensa inline, sem semântica nas partes</summary>
<br>

```php
public function buildDeliveryMessage(User $user, Order $order): string
{
    return "Olá {$user->firstName} {$user->lastName}, seu pedido #{$order->id} foi confirmado e será entregue no endereço {$order->address->street}, {$order->address->city} - {$order->address->state} em até {$order->deliveryDays} dias úteis.";
}
```

</details>

<br>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>
<br>

```php
public function buildDeliveryMessage(User $user, Order $order): string
{
    $fullName = "{$user->firstName} {$user->lastName}";
    $address = "{$order->address->street}, {$order->address->city} - {$order->address->state}";

    $deliveryMessage = "Olá {$fullName}, seu pedido #{$order->id} foi confirmado e será entregue em {$address} em até {$order->deliveryDays} dias úteis.";
    return $deliveryMessage;
}
```

</details>
