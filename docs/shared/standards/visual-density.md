# Densidade visual

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Código é lido muitas vezes mais do que é escrito. A **visual density** (densidade visual) trata de agrupar o que pertence junto e separar o que é distinto, usando uma ferramenta só: a linha em branco. Ela guia o olho pelo código e dispensa o comentário de seção. Esta página é o guia transversal; cada linguagem tem a sua versão com exemplos idiomáticos, linkada no fim.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **visual density** (densidade visual) | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo |
| **semantic group** (grupo semântico) | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou salvar |
| **blank line** (linha em branco) | Separa dois grupos; faz o papel que antes cabia a um comentário de seção |
| **boundary** (limite) | Linha que separa camadas, por exemplo do handler para o service; pede uma linha em branco antes |
| **multi-line block** (bloco de várias linhas) | Objeto, array ou comando quebrado em várias linhas; pede um respiro depois de si |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação |

## Referência rápida

| Regra | Descrição |
|---|---|
| **O grupo natural tem 2 linhas** | Linhas relacionadas ficam juntas; a separação natural é por par |
| **Três linhas quando dividir criaria uma solta** | Três declarações simples do mesmo tipo (`const`, `let`) podem ficar juntas |
| **Quatro ou mais quebram em 2+2** | A partir de quatro linhas relacionadas, sempre dividir para evitar a muralha |
| **A `const` que nomeia o retorno cola no `return`** | `const X = …; return X;` ficam juntas, não importa quantos passos venham acima |
| **`return` separado** | Só vai linha em branco antes do `return` se a linha acima for de várias linhas, for efeito colateral ou se o valor nasceu passos antes |
| **A linha que usa o valor recém-declarado cola nele** | Quando a última linha depende só da penúltima (ex: `label = f(cityLine)`), as duas ficam juntas |
| **Montar o resultado é fase separada** | A linha que costura vários fragmentos ganha respiro antes |
| **A variável e o `if` que a valida são um grupo** | O respiro vem depois do par, não no meio dele |
| **Bloco de várias linhas pede respiro depois** | Objeto, array ou comando quebrado em várias linhas exige linha em branco depois |
| **`if` com chaves seguidos pedem respiro entre si** | Exceção: guardas de uma linha ficam juntas |
| **Sem alinhamento em colunas** | Um espaço único ao redor de `=` ou `:` |
| **Nunca duas linhas em branco** | Uma separa; duas viram ruído |

## A regra central

**Grupos pequenos, separados por uma linha em branco.** Dois é o tamanho natural do grupo. Três é aceitável quando dividir deixaria uma linha sozinha. A partir de quatro, sempre quebre. Use exatamente uma linha em branco entre grupos: a segunda vira ruído.

## O `return` fica junto da linha que nomeia o valor

Uma `const` nomeada logo acima do `return` explica o que está sendo devolvido. Quando essa `const` ocupa uma única linha e o `return` devolve exatamente ela, as duas se leem como uma frase e não aceitam linha em branco no meio. Quantos passos existem acima não importa: o respiro separa o par do que veio antes, nunca parte o par.

<details>
<summary>❌ Ruim: linha em branco fragmenta o par</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

A linha em branco isola o `return` como se ele encerrasse um parágrafo. Só que não há parágrafo nenhum antes dele, há uma linha. O olho procura o bloco que terminou e não acha.

</details>

<details>
<summary>✅ Bom: as duas linhas juntas</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

Lê-se como uma frase só: o status vem da tabela, devolva.

</details>

## Quando o `return` cola na linha acima e quando ganha um respiro

O `return` gruda na linha imediatamente acima em um caso só: quando essa linha é a `const` que nomeia o valor devolvido e cabe em uma única linha.

Em todos os outros casos vai uma linha em branco antes dele:

- a linha acima ocupa **várias linhas** (um objeto ou um comando quebrado);
- a linha acima é **efeito colateral** (`await`, função que não devolve nada) e portanto não nomeia o valor;
- o valor devolvido nasceu **vários passos antes**, sem par direto com a linha de cima.

<details>
<summary>❌ Ruim: o respiro caiu no lugar errado</summary>

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

`formatter` ocupa várias linhas e pede o respiro **depois** de si. Ele foi parar antes do `return`, e o efeito é duplo: o bloco grande fica junto do que vem depois, e o par `formattedDate` + `return formattedDate` acaba partido.

</details>

<details>
<summary>✅ Bom: bloco grande isolado, retorno junto do seu nome</summary>

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
<summary>✅ Bom: respiro antes do `return` quando o valor é um objeto de várias linhas</summary>

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

`data` ocupa várias linhas. O respiro antes do `return` separa esse bloco do envelope que fecha a função.

</details>

<details>
<summary>✅ Bom: respiro antes do `return` quando o valor nasceu passos antes</summary>

```js
async function registerUser(input) {
  const user = await userRepository.create(input);

  const token = generateToken(user.id);
  await sendWelcomeEmail(input.email, token);

  return user;
}
```

`return user` não forma par com `await sendWelcomeEmail`, que é efeito colateral e não nomeia nada. O `user` foi criado lá em cima. A linha em branco marca o encerramento.

</details>

## Não deixe uma linha sozinha entre espaços

Três declarações simples e seguidas formam um grupo coeso. Parti-las em 2+1 deixa a última boiando entre duas linhas em branco, e o leitor para para descobrir o que aquele destaque significa. Descobre que era só mais uma constante. Mantenha as três juntas e só divida em 2+2 quando forem quatro ou mais.

<details>
<summary>❌ Ruim: a terceira linha boiando sozinha</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
```

A linha solta parece um passo à parte, mas é só mais uma constante. O leitor pausa procurando o motivo e não encontra.

</details>

<details>
<summary>✅ Bom: as três juntas</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;
```

</details>

<details>
<summary>✅ Bom: quatro viram 2+2</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
const MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Duas linhas onde a segunda usa o valor da primeira

Quando a linha final consome o valor que a linha anterior acabou de declarar, as duas contam uma coisa só. A quebra natural vem antes das duas, nunca entre elas.

<details>
<summary>❌ Ruim: a dependência direta foi partida ao meio</summary>

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

`cityLine` é consumido pela linha seguinte. Separar as duas com uma linha em branco esconde justamente a relação que importa.

</details>

<details>
<summary>✅ Bom: quem depende fica junto</summary>

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

Dois pares grudados: `cityLine` com `label`, porque um alimenta o outro, e `label` com `return label`, porque um nomeia o outro. O leitor lê "nome e endereço / cidade, etiqueta, devolve."

</details>

## Prepare as partes, depois monte o resultado

Quando duas ou mais linhas preparam fragmentos e uma linha final costura vários deles de uma vez, essa montagem é uma fase à parte e ganha respiro antes. É o clássico "preparar as partes, montar o resultado", e ele se distingue do caso anterior por um detalhe só: lá a última linha depende **apenas** da penúltima, aqui ela puxa material de várias.

A pergunta que decide:

- A última linha usa **só** o valor declarado logo acima? Então as duas ficam juntas.
- A última linha costura **fragmentos vindos de linhas diferentes**? Então ela é montagem, e leva uma linha em branco antes.

<details>
<summary>❌ Ruim: preparação e montagem juntas, como se fossem o mesmo passo</summary>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;
  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

`deliveryMessage` consome `fullName`, `address`, `order.id` e `order.deliveryDays`. Ele monta o resultado a partir de vários fragmentos, então forma uma fase própria. Coladas como um trio, as duas fases somem.

</details>

<details>
<summary>✅ Bom: fragmentos de um lado, montagem do outro</summary>

```js
function buildDeliveryMessage(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const deliveryMessage = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;
  return deliveryMessage;
}
```

Duas fases visíveis: preparar os fragmentos, montar e entregar.

</details>

## A variável e o `if` que a valida ficam juntos

Uma variável seguida do `if` que a valida formam um grupo só, desde que o guarda caiba em uma linha: `if (...) return;`, `if (...) throw ...;`. O respiro vem depois do par.

Quando o guarda é escrito com chaves, a conta muda. O bloco `{ }` tem peso visual próprio, mesmo carregando uma única instrução dentro, e por isso vira fase separada: linha em branco **antes** dele. O critério aqui é visual: o que decide é quanto espaço o bloco ocupa na tela.

<details>
<summary>✅ Bom: guarda de uma linha, junto da declaração</summary>

```js
const product = await fetchProduct(id);
if (!product) throw new NotFoundError();

const result = process(product);
```

</details>

<details>
<summary>✅ Bom: guarda com chaves, fase própria e respiro antes</summary>

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
<summary>✅ Bom: com chaves pede respiro antes mesmo carregando uma instrução só</summary>

```js
const response = await requestFn();

if (response.status !== 429) {
  return response;
}

const delayMs = Math.pow(2, attempt) * 1000;
```

O bloco ocupa três linhas na tela: peso próprio. Escrito em uma linha, ficaria junto da declaração; com chaves, ganha o respiro antes.

</details>

## Deixe cada fase do método visível

Um método que busca, transforma, persiste e responde tem quatro fases, e o leitor deveria enxergar as quatro sem ler o corpo. Cada fase ocupa até duas linhas antes do respiro, ou três quando são declarações simples do mesmo tipo.

## Depois de um bloco de várias linhas, deixe um respiro

Um objeto literal, um array ou um comando quebrado em várias linhas já ocupa espaço próprio na tela. Cole uma linha em branco **depois** dele. Sem isso, o leitor não vê onde o bloco terminou e o próximo passo começou; os dois viram uma massa só.

<details>
<summary>❌ Ruim: objeto grande junto do comando seguinte</summary>

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
<summary>✅ Bom: o respiro depois do objeto fecha o bloco</summary>

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

## Dois `if` seguidos com chaves pedem uma linha entre eles

Dois blocos `{ ... }` juntos formam uma parede: o olho não acha onde um termina e o outro começa. Sempre separe os dois.

A exceção são as guardas de uma linha. Retornos antecipados curtos e seguidos formam um grupo homogêneo e ficam juntos, pela mesma regra que mantém três declarações unidas.

<details>
<summary>❌ Ruim: dois blocos juntos, sem nada entre eles</summary>

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
<summary>✅ Bom: uma linha em branco entre os blocos</summary>

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
<summary>✅ Bom: guardas de uma linha ficam juntas</summary>

```js
function validateInput(input) {
  if (!input) throw new ValidationError("Input required");
  if (!input.email) throw new ValidationError("Email required");
  if (!input.password) throw new ValidationError("Password required");

  return input;
}
```

</details>

## Não alinhe o código em colunas

Não use espaços extras para alinhar `=`, `:` ou valores na vertical. Um espaço único, sempre. O alinhamento artificial quebra a cada renomeação e enche o diff de linhas que ninguém mudou de fato.

<details>
<summary>❌ Ruim: espaços extras para alinhar as colunas</summary>

```js
const userName     = "alice";
const userEmail    = "alice@example.com";
const userRole     = "admin";
const lastLoginAt  = new Date();
```

</details>

<details>
<summary>✅ Bom: um espaço só</summary>

```js
const userName = "alice";
const userEmail = "alice@example.com";
const userRole = "admin";
const lastLoginAt = new Date();
```

</details>

## Textos longos montados em uma linha

Uma string longa escrita direto no `return` esconde as partes que a compõem. Extraia os fragmentos em variáveis nomeadas e monte o resultado depois: o texto final fica legível e cada pedaço ganha um nome.

---

## Por linguagem

Os mesmos princípios com exemplos idiomáticos de cada stack:

- [JavaScript](../../javascript/conventions/visual-density.md)
- [C#](../../csharp/conventions/visual-density.md)
- [CSS](../../css/conventions/visual-density.md)
- [SQL](../../sql/conventions/visual-density.md)
