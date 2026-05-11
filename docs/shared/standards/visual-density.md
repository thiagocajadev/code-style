# Visual Density

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Código é lido muito mais vezes do que escrito. **Visual density** (densidade visual, como o olho percorre o código) trata de agrupar o que pertence junto e separar o que é distinto, sem precisar de comentários para guiar o olho.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **blank line** (linha em branco) | Separador entre grupos coesos; uma só, nunca duas seguidas |
| **tight pair** (par grudado) | Duas linhas com relação direta sem linha em branco entre elas; o respiro vem antes ou depois do par, nunca no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`const`/`let`); mantidas juntas — preferir ao `2+1` que cria órfão |
| **semantic pair** (par semântico encadeado) | Par grudado em que a última linha usa **diretamente** o valor declarado na penúltima |
| **explaining return** (retorno explicativo) | Caso particular de par grudado: `const X = …` em uma única linha + `return X` sem linha em branco entre eles |
| **multi-line block** (bloco multi-linha) | Objeto literal, array literal ou statement quebrado em várias linhas; pede linha em branco depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; é fase distinta — linha em branco antes da montagem |
| **orphan line** (linha órfã) | Declaração isolada entre linhas em branco que pertencia ao grupo anterior; cria pausa sem motivo |
| **declaration + guard** (declaração e guarda) | Variável seguida do `if` que a valida; o respiro vem depois do par, não entre ele |
| **wall of code** (muralha de código) | Quatro ou mais linhas relacionadas sem respiro; sempre quebrar em `2+2` |
| **method phase** (fase do método) | Etapa lógica (preparar, transformar, persistir, responder); cada fase ganha seu respiro |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a renomeações, gera diff ruidoso |

## Referência rápida

| Regra | Descrição |
|---|---|
| **Grupo padrão: 2 linhas** | Linhas relacionadas ficam juntas; a separação natural é por par |
| **Trio tolerado** | Três declarações simples consecutivas e homogêneas (`const`, `let`) podem ficar juntas quando a divisão criaria uma linha solta |
| **4+ quebra em 2+2** | A partir de quatro linhas relacionadas, sempre dividir para evitar muralha |
| **Retorno explicativo é par grudado** | `const X = …; return X;` é um par sem linha em branco — não importa quantos passos haja acima |
| **Retorno separado** | Só vai linha em branco antes do `return` se a linha imediatamente acima for multi-linha, efeito colateral ou se o valor foi criado vários passos antes |
| **Par semântico encadeado** | Quando a linha final depende **diretamente** da penúltima (ex: `label = f(cityLine)`), elas ficam grudadas |
| **Fragmentos → montagem** | Linha final que costura múltiplos fragmentos é fase distinta — linha em branco antes |
| **Declaração + guarda = par** | A variável e o `if` que a valida ficam juntos; o respiro vem depois do par |
| **Multi-linha pede respiro depois** | Objeto literal, array literal ou statement quebrado em várias linhas exige linha em branco depois |
| **Ifs com bloco `{}` consecutivos** | Sempre linha em branco entre eles; exceção: trio de guardas de uma linha fica grudado |
| **Sem alinhamento de coluna** | Um espaço único ao redor de `=` ou `:`; sem espaçamento artificial |
| **Strings longas** | Extrair fragmentos em variáveis nomeadas antes de montar o resultado |
| **Nunca duplo respiro** | Exatamente uma linha em branco entre grupos; duas é ruído |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria uma linha solta. A partir de quatro, sempre quebrar. Nunca duas linhas em branco seguidas: é ruído, não respiro.

## Retorno explicativo: par grudado

Uma `const` nomeada acima do `return` explica o valor retornado. Sempre que a linha imediatamente acima for essa `const` em uma única linha e o `return` retornar exatamente essa variável, os dois formam par sem linha em branco — **não importa quantos passos haja acima**. A linha em branco separa o par do que vem antes; ela não fragmenta o par.

<details>
<summary>❌ Ruim — linha em branco fragmenta o par</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

A linha em branco isola o `return` como se fosse um parágrafo de encerramento, mas não há parágrafo antes — só uma linha. O olho procura o bloco que foi encerrado e não encontra.

</details>

<details>
<summary>✅ Bom — par grudado</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

Duas linhas que se leem como uma unidade: "o status vem da tabela, retorne."

</details>

## Retorno grudado vs retorno separado

A regra é simples: o `return` fica **grudado** na linha imediatamente acima **somente quando essa linha é a `const` que nomeia o valor retornado** (retorno explicativo) — e essa `const` ocupa uma única linha.

Em todos os outros casos, vai uma linha em branco antes do `return`:

- linha acima é **multi-linha** (objeto ou statement quebrado em várias linhas);
- linha acima é **efeito colateral** (`await`, função sem retorno) que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — retorno fragmentado quando a linha acima é de uma linha e nomeia o valor</summary>

```js
function formatOrderDate(isoString, locale = "pt-BR") {
  const parsedDate = new Date(isoString);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedDate = formatter.format(parsedDate);

  return formattedDate;
}
```

`formatter` é multi-linha e exige linha em branco **depois** de si. A linha em branco foi colocada no lugar errado: antes do `return`, fragmentando o retorno explicativo `formattedDate` + `return formattedDate`.

</details>

<details>
<summary>✅ Bom — multi-linha isolada, retorno explicativo grudado</summary>

```js
function formatOrderDate(isoString, locale = "pt-BR") {
  const parsedDate = new Date(isoString);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedDate = formatter.format(parsedDate);
  return formattedDate;
}
```

</details>

<details>
<summary>✅ Bom — retorno com linha em branco quando o valor é objeto multi-linha</summary>

```js
function buildOrderResponse(order, requestId) {
  const data = {
    id: order.id,
    total: order.total,
    items: order.items,
  };

  return { data, requestId };
}
```

`data` é objeto multi-linha; a linha em branco antes do `return` isola o bloco grande do envelope final.

</details>

<details>
<summary>✅ Bom — retorno com linha em branco quando o valor foi criado vários passos antes</summary>

```js
async function registerUser(input) {
  const user = await userRepository.create(input);

  const token = generateToken(user.id);
  await sendWelcomeEmail(input.email, token);

  return user;
}
```

`return user` não forma par com `await sendWelcomeEmail` (efeito colateral); `user` foi criado várias linhas acima. A linha em branco antes do `return` marca o encerramento.

</details>

## Linha órfã é pior que trio grudado

Três declarações simples consecutivas formam um grupo coeso. Partir em `2+1` deixa a última linha solta entre linhas em branco, sem contexto: o leitor pausa procurando o motivo da separação e descobre que era só mais uma constante. Mantenha as três juntas. Só divida em `2+2` quando houver quatro ou mais.

<details>
<summary>❌ Ruim — linha órfã entre linhas em branco</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
```

A linha solta parece um passo separado, mas é só mais uma constante. O leitor pausa procurando o motivo da separação e não encontra.

</details>

<details>
<summary>✅ Bom — trio grudado</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;
```

</details>

<details>
<summary>✅ Bom — quatro declarações viram 2+2</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
const MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam um par semântico. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

```csharp
public static string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";

    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return label;
}
```

`cityLine` é consumido imediatamente por `label`. Separá-los com linha em branco esconde a relação.

</details>

<details>
<summary>✅ Bom — par semântico grudado</summary>

```csharp
public static string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";
    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";
    return label;
}
```

Dois pares grudados: `cityLine + label` (par semântico encadeado) e `label + return label` (retorno explicativo). O leitor vê "nome, endereço / cidade, label, retorne."

</details>

## Fragmentos → montagem: linha em branco antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que **consome múltiplos fragmentos** (não depende só do último), trate a montagem como fase distinta — linha em branco antes dela. É o caso clássico "preparar partes → montar resultado", diferente do par semântico encadeado (onde a última depende **diretamente** da penúltima e por isso fica grudada).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico, fica grudado.
- A última linha **costura múltiplos fragmentos** declarados em linhas diferentes? → fragmentos → montagem, linha em branco antes.

<details>
<summary>❌ Ruim — fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;
  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

`deliveryMessage` consome `fullName` *e* `address` *e* `order.id` *e* `order.deliveryDays`. Não é par direto com `address` — é a fase de montagem. Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, retorno explicativo grudado</summary>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar" (retorno explicativo grudado).

</details>

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam um par semântico **quando o guarda cabe em uma única linha** — `if (...) return;`, `if (...) throw ...;`. Nesse caso a linha em branco vem **depois** do par, não entre ele.

Quando o guarda é escrito em **bloco `{ }`** (qualquer quantidade de linhas físicas, mesmo com uma única instrução dentro), o `if` vira fase própria — o bloco já ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede respiro**: linha em branco **antes** do bloco. O critério é visual, não semântico.

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```js
const product = await fetchProduct(id);
if (!product) throw new NotFoundError();

const result = process(product);
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com linha em branco antes</summary>

```js
const handler = eventHandlers[eventType];

if (!handler) {
  logUnhandledEventType(eventType);
  return;
}

const eventPayload = event.data;
```

</details>

<details>
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```js
const response = await requestFn();

if (response.status !== 429) {
  return response;
}

const delayMs = Math.pow(2, attempt) * 1000;
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria tight, mas em bloco, blank antes.

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter até 2 linhas antes de um respiro; 3 quando são declarações simples do mesmo tipo.

## Multi-linha: respiro depois do bloco

Quando um objeto literal, array literal ou statement quebra em várias linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — objeto multi-linha colado ao próximo statement</summary>

```js
async function createSession(user) {
  const claims = {
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
<summary>✅ Bom — linha em branco depois do objeto isola o bloco</summary>

```js
async function createSession(user) {
  const claims = {
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

Dois `if` consecutivos com **bloco multi-linha** (`{ ... }`) colados formam muralha: o olho não distingue onde um bloco termina e o outro começa. Sempre insira linha em branco entre eles.

**Exceção:** guardas de uma linha (retornos antecipados curtos) formam trio homogêneo e ficam grudadas — a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos {} colados</summary>

```js
function processOrder(order) {
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
<summary>✅ Bom — linha em branco entre os blocos</summary>

```js
function processOrder(order) {
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
<summary>✅ Bom — guardas de uma linha ficam grudadas (trio atômico)</summary>

```js
function validateInput(input) {
  if (!input) throw new ValidationError("Input required");
  if (!input.email) throw new ValidationError("Email required");
  if (!input.password) throw new ValidationError("Password required");

  return input;
}
```

</details>

## Sem alinhamento de coluna

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre **um espaço único**. Alinhamento artificial quebra com qualquer renomeação, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refatoração.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```js
const userName     = "alice";
const userEmail    = "alice@example.com";
const userRole     = "admin";
const lastLoginAt  = new Date();
```

</details>

<details>
<summary>✅ Bom — espaço único, sem espaçamento extra</summary>

```js
const userName = "alice";
const userEmail = "alice@example.com";
const userRole = "admin";
const lastLoginAt = new Date();
```

</details>

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

---

## Por linguagem

Os mesmos princípios com exemplos idiomáticos de cada stack:

- [JavaScript](../../javascript/conventions/visual-density.md)
- [C#](../../csharp/conventions/visual-density.md)
- [CSS](../../css/conventions/visual-density.md)
- [SQL](../../sql/conventions/visual-density.md)
