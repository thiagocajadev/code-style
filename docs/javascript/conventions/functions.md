# Functions

Uma função faz uma coisa. Seu nome diz o quê. Seu tamanho cabe na tela.

## God function — múltiplas responsabilidades

<details>
<summary>❌ Bad — busca, valida, calcula, persiste e loga na mesma função</summary>
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
<summary>✅ Good — orquestrador no topo, responsabilidades separadas</summary>
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
<summary>❌ Bad — mesma função orquestra e implementa</summary>
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
<summary>✅ Good — orquestrador chama helpers, cada um faz uma coisa</summary>
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
<summary>❌ Bad — cálculo e formatação misturados</summary>
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
<summary>✅ Good — cálculo separado da formatação</summary>
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
<summary>❌ Bad — variável auxiliar desnecessária, else após throw</summary>
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
<summary>✅ Good — intenção clara no topo, detalhe abaixo</summary>
<br>

```js
async function findProductById(id) {
  const product = await runQuery(id);

  return product;

  async function runQuery(id) {
    const results = await db.query(id);

    if (results.rowCount === 0) throw new NotFoundError("Product not found.");

    const product = results.rows[0];
    return product;
  }
}
```

</details>

## Ponto de entrada limpo

O caller expressa o quê, não o como. Toda construção de contexto fica dentro da função.

<details>
<summary>❌ Bad — caller monta lógica inline antes de chamar</summary>
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
<summary>✅ Good — entrada de uma linha, detalhes dentro</summary>
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
<summary>❌ Bad — lógica ou objeto anônimo direto no return</summary>
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
<summary>✅ Good — variável expressiva antes do return</summary>
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
<summary>❌ Bad — bare return: pass-through sem nome, o retorno não diz o que é</summary>
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
<summary>✅ Good — nome simétrico com a função deixa claro o que sai</summary>
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
<summary>❌ Bad — string imensa montada inline: ilegível e sem semântica</summary>
<br>

```js
function buildShippingLabel(order) {
  return `${order.customer.firstName} ${order.customer.lastName}\n${order.address.street}, ${order.address.number}\n${order.address.city} - ${order.address.state}, ${order.address.zipCode}\nOrder #${order.id}`;
}
```

</details>

<br>

<details>
<summary>✅ Good — partes nomeadas antes de montar o resultado</summary>
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
<summary>❌ Bad — parede de código sem respiro entre grupos</summary>
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
<summary>✅ Good — parágrafos de intenção</summary>
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
<summary>❌ Bad — espaço dentro dos grupos, sem separação entre grupos</summary>
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
<summary>✅ Good — 0 linhas dentro do grupo, 1 entre grupos</summary>
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

## Strings longas

Template literal gigante? Extraia as partes compostas em variáveis nomeadas.

<details>
<summary>❌ Bad — todos os detalhes interpolados inline</summary>
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
<summary>✅ Good — compostos extraídos, string final legível</summary>
<br>

```js
function buildConfirmationEmail(user, order) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const address = `${order.address.street}, ${order.address.city} - ${order.address.state}`;
  const message = `Olá ${fullName}, seu pedido #${order.id} foi confirmado e será entregue em ${address} em até ${order.deliveryDays} dias úteis.`;

  return message;
}
```

</details>

## Estilo vertical — parâmetros

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um objeto.

<details>
<summary>❌ Bad — 4+ parâmetros inline, intenção obscura na chamada</summary>
<br>

```js
function createInvoice(orderId, customerId, amount, dueDate, currency) { /* ... */ }

createInvoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL");
```

</details>

<br>

<details>
<summary>✅ Good — objeto quando 4+ parâmetros</summary>
<br>

```js
function createInvoice(invoiceData) {
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

## Código morto

<details>
<summary>❌ Bad — condição impossível, função nunca chamada</summary>
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
<summary>✅ Good — remove o que não é usado</summary>
<br>

```js
function getStatus(value) {
  const status = value > 0 ? "active" : "inactive";

  return status;
}
```

</details>
