# Escala e Infraestrutura

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Escalar um sistema é resolver um problema de capacidade: mais tráfego, mais dados, mais usuários simultâneos. A armadilha é tentar resolver antecipadamente um problema que ainda não existe. A postura correta: **construir com base sólida, escalar quando os dados indicarem necessidade**.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Vertical scaling** (escala vertical) | Aumentar CPU, RAM ou disco da máquina existente |
| **Horizontal scaling** (escala horizontal) | Adicionar mais instâncias da aplicação atrás de um balanceador |
| **Stateless** (sem estado local) | Aplicação que não guarda estado em memória entre requisições; pode ser replicada sem coordenação |
| **Load Balancer** (balanceador de carga) | Componente que distribui requisições entre múltiplas instâncias da aplicação |
| **API Gateway** (gateway de API) | Ponto de entrada único que centraliza autenticação, roteamento, rate limiting e logging |
| **CDN** (Content Delivery Network, Rede de Distribuição de Conteúdo) | Rede de servidores geograficamente distribuídos que serve assets estáticos próximo ao usuário |
| **Rate limiting** (limitação de taxa) | Controle do número de requisições aceitas por cliente em um intervalo de tempo |
| **SSL termination** (encerramento de SSL) | Descriptografia do tráfego HTTPS no balanceador, aliviando as instâncias da aplicação |
| **Health check** (verificação de saúde) | Endpoint que o balanceador consulta para saber se uma instância está saudável |
| **Read replica** (réplica de leitura) | Cópia do banco sincronizada com a primária, usada exclusivamente para leitura |
| **Sticky session** (sessão fixada) | Redirecionar sempre o mesmo usuário para a mesma instância; necessário em apps com estado local |

---

## Escala Vertical

Aumentar a capacidade da máquina: mais **CPU** (Central Processing Unit, Unidade Central de Processamento), mais **RAM** (Random Access Memory, Memória de Acesso Aleatório), disco mais rápido.

**Vantagens**: zero mudança de código, zero complexidade de infraestrutura. Resolve a maioria dos gargalos de um sistema em crescimento.

**Limite**: tem teto físico e financeiro. Uma máquina maior sempre custa mais do que duas máquinas menores com a mesma capacidade total.

**Quando usar**: primeiro passo de qualquer escala. Medir, identificar o gargalo, aumentar o recurso correspondente. Só partir para escala horizontal quando o teto vertical for atingido ou o custo se tornar proibitivo.

## Escala Horizontal

Adicionar mais instâncias da aplicação e distribuir a carga entre elas.

**Requisito central**: a aplicação deve ser **stateless** (sem estado local). Estado em memória (sessão, cache local, WebSocket com estado) impede a replicação. Cada requisição deve poder cair em qualquer instância sem diferença de resultado.

Como tornar a aplicação stateless:

| Estado | Onde mover |
|---|---|
| Sessão de usuário | Redis, banco de dados ou JWT (token autocontido) |
| Cache local | Redis ou Memcached compartilhado |
| Arquivos temporários | Object storage (S3, Blob Storage) |
| Filas em memória | Message broker (RabbitMQ, SQS, Kafka) |

Com a aplicação stateless, adicionar instâncias é linear: duas instâncias dobram a capacidade, dez instâncias multiplicam por dez.

## Load Balancing (Balanceamento de Carga)

O **Load Balancer** (balanceador de carga) distribui requisições entre as instâncias disponíveis. É o ponto de entrada da escala horizontal.

### Algoritmos de distribuição

| Algoritmo | Como funciona | Melhor para |
|---|---|---|
| **Round Robin** (rotação sequencial) | Distribui em ordem circular entre as instâncias | Requisições com tempo de resposta similar |
| **Least Connections** (menor número de conexões) | Direciona para a instância com menos conexões ativas | Requisições com tempo de resposta variável |
| **IP Hash** (hash do IP do cliente) | Sempre direciona o mesmo IP para a mesma instância | Apps que ainda têm estado local (sticky session) |
| **Weighted** (ponderado) | Distribui proporcionalmente à capacidade de cada instância | Instâncias com capacidades diferentes |

### Health checks

O balanceador consulta periodicamente um endpoint de cada instância (`GET /health`). Instâncias que não respondem ou respondem com erro são removidas da rotação automaticamente até se recuperar.

```
Load Balancer → GET /health → 200 OK → instância saudável, recebe tráfego
Load Balancer → GET /health → timeout → instância removida da rotação
```

### SSL termination

O balanceador recebe o tráfego **HTTPS** (HyperText Transfer Protocol Secure, Protocolo Seguro de Transferência de Hipertexto), descriptografa e repassa **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) simples para as instâncias internas. As instâncias não precisam gerenciar certificados; o balanceador centraliza isso.

```
Cliente → HTTPS → Load Balancer (SSL termination) → HTTP → Instâncias
```

## API Gateway

O **API** (Application Programming Interface, Interface de Programação de Aplicações) **Gateway** é o ponto de entrada único para todos os serviços de uma API. Centraliza responsabilidades que, sem ele, precisariam ser implementadas em cada serviço individualmente.

Responsabilidades centrais:

| Responsabilidade | O que faz |
|---|---|
| **Autenticação** | Valida tokens antes de chegar aos serviços; serviços recebem identidade já verificada |
| **Rate limiting** | Limita requisições por cliente, IP ou rota; protege os serviços de abuso |
| **Roteamento** | Direciona `/orders/*` para o serviço de pedidos, `/users/*` para o serviço de usuários |
| **SSL termination** | Gerencia certificados HTTPS centralmente |
| **Logging e observabilidade** | Registra todas as requisições em um único ponto; correlação de traces |
| **Transformação de payload** | Adapta formatos entre clientes e serviços quando necessário |

```
Cliente → API Gateway → autenticação → rate check → roteamento → Serviço A | Serviço B
```

O API Gateway não executa lógica de negócio. É infraestrutura de entrada: pré-processamento e roteamento.

**Ferramentas comuns**: AWS API Gateway, Kong, Nginx, Traefik, Caddy.

## Estratégias para Escalar

Além de instâncias e balanceadores, há camadas de escala que não exigem mais servidores:

**CDN para assets estáticos**: imagens, JS, CSS e fontes servidos a partir de nós geograficamente próximos ao usuário. Zero carga no servidor de aplicação para esses recursos.

**Cache na borda**: respostas de API cacheadas no Redis ou Memcached. Requisições repetidas não chegam ao banco.

```
Requisição → Cache hit → resposta em < 1ms
Requisição → Cache miss → banco → armazena → resposta
```

**Read replicas**: para sistemas com muito mais leitura do que escrita, réplicas de leitura distribuem as queries SELECT sem tocar na instância primária.

```
Escrita → banco primário
Leitura → read replica 1 | read replica 2 | read replica N
```

**Filas para absorver picos**: em vez de processar operações lentas de forma síncrona, enfileirar e processar em background. O servidor de aplicação responde rápido; o **worker** (trabalhador) absorve o pico no seu próprio ritmo.

## Anti-Overengineering

A maioria dos projetos nunca vai precisar de escala horizontal, load balancer dedicado ou múltiplas read replicas. A decisão errada é investir nessa infraestrutura antes de ter o problema.

**Sequência correta**:

```
1. Monolito Modular + escala vertical
2. Otimizar queries e adicionar cache quando os dados indicarem
3. Adicionar load balancer e tornar stateless quando o tráfego exigir
4. Considerar read replicas quando leitura virar gargalo no banco
5. Microsserviços apenas quando fronteiras de domínio ou times impuserem isolamento real
```

Cada etapa só faz sentido depois que a anterior foi esgotada. Pular etapas aumenta complexidade sem benefício proporcional.

**Sinais de que é hora de escalar**:

| Sinal | Ação correspondente |
|---|---|
| CPU ou memória consistentemente acima de 70% | Escala vertical primeiro |
| Tempo de resposta crescendo com o volume | Revisar queries e adicionar cache |
| Máquina maior não resolve mais | Avaliar escala horizontal |
| Um módulo tem tráfego radicalmente diferente dos demais | Considerar extração cirúrgica |

**O que não fazer no início**:

- Configurar load balancer antes de ter tráfego que justifique
- Separar em microsserviços porque "vai crescer"
- Montar Kubernetes para uma aplicação com 10 usuários simultâneos
- Implementar **CQRS** (Command Query Responsibility Segregation, Separação de Responsabilidade entre Comando e Consulta) e event sourcing sem complexidade de leitura/escrita que justifique

---

## Referência rápida

| Técnica | Quando usar | Custo de adoção |
|---|---|---|
| **Escala vertical** | Primeiro passo sempre | Nenhum (sem mudança de código) |
| **Cache (Redis)** | Leitura frequente, escrita infrequente | Baixo (lib + Redis) |
| **CDN** | Assets estáticos com usuários distribuídos | Baixo (configuração de DNS) |
| **Load Balancer** | Tráfego que uma instância não absorve | Médio (app deve ser stateless) |
| **Read Replica** | Leitura virou gargalo no banco | Médio (configuração de banco) |
| **API Gateway** | Múltiplos serviços ou autenticação centralizada | Médio (configuração e routing) |
| **Microsserviços** | Isolamento real por domínio ou time | Alto (complexidade operacional) |
