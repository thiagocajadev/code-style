# Fluxos de backend

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Quase toda lógica assíncrona de backend cabe em três fluxos: o **background job** (tarefa em segundo
plano), o **webhook** (aviso em HTTP que um sistema externo dispara quando algo acontece lá) e o
modelo **event-driven** (orientado a eventos). Os três resolvem o mesmo problema da mesma forma:
aceitar o trabalho, gravar que ele existe e executá-lo fora do ciclo de requisição e resposta. Quem
chamou recebe uma confirmação rápida e não fica esperando. Esta página trata desse trabalho que roda
depois; o ciclo síncrono, em que a resposta sai pronta na mesma requisição, está em
[operation-flow.md](operation-flow.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Background job** (tarefa em segundo plano) | Trabalho desacoplado do ciclo de request/response, executado de forma assíncrona |
| **Worker** (processo que executa jobs) | Processo que consome e executa jobs de forma independente, fora do ciclo de request/response |
| **Outbox pattern** (padrão de caixa de saída) | Garantia de atomicidade entre persistência no banco e publicação no broker, usando a mesma transação |
| **Relay** (processo de retransmissão) | Processo que lê registros pendentes do outbox e publica no broker com retry |
| **Broker** (intermediário de mensagens) | Serviço que recebe, armazena e distribui mensagens entre producers e consumers |
| **DLQ** (Dead-letter queue, fila de mensagens com falha persistente) | Fila de isolamento para mensagens que falharam repetidamente |
| **SSE** (Server-Sent Events, Eventos Enviados pelo Servidor) | Entrega unidirecional de eventos do servidor ao browser sobre HTTP |
| **HMAC** (Hash-based Message Authentication Code, Código de Autenticação de Mensagem Baseado em Hash) | Mecanismo que valida a origem e integridade de um webhook |
| **Publisher** (publicador) | Quem emite um evento de domínio para o broker |
| **Subscriber** (assinante) | Quem consome e processa eventos do broker de forma independente |

---

## Trabalho aceito agora, executado depois

Um job (tarefa que roda separada da requisição) separa o momento em que o sistema aceita o trabalho
do momento em que ele executa. A **API** (Application Programming Interface · Interface de
Programação de Aplicações) recebe a requisição, grava o job, responde 202 e encerra a conversa. Um
**worker** (processo que executa jobs) pega esse job da fila e trabalha por conta própria.

```
Requisição HTTP → valida a entrada → grava o job → 202 Accepted → Worker retira da fila → executa → guarda o resultado → notifica
```

O código 202 Accepted (Aceito) é uma promessa: "recebi o pedido e ele está agendado". A resposta sai
antes de o trabalho terminar, então o cliente precisa descobrir o resultado por outro caminho, que é
o assunto de [como o cliente descobre que o job terminou](#job-result-delivery).

<a id="outbox-pattern"></a>

### Gravar a intenção de publicar junto com o dado

O job precisa estar gravado **antes** de o 202 sair. Se a aplicação reiniciar depois de responder e
antes de enfileirar, o cliente acha que o trabalho foi aceito e ninguém nunca o executa. O trabalho
some sem deixar rastro.

Quando a fila mora fora do banco principal (Kafka, **SQS** (Simple Queue Service · Serviço Simples de
Filas), RabbitMQ), o buraco fica maior. Gravar no banco e publicar na fila são dois sistemas
diferentes, e não existe garantia de que os dois aconteçam juntos: o banco pode confirmar e a
publicação falhar logo depois.

O outbox pattern (padrão de caixa de saída) fecha esse buraco colocando a publicação dentro da mesma
transação do banco. Em vez de publicar na fila, a aplicação grava numa tabela `outbox` a mensagem que
pretende publicar:

```sql
BEGIN;
  INSERT INTO orders (id, customer_id, total) VALUES (?, ?, ?);
  INSERT INTO outbox (event_type, payload, published) VALUES ('order.placed', ?, false);
COMMIT;
```

Ou as duas linhas entram, ou nenhuma entra. Depois, um **relay** (processo de retransmissão) lê as
linhas ainda não publicadas do outbox, envia cada uma ao **broker** (intermediário de mensagens) e
marca como enviada. Se o broker estiver fora do ar, o relay tenta de novo mais tarde, porque a
intenção de publicar já está guardada no banco.

Quando a própria fila de jobs vive no banco principal (PostgreSQL com `pgboss`, por exemplo), a
ferramenta já faz isso por dentro. O outbox escrito à mão só é necessário quando banco e broker são
sistemas separados.

<a id="job-idempotency"></a>

### Executar o mesmo job duas vezes sem estragar nada

O worker precisa aguentar receber o mesmo job repetido. Sistemas distribuídos entregam cada mensagem
ao menos uma vez (at-least-once delivery, entrega ao menos uma vez), e essa garantia vem com
duplicatas de brinde: na dúvida, a fila prefere entregar de novo a arriscar perder.

A proteção padrão é uma `idempotency_key`, uma chave que identifica o pedido de forma única e não
aceita repetição na tabela:

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

Antes de executar, o worker consulta a chave. Se ela já existe com status `done`, ele devolve o
resultado guardado sem refazer o trabalho. A constraint (restrição) `UNIQUE` cobre o caso mais
apertado, quando dois workers pegam o mesmo job no mesmo instante: o banco aceita o `INSERT` de um
deles e recusa o do outro, que aborta antes de causar qualquer efeito.

<a id="job-result-delivery"></a>

### Como o cliente descobre que o job terminou

| Modelo                                                       | Quando usar                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Polling** (`GET /jobs/{id}`)                               | Cliente sem endpoint público, duração curta e previsível (segundos)      |
| **Webhook** (`POST <url-do-cliente>`)                        | Cliente expõe HTTPS, duração longa (minutos, horas), integrações B2B     |
| **SSE** (Server-Sent Events, Eventos Enviados pelo Servidor) | Cliente é browser, entrega unidirecional em tempo real, duração moderada |
| **WebSocket**                                                | Comunicação bidirecional em tempo real, custo e complexidade mais altos  |

Polling (consulta repetida) é o cliente perguntando de tempos em tempos se já acabou. Nos outros três
modelos o servidor avisa quando termina.

Para avisar o browser de mudanças de status, SSE cobre a maioria dos casos: ele carrega eventos do
servidor para o cliente numa direção só, roda sobre **HTTP** (HyperText Transfer Protocol · Protocolo
de Transferência de Hipertexto)/2 comum e dispensa infraestrutura extra no balanceador de carga.
WebSocket entra quando os dois lados precisam falar.

---

## Webhook: o evento chega de fora

Webhook é o job pelo avesso: o trabalho nasce fora do sistema. Um parceiro (Stripe, GitHub, um
gateway de pagamento) chama uma rota sua para contar que algo aconteceu. O sistema confirma o
recebimento na hora e processa depois.

```
POST /webhooks/{provider} → captura o corpo bruto → valida o HMAC → checa a idempotência → 200 OK → enfileira → processa
```

Duas regras valem sempre:

1. **Responder 200 antes de processar.** Provedores como Stripe e GitHub reenviam o evento se não
   receberem 200 em 5 a 30 segundos. Processar dentro do handler (função que atende a rota) estoura
   esse prazo, e o provedor passa a reenviar o mesmo evento em série enquanto o sistema tenta dar
   conta do anterior.
2. **Validar a assinatura antes de qualquer regra de negócio.** A assinatura prova a origem da
   mensagem. Sem ela, a rota é pública e qualquer pessoa pode inventar um pagamento aprovado.

### Provar que a mensagem veio de quem diz ter vindo

O **HMAC** (Hash-based Message Authentication Code · Código de Autenticação de Mensagem Baseado em
Hash) é o mecanismo que faz essa prova. Provedor e receptor compartilham um segredo. O provedor usa
esse segredo para calcular uma assinatura do **payload** (corpo da mensagem) e a envia no header. O
receptor refaz a conta com o mesmo segredo e compara os dois valores. Bateu, a mensagem veio de quem
diz ter vindo e chegou intacta.

A conta é feita sobre o **raw body** (o corpo da requisição byte a byte, exatamente como chegou),
antes de qualquer interpretação do **JSON** (JavaScript Object Notation · Notação de Objetos
JavaScript). Frameworks que já entregam o body interpretado mudam espaços e ordem de campos, e a
assinatura recalculada sobre esse texto reconstruído nunca bate. A rota de webhook precisa acessar o
corpo bruto.

A comparação usa `timingSafeEqual`, que gasta o mesmo tempo com qualquer entrada. Uma comparação
comum para no primeiro caractere diferente, e o atacante mede esse tempo para adivinhar a assinatura
byte a byte (timing attack, ataque de temporização):

<details>
<summary>❌ Ruim: valida sobre JSON serializado, comparação vulnerável a timing attack</summary>

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

<details>
<summary>✅ Bom: valida sobre raw body, comparação timing-safe</summary>

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

### O provedor manda o mesmo evento duas vezes

Todo provedor identifica a entrega com um ID único no header: `X-Stripe-Event`, `X-GitHub-Delivery`.
Esse ID serve de chave de idempotência. Antes de enfileirar, o handler tenta gravá-lo e deixa o banco
decidir se o evento é novo:

```sql
INSERT INTO webhook_deliveries (event_id, provider, payload)
VALUES (?, ?, ?)
ON CONFLICT (event_id) DO NOTHING;
```

Se o `INSERT` afeta zero linhas, o evento já tinha chegado antes. O sistema devolve 200 e para por
aí. O provedor só quer a confirmação de recebimento e fica satisfeito.

### Cada tipo de evento vai para o seu handler

O processador escolhe o handler por um registry (um mapa de tipo de evento para função), que cresce
por linha nova em vez de mais um ramo num `switch` cada vez maior:

<details>
<summary>✅ Bom: registry de handlers por tipo de evento</summary>

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

Evento de tipo desconhecido vira log e segue em frente. Provedores criam tipos novos sem avisar, e o
sistema precisa ignorar o que ainda não entende sem quebrar.

---

## Orientado a eventos: quem publica não conhece quem consome

No modelo event-driven (orientado a eventos), o **publisher** (publicador) anuncia ao **broker** que
um fato aconteceu no domínio, por exemplo "pedido criado". Os **subscribers** (assinantes) escutam o
broker e reagem cada um por conta própria: um envia o e-mail, outro atualiza o estoque, outro alimenta
o relatório. O publisher não sabe quem são, e adicionar um consumidor novo não mexe no código dele.

```
Publisher emite o evento → Broker (tópico/fila) → Subscriber consome → processa → confirma (ack) → Broker remove
Falha N vezes → DLQ → alerta → revisão manual
```

O `ack` (acknowledge, confirmação de processamento) é o aviso do subscriber ao broker: "tratei esta
mensagem, pode apagar". Sem esse aviso, o broker devolve a mensagem para a fila e ela volta a ser
entregue.

### A fila das mensagens que não passam

A **DLQ** (Dead-letter queue · fila de mensagens com falha persistente) é obrigatória. Uma mensagem
que falha sem parar volta para a fila sem parar, e o consumer group (grupo de consumidores) trava em
cima dela enquanto o resto da fila espera.

O fluxo padrão:

- Retry (nova tentativa) com backoff exponencial (espera crescente entre tentativas), tipicamente 3 a
  5 tentativas
- Após esgotar as tentativas, a mensagem sai da fila principal e vai para a DLQ
- Qualquer mensagem na DLQ dispara alerta. Uma DLQ que ninguém observa acumula dados perdidos em
  silêncio

A mensagem na DLQ carrega o payload original, o número de tentativas, o último erro e a hora do
evento. Sem esse contexto, quem for investigar tem uma mensagem morta e nenhuma pista.

### Entrega ao menos uma vez, com consumer que aguenta repetição

Entrega exactly-once (exatamente uma vez) existe no Kafka e no SQS FIFO, ao custo de infraestrutura
transacional que consome de 10% a 30% do throughput (vazão, quantidade de mensagens por segundo).
Na prática, entrega ao menos uma vez com um consumer idempotente (que tolera receber a mesma mensagem
repetida) alcança o mesmo resultado com menos peça para manter.

<details>
<summary>✅ Bom: consumer verifica idempotência antes de processar</summary>

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

A gravação em `processed_events` e a operação de negócio entram na mesma transação sempre que o banco
permitir. Assim o evento fica marcado como processado exatamente quando o efeito dele existe. As
duplicatas vão chegar, e o consumer precisa engoli-las sem cobrar o cliente duas vezes.

### O envelope: o formato comum de todo evento

O CloudEvents v1.0 é a especificação aberta mantida pela **CNCF** (Cloud Native Computing Foundation ·
Fundação de Computação Nativa em Nuvem) para o envelope do evento, ou seja, os campos fixos que
embrulham o dado de negócio e valem para qualquer tipo de mensagem. Os principais provedores de nuvem
já falam esse formato:

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
| `time`   | Hora em que o evento aconteceu, medida na origem. Essencial para ordering (ordenação) e replay (reprocessamento) |
| `data`   | Payload (carga útil) de negócio. Mínimo necessário, sem IDs internos expostos a consumers externos   |

O consumidor ignora os campos que não conhece, e é isso que permite ao publisher acrescentar
informação sem combinar deploy com ninguém. Mudança que quebra o contrato ganha uma versão nova no
campo `type` (`orders.placed.v2`), e os dois formatos convivem enquanto os consumidores migram.

### O outbox como ponte entre o banco e o broker

O outbox pattern liga o banco transacional ao broker de eventos. O problema que ele resolve chama-se
dual-write (escrita dupla): gravar no banco e publicar no broker são duas escritas em sistemas
diferentes, e qualquer falha no meio deixa os dois em desacordo.

| Abordagem                                     | Problema                                      |
| --------------------------------------------- | --------------------------------------------- |
| Commit no banco → publica no broker           | Se a publicação falhar, evento perdido        |
| Publica no broker → commit no banco           | Se o commit falhar, evento fantasma publicado |
| Commit inclui linha no outbox → relay publica | Intenção e dado são sempre consistentes       |

Na terceira linha existe uma escrita só, a do banco, e ela carrega o dado e a intenção de publicar
juntos. O relay lê o outbox e publica, tentando de novo até conseguir.

---

**Veja também**

- [operation-flow.md](operation-flow.md): ciclo síncrono request/response
- [messaging.md](../platform/messaging.md): brokers, filas e pub/sub: tecnologias e trade-offs
- [feature-flags.md](../platform/feature-flags.md): rollout gradual de workers e consumers
