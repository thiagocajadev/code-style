# Slack — Bolt for JavaScript

> Escopo: JavaScript/Node.js. Guia baseado em **@slack/bolt v4.7.1** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Slack (tokens, Socket Mode, Block Kit, scopes): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md#slack).

**Bolt for JavaScript** é o framework oficial da Slack para construir aplicativos Slack. Um objeto **App** (aplicativo) registra listeners para slash commands, eventos e ações de Block Kit. Toda interação enviada pela Slack exige um **ack()** (acknowledge, reconhecimento) em até 3 segundos — sem esse retorno, a Slack exibe um erro ao usuário.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **App** | Instância principal do bot; registra listeners e gerencia a conexão com o Slack |
| **ack()** | Função de reconhecimento obrigatória; confirma ao Slack que o evento foi recebido em até 3 segundos |
| **say()** | Envia uma mensagem ao canal onde o evento ocorreu; aceita string ou objeto com `blocks` |
| **respond()** | Responde via `response_url`; funciona fora do canal original e aceita `thread_ts` para replies em thread |
| **Block Kit** | Sistema de UI do Slack; mensagens compostas por blocos (`section`, `actions`, `image`) com elementos interativos |
| **Socket Mode** | Conexão via WebSocket usando um App-Level Token; dispensa URL pública; indicado para desenvolvimento e bots internos |
| **Bot Token** | Credencial `xoxb-...` emitida pela Slack para chamadas à API; obtida em OAuth & Permissions |
| **Signing Secret** | Chave usada para validar que as requisições HTTP vêm da Slack; obtida em Basic Information |
| **App-Level Token** | Credencial `xapp-...` usada exclusivamente no Socket Mode; requer scope `connections:write` |

## Instalação

```bash
npm install @slack/bolt
```

## Setup do App

Use `process.env` para todas as credenciais. O `await` em `app.start()` é obrigatório: sem ele, erros de inicialização são silenciados.

<details>
<summary>❌ Bad — credenciais hardcoded; sem await no start</summary>
<br>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: 'xoxb-1234-...',
  signingSecret: 'abc123',
});

app.start(3000);
```

</details>

<br>

<details>
<summary>✅ Good — credenciais via env; await no start; port via env</summary>
<br>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

await app.start(process.env.PORT ?? 3000);
```

</details>

## Slash Commands

`ack()` deve ser chamado antes de qualquer operação assíncrona. A Slack aguarda o reconhecimento em até 3 segundos; operações longas são iniciadas após o `ack()`.

<details>
<summary>❌ Bad — sem ack(); destructuring no parâmetro; lógica de negócio no handler; format inline no say()</summary>
<br>

```js
app.command('/order', async ({ ack, say, command }) => {
  const orderId = command.text.trim();
  const order = await db.findOrder(orderId);
  await say(`Pedido #${order.id}: ${order.status} — Cliente: ${order.customerName}`);
});
```

</details>

<br>

<details>
<summary>✅ Good — ack() primeiro; destructuring no corpo; orquestrador + helpers abaixo</summary>
<br>

```js
app.command('/order', async (commandPayload) => {
  const { ack, say, command } = commandPayload;
  await ack();
  const orderId = command.text.trim();

  if (!orderId) {
    await say('Informe o ID do pedido. Exemplo: /order 12345');
    return;
  }

  const order = await fetchOrder(orderId);
  const reply = buildOrderReply(order);
  await say(reply);
});

async function fetchOrder(orderId) {
  const order = await orderRepository.findById(orderId);
  return order;
}

function buildOrderReply(order) {
  const reply = `Pedido #${order.id}\nStatus: ${order.status}\nCliente: ${order.customerName}`;
  return reply;
}
```

</details>

## Events

Use `app.event()` para reagir a eventos da Events API. Em listeners de mensagem, adicione um guard para `event.bot_id`: sem ele, o bot responde aos próprios envios e entra em loop.

<details>
<summary>❌ Bad — destructuring no parâmetro; sem guard para bot messages; format inline no say()</summary>
<br>

```js
app.event('app_mention', async ({ event, say }) => {
  await say(`Olá, <@${event.user}>! Como posso ajudar?`);
});

app.event('message', async ({ event, say }) => {
  await say(`Recebi: ${event.text}`);
});
```

</details>

<br>

<details>
<summary>✅ Good — destructuring no corpo; guard para bot messages; compute extraído antes do say()</summary>
<br>

```js
app.event('app_mention', async (eventPayload) => {
  const { event, say } = eventPayload;
  const mentionReply = buildMentionReply(event.user);
  await say(mentionReply);
});

app.event('message', async (eventPayload) => {
  const { event, say } = eventPayload;
  if (event.bot_id) return;

  const echoReply = buildEchoReply(event.text);
  await say(echoReply);
});

function buildMentionReply(userId) {
  const reply = `Olá, <@${userId}>! Use /order <id> para consultar um pedido.`;
  return reply;
}

function buildEchoReply(messageText) {
  const reply = `Recebi: ${messageText}`;
  return reply;
}
```

</details>

## Actions (Block Kit)

Block Kit é a primitiva de UI interativa do Slack. Botões e selects disparam `app.action()`. O `ack()` é obrigatório também nas ações: sem ele, a Slack exibe um spinner indefinido no botão.

<details>
<summary>❌ Bad — blocks montados inline; action_id como string solta; sem ack() na ação</summary>
<br>

```js
app.command('/menu', async ({ ack, say }) => {
  await ack();
  await say({
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Escolha uma opção:' } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Ver pedidos' }, action_id: 'view_orders' },
        ],
      },
    ],
  });
});

app.action('view_orders', async ({ say }) => {
  await say('Mostrando seus pedidos...');
});
```

</details>

<br>

<details>
<summary>✅ Good — blocks extraídos; action_id como constante; ack() antes do processamento</summary>
<br>

```js
const ACTIONS = {
  VIEW_ORDERS: 'view_orders',
};

const MENU_BLOCKS = [
  {
    type: 'section',
    text: { type: 'mrkdwn', text: 'Escolha uma opção:' },
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Ver pedidos' },
        action_id: ACTIONS.VIEW_ORDERS,
      },
    ],
  },
];

app.command('/menu', async (commandPayload) => {
  const { ack, say } = commandPayload;
  await ack();

  const menuPayload = { blocks: MENU_BLOCKS };
  await say(menuPayload);
});

app.action(ACTIONS.VIEW_ORDERS, async (actionPayload) => {
  const { ack, say } = actionPayload;
  await ack();

  const orders = await fetchUserOrders();
  const reply = buildOrdersReply(orders);
  await say(reply);
});

async function fetchUserOrders() {
  const orders = await orderRepository.findRecent();
  return orders;
}

function buildOrdersReply(orders) {
  const lines = orders.map((order) => `#${order.id} — ${order.status}`);
  const reply = lines.join('\n');
  return reply;
}
```

</details>

## Socket Mode

Socket Mode elimina a necessidade de URL pública e é recomendado para bots internos e desenvolvimento local. O `appToken` deve ter o scope `connections:write`.

<details>
<summary>❌ Bad — tokens hardcoded; sem await no start</summary>
<br>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: 'xoxb-...',
  socketMode: true,
  appToken: 'xapp-...',
});

app.start();
```

</details>

<br>

<details>
<summary>✅ Good — tokens via env; await no start; sem port (Socket Mode não usa porta)</summary>
<br>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

await app.start();
```

</details>

## Veja também

- [shared/platform/bots-advanced.md — Slack](../../../shared/platform/bots-advanced.md#slack) — tokens, Socket Mode, Block Kit, scopes (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md) — webhook vs polling, session state, rate limit
