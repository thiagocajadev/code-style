# Transações e Unit of Work

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão
> transacional. As regras aqui valem para qualquer linguagem com acesso a banco
> transacional ou que precise coordenar mudanças cruzando o limite de um
> agregado.

Uma transação cobre um agregado. Essa frase resolve a maior parte das dúvidas
sobre onde abrir e fechar uma transação, e o resto desta página explica o que
fazer quando a operação não cabe nesse formato. Aqui você encontra três decisões:
até onde uma transação **ACID** resolve o problema; quando trocar bloqueio no
banco por verificação de versão; quando aceitar que a consistência entre dois
agregados vai levar um tempo para se completar e coordenar isso em outro nível.

O que fica de fora: persistência específica (drivers, sintaxe, índices) vive em
[`../platform/database.md`](../platform/database.md); a propagação de mudanças
por eventos vive em [`domain-events.md`](domain-events.md); as garantias que cada
tipo de **broker** (intermediário de mensagens) oferece vivem em
[`../platform/messaging.md`](../platform/messaging.md).

## Conceitos fundamentais

| Conceito                                                                                                       | O que é                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **transaction** (transação)                                                                                    | Bloco de operações no banco que aplica todas as mudanças ou nenhuma, sem estado parcial visível                                         |
| **ACID** (Atomicity, Consistency, Isolation, Durability · Atomicidade, Consistência, Isolamento, Durabilidade) | Garantias clássicas de uma transação: tudo ou nada, regras preservadas, isolamento entre concorrentes, persistência após o commit       |
| **commit** (confirmar)                                                                                         | Marca o fim bem-sucedido da transação; mudanças tornam-se visíveis e duráveis                                                           |
| **rollback** (desfazer)                                                                                        | Cancela a transação em curso; banco volta ao estado anterior ao `BEGIN`                                                                 |
| **boundary** (limite)                                                                                          | Linha que separa o que está dentro do que está fora; em domínio, delimita o agregado; em transação, delimita o que tem garantia atômica |
| **transaction boundary** (limite transacional)                                                                 | Pontos onde a transação abre e fecha; coincide com o limite do agregado em domínio bem modelado                                         |
| **Unit of Work** (unidade de trabalho)                                                                         | Componente que acumula as mudanças de um caso de uso e aplica todas no commit, ou descarta no rollback                                  |
| **optimistic locking** (bloqueio otimista)                                                                     | Detecta conflito comparando a versão lida com a versão atual no momento da escrita; falha se mudou                                      |
| **pessimistic locking** (bloqueio pessimista)                                                                  | Reserva o registro no banco com `SELECT FOR UPDATE`, impedindo escritas concorrentes até a transação fechar                             |
| **isolation level** (nível de isolamento)                                                                      | Quanto uma transação enxerga das mudanças ainda não confirmadas de outras (Read Uncommitted até Serializable)                           |
| **dirty read** (leitura suja)                                                                                  | Ler dado que outra transação alterou mas ainda não confirmou; o dado pode ser desfeito                                                  |
| **deadlock** (impasse)                                                                                         | Duas transações esperando uma pela outra para liberar recursos; o banco aborta uma para destravar                                       |
| **eventual consistency** (consistência eventual)                                                               | O estado entre agregados converge com o tempo, sem garantia de estar atualizado no instante seguinte à mudança                          |
| **saga** (transação de longa duração)                                                                          | Sequência de transações locais coordenadas; cada passo pode acionar uma compensação se um passo posterior falhar                        |
| **compensating action** (ação compensatória)                                                                   | Operação do domínio que desfaz o efeito de uma transação local já confirmada                                                            |
| **two-phase commit** (2PC · confirmação em duas fases)                                                         | Protocolo que tenta tornar atômica uma transação distribuída entre vários recursos; complexo e raramente recomendado                    |
| **outbox** (caixa de saída)                                                                                    | Tabela no mesmo banco do agregado, gravada na mesma transação, usada para publicar eventos após o commit sem perder nenhum              |

---

## Uma transação cobre um agregado

O agregado define a unidade de consistência forte, e a transação implementa essa
consistência no banco. Quando uma operação precisa alterar dois agregados, o
desenho está pedindo dois passos.

Esse alinhamento vem de [`entity-modeling.md`](entity-modeling.md). Lá, o
agregado é o limite das invariantes (as regras que precisam valer sempre). Aqui,
a transação é o limite mecânico que garante essas regras contra concorrência e
falha. Quando os dois limites coincidem, o código fica simples. Quando não
coincidem, o custo aparece como bloqueio distribuído, **2PC** ou bug
intermitente.

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

Dois agregados (`Customer` e `Order`) compartilham a mesma transação. A
invariante do total do cliente passa a depender de o pedido também ter sido
válido, e vice-versa. O bloqueio no `Customer` segura o pedido inteiro. Em alta
concorrência, cada cliente vira um gargalo para suas próprias compras paralelas.

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
atualiza o `Customer` em outra transação. A falha do segundo passo deixa o pedido
de pé; o **handler** (função que atende ao evento) entra em nova tentativa, com
**idempotency** (idempotência: aplicar o mesmo evento duas vezes produz o mesmo
resultado) cobrindo a reentrega.

</details>

Quando o caso de uso parece precisar atualizar dois agregados juntos, há três
caminhos.

- **Reconsiderar o desenho**. Talvez os dois agregados sejam um só, porque a
  invariante atravessa os dois e a regra não se separa. Nesse caso, fundir.
- **Aceitar consistência eventual**. Um agregado atualiza de imediato, o outro
  reage ao evento. O custo é explícito: o segundo fica desatualizado por um
  intervalo curto.
- **Compor com saga**. Quando a operação tem mais de duas etapas e regras de
  cancelamento, modelar como saga (ver
  [a seção sobre operações longas](#long-running-saga)).

## Unit of Work: acumular as mudanças e gravar de uma vez

Quando um caso de uso faz várias mudanças no mesmo agregado, o padrão Unit of
Work resolve dois problemas: chamar `save` uma vez só no fim, em vez de a cada
alteração, e desfazer tudo automaticamente quando algo falha no meio.

A ideia é manter durante o caso de uso uma lista do que foi criado, alterado e
removido, e aplicar tudo junto no `commit`. Quem chama o caso de uso enxerga
apenas a operação; a camada acima abre a unidade de trabalho no começo e a fecha
no fim.

<details>
<summary>❌ Ruim: cada mutação chama o repositório, sem limite claro</summary>

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
parcial: `pickedUp` gravado no banco e `shipped` apenas no objeto em memória.
Quem ler o registro vê um pedido coletado e não enviado, sem saber se a coleta
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

A função de domínio descreve a regra do negócio com `order.fulfill()` e deixa a
mecânica do banco para a camada acima, que abre a unidade de trabalho, chama o
caso de uso e confirma. O `commit` é atômico: se uma escrita falhar, todas
voltam.

</details>

Em projeto pequeno, a unidade de trabalho já vem pronta no **ORM**
(Object-Relational Mapping · Mapeamento Objeto-Relacional) que você usa. Em
Entity Framework, o `DbContext` cumpre esse papel; em SQLAlchemy, a `Session`; em
Sequelize, a `transaction` passada como contexto. Escrever uma classe própria em
cima dessa camada compensa quando o domínio cresce a ponto de um caso de uso
precisar coordenar várias mudanças.

## Esperar na fila ou conferir a versão na hora de gravar

Duas transações mexendo no mesmo registro ao mesmo tempo é o problema clássico, e
há duas formas de resolver. A escolha depende de quanto o conflito acontece.

**Pessimismo** (`SELECT ... FOR UPDATE`): a transação reserva o registro para si
até o `commit`, e quem chegar depois espera na fila. Serve para conflito
frequente com leitura curta, onde a espera compensa a garantia. Exemplo: estoque
em promoção relâmpago, contador de assentos em voo lotado.

**Otimismo** (campo `version` incrementado a cada escrita): a transação lê o
registro com a versão atual, faz o trabalho em memória e, na hora de gravar,
confere se a versão continua a mesma. Se mudou, a escrita falha e o caso de uso
decide entre tentar de novo ou avisar o usuário do conflito. Serve para conflito
raro e processamento demorado, onde manter o registro bloqueado seria
desperdício.

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

O conflito acontece na janela entre `findById` e `save`. Sem bloqueio nem versão,
o segundo gravador sobrescreve o primeiro sem perceber que o estado mudou no
meio. Esse é o **lost update** (atualização perdida).

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

O `UPDATE` só altera a linha se a versão no banco for igual à que foi lida.
Quando dois pedidos competem, um vence e o outro recebe
`ConcurrencyConflictError`. Quem chamou decide o rumo: tentar de novo, lendo o
estado atualizado, ou devolver o erro como conflito de negócio.

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
mesmo assento esperam até o commit. Se o passageiro completar a compra, o segundo
recebe `SeatUnavailableError`; se desistir, o segundo entra. A fila é curta
porque o caso de uso é curto: reservar o assento não inclui pagar por ele.

</details>

Regra de decisão prática:

- **Pessimista** quando o conflito é provável (estoque, assento, horário de
  agenda), quando o processamento é rápido, quando perder uma operação dói menos
  do que conviver com inconsistência.
- **Otimista** quando o conflito é raro (perfil de usuário, configuração,
  documento editado por uma pessoa por vez), quando o caso de uso pode demorar
  (formulário longo, integração com sistema externo), quando tentar de novo sai
  barato.

Cada caso de uso escolhe uma das duas estratégias e a mantém do início ao fim da
transação. Alternar entre elas no mesmo fluxo aumenta a chance de deadlock.

## Quanto uma transação enxerga do trabalho das outras

O **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) define
quatro níveis de isolamento, e cada um decide o quanto uma transação enxerga do
trabalho ainda em curso das outras. Comece pelo padrão do banco: PostgreSQL e SQL
Server entregam Read Committed, que atende à maior parte dos casos.

| Nível            | O que evita                                     | Quando faz sentido                                                                                  |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Read Uncommitted | Nada (permite dirty read)                       | Quase nunca; tolerância a dado provisório em métrica não crítica                                    |
| Read Committed   | Dirty read                                      | Default da maioria dos casos; leitura sempre vê estado confirmado                                   |
| Repeatable Read  | Dirty read + non-repeatable read                | Relatório longo que lê os mesmos dados várias vezes e precisa ver o mesmo valor                     |
| Serializable     | Dirty read + non-repeatable read + phantom read | Operação onde a ordem precisa ser equivalente a uma execução sequencial; mais lento, mais conflitos |

Duas leituras do mesmo dado que trazem valores diferentes na mesma transação são
o **non-repeatable read** (leitura não repetível). Uma segunda consulta que
encontra linhas novas que não existiam na primeira é o **phantom read** (leitura
fantasma).

Suba o nível apenas quando aparecer um bug concreto de leitura inconsistente, e
mesmo assim confira antes se a causa era transação longa demais ou agregado mal
modelado.

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

`SERIALIZABLE` impede que uma compra ou um reembolso entre no meio do cálculo. O
preço: cada nova venda concorrente conflita com o relatório, e o sistema inteiro
gargala. O problema de fundo continua de pé, porque o relatório lê dados que
ainda vão mudar. O mês corrente não terminou, e nível de isolamento alto não
muda esse fato.

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

O fechamento mensal vira um evento explícito do domínio. O relatório consulta o
**snapshot** (retrato do estado em um instante) já calculado e congelado, e o
nível de isolamento volta ao padrão do banco.

</details>

Quando subir de fato compensa:

- Operação financeira curta que lê e grava sobre o mesmo conjunto de linhas
  (Serializable evita o phantom read).
- Relatório que roda em uma janela curta e precisa ver o mesmo estado em vários
  `SELECT` consecutivos (Repeatable Read).

Fora esses casos, o default do banco atende ao código de negócio.

<a id="long-running-saga"></a>

## Operações longas viram sequência de passos curtos

Transação ACID resolve problemas curtos, dentro de um banco, em um agregado. Uma
operação com várias etapas, sistemas externos ou tempo de espera (segundos,
minutos, horas) trava o sistema se ficar dentro de uma transação aberta. O padrão
para esses casos é a saga: uma sequência de transações locais coordenadas, cada
uma com sua compensação.

A saga aparece em dois formatos:

**Choreography** (coreografia): cada serviço escuta eventos e reage por conta
própria, sem coordenador central. O acoplamento acontece pelo contrato do evento.
Serve para fluxos com poucas etapas e regras estáveis. Exemplo: pedido pago
publica `OrderSettled` → módulo de estoque reserva → publica `StockReserved` →
módulo de entrega agenda.

**Orchestration** (orquestração): um coordenador comanda os passos. Ele conhece o
fluxo inteiro, envia um comando a cada passo e aciona a compensação explícita
quando um passo falha. Serve para fluxos longos com muitas etapas e regras de
cancelamento. Exemplo: aprovação de empréstimo em sete passos.

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

A chamada ao **gateway** (serviço externo que processa o pagamento) pode levar
segundos, e durante todo esse tempo a transação segura o pedido bloqueado no
banco. O sistema fica lento sob carga. Se o gateway responder depois do timeout
do banco, a transação é abortada e o pagamento já processado fica órfão.

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

Cada passo é uma transação curta, e o pagamento acontece fora do banco. A falha
do gateway aciona `CancelOrder`, que é a compensação. O sistema continua
respondendo durante as chamadas longas, e o bloqueio no banco dura só o momento
do `save`.

</details>

Quatro pontos importantes sobre saga:

- **Cada passo é idempotente**. Um passo pode chegar duas vezes, e o handler
  precisa reconhecer o estado já aplicado e ignorar a repetição. Ver
  [`backend-flow.md`](backend-flow.md#job-idempotency) para o padrão de
  chave.
- **Cada passo tem compensação**. Além do `try/catch`, é preciso desenhar a ação
  que desfaz o efeito no domínio. A compensação de "cobrar" é "reembolsar".
- **O estado da saga é explícito**. Em orquestração, o coordenador persiste em
  qual etapa está. Em coreografia, o estado vive no agregado
  (`Order.status = "awaiting_payment" → "settled"`).
- **A espera humana faz parte do fluxo**. Aprovação manual, nova tentativa com
  espera progressiva, encaminhamento para o suporte. A saga acomoda esses casos
  porque cada estado tem nome.

Sobre **2PC**: o protocolo existe e raramente é a resposta. Ele amarra a
disponibilidade do sistema à do recurso mais lento, exige um coordenador
transacional ativo, e os bancos modernos desencorajam seu uso em fluxos novos.
Quando ele aparece como tentação, o sinal é outro: dois agregados que deveriam
ser um, ou uma regra que deveria virar saga.

## Quando o outro agregado só atualiza depois

Duas escritas em agregados separados alcançam consistência com um intervalo entre
elas. Aceitar esse intervalo sai mais barato do que disfarçá-lo com 2PC ou
bloqueio distribuído.

O **outbox** é a ferramenta que sustenta essa coordenação sem perder evento no
caminho. A regra: na mesma transação que persiste o agregado, gravar o evento na
tabela `outbox`. Um **worker** (processo separado que roda em segundo plano) lê o
outbox e publica no broker. Se a publicação falhar, o evento continua no outbox
para a próxima tentativa. Se o **consumer** (quem consome a mensagem) falhar, ele
recebe a mensagem de novo, porque a entrega é **at-least-once** (ao menos uma
vez), e a idempotência cobre a repetição.

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
existe no banco e ninguém é notificado: o estoque não reserva, a entrega não
agenda, o e-mail não sai. Inverter a ordem piora: o evento sai pelo broker
enquanto o banco ainda não persistiu, e o consumer tenta ler um pedido que ainda
não está lá.

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

O `save` é atômico: grava pedido e eventos juntos, ou nenhum dos dois. Um worker
separado lê o `outbox`, publica no broker e marca o evento como publicado. A
falha em qualquer etapa é recuperável, porque o evento permanece no outbox até
ser entregue. Detalhes do worker em
[`backend-flow.md`](backend-flow.md#outbox-pattern).

</details>

Esse intervalo aparece na **UI** (User Interface · Interface do Usuário): logo
após o `POST /orders`, o usuário ainda pode não ver os efeitos no `Customer` ou
no estoque. Duas abordagens:

- **Estado intermediário visível**. Pedido confirmado, com um selo de
  "processando". Quando o handler do estoque concluir, o selo some.
- **Otimismo na UI**. O frontend assume o estado final e o exibe de imediato; o
  backend corrige se algo der errado. O custo: um erro raro vira uma correção
  visível na tela.

Modelar o estado intermediário no agregado (`status = "processing"` →
`"confirmed"`) costuma ser o caminho mais claro. O usuário entende que o pedido
foi aceito e que o restante ainda vai acontecer, e a tela reflete o que o backend
tem de fato.

## Desfazer o que já saiu do banco

`ROLLBACK` alcança as mudanças no banco. E-mail enviado, pagamento processado,
notificação push disparada, vídeo gerado: esses efeitos já saíram e continuam de
pé depois do rollback. Quando o caso de uso passou de um agregado, ou passou pelo
broker, a forma de desfazer é a compensação semântica: uma operação do domínio
que anula o efeito anterior.

Dentro de uma transação ACID, confie no `ROLLBACK` para tudo. Fora dela, modele a
compensação como ação do domínio. "Cancelar pedido pago" é uma operação com nome
próprio, regras próprias e, quando for o caso, ação contra terceiros (o
reembolso).

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

Se `paymentGateway.charge` falhar depois de `emailService.sendOrderConfirmation`,
o e-mail já chegou ao cliente. Apagar o pedido no banco deixa o e-mail de pé: o
cliente tem na caixa de entrada a confirmação de um pedido que o sistema não tem
mais.

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
pré-condições explícitas e evento próprio. O handler de e-mail escuta
`OrderCancelled` e dispara o e-mail de cancelamento. Cada estado do pedido fica
descrito no domínio.

</details>

## Anti-patterns

**Cross-aggregate transaction**. Uma transação tentando manter dois agregados
consistentes. Sintoma: `findById` e `save` de dois repositórios diferentes dentro
do mesmo `BEGIN`/`COMMIT`. Tratamento: separar em duas transações e coordenar por
evento; ou rever a modelagem, se a invariante de fato atravessa os dois.

**Long-lived transaction**. Transação aberta durante chamada externa (HTTP,
gateway, fila), aprovação humana ou processamento longo. Sintoma: registro
bloqueado por minutos; deadlocks crescentes; relatórios sob `SERIALIZABLE`
disputando com escritas. Tratamento: fechar a transação no fim de cada passo
curto e modelar o passo longo como saga.

**Transação como controle de fluxo**. Usar `try/catch` em volta de
`transaction.commit` como se fosse um `if`. Sintoma: o `catch` decide rumo de
negócio em vez de tratar erro técnico. Tratamento: validar as pré-condições antes
de abrir a transação e deixar o `catch` cuidar só de erro de infraestrutura.

**Distributed 2PC**. Tentativa de tornar atômica uma escrita em dois bancos, ou
em banco e broker. Sintoma: discussão sobre coordenador transacional, XA,
`prepare`/`commit`. Tratamento: outbox mais idempotência.

**Subir isolation level sem entender o sintoma**. Trocar o default por
`SERIALIZABLE` porque "estava dando inconsistência". Sintoma: nada melhora, a
vazão cai, conflitos aparecem onde antes não havia. Tratamento: investigar a
causa real (transação longa, agregado mal desenhado, ausência de versão) em vez
de esconder o problema atrás de um nível mais estrito.

**Locking pessimista em caminho quente**. `SELECT ... FOR UPDATE` em fluxo de
alta concorrência onde o conflito é raro. Sintoma: fila no banco, usuários
esperando, vazão em queda. Tratamento: trocar por bloqueio otimista com `version`
e tentar de novo no caso de uso quando o conflito for esperado.

**Rollback como desfeito universal**. Esperar que o `ROLLBACK` corrija efeito que
já saiu do sistema (e-mail enviado, pagamento processado, mensagem publicada).
Sintoma: pedido apagado e cliente com a confirmação na caixa de entrada; estoque
devolvido e terceiro já com o produto a caminho. Tratamento: compensação
semântica como operação do domínio, com nome próprio.

**Outbox manual sem worker**. Gravar o evento na tabela e publicar inline no
mesmo request. Sintoma: o "outbox" vira tabela morta e a publicação continua
sendo o ponto de falha. Tratamento: um worker separado, dedicado a publicar; o
request termina assim que o save completa.

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
[`REFERENCES.md`](../../../REFERENCES.md#ddd-and-domain-modeling).
