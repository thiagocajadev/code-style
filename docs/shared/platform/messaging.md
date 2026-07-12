# Mensageria

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Mensageria é a conversa entre partes do sistema que acontece sem que uma espere pela outra. O **producer** (produtor) entrega a mensagem a um **broker** (serviço intermediário que guarda e entrega as mensagens) e segue seu trabalho. O **consumer** (consumidor) pega a mensagem quando tiver capacidade de processá-la.

O ganho é que os dois lados param de depender um do outro no tempo. O consumer pode estar reiniciando, sobrecarregado ou fora do ar, e o producer continua registrando as mensagens no broker sem falhar.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Producer** (produtor) | Quem envia a mensagem |
| **Consumer** (consumidor) | Quem processa a mensagem |
| **Broker** (intermediário) | Serviço que recebe, armazena e entrega mensagens |
| **Queue** (fila) | Canal ponto-a-ponto: cada mensagem é consumida por um único consumer |
| **Topic** (tópico) | Canal pub/sub: cada mensagem é entregue a todos os subscribers |
| **Payload** (carga útil) | Corpo da mensagem: os dados que o consumer vai processar |

## A fila entrega a um, o tópico entrega a todos

```
Queue:   Producer → Queue → Consumer único
Pub/Sub: Producer → Topic → Consumer A, Consumer B, Consumer C (todos recebem)
```

Na **queue** (fila), a mensagem é entregue a um consumer e sai da fila. É o modelo para distribuir trabalho: dez consumers dividem mil tarefas, e cada tarefa é feita uma vez só.

No **pub/sub** (publicação e assinatura), o broker faz uma cópia da mensagem para cada **subscriber** (assinante). É o modelo para avisar: o mesmo pedido confirmado dispara o e-mail, a baixa no estoque e o registro fiscal, e o producer não conhece nenhum dos três.

## Garantias de entrega

| Garantia | Comportamento | Risco |
|---|---|---|
| **At-most-once** (no máximo uma vez) | Enviada sem aguardar confirmação | Perda silenciosa em falha |
| **At-least-once** (ao menos uma vez) | Reenviada até receber ack do broker | Duplicatas se o consumer falha após processar |
| **Exactly-once** (exatamente uma vez) | Processamento único garantido | Mais complexo e com overhead maior |

O padrão mais usado é o **at-least-once**. O producer reenvia a mensagem até o broker confirmar o recebimento com um **ack** (confirmação de entrega), o que elimina a perda. O preço é a duplicata: quando o consumer processa a mensagem e cai antes de confirmar, o broker entrega a mesma mensagem de novo. Por isso o processamento precisa ser idempotente.

## Idempotência

Uma operação idempotente produz o mesmo resultado sendo executada uma vez ou dez. Sob at-least-once, o consumer vai receber mensagem repetida em algum momento, e a idempotência é o que impede que a cobrança saia duplicada.

Estratégias:

- Verificar se o ID da mensagem já foi processado antes de agir
- Usar **upsert** (inserir ou atualizar) em vez de insert puro
- Operações de set em vez de increment para valores acumulados

A diferença entre set e increment aparece no reprocessamento: `saldo = 100` executado duas vezes deixa o saldo em 100, e `saldo += 100` deixa em 200.

## A fila das mensagens que falharam

```
Consumer falha N vezes → mensagem vai para DLQ → análise ou reprocessamento manual
```

A **DLQ** (Dead-letter Queue · fila de mensagens com falha persistente) recolhe a mensagem que falhou várias vezes seguidas. Sem ela, essa mensagem volta para a fila para sempre e trava o processamento das que vieram atrás, ou é descartada sem que ninguém saiba que existiu.

| Configuração | Recomendação |
|---|---|
| Limite de tentativas | 3 a 5 antes de mover para DLQ |
| Alerta na DLQ | Qualquer mensagem na DLQ gera notificação |
| Reprocessamento | Manual ou automatizado após investigação da causa raiz |

## Quando o consumer não acompanha o ritmo do producer

O **backpressure** (controle de fluxo sob sobrecarga) trata a situação em que a fila cresce mais rápido do que o consumer esvazia. Sem controle, ela cresce até estourar a memória do broker, e o atraso das mensagens vai aumentando até que nenhuma resposta chega em tempo útil.

Estratégias:

- Limitar o **prefetch** (quantidade de mensagens entregues ao consumer de uma vez)
- Escalar consumers horizontalmente quando a fila crescer além do **threshold** (limite aceitável)
- Monitorar tamanho da fila como métrica de capacidade

O tamanho da fila é o número que denuncia o problema antes do usuário. Uma fila que só cresce mostra que a capacidade de processar ficou abaixo da capacidade de receber.

## Ferramentas

| Ferramenta | Modelo | Melhor para |
|---|---|---|
| **RabbitMQ** | Queue e pub/sub | Workflows com roteamento complexo, **RPC** (Remote Procedure Call · chamada de procedimento remoto) |
| **Kafka** | Log distribuído, pub/sub | Alto volume, replay de eventos, **event sourcing** (eventos como fonte da verdade) |
| **SQS** (Amazon Simple Queue Service · Serviço de Filas Simples da Amazon) | Queue gerenciada | Integração AWS, baixo overhead operacional |
| **Redis Streams** | Log leve | Mensageria simples em stacks que já usam Redis |
