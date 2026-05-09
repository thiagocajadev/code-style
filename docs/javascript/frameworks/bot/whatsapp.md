# WhatsApp — Baileys e Meta Cloud API

> Escopo: JavaScript/Node.js. Guia baseado em **Baileys v7** e **Meta Cloud API v21.0** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Diferença entre API oficial e cliente não-oficial, Template Messages, verificação de webhook: [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

O WhatsApp tem dois caminhos de automação com tradeoffs radicalmente diferentes. **Baileys** simula o cliente WhatsApp Web (não-oficial, sem aprovação necessária). A **Meta Cloud API** (Interface de Programação Meta na Nuvem) é a via oficial, com aprovação e número homologado. O SDK Node.js oficial da Meta foi arquivado — use `fetch` nativo do Node.js 22.

## Instalação

```bash
# Baileys v7 (cliente não-oficial, ESM-only)
npm install @whiskeysockets/baileys

# Meta Cloud API — sem pacote; usa fetch nativo do Node.js 22
```

---

## Baileys v7

### Import

Baileys v7 é **ESM-only**: `require` é quebrado. `makeWASocket` é `default export`; os utilitários são named imports.

<details>
<summary>❌ Bad — CommonJS quebrado no v7; makeWASocket como named import</summary>
<br>

```js
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
```

</details>

<br>

<details>
<summary>✅ Good — ESM; makeWASocket como default import; named imports separados</summary>
<br>

```js
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
```

</details>

### Setup do Client

<details>
<summary>❌ Bad — sem reconnect; sem tratamento de logout; printQRInTerminal ausente</summary>
<br>

```js
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth');
const socket = makeWASocket({ auth: state });
socket.ev.on('creds.update', saveCreds);
```

</details>

<br>

<details>
<summary>✅ Good — reconnect automático; guard para logout; printQRInTerminal ativo</summary>
<br>

```js
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection !== 'close') return;

    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

    if (shouldReconnect) startBot();
  });

  socket.ev.on('messages.upsert', ({ messages }) => {
    for (const message of messages) {
      processIncomingMessage(socket, message);
    }
  });
}

startBot();
```

</details>

### Processando Mensagens

<details>
<summary>❌ Bad — sem guard para fromMe; routing inline com texto; lógica misturada</summary>
<br>

```js
socket.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0];
  const text = msg.message?.conversation;
  if (text === '/pedido') {
    await socket.sendMessage(msg.key.remoteJid, { text: 'Qual o ID?' });
  }
});
```

</details>

<br>

<details>
<summary>✅ Good — guard fromMe; extração e routing separados; Strategy Map</summary>
<br>

```js
function processIncomingMessage(socket, message) {
  if (message.key.fromMe) return;

  const text = extractMessageText(message);
  const chatId = message.key.remoteJid;

  if (!text) return;

  routeCommand(socket, chatId, text);
}

function extractMessageText(message) {
  const text =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    null;
  return text;
}

const COMMAND_MAP = {
  '/order': orderCommand,
  '/status': statusCommand,
  '/help': helpCommand,
};

async function routeCommand(socket, chatId, text) {
  const commandKey = text.split(' ')[0].toLowerCase();
  const command = COMMAND_MAP[commandKey];

  if (!command) return;

  await command(socket, chatId, text);
}
```

</details>

### Enviando Mensagens

```js
async function orderCommand(socket, chatId, messageText) {
  const orderId = messageText.split(' ')[1];

  if (!orderId) {
    const errorPayload = { text: 'Informe o ID. Exemplo: /order 12345' };
    await socket.sendMessage(chatId, errorPayload);
    return;
  }

  const order = await fetchOrder(orderId);
  const summary = buildOrderSummary(order);
  const messagePayload = { text: summary };

  await socket.sendMessage(chatId, messagePayload);
}
```

---

## Meta Cloud API

### Verificação do Webhook

<details>
<summary>❌ Bad — sem verificação de hub.mode; responde 200 sem checar token</summary>
<br>

```js
app.get('/webhook', (req, res) => {
  res.status(200).send(req.query['hub.challenge']);
});
```

</details>

<br>

<details>
<summary>✅ Good — verifica mode e token antes de responder com o challenge</summary>
<br>

```js
app.get('/webhook', (request, response) => {
  const mode = request.query['hub.mode'];
  const token = request.query['hub.verify_token'];
  const challenge = request.query['hub.challenge'];

  const isVerificationRequest = mode === 'subscribe' && token === process.env.WEBHOOK_VERIFICATION_TOKEN;

  if (!isVerificationRequest) {
    response.sendStatus(403);
    return;
  }

  response.status(200).send(challenge);
});
```

</details>

### Recebendo Mensagens

Responda `200 OK` imediatamente. A Meta cancela a entrega se o endpoint demorar para responder.

<details>
<summary>❌ Bad — req/res abreviados; processamento síncrono; sem checar body.object</summary>
<br>

```js
app.post('/webhook', async (req, res) => {
  const message = extractMessage(req.body);
  await processMessage(message);
  res.sendStatus(200);
});
```

</details>

<br>

<details>
<summary>✅ Good — request/response sem abreviação; 200 imediato; check de body.object; async após resposta</summary>
<br>

```js
import express from 'express';

const app = express();

app.use(express.json());

app.post('/webhook', (request, response) => {
  response.sendStatus(200);

  const isWhatsAppEvent = request.body?.object === 'whatsapp_business_account';

  if (!isWhatsAppEvent) return;

  const message = extractMessage(request.body);

  if (message) processMessage(message);
});

function extractMessage(body) {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;
  return message;
}

async function processMessage(message) {
  const chatId = message.from;
  const text = message.text?.body ?? '';

  await routeCommand(chatId, text);
}
```

</details>

### Enviando Mensagens

<details>
<summary>❌ Bad — endpoint sem versão; env vars fora do padrão Meta; sem recipient_type; sem Content-Type</summary>
<br>

```js
async function sendText(chatId, text) {
  await fetch(`https://graph.facebook.com/${process.env.PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: chatId, text: { body: text } }),
  });
}
```

</details>

<br>

<details>
<summary>✅ Good — endpoint v21.0; env vars padrão Meta; recipient_type explícito; headers completos</summary>
<br>

```js
async function sendTextMessage(chatId, text) {
  const endpoint = `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
  };

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: chatId,
    type: 'text',
    text: { body: text },
  };

  const body = JSON.stringify(payload);
  const response = await fetch(endpoint, { method: 'POST', headers, body });

  return response;
}
```

</details>

### Template Message

O primeiro contato com um usuário exige uma **Template Message** aprovada pela Meta.

```js
async function sendOrderTemplate(chatId, orderId, orderStatus) {
  const endpoint = `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
  };

  const payload = {
    messaging_product: 'whatsapp',
    to: chatId,
    type: 'template',
    template: {
      name: 'order_status_update',
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: orderId },
            { type: 'text', text: orderStatus },
          ],
        },
      ],
    },
  };

  const body = JSON.stringify(payload);
  const response = await fetch(endpoint, { method: 'POST', headers, body });

  return response;
}
```

## Veja também

- [shared/platform/bots-advanced.md — WhatsApp](../../../shared/platform/bots-advanced.md#whatsapp) — API oficial vs não-oficial, Template Messages, verificação de webhook (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md) — webhook vs polling, session state, rate limit
