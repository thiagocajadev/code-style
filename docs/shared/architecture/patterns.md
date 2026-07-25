# Padrões de projeto: o catálogo GoF

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um **pattern** (padrão de projeto) é uma solução já consolidada para um problema que reaparece com frequência. Ele serve a dois propósitos: dá aos engenheiros um vocabulário comum e entrega uma heurística já testada em produção.

Este documento cobre os 23 padrões que Erich Gamma, Richard Helm, Ralph Johnson e John Vlissides publicaram em 1994, conhecidos como **GoF** (Gang of Four · os quatro autores). Eles estão organizados em três categorias, e a categoria diz que tipo de problema o padrão resolve. Os padrões de aplicação e infraestrutura que apareceram depois do catálogo vivem em [`patterns-advanced.md`](./patterns-advanced.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **GoF** (Gang of Four · Gangue dos Quatro) | Apelido dos quatro autores do catálogo de 1994, e do catálogo em si |
| **creational patterns** (padrões criacionais) | Tratam de como um objeto é criado, escondendo a decisão de qual classe instanciar |
| **structural patterns** (padrões estruturais) | Tratam de como objetos se juntam para formar estruturas maiores |
| **behavioral patterns** (padrões comportamentais) | Tratam de como objetos distribuem responsabilidade e conversam entre si |
| **caller** (quem invoca a função) | Código que chama uma função ou serviço e trata o resultado |
| **interface** (contrato de métodos) | Conjunto de métodos que uma implementação promete oferecer |
| **OCP** (Open/Closed Principle · Princípio Aberto/Fechado) | Design aberto para extensão por implementações novas, fechado para modificação do código existente |
| **handler** (processador de evento ou requisição) | Função ou objeto que recebe um evento ou requisição e decide como processar |
| **middleware** (intermediário de requisição) | Componente em um pipeline que intercepta a requisição, processa e repassa para o próximo elo |
| **ORM** (Object-Relational Mapper · Mapeador Objeto-Relacional) | Biblioteca que mapeia objetos do código para tabelas do banco de dados |

## Como escolher a categoria

| A dificuldade é... | Categoria | Exemplo de sintoma |
|---|---|---|
| Decidir qual objeto criar, ou criar objetos que combinam entre si | [Criacionais](#creational-patterns) | `new` espalhado com `if` sobre tipo antes de cada um |
| Encaixar objetos que não foram desenhados para conversar | [Estruturais](#structural-patterns) | Código de domínio moldado ao formato de uma biblioteca externa |
| Distribuir uma decisão que hoje mora num `if` gigante | [Comportamentais](#behavioral-patterns) | Um `switch` sobre tipo ou estado repetido em vários métodos |

## Referência rápida

<a id="creational-quick-reference"></a>

**Criacionais**

| Pattern | Problema que resolve | Sinal de uso |
|---|---|---|
| [**Factory Method**](#factory-method) | O criador precisa decidir a classe concreta | `if` sobre tipo antes de cada `new` |
| [**Abstract Factory**](#abstract-factory) | Peças de uma família precisam combinar entre si | Tema, provedor ou conjunto que aceita mistura indevida |
| [**Builder**](#builder) | Construtor com muitos parâmetros opcionais | `new Obj(null, null, true, false, ...)` |
| [**Prototype**](#prototype) | Montar o objeto do zero repete trabalho pesado | Clone com ajustes resolve melhor que instanciar |
| [**Singleton**](#singleton) | Instância duplicada para estado que deveria ser único | Pool de conexões, configuração, logger |

<a id="structural-quick-reference"></a>

**Estruturais**

| Pattern | Problema que resolve | Sinal de uso |
|---|---|---|
| [**Adapter**](#adapter) | Interfaces incompatíveis entre domínio e externo | Integração com API ou biblioteca de terceiro |
| [**Bridge**](#bridge) | Abstração e implementação crescem juntas em subclasses | As duas precisam variar sem depender uma da outra |
| [**Composite**](#composite) | Item individual e composição tratados de forma diferente | Estrutura em árvore: kits, categorias, menus, UI aninhada |
| [**Decorator**](#decorator) | Comportamento transversal sem modificar a base | Logging, cache e retry aplicados em camadas |
| [**Facade**](#facade) | Subsistema com muitos pontos de entrada | Orquestração de vários serviços numa operação |
| [**Flyweight**](#flyweight) | Muitas instâncias repetem o mesmo estado em memória | Volume alto de objetos que compartilham dados fixos |
| [**Proxy**](#proxy) | O acesso ao objeto precisa ser interceptado | Cache, controle de acesso, inicialização tardia |

<a id="behavioral-quick-reference"></a>

**Comportamentais**

| Pattern | Problema que resolve | Sinal de uso |
|---|---|---|
| [**Chain of Responsibility**](#chain-of-responsibility) | Vários processadores em sequência | Pipeline de middleware, validação em etapas |
| [**Command**](#command) | A operação precisa ser enfileirada ou auditada | Fila de tarefas, desfazer e refazer |
| [**Iterator**](#iterator) | O percurso da coleção expõe a estrutura interna | Coleção própria consumida com `for...of` |
| [**Mediator**](#mediator) | Objetos se referenciam e formam acoplamento cruzado | Formulário com campos que dependem uns dos outros |
| [**Memento**](#memento) | Restaurar estado anterior sem abrir o encapsulamento | Desfazer, rascunho salvo, snapshot de sessão |
| [**Observer**](#observer) | Produtor acoplado aos consumidores | Reações em cascata a um evento |
| [**State**](#state) | Comportamento muda conforme o estado interno | Entidade com ciclo de vida: pedido, contrato |
| [**Strategy**](#strategy) | `if` ou `switch` crescendo por tipo | Comportamento que varia por contexto |
| [**Template Method**](#template-method) | Algoritmo fixo com etapas variáveis por tipo | Relatórios e importações com formatos diferentes |
| [**Visitor**](#visitor) | Operação nova obriga a editar toda a hierarquia | Árvore de tipos com exportadores multi-formato |

Result, Repository, CQRS, Unit of Work, Specification, Circuit Breaker, Null Object, injeção de dependência, AI-Driven e SDD ficam em [`patterns-advanced.md`](./patterns-advanced.md).

---

<a id="creational-patterns"></a>

## Criacionais

Os padrões criacionais tiram do chamador a decisão de qual classe instanciar. O ganho aparece quando essa decisão muda com frequência ou quando ela se repete em vários pontos do código.

<a id="factory-method"></a>

### Factory Method

Uma classe precisa criar um colaborador, e o tipo concreto depende do contexto. O Factory Method deixa o passo de criação como um método que cada subclasse preenche, e o algoritmo em volta fica escrito uma vez só.

<details>
<summary>❌ Ruim: o exportador decide o formato dentro do método que exporta</summary>

```js
class DocumentExporter {
  export(order, format) {
    if (format === "pdf") {
      const pdfWriter = new PdfWriter({ margin: 20, font: "Helvetica" });
      return pdfWriter.write(order);
    }

    if (format === "csv") {
      const csvWriter = new CsvWriter({ separator: ";" });
      return csvWriter.write(order);
    }

    throw new Error(`unknown format: ${format}`);
  }
}
```

A configuração de cada escritor está no meio da regra de exportação. Um formato novo abre este método, e o `format` viaja como texto por toda a aplicação até chegar aqui.

</details>

<details>
<summary>✅ Bom: o passo de criação vira um método que cada subclasse preenche</summary>

```js
class DocumentExporter {
  export(order) {
    const writer = this.createWriter();
    const document = writer.write(order);
    return document;
  }
}

class PdfDocumentExporter extends DocumentExporter {
  createWriter() {
    const writer = new PdfWriter({ margin: 20, font: "Helvetica" });
    return writer;
  }
}

class CsvDocumentExporter extends DocumentExporter {
  createWriter() {
    const writer = new CsvWriter({ separator: ";" });
    return writer;
  }
}
```

`export` descreve a exportação uma vez. Um formato novo entra como uma subclasse, e quem escolhe o exportador passa a trabalhar com um objeto em vez de um texto.

</details>

**Quando usar**: a criação de um colaborador varia por contexto e o algoritmo em volta dela é o mesmo. Quando a criação envolve validação e valores padrão sem variar por tipo, uma função de fábrica simples resolve melhor.

<a id="abstract-factory"></a>

### Abstract Factory

Um conjunto de objetos precisa combinar entre si. O Abstract Factory agrupa a criação da família inteira atrás de uma interface, e quem monta escolhe a família de uma vez.

<details>
<summary>❌ Ruim: cada peça da tela escolhe o próprio tema</summary>

```js
function buildCheckoutScreen(themeName) {
  const button = themeName === "dark" ? new DarkButton() : new LightButton();
  const input = new LightInput();
  const card = themeName === "dark" ? new DarkCard() : new LightCard();

  const screen = new CheckoutScreen(button, input, card);
  return screen;
}
```

Nada impede o campo de texto claro dentro do tema escuro, e foi o que aconteceu com `input`. A consistência da família depende de quem monta lembrar de cada peça, e a condição sobre o tema se repete a cada componente novo.

</details>

<details>
<summary>✅ Bom: a família inteira vem de uma fábrica só</summary>

```js
class DarkThemeFactory {
  createButton() {
    const button = new DarkButton();
    return button;
  }

  createInput() {
    const input = new DarkInput();
    return input;
  }

  createCard() {
    const card = new DarkCard();
    return card;
  }
}

function buildCheckoutScreen(themeFactory) {
  const button = themeFactory.createButton();
  const input = themeFactory.createInput();
  const card = themeFactory.createCard();

  const screen = new CheckoutScreen(button, input, card);
  return screen;
}
```

A tela recebe a fábrica e monta as peças sem saber qual tema chegou. Uma peça fora do conjunto deixa de ser possível, porque todas vêm da mesma origem.

</details>

**Quando usar**: famílias de objetos que precisam combinar entre si, como temas de interface, conjuntos de provedores por região ou drivers de um mesmo ecossistema.

<a id="builder"></a>

### Builder

Objetos com muitos parâmetros opcionais criam construtores ilegíveis e chamadas confusas. Builder constrói o objeto passo a passo, nomeando cada etapa.

<details>
<summary>❌ Ruim: um construtor com oito posições e valores vazios no meio</summary>

```js
const pendingOrdersQuery = new Query(
  "orders",
  null,
  "status = 'pending'",
  null,
  "created_at",
  "desc",
  20,
  0
);
```

Quem lê a chamada não sabe o que cada posição significa sem abrir a assinatura. Os dois `null` marcam campos que este caso não usa, e trocar a ordem de dois argumentos do mesmo tipo produz uma consulta errada sem nenhum erro.

</details>

<details>
<summary>✅ Bom: cada etapa carrega o próprio nome</summary>

```js
const pendingOrdersQuery = new QueryBuilder()
  .from("orders")
  .where("status", "pending")
  .orderBy("created_at", "desc")
  .limit(20)
  .build();
```

Cada método devolve o próprio builder, e por isso as chamadas se encadeiam. O `build()` valida o conjunto e devolve o objeto montado. A intenção de cada valor aparece no nome do método que o recebeu.

</details>

**Quando usar**: criação de objetos com muitos campos opcionais, ou quando a ordem de configuração importa e precisa ser legível.

<a id="prototype"></a>

### Prototype

Criar o objeto do zero repete trabalho que já foi feito uma vez. O Prototype parte de uma instância pronta e devolve uma cópia ajustada.

<details>
<summary>❌ Ruim: cada proposta remonta o documento inteiro</summary>

```js
function createProposalForCustomer(customer) {
  const proposal = new Proposal();
  proposal.loadTemplate("standard-contract");
  proposal.applyBranding(companyBranding);
  proposal.attachTermsAndConditions();
  proposal.customerName = customer.name;

  return proposal;
}
```

`loadTemplate`, `applyBranding` e `attachTermsAndConditions` leem disco e produzem o mesmo resultado a cada chamada. Numa exportação de mil propostas, esse trabalho acontece mil vezes.

</details>

<details>
<summary>✅ Bom: o modelo é montado uma vez e copiado</summary>

```js
const proposalTemplate = buildStandardProposalTemplate();

function createProposalForCustomer(customer) {
  const proposal = proposalTemplate.clone();
  proposal.customerName = customer.name;

  return proposal;
}
```

O trabalho pesado acontece uma vez, na montagem do modelo. Cada proposta copia o resultado e ajusta o que muda.

</details>

**Quando usar**: montar a instância envolve I/O, cálculo pesado ou uma sequência longa de configuração que se repete. A cópia precisa ser profunda o bastante para que dois clones não compartilhem estado que um deles vai alterar.

<a id="singleton"></a>

### Singleton

Uma única instância de uma classe durante todo o ciclo de vida da aplicação. Qualquer parte do código que solicita a dependência recebe a mesma instância.

<details>
<summary>❌ Ruim: cada módulo abre o próprio pool de conexões</summary>

```js
export async function findOrderById(orderId) {
  const connectionPool = createConnectionPool(process.env.DATABASE_URL);
  const order = await connectionPool.orders.findById(orderId);

  return order;
}
```

Cada chamada abre um pool novo e nenhum deles é fechado. O limite de conexões do banco chega antes do limite de memória da aplicação, e o erro aparece longe daqui.

</details>

<details>
<summary>✅ Bom: o pool é criado uma vez e compartilhado</summary>

```js
let sharedConnectionPool = null;

export function getConnectionPool() {
  if (!sharedConnectionPool) {
    sharedConnectionPool = createConnectionPool(process.env.DATABASE_URL);
  }

  return sharedConnectionPool;
}
```

O pool nasce na primeira chamada e todos os módulos recebem a mesma instância. Em aplicação com injeção de dependência, o mesmo resultado sai de registrar o pool com tempo de vida de aplicação, sem o estado global.

</details>

**Quando usar**: estado global por natureza e sem variação por contexto: pool de conexões, configuração da aplicação, logger compartilhado. Dentro da lógica de domínio, o Singleton esconde dependências e dificulta o teste, e a [injeção de dependência](patterns-advanced.md#dependency-injection) resolve melhor.

---

<a id="structural-patterns"></a>

## Estruturais

Os padrões estruturais tratam de como objetos se encaixam. Eles aparecem quando duas partes precisam colaborar e não foram desenhadas uma para a outra, ou quando uma estrutura precisa crescer sem que quem a consome perceba.

<a id="adapter"></a>

### Adapter

Dois componentes com interfaces incompatíveis precisam colaborar. O Adapter envolve um dos dois e traduz a interface para o formato que o outro espera, sem modificar nenhum dos dois.

<details>
<summary>❌ Ruim: o domínio fala no formato do provedor de e-mail</summary>

```js
async function confirmOrder(order) {
  await sendgrid.send({
    to: order.customerEmail,
    from: "no-reply@shop.com",
    subject: "Pedido confirmado",
    dynamicTemplateData: { orderId: order.id, total: order.total },
    templateId: "d-8a3f21",
  });
}
```

`confirmOrder` conhece `dynamicTemplateData` e um identificador de template do SendGrid. Trocar de provedor obriga a abrir toda função de domínio que envia mensagem.

</details>

<details>
<summary>✅ Bom: o domínio fala a própria língua, e o adaptador traduz</summary>

```js
async function confirmOrder(order, notifier) {
  const confirmation = OrderConfirmation.from(order);

  await notifier.send(confirmation);
}

class SendGridNotifier {
  async send(confirmation) {
    await sendgrid.send({
      to: confirmation.recipientEmail,
      from: "no-reply@shop.com",
      subject: confirmation.subject,
      dynamicTemplateData: confirmation.fields,
      templateId: SENDGRID_ORDER_TEMPLATE,
    });
  }
}
```

O vocabulário do provedor fica confinado numa classe. Trocar o SendGrid por outro serviço é escrever um segundo adaptador, sem tocar o domínio.

</details>

**Quando usar**: integrar bibliotecas externas, APIs de terceiros ou código legado com interface diferente da esperada pelo domínio.

<a id="bridge"></a>

### Bridge

Duas dimensões variam sem depender uma da outra, e a herança tenta representar as duas na mesma árvore. O Bridge separa as dimensões em duas hierarquias e liga uma à outra por composição.

<details>
<summary>❌ Ruim: uma classe por combinação de tipo de aviso e canal de envio</summary>

```js
class EmailAlert {}

class SmsAlert {}

class UrgentEmailAlert extends EmailAlert {}

class UrgentSmsAlert extends SmsAlert {}

class ScheduledEmailAlert extends EmailAlert {}
```

Tipo de aviso e canal de envio variam sem relação um com o outro. Um canal novo obriga a duplicar todos os tipos de aviso, e um tipo novo obriga a duplicar todos os canais.

</details>

<details>
<summary>✅ Bom: o aviso recebe o canal e as duas dimensões variam sozinhas</summary>

```js
class Alert {
  constructor(channel) {
    this.channel = channel;
  }

  async notify(message) {
    await this.channel.deliver(message);
  }
}

class UrgentAlert extends Alert {
  async notify(message) {
    const urgentMessage = message.withPriority("high");

    await this.channel.deliver(urgentMessage);
  }
}

const urgentSmsAlert = new UrgentAlert(new SmsChannel());
```

Um canal novo entra como uma classe de canal. Um tipo de aviso novo entra como uma subclasse de `Alert`. As duas dimensões deixam de se multiplicar.

</details>

**Quando usar**: duas dimensões independentes que hoje se combinam na mesma árvore de herança. A diferença para o [Strategy](#strategy) está na intenção: o Strategy troca um algoritmo em tempo de execução, e o Bridge organiza a estrutura de tipos.

<a id="composite"></a>

### Composite

Uma estrutura em árvore mistura itens simples e agrupamentos. O Composite dá a mesma interface aos dois, e quem consome deixa de distinguir um do outro.

<details>
<summary>❌ Ruim: o cálculo distingue item avulso de kit em cada nível</summary>

```js
function calculateOrderTotal(entries) {
  let total = 0;

  for (const entry of entries) {
    if (entry.type === "bundle") {
      total = total + calculateOrderTotal(entry.items);
    } else {
      total = total + entry.price * entry.quantity;
    }
  }

  return total;
}
```

Toda função que percorre o pedido repete essa condição. Um kit dentro de outro kit funciona por acaso, e um tipo novo de entrada obriga a revisar cada percurso da aplicação.

</details>

<details>
<summary>✅ Bom: item e kit respondem ao mesmo método</summary>

```js
class OrderItem {
  calculateTotal() {
    const total = this.price * this.quantity;
    return total;
  }
}

class OrderBundle {
  calculateTotal() {
    const totals = this.items.map((item) => item.calculateTotal());
    const total = totals.reduce(sumAmounts, 0);
    return total;
  }
}

function calculateOrderTotal(entries) {
  const totals = entries.map((entry) => entry.calculateTotal());
  const total = totals.reduce(sumAmounts, 0);
  return total;
}
```

O percurso deixa de perguntar o tipo. Um kit dentro de outro kit funciona porque `OrderBundle` chama o mesmo método nos filhos.

</details>

**Quando usar**: estruturas em árvore onde a folha e o galho precisam responder às mesmas perguntas: kits de produto, categorias, menus, componentes de interface aninhados.

<a id="decorator"></a>

### Decorator

Adicionar comportamento a um objeto sem alterar sua implementação. O decorator envolve o objeto original e adiciona lógica antes ou depois da chamada.

<details>
<summary>❌ Ruim: cache e log dentro do repositório</summary>

```js
class OrderRepository {
  async findById(orderId) {
    logger.info("finding order", { orderId });
    const cached = this.cache.get(orderId);

    if (cached) {
      return cached;
    }

    const order = await this.database.orders.findById(orderId);
    this.cache.set(orderId, order);

    return order;
  }
}
```

Três assuntos ocupam um método: registro, cache e acesso ao banco. Testar a consulta ao banco passa a exigir um cache falso, e desligar o cache num ambiente obriga a mexer na classe que fala com o banco.

</details>

<details>
<summary>✅ Bom: cada camada envolve a anterior</summary>

```js
class SqlOrderRepository {
  async findById(orderId) {
    const order = await this.database.orders.findById(orderId);
    return order;
  }
}

class CachingOrderRepository {
  constructor(inner, cache) {
    this.inner = inner;
    this.cache = cache;
  }

  async findById(orderId) {
    const cached = this.cache.get(orderId);

    if (cached) {
      return cached;
    }

    const order = await this.inner.findById(orderId);
    this.cache.set(orderId, order);

    return order;
  }
}

const orderRepository = new LoggingOrderRepository(
  new CachingOrderRepository(new SqlOrderRepository(), cache)
);
```

Cada camada tem uma responsabilidade isolada, e a composição acontece num lugar só, na configuração. A implementação original nunca fica sabendo que está sendo decorada.

</details>

**Quando usar**: comportamento transversal (registro, cache, autenticação, nova tentativa) que precisa ser aplicado de forma composta, sem modificar a implementação base.

<a id="facade"></a>

### Facade

Um subsistema com muitos componentes expõe complexidade desnecessária para quem só precisa de uma operação de alto nível. Facade cria uma interface simplificada que coordena o subsistema internamente.

<details>
<summary>❌ Ruim: o controlador orquestra quatro serviços</summary>

```js
async function placeOrderEndpoint(request, response) {
  const charge = await paymentService.charge(request.body.payment);
  const reservation = await inventoryService.reserve(request.body.items);
  const order = await orderService.create(request.body, charge, reservation);

  await emailService.confirmOrder(order);
  response.json(order);
}
```

A sequência de uma operação de negócio mora na camada HTTP. Um segundo ponto de entrada, como um job ou um comando de terminal, precisa repetir os quatro passos na ordem certa.

</details>

<details>
<summary>✅ Bom: uma entrada coordena o subsistema</summary>

```js
class OrderCheckout {
  async place(orderInput) {
    const charge = await this.paymentService.charge(orderInput.payment);
    const reservation = await this.inventoryService.reserve(orderInput.items);

    const order = await this.orderService.create(orderInput, charge, reservation);
    await this.emailService.confirmOrder(order);

    return order;
  }
}
```

Quem chama usa uma única entrada. O subsistema pode crescer internamente sem que a interface pública mude, e o job e o endpoint chamam o mesmo método.

</details>

**Quando usar**: orquestrar vários serviços em uma operação de negócio, ou simplificar o acesso a uma biblioteca com muitos pontos de entrada.

<a id="flyweight"></a>

### Flyweight

Muitas instâncias carregam o mesmo dado fixo. O Flyweight separa o que é comum do que varia, e a parte comum passa a ser compartilhada por todas.

<details>
<summary>❌ Ruim: cada linha do pedido carrega uma cópia do produto</summary>

```js
const orderLines = csvRows.map((row) => ({
  product: {
    sku: row.sku,
    name: row.productName,
    description: row.productDescription,
    taxRules: parseTaxRules(row.taxRules),
  },
  quantity: Number(row.quantity),
}));
```

Numa importação com cem mil linhas e trezentos produtos distintos, a descrição e as regras de imposto de cada produto são reconstruídas centenas de vezes.

</details>

<details>
<summary>✅ Bom: o produto é resolvido uma vez e referenciado</summary>

```js
const productCatalog = buildProductCatalogBySku(csvRows);

const orderLines = csvRows.map((row) => ({
  product: productCatalog.get(row.sku),
  quantity: Number(row.quantity),
}));
```

Existem trezentos objetos de produto na memória, e as cem mil linhas apontam para eles. O dado compartilhado não pode ser alterado por nenhuma linha, porque todas enxergam a mesma instância.

</details>

**Quando usar**: volume alto de objetos que repetem o mesmo estado imutável. Fora desse cenário, o mapa intermediário acrescenta indireção sem devolver memória.

<a id="proxy"></a>

### Proxy

Um substituto que intercepta o acesso a outro objeto. O Proxy implementa a mesma interface que o objeto real e decide o que acontece antes, depois ou no lugar da chamada.

<details>
<summary>❌ Ruim: o relatório carrega o anexo pesado que talvez ninguém abra</summary>

```js
async function listReports() {
  const reports = await reportRepository.findAll();

  for (const report of reports) {
    report.attachment = await storage.download(report.attachmentKey);
  }

  return reports;
}
```

A listagem baixa o anexo de cada relatório para exibir uma tabela de nomes e datas. A tela demora em proporção ao tamanho dos arquivos, e a maioria deles nunca é aberta.

</details>

<details>
<summary>✅ Bom: o anexo é buscado quando alguém pede</summary>

```js
class LazyAttachment {
  constructor(attachmentKey, storage) {
    this.attachmentKey = attachmentKey;
    this.storage = storage;
    this.content = null;
  }

  async read() {
    if (!this.content) {
      this.content = await this.storage.download(this.attachmentKey);
    }

    return this.content;
  }
}
```

Quem consome chama `read()` sem saber se o arquivo já estava em memória. A listagem passa a custar uma consulta, e o download acontece no relatório que o usuário abriu.

</details>

**Quando usar**: cache transparente, controle de acesso por permissão, registro de chamadas ou inicialização tardia de recursos pesados. A diferença para o [Decorator](#decorator) está na intenção: o Decorator acrescenta comportamento, e o Proxy controla o acesso.

---

<a id="behavioral-patterns"></a>

## Comportamentais

Os padrões comportamentais tratam de quem decide o quê. Quase todos substituem uma condicional que cresce por um conjunto de objetos que respondem à mesma pergunta.

<a id="chain-of-responsibility"></a>

### Chain of Responsibility

Uma requisição passa por uma sequência de processadores. Cada um decide se resolve a requisição ou a repassa. Quem chama não sabe qual deles vai processar.

<details>
<summary>❌ Ruim: uma função que valida tudo em degraus aninhados</summary>

```js
async function processRequest(request) {
  if (isValidToken(request.token)) {
    if (isWithinRateLimit(request.clientId)) {
      if (isValidPayload(request.body)) {
        const result = await placeOrder(request.body);
        return result;
      }

      return { error: "invalid payload" };
    }

    return { error: "rate limit exceeded" };
  }

  return { error: "invalid token" };
}
```

Quatro assuntos aninhados numa função. Um passo novo entra como mais um nível de indentação, e reordenar as verificações exige reescrever a estrutura inteira.

</details>

<details>
<summary>✅ Bom: cada passo é um elo, e a ordem fica na montagem</summary>

```js
const requestPipeline = [
  authenticateToken,
  enforceRateLimit,
  validatePayload,
  placeOrder,
];

async function processRequest(request) {
  for (const step of requestPipeline) {
    const result = await step(request);

    if (result.isRejected) {
      return result;
    }
  }

  return request.result;
}
```

Um passo novo entra como uma função na lista. A ordem fica explícita na montagem, e cada elo é testado sozinho.

</details>

**Quando usar**: pipelines de middleware, validação em várias etapas, processamento de eventos onde os passos precisam ser montados de forma composta.

<a id="command"></a>

### Command

Encapsula uma operação como um objeto. O Command carrega os parâmetros, o executor e o contexto necessários para executar a operação em qualquer momento.

<details>
<summary>❌ Ruim: a operação acontece na hora e não deixa rastro</summary>

```js
async function cancelOrderEndpoint(request, response) {
  await orderService.cancel(request.params.orderId, request.body.reason);

  response.status(204).send();
}
```

A intenção de cancelar existe durante a chamada e desaparece. Não há como enfileirar, repetir depois de uma falha, agendar nem auditar quem pediu o quê.

</details>

<details>
<summary>✅ Bom: a intenção vira um objeto que pode ser guardado</summary>

```js
class CancelOrderCommand {
  constructor(orderId, reason, requestedBy) {
    this.orderId = orderId;
    this.reason = reason;
    this.requestedBy = requestedBy;
  }

  async execute(orderService) {
    await orderService.cancel(this.orderId, this.reason);
  }
}

async function cancelOrderEndpoint(request, response) {
  const command = new CancelOrderCommand(
    request.params.orderId,
    request.body.reason,
    request.user.id
  );

  await commandQueue.enqueue(command);
  response.status(202).send();
}
```

O pedido de cancelamento passa a ser um dado. Ele entra numa fila, sobrevive a uma reinicialização, é repetido depois de uma falha e fica registrado com quem o pediu.

</details>

**Quando usar**: operações que precisam ser enfileiradas, agendadas, revertidas ou auditadas.

<a id="iterator"></a>

### Iterator

Quem consome uma coleção precisa percorrê-la sem conhecer a estrutura por dentro. O Iterator entrega o percurso como um protocolo, e a estrutura interna fica livre para mudar.

<details>
<summary>❌ Ruim: a coleção expõe o array interno para quem percorre</summary>

```js
class OrderHistory {
  constructor() {
    this.entries = [];
  }
}

for (const entry of orderHistory.entries) {
  render(entry);
}
```

Toda tela que percorre o histórico depende de o campo se chamar `entries` e de ele ser um array. Trocar por um mapa indexado por data quebra cada um desses percursos.

</details>

<details>
<summary>✅ Bom: a coleção diz como percorrer a si mesma</summary>

```js
class OrderHistory {
  constructor() {
    this.entriesByDate = new Map();
  }

  *[Symbol.iterator]() {
    for (const entriesOfDay of this.entriesByDate.values()) {
      yield* entriesOfDay;
    }
  }
}

for (const entry of orderHistory) {
  render(entry);
}
```

Quem percorre usa `for...of` sem saber o que existe por dentro. A estrutura interna virou um mapa e nenhum consumidor precisou mudar.

</details>

**Quando usar**: coleções próprias com estrutura interna que pode mudar. Nas linguagens modernas o padrão já vem embutido, e a implementação direta é rara fora de bibliotecas.

<a id="mediator"></a>

### Mediator

Vários objetos se referenciam para se coordenar, e o número de ligações cresce mais rápido que o número de objetos. O Mediator centraliza a coordenação, e cada objeto passa a conhecer apenas o coordenador.

<details>
<summary>❌ Ruim: cada campo do formulário conhece os outros</summary>

```js
class CountryField {
  onChange(country) {
    stateField.reload(country);
    cityField.clear();
    shippingEstimate.recalculate(country);
  }
}

class StateField {
  onChange(state) {
    cityField.reload(state);
    shippingEstimate.recalculate(state);
  }
}
```

Cada campo conhece os outros pelo nome. Um campo novo obriga a editar os existentes, e nenhum deles pode ser testado ou reaproveitado fora deste formulário.

</details>

<details>
<summary>✅ Bom: os campos avisam o formulário, e ele coordena</summary>

```js
class AddressForm {
  onFieldChanged(fieldName, value) {
    if (fieldName === "country") {
      this.stateField.reload(value);
      this.cityField.clear();
    }

    if (fieldName === "state") {
      this.cityField.reload(value);
    }

    this.shippingEstimate.recalculate(this.currentAddress);
  }
}

class CountryField {
  onChange(country) {
    this.form.onFieldChanged("country", country);
  }
}
```

As regras de dependência entre campos ficam num lugar só, e dá para lê-las de uma vez. Cada campo passa a funcionar sozinho, em qualquer formulário.

</details>

**Quando usar**: um grupo de objetos que se coordenam e cujas ligações diretas já dificultam a leitura. O risco é o coordenador virar o depósito de toda regra do grupo, e nesse ponto ele precisa ser dividido.

<a id="memento"></a>

### Memento

Restaurar um estado anterior sem que quem guarda o histórico precise conhecer a estrutura interna do objeto.

<details>
<summary>❌ Ruim: o histórico monta a cópia mexendo nos campos do editor</summary>

```js
function saveSnapshot(editor) {
  history.push({
    content: editor.content,
    cursorPosition: editor.cursorPosition,
    selectionRange: editor.selectionRange,
  });
}
```

O histórico conhece os três campos do editor. Um campo novo no editor produz um histórico que restaura pela metade, sem nenhum erro no caminho.

</details>

<details>
<summary>✅ Bom: o editor produz e consome o próprio registro</summary>

```js
class Editor {
  createSnapshot() {
    const snapshot = new EditorSnapshot(
      this.content,
      this.cursorPosition,
      this.selectionRange
    );

    return snapshot;
  }

  restore(snapshot) {
    this.content = snapshot.content;
    this.cursorPosition = snapshot.cursorPosition;
    this.selectionRange = snapshot.selectionRange;
  }
}
```

O histórico guarda uma pilha de registros opacos e chama `restore`. Um campo novo no editor entra em `createSnapshot`, e o histórico continua correto sem mudar.

</details>

**Quando usar**: desfazer e refazer, rascunhos salvos, pontos de restauração em fluxos longos.

<a id="observer"></a>

### Observer

Um evento ocorre e várias partes do sistema precisam reagir. Conectar produtor e consumidores diretamente cria acoplamento: cada consumidor novo exige modificar o produtor.

<details>
<summary>❌ Ruim: quem cria o pedido chama os três interessados</summary>

```js
async function placeOrder(orderInput) {
  const order = await orderRepository.save(Order.place(orderInput));

  await emailService.sendConfirmation(order);
  await inventoryService.reserve(order);
  await analyticsService.track(order);

  return order;
}
```

Um interessado novo abre a função que cria pedidos. Uma falha no envio de e-mail interrompe a reserva de estoque, e as três reações passam a fazer parte do tempo de resposta da requisição.

</details>

<details>
<summary>✅ Bom: o produtor publica o evento e não conhece os ouvintes</summary>

```js
async function placeOrder(orderInput) {
  const order = await orderRepository.save(Order.place(orderInput));

  await eventBus.publish(new OrderPlaced(order));
  return order;
}

eventBus.subscribe(OrderPlaced, sendOrderConfirmation);
eventBus.subscribe(OrderPlaced, reserveInventory);
eventBus.subscribe(OrderPlaced, trackOrderMetrics);
```

Um consumidor novo entra como uma linha de assinatura. Remover um também. O produtor e os consumidores evoluem sem se consultar.

</details>

**Quando usar**: reações a eventos onde produtor e consumidores precisam evoluir de forma independente. Quando a ordem de execução dos handlers importa, o Observer não a garante, e a [Chain of Responsibility](#chain-of-responsibility) é a escolha certa. Para eventos que atravessam o limite do sistema, ver [`domain-events.md`](./domain-events.md).

<a id="state"></a>

### State

O comportamento de um objeto muda conforme seu estado interno. Sem o padrão, cada método acumula um `if` ou `switch` verificando o estado atual.

<details>
<summary>❌ Ruim: cada método repete a verificação de status</summary>

```js
class Order {
  ship() {
    if (this.status !== "settled") {
      throw new Error(`cannot ship an order with status ${this.status}`);
    }

    this.status = "shipped";
  }

  refund() {
    if (this.status !== "settled" && this.status !== "shipped") {
      throw new Error(`cannot refund an order with status ${this.status}`);
    }

    this.status = "refunded";
  }
}
```

As regras de transição estão espalhadas por todos os métodos. Para descobrir o que um pedido pago aceita, alguém precisa ler a classe inteira, e um status novo obriga a revisar cada condição.

</details>

<details>
<summary>✅ Bom: cada estado declara o que aceita</summary>

```js
class SettledOrderState {
  ship(order) {
    order.transitionTo(new ShippedOrderState());
  }

  refund(order) {
    order.transitionTo(new RefundedOrderState());
  }
}

class PendingOrderState {
  ship() {
    throw new Error("a pending order cannot be shipped");
  }
}

class Order {
  ship() {
    this.state.ship(this);
  }
}
```

Cada estado fica legível num lugar só. Um estado novo entra como uma classe, sem tocar os existentes.

</details>

**Quando usar**: entidades com ciclo de vida explícito, como pedidos, contratos e fluxos de aprovação, onde cada estado permite ações distintas.

<a id="strategy"></a>

### Strategy

Comportamento que varia por contexto (calculadora de frete, formatador de relatório, provedor de pagamento) tende a virar um `if` ou `switch` que cresce sem parar. Strategy extrai cada variação para a própria implementação, atrás de uma interface comum.

<details>
<summary>❌ Ruim: um ramo por provedor de pagamento</summary>

```js
async function chargePayment(payment) {
  if (payment.provider === "stripe") {
    const charge = await stripe.charges.create(toStripeCharge(payment));
    return charge;
  }

  if (payment.provider === "pagarme") {
    const charge = await pagarme.transactions.create(toPagarmeCharge(payment));
    return charge;
  }

  throw new Error(`unknown provider: ${payment.provider}`);
}
```

Um provedor novo abre esta função, e o teste de qualquer provedor carrega os `import` de todos. As duas integrações compartilham um arquivo sem compartilhar nada além disso.

</details>

<details>
<summary>✅ Bom: cada provedor implementa a mesma interface</summary>

```js
class StripeChargeStrategy {
  async charge(payment) {
    const charge = await stripe.charges.create(toStripeCharge(payment));
    return charge;
  }
}

class PagarmeChargeStrategy {
  async charge(payment) {
    const charge = await pagarme.transactions.create(toPagarmeCharge(payment));
    return charge;
  }
}

async function chargePayment(payment, chargeStrategy) {
  const charge = await chargeStrategy.charge(payment);
  return charge;
}
```

Quem chama recebe a estratégia como dependência. Uma variação nova é uma implementação nova, sem tocar o código existente. Isso é o **OCP** (Open/Closed Principle · Princípio Aberto/Fechado), descrito em [`solid.md`](./solid.md#open-closed).

</details>

**Quando usar**: comportamento que varia por tipo, contexto ou configuração e que tem chance real de crescer. Em linguagem com funções de primeira classe, um mapa de funções entrega o mesmo resultado sem as classes.

<a id="template-method"></a>

### Template Method

Um algoritmo tem etapas fixas e etapas que variam por implementação. Template Method define o esqueleto na classe base e deixa cada subclasse preencher as etapas variáveis.

<details>
<summary>❌ Ruim: dois importadores repetindo a mesma sequência</summary>

```js
class CsvOrderImporter {
  async import(file) {
    const rows = parseCsv(file);
    const orders = rows.map(toOrderFromCsv);

    await orderRepository.saveAll(orders);
    await auditLog.record("import", orders.length);
  }
}

class XmlOrderImporter {
  async import(file) {
    const nodes = parseXml(file);
    const orders = nodes.map(toOrderFromXml);

    await orderRepository.saveAll(orders);
    await auditLog.record("import", orders.length);
  }
}
```

A sequência de importação está escrita duas vezes. Um passo novo, como validar antes de gravar, precisa entrar nos dois lugares, e esquecer um deles produz uma importação sem validação.

</details>

<details>
<summary>✅ Bom: a base controla a sequência, e a subclasse preenche as etapas</summary>

```js
class OrderImporter {
  async import(file) {
    const orders = this.parseOrders(file);

    await orderRepository.saveAll(orders);
    await auditLog.record("import", orders.length);
  }
}

class CsvOrderImporter extends OrderImporter {
  parseOrders(file) {
    const rows = parseCsv(file);
    const orders = rows.map(toOrderFromCsv);
    return orders;
  }
}
```

A sequência existe uma vez. Um passo novo entra na base e vale para todos os formatos, e um formato novo preenche apenas a etapa que varia.

</details>

**Quando usar**: algoritmos com estrutura fixa e etapas variáveis por tipo: geração de relatórios, processamento de arquivos, importações com formatos diferentes.

<a id="visitor"></a>

### Visitor

Uma operação nova sobre uma hierarquia de tipos obriga a editar cada classe da hierarquia. O Visitor coloca a operação num objeto separado, e cada tipo apenas o recebe.

<details>
<summary>❌ Ruim: cada formato de saída acrescenta um método em toda a hierarquia</summary>

```js
class TextNode {
  toHtml() {}
  toMarkdown() {}
  toPlainText() {}
}

class ImageNode {
  toHtml() {}
  toMarkdown() {}
  toPlainText() {}
}
```

Um formato novo abre todas as classes de nó. As regras de conversão para HTML ficam espalhadas por uma dezena de arquivos, e não há como ler o conversor inteiro de uma vez.

</details>

<details>
<summary>✅ Bom: a operação vira um objeto que visita os nós</summary>

```js
class HtmlRenderer {
  visitText(node) {
    const html = `<p>${escapeHtml(node.content)}</p>`;
    return html;
  }

  visitImage(node) {
    const html = `<img src="${node.source}" alt="${node.alternativeText}">`;
    return html;
  }
}

class TextNode {
  accept(visitor) {
    const result = visitor.visitText(this);
    return result;
  }
}
```

Um formato novo entra como uma classe, e as regras de conversão dele ficam juntas. A troca é conhecida: uma operação nova toca um arquivo só, e um tipo de nó novo obriga a atualizar todos os visitantes.

</details>

**Quando usar**: hierarquia de tipos estável com operações que mudam com frequência, como árvores de sintaxe, documentos estruturados e exportadores multi-formato.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Result, Repository, CQRS, Unit of Work, Circuit Breaker, injeção de dependência | [`patterns-advanced.md`](./patterns-advanced.md) |
| Os cinco princípios que esses padrões implementam | [`solid.md`](./solid.md) |
| Saber se o padrão é necessário neste momento | [`principles-advanced.md`](./principles-advanced.md) |
| Eventos que atravessam o limite do sistema | [`domain-events.md`](./domain-events.md) |
| Estilos arquiteturais e metodologias de processo | [`../process/methodologies.md`](../process/methodologies.md) |
