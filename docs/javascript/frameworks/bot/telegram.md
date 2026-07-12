# Bot de Telegram com Telegraf

> Escopo: JavaScript/Node.js. Guia baseado em **Telegraf v4.16** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Telegram (BotFather, Inline Keyboard, tipos de chat): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

Tudo que acontece com o bot no Telegram chega como um **update** (uma novidade: mensagem nova, clique em botão, entrada em grupo). O **Telegraf** é o framework Node.js que recebe esse fluxo e o empurra por uma pilha de **middlewares** (funções encadeadas que veem o update antes de quem vai de fato tratá-lo) até o handler final. Cada função recebe o mesmo objeto de contexto, que carrega o update atual e todos os métodos de resposta. A biblioteca chama esse parâmetro de `ctx` por convenção; este guia escreve `context` por inteiro, seguindo o code style do projeto.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Telegraf** (framework de bot) | Instância principal do bot; gerencia polling, middleware e roteamento |
| **Context** (contexto da requisição) | Objeto com o evento atual e todos os métodos de resposta; passado a cada **Handler** |
| **Middleware** (componente de pipeline) | Função `(context, next) => void` encadeada antes ou depois dos **Handlers** |
| **message filter** (filtro de mensagem) | Função importada de `telegraf/filters` para filtrar eventos por tipo de conteúdo |
| **InlineKeyboard** (teclado embutido) | Objeto `Markup.inlineKeyboard` para construir botões renderizados abaixo de uma mensagem |
| **callback_query** (consulta de retorno) | Evento disparado quando o usuário clica em um botão inline; deve ser respondido com `answerCbQuery` |

## Instalação

```bash
npm install telegraf
```

## Ligar o bot e encerrar sem perder update

O arquivo de entrada cria a instância com o token, registra a saudação inicial e sobe o bot. As duas últimas linhas existem para o desligamento: quando o processo recebe um sinal de término, `bot.stop()` fecha a conexão em vez de derrubá-la no meio de um update.

```js
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((context) => context.reply('Olá! Use /help para ver os comandos disponíveis.'));

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

Por padrão, `bot.launch()` entra em **polling**: o bot pergunta ao Telegram, de tempos em tempos, se há update novo. É o modo simples, bom para desenvolver. Em produção você inverte a direção e deixa o Telegram bater no seu servidor, o que é assunto da seção sobre webhook mais adiante.

## Encaminhar cada comando ao seu módulo

O roteador é um índice: nome do comando de um lado, função que o executa do outro. Ele não abre mensagem, não consulta banco, não formata texto. Quando a lógica de `/order` mora dentro do `bot.command('order', ...)`, o arquivo de entrada vira o depósito de todas as regras do bot.

<details>
<summary>❌ Ruim: ctx abreviado; lógica de negócio dentro do handler; sem separação</summary>

```js
bot.command('order', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const orderId = parts[1];
  const order = await db.findOrder(orderId);
  await ctx.reply(`Pedido ${order.id}: ${order.status}`);
});
```

</details>

<details>
<summary>✅ Bom: context sem abreviação; handlers importados; router só delega</summary>

```js
import { helpCommand } from './commands/help.js';
import { orderCommand } from './commands/order.js';
import { statusCommand } from './commands/status.js';

bot.command('help', helpCommand);
bot.command('order', orderCommand);
bot.command('status', statusCommand);
```

</details>

## Tratar só o tipo de mensagem que interessa

O filtro `message` de `telegraf/filters` deixa você declarar o tipo de conteúdo que o handler aceita: figurinha, foto, texto. O Telegraf faz a triagem e chama seu código apenas quando o update bate. A versão manual, com uma cadeia de `if` olhando qual campo existe no objeto, faz o mesmo trabalho de um jeito que o leitor precisa reconstruir na cabeça.

<details>
<summary>❌ Ruim: ctx abreviado; verificação manual de tipo; compute e format misturados no argumento</summary>

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

<details>
<summary>✅ Bom: message filter declarativo; compute extraído; format separado do argumento</summary>

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

## Escrever um comando de ponta a ponta

Um comando do Telegram chega como texto puro: `/order 12345` é uma string, e o argumento é o que vem depois do espaço. O handler tem então três trabalhos distintos, e a versão boa dá um nome a cada um: extrair o ID do texto, buscar o pedido, montar o texto da resposta. O orquestrador fica em cima, legível de ponta a ponta, e as três funções aparecem embaixo na ordem em que são chamadas.

<details>
<summary>❌ Ruim: ctx abreviado; property access direto no argumento; format inline na chamada</summary>

```js
export async function orderCommand(ctx) {
  const orderId = ctx.message.text.split(' ')[1];
  const order = await db.findOrder(orderId);
  await ctx.reply(`Pedido #${order.id}, Status: ${order.status}, Cliente: ${order.customerName}`);
}
```

</details>

<details>
<summary>✅ Bom: compute extraído antes do argumento; guard clause; format em função separada</summary>

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

O guard no topo trata o caso mais comum de erro do usuário, que é digitar `/order` sem o número, e devolve o exemplo de uso em vez de estourar mais adiante.

## Botões na mensagem e a resposta ao clique

Botões inline aparecem colados na mensagem e, ao serem clicados, mandam ao bot um `callback_query`: um evento silencioso que carrega o dado que você embutiu no botão (aqui, `cancel_12345`). Dois detalhes decidem se a experiência funciona. O `bot.action` casa esse dado por expressão regular e recupera o ID. E `answerCbQuery()` precisa ser chamado, sempre: enquanto ele não chega, o Telegram mantém o botão girando o indicador de carregamento, mesmo que a ação já tenha sido concluída.

<details>
<summary>❌ Ruim: ctx abreviado; format inline no argumento; sem answerCbQuery</summary>

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

<details>
<summary>✅ Bom: compute extraído; format nomeado antes do reply; answerCbQuery antes do editMessageText</summary>

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

## Receber os updates por webhook em produção

Em produção o polling é desperdício: o bot fica perguntando por novidade que quase nunca existe. O **webhook** inverte o fluxo, e o Telegram passa a chamar uma URL sua a cada update. Isso abre uma porta pública, então o `secretToken` vem junto: o Telegram o envia em um cabeçalho a cada chamada, e o Telegraf recusa qualquer requisição que não o traga. Sem ele, qualquer pessoa que descubra a URL pode fabricar updates para o seu bot.

<details>
<summary>❌ Ruim: webhookCallback descontinuado no v4.16; sem secretToken; sem shutdown limpo</summary>

```js
import express from 'express';

const app = express();

app.use(bot.webhookCallback('/webhook'));
bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);

app.listen(3000);
```

</details>

<details>
<summary>✅ Bom: bot.createWebhook() com secretToken; await extraído do argumento; shutdown limpo</summary>

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

O encerramento agora fecha as duas pontas: o servidor HTTP para de aceitar conexão e o bot se despede do Telegram.

## Veja também

- [shared/platform/bots-advanced.md (Telegram)](../../../shared/platform/bots-advanced.md#telegram): BotFather, Inline Keyboard, tipos de chat (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md): webhook vs polling, session state, rate limit
