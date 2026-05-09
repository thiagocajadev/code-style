# Fluxos de Backend

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Três fluxos cobrem a maior parte da lógica assíncrona de backend: **background job** (trabalho em
segundo plano), **webhook** (notificação HTTP acionada por evento externo) e **event-driven**
(orientado a eventos). Os três seguem o mesmo princípio: aceitar, persistir e processar fora do
ciclo de request/response. Esta página complementa [operation-flow.md](operation-flow.md), que cobre
o ciclo síncrono.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Background job** (tarefa em segundo plano) | Trabalho desacoplado do ciclo de request/response, executado de forma assíncrona |
| **Worker** (processo trabalhador) | Processo que consome e executa jobs de forma independente |
| **Outbox pattern** (padrão de caixa de saída) | Garantia de atomicidade entre persistência no banco e publicação no broker, usando a mesma transação |
| **Relay** (processo de retransmissão) | Processo que lê registros pendentes do outbox e publica no broker com retry |
| **Broker** (intermediário de mensagens) | Serviço que recebe, armazena e distribui mensagens entre producers e consumers |
| **DLQ** (Dead-letter queue, fila de mensagens com falha persistente) | Fila de isolamento para mensagens que falharam repetidamente |
| **SSE** (Server-Sent Events, Eventos Enviados pelo Servidor) | Entrega unidirecional de eventos do servidor ao browser sobre HTTP |
| **HMAC** (Hash-based Message Authentication Code, Código de Autenticação de Mensagem Baseado em Hash) | Mecanismo que valida a origem e integridade de um webhook |
| **Publisher** (publicador) | Quem emite um evento de domínio para o broker |
| **Subscriber** (assinante) | Quem consome e processa eventos do broker de forma independente |

---

## Background Job

Um job (tarefa assíncrona) desacopla o aceite de trabalho da sua execução. A **API** (Application Programming Interface, Interface de Programação de Aplicações) aceita a
requisição, persiste o job, responde 202, e o **worker** (processo trabalhador) executa de forma
independente.

```
HTTP Request → valida input → persiste job → 202 Accepted → Worker dequeue → executa → armazena resultado → notifica
```

O 202 Accepted (Aceito) é o contrato: "recebi, execução está agendada". A resposta não espera a
conclusão do job.

### Outbox pattern

O job precisa ser persistido **antes** do 202 ser retornado. Se a aplicação reiniciar após responder
mas antes de enfileirar o job, o trabalho é perdido silenciosamente.

Quando a fila é externa ao banco principal (Kafka, **SQS** (Simple Queue Service, Serviço Simples de Filas), RabbitMQ), o problema se aprofunda. Commit
no banco e publicação na fila são dois sistemas distintos, sem garantia de atomicidade (atomicity,
execução como unidade indivisível).

O outbox pattern (padrão de caixa de saída) resolve isso tornando a publicação parte da mesma
transação do banco:

```sql
BEGIN;
  INSERT INTO orders (id, customer_id, total) VALUES (?, ?, ?);
  INSERT INTO outbox (event_type, payload, published) VALUES ('order.placed', ?, false);
COMMIT;
```

Um **relay** (processo de retransmissão) separado lê os registros não publicados do outbox, publica no
**broker** (intermediário de mensagens) e marca como enviado. O commit no banco e a intenção de publicar
são atômicos; o relay entrega com retry (retentatva).

Quando a fila de jobs **é** o banco principal (PostgreSQL com `pgboss`, por exemplo), o outbox está
implícito na ferramenta. O pattern só é necessário explicitamente quando banco e broker são sistemas
distintos.

### Idempotência do job

O worker deve ser seguro para re-executar o mesmo job mais de uma vez. Redes distribuídas entregam
mensagens ao menos uma vez (at-least-once delivery, entrega ao menos uma vez). Duplicatas são
inevitáveis.

O padrão é uma `idempotency_key` única na tabela de jobs:

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR UNIQUE,
  status VARCHAR,
  payload JSONB,
  result JSONB,
  created_at TIMESTAMP,
  processed_at TIMESTAMP
);
```

O worker verifica antes de executar: se a chave já existe com status `done`, retorna o resultado em
cache sem reprocessar. A constraint (restrição) `UNIQUE` é a proteção contra race condition
(condição de corrida) quando dois workers dequeuam o mesmo job ao mesmo tempo. O que perder o
`INSERT` recebe um erro de violação e aborta sem efeito colateral.

### Entrega do resultado

| Modelo                                                       | Quando usar                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Polling** (`GET /jobs/{id}`)                               | Cliente sem endpoint público, duração curta e previsível (segundos)      |
| **Webhook** (`POST <url-do-cliente>`)                        | Cliente expõe HTTPS, duração longa (minutos, horas), integrações B2B     |
| **SSE** (Server-Sent Events, Eventos Enviados pelo Servidor) | Cliente é browser, entrega unidirecional em tempo real, duração moderada |
| **WebSocket**                                                | Comunicação bidirecional em tempo real, custo e complexidade mais altos  |

SSE substituiu WebSocket na maioria dos casos de entrega de status unidirecional: funciona sobre
**HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto)/2 padrão, sem infraestrutura adicional para balanceamento de carga.

---

## Webhook

Webhook é um job de entrada: o sistema recebe um evento de um parceiro externo, confirma o
recebimento imediatamente, e processa de forma assíncrona.

```
POST /webhooks/{provider} → captura raw body → valida HMAC → checa idempotência → 200 OK → enfileira → processa
```

Duas regras sem exceção:

1. **Responder 200 antes de processar.** Provedores como Stripe e GitHub fazem retry se não
   receberem 200 em 5–30 segundos. Processar dentro do handler cria latência, falhas e tempestades
   de retry (retentativas repetidas).
2. **Validar HMAC antes de qualquer lógica de negócio.** A assinatura confirma a origem. Sem
   validação, qualquer cliente pode forjar eventos.

### Validação HMAC

O **HMAC** (Hash-based Message Authentication Code, Código de Autenticação de Mensagem Baseado em Hash)
é o mecanismo que confirma a origem de um webhook. O provedor assina o **payload** (corpo da mensagem) com um segredo
compartilhado. O receptor recalcula a assinatura com o mesmo segredo e compara. Se bater, a mensagem
veio de quem diz ser e não foi alterada no caminho.

O cálculo é feito sobre o **raw body** (corpo bruto da requisição), antes do parse (interpretação)
do **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript). Frameworks que fazem parse automático do body antes do **middleware** (componente de pipeline) executar invalidam o
cálculo. O webhook handler precisa receber o stream bruto diretamente.

A comparação usa `timingSafeEqual` para evitar timing attack (ataque de temporização):

<details>
<summary>❌ Bad — valida sobre JSON serializado, comparação vulnerável a timing attack</summary>
<br>

```js
async function handleWebhook(request) {
  const body = await request.json();
  const receivedSignature = request.headers.get("x-signature");

  const expectedSignature = computeHmac(webhookSecret, JSON.stringify(body));

  if (expectedSignature !== receivedSignature) {
    return unauthorizedResponse;
  }

  await processWebhookPayload(body);

  return acceptedResponse;
}
```

</details>

<br>

<details>
<summary>✅ Good — valida sobre raw body, comparação timing-safe</summary>
<br>

```js
async function handleWebhook(request) {
  const rawBody = await request.text();
  const receivedSignature = request.headers.get("x-signature") ?? "";

  const expectedSignature = computeHmac(webhookSecret, rawBody);
  const isSignatureValid = timingSafeEqual(expectedSignature, receivedSignature);

  if (!isSignatureValid) {
    return unauthorizedResponse;
  }

  await enqueueWebhookProcessing(rawBody);

  return acceptedResponse;
}
```

</details>

### Idempotência por chave externa

Todo provedor envia um ID único no header: `X-Stripe-Event`, `X-GitHub-Delivery`. Esse ID é a chave
de idempotência. Antes de enfileirar, verifica se o evento já foi recebido:

```sql
INSERT INTO webhook_deliveries (event_id, provider, payload)
VALUES (?, ?, ?)
ON CONFLICT (event_id) DO NOTHING;
```

Zero linhas afetadas: evento duplicado. Retornar 200 silenciosamente. O provedor não precisa saber;
ele só quer confirmação de recebimento.

### Roteamento de eventos

O processador roteia o evento pelo tipo usando um registry (registro de handlers), não um switch
crescente:

<details>
<summary>✅ Good — registry de handlers por tipo de evento</summary>
<br>

```js
const eventHandlers = {
  "payment.succeeded": handlePaymentSucceeded,
  "payment.failed": handlePaymentFailed,
  "customer.created": handleCustomerCreated,
};

async function dispatchWebhookEvent(event) {
  const eventType = event.type;
  const handler = eventHandlers[eventType];

  if (!handler) {
    logUnhandledEventType(eventType);
    return;
  }

  const eventPayload = event.data;
  await handler(eventPayload);
}
```

</details>

Tipos de evento desconhecidos são logados, não rejeitados. Provedores adicionam novos tipos; o
sistema ignora o que não conhece sem errar.

---

## Event-Driven

No modelo event-driven (orientado a eventos), o **publisher** (publicador) emite um evento de domínio
para um **broker**. **Subscribers** (assinantes) independentes consomem e processam sem conhecer o
**publisher**.

```
Publisher emite evento → Broker (tópico/fila) → Subscriber consome → processa → ack → broker remove
                                                                    ↓ falha N vezes
                                                                 DLQ → alerta → revisão manual
```

### Dead-letter queue

A **DLQ** (Dead-letter queue, fila de mensagens com falha persistente) é obrigatória. Sem ela, uma mensagem que falha
repetidamente bloqueia o consumer group (grupo de consumidores) inteiro.

O fluxo padrão:

- Retry (retentatva) com backoff exponencial (espera crescente entre tentativas), tipicamente 3–5
  tentativas
- Após esgotar as tentativas, a mensagem vai para a DLQ
- Qualquer mensagem na DLQ dispara alerta. DLQ silenciosa é lixeira de perda de dados

A mensagem na DLQ deve preservar: payload original, número de tentativas, último erro e timestamp do
evento. Sem esse contexto, mensagens mortas são indebuggáveis.

### Entrega at-least-once

Entrega exactly-once (exatamente uma vez) é possível em Kafka e SQS FIFO, mas exige infraestrutura
transacional com overhead (custo extra) de 10–30% de throughput. Na prática, **at-least-once com
consumer idempotente** entrega a mesma garantia com menos complexidade.

<details>
<summary>✅ Good — consumer verifica idempotência antes de processar</summary>
<br>

```js
async function consumeEvent(event) {
  const alreadyProcessed = await findProcessedEvent(event.id);

  if (alreadyProcessed) {
    return;
  }

  await processEvent(event.data);
  await markEventAsProcessed(event.id);
}
```

</details>

A escrita em `processed_events` e a operação de negócio devem estar na mesma transação de banco
quando possível. Duplicatas chegam. O sistema precisa tolerá-las sem efeito colateral.

### Envelope de evento

O CloudEvents v1.0 (especificação aberta mantida pela CNCF, Cloud Native Computing Foundation) é o
padrão de envelope (estrutura de empacotamento de evento) adotado pelos principais cloud providers e
ecossistemas:

```json
{
  "specversion": "1.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "/orders-service",
  "type": "com.company.orders.placed",
  "time": "2026-04-21T14:32:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "ord_123",
    "customerId": "cust_456",
    "total": 9900
  }
}
```

| Campo    | Propósito                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------- |
| `id`     | Chave de idempotência para consumers                                                                 |
| `source` | Serviço publicador, habilita roteamento e debugging                                                  |
| `type`   | Tipo reverse-DNS, evita colisões entre serviços                                                      |
| `time`   | Hora do evento, não do processamento. Essencial para ordering (ordenação) e replay (reprocessamento) |
| `data`   | Payload (carga útil) de negócio. Mínimo necessário, sem IDs internos expostos a consumers externos   |

Campos desconhecidos são ignorados. Producers versionam pelo campo `type` (`orders.placed.v2`).
Deploys sincronizados para adicionar um campo são anti-pattern.

### Outbox como ponte

O outbox pattern é a ponte entre o banco transacional e o broker de eventos. Resolve o problema de
dual-write (escrita dupla): commit no banco e publicação no broker são sistemas distintos. Sem
atomicidade, qualquer falha entre eles cria inconsistência.

| Abordagem                                     | Problema                                      |
| --------------------------------------------- | --------------------------------------------- |
| Commit no banco → publica no broker           | Se a publicação falhar, evento perdido        |
| Publica no broker → commit no banco           | Se o commit falhar, evento fantasma publicado |
| Commit inclui linha no outbox → relay publica | Intenção e dado são sempre consistentes       |

O relay lê o outbox e publica com retry.

---

**Veja também**

- [operation-flow.md](operation-flow.md) — ciclo síncrono request/response
- [messaging.md](../platform/messaging.md) — brokers, filas e pub/sub: tecnologias e trade-offs
- [feature-flags.md](../platform/feature-flags.md) — rollout gradual de workers e consumers
