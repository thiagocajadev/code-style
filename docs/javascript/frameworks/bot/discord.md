# Discord — discord.js

> Escopo: JavaScript/Node.js. Guia baseado em **discord.js v14.19** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Discord (Gateway Intents, Slash Commands, Embeds): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

**discord.js** é a biblioteca Node.js para interagir com a API do Discord. Um **Client** (instância do bot) conecta ao **Gateway** via WebSocket, recebe eventos e responde por meio da API REST. Eventos e flags são enumerados via objetos tipados (`Events`, `GatewayIntentBits`) — nunca strings literais.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Client** | Instância principal do bot; gerencia conexão com o Gateway e registro de eventos |
| **Events** | Enum do discord.js com todos os nomes de eventos (`Events.InteractionCreate`, `Events.ClientReady`) |
| **GatewayIntentBits** | Enum para declarar quais categorias de eventos o bot recebe; intents não declaradas não chegam |
| **Interaction** | Objeto recebido quando o usuário usa slash command, botão ou select menu |
| **isChatInputCommand()** | Type guard que confirma que a Interaction é um slash command; obrigatório antes de acessar `commandName` |
| **SlashCommandBuilder** | Classe para definir o schema de um slash command antes de registrá-lo via REST |
| **EmbedBuilder** | Classe para construir mensagens ricas; enviada dentro do array `embeds: [embed]`, nunca como objeto solto |
| **REST** | Cliente HTTP do discord.js configurado com `version: '10'`; usado para registrar commands via API |

## Instalação

```bash
npm install discord.js
```

## Setup do Client

Use o enum `Events` em todos os listeners. Strings literais como `'ready'` ou `'interactionCreate'` foram removidas no v14.

<details>
<summary>❌ Bad — strings literais removidas no v14; sem type safety</summary>
<br>

```js
client.on('ready', () => {
  console.log('Bot pronto');
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'status') {
    await interaction.reply('OK');
  }
});
```

</details>

<br>

<details>
<summary>✅ Good — Events enum; Client com intents declaradas; login no final</summary>
<br>

```js
import { Client, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot conectado como ${readyClient.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
```

</details>

Declare apenas as intents que o bot realmente usa. `MessageContent` e `GuildMembers` são intents privilegiadas: precisam ser habilitadas no Discord Developer Portal para bots em mais de 100 servidores.

## Registro de Slash Commands

O registro por servidor (`applicationGuildCommands`) é instantâneo — ideal para desenvolvimento. O registro global (`applicationCommands`) leva até 1 hora para propagar.

<details>
<summary>❌ Bad — REST sem version; schema como objeto literal sem validação</summary>
<br>

```js
import { REST, Routes } from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(appId, guildId), {
  body: [{ name: 'status', description: 'Status do serviço' }],
});
```

</details>

<br>

<details>
<summary>✅ Good — REST com version: '10'; schema validado via SlashCommandBuilder</summary>
<br>

```js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Retorna o status atual do serviço')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('order')
    .setDescription('Consulta um pedido pelo ID')
    .addStringOption((option) =>
      option.setName('id').setDescription('ID do pedido').setRequired(true),
    )
    .toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
    { body: commands },
  );
}

registerCommands();
```

</details>

## Command Router

Use `Events.InteractionCreate` e o type guard `isChatInputCommand()`. Centralize o roteamento em um **Strategy Map**.

<details>
<summary>❌ Bad — string literal no evento; sem type guard; lógica de negócio no router; sem deferReply</summary>
<br>

```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'order') {
    const orderId = interaction.options.getString('id');
    const order = await db.findOrder(orderId);
    await interaction.reply(`Status: ${order.status}`);
  }
});
```

</details>

<br>

<details>
<summary>✅ Good — Events enum; isChatInputCommand() guard; Strategy Map; router só delega</summary>
<br>

```js
import { Events } from 'discord.js';

import { orderCommand } from './commands/order.js';
import { statusCommand } from './commands/status.js';

const COMMAND_MAP = {
  order: orderCommand,
  status: statusCommand,
};

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = COMMAND_MAP[interaction.commandName];

  if (!command) {
    await interaction.reply({ content: 'Comando não encontrado.', ephemeral: true });
    return;
  }

  await command(interaction);
});
```

</details>

## Implementando um Command

A resposta a uma Interaction deve ocorrer em até 3 segundos. Para operações assíncronas, chame `deferReply` antes e finalize com `editReply`.

<details>
<summary>❌ Bad — reply direto em operação assíncrona; embed como objeto solto (sintaxe v13 removida)</summary>
<br>

```js
export async function orderCommand(interaction) {
  const orderId = interaction.options.getString('id');
  const order = await db.findOrder(orderId);
  await interaction.reply({ embed: buildOrderEmbed(order) });
}
```

</details>

<br>

<details>
<summary>✅ Good — deferReply antes do await; embeds como array; orquestrador + helpers abaixo</summary>
<br>

```js
import { EmbedBuilder } from 'discord.js';

export async function orderCommand(interaction) {
  await interaction.deferReply();

  const orderId = interaction.options.getString('id');

  const order = await fetchOrder(orderId);
  const embed = buildOrderEmbed(order);
  const replyPayload = { embeds: [embed] };

  await interaction.editReply(replyPayload);
}

async function fetchOrder(orderId) {
  const order = await orderRepository.findById(orderId);
  return order;
}

function buildOrderEmbed(order) {
  const embed = new EmbedBuilder()
    .setTitle(`Pedido #${order.id}`)
    .setDescription(`Status: ${order.status}`)
    .setColor(0x5865f2)
    .addFields({ name: 'Cliente', value: order.customerName })
    .setTimestamp();
  return embed;
}
```

</details>

## Eventos além de slash commands

<details>
<summary>❌ Bad — string literal no evento; acesso a canal nulo sem guard; sem guard para bot</summary>
<br>

```js
client.on('guildMemberAdd', async (member) => {
  await member.guild.systemChannel.send(`Bem-vindo, ${member.user.username}!`);
});

client.on('messageReactionAdd', async (reaction, user) => {
  await reaction.message.reply(`${user.username} confirmou`);
});
```

</details>

<br>

<details>
<summary>✅ Good — Events enum; guard para canal nulo; guard para bot</summary>
<br>

```js
client.on(Events.GuildMemberAdd, async (member) => {
  const welcomeChannel = member.guild.systemChannel;

  if (!welcomeChannel) return;

  const welcomeMessage = `Bem-vindo ao servidor, ${member.user.username}!`;
  await welcomeChannel.send(welcomeMessage);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name !== '✅') return;

  const confirmMessage = `${user.username} confirmou com ✅`;
  await reaction.message.reply(confirmMessage);
});
```

</details>

## Veja também

- [shared/platform/bots-advanced.md — Discord](../../../shared/platform/bots-advanced.md#discord) — Gateway Intents, Slash Commands, Embeds (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md) — webhook vs polling, command routing, rate limit
