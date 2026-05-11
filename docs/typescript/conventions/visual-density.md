# Visual density: TypeScript

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco. Cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
TypeScript. Anotações de tipo (`: T`) não adicionam densidade: ficam na mesma
linha que a declaração e acompanham o passo a que pertencem.

> Base JavaScript:
> [javascript/conventions/visual-density.md](../../javascript/conventions/visual-density.md)

## Conceitos fundamentais

| Conceito                                     | O que é                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **visual density** (densidade visual)        | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo                         |
| **semantic group** (grupo semântico)         | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir)            |
| **blank line** (linha em branco)             | Separador entre grupos semânticos; substitui comentário de seção                                            |
| **tight pair** (par tight)                   | Duas linhas com relação direta (declaração + uso, const + return) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico)               | Três declarações simples consecutivas e homogêneas (`const`/`let`); mantidas juntas sem blank; preferir ao 2+1 que cria órfão              |
| **semantic pair** (par semântico encadeado)  | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta                    |
| **single-line orphan** (órfão de 1)          | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2    |
| **explaining return** (retorno explicativo)  | Caso particular de `tight pair`: `const X = …` single-line + `return X` sem blank entre eles                |
| **multi-line block** (bloco multi-linha)     | Objeto literal, array literal ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta, blank antes da montagem |
| **type annotation** (anotação de tipo)       | Anotação inline (`: T`) na mesma linha da declaração; não conta como passo                                  |
| **generic** (tipo paramétrico)               | Parâmetro de tipo (`<T>`) inline na assinatura; acompanha a função sem quebrar grupo                        |
| **boundary** (limite)                        | Linha que separa camadas (handler ↔ service, service ↔ repository); merece linha em branco antes            |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão, frágil a rename e gera diff ruidoso       |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.
Anotações de tipo não contam como passo separado.

<details>
<summary>❌ Ruim: denso demais: todos os passos colados</summary>

```ts
async function registerUser(input: CreateUserInput): Promise<User> {
  const { name, email } = input;
  const exists = await db.users.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");
  const hash = await hashPassword(input.password);
  const user = await db.users.create({ name, email, hash });
  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);
  return user;
}
```

</details>

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

```ts
async function registerUser(input: CreateUserInput): Promise<User> {
  const { name, email } = input;
  const exists = await userRepository.findByEmail(email);
  if (exists) throw new ConflictError("Email taken");

  const hash = await hashPassword(input.password);
  const user = await userRepository.create({ name, email, hash });

  const token: string = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

## Explaining Return: par tight

Uma `const` nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for essa `const` (single-line) e o `return` retornar
essa variável, os dois formam par de 2 linhas sem blank, não importa quantos
passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```ts
function mapErrorToStatus(error: DomainError): number {
  const status: number = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```ts
function mapErrorToStatus(error: DomainError): number {
  const status: number = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a `const` que nomeia o valor retornado**
(Explaining Return), e essa `const` está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (objeto/statement quebrado em várias linhas);
- linha acima é **side effect** (`await`, função sem retorno) que não nomeia o
  valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é single-line</summary>

```ts
function formatOrderDate(isoString: string, locale: string = "pt-BR"): string {
  const parsedDate = new Date(isoString);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const formattedDate = formatter.format(parsedDate);

  return formattedDate;
}
```

`formatter` multi-linha exige blank depois de si, mas o blank foi posto antes do
`return`. `formattedDate` e `return formattedDate` formam Explaining Return
tight, não devem ser separados.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```ts
function formatOrderDate(isoString: string, locale: string = "pt-BR"): string {
  const parsedDate = new Date(isoString);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  const formattedDate = formatter.format(parsedDate);
  return formattedDate;
}
```

O blank fica **depois** do `formatter` multi-linha. O par `formattedDate` +
`return formattedDate` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando construído a partir de objeto multi-linha</summary>

```ts
function buildOrderResponse(order: Order, requestId: string): OrderResponse {
  const data = {
    id: order.id,
    total: order.total,
    items: order.items,
  };

  return { data, requestId };
}
```

`data` é objeto multi-linha; o blank antes do `return` isola o bloco grande do
envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único
conteúdo.

```ts
function findPendingOrders(userId: string): Promise<Order[]> {
  return orderRepository.findByStatus(userId, "pending");
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` de guarda formam par semântico **quando o
guarda cabe em uma única linha**: `if (...) return;`, `if (...) throw ...;`.
Nesse caso a linha em branco vem **depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas
físicas, mesmo com uma única instrução dentro), o `if` vira fase própria: o
bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede
respiro**: linha em branco **antes** do bloco. O critério é visual, não
semântico.

<details>
<summary>❌ Ruim: variável solta do seu guarda inline</summary>

```ts
const order = await fetchOrder(orderId);

if (!order) return;
const invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: guarda inline (uma linha), par tight com a declaração</summary>

```ts
const order = await fetchOrder(orderId);
if (!order) return;

const invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: guarda em bloco, fase própria com blank antes</summary>

```ts
const handler = eventHandlers[eventType];

if (!handler) {
  logUnhandledEventType(eventType);
  return;
}

const eventPayload = event.data;
```

</details>

<details>
<summary>✅ Bom: guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```ts
const response = await requestFn();

if (response.status !== 429) {
  return response;
}

const delayMs = Math.pow(2, attempt) * 1000;
```

O bloco ocupa três linhas físicas, peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (const, let, var) formam grupo coeso.
Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três
juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;

const ONE_DAY_MS: number = 86_400_000;
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;
const ONE_DAY_MS: number = 86_400_000;
```

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;

const ONE_DAY_MS: number = 86_400_000;
const MAX_RETRY_ATTEMPTS: number = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

```ts
function buildShippingLabel(order: Order): string {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addressLine = `${order.address.street}, ${order.address.number}`;

  const cityLine = `${order.address.city} - ${order.address.state}, ${order.address.zipCode}`;

  const label = `${fullName}\n${addressLine}\n${cityLine}\nOrder #${order.id}`;
  return label;
}
```

</details>

<details>
<summary>✅ Bom: par semântico tight</summary>

```ts
function buildShippingLabel(order: Order): string {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addressLine = `${order.address.street}, ${order.address.number}`;

  const cityLine = `${order.address.city} - ${order.address.state}, ${order.address.zipCode}`;
  const label = `${fullName}\n${addressLine}\n${cityLine}\nOrder #${order.id}`;
  return label;
}
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta: blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;
  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e*
`order.deliveryDays`. Não é par direto com `address`: é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom: contraste: par semântico encadeado (última depende só da penúltima)</summary>

```ts
function buildOrderSlug(order: Order): string {
  const normalizedTitle = order.title.toLowerCase().replace(/\s+/g, "-");
  const slug = `${order.id}-${normalizedTitle}`;
  return slug;
}
```

`slug` depende **diretamente** de `normalizedTitle` (penúltima). Par
semântico encadeado: as duas ficam tight, e o `return` ainda tight com o
último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim: 3 linhas heterogêneas coladas</summary>

```ts
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;
  attempt++;
}
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em par, incremento separado</summary>

```ts
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim: todas as fases coladas, sem separação visual</summary>

```ts
async function createUserHandler(req: Request, res: Response): Promise<void> {
  const sanitized = sanitizeCreateUser(req.body);
  const input = createUserSchema.parse(sanitized);
  await createUser(input);
  const body: UserResponse = { id: input.id };
  res.status(201).json(body);
}
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```ts
async function createUserHandler(request: Request, response: Response): Promise<void> {
  const sanitized = sanitizeCreateUser(request.body);
  const input = createUserSchema.parse(sanitized);

  await createUser(input);

  const body: UserResponse = { id: input.id };
  response.status(201).json(body);
}
```

</details>

## Testes: expect como fase própria

O `expect` é fase distinta. A linha em branco antes dele separa o que está sendo
verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: expect colado ao setup, fases invisíveis</summary>

```ts
it("applies percentage discount to order price", () => {
  const order: Order = { price: 100, discountPct: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;
  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

<details>
<summary>✅ Bom: expect separado, assertion como fase própria</summary>

```ts
it("applies percentage discount to order price", () => {
  const order: Order = { price: 100, discountPct: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;

  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

## Multi-linha: respiro depois do bloco

Quando um objeto literal, array literal ou statement quebra em várias linhas, o
bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele
para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde o
bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: objeto multi-linha colado ao próximo statement</summary>

```ts
async function createSession(user: User): Promise<string> {
  const claims: JwtClaims = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issuedAt: Date.now(),
  };
  const token = await signJwt(claims);
  return token;
}
```

</details>

<details>
<summary>✅ Bom: blank depois do objeto isola o bloco</summary>

```ts
async function createSession(user: User): Promise<string> {
  const claims: JwtClaims = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issuedAt: Date.now(),
  };

  const token = await signJwt(claims);
  return token;
}
```

</details>

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) coladas formam
muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre
insira blank entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio homogêneo e
ficam tight: a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos {} colados</summary>

```ts
function processOrder(order: Order): void {
  if (order.status === "pending") {
    notifyCustomer(order);
    scheduleReview(order);
  }
  if (order.total > 1_000) {
    flagForAudit(order);
    notifyManager(order);
  }
}
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```ts
function processOrder(order: Order): void {
  if (order.status === "pending") {
    notifyCustomer(order);
    scheduleReview(order);
  }

  if (order.total > 1_000) {
    flagForAudit(order);
    notifyManager(order);
  }
}
```

</details>

<details>
<summary>✅ Bom: guardas de uma linha ficam tight (trio atômico)</summary>

```ts
function validateInput(input: CreateUserInput): CreateUserInput {
  if (!input) throw new ValidationError("Input required");
  if (!input.email) throw new ValidationError("Email required");
  if (!input.password) throw new ValidationError("Password required");

  return input;
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim: espaços extras para alinhar colunas</summary>

```ts
const userName: string   = "alice";
const userEmail: string  = "alice@example.com";
const userRole: string   = "admin";
const lastLoginAt: Date  = new Date();
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```ts
const userName: string = "alice";
const userEmail: string = "alice@example.com";
const userRole: string = "admin";
const lastLoginAt: Date = new Date();
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: string imensa inline, sem semântica nas partes</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  return `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

</details>
