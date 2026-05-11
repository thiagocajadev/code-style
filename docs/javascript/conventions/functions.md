# Functions

Função é a unidade mínima de reuso e teste. Seu valor está em **single responsibility** (responsabilidade única, fazer uma coisa só), assinatura clara e tamanho que cabe na tela. Quando uma função busca, valida, calcula e persiste tudo junto, ela vira um ponto de acoplamento que ninguém consegue reaproveitar nem testar isoladamente.

Uma função faz uma coisa. Seu nome diz o quê. Seu tamanho cabe na tela.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **single responsibility** (responsabilidade única) | Função tem uma razão para mudar; um motivo para existir |
| **arrow function** (função flecha) | `() => {}` — sintaxe curta sem `this` próprio; ideal para callbacks |
| **named function** (função nomeada) | `function name() {}` — aparece com nome no stack trace; ideal para topo de módulo |
| **parameter** (parâmetro) | Nome declarado na assinatura; recebe o argumento na chamada |
| **default parameter** (parâmetro padrão) | Valor usado quando o argumento é `undefined` (`function f(x = 0)`) |
| **rest parameter** (parâmetro variádico) | `...args` — coleta argumentos restantes em array |
| **pure function** (função pura) | Mesma entrada → mesma saída; sem efeito colateral observável |
| **side effect** (efeito colateral) | Leitura ou escrita fora dos argumentos: I/O, mutação externa, log |

## God function — múltiplas responsabilidades

<details>
<summary>❌ Ruim — busca, valida, calcula, persiste e loga na mesma função</summary>
<br>

```js
realizaVenda(123);

function realizaVenda(x) {
  let resultado;
  let p = buscaPedido(x);

  if (p != null) {
    if (p.itens && p.itens.length > 0) {
      if (!p.c.inadimplente) {
        if (p.total > 100) {
          p.desconto = 10;
        } else {
          p.desconto = 0;
        }

        apply(p);

        function apply(p) {
          if (p.desconto) p.total = p.total - p.desconto;
        }

        let salvo = salvaPedido(p);
        resultado = salvo ? salvo : null;

        if (Math.random() > 0.5) {
          console.log("Log qualquer");
        }
      } else {
        notify(p);
        resultado = false;

        function notify(p) {
          console.log("cliente inadimplente", p?.cliente?.nome);
        }
      }
    } else {
      resultado = undefined;
    }
  } else {
    resultado = null;
  }

  return resultado;
}
```

</details>

<br>

<details>
<summary>✅ Bom — orquestrador no topo, responsabilidades separadas</summary>
<br>

```js
await processOrder(123);

async function processOrder(orderId) {
  const order = await getOrder(orderId);
  if (isInvalid(order)) return;

  const invoice = await issueInvoice(order);
  return invoice;

  function isInvalid(order) {
    if (!order || order.items.length === 0) return true;
    if (order.customer.defaulted) return notifyDefault(order);

    return false;
  }

  async function issueInvoice(order) {
    const discountedOrder = applyDiscount(order);
    const invoice = await saveOrder(discountedOrder);
    return invoice;
  }
}
```

</details>

## SLA — orquestrador ou implementação, nunca os dois

<details>
<summary>❌ Ruim — mesma função orquestra e implementa</summary>
<br>

```js
function buildOrderSummary(order) {
  const header = `Order #${order.id}`;

  // orquestra E implementa ao mesmo tempo
  const lineItems = order.items
    .map((item) => `  - ${item.name}: $${item.price.toFixed(2)}`)
    .join("\n");

  return `${header}\n${lineItems}`;
}
```

</details>

<br>

<details>
<summary>✅ Bom — orquestrador chama helpers, cada um faz uma coisa</summary>
<br>

```js
function buildOrderSummary(order) {
  const header = buildHeader(order);
  const lineItems = buildLineItems(order);

  const summary = [header, lineItems].join("\n");
  return summary;

  function buildHeader(order) {
    const header = `Order #${order.id}`;
    return header;
  }

  function buildLineItems(order) {
    const lines = order.items.map((item) => `  - ${item.name}: $${item.price.toFixed(2)}`);
    const lineItems = lines.join("\n");
    return lineItems;
  }
}
```

</details>

## Separar cálculo de formatação

<details>
<summary>❌ Ruim — cálculo e formatação misturados</summary>
<br>

```js
function getOrderSummary(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;

  const total = subtotal + tax;

  return `Order #${order.id}: $${subtotal.toFixed(2)} + tax $${tax.toFixed(2)} = $${total.toFixed(2)}`;
}
```

</details>

<br>

<details>
<summary>✅ Bom — cálculo separado da formatação</summary>
<br>

```js
function getOrderSummary(order) {
  const totals = calculateTotals(order.items);
  const summary = formatSummary(order.id, totals);
  return summary;

  function calculateTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const tax = subtotal * 0.1;

    const totals = { subtotal, tax, total: subtotal + tax };
    return totals;
  }

  function formatSummary(orderId, totals) {
    const { subtotal, tax, total } = totals;
    const summary = `Order #${orderId}: $${subtotal.toFixed(2)} + tax $${tax.toFixed(2)} = $${total.toFixed(2)}`;
    return summary;
  }
}
```

</details>

## Direct return

O retorno fica no topo da função, com os detalhes encapsulados em auxiliares abaixo dela.

<details>
<summary>❌ Ruim — variável auxiliar desnecessária, else após throw</summary>
<br>

```js
async function findProductById(id) {
  let productFound = null;

  const results = await db.query(id);

  if (results.rowCount === 0) {
    throw new NotFoundError("Product not found.");
  } else {
    productFound = results.rows[0];
  }

  return productFound;
}
```

</details>

<br>

<details>
<summary>✅ Bom — intenção clara no topo, detalhe abaixo</summary>
<br>

```js
async function findProductById(id) {
  const product = await fetchProduct(id);
  return product;

  async function fetchProduct(id) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Product not found.");

    return product;
  }
}
```

</details>

## Ponto de entrada limpo

O caller expressa o quê, não o como. Toda construção de contexto fica dentro da função.

<details>
<summary>❌ Ruim — caller monta lógica inline antes de chamar</summary>
<br>

```js
await submitOrder({
  ...order,
  total: order.items.reduce((sum, item) => sum + item.price, 0) * (1 - getDiscount(user)),
  timestamp: new Date().toISOString(),
});
```

</details>

<br>

<details>
<summary>✅ Bom — entrada de uma linha, detalhes dentro</summary>
<br>

```js
await submitOrder(orderId);

async function submitOrder(orderId) {
  const order = await fetchOrder(orderId);
  const pricedOrder = applyPricing(order);

  const invoice = await persistOrder(pricedOrder);
  return invoice;
}
```

</details>

## Sem lógica no retorno

O retorno nomeia o resultado, não o computa. A variável é expressiva e simétrica com a intenção da função.

<details>
<summary>❌ Ruim — lógica ou objeto anônimo direto no return</summary>
<br>

```js
function buildGreeting(user) {
  return `Hello, ${user.name}! You have ${user.notifications.length} notifications.`;
}

function getActiveUsers(users) {
  return users.filter((user) => user.isActive && !user.isBanned);
}
```

</details>

<br>

<details>
<summary>✅ Bom — variável expressiva antes do return</summary>
<br>

```js
function buildGreeting(user) {
  const greeting = `Hello, ${user.name}! You have ${user.notifications.length} notifications.`;
  return greeting;
}

function getActiveUsers(users) {
  const activeUsers = users.filter((user) => user.isActive && !user.isBanned);
  return activeUsers;
}
```

</details>

<br>

<details>
<summary>❌ Ruim — bare return: pass-through sem nome, o retorno não diz o que é</summary>
<br>

```js
function findPendingOrders(userId) {
  return orderRepository.findByStatus(userId, "pending");
}

async function processCheckout(cartId) {
  return await checkoutService.process(cartId);
}
```

</details>

<br>

<details>
<summary>✅ Bom — nome simétrico com a função deixa claro o que sai</summary>
<br>

```js
function findPendingOrders(userId) {
  const pendingOrders = orderRepository.findByStatus(userId, "pending");
  return pendingOrders;
}

async function processCheckout(cartId) {
  const invoice = await checkoutService.process(cartId);
  return invoice;
}
```

</details>

<br>

<details>
<summary>❌ Ruim — string imensa montada inline: ilegível e sem semântica</summary>
<br>

```js
function buildShippingLabel(order) {
  return `${order.customer.firstName} ${order.customer.lastName}\n${order.address.street}, ${order.address.number}\n${order.address.city} - ${order.address.state}, ${order.address.zipCode}\nOrder #${order.id}`;
}
```

</details>

<br>

<details>
<summary>✅ Bom — partes nomeadas antes de montar o resultado</summary>
<br>

```js
function buildShippingLabel(order) {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addressLine = `${order.address.street}, ${order.address.number}`;

  const cityLine = `${order.address.city} - ${order.address.state}, ${order.address.zipCode}`;
  const label = `${fullName}\n${addressLine}\n${cityLine}\nOrder #${order.id}`;
  return label;
}
```

</details>

## Baixa densidade visual

Linhas relacionadas ficam juntas. Grupos distintos se separam com exatamente uma linha em branco. Nunca duas.

<details>
<summary>❌ Ruim — parede de código sem respiro entre grupos</summary>
<br>

```js
async function processOrder(orderId) {
  const order = await fetchOrder(orderId);
  if (!order) return;
  const discountedOrder = applyDiscount(order);
  const invoice = buildInvoice(discountedOrder);
  await saveInvoice(invoice);
  await notifyCustomer(invoice);

  return invoice;
}
```

</details>

<br>

<details>
<summary>✅ Bom — parágrafos de intenção</summary>
<br>

```js
async function processOrder(orderId) {
  const order = await fetchOrder(orderId);
  if (!order) return;

  const discountedOrder = applyDiscount(order);
  const invoice = buildInvoice(discountedOrder);

  await saveInvoice(invoice);
  await notifyCustomer(invoice);

  return invoice;
}
```

</details>

## Baixa densidade visual — agrupamento

Blank lines em excesso dentro de um grupo quebram o ritmo. Blank lines ausentes entre grupos colam o que não se relaciona. A regra: 0 linhas dentro, 1 entre, nunca 2+.

<details>
<summary>❌ Ruim — espaço dentro dos grupos, sem separação entre grupos</summary>
<br>

```js
async function registerUser(input) {

  const { name, email } = input;

  const exists = await db.users.findByEmail(email);

  if (exists) throw new ConflictError('Email taken');

  const hash = await hashPassword(input.password);
  const user = await db.users.create({ name, email, hash });

  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

<br>

<details>
<summary>✅ Bom — 0 linhas dentro do grupo, 1 entre grupos</summary>
<br>

```js
async function registerUser(input) {
  const { name, email } = input;

  const exists = await userRepository.findByEmail(email);
  if (exists) throw new ConflictError('Email taken');

  const hash = await hashPassword(input.password);
  const user = await userRepository.create({ name, email, hash });

  const token = generateToken(user.id);
  await sendWelcomeEmail(email, token);

  return user;
}
```

</details>

## Strings longas

Template literal gigante? Extraia as partes compostas em variáveis nomeadas.

<details>
<summary>❌ Ruim — todos os detalhes interpolados inline</summary>
<br>

```js
function buildConfirmationEmail(user, order) {
  const message = `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
  return message;
}
```

</details>

<br>

<details>
<summary>✅ Bom — compostos extraídos, string final legível</summary>
<br>

```js
function buildConfirmationEmail(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;

  const greeting = `Olá ${fullName}`;
  const orderInfo = `seu pedido #${order.id} foi confirmado`;
  const deliveryInfo = `e será entregue em ${address} em até ${order.deliveryDays} dias úteis`;

  const message = `${greeting}, ${orderInfo} ${deliveryInfo}.`;
  return message;
}
```

</details>

## Estilo vertical — parâmetros

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um objeto.

<details>
<summary>❌ Ruim — 4+ parâmetros inline, intenção obscura na chamada</summary>
<br>

```js
function createInvoice(orderId, customerId, amount, dueDate, currency) { /* ... */ }

createInvoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL");
```

</details>

<br>

<details>
<summary>✅ Bom — objeto quando 4+ parâmetros</summary>
<br>

```js
function createInvoice(invoiceData) {
  // why: desestruturar no corpo preserva a assinatura como objeto nomeado na chamada
  const { orderId, customerId, amount, dueDate, currency } = invoiceData;
  /* ... */
}

createInvoice({
  orderId: "ord-1",
  customerId: "cust-99",
  amount: 149.90,
  dueDate: "2026-05-01",
  currency: "BRL",
});
```

</details>

## Arrow function — preservar `this` em callbacks

Em JavaScript, o `this` é decidido por **quem chama** a função, não por quem a escreve. É daí que vêm os bugs sutis: você escreve um método, passa `function () {}` como **callback** (função de retorno), e dentro dele o `this` deixa de ser o objeto que você esperava.

Duas formas de declarar uma função, dois comportamentos diferentes:

- `function () {}` tem `this` próprio. Em callbacks de `setInterval`, `forEach` ou `addEventListener`, o `this` esperado se perde — vira `undefined` em **strict mode** (modo estrito) ou o objeto global.
- `() => {}` **não tem `this` próprio**. A **arrow function** (função flecha) herda o `this` **lexical** (léxico) — o `this` do escopo onde ela foi escrita. Por isso preserva a referência da instância dentro do método.

Regra prática: em callbacks dentro de métodos, use arrow. Em métodos de objeto e classe, use **method shorthand** (método curto, `obj.foo() {}`) — o `this` é resolvido no **call site** (ponto de chamada): `obj.foo()` → `this === obj`.

<details>
<summary>❌ Ruim — callback `function` dentro do método quebra o `this` da instância</summary>
<br>

```js
class Cart {
  constructor() {
    this.items = [];
    this.total = 0;
  }

  addAll(prices) {
    prices.forEach(function (price) {
      this.total += price; // this é undefined em strict mode
      this.items.push(price);
    });
  }
}

const cart = new Cart();
cart.addAll([10, 20, 30]); // TypeError: Cannot read properties of undefined (reading 'total')
```

</details>

<br>

<details>
<summary>✅ Bom — arrow function captura o `this` léxico do método</summary>
<br>

```js
class Cart {
  constructor() {
    this.items = [];
    this.total = 0;
  }

  addAll(prices) {
    prices.forEach((price) => {
      this.total += price;
      this.items.push(price);
    });
  }
}

const cart = new Cart();
cart.addAll([10, 20, 30]);
```

</details>

<br>

<details>
<summary>❌ Ruim — `setInterval` com `function` perde acesso aos campos da instância</summary>
<br>

```js
class BuildTimer {
  constructor(label) {
    this.label = label;
    this.elapsed = 0;
  }

  start() {
    setInterval(function () {
      this.elapsed += 1;
      console.log(`${this.label}: ${this.elapsed}s`); // imprime "undefined: NaNs"
    }, 1000);
  }
}

new BuildTimer("build").start();
```

</details>

<br>

<details>
<summary>✅ Bom — arrow herda `this`; `label` e `elapsed` continuam acessíveis</summary>
<br>

```js
class BuildTimer {
  constructor(label) {
    this.label = label;
    this.elapsed = 0;
  }

  start() {
    setInterval(() => {
      this.elapsed += 1;
      console.log(`${this.label}: ${this.elapsed}s`);
    }, 1000);
  }
}

new BuildTimer("build").start();
```

</details>

<br>

<details>
<summary>❌ Ruim — arrow como método de objeto: o `this` léxico não é o objeto</summary>
<br>

```js
const counter = {
  count: 0,
  increment: () => {
    this.count += 1; // this é o módulo, não counter
  },
};

counter.increment();
console.log(counter.count); // 0
```

</details>

<br>

<details>
<summary>✅ Bom — method shorthand mantém `this` ligado ao objeto na chamada</summary>
<br>

```js
const counter = {
  count: 0,
  increment() {
    this.count += 1;
  },
};

counter.increment();
console.log(counter.count); // 1
```

</details>

## Código morto

<details>
<summary>❌ Ruim — condição impossível, função nunca chamada</summary>
<br>

```js
function getStatus(value) {
  if (false) {
    console.log("never runs");
  }

  return value > 0 ? "active" : "inactive";
}

// migrada para v2, mas continua aqui sem ser chamada
function legacyTransform(items) {
  return items.map((item) => item.id);
}
```

</details>

<br>

<details>
<summary>✅ Bom — remove o que não é usado</summary>
<br>

```js
function getStatus(value) {
  const status = value > 0 ? "active" : "inactive";
  return status;
}
```

</details>
