# Bots de Mensageria (avançado)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
> Pré-requisito: [bots.md](bots.md) — conceitos fundamentais (webhook, polling, command routing, session, rate limit).

Este guia cobre as particularidades de cada plataforma: como autenticar, quais primitivas de UI cada uma oferece e onde estão os limites de cada **gateway** (ponto de entrada da plataforma).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Gateway Intent** (intenção de gateway) | Declaração de quais categorias de eventos o bot quer receber do Discord; reduz tráfego desnecessário |
| **Slash Command** (comando de barra) | Comando registrado na plataforma com `/prefixo`; aparece com autocomplete para o usuário |
| **Embed** | Mensagem rica do Discord com título, descrição, cor, imagem e campos estruturados |
| **Inline Keyboard** (teclado inline) | Botões renderizados abaixo de uma mensagem no Telegram; cada botão dispara um **callback** |
| **BotFather** | Bot oficial do Telegram para criar e configurar bots: gera o token de autenticação |
| **Bot Token** (token do bot) | Credencial de autenticação emitida pela plataforma; nunca exposta em código ou repositório |
| **Business API** | API oficial do WhatsApp para envio de mensagens; exige aprovação Meta e número homologado |
| **Unofficial Client** (cliente não-oficial) | Biblioteca que simula o cliente WhatsApp Web para automação; sem suporte oficial e sujeita a banimento |
| **Template Message** (mensagem de modelo) | Formato de mensagem pré-aprovado pela Meta para o primeiro contato com o usuário no WhatsApp |

---

## Discord

### Autenticação e setup

O bot autentica via **Bot Token** obtido no [Discord Developer Portal](https://discord.com/developers/applications). O token é enviado no header `Authorization: Bot <token>` em todas as chamadas à API REST e na conexão com o **Gateway** via WebSocket.

```
Criar Application → Add Bot → copiar token → convidar bot ao servidor com OAuth2 URL
```

Nunca usar o token de conta de usuário (self-bot). Isso viola os Termos de Serviço do Discord e pode resultar em banimento permanente.

### Gateway Intents

O Discord usa **Gateway Intents** para controlar quais eventos o bot recebe. Sem declarar a intent correta, o evento não chega ao bot. Intents privilegiadas (Presence, Guild Members, Message Content) requerem aprovação manual para bots em mais de 100 servidores.

| Intent | Eventos incluídos |
|---|---|
| `GUILDS` | Criação, atualização e exclusão de servidores e canais |
| `GUILD_MESSAGES` | Mensagens em canais de servidor |
| `MESSAGE_CONTENT` | Conteúdo textual das mensagens (privilegiada) |
| `DIRECT_MESSAGES` | Mensagens diretas entre usuário e bot |
| `GUILD_MEMBERS` | Entrada, saída e atualização de membros (privilegiada) |

### Slash Commands

Slash commands são registrados na API do Discord antes de ficarem disponíveis. O registro pode ser global (propagação em até 1 hora) ou por servidor (instantâneo, ideal para desenvolvimento).

```
Definir schema do comando → POST /applications/:id/commands → Discord registra → usuário digita / → autocomplete aparece → usuário confirma → Discord envia Interaction → bot responde
```

A resposta a uma Interaction deve ocorrer em até **3 segundos**. Para operações longas, o bot responde com `deferReply` e edita a resposta quando o processamento termina.

### Embeds

**Embeds** são a primitiva de mensagem rica do Discord. Substituem mensagens longas com formatação Markdown quando há múltiplos campos estruturados.

Limites de embed:
- Título: 256 caracteres
- Descrição: 4096 caracteres
- Campos: máximo 25 por embed
- Total de caracteres por mensagem: 6000

---

## Telegram

### Autenticação e setup

O bot autentica via **Bot Token** gerado pelo **BotFather** ([@BotFather](https://t.me/BotFather) no Telegram). Todas as requisições à **Bot API** usam o token na URL: `https://api.telegram.org/bot<token>/método`.

```
/newbot no BotFather → define nome e username → BotFather entrega o token
```

### Modos de conexão

O Telegram suporta os dois modos. Para webhook, o endpoint precisa de certificado TLS válido (self-signed é aceito com configuração extra).

```
Webhook:  POST https://api.telegram.org/bot<token>/setWebhook?url=<sua-url>
Polling:  GET  https://api.telegram.org/bot<token>/getUpdates?offset=<ultimo-update-id>
```

No polling, o parâmetro `offset` deve avançar a cada lote para não reprocessar eventos. O valor correto é `update_id` do último evento processado + 1.

### Inline Keyboard

O Telegram oferece dois tipos de botões:

| Tipo | Comportamento |
|---|---|
| `InlineKeyboardButton` com `callback_data` | Envia callback silencioso ao bot; não cria nova mensagem |
| `InlineKeyboardButton` com `url` | Abre link externo no browser do usuário |
| `ReplyKeyboardMarkup` | Botões que substituem o teclado do usuário; cria mensagem de texto ao clicar |

O bot recebe o callback via evento `callback_query`. Após processar, deve chamar `answerCallbackQuery` para remover o indicador de carregamento na UI do usuário.

### Tipos de chat

| Tipo | Descrição |
|---|---|
| `private` | Conversa direta entre usuário e bot |
| `group` | Grupo com até 200 membros; bot só recebe mensagens se for adicionado |
| `supergroup` | Grupo com mais de 200 membros ou migrado; bot precisa de permissão para ler mensagens |
| `channel` | Canal de broadcast; bot pode ser admin e enviar mensagens |

Em grupos e supergrupos, o bot só recebe mensagens se for mencionado (`@bot`) ou se a intent de leitura estiver habilitada nas configurações do BotFather.

---

## WhatsApp

### API oficial vs cliente não-oficial

O WhatsApp tem dois caminhos radicalmente diferentes para automação:

| | Business API (oficial) | Bibliotecas não-oficiais |
|---|---|---|
| **Exemplos** | Meta Cloud API, On-Premise API | Baileys, whatsapp-web.js |
| **Aprovação** | Exige conta Meta Business e número homologado | Qualquer número |
| **Custo** | Por conversa (modelo de pricing Meta) | Gratuito |
| **Risco de banimento** | Nenhum se dentro dos Termos de Serviço | Alto; número pode ser banido sem aviso |
| **Suporte** | Oficial via Meta | Comunidade |
| **Recomendação** | Produção e uso comercial | Prototipação e uso pessoal |

Para qualquer uso com usuários reais ou dados sensíveis, use a **Business API** oficial.

### Business API — fluxo de mensagens

O primeiro contato com um usuário sempre exige uma **Template Message** aprovada pela Meta. Após o usuário responder, abre-se uma janela de 24 horas para troca livre de mensagens.

```
Bot envia Template → usuário responde → janela de 24h aberta → troca livre → janela fecha → novo Template necessário
```

O webhook da Business API envia eventos no formato:

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

O endpoint de webhook precisa responder `200 OK` imediatamente. Processar a mensagem de forma síncrona no handler do webhook causa timeout. Enfileirar e processar de forma assíncrona.

### Verificação do webhook

A Meta envia uma requisição de verificação `GET` com parâmetros `hub.challenge` e `hub.verify_token` antes de ativar o webhook. O bot precisa responder com o valor de `hub.challenge` para confirmar propriedade do endpoint.

```
GET /webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<nonce>
Bot responde: 200 OK com body = hub.challenge
```

## Veja também

- [bots.md](bots.md) — conceitos fundamentais: webhook, polling, command routing, rate limit, lifecycle
- [javascript/frameworks/bot/discord.md](../../javascript/frameworks/bot/discord.md) — implementação discord.js
- [javascript/frameworks/bot/telegram.md](../../javascript/frameworks/bot/telegram.md) — implementação Telegraf
- [javascript/frameworks/bot/whatsapp.md](../../javascript/frameworks/bot/whatsapp.md) — implementação Baileys e Meta Cloud API
