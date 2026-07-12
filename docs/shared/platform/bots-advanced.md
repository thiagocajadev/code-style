# Bots de mensageria (avançado)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
> Pré-requisito: [bots.md](bots.md), que cobre webhook, polling, command routing, session e rate limit.

Cada plataforma de mensageria resolve os mesmos problemas de um jeito próprio. Esta página cobre o que muda de uma para a outra: como o bot prova quem é, quais elementos de **UI** (User Interface · Interface do Usuário) a plataforma oferece e onde ela impõe limites. O **gateway** (ponto de entrada da plataforma) é o servidor por onde os eventos chegam ao bot.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Gateway Intent** (intenção de gateway) | Declaração de quais categorias de eventos o bot quer receber do Discord; reduz tráfego desnecessário |
| **Slash Command** (comando de barra) | Comando registrado na plataforma com `/prefixo`; aparece com autocomplete para o usuário |
| **Embed** (mensagem incorporada) | Mensagem rica do Discord com título, descrição, cor, imagem e campos estruturados |
| **Inline Keyboard** (teclado inline) | Botões renderizados abaixo de uma mensagem no Telegram; cada botão dispara um **callback** |
| **BotFather** (bot oficial do Telegram que cria bots) | Bot oficial do Telegram para criar e configurar bots: gera o token de autenticação |
| **Bot Token** (token do bot) | Credencial de autenticação emitida pela plataforma; nunca exposta em código ou repositório |
| **Business API** (API empresarial) | API oficial do WhatsApp para envio de mensagens; exige aprovação Meta e número homologado |
| **Unofficial Client** (cliente não-oficial) | Biblioteca que simula o cliente WhatsApp Web para automação; sem suporte oficial e sujeita a banimento |
| **Template Message** (mensagem de modelo) | Formato de mensagem pré-aprovado pela Meta para o primeiro contato com o usuário no WhatsApp |

---

## Discord

### Autenticação e setup

O bot se identifica com um **Bot Token** criado no [Discord Developer Portal](https://discord.com/developers/applications). O token viaja no header `Authorization: Bot <token>` em toda chamada à **API** (Application Programming Interface · Interface de Programação de Aplicações) **REST** (Representational State Transfer · Transferência de Estado Representacional), e também na conexão WebSocket com o **Gateway**.

```
Criar Application → Add Bot → copiar token → convidar bot ao servidor com OAuth2 URL
```

O token de uma conta de usuário (self-bot) nunca serve para isso. Usá-lo viola os Termos de Serviço do Discord e leva a banimento permanente da conta.

### Gateway Intents

O Discord só entrega ao bot os eventos que ele pediu. Esse pedido é feito com **Gateway Intents**, e o evento cuja intent não foi declarada nunca chega. As intents privilegiadas (Presence, Guild Members, Message Content) dão acesso a dados sensíveis, então passam por aprovação manual da plataforma quando o bot está em mais de 100 servidores.

| Intent | Eventos incluídos |
|---|---|
| `GUILDS` | Criação, atualização e exclusão de servidores e canais |
| `GUILD_MESSAGES` | Mensagens em canais de servidor |
| `MESSAGE_CONTENT` | Conteúdo textual das mensagens (privilegiada) |
| `DIRECT_MESSAGES` | Mensagens diretas entre usuário e bot |
| `GUILD_MEMBERS` | Entrada, saída e atualização de membros (privilegiada) |

### Slash Commands

O comando precisa ser registrado na API do Discord antes de aparecer para o usuário. O registro global demora até uma hora para propagar; o registro por servidor vale na hora, e é o que se usa em desenvolvimento.

```
Definir schema do comando → POST /applications/:id/commands → Discord registra → usuário digita / → autocomplete aparece → usuário confirma → Discord envia Interaction → bot responde
```

O bot tem **3 segundos** para responder a uma Interaction. Quando o processamento demora mais que isso, o bot chama `deferReply` para segurar a interação e edita a resposta quando o trabalho termina.

### Embeds

O **Embed** é o formato de mensagem rica do Discord: título, descrição, cor, imagem e campos, tudo em um cartão estruturado. Ele cabe melhor que uma mensagem longa em Markdown quando há vários campos para mostrar.

Limites de embed:
- Título: 256 caracteres
- Descrição: 4096 caracteres
- Campos: máximo 25 por embed
- Total de caracteres por mensagem: 6000

---

## Telegram

### Autenticação e setup

O **Bot Token** do Telegram vem do **BotFather** ([@BotFather](https://t.me/BotFather)), o bot oficial que cria bots. Toda requisição à **Bot API** carrega o token dentro da própria **URL** (Uniform Resource Locator · Localizador Uniforme de Recurso): `https://api.telegram.org/bot<token>/método`.

```
/newbot no BotFather → define nome e username → BotFather entrega o token
```

Como o token vai na URL, ele aparece em log de servidor e em histórico de proxy com facilidade. Trate cada URL da Bot API como material sensível.

### Modos de conexão

O Telegram aceita os dois modos, webhook e polling. Para webhook, o endpoint precisa de certificado TLS válido, e um certificado autoassinado só funciona com configuração extra.

```
Webhook:  POST https://api.telegram.org/bot<token>/setWebhook?url=<sua-url>
Polling:  GET  https://api.telegram.org/bot<token>/getUpdates?offset=<ultimo-update-id>
```

No polling, o parâmetro `offset` avisa ao Telegram o que já foi consumido. Ele avança para o `update_id` do último evento processado mais um. Esquecer de avançá-lo faz o bot reprocessar o mesmo lote de eventos para sempre.

### Inline Keyboard

São três tipos de botão, com comportamentos diferentes:

| Tipo | Comportamento |
|---|---|
| `InlineKeyboardButton` com `callback_data` | Envia callback silencioso ao bot; não cria nova mensagem |
| `InlineKeyboardButton` com `url` | Abre link externo no browser do usuário |
| `ReplyKeyboardMarkup` | Botões que substituem o teclado do usuário; cria mensagem de texto ao clicar |

O clique chega ao bot como um evento `callback_query`. Depois de tratar o clique, o bot chama `answerCallbackQuery`, e é essa chamada que apaga o indicador de carregamento girando na tela do usuário.

### Tipos de chat

| Tipo | Descrição |
|---|---|
| `private` | Conversa direta entre usuário e bot |
| `group` | Grupo com até 200 membros; bot só recebe mensagens se for adicionado |
| `supergroup` | Grupo com mais de 200 membros ou migrado; bot precisa de permissão para ler mensagens |
| `channel` | Canal de broadcast; bot pode ser admin e enviar mensagens |

Em grupo e supergrupo, o Telegram protege a privacidade da conversa: o bot só enxerga a mensagem que o menciona (`@bot`), a menos que a leitura ampla seja habilitada nas configurações do BotFather.

---

## WhatsApp

### API oficial ou cliente não-oficial

A automação do WhatsApp tem dois caminhos, com consequências bem diferentes.

| | Business API (oficial) | Bibliotecas não-oficiais |
|---|---|---|
| **Exemplos** | Meta Cloud API, On-Premise API | Baileys, whatsapp-web.js |
| **Aprovação** | Exige conta Meta Business e número homologado | Qualquer número |
| **Custo** | Por conversa (modelo de pricing Meta) | Gratuito |
| **Risco de banimento** | Nenhum se dentro dos Termos de Serviço | Alto; número pode ser banido sem aviso |
| **Suporte** | Oficial via Meta | Comunidade |
| **Recomendação** | Produção e uso comercial | Prototipação e uso pessoal |

Com usuários reais ou dados sensíveis em jogo, use a **Business API** oficial. O número banido leva junto o histórico de conversas e o contato dos clientes.

### Business API: fluxo de mensagens

O bot não pode abrir uma conversa com texto livre. O primeiro contato sai como **Template Message**, um modelo que a Meta aprovou antes. Quando o usuário responde, abre uma janela de 24 horas em que o bot conversa livremente. Passadas as 24 horas sem resposta, o próximo contato volta a exigir template.

```
Bot envia Template → usuário responde → janela de 24h aberta → troca livre → janela fecha → novo Template necessário
```

O webhook da Business API entrega os eventos aninhados neste formato:

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{ "from": "5511...", "text": { "body": "Olá" } }]
      }
    }]
  }]
}
```

O endpoint responde `200 OK` na hora. Processar a mensagem dentro do handler do webhook estoura o tempo de espera da Meta, e ela reenvia o evento. Grave o evento numa fila e processe depois.

### Verificação do webhook

Antes de ativar o webhook, a Meta precisa confirmar que a URL pertence a quem diz ser dono dela. Ela manda um `GET` com `hub.verify_token` (o segredo que você cadastrou) e `hub.challenge` (um número aleatório). O bot confere o token e devolve o `hub.challenge` no corpo da resposta.

```
GET /webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<nonce>
Bot responde: 200 OK com body = hub.challenge
```

---

## Slack

### Autenticação e setup

O app usa um **Bot Token** (`xoxb-...`), emitido na seção OAuth & Permissions do painel da Slack. O **Signing Secret** (segredo de assinatura) serve para o caminho contrário: com ele o app confere que a requisição **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) recebida veio mesmo da Slack. No Socket Mode entra um terceiro, o **App-Level Token** (`xapp-...`) com scope `connections:write`, que dispensa a URL pública.

```
Criar app em api.slack.com → Basic Information → Signing Secret
                           → OAuth & Permissions → Add scopes → Install app → Bot Token
                           → App-Level Tokens (para Socket Mode) → Generate → connections:write
```

Os três ficam em variável de ambiente. Nenhum deles entra no código.

### Conexão de saída ou endpoint público

| | Socket Mode | HTTP Mode |
|---|---|---|
| **Conexão** | WebSocket via App-Level Token | HTTP POST com verificação de Signing Secret |
| **URL pública** | Não necessário | Obrigatório |
| **Token adicional** | `SLACK_APP_TOKEN` (`xapp-...`) | Não necessário |
| **Uso recomendado** | Desenvolvimento e bots internos | Produção e apps distribuídos |

No Socket Mode o app abre a conexão de dentro para fora, então funciona atrás de firewall e na máquina de desenvolvimento, sem túnel nem domínio.

### Block Kit

O **Block Kit** é o sistema de interface interativa da Slack. A mensagem é montada como uma lista de blocos tipados, e cada elemento interativo carrega um `action_id` que identifica o clique quando ele volta para o bot.

| Tipo de bloco | Para que serve |
|---|---|
| `section` | Texto com Markdown (`mrkdwn`) e elemento acessório opcional |
| `actions` | Linha de botões, selects ou date pickers |
| `image` | Imagem com título e texto alternativo |
| `divider` | Separador visual entre blocos |
| `header` | Título em plain text em fonte maior |
| `input` | Campo de entrada para modais e Home Tab |

O clique chega em `app.action(action_id, handler)`. O `ack()` (confirmação de recebimento) precisa sair em até 3 segundos, e ele é o que remove o indicador de carregamento do botão na tela do usuário. Sem `ack()`, o botão gira para sempre.

### Scopes

Peça em OAuth & Permissions apenas os scopes que o app usa. Cada scope a mais amplia o estrago que um token vazado causa, e scope desnecessário também trava a aprovação em app directory.

| Scope | Para que serve |
|---|---|
| `chat:write` | Enviar mensagens como o bot |
| `commands` | Receber slash commands |
| `app_mentions:read` | Receber eventos de menção (`app_mention`) |
| `channels:history` | Ler mensagens de canais públicos |
| `im:history` | Ler mensagens diretas com o bot |
| `reactions:write` | Adicionar reações a mensagens |

---

## Veja também

- [bots.md](bots.md): conceitos fundamentais: webhook, polling, command routing, rate limit, lifecycle
- [javascript/frameworks/bot/discord.md](../../javascript/frameworks/bot/discord.md): implementação discord.js
- [javascript/frameworks/bot/telegram.md](../../javascript/frameworks/bot/telegram.md): implementação Telegraf
- [javascript/frameworks/bot/whatsapp.md](../../javascript/frameworks/bot/whatsapp.md): implementação Baileys e Meta Cloud API
- [javascript/frameworks/bot/slack.md](../../javascript/frameworks/bot/slack.md): implementação Bolt for JavaScript
