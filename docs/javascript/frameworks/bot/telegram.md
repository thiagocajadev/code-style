# Telegram — Telegraf

> Escopo: JavaScript/Node.js. Guia baseado em **Telegraf v4.16** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Telegram (BotFather, Inline Keyboard, tipos de chat): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

**Telegraf** é o framework Node.js para a **Bot API** (Interface de Programação para Bots) do Telegram. Usa arquitetura de middleware encadeado: cada update passa por uma pilha de funções antes de chegar ao **Handler** (tratador) final. A biblioteca chama o parâmetro de contexto de `ctx` por convenção, mas este guia usa `context` para seguir o code style do projeto.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Telegraf** | Instância principal do bot; gerencia polling, middleware e roteamento |
| **Context** | Objeto com o evento atual e todos os métodos de resposta; passado a cada **Handler** |
| **Middleware** | Função `(context, next) => void` encadeada antes ou depois dos **Handlers** |
| **message filter** | Função importada de `telegraf/filters` para filtrar eventos por tipo de conteúdo |
| **InlineKeyboard** | Objeto `Markup.inlineKeyboard` para construir botões renderizados abaixo de uma mensagem |
| **callback_query** | Evento disparado quando o usuário clica em um botão inline; deve ser respondido com `answerCbQuery` |

## Instalação

```bash
npm install telegraf
```

## Setup do Bot

```js
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((context) => context.reply('Olá! Use /help para ver os comandos disponíveis.'));

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

`bot.launch()` inicia polling por padrão. Para webhook, use `bot.createWebhook()` (ver seção Webhook em Produção).

## Command Router

<details>
<summary>❌ Bad — ctx abreviado; lógica de negócio dentro do handler; sem separação</summary>
<br>

```js
bot.command('order', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const orderId = parts[1];
  const order = await db.findOrder(orderId);
  await ctx.reply(`Pedido ${order.id}: ${order.status}`);
});
```

</details>

<br>

<details>
<summary>✅ Good — context sem abreviação; handlers importados; router só delega</summary>
<br>

```js
import { helpCommand } from './commands/help.js';
import { orderCommand } from './commands/order.js';
import { statusCommand } from './commands/status.js';

bot.command('help', helpCommand);
bot.command('order', orderCommand);
bot.command('status', statusCommand);
```

</details>

## Filtrando por Tipo de Mensagem

Use o `message` filter de `telegraf/filters` para reagir a tipos específicos de conteúdo sem verificações manuais.

<details>
<summary>❌ Bad — ctx abreviado; verificação manual de tipo; compute e format misturados no argumento</summary>
<br>

```js
bot.on('message', (ctx) => {
  if (ctx.message.sticker) {
    ctx.reply('Sticker recebido!');
  }
  if (ctx.message.photo) {
    ctx.reply('Foto recebida!');
  }
  if (ctx.message.text) {
    ctx.reply(`Texto: ${ctx.message.text}`);
  }
});
```

</details>

<br>

<details>
<summary>✅ Good — message filter declarativo; compute extraído; format separado do argumento</summary>
<br>

```js
import { message } from 'telegraf/filters';

bot.on(message('sticker'), (context) => context.reply('Sticker recebido!'));
bot.on(message('photo'), (context) => context.reply('Foto recebida!'));
bot.on(message('text'), (context) => {
  const userText = context.message.text;
  const echoText = `Texto: ${userText}`;
  context.reply(echoText);
});
```

</details>

## Implementando um Command

<details>
<summary>❌ Bad — ctx abreviado; property access direto no argumento; format inline na chamada</summary>
<br>

```js
export async function orderCommand(ctx) {
  const orderId = ctx.message.text.split(' ')[1];
  const order = await db.findOrder(orderId);
  await ctx.reply(`Pedido #${order.id} — Status: ${order.status} — Cliente: ${order.customerName}`);
}
```

</details>

<br>

<details>
<summary>✅ Good — compute extraído antes do argumento; guard clause; format em função separada</summary>
<br>

```js
export async function orderCommand(context) {
  const messageText = context.message.text;
  const orderId = extractOrderId(messageText);

  if (!orderId) {
    await context.reply('Informe o ID do pedido. Exemplo: /order 12345');
    return;
  }

  const order = await fetchOrder(orderId);
  const summary = buildOrderSummary(order);
  await context.reply(summary);
}

function extractOrderId(messageText) {
  const parts = messageText.split(' ');
  const orderId = parts[1] ?? null;
  return orderId;
}

async function fetchOrder(orderId) {
  const order = await orderRepository.findById(orderId);
  return order;
}

function buildOrderSummary(order) {
  const summary = `Pedido #${order.id}\nStatus: ${order.status}\nCliente: ${order.customerName}`;
  return summary;
}
```

</details>

## Inline Keyboard e Callbacks

Botões inline enviam um `callback_query` silencioso ao bot. Sempre chame `answerCbQuery` ao final — sem isso o Telegram exibe o indicador de carregamento no botão indefinidamente.

<details>
<summary>❌ Bad — ctx abreviado; format inline no argumento; sem answerCbQuery</summary>
<br>

```js
export async function orderCommand(ctx) {
  const orderId = ctx.message.text.split(' ')[1];
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Cancelar pedido', `cancel_${orderId}`),
  ]);
  await ctx.reply(`Pedido #${orderId} encontrado.`, keyboard);
}

bot.action(/^cancel_(.+)$/, async (ctx) => {
  const orderId = ctx.match[1];
  await cancelOrder(orderId);
  await ctx.editMessageText(`Pedido #${orderId} cancelado.`);
});
```

</details>

<br>

<details>
<summary>✅ Good — compute extraído; format nomeado antes do reply; answerCbQuery antes do editMessageText</summary>
<br>

```js
import { Markup } from 'telegraf';

export async function orderCommand(context) {
  const messageText = context.message.text;
  const orderId = extractOrderId(messageText);

  if (!orderId) {
    await context.reply('Informe o ID do pedido. Exemplo: /order 12345');
    return;
  }

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Cancelar pedido', `cancel_${orderId}`),
    Markup.button.callback('Ver detalhes', `details_${orderId}`),
  ]);
  const replyText = `Pedido #${orderId} encontrado.`;

  await context.reply(replyText, keyboard);
}

bot.action(/^cancel_(.+)$/, async (context) => {
  const orderId = context.match[1];

  await cancelOrder(orderId);

  const cancelMessage = `Pedido #${orderId} cancelado.`;

  await context.answerCbQuery('Pedido cancelado.');
  await context.editMessageText(cancelMessage);
});
```

</details>

## Webhook em Produção

Use `bot.createWebhook()` com `secretToken` para validar que os updates vêm do Telegram.

<details>
<summary>❌ Bad — webhookCallback deprecado no v4.16; sem secretToken; sem shutdown limpo</summary>
<br>

```js
import express from 'express';

const app = express();

app.use(bot.webhookCallback('/webhook'));
bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);

app.listen(3000);
```

</details>

<br>

<details>
<summary>✅ Good — bot.createWebhook() com secretToken; await extraído do argumento; shutdown limpo</summary>
<br>

```js
import { createServer } from 'http';

const webhookOptions = {
  domain: process.env.WEBHOOK_DOMAIN,
  path: '/webhook',
  secretToken: process.env.WEBHOOK_SECRET,
};

const webhookHandler = await bot.createWebhook(webhookOptions);
const server = createServer(webhookHandler);

server.listen(3000);

process.once('SIGINT', () => {
  server.close();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  server.close();
  bot.stop('SIGTERM');
});
```

</details>

## Veja também

- [shared/platform/bots-advanced.md — Telegram](../../../shared/platform/bots-advanced.md#telegram) — BotFather, Inline Keyboard, tipos de chat (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md) — webhook vs polling, session state, rate limit
