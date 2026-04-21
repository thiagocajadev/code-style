# Mensageria

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Mensageria é a comunicação assíncrona entre partes do sistema por meio de mensagens. O **producer** (produtor) envia uma mensagem para um **broker** (serviço intermediário que armazena e entrega mensagens) e segue em frente. O **consumer** (consumidor) processa quando disponível.

O resultado é desacoplamento temporal: producer e consumer não precisam estar disponíveis ao mesmo tempo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Producer** | Quem envia a mensagem |
| **Consumer** | Quem processa a mensagem |
| **Broker** | Serviço que recebe, armazena e entrega mensagens |
| **Queue** (fila) | Canal ponto-a-ponto: cada mensagem é consumida por um único consumer |
| **Topic** (tópico) | Canal pub/sub: cada mensagem é entregue a todos os subscribers |
| **Payload** | Corpo da mensagem: os dados que o consumer vai processar |

## Queue vs Pub/Sub

```
Queue:   Producer → Queue → Consumer único
Pub/Sub: Producer → Topic → Consumer A, Consumer B, Consumer C (todos recebem)
```

Queue é ponto-a-ponto: a mensagem vai para um consumer e sai da fila. Pub/sub (publicação e assinatura) é difusão: cada subscriber (assinante) recebe uma cópia independente. O mesmo evento pode disparar múltiplos fluxos sem o producer conhecer nenhum deles.

## Garantias de entrega

| Garantia | Comportamento | Risco |
|---|---|---|
| **At-most-once** (no máximo uma vez) | Enviada sem aguardar confirmação | Perda silenciosa em falha |
| **At-least-once** (ao menos uma vez) | Reenviada até receber ack do broker | Duplicatas se o consumer falha após processar |
| **Exactly-once** (exatamente uma vez) | Processamento único garantido | Mais complexo e com overhead maior |

At-least-once é o padrão mais comum. O producer reenvia até receber ack (confirmação de entrega) do broker. O consumer pode receber a mesma mensagem mais de uma vez em falhas, por isso o processamento precisa ser idempotente.

## Idempotência

Uma operação é idempotente quando executá-la múltiplas vezes produz o mesmo resultado que executá-la uma vez. Em mensageria at-least-once, idempotência é obrigatória.

Estratégias:

- Verificar se o ID da mensagem já foi processado antes de agir
- Usar upsert (inserir ou atualizar) em vez de insert puro
- Operações de set em vez de increment para valores acumulados

## Dead-letter Queue

```
Consumer falha N vezes → mensagem vai para DLQ → análise ou reprocessamento manual
```

Dead-letter queue (DLQ) (fila de mensagens com falha persistente) isola mensagens que falharam repetidamente. Sem DLQ, uma mensagem problemática bloqueia a fila ou é descartada sem registro.

| Configuração | Recomendação |
|---|---|
| Limite de tentativas | 3 a 5 antes de mover para DLQ |
| Alerta na DLQ | Qualquer mensagem na DLQ gera notificação |
| Reprocessamento | Manual ou automatizado após investigação da causa raiz |

## Backpressure

Backpressure (controle de fluxo sob sobrecarga) ocorre quando o consumer processa mais devagar do que o producer envia. Sem controle, a fila cresce indefinidamente e o sistema degrada.

Estratégias:

- Limitar o prefetch (quantidade de mensagens entregues ao consumer de uma vez)
- Escalar consumers horizontalmente quando a fila crescer além do threshold (limite aceitável)
- Monitorar tamanho da fila como métrica de capacidade

## Ferramentas

| Ferramenta | Modelo | Melhor para |
|---|---|---|
| **RabbitMQ** | Queue e pub/sub | Workflows com roteamento complexo, RPC (chamada de procedimento remoto) |
| **Kafka** | Log distribuído, pub/sub | Alto volume, replay de eventos, event sourcing (eventos como fonte da verdade) |
| **SQS** (Amazon Simple Queue Service) | Queue gerenciada | Integração AWS, baixo overhead operacional |
| **Redis Streams** | Log leve | Mensageria simples em stacks que já usam Redis |
