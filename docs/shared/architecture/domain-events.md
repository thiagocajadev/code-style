# Eventos de domínio

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão de evento como peça do domínio. As regras aqui valem para qualquer linguagem orientada a objetos ou que aceite a abstração de **event** (evento) como contrato entre partes do sistema.

Um evento registra um fato que já aconteceu, e quem o registra é o agregado que executou a operação. A partir dessas duas frases sai o resto desta página: quando criar um evento; quem publica; o que mora no payload; como nomear; o que muda quando o consumidor vive em outro processo.

O que fica de fora: persistência específica (drivers, filas) vive em [`../platform/messaging.md`](../platform/messaging.md); o lado transacional (como gravar o evento sem perder no caminho) vive em [`transactions.md`](transactions.md); a propagação operacional (worker, nova tentativa, DLQ) vive em [`backend-flow.md`](backend-flow.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **event** (evento) | Fato que aconteceu no passado, registrado pelo agregado como parte do estado da operação |
| **domain event** (evento de domínio) | Evento que circula dentro do mesmo **bounded context** (contexto delimitado); contrato interno, que evolui junto com o código |
| **integration event** (evento de integração) | Evento que atravessa o limite do sistema ou do contexto; contrato público, versionado, estável |
| **aggregate root** (raiz do agregado) | Entidade que comanda o agregado; ponto que registra os eventos durante as operações de escrita |
| **event handler** (processador de evento) | Função ou objeto que recebe um evento e executa a reação correspondente |
| **event bus** (barramento de eventos) | Componente que entrega os eventos publicados aos handlers registrados; pode rodar no mesmo processo, em fila ou em broker externo |
| **publish/subscribe** (pub/sub · publicar e assinar) | Padrão onde o produtor emite sem conhecer os consumidores, e cada consumidor assina o que lhe interessa |
| **outbox** (caixa de saída) | Tabela no banco do agregado, gravada na mesma transação, que serve de fila persistente para a publicação |
| **payload** (carga útil) | Dados que o evento carrega; IDs e campos essenciais bastam |
| **schema versioning** (versionamento de esquema) | Disciplina de evoluir o formato do payload sem quebrar consumidores antigos (V1 e V2 coexistem) |
| **at-least-once delivery** (entrega ao menos uma vez) | Garantia de que o evento chega pelo menos uma vez; ele pode chegar mais vezes, e por isso o handler é idempotente |
| **idempotency** (idempotência) | Propriedade do handler de aplicar o mesmo evento várias vezes com o mesmo resultado |
| **DLQ** (Dead Letter Queue · fila de mensagens com falha persistente) | Fila para eventos que falharam em todas as tentativas; permite inspeção manual sem travar o consumidor |
| **eventual consistency** (consistência eventual) | O estado entre agregados converge com o tempo depois do evento, com um intervalo de propagação no meio |
| **choreography** (coreografia) | Cada serviço reage a eventos sem coordenador central; o acoplamento acontece pelo contrato do evento |
| **orchestration** (orquestração) | Um coordenador comanda os passos da operação; cada serviço recebe um comando e responde |
| **event sourcing** (registro por eventos) | Padrão onde o estado do agregado é derivado da sequência de eventos; fora do escopo deste guia |

---

## Dois tipos de evento: interno e de integração

O consumidor decide o tipo. Quando ele vive no mesmo processo que o produtor, o evento é de domínio. Quando ele atravessa o limite do processo ou do contexto, o evento é de integração. Misturar os dois em um objeto só gera uma dor específica, e a seção mostra qual.

**Domain event** circula dentro do mesmo bounded context. O schema é interno, evolui junto com o domínio, e os consumidores são módulos da mesma aplicação. Quando o agregado `Order` publica `OrderSettled`, quem reage (estoque, e-mail, métrica) faz parte do mesmo modelo de domínio. Trocar um campo de `OrderSettled` obriga a tocar nos consumidores, e todos eles vivem no mesmo repositório, com o mesmo deploy.

**Integration event** atravessa o limite. O schema é contrato público, evolui com cuidado, e os consumidores podem ser outros serviços, parceiros ou jobs externos. Um `OrderSettled` que vai para o sistema de **BI** (Business Intelligence · inteligência de negócio) ou para um **ERP** (Enterprise Resource Planning · sistema integrado de gestão) parceiro vira contrato. Mudar o formato sem versionar quebra uma integração que talvez nem esteja no seu radar.

<details>
<summary>❌ Ruim: o mesmo evento atende uso interno e externo, schema vai engordando</summary>

```js
class OrderSettled {
  constructor(order) {
    this.orderId = order.id;
    this.customerId = order.customerId;
    this.total = order.total;
    this.items = order.items;
    this.customer = order.customer;
    this.payment = order.payment;
    this.shippingAddress = order.shippingAddress;
    this.notes = order.notes;
    this.metadata = order.metadata;
  }
}

eventBus.publish(new OrderSettled(order));
analyticsBroker.publish(new OrderSettled(order));
```

O mesmo objeto serve de contrato interno (handler de e-mail, handler de estoque) e externo (BI, parceiro). Cada campo novo entra para atender a um dos consumidores e chega aos outros de carona. Quando o parceiro reclama de um payload de 80 KB, ninguém sabe dizer quem precisa de qual campo.

</details>

<details>
<summary>✅ Bom: domain event interno, integration event derivado e enxuto</summary>

```js
class OrderSettled {
  constructor({ orderId, customerId, total, settledAt }) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.settledAt = settledAt;
  }

  static from(order) {
    const event = new OrderSettled({
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      settledAt: order.settledAt,
    });

    return event;
  }
}

class OrderSettledIntegrationV1 {
  constructor({ orderId, customerId, total, currency, settledAt }) {
    this.eventVersion = 1;
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.currency = currency;
    this.settledAt = settledAt;
  }

  static from(order) {
    const event = new OrderSettledIntegrationV1({
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      currency: order.currency,
      settledAt: order.settledAt,
    });

    return event;
  }
}

eventBus.publish(OrderSettled.from(order));
integrationBus.publish(OrderSettledIntegrationV1.from(order));
```

O evento de domínio fica curto e evolui livre. O evento de integração ganha o campo `eventVersion`, a moeda explícita e um contrato versionado. Cada um muda no seu próprio ritmo.

</details>

Na prática: o produtor publica o domain event durante a operação, e um handler interno traduz esse evento para o integration event e o publica no canal externo. Esse handler é a **anti-corruption layer** (camada anticorrupção: peça que protege o modelo interno do contrato público). Detalhes em [`patterns.md`](patterns.md).

## Quem dispara o evento é a aggregate root

O aggregate root é o único que registra eventos. O evento nasce no método do agregado que executa a operação, porque é ali que o estado muda e a invariante é verificada.

O agregado mantém uma lista interna de eventos pendentes (`this.events`). Cada método de domínio que altera estado adiciona o evento correspondente. Quando o caso de uso termina, o repositório lê essa lista, grava na outbox (ou no event bus, se ele roda no mesmo processo e de forma síncrona) e limpa a lista.

<details>
<summary>❌ Ruim: serviço publica evento direto, sem passar pelo agregado</summary>

```js
class OrderService {
  async place(orderInput) {
    const order = new Order(orderInput);
    await this.orderRepository.save(order);

    await this.eventBus.publish(new OrderPlaced(order));
  }

  async cancel(orderId) {
    const order = await this.orderRepository.findById(orderId);
    order.status = "cancelled";
    await this.orderRepository.save(order);

    await this.eventBus.publish(new OrderCancelled(order));
  }
}
```

A regra "se cancelou, publica evento" mora no serviço, em paralelo com a regra "se cancelou, muda status". Toda nova ação que altera o pedido precisa lembrar de publicar. Quem fizer `order.status = "cancelled"` fora do serviço (em script de migração, em correção manual) deixa o evento órfão; quem publicar `OrderCancelled` por outro caminho deixa o estado divergente.

</details>

<details>
<summary>✅ Bom: agregado registra o evento na operação</summary>

```js
class Order {
  constructor({ id, customerId, items = [], status = "pending" }) {
    this.id = id;
    this.customerId = customerId;
    this.items = items;
    this.status = status;
    this.events = [];
  }

  static place({ id, customerId, items }) {
    const order = new Order({ id, customerId, items, status: "pending" });
    order.events.push(OrderPlaced.from(order));

    return order;
  }

  cancel(reason) {
    if (this.status === "cancelled") {
      throw new Error("Order is already cancelled");
    }
    if (this.status === "shipped") {
      throw new Error("Cannot cancel a shipped order");
    }

    this.status = "cancelled";
    this.cancellationReason = reason;
    this.events.push(OrderCancelled.from(this));
  }
}

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
}
```

Mudança de status e registro do evento acontecem na mesma linha de código, dentro do agregado. As duas coisas passaram a ser uma regra só, garantida pelo construtor e pelos métodos de operação.

</details>

O ganho aparece nos casos de uso seguintes. Adicionar `order.refund()` já coloca `OrderRefunded` em `events`; o repositório persiste; o worker publica. O agregado é a única fonte de verdade, e o serviço fica livre de manter uma lista paralela.

## Publicar só depois do commit

O evento vira público depois que a transação do agregado confirma. Publicar antes do commit aposta que a transação vai concluir. Publicar fora da transação aposta que o broker não vai falhar. As duas apostas falham em produção com frequência alta o bastante para doer.

O **outbox** resolve os dois casos: o evento é gravado no banco, na mesma transação que persiste o agregado. Um worker separado lê o outbox e publica no broker. Se o worker ou o broker falhar, o evento continua no outbox para a próxima tentativa. Se o consumer falhar, a entrega é at-least-once e a idempotência cobre a repetição.

<details>
<summary>❌ Ruim: publish síncrono dentro da transação</summary>

```js
class OrderRepository {
  async save(order) {
    const transaction = await this.database.beginTransaction();

    try {
      await this.persistOrder(order, transaction);

      for (const event of order.events) {
        await this.eventBus.publish(event);
      }

      await transaction.commit();

      order.events = [];
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

O `publish` mora dentro do `try`. Se o broker estiver lento, a transação segura o registro bloqueado no banco enquanto espera a rede. Se o `commit` falhar depois do publish, o evento já saiu e o agregado não persistiu: o consumer recebe `OrderPlaced` de um pedido que não existe.

</details>

<details>
<summary>✅ Bom: evento na mesma transação, publicação assíncrona pelo worker</summary>

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

  async persistEvents(events, transaction) {
    for (const event of events) {
      await transaction.execute(
        `INSERT INTO outbox
         (
           id,
           type,
           payload,
           created_at,
           status
         )
         VALUES
           ($1, $2, $3, NOW(), 'pending')`,
        [event.id, event.type, JSON.stringify(event.payload)],
      );
    }
  }
}

class OutboxPublisher {
  async run() {
    const pendingEvents = await this.outboxRepository.findPending({ limit: 100 });

    for (const event of pendingEvents) {
      try {
        await this.eventBus.publish(event);
        await this.outboxRepository.markAsPublished(event.id);
      } catch (error) {
        await this.outboxRepository.recordFailure(event.id, error.message);
      }
    }
  }
}
```

A transação do agregado fecha rápido, sem depender do broker. O worker publica em outro processo, e a falha do broker fica isolada ali, longe da operação que disparou o evento. Detalhes do worker (intervalo de leitura, tamanho do lote, nova tentativa com espera progressiva) em [`backend-flow.md`](backend-flow.md#outbox-pattern).

</details>

Em sistema pequeno, o event bus pode rodar no mesmo processo, de forma síncrona, com os handlers executando logo após o commit. A regra continua valendo: a publicação acontece **depois** do commit. Em Node.js, `await transaction.commit(); for (const event of events) await eventBus.dispatch(event);` resolve. Em sistema maior, o outbox vira necessário, porque cada handler vive em um processo separado e a fila precisa sobreviver a quedas.

## O nome do evento é um fato no passado

O nome do evento descreve algo que aconteceu: verbo no passado, sem comando. `OrderPlaced` narra um fato. `PlaceOrder` expressa uma intenção, e vira **command** (comando). A distinção organiza o sistema inteiro, porque um comando pode ser rejeitado e um fato consumado não.

A regra prática:

- **Verbo no passado**: `Placed`, `Cancelled`, `Refunded`, `Shipped`, `Settled`. Em inglês, particípio passado.
- **Sujeito do domínio**: `Order`, `Customer`, `Invoice`. Evitar `Entity`, `Record` ou `Item` genérico.
- **Sem auxiliar técnico**: evitar `OrderUpdatedEvent`, `CustomerSavedEvent`. O sufixo `Event` é ruído, porque o contexto já diz do que se trata.
- **Específico sempre que possível**: `OrderUpdated` esconde o que mudou. Quebrar em `OrderAddressChanged`, `OrderItemAdded`, `OrderItemRemoved`. Cada um carrega uma regra distinta.

<details>
<summary>❌ Ruim: nomes genéricos no presente, com ruído técnico</summary>

```js
class UpdateOrder {
  constructor(order) {
    this.order = order;
  }
}

class OrderDataChangedEvent {
  constructor(order) {
    this.order = order;
  }
}

class SaveOrderEvent {
  constructor(order) {
    this.order = order;
  }
}

eventBus.publish(new UpdateOrder(order));
eventBus.publish(new SaveOrderEvent(order));
```

`UpdateOrder` tem nome de comando. `OrderDataChangedEvent` carrega `Data` (vago) e `Event` (redundante). `SaveOrderEvent` mistura o vocabulário do banco (`save`) com o do domínio. Nenhum dos três diz o que aconteceu de fato.

</details>

<details>
<summary>✅ Bom: nomes no passado, sem ruído, descritivos</summary>

```js
class OrderPlaced {
  constructor({ orderId, customerId, total, placedAt }) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.placedAt = placedAt;
  }
}

class OrderAddressChanged {
  constructor({ orderId, previousAddress, currentAddress, changedAt }) {
    this.orderId = orderId;
    this.previousAddress = previousAddress;
    this.currentAddress = currentAddress;
    this.changedAt = changedAt;
  }
}

class OrderItemAdded {
  constructor({ orderId, productId, quantity, unitPrice, addedAt }) {
    this.orderId = orderId;
    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
    this.addedAt = addedAt;
  }
}
```

Cada nome conta uma história: alguém colocou um pedido; alguém trocou o endereço; alguém adicionou um item. O log de eventos passa a narrar a operação de negócio em linguagem que o time de produto entende.

</details>

Em projeto que cresce, o nome do evento vira parte da **ubiquitous language** (linguagem ubíqua: o vocabulário que produto, suporte e engenharia usam para falar da mesma coisa). Todos dizem `OrderPlaced` e todos entendem o mesmo fato. Nomes técnicos como `OrderRecordSaved` fragmentam essa conversa.

## O payload é pequeno, versionado e não muda depois

O payload é o contrato do evento. Três princípios ditam o desenho:

**Pequeno**. IDs e os campos essenciais para identificar o que aconteceu e quando. Quem precisar de mais detalhes resolve o ID e consulta o banco no momento de usar. Carregar o agregado completo cria três problemas: payload pesado no broker, schema acoplado à estrutura interna do agregado, e dado defasado, porque o evento foi gravado em um momento, o consumer lê em outro, e o agregado já mudou.

**Versionado**. Eventos de integração ganham o campo `eventVersion`. Uma mudança no payload gera uma versão nova (`V2`), e a versão antiga fica em circulação até os consumers migrarem. Eventos de domínio admitem menos rigor, porque a mudança é coordenada no mesmo deploy, e mesmo assim versionar cedo economiza trabalho no dia em que o evento interno virar contrato externo.

**Não muda depois de publicado**. Corrigir um evento antigo significa emitir um evento novo (`OrderCorrected`). O histórico preservado é o que torna possível auditar, reprocessar e depurar: ele conta o que aconteceu em cada instante, e o estado atual conta apenas onde tudo parou.

<details>
<summary>❌ Ruim: payload carrega o agregado inteiro</summary>

```js
class OrderSettled {
  constructor(order) {
    this.order = order;
  }
}

eventBus.publish(new OrderSettled(order));

class StockReservationHandler {
  async on(event) {
    for (const item of event.order.items) {
      await this.stockRepository.reserve(item.productId, item.quantity);
    }
  }
}
```

O handler depende do formato interno de `Order`. Quando o agregado ganha um campo, o evento engorda. Quando o agregado é refatorado, o consumer quebra. O contrato implícito virou "tudo que `Order` tiver hoje", e esse contrato muda a cada sprint.

</details>

<details>
<summary>✅ Bom: payload com IDs e dados essenciais, schema explícito e versionado</summary>

```js
class OrderSettledV1 {
  constructor({ eventId, eventVersion, orderId, customerId, total, currency, settledAt }) {
    this.eventId = eventId;
    this.eventVersion = eventVersion;
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.currency = currency;
    this.settledAt = settledAt;
  }

  static from(order) {
    const event = new OrderSettledV1({
      eventId: OrderSettledV1.generateId(),
      eventVersion: 1,
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      currency: order.currency,
      settledAt: order.settledAt,
    });

    return event;
  }
}

class StockReservationHandler {
  async on(event) {
    const orderItems = await this.orderRepository.findItemsByOrderId(event.orderId);

    for (const orderItem of orderItems) {
      await this.stockRepository.reserve(orderItem.productId, orderItem.quantity);
    }
  }
}
```

O payload tem só o que basta para o consumer reagir, e quem precisar dos itens consulta o agregado pelo ID. O contrato é o construtor de `OrderSettledV1`, e qualquer mudança passa por `OrderSettledV2` ou por retrocompatibilidade explícita.

</details>

Migrar o schema sem quebrar consumers segue duas regras:

- **Adicionar campo é seguro**. Consumers antigos ignoram o campo novo.
- **Remover ou renomear campo exige versão nova**. `OrderSettledV2` substitui `OrderSettledV1`; o produtor publica os dois durante a janela de migração; cada consumer escolhe qual escutar; quando todos migrarem, `V1` é desligado.

## Cada handler falha sozinho

Cada handler é uma unidade independente, com nova tentativa, falha e estado próprios. A falha de um handler não alcança os outros. Sem esse isolamento, o que existe é uma cadeia de chamadas acopladas com nome de evento.

Três regras concretas:

**Idempotência**. O handler recebe entrega at-least-once, então pode receber o mesmo evento duas vezes. Ele verifica antes de aplicar: o evento já foi processado? Se sim, ignora. Uma tabela `processed_events(handler_name, event_id)` ou uma flag no estado do consumer resolvem.

**Sem efeito cruzado**. O handler não chama outro handler nem escreve direto no agregado de outro handler. Quando a reação gera um fato novo do domínio, ele publica um evento novo e deixa outro handler reagir.

**Falha isolada do produtor**. Se o handler de e-mail falhar, o pedido continua pago. A falha do handler vai para nova tentativa e, depois de N tentativas, para a DLQ.

<details>
<summary>❌ Ruim: handler chama outro handler em cadeia síncrona</summary>

```js
class OrderSettledHandler {
  async on(event) {
    await this.stockHandler.reserveItems(event.order);
    await this.shippingHandler.scheduleDelivery(event.order);
    await this.emailHandler.sendConfirmation(event.order);
    await this.analyticsHandler.trackRevenue(event.order);
  }
}
```

Quatro responsabilidades acopladas em um handler só. Se o e-mail falhar, estoque, entrega e analytics já rodaram, e mesmo assim o handler inteiro volta para nova tentativa: as quatro ações repetem. Sem idempotência forte em cada uma, o estoque é reservado em dobro.

</details>

<details>
<summary>✅ Bom: cada handler isolado, idempotente, com retry próprio</summary>

```js
class StockReservationHandler {
  constructor(stockRepository, processedEventsRepository) {
    this.stockRepository = stockRepository;
    this.processedEventsRepository = processedEventsRepository;
  }

  async on(event) {
    const wasProcessed = await this.processedEventsRepository.exists(
      "StockReservationHandler",
      event.eventId,
    );

    if (wasProcessed) {
      return;
    }

    const orderItems = await this.orderRepository.findItemsByOrderId(event.orderId);

    for (const orderItem of orderItems) {
      await this.stockRepository.reserve(orderItem.productId, orderItem.quantity);
    }

    await this.processedEventsRepository.record(
      "StockReservationHandler",
      event.eventId,
    );
  }
}

class OrderConfirmationEmailHandler {
  async on(event) {
    const wasSent = await this.emailLog.exists("OrderConfirmation", event.orderId);

    if (wasSent) {
      return;
    }

    await this.emailService.send({
      template: "order-confirmation",
      to: event.customerEmail,
      data: { orderId: event.orderId, total: event.total },
    });

    await this.emailLog.record("OrderConfirmation", event.orderId);
  }
}
```

Cada handler tem a própria checagem de idempotência e falha por conta própria. O event bus reentrega apenas para quem falhou, e quem já passou fica de fora da repetição. A falha do e-mail deixa a reserva de estoque de pé.

</details>

Quando um handler precisa disparar outra ação do domínio, o caminho é `ler o evento → emitir um comando → outro agregado executa → publicar o próximo evento`. Um handler nunca chama outro handler direto.

## O estado intermediário aparece na tela

Dois agregados que conversam por evento alcançam consistência com um intervalo entre as duas escritas. Esse intervalo existe, e o trabalho é modelá-lo de forma que o sistema conte a verdade durante a propagação.

O intervalo costuma ser de milissegundos a segundos em sistema saudável. Sob carga, pode chegar a minutos. Com falha, a horas. Em todos os casos, três abordagens cobrem o usuário:

- **Estado intermediário no agregado**. `status = "awaiting_confirmation" → "confirmed"`. A tela mostra "processando" enquanto o evento não chegou, e "confirmado" quando o handler atualizou.
- **Otimismo na UI**. O frontend assume o resultado final e atualiza a tela de imediato; o backend corrige se algo der errado. Funciona quando o erro é raro e a correção é tolerável.
- **Consulta periódica**. O frontend pergunta ao backend a cada N segundos. O custo é tráfego extra; o ganho é uma consistência percebida mais firme.

<details>
<summary>❌ Ruim: agregado finge consistência instantânea, UI engana o usuário</summary>

```js
class Order {
  static place(input) {
    const order = new Order({ ...input, status: "confirmed" });
    order.events.push(OrderPlaced.from(order));

    return order;
  }
}
```

O `status` nasce como `"confirmed"` no momento do `place`. O usuário lê "pedido confirmado" na hora, e o estoque ainda nem foi verificado. Quando o handler de estoque rejeitar por falta de disponibilidade, o pedido vira `cancelled` segundos depois, e a tela mostrou uma confirmação que o sistema não tinha como dar.

</details>

<details>
<summary>✅ Bom: estado intermediário explícito, UI espelha a verdade</summary>

```js
class Order {
  static place(input) {
    const order = new Order({ ...input, status: "awaiting_confirmation" });
    order.events.push(OrderPlaced.from(order));

    return order;
  }

  confirm() {
    if (this.status !== "awaiting_confirmation") {
      throw new Error(`Cannot confirm order in status ${this.status}`);
    }

    this.status = "confirmed";
    this.events.push(OrderConfirmed.from(this));
  }

  rejectDueToStockShortage() {
    if (this.status !== "awaiting_confirmation") {
      throw new Error(`Cannot reject order in status ${this.status}`);
    }

    this.status = "rejected";
    this.events.push(OrderRejected.from(this));
  }
}
```

O caso de uso devolve um pedido `awaiting_confirmation`, e a tela exibe "verificando disponibilidade". Quando o handler de estoque concluir, ele chama `confirm()` ou `rejectDueToStockShortage()`, e cada um publica o evento correspondente. O usuário vê em cada instante o estado que o sistema tem de fato.

</details>

## Coordenação: cada um reage ou um coordenador comanda

Quando vários handlers reagem em sequência para completar uma operação maior, dois estilos de coordenação aparecem. A complexidade do fluxo decide qual usar.

**Choreography**. Cada serviço escuta o evento e reage, sem coordenador. O fluxo emerge da soma dos handlers. Serve para fluxos curtos (3 a 5 passos), estáveis, com regras de cancelamento simples. O acoplamento acontece pelo contrato do evento, e cada serviço é autônomo.

**Orchestration**. Um coordenador comanda os passos. Ele conhece o fluxo inteiro, mantém o estado e decide o próximo comando. Serve para fluxos longos (7 passos ou mais), com regras de compensação variadas e pontos de espera (aprovação humana, timeout, nova tentativa programada).

| Critério | Choreography | Orchestration |
|---|---|---|
| Quem conhece o fluxo | Ninguém individualmente; está implícito | O orquestrador, explícito |
| Adicionar passo novo | Adiciona handler que escuta evento existente | Adiciona passo no orquestrador, redeploy |
| Debugging | Mais difícil (ver por que algo não rodou exige correlation ID) | Mais fácil (orquestrador loga cada passo) |
| Acoplamento | Por contrato de evento | Por contrato de comando |
| Bom para | Fluxos curtos e estáveis | Fluxos longos, com pontos de espera |

Combinar os dois é válido: orquestração entre serviços e coreografia dentro de cada serviço. O **correlation ID** citado na tabela (identificador que acompanha a operação por todos os passos) é o que torna possível seguir um fluxo coreografado no log. Detalhes sobre saga, que aparece nos dois estilos, em [`transactions.md`](transactions.md#long-running-saga).

## Anti-patterns

**Naming imperativo**. `SendEmail`, `PlaceOrder`, `UpdateStock` como nome de evento. Sintoma: um handler chamado `SendEmailHandler` recebe `SendEmail`, que é o nome do comando que ele executa. Tratamento: `OrderPlaced` nomeia o evento e `SendOrderConfirmationEmail` nomeia o comando que o handler executa em reação; os dois nomes contam histórias diferentes.

**Payload pesado**. O evento carrega o agregado inteiro. Sintoma: uma alteração interna do `Order` quebra os consumers do evento; o payload chega a 50 KB no broker. Tratamento: IDs e campos essenciais; o consumer resolve o ID e busca o resto.

**Publish dentro da transação**. Evento publicado antes do `commit`. Sintoma: o consumer recebe evento de um agregado que falhou no save; ou a transação segura o registro bloqueado esperando o broker. Tratamento: outbox mais worker.

**Handler que muda o agregado de origem**. `OrderSettledHandler` atualiza o próprio `Order` que disparou o evento. Sintoma: um evento `OrderSettledUpdated` vira ruído e o agregado nunca para de mudar. Tratamento: o agregado já gravou a mudança que disparou o evento, então os handlers reagem em outros agregados ou em sistemas externos.

**Sem versionamento de schema**. O payload muda em produção sem `eventVersion`. Sintoma: consumer antigo quebra; o deploy do produtor passa a exigir deploy coordenado de N consumers. Tratamento: versionar; publicar `V1` e `V2` durante a migração.

**Replay sem idempotência**. Reprocessar o histórico de eventos para reconstruir o estado sem checar duplicata. Sintoma: estoque reservado em dobro, e-mail enviado de novo, receita contada duas vezes no dashboard. Tratamento: idempotência em todo handler, com `processed_events` ou flag no consumer.

**Domain event vazando como integration event**. O evento interno vira contrato público sem passar por um tradutor. Sintoma: uma mudança rotineira do domínio quebra o parceiro externo; refatorar o agregado vira projeto. Tratamento: publicar o domain event no bus interno e deixar um handler dedicado traduzir e publicar o integration event versionado no canal externo.

**Choreography em fluxo de 12 passos**. Operação longa modelada como sucessão de eventos, sem coordenador. Sintoma: ninguém consegue dizer em que passo o fluxo está; depurar exige seguir 12 handlers em ordem; inserir um passo no meio dói. Tratamento: orchestration, com o estado da saga persistido pelo coordenador.

**Handler que chama outro handler direto**. `OrderSettledHandler` invoca `StockReservationHandler.run()` no código. Sintoma: falha em cascata, nova tentativa duplicada, nenhum isolamento. Tratamento: handlers se comunicam por evento.

## Referências

Cross-links dentro do guia:

- [`architecture/entity-modeling.md`](entity-modeling.md): aggregate root, invariantes, ubiquitous language
- [`architecture/transactions.md`](transactions.md): outbox, saga, eventual consistency, compensação semântica
- [`architecture/backend-flow.md`](backend-flow.md): outbox worker, idempotência operacional, DLQ, retry
- [`architecture/patterns.md`](patterns.md): Observer, CQRS, anti-corruption layer
- [`platform/messaging.md`](../platform/messaging.md): brokers, at-least-once, garantias de entrega

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../REFERENCES.md#ddd-and-domain-modeling).
