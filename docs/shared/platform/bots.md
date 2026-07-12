# Bots de mensageria

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um **bot** (agente automatizado) é um programa ligado a uma plataforma de mensagens, que responde a eventos no lugar de uma pessoa. Ele recebe o evento (uma mensagem nova, uma reação, o clique num botão), executa alguma lógica e devolve a resposta.

O bot nunca conversa direto com o usuário. Tudo passa pelo **gateway** (ponto de entrada da plataforma), nas duas direções: a plataforma entrega o evento ao bot, e o bot entrega a resposta à plataforma. Essa página cobre o que é igual em todas as plataformas. As particularidades de cada uma estão em [bots-advanced.md](bots-advanced.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Bot** (agente automatizado) | Programa que interage com usuários em nome de um serviço via plataforma de mensagens |
| **Gateway** (ponto de entrada da plataforma) | Servidor da plataforma que recebe eventos e os entrega ao bot |
| **Event** (evento) | Unidade de dado que o gateway envia ao bot: nova mensagem, reação, callback de botão |
| **Command** (comando) | Instrução enviada pelo usuário, tipicamente prefixada com `/` ou uma palavra-chave |
| **Handler** (processador de evento ou comando) | Função registrada para processar um tipo específico de evento ou comando |
| **Webhook** (callback HTTP) | Endpoint HTTP do bot onde a plataforma envia eventos via POST; o bot fica passivo |
| **Polling** (consulta periódica) | Bot consulta o gateway em intervalo fixo para buscar novos eventos; o bot fica ativo |
| **Rate limit** (limite de taxa) | Número máximo de requisições que o bot pode enviar à plataforma por unidade de tempo |
| **Session** (sessão) | Estado mantido entre mensagens de um mesmo usuário dentro de uma conversa |
| **Intent** (intenção) | Objetivo que a mensagem do usuário expressa: comprar, consultar, cancelar |
| **Callback** (retorno) | Dado enviado de volta ao bot quando o usuário interage com um botão inline |

## Receber por webhook ou buscar por polling

São os dois jeitos de o evento chegar até o bot. No **webhook**, a plataforma chama o bot assim que o evento acontece. No **polling**, o bot pergunta à plataforma, de tempos em tempos, se há algo novo.

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

Em produção, use webhook. Em desenvolvimento, o polling evita o trabalho de expor a máquina local à internet com um túnel e um certificado TLS.

## Encaminhar cada comando ao seu handler

O roteamento leva o comando que o usuário digitou até o **Handler** que sabe atendê-lo. A forma que se sustenta é o **Strategy Map** (mapa de estratégias): um objeto que associa cada nome de comando a uma função.

```
Mensagem chega → extrai comando → Strategy Map[comando] → Handler executa
```

A alternativa é um `if/else` que ganha um ramo a cada comando novo. Ele cresce sem limite, e a lógica de negócio acaba escrita dentro do próprio roteador. O mapa mantém o roteamento em uma linha e deixa cada comando no seu arquivo.

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

## Guardar onde o usuário parou no fluxo

Um bot **stateless** (sem estado) trata cada mensagem por conta própria, sem lembrar da anterior. Isso basta para um comando que responde de uma vez. Um cadastro em etapas precisa de **sessão**: o bot guarda em que passo aquele usuário está entre uma mensagem e a seguinte.

Opções por complexidade:

| Opção | Quando usar |
|---|---|
| Memória in-process (Map/objeto) | Desenvolvimento ou instância única sem reinício |
| Cache externo (Redis) | Produção com múltiplas instâncias ou reinícios frequentes |
| Banco de dados | Estado persistente que sobrevive a reinícios longos |

A memória do processo perde tudo no primeiro restart, e com duas instâncias no ar a segunda mensagem do usuário pode cair na instância que não tem a sessão dele. Por isso, produção com mais de uma instância pede cache externo.

A chave da sessão é o `userId` (identificador do usuário) ou o `chatId` (identificador da conversa), conforme a plataforma.

## Respeitar o teto de envio da plataforma

Toda plataforma limita quantas mensagens o bot manda por segundo. Passar do limite devolve `429 Too Many Requests`, e a insistência leva a uma suspensão temporária do bot.

Três padrões mantêm o envio dentro do teto:

- **Fila de envio**: enfileirar mensagens de saída e processar com intervalo mínimo entre envios
- **Retry com backoff exponencial**: ao receber `429`, aguardar intervalo crescente antes de tentar de novo
- **Bulk operations**: agrupar notificações em vez de enviar uma por evento

O caso que quebra na prática é a notificação em massa disparada em laço, sem intervalo. Processe em lotes, com pausa entre eles.

## Ligar e desligar o bot sem perder evento

```
start → conecta ao gateway → registra Handlers → aguarda eventos → processa → responde → repete
```

No encerramento, o bot segue três passos:

1. Parar de aceitar novos eventos
2. Aguardar processamento dos eventos em andamento
3. Fechar conexão com o gateway de forma limpa (graceful shutdown)

Matar o processo no meio disso deixa o usuário sem resposta e a sessão dele parada em um passo intermediário do fluxo, sem ninguém para continuar.

## Veja também

- [bots-advanced.md](bots-advanced.md): guia por plataforma (Discord, Telegram, WhatsApp, Slack)
- [messaging.md](messaging.md): mensageria assíncrona interna (broker, queue, pub/sub)
- [api-design.md](api-design.md): design de endpoints para webhook receivers
