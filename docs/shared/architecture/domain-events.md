# Eventos de domínio

> Escopo: transversal. Exemplos em JavaScript puro para manter o foco no padrão de evento como peça do domínio. As regras aqui valem para qualquer linguagem orientada a objetos ou que aceite a abstração de **event** (evento) como contrato entre partes do sistema.

Esta página atende a duas pessoas. A primeira está prestes a ligar dois agregados que não cabem na mesma transação e quer saber o formato do evento que vai conectar os dois. A segunda volta para revisitar uma decisão antiga (por exemplo, vale a pena partir um evento grande em dois, ou versionar o payload que vinha sendo expandido ad hoc). As duas saem daqui com critério, não com receita fechada.

O texto cobre cinco perguntas que aparecem cedo em todo sistema que cresce além de um agregado: quando criar um evento; quem é responsável por publicar; o que mora no payload; como nomear; o que muda quando o consumidor vive em outro processo. Persistência específica (drivers, queues) vive em [`../platform/messaging.md`](../platform/messaging.md); o lado transacional (como gravar o evento sem perder no caminho) vive em [`transactions.md`](transactions.md); a propagação operacional (worker, retry, DLQ) vive em [`backend-flow.md`](backend-flow.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **event** (evento) | Fato que aconteceu no passado, registrado pelo agregado como parte do estado da operação |
| **domain event** (evento de domínio) | Evento que circula dentro do mesmo **bounded context** (contexto delimitado); contrato interno, evoluível |
| **integration event** (evento de integração) | Evento que atravessa fronteira de sistema ou contexto; contrato público, versionado, estável |
| **aggregate root** (raiz do agregado) | Entidade que orquestra o agregado; ponto que registra eventos durante operações de escrita |
| **event handler** (processador de evento) | Função ou objeto que recebe um evento e executa a reação correspondente |
| **event bus** (barramento de eventos) | Componente que entrega eventos publicados aos handlers registrados; pode ser in-process, fila ou broker externo |
| **publish/subscribe** (publicar/assinar, pub/sub) | Padrão onde o produtor emite sem conhecer consumidores; consumidores assinam o que interessa |
| **outbox** (caixa de saída) | Tabela no banco do agregado, gravada na mesma transação, que serve de fila persistente para publicação |
| **payload** (carga útil) | Dados que o evento carrega; deve ser pequeno (IDs + campos essenciais), nunca o agregado inteiro |
| **schema versioning** (versionamento de esquema) | Disciplina de evoluir o formato do payload sem quebrar consumidores antigos (V1, V2 coexistem) |
| **at-least-once delivery** (entrega ao menos uma vez) | Garantia de que o evento chega pelo menos uma vez; pode chegar mais, então handler é idempotente |
| **idempotency** (idempotência, operação repetível sem efeito adicional) | Propriedade do handler de aplicar o mesmo evento múltiplas vezes com o mesmo resultado |
| **DLQ** (Dead Letter Queue, fila de cartas mortas) | Fila para eventos que falharam todas as tentativas; permite inspeção manual sem travar o consumidor |
| **eventual consistency** (consistência eventual) | Estado entre agregados converge no tempo após o evento; não é instantâneo |
| **choreography** (coreografia) | Cada serviço reage a eventos sem coordenador central; acoplamento por contrato de evento |
| **orchestration** (orquestração) | Um coordenador comanda os passos da operação; cada serviço recebe comando e responde |
| **event sourcing** (registro por eventos) | Padrão arquitetural onde o estado do agregado é derivado da sequência de eventos; fora do escopo deste guia |

---

## Domain event vs integration event

Os dois carregam a palavra evento mas servem propósitos diferentes, e misturá-los gera dores específicas. A separação aparece cedo: quando o consumidor vive no mesmo processo que o produtor, o evento é de domínio; quando atravessa fronteira de processo ou contexto, é de integração.

**Domain event** circula dentro do mesmo bounded context. Schema é interno; evolui junto com o domínio; consumidores são módulos da mesma aplicação. Quando o agregado `Order` publica `OrderPaid`, quem reage (estoque, e-mail, métrica) faz parte do mesmo modelo de domínio. Trocar um campo de `OrderPaid` exige tocar nos consumidores, mas todos vivem no mesmo repositório, com o mesmo deploy.

**Integration event** atravessa a fronteira. Schema é contrato público; evolui com cuidado; consumidores podem ser outros serviços, parceiros, jobs externos. `OrderPaid` que vai para o sistema de **BI** (Business Intelligence) ou para um **ERP** (Enterprise Resource Planning) parceiro vira contrato; mudar formato sem versionar quebra integração que não está no seu radar.

<details>
<summary>❌ Ruim: o mesmo evento atende uso interno e externo, schema vai engordando</summary>

```js
class OrderPaid {
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

eventBus.publish(new OrderPaid(order));
analyticsBroker.publish(new OrderPaid(order));
```

O mesmo objeto vira contrato interno (handler de e-mail, handler de estoque) e externo (BI, parceiro). Cada novo campo entra para algum dos consumidores e contamina os outros. Quando o parceiro reclama de payload de 80 KB, ninguém sabe quem precisa de qual campo.

</details>

<details>
<summary>✅ Bom: domain event interno, integration event derivado e enxuto</summary>

```js
class OrderPaid {
  constructor({ orderId, customerId, total, paidAt }) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.paidAt = paidAt;
  }

  static from(order) {
    const event = new OrderPaid({
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      paidAt: order.paidAt,
    });

    return event;
  }
}

class OrderPaidIntegrationV1 {
  constructor({ orderId, customerId, total, currency, paidAt }) {
    this.eventVersion = 1;
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.currency = currency;
    this.paidAt = paidAt;
  }

  static from(order) {
    const event = new OrderPaidIntegrationV1({
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      currency: order.currency,
      paidAt: order.paidAt,
    });

    return event;
  }
}

eventBus.publish(OrderPaid.from(order));
integrationBus.publish(OrderPaidIntegrationV1.from(order));
```

O evento de domínio fica curto e evolui livre. O evento de integração ganha campo `eventVersion`, currency explícito, contrato versionado. Mudar um não obriga mudar o outro.

</details>

A consequência prática: o produtor publica o domain event durante a operação; um handler interno traduz para integration event e publica no canal externo. Esse handler é a **anti-corruption layer** (camada anticorrupção) entre o modelo interno e o contrato público. Detalhes em [`patterns.md`](patterns.md).

## Quem dispara: aggregate root

A regra que mantém o domínio coerente: o aggregate root é o único que registra eventos. Eventos não nascem em serviço, em controller, em utilitário. Nascem no método do agregado que executa a operação, porque é lá que o estado muda e a invariante é verificada.

O agregado mantém uma lista interna de eventos pendentes (`this.events`). Cada método de domínio que altera estado adiciona o evento correspondente. Quando o caso de uso completa, o repositório lê essa lista, grava na outbox (ou no event bus, se in-process e síncrono), e limpa.

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

Não há jeito de mudar status sem registrar evento. Não há jeito de publicar evento sem mudar status. A regra é uma só, no agregado, validada pelo construtor e pelos métodos de operação.

</details>

A consequência: novos casos de uso ganham eventos automaticamente. Adicionar `order.refund()` adiciona `OrderRefunded` no `events`; o repositório persiste; o worker publica. Não há lista para atualizar em paralelo no serviço; a única fonte de verdade é o agregado.

## Quando se materializa: commit, depois publicação

Eventos só viram públicos depois que a transação do agregado confirma. Publicar antes do commit é apostar que a transação vai concluir; publicar fora da transação é apostar que o broker não vai falhar. As duas apostas perdem cedo.

A ferramenta que resolve sem aposta é o **outbox**: o evento é gravado no banco, na mesma transação que persiste o agregado. Um worker separado lê o outbox e publica no broker. Se o worker falhar, o evento fica no outbox até a próxima tentativa. Se o broker falhar, mesmo. Se o consumer falhar, a entrega é at-least-once, e a idempotência cobre o restante.

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

O `publish` mora dentro do `try`. Se o broker estiver lento, a transação segura lock no banco esperando rede. Se o `commit` falhar depois do publish, o evento já saiu mas o agregado não persistiu: consumer recebe `OrderPlaced` de um pedido que não existe.

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

A transação do agregado fecha rápido, sem depender de broker. O worker publica em outro processo; falha de broker fica isolada e não afeta a operação que disparou o evento. Detalhes do worker (intervalo de polling, batch size, retry com backoff) em [`backend-flow.md`](backend-flow.md#outbox-pattern).

</details>

Em sistema pequeno, o event bus pode ser in-process e síncrono (handlers rodam imediatamente após o commit). A regra continua válida: publicação acontece **após** o commit, não antes. Em Node.js: `await transaction.commit(); for (const event of events) await eventBus.dispatch(event);` resolve. Em sistema maior, o outbox vira essencial porque cada handler vive em processo separado e a fila precisa ser durável.

## Naming: passado, descritivo, do domínio

O nome do evento descreve um fato que aconteceu. Verbo no passado, sujeito implícito (quem fez), sem comando. `OrderPlaced` é fato; `PlaceOrder` é intenção (vira **command**, comando). A distinção parece sutil mas organiza tudo: comandos podem ser rejeitados; eventos não.

A regra prática:

- **Verbo no passado**: `Placed`, `Cancelled`, `Refunded`, `Shipped`, `Paid`. Em inglês, particípio passado.
- **Sujeito do domínio**: `Order`, `Customer`, `Invoice`. Não `Entity`, não `Record`, não `Item` genérico.
- **Sem auxiliar técnico**: evitar `OrderUpdatedEvent`, `CustomerSavedEvent`. O sufixo `Event` é ruído; já se sabe pelo contexto.
- **Sem `*Updated` quando se pode ser específico**: `OrderUpdated` esconde o que mudou. Quebrar em `OrderAddressChanged`, `OrderItemAdded`, `OrderItemRemoved`. Cada um carrega regra distinta.

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

`UpdateOrder` é nome de comando, não evento. `OrderDataChangedEvent` tem `Data` (banido por ser vago) e `Event` (redundante). `SaveOrderEvent` mistura conceito de banco (`save`) com conceito de domínio. Nenhum descreve o que aconteceu de fato.

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

Cada nome conta uma história: alguém colocou um pedido; alguém trocou o endereço; alguém adicionou item. Quem lê o log de eventos enxerga a operação de negócio, não o método do CRUD.

</details>

Em projeto que cresce, o nome do evento vira parte da **ubiquitous language** (linguagem ubíqua): produto, suporte e engenharia conversam sobre `OrderPlaced` e todos sabem o mesmo. Eventos com nome técnico (`OrderRecordSaved`) fragmentam a conversa.

## Schema: payload pequeno, versionado, imutável

O payload é o contrato do evento. Três princípios ditam o desenho:

**Pequeno**. IDs e campos essenciais para identificar o quê e quando. Não o agregado inteiro. Quem precisar de mais detalhes resolve o ID e consulta o banco no momento certo. Carregar o objeto completo cria três problemas: payload pesado no broker, schema acoplado à estrutura interna do agregado, e estado defasado (o evento foi gravado em um momento; o consumer lê em outro; o agregado já mudou).

**Versionado**. Eventos de integração ganham campo `eventVersion`. Mudança no payload gera nova versão (`V2`), mantendo a versão antiga em circulação até consumers migrarem. Eventos de domínio podem ser menos rigorosos (mudança coordenada no mesmo deploy), mas o hábito de versionar paga juros quando o domain vira integration.

**Imutável**. Uma vez publicado, o payload não muda. Correção em evento antigo vira evento novo (`OrderCorrected`), não edição. Imutabilidade habilita auditoria, replay e debugging: o histórico de eventos é a verdade do que aconteceu, não o estado atual.

<details>
<summary>❌ Ruim: payload carrega o agregado inteiro</summary>

```js
class OrderPaid {
  constructor(order) {
    this.order = order;
  }
}

eventBus.publish(new OrderPaid(order));

class StockReservationHandler {
  async on(event) {
    for (const item of event.order.items) {
      await this.stockRepository.reserve(item.productId, item.quantity);
    }
  }
}
```

O handler depende do shape interno de `Order`. Quando o agregado adiciona um campo, o evento engorda. Quando refatora a estrutura, o consumer quebra. O contrato implícito é "tudo que `Order` tiver hoje" e isso é instável por desenho.

</details>

<details>
<summary>✅ Bom: payload com IDs e dados essenciais, schema explícito e versionado</summary>

```js
class OrderPaidV1 {
  constructor({ eventId, eventVersion, orderId, customerId, total, currency, paidAt }) {
    this.eventId = eventId;
    this.eventVersion = eventVersion;
    this.orderId = orderId;
    this.customerId = customerId;
    this.total = total;
    this.currency = currency;
    this.paidAt = paidAt;
  }

  static from(order) {
    const event = new OrderPaidV1({
      eventId: OrderPaidV1.generateId(),
      eventVersion: 1,
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      currency: order.currency,
      paidAt: order.paidAt,
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

O payload tem só o que basta para o consumer reagir. Quem precisar dos itens consulta o agregado pelo ID. O contrato é o construtor de `OrderPaidV1`; mudanças exigem `OrderPaidV2` ou retrocompatibilidade explícita.

</details>

Migração de schema sem quebrar consumers segue duas regras:

- **Adicionar campo é sempre seguro**. Consumers antigos ignoram o campo novo.
- **Remover ou renomear campo exige nova versão**. `OrderPaidV2` substitui `OrderPaidV1`; o produtor pode publicar os dois durante a janela de migração; consumers escolhem qual escutar; quando todos migrarem, `V1` é desligado.

## Handler isolation

Cada handler é uma unidade independente, com retry, falha e estado próprios. Falha de um handler nunca afeta outro. Esse isolamento é o que diferencia handlers bem desenhados de "callbacks acoplados disfarçados de eventos".

Três regras concretas:

**Idempotência**. Handler recebe at-least-once delivery; pode receber o mesmo evento duas vezes. Verificar antes de aplicar: o evento já foi processado? Se sim, ignorar. Em geral, uma tabela `processed_events(handler_name, event_id)` ou flag no estado do consumer resolvem.

**Sem efeito cruzado**. Handler não chama outro handler. Não escreve direto no agregado de outro handler. Se reagir gera novo fato do domínio, publica novo evento e deixa outro handler reagir.

**Falha não derruba o produtor**. Se o handler de e-mail falhar, o pedido continua pago. Falha do handler vai para retry; após N tentativas, para a DLQ.

<details>
<summary>❌ Ruim: handler chama outro handler em cadeia síncrona</summary>

```js
class OrderPaidHandler {
  async on(event) {
    await this.stockHandler.reserveItems(event.order);
    await this.shippingHandler.scheduleDelivery(event.order);
    await this.emailHandler.sendConfirmation(event.order);
    await this.analyticsHandler.trackRevenue(event.order);
  }
}
```

Quatro responsabilidades acopladas em um handler só. Se o e-mail falhar, estoque, entrega e analytics já rodaram, mas o handler todo vai para retry: todas as ações vão repetir. Sem idempotência forte em cada uma, estoque é reservado em dobro.

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

Cada handler tem sua própria checagem de idempotência. Cada um falha sozinho. O event bus reentrega para o que falhou, sem reexecutar os que passaram. A falha do e-mail não cancela o estoque.

</details>

Quando um handler precisa reagir disparando outra ação do domínio, o caminho é a regra `read this event → command → another aggregate → publish next event`. Nunca handler chamando handler direto.

## Eventual consistency e estado intermediário

Quando dois agregados conversam por evento, a consistência entre eles é eventual. O ponto não é evitar isso (não dá), e sim modelar honestamente para que o sistema diga a verdade durante a janela de propagação.

A janela costuma ser de milissegundos a segundos em sistema saudável. Em sistema sob carga, pode chegar a minutos. Em sistema com falha, horas. Em todos os casos, três abordagens cobrem o usuário:

- **Estado intermediário no agregado**. `status = "awaiting_confirmation" → "confirmed"`. A UI mostra "processando" enquanto o evento ainda não chegou; mostra "confirmado" quando o handler atualizou.
- **Otimismo na UI**. Frontend assume o resultado final e atualiza imediato. Backend retifica se algo der errado. Funciona quando o erro é raro e a correção é tolerável.
- **Pull explícito**. Frontend pergunta a cada N segundos. Trade-off: tráfego extra; ganho: consistência percebida mais firme.

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

`status = "confirmed"` no momento do `place`. O usuário recebe "pedido confirmado" no mesmo instante, mas estoque ainda não verificou. Quando o handler de estoque rejeitar (sem disponibilidade), o pedido vira `cancelled` segundos depois. UI mente.

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

O caso de uso devolve um pedido `awaiting_confirmation`. A UI exibe "verificando disponibilidade". Quando o handler de estoque concluir, dispara `confirm()` ou `rejectDueToStockShortage()`; cada um publica o evento correspondente. O usuário enxerga o estado real do sistema em cada instante.

</details>

## Choreography vs orchestration

Quando vários handlers reagem em sequência para completar uma operação maior, dois estilos de coordenação aparecem. A escolha entre eles tem mais a ver com complexidade do fluxo do que com tecnologia.

**Choreography**. Cada serviço escuta evento e reage. Não há coordenador. Fluxo emerge da soma dos handlers. Bom para fluxos curtos (3-5 passos), estáveis, com regras de cancelamento simples. Acoplamento é por contrato de evento; cada serviço é autônomo.

**Orchestration**. Um coordenador comanda os passos. O coordenador sabe o fluxo inteiro, mantém o estado, decide o próximo comando. Bom para fluxos longos (7+ passos), com regras de compensação variadas, com pontos de espera (aprovação humana, timeout, retry programado).

| Critério | Choreography | Orchestration |
|---|---|---|
| Quem conhece o fluxo | Ninguém individualmente; está implícito | O orquestrador, explícito |
| Adicionar passo novo | Adiciona handler que escuta evento existente | Adiciona passo no orquestrador, redeploy |
| Debugging | Mais difícil (ver por que algo não rodou exige correlation ID) | Mais fácil (orquestrador loga cada passo) |
| Acoplamento | Por contrato de evento | Por contrato de comando |
| Bom para | Fluxos curtos e estáveis | Fluxos longos, com pontos de espera |

A combinação também é válida: orchestration entre serviços; choreography dentro de cada serviço. Detalhes sobre saga (que aparece em ambos estilos) em [`transactions.md`](transactions.md#saga-e-long-running).

## Anti-patterns

**Naming imperativo**. `SendEmail`, `PlaceOrder`, `UpdateStock` como nome de evento. Sintoma: handler chamado `SendEmailHandler` recebe `SendEmail`, que é o nome do comando que ele executa. Tratamento: `OrderPlaced` é o evento; `SendOrderConfirmationEmail` é o comando que o handler executa em reação; os dois nomes contam histórias diferentes.

**Payload pesado**. Evento carrega o agregado inteiro. Sintoma: alteração interna do `Order` quebra consumers do evento; payload chega em 50 KB no broker. Tratamento: IDs e campos essenciais; consumer resolve o ID e busca o resto.

**Publish dentro da transação**. Evento publicado antes do `commit`. Sintoma: consumer recebe evento de agregado que falhou no save; ou transação segura lock esperando broker. Tratamento: outbox + worker.

**Handler que muda o agregado origem**. `OrderPaidHandler` que atualiza o próprio `Order` que disparou o evento. Sintoma: novo evento `OrderPaidUpdated` vira ruído; o agregado nunca para de mudar. Tratamento: agregado já gravou a mudança que disparou o evento; handlers reagem em outros agregados ou em sistemas externos.

**Sem versionamento de schema**. Evento muda payload em produção sem `eventVersion`. Sintoma: consumer antigo quebra, deploy de produtor obriga deploy coordenado de N consumers. Tratamento: versionar; publicar `V1` e `V2` durante migração.

**Replay sem idempotência**. Reprocessar histórico de eventos para reconstruir estado sem checar duplicata. Sintoma: estoque reservado em dobro; e-mail enviado de novo; revenue duplicado em dashboard. Tratamento: idempotência em todo handler; `processed_events` ou flag no consumer.

**Domain event vazando como integration event**. O evento interno vira contrato público sem passar por tradutor. Sintoma: mudança rotineira do domínio quebra parceiro externo; refactor do agregado vira projeto. Tratamento: domain event publicado no bus interno; handler dedicado traduz e publica integration event versionado no canal externo.

**Choreography em fluxo de 12 passos**. Operação longa modelada como sucessão de eventos sem coordenador. Sintoma: ninguém consegue dizer em que passo o fluxo está; debug exige seguir 12 handlers em ordem; novo passo no meio é doloroso. Tratamento: orchestration; estado da saga persistido pelo coordenador.

**Handler que chama outro handler direto**. `OrderPaidHandler` invoca `StockReservationHandler.run()` no código. Sintoma: falha em cascata; retry duplo; sem isolamento. Tratamento: handlers se comunicam por evento, nunca por chamada direta.

## Referências

Cross-links dentro do guia:

- [`architecture/entity-modeling.md`](entity-modeling.md): aggregate root, invariantes, ubiquitous language
- [`architecture/transactions.md`](transactions.md): outbox, saga, eventual consistency, compensação semântica
- [`architecture/backend-flow.md`](backend-flow.md): outbox worker, idempotência operacional, DLQ, retry
- [`architecture/patterns.md`](patterns.md): Observer, CQRS, anti-corruption layer
- [`platform/messaging.md`](../platform/messaging.md): brokers, at-least-once, garantias de entrega

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
