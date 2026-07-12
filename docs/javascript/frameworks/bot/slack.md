# Bot de Slack com Bolt for JavaScript

> Escopo: JavaScript/Node.js. Guia baseado em **@slack/bolt v4.7.1** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Slack (tokens, Socket Mode, Block Kit, scopes): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md#slack).

O Slack impõe um prazo de resposta ao seu bot, e esse é o fato que organiza este guia. Toda interação que ele envia, seja um comando digitado, um clique de botão ou uma menção, precisa de um **ack()** (de *acknowledge*, o aviso de "recebi") em até três segundos, senão o usuário vê um erro na tela mesmo que o trabalho esteja em andamento. O **Bolt for JavaScript** é o framework oficial da Slack para lidar com isso: você cria um objeto **App** e registra nele os listeners de comando, evento e botão, cada um começando pelo `ack()` e só depois indo trabalhar.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **App** (aplicativo Bolt) | Instância principal do bot; registra listeners e gerencia a conexão com o Slack |
| **ack()** (reconhecer recebimento) | Função de reconhecimento obrigatória; confirma ao Slack que o evento foi recebido em até 3 segundos |
| **say()** (dizer no canal) | Envia uma mensagem ao canal onde o evento ocorreu; aceita string ou objeto com `blocks` |
| **respond()** (responder via URL) | Responde via `response_url`; funciona fora do canal original e aceita `thread_ts` para respostas em thread |
| **Block Kit** (kit de blocos de UI) | Sistema de UI do Slack; mensagens compostas por blocos (`section`, `actions`, `image`) com elementos interativos |
| **Socket Mode** (modo socket) | Conexão via WebSocket usando um App-Level Token; dispensa URL pública; indicado para desenvolvimento e bots internos |
| **Bot Token** (token do bot) | Credencial `xoxb-...` emitida pela Slack para chamadas à API; obtida em OAuth & Permissions |
| **Signing Secret** (segredo de assinatura) | Chave usada para validar que as requisições HTTP vêm do Slack; obtida em Basic Information |
| **App-Level Token** (token de nível de aplicativo) | Credencial `xapp-...` usada exclusivamente no Socket Mode; requer scope `connections:write` |

## Instalação

```bash
npm install @slack/bolt
```

## Criar o app e subir com as credenciais certas

Duas credenciais aparecem já na criação do App. O **Bot Token** (`xoxb-...`) autoriza o bot a chamar a API do Slack. O **Signing Secret** é o que permite ao Bolt provar que uma requisição veio mesmo do Slack, e não de alguém que descobriu sua URL. Nenhuma das duas entra no código: leia de variável de ambiente. E use `await` no `app.start()`, porque sem ele uma falha de inicialização vira uma promise rejeitada que ninguém observa, e o processo segue como se estivesse no ar.

<details>
<summary>❌ Ruim: credenciais hardcoded; sem await no start</summary>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: 'xoxb-1234-...',
  signingSecret: 'abc123',
});

app.start(3000);
```

</details>

<details>
<summary>✅ Bom: credenciais via env; await no start; port via env</summary>

```js
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

await app.start(process.env.PORT ?? 3000);
```

</details>

## Comandos digitados com barra

O `ack()` é a primeira linha do handler, antes de qualquer `await` de trabalho. A ordem importa: se você buscar o pedido primeiro e reconhecer depois, a janela de três segundos pode fechar durante a consulta e o Slack já terá mostrado o erro. Reconheça, depois trabalhe, depois responda com `say()`.

<details>
<summary>❌ Ruim: sem ack(); destructuring no parâmetro; lógica de negócio no handler; format inline no say()</summary>

```js
app.command('/order', async ({ ack, say, command }) => {
  const orderId = command.text.trim();
  const order = await db.findOrder(orderId);
  await say(`Pedido #${order.id}: ${order.status}, Cliente: ${order.customerName}`);
});
```

</details>

<details>
<summary>✅ Bom: ack() primeiro; destructuring no corpo; orquestrador + helpers abaixo</summary>

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

## Reagir ao que acontece no workspace

Além dos comandos, o Slack empurra eventos: alguém mencionou o bot, alguém escreveu no canal. Você os captura com `app.event()`. Em listener de mensagem, o guard de `event.bot_id` não é opcional: as mensagens que o próprio bot envia também chegam como evento, então sem o guard ele responde a si mesmo e o loop não para.

<details>
<summary>❌ Ruim: destructuring no parâmetro; sem guard para bot messages; format inline no say()</summary>

```js
app.event('app_mention', async ({ event, say }) => {
  await say(`Olá, <@${event.user}>! Como posso ajudar?`);
});

app.event('message', async ({ event, say }) => {
  await say(`Recebi: ${event.text}`);
});
```

</details>

<details>
<summary>✅ Bom: destructuring no corpo; guard para bot messages; compute extraído antes do say()</summary>

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

## Botões e blocos interativos

O **Block Kit** é o sistema de interface do Slack: em vez de texto puro, a mensagem vira uma lista de blocos (um parágrafo, uma linha de botões, uma imagem). Cada botão carrega um `action_id`, e é por ele que o Slack encontra o listener registrado em `app.action()` quando alguém clica. O clique é uma interação como qualquer outra, então o `ack()` vale aqui também: enquanto ele não chega, o botão fica girando o indicador de carregamento.

Duas coisas saem do meio do código na versão boa: os blocos viram uma constante nomeada, e o `action_id` vira uma entrada de `ACTIONS`. Assim o nome da ação é escrito uma vez e usado nos dois lugares, em vez de repetido como string solta no botão e no listener, onde um erro de digitação não avisa ninguém.

<details>
<summary>❌ Ruim: blocks montados inline; action_id como string solta; sem ack() na ação</summary>

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

<details>
<summary>✅ Bom: blocks extraídos; action_id como constante; ack() antes do processamento</summary>

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
  const lines = orders.map((order) => `#${order.id}: ${order.status}`);
  const reply = lines.join('\n');
  return reply;
}
```

</details>

## Conexão de saída em vez de webhook

O modo padrão exige que o Slack alcance uma URL pública sua, o que é um problema no notebook do desenvolvedor e um risco a mais em bot interno. O **Socket Mode** inverte a direção: o bot abre uma conexão WebSocket de saída e recebe os eventos por ela. Nada precisa entrar pela sua rede, e não há porta para escutar. O preço é uma credencial extra, o **App-Level Token** (`xapp-...`), que precisa do scope `connections:write`.

<details>
<summary>❌ Ruim: tokens hardcoded; sem await no start</summary>

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

<details>
<summary>✅ Bom: tokens via env; await no start; sem port (Socket Mode não usa porta)</summary>

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

Repare que o `app.start()` não recebe porta aqui. Quem abriu a conexão foi o bot, então não há servidor esperando ninguém.

## Veja também

- [shared/platform/bots-advanced.md (Slack)](../../../shared/platform/bots-advanced.md#slack): tokens, Socket Mode, Block Kit, scopes (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md): webhook vs polling, session state, rate limit
