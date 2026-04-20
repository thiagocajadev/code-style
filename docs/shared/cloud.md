# Cloud

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Cloud computing redistribui responsabilidades: o provedor cuida da infraestrutura física, o time cuida da configuração, segurança e arquitetura dos serviços.

## Serviços Gerenciados

A escolha entre gerenciado (PaaS/SaaS, Platform/Software as a Service, Plataforma/Software como Serviço) e self-hosted afeta diretamente o custo operacional e a complexidade do time.

| Categoria | Gerenciado | Self-hosted |
|---|---|---|
| Banco de dados | RDS, Azure SQL, Cloud SQL | PostgreSQL em VM |
| Cache | ElastiCache, Azure Cache | Redis em VM |
| Fila | SQS, Service Bus, Cloud Pub/Sub | RabbitMQ em VM |
| Deploy | Vercel, App Service, Cloud Run | Docker em VM própria |

Serviços gerenciados entregam alta disponibilidade, backups, atualizações e escalabilidade automática. O custo é financeiro: gerenciado custa mais por hora. O benefício é operacional: o time não opera banco, não configura replicação, não gerencia discos.

Usar gerenciado como padrão. Self-hosted quando há restrição de custo ou requisito que o gerenciado não atende.

## Least Privilege (Menor Privilégio)

Cada serviço opera com exatamente as permissões que precisa. IAM (Identity and Access Management, Gerenciamento de Identidade e Acesso) mal configurado é uma das maiores superfícies de ataque em cloud.

| Prática | Por quê |
|---|---|
| Role separada por serviço | Comprometimento de um serviço não escala para outros |
| Role separada por ambiente | Credencial de dev nunca acessa prod |
| Permissão de leitura onde só se lê | Write não utilizado é write disponível para exploração |
| Revisão periódica de permissões | Permissões crescem com o tempo, raramente diminuem sozinhas |

Secrets ficam em serviços gerenciados (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) e são injetados em runtime. Variáveis de ambiente plaintext, código commitado e `.env` no repositório são vetores de vazamento. Ver [Segurança](./security.md) para detalhes.

## Containers

Containers garantem paridade entre ambientes: o que roda em dev é o que vai para prod. Essa paridade elimina a classe de bugs "funciona na minha máquina".

**Multi-stage builds** separam a etapa de build da imagem final. A imagem de runtime não carrega compilador, dependências de desenvolvimento nem arquivos intermediários. Resultado: imagem menor, superfície de ataque menor.

**Imagem base mínima** (Alpine, Distroless): quanto menor a imagem, menos pacotes, menos vulnerabilidades potenciais.

**Processo sem root**: o container opera com um usuário sem privilégios. Se comprometido, o acesso é limitado ao escopo do usuário, não do sistema.

**Health check**: o container declara como verificar sua própria saúde. O orquestrador usa essa informação para roteamento e restart automático. Container sem health check é container que o orquestrador monitora às cegas.

## Limites de Recursos

Todo container em produção declara limites de CPU e memória. Sem limites, um serviço com leak de memória consome os recursos do host inteiro.

| Configuração | Efeito |
|---|---|
| Sem limite de memória | Serviço consome tudo disponível, derruba vizinhos |
| Limite conservador com monitoramento | OOMKilled sinaliza o problema real |
| CPU sem limite | Starvation de outros serviços no mesmo host |

OOMKilled (Out Of Memory Killed, Processo encerrado por falta de memória) é um sinal a investigar. Restart automático silencioso mascara o problema e adia o diagnóstico.

## Observabilidade

Logs em disco local não funcionam em cloud: containers são efêmeros, instâncias sobem e descem, o disco desaparece com o container.

Toda saída de log vai para um sink centralizado (CloudWatch, Datadog, GCP Logging, Azure Monitor). O padrão é stdout/stderr: o orquestrador captura e encaminha. Nenhum serviço escreve log em arquivo local em produção.

Ver [Observabilidade](./observability.md) para estrutura de logs, níveis e correlation ID.

## Ambientes

O mesmo artefato é promovido de ambiente em ambiente, sem rebuild. Cada ambiente serve um propósito:

| Ambiente | Responsabilidade |
|---|---|
| **Dev** | Primeira validação após merge: comportamento básico, sem regressão |
| **QA** | Validação funcional completa: cenários reais, integrações, edge cases |
| **Staging** | Espelho de prod: última barreira antes da entrega real |
| **Prod** | Entrega final: observabilidade ativa nos primeiros minutos após deploy |

Staging deve espelhar prod em OS, runtime e formato de configuração. Divergência entre staging e prod cria uma classe de bugs que só aparecem em produção.
