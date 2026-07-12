# Bot de Discord com discord.js

> Escopo: JavaScript/Node.js. Guia baseado em **discord.js v14.19** com **Node.js 22**.
> Conceitos fundamentais (webhook, polling, command routing, rate limit): [shared/platform/bots.md](../../../shared/platform/bots.md).
> Primitivas Discord (Gateway Intents, Slash Commands, Embeds): [shared/platform/bots-advanced.md](../../../shared/platform/bots-advanced.md).

Um bot de Discord vive em dois canais ao mesmo tempo, e entender essa divisão explica quase todo o resto do código. Pelo **Gateway** (a conexão WebSocket que o Discord mantém aberta com o bot) chegam os eventos: alguém digitou um comando, entrou no servidor, reagiu a uma mensagem. Pela **API REST** (as chamadas HTTP comuns) o bot age: responde, publica comandos, envia mensagem. O **discord.js** é a biblioteca Node.js que embrulha os dois lados. Ela também expõe cada nome de evento e cada flag como constante (`Events`, `GatewayIntentBits`), o que evita o erro de digitação silencioso que uma string solta produziria.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Client** (cliente do bot) | Instância principal do bot; gerencia conexão com o Gateway e registro de eventos |
| **Events** (enum de eventos) | Enum do discord.js com todos os nomes de eventos (`Events.InteractionCreate`, `Events.ClientReady`) |
| **GatewayIntentBits** (flags de intenção do Gateway) | Enum para declarar quais categorias de eventos o bot recebe; intents não declaradas não chegam |
| **Interaction** (interação do usuário) | Objeto recebido quando o usuário usa slash command, botão ou select menu |
| **isChatInputCommand()** (verificação de tipo) | Type guard que confirma que a Interaction é um slash command; obrigatório antes de acessar `commandName` |
| **SlashCommandBuilder** (construtor de comando barra) | Classe para definir o schema de um slash command antes de registrá-lo via REST |
| **EmbedBuilder** (construtor de mensagem rica) | Classe para construir mensagens ricas; enviada dentro do array `embeds: [embed]`, nunca como objeto solto |
| **REST** (Representational State Transfer · cliente HTTP) | Cliente HTTP do discord.js configurado com `version: '10'`; usado para registrar commands via API |

## Instalação

```bash
npm install discord.js
```

## Abrir a conexão e escutar eventos

Registre os listeners usando o enum `Events`, não strings. A versão 14 removeu o suporte a `'ready'` e `'interactionCreate'` escritos à mão: o listener não dispara e nenhum erro aparece, porque o discord.js não tem como saber que você quis dizer outra coisa.

<details>
<summary>❌ Ruim: strings literais removidas no v14; sem type safety</summary>

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

<details>
<summary>✅ Bom: Events enum; Client com intents declaradas; login no final</summary>

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

As **intents** (as categorias de evento que o bot pede para receber) funcionam como uma assinatura: o que você não declarar, o Gateway não envia, e o listener correspondente fica mudo. Declare só o que o bot usa. Duas delas, `MessageContent` e `GuildMembers`, são privilegiadas: o Discord exige que você as habilite no Developer Portal, e bots presentes em mais de 100 servidores passam por revisão para obtê-las.

## Publicar os comandos no Discord

Antes de o usuário poder digitar `/order`, o Discord precisa conhecer esse comando. Publicar em um servidor específico (`applicationGuildCommands`) tem efeito imediato, o que é o que você quer durante o desenvolvimento. Publicar globalmente (`applicationCommands`) leva até uma hora para aparecer em todos os servidores, então deixe para o deploy.

<details>
<summary>❌ Ruim: REST sem version; schema como objeto literal sem validação</summary>

```js
import { REST, Routes } from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(appId, guildId), {
  body: [{ name: 'status', description: 'Status do serviço' }],
});
```

</details>

<details>
<summary>✅ Bom: REST com version: '10'; schema validado via SlashCommandBuilder</summary>

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

O `SlashCommandBuilder` valida o formato do comando na hora em que você o monta. O objeto literal só falha quando a API do Discord recusa o registro, longe da linha que causou o problema.

## Encaminhar cada comando ao seu módulo

Todo slash command chega pelo mesmo evento, `Events.InteractionCreate`. Um clique de botão também. Por isso a primeira linha do listener confirma o tipo com `isChatInputCommand()`, e a segunda consulta um **Strategy Map** (um objeto que associa o nome do comando à função que o executa). O listener escolhe e delega; quem sabe o que `/order` significa é o módulo do comando.

<details>
<summary>❌ Ruim: string literal no evento; sem type guard; lógica de negócio no router; sem deferReply</summary>

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

<details>
<summary>✅ Bom: Events enum; isChatInputCommand() guard; Strategy Map; router só delega</summary>

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

Comando novo passa a ser uma linha no mapa e um arquivo novo. O listener nunca cresce.

## Escrever um comando de ponta a ponta

O Discord dá três segundos para o bot responder uma Interaction. Se o comando consulta banco ou chama outro serviço, esse orçamento acaba antes da resposta ficar pronta, e a interação expira na cara do usuário. A saída é `deferReply()`: ele avisa o Discord "recebi, estou trabalhando", o usuário vê o indicador de digitação e você ganha até 15 minutos para fechar com `editReply()`.

<details>
<summary>❌ Ruim: reply direto em operação assíncrona; embed como objeto solto (sintaxe v13 removida)</summary>

```js
export async function orderCommand(interaction) {
  const orderId = interaction.options.getString('id');
  const order = await db.findOrder(orderId);
  await interaction.reply({ embed: buildOrderEmbed(order) });
}
```

</details>

<details>
<summary>✅ Bom: deferReply antes do await; embeds como array; orquestrador + helpers abaixo</summary>

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

O comando bom lê como um resumo: adia a resposta, lê o argumento, busca o pedido, monta o **embed** (o cartão formatado que o Discord renderiza com título, cor e campos) e edita a resposta. Buscar e formatar viraram funções logo abaixo, na ordem em que são chamadas. Repare também que o embed vai dentro de um array, em `embeds: [embed]`: a chave `embed` no singular é sintaxe da v13 e foi removida.

## Reagir a eventos que não são comandos

Nem tudo que interessa ao bot começa com barra. Membro que entra, reação que aparece: são eventos do Gateway como qualquer outro, e a diferença é que os dados chegam mais crus. O canal de sistema do servidor pode não existir, e o próprio bot dispara reações que ele mesmo escuta. Guarde as duas coisas antes de agir.

<details>
<summary>❌ Ruim: string literal no evento; acesso a canal nulo sem guard; sem guard para bot</summary>

```js
client.on('guildMemberAdd', async (member) => {
  await member.guild.systemChannel.send(`Bem-vindo, ${member.user.username}!`);
});

client.on('messageReactionAdd', async (reaction, user) => {
  await reaction.message.reply(`${user.username} confirmou`);
});
```

</details>

<details>
<summary>✅ Bom: Events enum; guard para canal nulo; guard para bot</summary>

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

Sem o guard de `user.bot`, a resposta do próprio bot vira gatilho para uma nova resposta e o loop se alimenta sozinho.

## Veja também

- [shared/platform/bots-advanced.md (Discord)](../../../shared/platform/bots-advanced.md#discord): Gateway Intents, Slash Commands, Embeds (conceitual)
- [shared/platform/bots.md](../../../shared/platform/bots.md): webhook vs polling, command routing, rate limit
