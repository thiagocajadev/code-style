# Bot de WhatsApp com Baileys ou Meta Cloud API

> Escopo: JavaScript/Node.js. Guia baseado em **Baileys v7** e **Meta Cloud API v21.0** com **Node.js 22**.
> Conceitos transversais de bots (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Diferença entre API oficial e cliente não-oficial, Template Messages, verificação de webhook: [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

Automatizar WhatsApp começa com uma escolha, e ela muda tudo que vem depois. O **Baileys** finge ser o WhatsApp Web: você lê um QR code com o celular, a sessão abre e o bot funciona hoje, sem pedir licença a ninguém. Como a Meta não autoriza esse caminho, o número pode ser bloqueado. A **Meta Cloud API** é a via oficial, com número homologado, mensagens pré-aprovadas e regra sobre quando o bot pode falar; custa aprovação e burocracia, e em troca não desaparece. Baileys serve a protótipo e uso interno; a Cloud API, a produto que precisa durar. Uma pegadinha vale registrar de saída: a Meta arquivou o SDK Node.js oficial, então o caminho dela aqui é `fetch` puro do Node.js 22.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Baileys** (cliente WhatsApp Web não-oficial) | Biblioteca que simula o WhatsApp Web via WebSocket; sem aprovação da Meta |
| **Meta Cloud API** (Interface de Programação Meta na Nuvem) | API oficial da Meta para WhatsApp Business; exige aprovação e número homologado |
| **WhatsApp Business Account** (Conta WhatsApp Business) | Entidade que agrupa números e templates aprovados pela Meta |
| **Template Message** (mensagem por template) | Mensagem com formato pré-aprovado pela Meta; obrigatória fora da janela de 24h |
| **24-hour window** (janela de 24 horas) | Período após mensagem do usuário em que o bot pode responder com texto livre |
| **webhook verification** (verificação de webhook) | Handshake `hub.challenge` que a Meta exige para confirmar o dono do endpoint |
| **QR pairing** (pareamento por QR) | Fluxo do Baileys que registra a sessão lendo um QR code com o app do celular |
| **multi-file auth state** (estado de autenticação em múltiplos arquivos) | Persistência de credenciais Baileys em arquivos separados (`useMultiFileAuthState`) |

## Instalação

```bash
# Baileys v7 (cliente não-oficial, ESM-only)
npm install @whiskeysockets/baileys

# Meta Cloud API: sem pacote; usa fetch nativo do Node.js 22
```

---

## Baileys v7

### O que importar do pacote

A versão 7 do Baileys é **ESM-only** (publicada só como módulo ES), e `require` deixou de funcionar. O detalhe que costuma custar meia hora: `makeWASocket` é o export padrão, enquanto os utilitários são exports nomeados. Trocar os dois de lugar produz um `undefined` na hora de criar o socket.

<details>
<summary>❌ Ruim: CommonJS quebrado no v7; makeWASocket como named import</summary>

```js
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
```

</details>

<details>
<summary>✅ Bom: ESM; makeWASocket como default import; named imports separados</summary>

```js
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
```

</details>

### Abrir a sessão e sobreviver às quedas

A conexão do Baileys cai: a rede oscila, o WhatsApp encerra a sessão, o processo reinicia. O que separa um bot utilizável de um que exige babá é o tratamento de `connection.update`. Quando a conexão fecha, você olha o motivo: se foi logout de verdade, reconectar não adianta, porque a credencial morreu e o QR precisa ser lido de novo; qualquer outro motivo é queda passageira e pede um `startBot()` novo. `useMultiFileAuthState` é o que faz o reinício ser barato, guardando a credencial em disco para que o QR não volte a cada restart.

<details>
<summary>❌ Ruim: sem reconnect; sem tratamento de logout; printQRInTerminal ausente</summary>

```js
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth');
const socket = makeWASocket({ auth: state });
socket.ev.on('creds.update', saveCreds);
```

</details>

<details>
<summary>✅ Bom: reconnect automático; guard para logout; printQRInTerminal ativo</summary>

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

### Ler a mensagem recebida e despachar

Duas armadilhas moram aqui. A primeira: o evento `messages.upsert` também entrega o que o próprio bot enviou, então o guard de `message.key.fromMe` evita que ele converse consigo mesmo. A segunda: o texto da mensagem não vem sempre no mesmo campo. Mensagem simples chega em `conversation`; mensagem que cita outra, ou que traz link, chega em `extendedTextMessage.text`. Por isso a extração vira uma função própria, e o handler fica com três passos legíveis: descartar o que é seu, pegar o texto, despachar pelo mapa de comandos.

<details>
<summary>❌ Ruim: sem guard para fromMe; routing inline com texto; lógica misturada</summary>

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

<details>
<summary>✅ Bom: guard fromMe; extração e routing separados; Strategy Map</summary>

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

O `remoteJid` que vira `chatId` é o identificador da conversa no WhatsApp, e é para ele que a resposta volta.

### Responder ao contato

O comando recebe o socket, a conversa e o texto, e devolve a resposta pelo mesmo caminho. O `sendMessage` sempre leva um objeto, nunca uma string solta, porque a mesma chamada serve para texto, imagem e documento; o formato do objeto é que decide.

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

### Provar à Meta que o endpoint é seu

Antes de mandar qualquer mensagem para o seu webhook, a Meta faz uma visita de conferência: chama a URL com três parâmetros e espera receber de volta o valor de `hub.challenge`. Devolver o challenge sem olhar o resto é o erro comum, e ele entrega o endpoint a qualquer um que descubra a URL. A verificação real confere duas coisas antes: que `hub.mode` é `subscribe` e que `hub.verify_token` bate com o segredo que você cadastrou no painel da Meta.

<details>
<summary>❌ Ruim: sem verificação de hub.mode; responde 200 sem checar token</summary>

```js
app.get('/webhook', (req, res) => {
  res.status(200).send(req.query['hub.challenge']);
});
```

</details>

<details>
<summary>✅ Bom: verifica mode e token antes de responder com o challenge</summary>

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

### Aceitar rápido e processar depois

Responda `200 OK` na primeira linha, antes de processar. A Meta trata demora como falha de entrega: ela cancela, tenta de novo e, se o padrão se repetir, desativa o webhook. Buscar pedido no banco antes de responder coloca o tempo do seu banco dentro do orçamento dela. A inversão resolve: confirma o recebimento, e o processamento continua depois que a resposta já saiu.

<details>
<summary>❌ Ruim: req/res abreviados; processamento síncrono; sem checar body.object</summary>

```js
app.post('/webhook', async (req, res) => {
  const message = extractMessage(req.body);
  await processMessage(message);
  res.sendStatus(200);
});
```

</details>

<details>
<summary>✅ Bom: request/response sem abreviação; 200 imediato; check de body.object; async após resposta</summary>

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

O caminho até a mensagem dentro do corpo é longo e cheio de arrays, e nem todo evento traz mensagem: notificação de entrega e de leitura chegam pelo mesmo endpoint. Daí a cadeia de acesso opcional em `extractMessage`, terminando em `null` quando não há nada para tratar.

### Chamar a API para responder

Sem SDK, a resposta é um `POST` montado à mão. Vale reparar em três detalhes que a versão ruim erra. A versão vai no caminho (`/v21.0/`), porque endpoint sem versão segue a versão padrão da conta e muda debaixo do seu código. O `Content-Type: application/json` precisa estar presente, senão a Meta não lê o corpo. E o `recipient_type` explícito evita ambiguidade quando o destino não é uma pessoa.

<details>
<summary>❌ Ruim: endpoint sem versão; env vars fora do padrão Meta; sem recipient_type; sem Content-Type</summary>

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

<details>
<summary>✅ Bom: endpoint v21.0; env vars padrão Meta; recipient_type explícito; headers completos</summary>

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

### Mensagem pré-aprovada fora da janela de 24 horas

Texto livre só é permitido dentro da **janela de 24 horas**, contada a partir da última mensagem que o usuário mandou. Passado esse prazo, ou quando é o bot quem inicia a conversa, a Meta só aceita uma **Template Message**: um formato que você cadastrou antes e que ela aprovou, com os trechos variáveis marcados. No envio, você não manda o texto pronto, manda o nome do template, o idioma e os valores que preenchem as lacunas, na ordem em que foram declaradas.

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

- [shared/platform/bots-advanced.md (WhatsApp)](../../../shared/platform/bots-advanced.md#whatsapp): API oficial vs não-oficial, Template Messages, verificação de webhook (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md): webhook vs polling, session state, rate limit
