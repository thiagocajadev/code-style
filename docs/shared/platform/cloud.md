# Computação em nuvem

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

A **cloud computing** (computação em nuvem) redivide o trabalho de manter um sistema no ar. O provedor cuida da máquina física, da rede e do disco. O time cuida da configuração dos serviços, das permissões e da arquitetura. O trabalho de operação diminui, e as decisões que sobram passam a valer mais.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **PaaS/SaaS** (Platform/Software as a Service · Plataforma/Software como Serviço) | Modelos de serviço onde o provedor gerencia a infraestrutura; o time gerencia apenas a aplicação |
| **IAM** (Identity and Access Management · Gerenciamento de Identidade e Acesso) | Sistema de controle de permissões em cloud: define quem pode fazer o quê em quais recursos |
| **Container** (contêiner) | Unidade de empacotamento que garante paridade entre ambientes: o que roda em dev é o que vai para prod |
| **Multi-stage build** (build em múltiplos estágios) | Estratégia de build que separa a etapa de compilação da imagem final, reduzindo o tamanho e a superfície de ataque |
| **Health check** (verificação de saúde) | Declaração de como o orquestrador verifica se o container está saudável para receber tráfego |
| **OOMKilled** (Out Of Memory Killed · Processo encerrado por falta de memória) | Sinal do orquestrador indicando que o container esgotou a memória disponível |

## Serviço gerenciado ou operado pelo time

A escolha entre um serviço gerenciado (**PaaS** (Platform as a Service · Plataforma como Serviço) ou **SaaS** (Software as a Service · Software como Serviço)) e um **self-hosted** (operado pelo próprio time) define quanto trabalho de operação o time assume.

| Categoria | Gerenciado | Self-hosted |
|---|---|---|
| Banco de dados | RDS, Azure SQL, Cloud SQL | PostgreSQL em VM |
| Cache | ElastiCache, Azure Cache | Redis em VM |
| Fila | SQS, Service Bus, Cloud Pub/Sub | RabbitMQ em VM |
| Deploy | Vercel, App Service, Cloud Run | Docker em VM própria |

O serviço gerenciado já vem com alta disponibilidade, backup, atualização de versão e escala automática. Ele cobra mais caro por hora, e em troca o time deixa de configurar replicação, monitorar disco e aplicar patch de segurança no banco.

Comece pelo gerenciado. Vá para o self-hosted quando o custo pesar de verdade na conta, ou quando o serviço gerenciado não atender a um requisito específico.

## Cada serviço com a permissão mínima

Um serviço recebe as permissões que usa, e nada além disso. O **IAM** (Identity and Access Management · Gerenciamento de Identidade e Acesso) mal configurado é uma das portas de entrada mais exploradas em cloud, porque uma credencial vazada com permissão ampla dá acesso a tudo de uma vez.

| Prática | Por quê |
|---|---|
| Role separada por serviço | Comprometimento de um serviço não escala para outros |
| Role separada por ambiente | Credencial de dev nunca acessa prod |
| Permissão de leitura onde só se lê | Write não utilizado é write disponível para exploração |
| Revisão periódica de permissões | Permissões crescem com o tempo, raramente diminuem sozinhas |

O **secret** (segredo) fica em um serviço próprio para isso (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) e é injetado quando o processo sobe. A variável de ambiente em **plaintext** (texto sem criptografia), o valor commitado no código e o `.env` versionado são os três caminhos por onde o segredo vaza. Ver [Segurança](./security.md) para detalhes.

## Containers

O container empacota a aplicação com tudo de que ela precisa para rodar, então o que funciona na máquina do desenvolvedor funciona igual em produção. Isso apaga a categoria de defeito que começa com "na minha máquina funciona".

O **multi-stage build** separa a etapa que compila da imagem que vai para produção. A imagem final fica sem compilador, sem dependência de desenvolvimento e sem arquivo intermediário. Ela ocupa menos espaço e oferece menos coisas para um invasor explorar.

A **imagem base mínima** (Alpine, Distroless) segue a mesma lógica: cada pacote a menos na imagem é uma vulnerabilidade a menos para acompanhar.

O **processo sem root** roda com um usuário comum dentro do container. Quando alguém consegue executar código ali dentro, o alcance dele para nos limites daquele usuário.

O **health check** é a forma como o container informa se está pronto para receber tráfego. O orquestrador usa essa resposta para decidir se manda requisições para a instância e se precisa reiniciá-la. Sem health check, o orquestrador continua enviando tráfego para um processo que já parou de responder.

## Limites de CPU e memória

Todo container em produção declara quanto de **CPU** (Central Processing Unit · Unidade Central de Processamento) e de memória pode consumir. Sem esse limite, um serviço com vazamento de memória vai tomando a memória do host até que os outros containers da mesma máquina parem de funcionar.

| Configuração | Efeito |
|---|---|
| Sem limite de memória | Serviço consome tudo disponível, derruba vizinhos |
| Limite conservador com monitoramento | OOMKilled sinaliza o problema real |
| CPU sem limite | **Starvation** (privação de recursos) de outros serviços no mesmo host |

O **OOMKilled** (Out Of Memory Killed · Processo encerrado por falta de memória) aponta um problema real na aplicação. Quando o orquestrador reinicia o container em silêncio e ninguém olha o sinal, o vazamento de memória continua lá, e a investigação só começa quando o incidente fica grande demais para ignorar.

## Observabilidade

O container é descartável: ele sobe, roda, morre, e o disco dele morre junto. Um log escrito em arquivo local desaparece junto com a instância, no exato momento em que alguém precisaria dele para entender por que ela caiu.

Escreva o log em stdout e stderr. O orquestrador captura essa saída e encaminha para um **sink** (destino centralizado de logs) como CloudWatch, Datadog, GCP Logging ou Azure Monitor, onde ele sobrevive à instância e pode ser pesquisado.

Ver [Observabilidade](../standards/observability.md) para estrutura de logs, níveis e correlation ID.

## Ambientes

O mesmo artefato avança de um ambiente para o outro, sem passar por uma nova build. Cada ambiente responde a uma pergunta:

```
artefato → dev → qa → staging → prod
```

| Ambiente | Responsabilidade |
|---|---|
| **Dev** | Primeira validação após merge: comportamento básico, sem regressão |
| **QA** | Validação funcional completa: cenários reais, integrações, edge cases |
| **Staging** | Espelho de prod: última barreira antes da entrega real |
| **Prod** | Entrega final: observabilidade ativa nos primeiros minutos após deploy |

Staging só cumpre o papel dele quando reproduz produção no sistema operacional, na versão do runtime e no formato da configuração. Cada divergência entre os dois cria uma categoria de defeito que passa por staging sem aparecer e só se manifesta em produção.
