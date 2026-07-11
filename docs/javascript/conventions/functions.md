# Funções em JavaScript

A função é a menor peça de código que você reaproveita e testa sozinha. Ela vale
mais quando faz uma coisa só, tem uma assinatura clara (o nome e os parâmetros
que recebe) e cabe na tela. Quando uma mesma função busca, valida, calcula e
salva tudo junto, ela vira um nó que ninguém consegue reaproveitar nem testar em
separado, porque cada tarefa fica presa às outras.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **single responsibility** (responsabilidade única) | Função tem uma razão para mudar; um motivo para existir |
| **arrow function** (função flecha) | `() => {}`: sintaxe curta sem `this` próprio; ideal para callbacks |
| **named function** (função nomeada) | `function name() {}`: aparece com nome no stack trace; ideal para topo de módulo |
| **parameter** (parâmetro) | Nome declarado na assinatura; recebe o argumento na chamada |
| **default parameter** (parâmetro padrão) | Valor usado quando o argumento é `undefined` (`function f(x = 0)`) |
| **rest parameter** (parâmetro variádico) | `...args`: coleta argumentos restantes em array |
| **pure function** (função pura) | Mesma entrada → mesma saída; sem efeito colateral observável |
| **side effect** (efeito colateral) | Leitura ou escrita fora dos argumentos: I/O, mutação externa, log |
| **helper** (função auxiliar) | Função de apoio que implementa um passo do orquestrador; dá nome ao detalhe |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | Cada função opera em um só nível: orquestra passos ou implementa detalhe, nunca os dois |

## Função que faz tudo: várias responsabilidades

<details>
<summary>❌ Ruim: busca, valida, calcula, persiste e loga na mesma função</summary>

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

<details>
<summary>✅ Bom: a função principal no topo, responsabilidades separadas</summary>

```js
await processOrder(123);

async function processOrder(orderId) {
  const order = await getOrder(orderId);

  if (isInvalid(order)) {
    notifyRejection(order);
    return;
  }

  const invoice = await issueInvoice(order);
  return invoice;

  function isInvalid(order) {
    if (!order || order.items.length === 0) return true;
    if (order.customer.defaulted) return true;

    return false;
  }

  function notifyRejection(order) {
    console.log("pedido rejeitado", order?.customer?.name);
  }

  async function issueInvoice(order) {
    const discountedOrder = applyDiscount(order);
    const invoice = await saveOrder(discountedOrder);
    return invoice;
  }
}
```

</details>

## Funções auxiliares aninhadas: quando separar

Os exemplos deste guia declaram funções auxiliares (as que executam um passo do
trabalho) de uso único dentro da função principal, aquela que organiza os passos.
Colocar a auxiliar ali dentro mantém a história em um bloco só: o leitor vê quem
chama no topo e o detalhe logo abaixo, sem sair do contexto. Esse formato tem um
custo, e o custo define até onde ele vale:

- **Teste em separado**: a função aninhada não pode ser exportada, então só é
  testada através da função principal que a contém (estratégias em
  [testing](advanced/testing.md)).
- **Reaproveitamento**: uma segunda função que precise da auxiliar não alcança
  ela, presa dentro de outra.
- **Recriação**: cada chamada da função principal cria de novo as funções
  internas. Cada uma delas é uma **closure** (função que guarda o acesso às
  variáveis do lugar onde foi escrita). Isso não pesa na maioria dos casos, mas
  dá para medir em um trecho executado com muita frequência, o chamado **hot
  path** (medição em [performance](advanced/performance.md)).

Regra prática: a função auxiliar nasce aninhada. Ela sobe para o nível do arquivo
quando um segundo lugar passa a usá-la, quando precisa de teste próprio ou quando
a função principal cresce além de uma tela. Em linguagens com classes (Java, C#),
o mesmo padrão vira métodos privados: colocados logo abaixo do método público, na
ordem em que são chamados.

<details>
<summary>❌ Ruim: a função auxiliar, usada em dois lugares, copiada dentro de cada um</summary>

```js
function buildInvoiceEmail(invoice) {
  const totalLabel = formatCurrency(invoice.total);
  const email = `Total: ${totalLabel}`;
  return email;

  function formatCurrency(amount) {
    const formatted = amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return formatted;
  }
}

function buildReceiptPdf(receipt) {
  // formatCurrency duplicado: preso em buildInvoiceEmail, este uso não o alcança
  const totalLabel = formatCurrency(receipt.total);
  const receiptPdf = renderPdf(totalLabel);
  return receiptPdf;

  function formatCurrency(amount) {
    const formatted = amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return formatted;
  }
}
```

</details>

<details>
<summary>✅ Bom: o segundo uso leva a função auxiliar para o nível do arquivo</summary>

```js
function buildInvoiceEmail(invoice) {
  const totalLabel = formatCurrency(invoice.total);
  const email = `Total: ${totalLabel}`;
  return email;
}

function buildReceiptPdf(receipt) {
  const totalLabel = formatCurrency(receipt.total);
  const receiptPdf = renderPdf(totalLabel);
  return receiptPdf;
}

function formatCurrency(amount) {
  const formatted = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return formatted;
}
```

</details>

## Um nível de abstração por função

O princípio por trás dessa divisão é manter um único nível de abstração por
função (na sigla em inglês, SLA, de Single Level of Abstraction). Ou a função
organiza passos com nome, ou implementa um detalhe. Quando faz as duas coisas ao
mesmo tempo, a leitura pula da visão geral para o detalhe miúdo sem aviso, e quem
lê se perde.

<details>
<summary>❌ Ruim: a mesma função organiza e implementa</summary>

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

<details>
<summary>✅ Bom: a função principal chama auxiliares, cada uma faz uma coisa</summary>

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
<summary>❌ Ruim: cálculo e formatação misturados</summary>

```js
function getOrderSummary(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;

  const total = subtotal + tax;

  return `Order #${order.id}: $${subtotal.toFixed(2)} + tax $${tax.toFixed(2)} = $${total.toFixed(2)}`;
}
```

</details>

<details>
<summary>✅ Bom: cálculo separado da formatação</summary>

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

## Retorno direto

O retorno aparece no topo da função; os detalhes ficam em funções auxiliares logo
abaixo.

<details>
<summary>❌ Ruim: variável auxiliar desnecessária, `else` depois de um `throw`</summary>

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

<details>
<summary>✅ Bom: intenção clara no topo, detalhe abaixo</summary>

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

Quem chama a função diz o **quê**, não o **como**. Toda a montagem do contexto
acontece dentro da função.

<details>
<summary>❌ Ruim: quem chama monta a lógica na mão antes de chamar</summary>

```js
await submitOrder({
  ...order,
  total: order.items.reduce((sum, item) => sum + item.price, 0) * (1 - getDiscount(user)),
  timestamp: new Date().toISOString(),
});
```

</details>

<details>
<summary>✅ Bom: entrada de uma linha, detalhes dentro</summary>

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

O retorno dá nome ao resultado, não o calcula. A variável tem um nome expressivo,
alinhado com o que a função promete entregar.

A regra vale até para uma função auxiliar de duas linhas, por um motivo prático:
a variável com nome te dá onde parar o depurador (o **breakpoint**, a pausa na
execução para inspecionar o valor) já com o valor pronto, aparece limpa no diff
quando o cálculo muda e obriga quem escreve a batizar o que a função entrega. O
custo é uma linha a mais por função. O guia aceita esse custo de propósito: uma
regra mecânica se revisa melhor do que uma exceção decidida caso a caso.

<details>
<summary>❌ Ruim: lógica ou objeto sem nome direto no `return`</summary>

```js
function buildGreeting(user) {
  return `Hello, ${user.name}! You have ${user.notifications.length} notifications.`;
}

function getActiveUsers(users) {
  return users.filter((user) => user.isActive && !user.isBanned);
}
```

</details>

<details>
<summary>✅ Bom: variável com nome expressivo antes do `return`</summary>

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

<details>
<summary>❌ Ruim: retorno cru, repassa o valor sem nome e não diz o que é</summary>

```js
function findPendingOrders(userId) {
  return orderRepository.findByStatus(userId, "pending");
}

async function processCheckout(cartId) {
  return await checkoutService.process(cartId);
}
```

</details>

<details>
<summary>✅ Bom: um nome alinhado com a função deixa claro o que sai</summary>

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

<details>
<summary>❌ Ruim: texto enorme montado em uma linha, ilegível e sem sentido nas partes</summary>

```js
function buildShippingLabel(order) {
  return `${order.customer.firstName} ${order.customer.lastName}\n${order.address.street}, ${order.address.number}\n${order.address.city} - ${order.address.state}, ${order.address.zipCode}\nOrder #${order.id}`;
}
```

</details>

<details>
<summary>✅ Bom: partes com nome antes de montar o resultado</summary>

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

Linhas que se relacionam ficam juntas. Grupos diferentes se separam com uma linha
em branco, e só uma: duas linhas em branco já são espaço demais.

<details>
<summary>❌ Ruim: parede de código sem respiro entre grupos</summary>

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

<details>
<summary>✅ Bom: cada grupo é um parágrafo de intenção</summary>

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

## Baixa densidade visual: agrupamento

Uma linha em branco sobrando dentro de um grupo quebra o ritmo. Uma linha em
branco faltando entre dois grupos cola o que não tem relação. A regra: nenhuma
dentro do grupo, uma entre grupos, nunca duas ou mais.

<details>
<summary>❌ Ruim: espaço dentro dos grupos, sem separação entre grupos</summary>

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

<details>
<summary>✅ Bom: nenhuma linha dentro do grupo, uma entre grupos</summary>

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

## Textos longos

Um texto montado com **template string** (o texto entre crases que aceita valores
no meio com `${...}`) ficou gigante? Separe as partes compostas em variáveis com
nome.

<details>
<summary>❌ Ruim: todos os detalhes montados em uma linha</summary>

```js
function buildConfirmationEmail(user, order) {
  const message = `Olá ${user.firstName} ${user.lastName}, seu pedido #${order.id} foi confirmado e será entregue no endereço ${order.address.street}, ${order.address.city} - ${order.address.state} em até ${order.deliveryDays} dias úteis.`;
  return message;
}
```

</details>

<details>
<summary>✅ Bom: partes separadas, texto final legível</summary>

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

## Estilo vertical: parâmetros

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um objeto.

<details>
<summary>❌ Ruim: 4+ parâmetros inline, intenção obscura na chamada</summary>

```js
function createInvoice(orderId, customerId, amount, dueDate, currency) { /* ... */ }

createInvoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL");
```

</details>

<details>
<summary>✅ Bom: objeto quando 4+ parâmetros</summary>

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

## Arrow function: preservar o `this` em callbacks

Em JavaScript, o valor de `this` (a palavra que aponta para o objeto atual) é
decidido por **quem chama** a função, não por quem a escreveu. É daí que vêm os
bugs difíceis de achar: você escreve um método, passa uma `function () {}` como
**callback** (a função que será chamada mais tarde por outro código) e, dentro
dela, o `this` deixa de ser o objeto que você esperava.

Duas formas de declarar uma função, dois comportamentos diferentes:

- `function () {}` tem `this` próprio. Em callbacks de `setInterval`, `forEach` ou
  `addEventListener`, o `this` que você esperava se perde: vira `undefined` no
  **modo estrito** (o `'use strict'`, que deixa as regras da linguagem mais
  rígidas) ou vira o objeto global.
- `() => {}` **não tem `this` próprio**. A **arrow function** (função flecha,
  escrita com `=>`) usa o `this` do lugar onde foi escrita, não o de quem a
  chama. Por isso ela mantém a referência ao objeto atual dentro do método.

Regra prática: quando a função é um callback (passada para outro código chamar
depois) dentro de um método, use a função flecha. Para declarar o próprio método de um
objeto ou classe, use a forma curta (`obj.foo() {}`). Aí o `this` é resolvido no
momento da chamada: quando você escreve `obj.foo()`, o `this` é `obj`.

<details>
<summary>❌ Ruim: callback `function` dentro do método quebra o `this` do objeto</summary>

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

<details>
<summary>✅ Bom: a função flecha usa o `this` do método onde foi escrita</summary>

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

<details>
<summary>❌ Ruim: `setInterval` com `function` perde o acesso aos campos do objeto</summary>

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

<details>
<summary>✅ Bom: a função flecha mantém o `this`; `label` e `elapsed` continuam acessíveis</summary>

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

<details>
<summary>❌ Ruim: função flecha como método do objeto: o `this` não aponta para o objeto</summary>

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

<details>
<summary>✅ Bom: a forma curta mantém o `this` ligado ao objeto na chamada</summary>

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
<summary>❌ Ruim: condição impossível, função nunca chamada</summary>

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

<details>
<summary>✅ Bom: remove o que não é usado</summary>

```js
function getStatus(value) {
  const status = value > 0 ? "active" : "inactive";
  return status;
}
```

</details>
