# Transações e Unit of Work

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão
> transacional. As regras aqui valem para qualquer linguagem com acesso a banco
> transacional ou que precise coordenar mudanças cruzando o limite de um
> agregado.

Esta página atende a duas pessoas. A primeira está desenhando a primeira
operação de escrita do projeto e quer saber onde abrir e fechar a transação. A
segunda volta para revisitar um caso difícil (por exemplo, vale a pena segurar
lock no banco para garantir que dois usuários não comprem o último item ao mesmo
tempo, ou modelar como saga). As duas saem daqui com critério, não com receita
fechada.

O texto cobre três perguntas que aparecem cedo em todo sistema que persiste
estado: até onde uma transação ACID resolve o problema; quando trocar lock por
verificação de versão; quando aceitar que a consistência vai ser eventual e
modelar a coordenação em outro nível. Persistência específica (drivers, sintaxe,
índices) vive em [`../platform/database.md`](../platform/database.md); a
propagação de mudanças por eventos vive em
[`domain-events.md`](domain-events.md); o que cada tipo de **broker**
(intermediário de mensagens) entrega em garantias vive em
[`../platform/messaging.md`](../platform/messaging.md).

## Conceitos fundamentais

| Conceito                                                 | O que é                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **transaction** (transação)                              | Bloco de operações no banco que aplica todas as mudanças ou nenhuma, sem estado parcial visível                                         |
| **ACID** (Atomicity, Consistency, Isolation, Durability) | Garantias clássicas de uma transação: tudo-ou-nada, regras preservadas, isolamento entre concorrentes, persistência após commit         |
| **commit** (confirmar)                                   | Marca o fim bem-sucedido da transação; mudanças tornam-se visíveis e duráveis                                                           |
| **rollback** (desfazer)                                  | Cancela a transação em curso; banco volta ao estado anterior ao `BEGIN`                                                                 |
| **boundary** (limite, delimitação do escopo)             | Linha que separa o que está dentro do que está fora; em domínio, delimita o agregado; em transação, delimita o que tem garantia atômica |
| **transaction boundary** (limite transacional)           | Pontos onde a transação abre e fecha; coincide com o limite do agregado em domínio bem modelado                                         |
| **Unit of Work** (unidade de trabalho)                   | Componente que acumula mudanças de um caso de uso e aplica todas no commit, ou descarta no rollback                                     |
| **optimistic locking** (bloqueio otimista)               | Detecta conflito comparando a versão lida com a versão atual no momento da escrita; falha se mudou                                      |
| **pessimistic locking** (bloqueio pessimista)            | Reserva o registro no banco com `SELECT FOR UPDATE`, impedindo escritas concorrentes até a transação fechar                             |
| **isolation level** (nível de isolamento)                | Quanto uma transação enxerga das mudanças não confirmadas de outras (Read Uncommitted → Serializable)                                   |
| **dirty read** (leitura suja)                            | Ler dado que outra transação alterou mas ainda não confirmou (`commit`); o dado pode ser desfeito                                       |
| **deadlock** (impasse, abraço mortal)                    | Duas transações esperando uma pela outra para liberar recursos; banco aborta uma para destravar                                         |
| **eventual consistency** (consistência eventual)         | Estado entre agregados converge no tempo, sem garantia de instantaneidade após a mudança original                                       |
| **saga** (saga, transação de longa duração)              | Sequência de transações locais coordenadas; cada passo pode acionar compensação se um passo posterior falhar                            |
| **compensating action** (ação compensatória)             | Operação que desfaz o efeito de uma transação local já confirmada, semanticamente (não no banco)                                        |
| **two-phase commit** (commit em duas fases, 2PC)         | Protocolo que tenta tornar atômica uma transação distribuída entre vários recursos; complexo e raramente recomendado                    |
| **outbox** (caixa de saída)                              | Tabela no mesmo banco do agregado, gravada na mesma transação, para publicar eventos após o commit sem perda                            |

---

## Boundary transacional é boundary do agregado

A regra que organiza todo o resto é simples: uma transação cobre um agregado. O
agregado define a unidade de consistência forte; a transação implementa essa
consistência no banco. Quando uma operação precisa alterar dois agregados, o
desenho está pedindo dois passos, não uma transação maior.

Esse alinhamento vem de [`entity-modeling.md`](entity-modeling.md). Lá, o
agregado é a fronteira de invariantes. Aqui, a transação é a fronteira mecânica
que garante essas invariantes contra concorrência e falha. Quando os dois
limites coincidem, o código é simples; quando não coincidem, alguém vai precisar
pagar a diferença com lock distribuído, **2PC** ou bug intermitente.

<details>
<summary>❌ Ruim: uma transação tentando manter dois agregados consistentes</summary>

```js
async function placeOrder(orderInput, customerId) {
  const transaction = await database.beginTransaction();

  try {
    const customer = await customerRepository.findById(customerId, transaction);
    customer.recordPurchase(orderInput.total);
    await customerRepository.save(customer, transaction);

    const order = Order.place({ customerId, ...orderInput });
    await orderRepository.save(order, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

Dois agregados (`Customer` e `Order`) compartilham a mesma transação. Quem
garante a invariante do total do cliente passa a depender de o pedido também ter
sido válido, e vice-versa. O lock no `Customer` segura o pedido inteiro. Em alta
concorrência, todo cliente fica gargalado por suas próprias compras paralelas.

</details>

<details>
<summary>✅ Bom: uma transação por agregado, coordenação por evento</summary>

```js
async function placeOrder(orderInput, customerId) {
  const order = Order.place({ customerId, ...orderInput });
  const persistedOrder = await orderRepository.save(order);
  return persistedOrder;
}

class CustomerPurchaseRecorder {
  constructor(customerRepository) {
    this.customerRepository = customerRepository;
  }

  async on(event) {
    const customer = await this.customerRepository.findById(event.customerId);
    customer.recordPurchase(event.total);

    await this.customerRepository.save(customer);
  }
}
```

Cada agregado tem sua própria transação. O `Order` publica `OrderPlaced` (ver
[`domain-events.md`](domain-events.md)); o `CustomerPurchaseRecorder` reage e
atualiza o `Customer` em outra transação. Falha do segundo passo não cancela o
pedido; entra em retry no handler, com **idempotency** (idempotência) cobrindo
reentrega.

</details>

A consequência prática: quando o caso de uso parece precisar atualizar dois
agregados juntos, há três caminhos.

- **Reconsiderar o desenho**. Talvez os dois agregados sejam um só (a invariante
  atravessa os dois, não dá para separar a regra). Fundir.
- **Aceitar consistência eventual**. Um agregado atualiza sincronamente, o outro
  reage ao evento. Trade-off explícito: o segundo pode ficar momentaneamente
  fora do dia.
- **Compor com saga**. Quando a operação envolve mais de duas etapas com regras
  de cancelamento, modelar como saga (ver seção [Saga](#saga-e-long-running)).

## Unit of Work

Quando um caso de uso precisa fazer várias mudanças no mesmo agregado, ou em
vários objetos do mesmo agregado, o padrão Unit of Work resolve dois problemas:
chamar `save` uma vez só no fim (em vez de a cada mutação), e fazer rollback
automático quando algo dá errado no meio.

A ideia central é manter uma lista de "novas", "alteradas" e "removidas" durante
o caso de uso, e aplicar tudo de uma vez no `commit`. Quem chama o caso de uso
não enxerga o detalhe; apenas executa a operação dentro de um bloco que abre o
UoW no começo e fecha no fim.

<details>
<summary>❌ Ruim: cada mutação chama o repositório, sem fronteira clara</summary>

```js
async function fulfillOrder(orderId) {
  const order = await orderRepository.findById(orderId);
  order.markAsPickedUp();
  await orderRepository.save(order);

  for (const item of order.items) {
    item.deductFromInventory();
    await inventoryRepository.save(item.productId, item.quantity);
  }

  order.markAsShipped();
  await orderRepository.save(order);
}
```

Três viagens ao banco. Se o segundo `save` falhar, o pedido fica em estado
parcial: `pickedUp` no banco mas `shipped` só no objeto em memória. Quem ler o
registro vê um pedido coletado mas não enviado, e ninguém sabe se a coleta
concluiu ou se houve falha no meio do caminho.

</details>

<details>
<summary>✅ Bom: Unit of Work agrupa mudanças em uma transação só</summary>

```js
class UnitOfWork {
  constructor(database) {
    this.database = database;
    this.pendingSaves = [];
  }

  register(aggregate) {
    this.pendingSaves.push(aggregate);
  }

  async commit() {
    const transaction = await this.database.beginTransaction();

    try {
      for (const aggregate of this.pendingSaves) {
        await aggregate.repository.save(aggregate, transaction);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

async function fulfillOrder(orderId, unitOfWork) {
  const order = await orderRepository.findById(orderId);
  order.fulfill();

  unitOfWork.register(order);

  return order;
}
```

A função de domínio descreve a regra (`order.fulfill()`), não a mecânica do
banco. A camada acima abre o `UnitOfWork`, chama o caso de uso, faz commit. O
`commit` é atômico; se uma escrita falhar, todas voltam.

</details>

Em projeto pequeno, o UoW pode ser implícito: o **ORM** (Object-Relational
Mapping) que você usa já implementa a ideia. Em Entity Framework, o próprio
`DbContext` é um UoW; em SQLAlchemy, a `Session`; em Sequelize, a `transaction`
passada como contexto. Em projeto grande, montar uma classe própria sobre essa
camada faz sentido quando o domínio cresce a ponto de o caso de uso precisar
coordenar várias mudanças.

## Locking: otimista vs pessimista

Concorrência é o problema clássico que transação resolve, mas o como muda
conforme a frequência do conflito. As duas estratégias atendem cenários
distintos.

**Pessimismo** (`SELECT ... FOR UPDATE`): a transação reserva o registro para si
até o `commit`. Concorrentes esperam. Funciona para conflitos frequentes e
leituras curtas, onde a fila vale o preço da garantia. Exemplo: estoque em flash
sale, contador de assentos em voo lotado.

**Otimismo** (campo `version` incrementado a cada escrita): a transação lê o
registro com sua versão atual, faz o que precisa fazer em memória, e na hora de
gravar verifica se a versão ainda é a mesma. Se não for, falha e o caso de uso
decide se retenta ou propaga o conflito para o usuário. Funciona para conflitos
raros e tempos de processamento maiores, onde manter lock seria desperdício.

<details>
<summary>❌ Ruim: leitura-modificação-escrita sem controle de concorrência (lost update)</summary>

```js
async function topUpWallet(walletId, amount) {
  const wallet = await walletRepository.findById(walletId);
  const newBalance = wallet.balance + amount;
  wallet.balance = newBalance;

  await walletRepository.save(wallet);
}

// dois pedidos chegam ao mesmo tempo, ambos leem balance = 100,
// ambos calculam 100 + 50, ambos gravam 150.
// resultado real: deveria ser 200, ficou 150. perda silenciosa.
```

A janela entre `findById` e `save` é onde o conflito acontece. Sem lock nem
versão, o segundo gravador sobrescreve o primeiro sem saber que o estado mudou
no meio.

</details>

<details>
<summary>✅ Bom: bloqueio otimista por campo `version`</summary>

```js
class Wallet {
  constructor({ id, balance, version }) {
    this.id = id;
    this.balance = balance;
    this.version = version;
  }

  topUp(amount) {
    if (amount <= 0) {
      throw new Error("amount must be positive");
    }

    this.balance += amount;
    this.version += 1;
  }
}

class WalletRepository {
  async save(wallet) {
    const expectedVersion = wallet.version - 1;

    const updatedRowCount = await this.database.execute(
      `UPDATE
         wallets
       SET
         balance = $1,
         version = $2
       WHERE
         wallets.id = $3 AND
         wallets.version = $4`,
      [wallet.balance, wallet.version, wallet.id, expectedVersion],
    );

    if (updatedRowCount === 0) {
      throw new ConcurrencyConflictError(wallet.id);
    }
  }
}
```

O `UPDATE` só atualiza se a versão atual no banco for igual à que foi lida.
Quando dois pedidos competem, um vence, o outro recebe
`ConcurrencyConflictError`. Quem chama decide: retentar (lendo de novo o estado
atual) ou propagar o erro como conflito de negócio.

</details>

<details>
<summary>✅ Bom: bloqueio pessimista para hot path com conflito frequente</summary>

```js
class SeatRepository {
  async reserveSeat(flightId, seatNumber, customerId) {
    const transaction = await this.database.beginTransaction();

    try {
      const seat = await transaction.queryOne(
        `SELECT
           seats.id,
           seats.status
         FROM
           seats
         WHERE
           seats.flight_id = $1 AND
           seats.seat_number = $2
         FOR UPDATE`,
        [flightId, seatNumber],
      );

      if (seat.status !== "available") {
        throw new SeatUnavailableError(flightId, seatNumber);
      }

      await transaction.execute(
        `UPDATE
           seats
         SET
           status = 'reserved',
           customer_id = $1
         WHERE
           seats.id = $2`,
        [customerId, seat.id],
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

`SELECT ... FOR UPDATE` reserva a linha durante a transação. Outros pedidos pelo
mesmo assento esperam até o commit. Se o passageiro completar a compra, o
segundo recebe `SeatUnavailableError`; se desistir, o segundo entra. A fila é
curta porque o caso de uso é curto: reservar não inclui pagar.

</details>

Regra de decisão prática:

- **Pessimista** quando o conflito é provável (estoque, assento, slot agendável
  de hora), quando o processamento é rápido, quando perder uma operação dói
  menos do que ter inconsistência.
- **Otimista** quando o conflito é raro (perfil de usuário, configuração,
  documento editado por uma pessoa por vez), quando o caso de uso pode demorar
  (formulário longo, integração com sistema externo), quando retentar é barato.

Misturar mal os dois é caminho para deadlock. Cada caso de uso escolhe uma
estratégia e mantém durante a transação.

## Isolation levels

Quatro níveis padrão do **SQL** (Structured Query Language, Linguagem
Estruturada de Consulta) decidem o quanto uma transação enxerga do trabalho em
curso das outras. O nível default da maioria dos bancos modernos (PostgreSQL,
SQL Server) é Read Committed, e essa é a escolha razoável para a maior parte dos
casos.

| Nível            | O que evita                                     | Quando faz sentido                                                                                  |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Read Uncommitted | Nada (permite dirty read)                       | Quase nunca; tolerância a dado provisório em métrica não crítica                                    |
| Read Committed   | Dirty read                                      | Default da maioria dos casos; leitura sempre vê estado confirmado                                   |
| Repeatable Read  | Dirty read + non-repeatable read                | Relatório longo que lê os mesmos dados várias vezes e precisa ver o mesmo valor                     |
| Serializable     | Dirty read + non-repeatable read + phantom read | Operação onde a ordem precisa ser equivalente a uma execução sequencial; mais lento, mais conflitos |

A regra prática: começar com o default do banco. Subir o nível só quando aparece
um bug específico de leitura inconsistente, e mesmo assim revisar se o problema
não estava na transação longa demais ou no agregado mal modelado.

<details>
<summary>❌ Ruim: subir isolation level para resolver problema que era de modelagem</summary>

```js
async function reportMonthlyRevenue(month, year) {
  const transaction = await database.beginTransaction("SERIALIZABLE");

  try {
    const totalSales = await transaction.queryOne(
      `SELECT
         SUM(orders.total) AS total_sales
       FROM
         orders
       WHERE
         orders.month = $1 AND
         orders.year = $2`,
      [month, year],
    );

    const refundsTotal = await transaction.queryOne(
      `SELECT
         SUM(refunds.amount) AS total_refunds
       FROM
         refunds
       WHERE
         refunds.month = $1 AND
         refunds.year = $2`,
      [month, year],
    );

    const netRevenue = totalSales.total_sales - refundsTotal.total_refunds;

    await transaction.commit();

    return netRevenue;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

`SERIALIZABLE` impede que uma compra ou reembolso entre no meio do cálculo. O
preço: cada nova venda concorrente conflita com o relatório, e o sistema todo
gargala. Pior: o relatório está lendo dados móveis. Mês atual ainda vai mudar;
ler em isolamento alto não congela o tempo.

</details>

<details>
<summary>✅ Bom: relatório opera sobre snapshot fechado, isolation level default</summary>

```js
async function reportMonthlyRevenue(month, year) {
  const snapshot = await snapshotRepository.findByMonth(month, year);

  if (!snapshot.isClosed) {
    throw new MonthNotClosedError(month, year);
  }

  return snapshot.netRevenue;
}
```

O fechamento mensal vira evento explícito do domínio. O relatório consulta o
snapshot já calculado e congelado. Isolation level deixa de ser ferramenta para
esconder problema de modelagem.

</details>

Quando subir de fato faz sentido:

- Operação financeira curta que precisa ler e gravar sobre o mesmo conjunto
  (Serializable para evitar phantom).
- Relatório que tem que rodar dentro de uma janela curta e precisa ver o mesmo
  estado em vários `SELECT` consecutivos (Repeatable Read).
- Default suficiente na esmagadora maioria do código de negócio.

## Saga e long-running

Transação ACID resolve problemas curtos, dentro de um banco, de um agregado.
Quando a operação envolve várias etapas, sistemas externos ou tempo de espera
(segundos, minutos, horas), segurar uma transação no banco trava o sistema. O
padrão para esses casos é a saga: uma sequência de transações locais
coordenadas, cada uma com sua compensação.

A saga aparece em dois sabores:

**Choreography** (coreografia): cada serviço escuta eventos e reage. Não há
coordenador central. Acoplamento por contrato de evento; bom para fluxos com
poucas etapas e regras estáveis. Exemplo: pedido pago publica `OrderSettled` →
módulo de estoque reserva → publica `StockReserved` → módulo de entrega agenda.

**Orchestration** (orquestração): um coordenador comanda os passos. O
coordenador conhece o fluxo inteiro, cada passo recebe um comando, cada falha
aciona compensação explícita. Bom para fluxos longos com muitas etapas e regras
de cancelamento. Exemplo: workflow de aprovação de empréstimo em 7 passos.

<details>
<summary>❌ Ruim: long-lived transaction segurando lock durante chamada externa</summary>

```js
async function processPayment(orderId, paymentDetails) {
  const transaction = await database.beginTransaction();

  try {
    const order = await orderRepository.findById(orderId, transaction);

    if (order.status !== "pending") {
      throw new Error("Order is not pending");
    }

    const paymentResult = await paymentGateway.charge(paymentDetails);

    order.markAsSettled(paymentResult.transactionId);
    await orderRepository.save(order, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

A chamada ao **gateway** (gateway de pagamento) pode levar segundos. Durante
todo esse tempo, a transação no banco segura lock no pedido. Sistema lento sob
carga; pior, se o gateway responder após o timeout do banco, a transação é
abortada e o pagamento processado fica órfão.

</details>

<details>
<summary>✅ Bom: saga com choreography e compensação explícita</summary>

```js
class Order {
  static place(input) {
    const order = new Order({ ...input, status: "pending" });
    order.events.push(OrderPlaced.from(order));

    return order;
  }

  markAsSettled(externalTransactionId) {
    if (this.status !== "pending") {
      throw new Error(`Cannot pay order in status ${this.status}`);
    }

    this.status = "settled";
    this.externalTransactionId = externalTransactionId;
    this.events.push(OrderSettled.from(this));
  }

  markAsRefunded(reason) {
    if (this.status !== "settled") {
      throw new Error(`Cannot refund order in status ${this.status}`);
    }

    this.status = "refunded";
    this.refundReason = reason;
    this.events.push(OrderRefunded.from(this));
  }
}

class PaymentHandler {
  async on(event) {
    const paymentResult = await this.paymentGateway.charge(
      event.paymentDetails,
    );

    if (!paymentResult.isSuccessful) {
      await this.commandBus.send(
        new CancelOrder(event.orderId, paymentResult.reason),
      );
      return;
    }

    await this.commandBus.send(
      new MarkOrderAsSettled(event.orderId, paymentResult.transactionId),
    );
  }
}
```

Cada passo é uma transação curta. O pagamento acontece fora do banco. Falha do
gateway aciona `CancelOrder` (compensação). Sistema continua respondendo durante
chamadas longas; lock no banco fica restrito ao momento do `save`.

</details>

Pontos importantes sobre saga:

- **Cada passo é idempotente**. Um passo pode ser reentregue; o handler precisa
  reconhecer estado já aplicado e ignorar. Ver
  [`backend-flow.md`](backend-flow.md#idempotência-do-job) para o padrão de
  chave.
- **Cada passo tem compensação**. Não basta `try/catch`; é preciso desenhar a
  ação que desfaz semanticamente. "Cobrar" compensa com "reembolsar", não com
  "esquecer".
- **Estado da saga é explícito**. Em orchestration, o coordenador persiste em
  qual etapa está. Em choreography, o estado vive no agregado
  (`Order.status = "awaiting_payment" → "settled"`).
- **Falha humana é parte do fluxo**. Tempo de espera por aprovação manual, retry
  com backoff, escalation para suporte. Saga modela bem porque cada estado é
  nomeado.

Sobre **2PC** (two-phase commit): existe, mas raramente é a resposta. Acopla a
disponibilidade do sistema à do recurso mais lento, exige coordenador
transacional ativo, e os bancos modernos não recomendam para fluxos novos.
Quando aparece a tentação, é sinal de que dois agregados deveriam ser um, ou que
a regra deveria virar saga.

## Eventual consistency entre agregados

Quando duas escritas precisam acontecer mas vivem em agregados separados, a
consistência entre elas vai ser eventual. Aceitar isso é mais barato do que
fingir o contrário com 2PC ou lock distribuído.

A ferramenta que sustenta essa coordenação sem perder evento no caminho é o
**outbox**. A regra é: na mesma transação que persiste o agregado, gravar o
evento na tabela `outbox`. Um worker separado lê o outbox e publica no broker.
Se o publish falhar, o evento fica no outbox para retry. Se o consumer falhar,
ele recebe a mensagem de novo (at-least-once); a idempotência cobre.

<details>
<summary>❌ Ruim: publicar evento direto após save, sem outbox</summary>

```js
async function placeOrder(orderInput) {
  const order = Order.place(orderInput);
  await orderRepository.save(order);

  await eventBus.publish(new OrderPlaced(order));
}
```

Dois pontos de falha. Se `eventBus.publish` falhar depois do `save`, o pedido
existe no banco mas ninguém é notificado: estoque não reserva, entrega não
agenda, e-mail não vai. Se `publish` rodar antes do save (em outras tentativas
de arrumar), o evento sai pelo broker enquanto o banco ainda não persistiu;
consumer tenta ler e não acha.

</details>

<details>
<summary>✅ Bom: outbox grava evento na mesma transação do agregado</summary>

```js
class OrderRepository {
  async save(order) {
    const transaction = await this.database.beginTransaction();

    try {
      await this.persistOrder(order, transaction);
      await this.persistEvents(order.events, transaction);

      await transaction.commit();

      order.events = [];
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async persistOrder(order, transaction) {
    await transaction.execute(
      `INSERT INTO orders
       (
         id,
         customer_id,
         status,
         total
       )
       VALUES
         ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET
         status = $3,
         total = $4`,
      [order.id, order.customerId, order.status, order.total],
    );
  }

  async persistEvents(events, transaction) {
    for (const event of events) {
      await transaction.execute(
        `INSERT INTO outbox
         (
           id,
           type,
           payload,
           created_at
         )
         VALUES
         (
           $1,
           $2,
           $3,
           NOW()
         )`,
        [event.id, event.type, JSON.stringify(event.payload)],
      );
    }
  }
}
```

`save` é atômico: ou grava pedido e eventos juntos, ou nenhum dos dois. Um
worker separado lê `outbox` e publica no broker; depois marca como publicado.
Falha em qualquer etapa é recuperável: o evento permanece no outbox até ser
entregue. Detalhes do worker em
[`backend-flow.md`](backend-flow.md#outbox-pattern).

</details>

A consequência operacional da consistência eventual aparece na **UI** (User
Interface, Interface de Usuário): logo após o `POST /orders`, o usuário pode
ainda não ver os efeitos no `Customer` ou no estoque. Duas abordagens:

- **Estado intermediário visível**. Pedido confirmado, mas com badge
  "processando". Quando o handler do estoque concluir, o badge some.
- **Otimismo na UI**. Frontend assume o estado final, exibe imediato; backend
  retifica se algo der errado. Trade-off: erro raro vira correção visível.

Em geral, modelar o estado intermediário no agregado (`status = "processing"` →
`"confirmed"`) deixa o sistema honesto. O usuário entende que o pedido foi
aceito e o restante vai acontecer; a tela reflete a verdade do back.

## Compensação semântica vs rollback

`ROLLBACK` desfaz mudanças no banco; não desfaz efeito que saiu do banco. E-mail
enviado, pagamento processado, notificação push disparada, vídeo gerado: nada
disso volta com rollback. Quando o caso de uso passou de um agregado, ou passou
pelo broker, a forma de desfazer é compensação semântica.

A regra prática: dentro de uma transação ACID, confiar no `ROLLBACK` para tudo.
Fora dela, modelar a compensação como ação do domínio. "Cancelar pedido pago"
não é "deletar o pedido"; é uma operação com nome próprio, regras próprias,
eventual ação contra terceiros (reembolso).

<details>
<summary>❌ Ruim: tentar desfazer envio com flag, sem ação compensatória</summary>

```js
async function placeOrder(orderInput) {
  try {
    const order = Order.place(orderInput);
    await orderRepository.save(order);

    await emailService.sendOrderConfirmation(order);
    await paymentGateway.charge(order.total);
  } catch (error) {
    await orderRepository.delete(order.id);
    throw error;
  }
}
```

Se `paymentGateway.charge` falhar depois do
`emailService.sendOrderConfirmation`, o e-mail já foi para o cliente. Apagar o
pedido no banco não desfaz o e-mail. O cliente tem confirmação na caixa de
entrada de um pedido que não existe no sistema.

</details>

<details>
<summary>✅ Bom: compensação como operação do domínio</summary>

```js
class Order {
  static place(input) {
    const order = new Order({ ...input, status: "awaiting_payment" });
    order.events.push(OrderPlaced.from(order));

    return order;
  }

  markAsSettled(externalTransactionId) {
    if (this.status !== "awaiting_payment") {
      throw new Error(`Cannot pay order in status ${this.status}`);
    }

    this.status = "settled";
    this.externalTransactionId = externalTransactionId;
    this.events.push(OrderSettled.from(this));
  }

  cancelDueToPaymentFailure(reason) {
    if (this.status !== "awaiting_payment") {
      throw new Error(`Cannot cancel settled order; refund instead`);
    }

    this.status = "cancelled";
    this.cancellationReason = reason;
    this.events.push(OrderCancelled.from(this));
  }
}
```

A operação que desfaz tem nome próprio (`cancelDueToPaymentFailure`),
preconditions explícitas e gera evento próprio. O handler de e-mail escuta
`OrderCancelled` e dispara o e-mail de cancelamento. Nenhuma mágica de rollback:
o domínio descreve cada estado com clareza.

</details>

## Anti-patterns

**Cross-aggregate transaction**. Uma transação tentando manter dois agregados
consistentes. Sintoma: `findById` e `save` de dois repositórios diferentes
dentro do mesmo `BEGIN`/`COMMIT`. Tratamento: separar em duas transações,
coordenar por evento; ou rever a modelagem se a invariante de fato atravessa os
dois.

**Long-lived transaction**. Transação aberta durante chamada externa (HTTP,
gateway, fila), aprovação humana ou processamento longo. Sintoma: lock segurado
por minutos; deadlocks crescentes; relatórios sob `SERIALIZABLE` que disputam
com escritas. Tratamento: fechar a transação no fim de cada passo curto; modelar
o passo longo como saga.

**Transação como controle de fluxo**. Usar `try/catch` em volta de
`transaction.commit` como se fosse `if`. Sintoma: `catch` decide rumo de
negócio, não de erro técnico. Tratamento: validar pré-condições antes de abrir a
transação; deixar `catch` cuidar só de erro de infraestrutura.

**Distributed 2PC**. Tentativa de tornar atômica uma escrita em dois bancos ou
banco + broker. Sintoma: discussão sobre coordenador transacional, XA,
`prepare`/`commit`. Tratamento: outbox + idempotência. 2PC é solução para um
problema que raramente é o problema certo.

**Subir isolation level sem entender o sintoma**. Trocar default por
`SERIALIZABLE` porque "estava dando inconsistência". Sintoma: nada melhora,
throughput cai, conflitos aparecem onde antes não havia. Tratamento: investigar
a causa real (transação longa, agregado mal desenhado, ausência de versão), não
esconder com nível mais estrito.

**Locking pessimista em hot path**. `SELECT ... FOR UPDATE` em fluxo de alta
concorrência onde o conflito é raro. Sintoma: fila no banco, usuários esperando,
throughput cai. Tratamento: trocar por bloqueio otimista com `version`; retentar
no caso de uso quando o conflito for esperado.

**Rollback como desfeito universal**. Esperar que `ROLLBACK` corrija efeito que
já saiu do sistema (e-mail enviado, pagamento processado, mensagem publicada).
Sintoma: pedido apagado mas cliente recebeu confirmação; estoque devolvido mas
terceiro já enviou produto. Tratamento: compensação semântica como operação do
domínio com nome próprio.

**Outbox manual sem worker**. Gravar evento na tabela mas publicar inline no
mesmo request. Sintoma: o "outbox" vira tabela morta, publish continua sendo o
ponto de falha. Tratamento: worker separado dedicado a publicar; request acaba
assim que o save completa.

## Referências

Cross-links dentro do guia:

- [`architecture/entity-modeling.md`](entity-modeling.md): aggregate boundary,
  value object, invariantes
- [`architecture/domain-events.md`](domain-events.md): naming, outbox, handler
  isolation, eventual consistency
- [`architecture/backend-flow.md`](backend-flow.md): outbox pattern, job
  idempotente, webhook idempotente
- [`architecture/patterns.md`](patterns.md): CQRS, Observer, Command
- [`platform/database.md`](../platform/database.md): persistência, isolation
  levels específicos por SGBD
- [`platform/messaging.md`](../platform/messaging.md): garantias de entrega,
  at-least-once, DLQ

Bibliografia externa (livros, artigos, especificações):
[`REFERENCES.md`](../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
