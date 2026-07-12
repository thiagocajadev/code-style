# Desenho de sistema (avançado)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
>
> Avançado em relação a [`system-design.md`](./system-design.md). Este documento cobre os instrumentos quantitativos e os teoremas que orientam decisões em sistemas distribuídos.

Desenhar sistemas em escala exige vocabulário preciso: acordos de nível de serviço, modelos de consistência, teoremas de distribuição, estimativas de capacidade. Cada um responde a uma pergunta que o desenho conceitual deixa em aberto.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SLA** (Service Level Agreement · Acordo de Nível de Serviço) | Contrato formal com consequências contratuais em caso de descumprimento |
| **SLO** (Service Level Objective · Objetivo de Nível de Serviço) | Meta interna mensurável, geralmente mais estrita que o SLA |
| **SLI** (Service Level Indicator · Indicador de Nível de Serviço) | Métrica concreta que mede o SLO em produção |
| **CAP** (Consistency, Availability, Partition tolerance · Consistência, Disponibilidade, Tolerância a Partição) | Teorema que afirma que um sistema distribuído escolhe entre Consistência e Disponibilidade sob partição de rede |
| **PACELC** (Partition-Availability-Consistency Else Latency-Consistency · Partição-Disponibilidade-Consistência Senão Latência-Consistência) | Extensão do CAP: fora de partição, o trade-off é Latência vs Consistência |
| **Sharding** (particionamento horizontal) | Distribuir dados entre múltiplos nós por chave de partição |
| **Replication** (replicação) | Manter cópias dos mesmos dados em nós diferentes para leitura e disponibilidade |
| **Quorum** (quórum) | Número mínimo de nós que precisam concordar para uma operação ser aceita |
| **QPS** (Queries Per Second · Consultas Por Segundo) | Medida de carga: quantas operações o sistema recebe por segundo |
| **p50 / p95 / p99** (percentis 50, 95 e 99) | Percentis de latência: mediana, cauda e cauda longa das respostas |

## SLA, SLO e SLI

Três termos que costumam ser confundidos. A distinção é operacional:

| Termo | Quem define | Para quem | Consequência |
|---|---|---|---|
| **SLA** | Contrato comercial | Cliente externo | Multas, crédito em fatura, rescisão |
| **SLO** | Engenharia | Time interno | Aciona alerta, bloqueia deploy, escalona prioridade |
| **SLI** | Observabilidade | Dashboard | Número bruto medido em produção |

A relação entre os três:

```
SLI (número medido) → SLO (meta interna) → SLA (promessa externa)
```

O SLI é a realidade observada. O SLO é uma meta mais apertada que o SLA, o que dá margem de segurança. O SLA é o compromisso assumido com o cliente.

Exemplo prático:

- **SLI**: latência p95 medida em produção = 180ms
- **SLO**: p95 abaixo de 200ms
- **SLA**: p95 abaixo de 300ms, sob pena de crédito em fatura

Quando o SLI passa do SLO, o time age antes de violar o SLA.

### Error budget

O complemento de um SLO é o **error budget** (orçamento de erro): a margem de falha que cabe dentro da meta. Uma disponibilidade de 99.9% concede 43 minutos de indisponibilidade por mês. Enquanto o budget não estoura, o time pode assumir risco (deploy arriscado, mudança estrutural). Quando estoura, as mudanças ficam congeladas até a margem se recuperar.

## CAP: consistência, disponibilidade, partição

Em sistemas distribuídos, partições de rede são inevitáveis. O teorema CAP formaliza que, durante uma partição, a escolha é obrigatória:

| Escolha | Comportamento | Exemplos |
|---|---|---|
| **CP** (Consistency + Partition tolerance · Consistência + Tolerância a Partição) | Sob partição, rejeita escrita para manter consistência | Banco relacional em modo síncrono, Zookeeper |
| **AP** (Availability + Partition tolerance · Disponibilidade + Tolerância a Partição) | Sob partição, aceita escrita e reconcilia depois | DynamoDB, Cassandra, CouchDB |

Sistemas CA não existem em produção real, porque a partição é uma propriedade da rede e chega sem pedir licença.

## PACELC: o trade-off que sobra fora da partição

O CAP só descreve o que acontece durante a partição. O PACELC completa o quadro:

```
Partition → Availability vs Consistency
Else     → Latency     vs Consistency
```

**Leitura**: _"se houver Partição, escolha entre A e C; senão (Else), escolha entre L e C"_.

| Classificação | Comportamento | Exemplo |
|---|---|---|
| **PC/EC** | Sempre consistente, aceita latência | Banco relacional síncrono |
| **PA/EL** | Disponibilidade e latência acima de consistência | Cassandra, Riak |
| **PC/EL** | Consistente sob partição, latência baixa fora dela | Raro, geralmente configuração customizada |
| **PA/EC** | Disponível sob partição, consistente fora dela | MongoDB com write concern majority |

Classificar um sistema pelo PACELC informa mais do que classificá-lo pelo CAP sozinho.

## Modelos de consistência

Consistência tem níveis intermediários, e cada um serve a um caso:

| Modelo | Garantia | Quando usar |
|---|---|---|
| **Strong** (forte) | Toda leitura retorna a última escrita confirmada | Saldo bancário, estoque, locks |
| **Sequential** (sequencial) | Todas as réplicas veem as escritas na mesma ordem | Logs de auditoria, event sourcing |
| **Causal** (causal) | Operações com relação de causa aparecem na ordem correta | Comentários com respostas, threads |
| **Read-your-writes** (leitura da própria escrita) | Cada usuário vê suas próprias escritas imediatamente | Edição de perfil, preferências |
| **Eventual** (eventual) | Todas as réplicas convergem ao longo do tempo | Feed social, contador de visualizações |

Modelos mais fracos toleram melhor latência e partição. Modelos mais fortes custam coordenação. Escolha o modelo por operação, porque o sistema inteiro raramente precisa do mesmo nível.

## Back-of-the-envelope (estimativa rápida de capacidade)

Cálculo aproximado que cabe em um guardanapo e substitui a intuição na hora de dimensionar infraestrutura. Valores de referência úteis:

| Operação | Ordem de grandeza |
|---|---|
| Leitura em memória (RAM) | 100ns |
| Leitura em SSD | 150µs |
| Round-trip em rede no mesmo datacenter | 500µs |
| Round-trip entre datacenters | 50ms a 150ms |
| Segundos em um dia | 86.400 |
| Segundos em um mês | 2.592.000 |

Exemplo: sistema com 10 milhões de usuários ativos por mês, cada um fazendo 20 ações por dia:

```
10M usuários × 20 ações × 30 dias = 6 bilhões de ações por mês
6B / 2.592.000 segundos ≈ 2.300 ações por segundo (médio)
Pico típico = 3× média = 7.000 QPS
```

Esse número define se uma instância resolve, se o caso pede sharding e se o banco aguenta. Sem o cálculo, a decisão vira palpite.

## Sharding

Particionar dados entre nós por uma chave de partição. Cada shard (partição) guarda uma fatia do conjunto total.

| Estratégia | Como funciona | Trade-off |
|---|---|---|
| **Range-based** (por faixa) | `user_id 1-1M → shard A`, `1M-2M → shard B` | Simples, vulnerável a hotspots se a carga não é uniforme |
| **Hash-based** (por hash) | `hash(user_id) mod N → shard` | Distribuição uniforme, rebalancear exige rehash |
| **Consistent hashing** | Hash em anel; nós cobrem faixas do anel | Rebalanceamento incremental ao adicionar/remover nós |
| **Directory-based** | Tabela de lookup: `user_id → shard` | Flexível, a tabela vira ponto único de falha e gargalo |

Sharding resolve escala de escrita. Para escala de leitura, use réplicas. Os dois combinam: shards replicados.

Aprofundamento em tuning de banco fica em [`../platform/database.md`](../platform/database.md); técnicas de escala aplicada em [`scaling.md`](./scaling.md).

## Replicação

Manter cópias dos mesmos dados em vários nós. Cada cópia atende leituras, e as escritas exigem coordenação.

| Modo | Comportamento | Consistência |
|---|---|---|
| **Single-leader** (um líder) | Todas as escritas no líder, leituras em qualquer réplica | Forte no líder, eventual nas réplicas |
| **Multi-leader** (múltiplos líderes) | Escritas em qualquer líder, replicadas entre eles | Requer resolução de conflitos |
| **Leaderless** (sem líder) | Cliente escreve em N nós, lê de M nós | Quórum define consistência (`W + R > N`) |

**Quórum**: num sistema leaderless, se as escritas exigem `W` nós e as leituras `R` nós, e `W + R > N` (o total), as leituras sempre veem a última escrita confirmada.

## Particionamento e replicação

Os dois conceitos são ortogonais e combináveis:

| | Resolve | Método |
|---|---|---|
| **Sharding** | Escala de escrita, volume de dados | Dividir dados |
| **Replication** | Escala de leitura, disponibilidade | Duplicar dados |

Sistemas reais combinam os dois: cada shard é replicado e cada réplica cobre um shard. Cassandra e MongoDB seguem essa topologia.

## Checklist do desenho de sistema

Antes de considerar o desenho concluído:

- [ ] Requisitos funcionais listados e revisados com produto
- [ ] Requisitos não-funcionais explícitos (latência, QPS, disponibilidade, custo)
- [ ] Entidades, fluxos, limites e contratos definidos
- [ ] Trade-offs escolhidos de forma consciente, em vez de herdados do default da ferramenta
- [ ] SLO e error budget definidos para cada operação crítica
- [ ] Modelo de consistência escolhido por operação
- [ ] Capacity planning feito com back-of-the-envelope
- [ ] Estratégia de sharding e replicação validada contra volume previsto
- [ ] Pontos únicos de falha identificados e mitigados
- [ ] Plano de observabilidade: SLIs medidos e dashboards configurados

Item pendente é decisão ainda implícita. Torná-la explícita agora evita descobri-la em produção.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Visão conceitual antes de entrar em detalhes | [`system-design.md`](./system-design.md) |
| Técnicas de escala aplicadas (Load Balancer, cache, CDN) | [`scaling.md`](./scaling.md) |
| Padrões táticos (Result, Repository, CQRS) | [`patterns.md`](./patterns.md) |
| Comunicação assíncrona, garantias de entrega, DLQ | [`../platform/messaging.md`](../platform/messaging.md) |
| Tuning de query, índices, operações em lote | [`../platform/database.md`](../platform/database.md) |
| Observabilidade: logging, métricas, tracing | [`../standards/observability.md`](../standards/observability.md) |
| Performance de aplicação: paginação, cache, WebSocket | [`../platform/performance.md`](../platform/performance.md) |
