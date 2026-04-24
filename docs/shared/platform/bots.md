# Bots de Mensageria

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um **bot** (agente automatizado) é um programa que se conecta a uma plataforma de mensagens e responde a eventos em nome de um usuário ou serviço. O bot recebe eventos da plataforma (mensagem, reação, callback), executa lógica e devolve uma resposta. A plataforma age como intermediária: o **bot** nunca fala diretamente com o usuário final, a mensagem passa pelo **gateway** (ponto de entrada da plataforma) em ambas as direções.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Bot** | Programa que interage com usuários em nome de um serviço via plataforma de mensagens |
| **Gateway** (porta de entrada) | Servidor da plataforma que recebe eventos e os entrega ao bot |
| **Event** (evento) | Unidade de dado que o gateway envia ao bot: nova mensagem, reação, callback de botão |
| **Command** (comando) | Instrução enviada pelo usuário, tipicamente prefixada com `/` ou uma palavra-chave |
| **Handler** (tratador) | Função registrada para processar um tipo específico de evento ou comando |
| **Webhook** | Endpoint HTTP do bot onde a plataforma envia eventos via POST; o bot fica passivo |
| **Polling** (consulta periódica) | Bot consulta o gateway em intervalo fixo para buscar novos eventos; o bot fica ativo |
| **Rate limit** (limite de taxa) | Número máximo de requisições que o bot pode enviar à plataforma por unidade de tempo |
| **Session** (sessão) | Estado mantido entre mensagens de um mesmo usuário dentro de uma conversa |
| **Intent** (intenção) | Objetivo semântico por trás de uma mensagem do usuário: comprar, consultar, cancelar |
| **Callback** | Dado enviado de volta ao bot quando o usuário interage com um botão inline |

## Webhook vs Polling

A escolha do modo de conexão afeta latência, infraestrutura e custo.

```
Webhook: Plataforma → POST /webhook → Bot processa → responde à plataforma
Polling: Bot → GET /updates → Plataforma retorna fila → Bot processa → repete
```

| Critério | Webhook | Polling |
|---|---|---|
| Latência | Imediata (push) | Depende do intervalo de consulta |
| Infraestrutura | Precisa de endpoint público com HTTPS | Roda em qualquer ambiente com saída TCP |
| Escala | Um POST por evento | Uma requisição a cada N segundos independente de eventos |
| Desenvolvimento local | Requer túnel (ex: ngrok) | Funciona direto sem exposição pública |
| Recomendação | Produção | Desenvolvimento local ou ambientes sem IP fixo |

Webhook é o padrão para produção. Polling é conveniente para desenvolvimento local porque não exige endpoint público nem certificado TLS.

## Command Routing

O roteamento de comandos mapeia a entrada do usuário para o **Handler** correto. A estratégia mais limpa é um **Strategy Map** (mapa de estratégias): um objeto que associa cada comando a uma função.

```
Mensagem chega → extrai comando → Strategy Map[comando] → Handler executa
```

Sem Strategy Map, a alternativa é um bloco `if/else` ou `switch` que cresce a cada novo comando e mistura roteamento com lógica de negócio. O mapa separa os dois.

### Estrutura recomendada

```
bot/
  commands/         ← um arquivo por domínio de comando
    help.js
    order.js
    user.js
  events/           ← handlers de eventos não-command (join, reaction, callback)
    memberJoin.js
    buttonCallback.js
  router.js         ← Strategy Map: registra comandos e delega
  client.js         ← instância da plataforma e setup de eventos
```

## Session State

Bots stateless (sem estado) respondem a cada mensagem de forma independente. Para fluxos com múltiplas etapas (ex: wizard de cadastro), o bot precisa de sessão: guardar onde o usuário está no fluxo entre mensagens.

Opções por complexidade:

| Opção | Quando usar |
|---|---|
| Memória in-process (Map/objeto) | Desenvolvimento ou instância única sem reinício |
| Cache externo (Redis) | Produção com múltiplas instâncias ou reinícios frequentes |
| Banco de dados | Estado persistente que sobrevive a reinícios longos |

A chave de sessão padrão é `userId` (identificador do usuário) ou `chatId` (identificador da conversa), dependendo da plataforma.

## Rate Limits

Toda plataforma impõe limites de envio. Exceder o limite resulta em erro `429 Too Many Requests` e suspensão temporária do bot.

Padrões para respeitar rate limits:

- **Fila de envio**: enfileirar mensagens de saída e processar com intervalo mínimo entre envios
- **Retry com backoff exponencial**: ao receber `429`, aguardar intervalo crescente antes de retentar
- **Bulk operations**: agrupar notificações em vez de enviar uma por evento

Nunca enviar mensagens em loop sem controle de intervalo. Em notificações em massa, processar em lotes com pausa entre lotes.

## Lifecycle do Bot

```
start → conecta ao gateway → registra Handlers → aguarda eventos → processa → responde → repete
```

Ao encerrar, o bot deve:

1. Parar de aceitar novos eventos
2. Aguardar processamento dos eventos em andamento
3. Fechar conexão com o gateway de forma limpa (graceful shutdown)

Shutdown abrupto pode deixar eventos sem resposta e usuários em estados de sessão inconsistentes.

## Veja também

- [bots-advanced.md](bots-advanced.md) — plataformas: Discord, Telegram, WhatsApp, Slack
- [messaging.md](messaging.md) — mensageria assíncrona interna: broker, queue, pub/sub
- [api-design.md](api-design.md) — design de endpoints para webhook receivers
