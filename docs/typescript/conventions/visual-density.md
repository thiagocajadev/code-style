# Densidade visual em TypeScript

Densidade visual é a quantidade de informação que você empilha em cada bloco de
código. Quando muitas linhas se acumulam sem espaço, o olho cansa e você perde o
fio do raciocínio. Quando linhas sem relação ficam grudadas, o leitor não sabe
onde uma ideia termina e a outra começa. A saída é direta: junte as linhas que
contam a mesma pequena história e separe cada história da próxima com uma linha
em branco.

Os princípios gerais estão em
[densidade visual](../../shared/standards/visual-density.md). Aqui eles aparecem
adaptados a TypeScript, que acrescenta uma pergunta ao tema: a anotação de tipo
conta como informação a mais no bloco? Não conta. Uma anotação (`: T`) fica na
mesma linha da declaração e pertence ao mesmo passo que ela, e um parâmetro de
tipo (`<T>`) acompanha a assinatura da função. Nenhum dos dois abre grupo novo.

> Base JavaScript:
> [javascript/conventions/visual-density.md](../../javascript/conventions/visual-density.md)

## Conceitos fundamentais

| Conceito                                     | O que é                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **visual density** (densidade visual)        | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo                  |
| **semantic group** (grupo semântico)         | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou salvar                         |
| **blank line** (linha em branco)             | Separa dois grupos; faz o papel que antes cabia a um comentário de seção                                    |
| **boundary** (limite)                        | Linha que separa camadas, por exemplo do handler para o service; pede uma linha em branco antes             |
| **multi-line block** (bloco de várias linhas) | Objeto, array ou comando quebrado em várias linhas; pede um respiro depois de si                           |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação                   |
| **type annotation** (anotação de tipo)       | O tipo escrito na própria linha da declaração (`: T`); pertence ao passo e não abre grupo novo              |
| **generic** (tipo paramétrico)               | O parâmetro de tipo na assinatura (`<T>`); acompanha a função sem quebrar o grupo                           |

## A regra central

A regra que resolve quase tudo: **agrupe poucas linhas por vez e separe cada
grupo com uma linha em branco.** O tamanho natural de um grupo é duas linhas.
Três valem quando dividir em duas mais uma deixaria a última linha sozinha. A
partir de quatro, quebre em dois grupos de duas. As anotações de tipo não entram
nessa conta.

<details>
<summary>❌ Ruim: tudo grudado, sem um respiro entre os passos</summary>

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
<summary>✅ Bom: cada fase visível, no máximo duas linhas por grupo</summary>

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

## O `return` fica junto da linha que nomeia o valor

Quando a linha logo acima do `return` é a `const` que dá nome ao valor devolvido,
as duas formam uma dupla e ficam juntas, sem linha em branco entre elas. Não
importa quantos passos venham antes. A linha em branco separa essa dupla do que
veio antes; ela nunca entra no meio da dupla.

<details>
<summary>❌ Ruim: a linha em branco parte a dupla no meio</summary>

```ts
function mapErrorToStatus(error: DomainError): number {
  const status: number = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

</details>

<details>
<summary>✅ Bom: a `const` e o `return` juntos</summary>

```ts
function mapErrorToStatus(error: DomainError): number {
  const status: number = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

</details>

## Quando o `return` cola na linha acima e quando ganha um respiro

O `return` só cola na linha imediatamente acima quando essa linha é a `const`, de
uma única linha, que nomeia o valor devolvido. Em todos os outros casos, deixe
uma linha em branco antes do `return`:

- a linha acima ocupa várias linhas (um objeto ou comando quebrado em vários
  pedaços);
- a linha acima só produz um efeito (um `await`, uma função que não devolve
  valor) e não dá nome ao resultado;
- o valor devolvido foi criado vários passos antes, sem formar dupla com a linha
  de cima.

<details>
<summary>❌ Ruim: a linha em branco separou a `const` do `return` que a devolve</summary>

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

O `formatter` ocupa várias linhas e pede um respiro depois de si, mas aqui a
linha em branco foi parar antes do `return`. `formattedDate` e
`return formattedDate` são a dupla que nomeia e devolve o valor: não devem ser
separados.

</details>

<details>
<summary>✅ Bom: o bloco de várias linhas isolado, a `const` e o `return` juntos</summary>

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

A linha em branco fica **depois** do `formatter`, que ocupa várias linhas. A
dupla `formattedDate` + `return formattedDate` continua junta.

</details>

<details>
<summary>✅ Bom: return com respiro quando é montado a partir de um objeto de várias linhas</summary>

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

`data` é um objeto de várias linhas; a linha em branco antes do `return` separa
esse bloco grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único conteúdo.

```ts
function findPendingOrders(userId: string): Promise<Order[]> {
  return orderRepository.findByStatus(userId, "pending");
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

```ts
const order = await fetchOrder(orderId);

if (!order) return;
const invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: `if` de uma linha, junto da variável</summary>

```ts
const order = await fetchOrder(orderId);
if (!order) return;

const invoice = buildInvoice(order);
```

</details>

<details>
<summary>✅ Bom: `if` com chaves, fase à parte com um respiro antes</summary>

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
<summary>✅ Bom: `if` com chaves pede respiro antes mesmo com uma só instrução</summary>

```ts
const response = await requestFn();

if (response.status !== 429) {
  return response;
}

const delayMs = Math.pow(2, attempt) * 1000;
```

O bloco ocupa três linhas e tem peso visual próprio. Em uma linha só, ficaria
junto da variável; com chaves, pede uma linha em branco antes.

</details>

## Não deixe uma linha sozinha entre espaços

Três declarações simples seguidas (`const`, `let`, `var`) formam um grupo coeso.
Se você quebrar em duas mais uma, a última fica sozinha entre duas linhas em
branco, parecendo esquecida. Mantenha as três juntas. Só divida quando forem
quatro, aí em dois pares.

<details>
<summary>❌ Ruim: a última linha sozinha entre espaços</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;

const ONE_DAY_MS: number = 86_400_000;
```

</details>

<details>
<summary>✅ Bom: as três juntas</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;
const ONE_DAY_MS: number = 86_400_000;
```

</details>

<details>
<summary>✅ Bom: quatro viram dois pares</summary>

```ts
const MINIMUM_DRIVING_AGE: number = 18;
const ORDER_STATUS_APPROVED: number = 2;

const ONE_DAY_MS: number = 86_400_000;
const MAX_RETRY_ATTEMPTS: number = 3;
```

</details>

## Duas linhas onde a segunda usa o valor da primeira

Quando a última linha **usa o valor recém-criado** na linha de cima, as duas
formam uma dupla. O respiro natural fica antes da dupla, nunca entre uma linha e
o valor de que ela depende.

<details>
<summary>❌ Ruim: a linha foi separada do valor de que depende</summary>

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
<summary>✅ Bom: as duas linhas dependentes juntas</summary>

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

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;
  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

`deliveryMessage` usa `fullName`, `address`, `order.id` e `order.deliveryDays` ao
mesmo tempo. Não é uma dupla com `address`: é a fase de montagem. Grudada como se
as três linhas fossem iguais, as fases somem.

</details>

<details>
<summary>✅ Bom: pedaços em uma dupla, montagem à parte, `return` junto do valor</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

Duas fases ficam visíveis: preparar os pedaços, depois montar e devolver.

</details>

<details>
<summary>✅ Bom: contraste, a última linha depende só da anterior</summary>

```ts
function buildOrderSlug(order: Order): string {
  const normalizedTitle = order.title.toLowerCase().replace(/\s+/g, "-");
  const slug = `${order.id}-${normalizedTitle}`;
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

```ts
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;
  attempt++;
}
```

</details>

<details>
<summary>✅ Bom: variável e `if` juntos, o incremento separado</summary>

```ts
while (attempt < maxAttempts) {
  const connection = connectToDatabase();
  if (connection.isReady) break;

  attempt++;
}
```

</details>

## Deixe cada fase do método visível

Métodos com vários passos (buscar, transformar, salvar, responder) devem deixar
cada passo visível. Uma linha em branco entre eles marca onde um termina e o
outro começa, ainda mais quando os passos cruzam um limite entre camadas, por
exemplo do handler para o service.

<details>
<summary>❌ Ruim: todos os passos grudados, sem separação visual</summary>

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
<summary>✅ Bom: cada passo visível</summary>

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

## No teste, a verificação é uma fase separada

No teste, a linha que verifica o resultado (`expect`) é uma fase própria. A linha
em branco antes dela separa **o que** está sendo verificado de **como** você
preparou o cenário.

<details>
<summary>❌ Ruim: `expect` grudado na preparação, as fases somem</summary>

```ts
it("applies percentage discount to order price", () => {
  const order: Order = { price: 100, discountPercentage: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;
  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

<details>
<summary>✅ Bom: `expect` separado, a verificação como fase própria</summary>

```ts
it("applies percentage discount to order price", () => {
  const order: Order = { price: 100, discountPercentage: 10 };
  const actualOrder = applyDiscount(order);
  const expectedPrice = 90;

  expect(actualOrder.price).toBe(expectedPrice);
});
```

</details>

## Depois de um bloco de várias linhas, deixe um respiro

Quando um objeto, um array ou um comando quebra em várias linhas, esse bloco já
ocupa um espaço visual próprio. Deixe uma linha em branco **depois** dele para
separá-lo do próximo passo. Sem esse respiro, o leitor não vê onde o bloco
termina e o próximo começa.

<details>
<summary>❌ Ruim: objeto de várias linhas grudado no próximo comando</summary>

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
<summary>✅ Bom: linha em branco depois do objeto separa o bloco</summary>

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

## Dois `if` seguidos com chaves pedem uma linha entre eles

Dois `if` seguidos, cada um com um bloco de várias linhas entre chaves, formam
uma parede: o olho não distingue onde um bloco termina e o outro começa. Sempre
coloque uma linha em branco entre eles.

**Exceção:** os `if` de saída rápida, com uma linha só (`if (!input) throw ...`),
são do mesmo tipo e ficam juntos, como qualquer grupo de linhas iguais.

<details>
<summary>❌ Ruim: dois blocos com chaves grudados</summary>

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
<summary>✅ Bom: linha em branco entre os blocos</summary>

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
<summary>✅ Bom: saídas rápidas de uma linha ficam juntas</summary>

```ts
function validateInput(input: CreateUserInput): CreateUserInput {
  if (!input) throw new ValidationError("Input required");
  if (!input.email) throw new ValidationError("Email required");
  if (!input.password) throw new ValidationError("Password required");

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

```ts
const userName: string   = "alice";
const userEmail: string  = "alice@example.com";
const userRole: string   = "admin";
const lastLoginAt: Date  = new Date();
```

</details>

<details>
<summary>✅ Bom: um espaço só, sem preenchimento</summary>

```ts
const userName: string = "alice";
const userEmail: string = "alice@example.com";
const userRole: string = "admin";
const lastLoginAt: Date = new Date();
```

</details>

## Textos longos montados em uma linha

Um texto longo grudado dentro de um `return` esconde os pedaços que o compõem.
Separe cada pedaço em uma variável com nome antes de montar o resultado. Em
TypeScript esse texto costuma ser uma **template string** (o texto entre crases
que aceita valores no meio com `${...}`).

<details>
<summary>❌ Ruim: texto enorme em uma linha, sem nome nos pedaços</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  return `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
}
```

</details>

<details>
<summary>✅ Bom: pedaços com nome, texto final limpo</summary>

```ts
function buildDeliveryMessage(user: User, order: Order): string {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

</details>
