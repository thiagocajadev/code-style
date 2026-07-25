# SOLID: cinco princípios de design orientado a objetos

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

SOLID reúne cinco princípios que Robert C. Martin agrupou nos anos 2000, cada um com uma letra do acrônimo. Todos tratam da mesma pergunta: onde colocar o limite entre uma parte do sistema e outra, de forma que uma mudança de requisito não se espalhe. Eles valem para classe, módulo e função, e não dependem de a linguagem ter herança.

Os cinco princípios respondem a dores diferentes. **SRP** pergunta o que cabe dentro de um módulo. **OCP** pergunta como acrescentar comportamento sem editar o que já funciona. **LSP** pergunta o que um subtipo pode prometer. **ISP** pergunta de quanto um consumidor precisa depender. **DIP** pergunta quem conhece quem.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SRP** (Single Responsibility Principle · Princípio da Responsabilidade Única) | Um módulo tem uma única razão para mudar |
| **OCP** (Open/Closed Principle · Princípio Aberto/Fechado) | Aberto para extensão por código novo, fechado para modificação do código existente |
| **LSP** (Liskov Substitution Principle · Princípio da Substituição de Liskov) | Um subtipo pode substituir o tipo base sem quebrar quem chama |
| **ISP** (Interface Segregation Principle · Princípio da Segregação de Interfaces) | Nenhum consumidor depende de método que não usa |
| **DIP** (Dependency Inversion Principle · Princípio da Inversão de Dependência) | Regra de negócio depende de contrato, e o detalhe técnico depende do mesmo contrato |
| **cohesion** (coesão) | O quanto as partes de um módulo tratam do mesmo assunto |
| **coupling** (acoplamento) | O quanto um módulo precisa saber sobre outro para funcionar |
| **subtype** (subtipo) | Tipo que pode ocupar o lugar de outro nas chamadas já escritas |
| **contract** (contrato) | O que uma função promete aceitar como entrada e devolver como saída |

## Referência rápida

| Letra | Princípio | Pergunta que responde | Sinal de violação |
|---|---|---|---|
| **S** | [Responsabilidade única](#single-responsibility) | O que cabe dentro deste módulo? | Um arquivo aparece em commits de assuntos que não se falam |
| **O** | [Aberto/Fechado](#open-closed) | Como acrescentar comportamento? | `if` ou `switch` que cresce por tipo a cada requisito |
| **L** | [Substituição de Liskov](#liskov-substitution) | O que um subtipo pode prometer? | Subclasse que lança erro num método herdado |
| **I** | [Segregação de interfaces](#interface-segregation) | De quanto o consumidor depende? | Objeto falso com dez métodos para testar quem usa um |
| **D** | [Inversão de dependência](#dependency-inversion) | Quem conhece quem? | Classe de negócio importando driver de banco |

---

<a id="single-responsibility"></a>

## S: uma única razão para mudar

Um módulo responde a um grupo de interessados. A regra de preço pertence ao time de produto, o formato da tabela pertence a quem cuida do banco, e o texto do e-mail pertence a quem cuida da comunicação. Quando os três moram na mesma função, um pedido de mudança de qualquer um deles abre o mesmo arquivo.

O nome do princípio confunde: ele não pede que a função faça uma coisa só. Ele pede que a função tenha um único motivo para ser reaberta.

<details>
<summary>❌ Ruim: cálculo, gravação e e-mail no mesmo método</summary>

```js
class OrderService {
  async place(orderInput) {
    const total = orderInput.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await this.database.query(
      "INSERT INTO orders (customer_id, total) VALUES ($1, $2)",
      [orderInput.customerId, total]
    );

    const body = `<h1>Pedido confirmado</h1><p>Total: R$ ${total}</p>`;
    await this.mailer.send(orderInput.customerEmail, "Pedido confirmado", body);
  }
}
```

Três assuntos independentes ocupam o mesmo método. Uma mudança no cálculo de desconto, uma coluna nova na tabela e um ajuste no texto do e-mail chegam todos aqui. Testar a regra de preço passa a exigir banco e servidor de e-mail no ar.

</details>

<details>
<summary>✅ Bom: o método coordena, e cada assunto vive em seu lugar</summary>

```js
async function placeOrder(orderInput) {
  const total = calculateOrderTotal(orderInput.items);
  const order = Order.place({ ...orderInput, total });

  const savedOrder = await orderRepository.save(order);
  await confirmationMailer.notify(savedOrder);
}

function calculateOrderTotal(items) {
  const total = items.reduce(sumItemPrice, 0);
  return total;
}

function sumItemPrice(runningTotal, item) {
  const itemTotal = item.price * item.quantity;
  const updatedTotal = runningTotal + itemTotal;
  return updatedTotal;
}
```

`placeOrder` diz o que acontece e delega o como. A regra de preço, a gravação e a notificação passam a mudar em arquivos separados. O teste de `calculateOrderTotal` recebe uma lista de itens e confere um número, sem infraestrutura nenhuma.

</details>

**Como reconhecer a violação**

- O arquivo aparece em commits de assuntos que não se falam
- O nome da classe tem "e" ou termina em `Manager`, `Processor`, `Service` sem recorte claro
- O teste precisa subir banco, fila ou servidor de e-mail para conferir uma regra de negócio

**O custo do excesso**: levado ao limite, o SRP produz uma classe por método e um arquivo por operação. A leitura passa a exigir pular entre dez arquivos para entender um fluxo. O recorte útil segue quem pede a mudança, e a contagem de linhas serve no máximo como sinal de alerta.

---

<a id="open-closed"></a>

## O: aberto para extensão, fechado para modificação

Comportamento novo deveria entrar como código novo. Quando cada requisito obriga a reabrir a mesma função, todo caso que já funcionava volta a correr risco a cada edição.

<details>
<summary>❌ Ruim: cada modo de entrega novo reabre a mesma função</summary>

```js
function calculateShipping(order) {
  if (order.shippingMethod === "standard") {
    return order.weight * 2;
  }

  if (order.shippingMethod === "express") {
    return order.weight * 5 + 10;
  }

  if (order.shippingMethod === "pickup") {
    return 0;
  }

  throw new Error(`unknown shipping method: ${order.shippingMethod}`);
}
```

A função está fechada para extensão e aberta para modificação, o contrário do que o princípio pede. Cada edição aqui alcança os modos que já estavam corretos, e os números soltos no meio das contas não dizem de onde vieram.

</details>

<details>
<summary>✅ Bom: uma tabela de busca, e o modo novo entra como função nova</summary>

```js
const STANDARD_RATE_PER_KILO = 2;
const EXPRESS_RATE_PER_KILO = 5;
const EXPRESS_HANDLING_FEE = 10;

const shippingCalculators = {
  standard: calculateStandardShipping,
  express: calculateExpressShipping,
  pickup: calculatePickupShipping,
};

function calculateShipping(order) {
  const calculator = shippingCalculators[order.shippingMethod];

  if (!calculator) {
    throw new Error(`unknown shipping method: ${order.shippingMethod}`);
  }

  const cost = calculator(order);
  return cost;
}

function calculateStandardShipping(order) {
  const cost = order.weight * STANDARD_RATE_PER_KILO;
  return cost;
}

function calculateExpressShipping(order) {
  const weightCost = order.weight * EXPRESS_RATE_PER_KILO;
  const cost = weightCost + EXPRESS_HANDLING_FEE;
  return cost;
}

function calculatePickupShipping() {
  const cost = 0;
  return cost;
}
```

Um modo de entrega novo entra como uma função nova mais uma linha na tabela. Nenhuma das funções existentes é reaberta, e as tarifas ganham nome em vez de aparecerem soltas na conta.

</details>

Essa é a forma mais simples do [Strategy](patterns.md#strategy), sem a cerimônia de interface e classe. Em linguagem com tipagem estática, a mesma ideia costuma aparecer como uma interface e uma implementação por variação.

**Como reconhecer a violação**

- Um `if` ou `switch` ganha um ramo a cada requisito de negócio
- A mesma condição sobre tipo se repete em funções diferentes
- O `pull request` de uma feature nova toca uma função que outras features usam

**O custo do excesso**: criar ponto de extensão antes da segunda variação chegar produz abstração que ninguém usa. A regra prática é a mesma do [YAGNI](principles-advanced.md#yagni): espere a variação existir de verdade.

---

<a id="liskov-substitution"></a>

## L: o subtipo cumpre a promessa do tipo base

Quem escreve código contra um tipo base escreve contra a promessa dele. Um subtipo que recusa parte dessa promessa obriga o consumidor a descobrir qual implementação chegou, que é justamente o trabalho que a herança deveria dispensar.

Na prática, o subtipo respeita a substituição quando não aperta o que aceita de entrada, não relaxa o que garante na saída, e não lança erro onde o tipo base entrega um resultado.

<details>
<summary>❌ Ruim: a subclasse promete estorno e recusa na hora de estornar</summary>

```js
class PaymentMethod {
  async refund(amount) {
    const reversal = await this.gateway.reverse(amount);
    return reversal;
  }
}

class BoletoPayment extends PaymentMethod {
  async refund(amount) {
    throw new Error("boleto has no automatic reversal");
  }
}

async function refundOrder(order) {
  for (const payment of order.payments) {
    await payment.refund(payment.amount);
  }
}
```

`refundOrder` foi escrita contra a promessa de `PaymentMethod`. `BoletoPayment` é um `PaymentMethod` por herança e não por comportamento. O `for` para no meio da lista e deixa o pedido com parte dos pagamentos estornada.

</details>

<details>
<summary>✅ Bom: quem estorna é um tipo separado, e a lista é filtrada antes</summary>

```js
class PaymentMethod {
  async charge(amount) {
    const authorization = await this.gateway.authorize(amount);
    return authorization;
  }
}

class RefundablePayment extends PaymentMethod {
  async refund(amount) {
    const reversal = await this.gateway.reverse(amount);
    return reversal;
  }
}

class CardPayment extends RefundablePayment {}

class BoletoPayment extends PaymentMethod {}

function isRefundable(payment) {
  const supportsReversal = payment instanceof RefundablePayment;
  return supportsReversal;
}

async function refundOrder(order) {
  const refundablePayments = order.payments.filter(isRefundable);

  for (const payment of refundablePayments) {
    await payment.refund(payment.amount);
  }
}
```

A classe base promete só o que toda forma de pagamento cumpre. `RefundablePayment` acrescenta o estorno, e `BoletoPayment` fica de fora sem mentir sobre o que faz. `refundOrder` recebe uma lista onde toda entrada cumpre o contrato.

</details>

**Como reconhecer a violação**

- Uma subclasse lança `NotSupportedException` ou equivalente num método herdado
- O consumidor verifica o tipo concreto antes de chamar o método
- A subclasse sobrescreve um método e devolve `null` onde o tipo base devolvia um objeto
- A subclasse exige uma validação de entrada que o tipo base aceitava

**O custo do excesso**: perseguir substituição perfeita em toda hierarquia leva a uma árvore de tipos com um nível por capacidade. Quando as capacidades se combinam de várias formas, [composição resolve melhor que herança](principles-advanced.md#composition-over-inheritance).

---

<a id="interface-segregation"></a>

## I: interface pequena, consumidor sem dependência inútil

Um consumidor que recebe uma interface larga passa a depender de tudo que ela declara, mesmo do que nunca chama. Quando um método que ele ignora muda de assinatura, ele precisa ser recompilado, revisado e ter seus testes ajustados.

<details>
<summary>❌ Ruim: o relatório usa um método e depende de seis</summary>

```js
class OrderRepository {
  async findById(orderId) {}
  async findByCustomer(customerId) {}
  async save(order) {}
  async delete(orderId) {}
  async countByStatus(status) {}
  async sumRevenueByMonth(month) {}
}

class MonthlyRevenueReport {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async build(month) {
    const revenue = await this.orderRepository.sumRevenueByMonth(month);
    return revenue;
  }
}
```

Para testar `build`, alguém precisa montar um objeto falso com os seis métodos. Uma mudança na assinatura de `delete` chega até o relatório, que nunca apagou nada.

</details>

<details>
<summary>✅ Bom: o consumidor depende do contrato que ele usa</summary>

```js
class MonthlyRevenueReport {
  constructor(revenueQuery) {
    this.revenueQuery = revenueQuery;
  }

  async build(month) {
    const revenue = await this.revenueQuery.sumByMonth(month);
    return revenue;
  }
}

class OrderRevenueQuery {
  constructor(database) {
    this.database = database;
  }

  async sumByMonth(month) {
    const revenue = await this.database.orders.sumRevenue(month);
    return revenue;
  }
}
```

O relatório declara que precisa de algo capaz de somar receita por mês. O teste monta um objeto com `sumByMonth` e nada mais, e o resto do repositório deixa de alcançá-lo.

</details>

**Como reconhecer a violação**

- O objeto falso de um teste tem mais métodos vazios do que métodos usados
- Uma implementação da interface deixa metade dos métodos sem corpo
- O nome da interface é genérico o bastante para caber qualquer coisa: `IService`, `IManager`

**O custo do excesso**: uma interface por método produz dezenas de arquivos de uma linha. O recorte segue o consumidor: cada grupo de métodos que um mesmo consumidor usa junto vira uma interface.

---

<a id="dependency-inversion"></a>

## D: o detalhe depende da abstração

Sem esse princípio, a regra de negócio importa o driver do banco e o cliente do serviço de e-mail. A dependência aponta de dentro para fora, e o que menos muda passa a depender do que mais muda.

A inversão coloca o contrato dentro do domínio. A regra de negócio define do que precisa, e a implementação concreta na borda se encaixa nesse contrato. As duas passam a depender da mesma abstração.

<details>
<summary>❌ Ruim: a regra de negócio importa o banco e o serviço de e-mail</summary>

```js
import postgres from "postgres";
import sendgrid from "@sendgrid/mail";

class OrderCheckout {
  async confirm(orderId) {
    const connection = postgres(process.env.DATABASE_URL);
    const [order] = await connection`SELECT * FROM orders WHERE id = ${orderId}`;

    await sendgrid.send({
      to: order.customer_email,
      subject: "Pedido confirmado",
      text: `Pedido ${orderId} confirmado`,
    });
  }
}
```

Testar `confirm` exige um Postgres de pé e uma conta no SendGrid. Trocar de provedor de e-mail obriga a abrir a classe que guarda a regra de confirmação, e a conexão nova a cada chamada ignora qualquer pool configurado na aplicação.

</details>

<details>
<summary>✅ Bom: o domínio define os contratos, e a borda os implementa</summary>

```js
class OrderCheckout {
  constructor(orderRepository, confirmationNotifier) {
    this.orderRepository = orderRepository;
    this.confirmationNotifier = confirmationNotifier;
  }

  async confirm(orderId) {
    const order = await this.orderRepository.findById(orderId);
    const confirmation = OrderConfirmation.from(order);

    await this.confirmationNotifier.send(confirmation);
  }
}

class PostgresOrderRepository {
  constructor(connectionPool) {
    this.connectionPool = connectionPool;
  }

  async findById(orderId) {
    const order = await this.connectionPool.orders.findById(orderId);
    return order;
  }
}
```

`OrderCheckout` conhece dois contratos e nenhuma biblioteca. Quem monta a aplicação decide qual implementação entra, e o teste passa um repositório em memória com um notificador que só registra a chamada.

</details>

O mecanismo que entrega as implementações no construtor é a injeção de dependência, descrita em [`patterns-advanced.md`](patterns-advanced.md#dependency-injection). A forma mais simples dela já está em [`principles.md`](principles.md#explicit-dependencies): receber por parâmetro.

**Como reconhecer a violação**

- Uma classe de domínio tem `import` de driver de banco, cliente HTTP ou SDK de provedor
- O teste de uma regra de negócio precisa de rede, disco ou variável de ambiente
- Trocar de biblioteca implica editar arquivos que não têm nada a ver com a biblioteca

**O custo do excesso**: uma interface para cada classe, com uma implementação só e nenhuma perspectiva de segunda, adiciona um arquivo e uma indireção sem devolver nada. Em CRUD sem regra de negócio, o acesso direto costuma ser a escolha correta.

---

<a id="when-solid-hurts"></a>

## Quando SOLID atrapalha

Os cinco princípios descrevem para onde o design caminha quando a mudança dói. Aplicados antes da dor existir, eles produzem estrutura que ninguém pediu.

| Sintoma | O que aconteceu | Correção |
|---|---|---|
| Dez arquivos para seguir um fluxo de três passos | SRP aplicado por contagem de linhas | Recortar por quem pede a mudança |
| Interface com uma implementação e nenhuma segunda à vista | DIP aplicado por hábito | Voltar à chamada direta até a segunda aparecer |
| Ponto de extensão que nenhum código usa | OCP antecipado | Esperar a segunda variação |
| Árvore de herança com um nível por capacidade | LSP perseguido com herança | Trocar por composição |
| Dezenas de interfaces de um método | ISP aplicado por método, não por consumidor | Agrupar pelo que cada consumidor usa junto |

A pergunta que resolve a maioria dos casos: qual mudança de requisito este desenho está tornando barata, e essa mudança já apareceu alguma vez? Sem resposta concreta, a estrutura pode esperar.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Os critérios de avaliação de código, onde o DIP aparece como dependências explícitas | [`principles.md`](./principles.md) |
| KISS, YAGNI, DRY e os princípios que contêm o excesso de SOLID | [`principles-advanced.md`](./principles-advanced.md) |
| Strategy, Factory Method e os padrões que implementam OCP e DIP | [`patterns.md`](./patterns.md) |
| Injeção de dependência e os padrões de aplicação | [`patterns-advanced.md`](./patterns-advanced.md) |
| O SRP aplicado ao tamanho de uma entidade e ao limite do agregado | [`entity-modeling.md`](./entity-modeling.md) |
