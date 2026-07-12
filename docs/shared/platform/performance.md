# Desempenho

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O desempenho de um sistema é decidido no desenho. Quatro escolhas respondem pela maior parte do resultado: como a listagem pagina, o que entra em **cache** (armazenamento temporário de respostas), o que sai da requisição e vai para segundo plano, e o que só carrega quando alguém precisa (**lazy loading** · carregamento sob demanda).

Sob carga real, essas quatro decisões determinam se o sistema escala ou trava.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Cache** (armazenamento temporário) | Resposta armazenada para evitar recomputação ou nova consulta ao banco |
| **TTL** (Time To Live · tempo de vida) | Tempo durante o qual uma entrada em cache é considerada válida |
| **Offset/limit** (paginação por deslocamento e quantidade) | Modelo de paginação que pula N registros e retorna os próximos M |
| **Cursor** (ponteiro de paginação) | Referência ao último item retornado, usada para paginação estável em dados que mudam |
| **Lazy loading** (carregamento sob demanda) | Carregar dados ou código apenas no momento em que são necessários |
| **N+1** (consulta repetida em loop) | Anti-padrão que executa uma query por item de uma lista em vez de uma única query em lote |
| **Connection pooling** (agrupamento de conexões) | Reutilização de conexões abertas com o banco para reduzir o custo de handshake por requisição |
| **I/O** (Input/Output · entrada/saída) | Operações que leem ou escrevem em sistemas externos: banco, rede, disco |
| **Big O** (notação de complexidade assintótica) | Notação que descreve como o tempo ou espaço de um algoritmo cresce em função do tamanho da entrada |
| **Time complexity** (complexidade de tempo) | Quantas operações o algoritmo executa em relação ao tamanho da entrada |
| **Space complexity** (complexidade de espaço) | Quanta memória o algoritmo usa em relação ao tamanho da entrada |

## Paginação

Devolver a tabela inteira em uma resposta inutiliza um endpoint (ponto de acesso da **API** (Application Programming Interface · Interface de Programação de Aplicações)) em produção. A tabela cresce, o tempo de resposta cresce junto, e o cliente gasta memória processando registros que ninguém vai usar.

Dois modelos cobrem a maioria dos casos:

| Modelo | Como funciona | Melhor para |
|---|---|---|
| **Offset/limit** | `LIMIT 20 OFFSET 40` (pula N registros) | Listagens com navegação por página |
| **Cursor** | Referência ao último item retornado | Feeds infinitos, dados que mudam frequentemente |

O offset/limit (paginação por deslocamento e quantidade) falha quando os dados mudam durante a navegação. Se um registro é inserido ou removido entre uma página e a seguinte, a numeração muda, e o usuário vê o mesmo item duas vezes ou deixa de ver um item. O cursor resolve isso porque ancora a próxima busca no ID ou no timestamp (registro de data e hora) do último item entregue.

A resposta paginada leva os dados e os metadados de navegação juntos: total de registros, próxima página ou próximo cursor. Assim o cliente descobre se ainda há dados sem fazer uma segunda chamada só para perguntar.

## Cache

O cache entrega uma resposta guardada em vez de calcular tudo de novo. O ganho é direto: menos consulta ao banco, menos **CPU** (Central Processing Unit · Unidade Central de Processamento), menos espera. O risco também: um dado desatualizado chega ao cliente como se fosse atual.

A decisão que equilibra os dois lados é o **TTL** (Time To Live · tempo de vida), o prazo de validade da resposta guardada. TTL curto mantém o dado atual e devolve carga ao banco. TTL longo alivia o banco e aumenta a chance de servir informação vencida.

| Estratégia | Como funciona | Quando usar |
|---|---|---|
| **Cache-aside** | App verifica cache → miss (ausência no cache) → busca no banco → armazena | Leituras frequentes, escrita infrequente |
| **Write-through** | Escrita vai ao banco e ao cache ao mesmo tempo | Consistência alta, latência de escrita aceitável |
| **Invalidação por evento** | Cache limpo quando dado muda | Dado crítico que não pode ser obsoleto |

O dado que muda com frequência e custa caro quando sai errado (saldo, estoque, status de pedido) só entra em cache com invalidação ativa. O dado estático ou de baixa criticidade (lista de países, configuração de layout) é candidato natural a TTL longo.

## Fila e processamento em segundo plano

A operação lenta que roda dentro de uma requisição **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) aumenta a espera do usuário e ocupa o **worker** (processo que executa tarefas em segundo plano) até terminar. Enviar e-mail, gerar relatório, redimensionar imagem, chamar um serviço externo: nenhuma dessas operações precisa segurar a resposta.

O padrão é sempre o mesmo: aceitar o trabalho, responder na hora e processar depois.

```
Request → persiste job → 202 Accepted → Worker processa → notifica resultado
```

Isso traz três ganhos diretos: o tempo de resposta fica previsível, a falha do job fica isolada no job (a requisição do usuário continua funcionando) e a nova tentativa acontece de forma automática nas falhas passageiras.

**Quando usar fila:**
- A operação passa de uns 500ms
- Ela depende de um serviço externo cujo **SLA** (Service Level Agreement · Acordo de Nível de Serviço) varia
- Ela pode falhar e vai precisar de nova tentativa
- O volume cria picos que o banco não absorve em tempo real

## Webhook

No **webhook** (notificação HTTP que o servidor envia ao cliente quando o job termina), o servidor chama o cliente assim que o trabalho conclui, e o cliente não precisa perguntar.

```
Worker conclui job → POST <endpoint-do-cliente> → Cliente responde 200 OK
```

| Prática | Motivo |
|---|---|
| ID do job no payload | Idempotência: a reentrega da mesma notificação não duplica o efeito |
| Assinar com **HMAC** (Hash-based Message Authentication Code · código de autenticação de mensagem por hash) | Prova que a chamada veio do servidor esperado |
| Nova tentativa com **backoff exponencial** (espera crescente entre tentativas) | Absorve a falha passageira sem sobrecarregar o cliente |
| Registrar todas as tentativas | Auditoria e diagnóstico da entrega |

**Quando usar**: o cliente tem um endpoint público, e o job pode levar minutos ou horas.

## Polling

No **polling** (consulta periódica ao servidor), o cliente pergunta o status do job de tempos em tempos até a resposta ficar pronta.

```
GET /jobs/{id}/status → 202 In Progress → GET /jobs/{id}/status → 200 Done + resultado
```

A vantagem é que o cliente não precisa expor endpoint nenhum. O custo é a carga desnecessária: quase toda consulta responde que o job ainda está em processamento.

O **long polling** (consulta que segura a conexão aberta até ter resposta ou até estourar o tempo limite) reduz esse custo. O servidor só responde quando tem dado novo, e o cliente reconecta assim que recebe.

| Modelo | Intervalo | Impacto |
|---|---|---|
| Short polling | Fixo (ex: 2s) | Simples, cria carga mesmo sem mudança de estado |
| Long polling | Servidor decide | Menos requests, maior complexidade no servidor |

**Quando usar**: cliente sem endpoint público, processamento de duração previsível e curta.

## WebSocket

O **WebSocket** (canal bidirecional persistente entre cliente e servidor) mantém uma conexão aberta. O servidor envia o resultado quando o job conclui, sem o cliente perguntar.

```
Cliente conecta → handshake → [conexão ativa] → Servidor envia resultado → Cliente processa
```

Menor latência entre as três opções: o resultado chega assim que disponível, sem intervalo de polling e sem overhead (custo extra) de nova conexão HTTP.

O custo é operacional: cada cliente conectado mantém uma conexão aberta no servidor. Gateway, load balancer (balanceador de carga) e infra precisam suportar conexões persistentes, o que afeta o escalonamento horizontal.

**Quando usar**: **UI** (User Interface · Interface do Usuário) em tempo real, dashboards (painéis ao vivo) e feeds ao vivo, onde a latência mínima justifica a complexidade operacional.

## Carregamento sob demanda

Carregar dados antes de precisar deles gasta recursos e aumenta o tempo de inicialização. O **lazy loading** adia o carregamento para o momento do uso.

| Contexto | Aplicação |
|---|---|
| **Banco de dados** | Relacionamentos carregados no momento do acesso, fora do join inicial |
| **Frontend** | Componentes e imagens carregados conforme entram no viewport (área visível da tela) |
| **Módulos** | Código importado só quando o fluxo de execução chega até ele |

O risco conhecido é o **N+1**: carregar uma lista de 100 itens e disparar uma query (consulta ao banco) para cada item ao acessar um relacionamento. São 101 queries onde 2 bastariam. A solução é carregar os relacionamentos em lote quando o acesso é previsível.

## Banco de dados

Índices, ajuste de queries, plano de execução e diagnóstico de gargalos estão em [database.md](database.md).

## Complexidade algorítmica (Big O)

O **Big O** descreve como o tempo de execução ou o uso de memória de um algoritmo cresce conforme a entrada cresce. Ele permite avaliar se uma solução escala antes de medir em produção.

| Notação | Comportamento | Exemplo prático |
|---|---|---|
| **O(1)** | Constante, não cresce com a entrada | Acesso a elemento de array por índice, lookup em hash map |
| **O(log n)** | Logarítmica, cresce devagar | Busca binária em array ordenado |
| **O(n)** | Linear, cresce com a entrada | Iterar uma lista uma vez |
| **O(n log n)** | Linearítmica | Ordenação eficiente (mergesort, quicksort no caso médio) |
| **O(n²)** | Quadrática, cresce muito rápido | Loop aninhado sobre a mesma coleção |
| **O(2ⁿ)** | Exponencial, inviável para n grande | Subconjuntos recursivos sem memoization (armazenamento de resultados intermediários) |

A regra prática: **O(n²) é o limite onde a maioria dos problemas de escala começa**. Qualquer loop aninhado sobre a mesma coleção é um candidato a revisão.

### Armadilhas comuns

**Loop aninhado sobre a mesma coleção**

O caso mais frequente de O(n²) oculto. Para cada item externo, itera todos os itens internos.

<details>
<summary>❌ Ruim: O(n²) com loop aninhado sobre a mesma coleção</summary>

```javascript
for (const order of orders) {
  for (const item of orders) {
    if (order.id === item.relatedId) { ... }
  }
}
```

</details>

<details>
<summary>✅ Bom: indexar em O(n), acessar em O(1)</summary>

```javascript
function findRelatedOrders(orders) {
  const orderIndex = new Map(orders.map(order => [order.id, order]));

  const ordersWithRelated = orders.map(order => ({
    ...order,
    related: orderIndex.get(order.relatedId),
  }));

  return ordersWithRelated;
}
```

</details>

**N+1 queries no banco de dados**

Carregar uma lista e fazer uma query para cada item. O(n) queries em vez de O(1).

<details>
<summary>❌ Ruim: N+1, uma query por item da lista</summary>

```javascript
const orders = await orderRepository.findAll();

for (const order of orders) {
  order.customer = await customerRepository.findById(order.customerId);
}
```

</details>

<details>
<summary>✅ Bom: duas queries no total com busca em lote</summary>

```javascript
async function loadOrdersWithCustomers() {
  const orders = await orderRepository.findAll();
  const customerIds = orders.map(order => order.customerId);

  const customers = await customerRepository.findByIds(customerIds);
  const customerIndex = new Map(customers.map(customer => [customer.id, customer]));

  const ordersWithCustomers = orders.map(order => ({
    ...order,
    customer: customerIndex.get(order.customerId),
  }));

  return ordersWithCustomers;
}
```

</details>

**Múltiplas iterações desnecessárias**

Encadeamento de `.filter().map()` quando uma única passagem resolve.

<details>
<summary>❌ Ruim: dois passes sobre a mesma lista</summary>

```javascript
const activeUserNames = users
  .filter(user => user.isActive)
  .map(user => user.name);
```

</details>

<details>
<summary>✅ Bom: um passe com reduce quando o volume importa</summary>

```javascript
function extractActiveUserNames(users) {
  const activeUserNames = users.reduce((names, user) => {
    if (user.isActive) names.push(user.name);
    return names;
  }, []);

  return activeUserNames;
}
```

</details>

> Para listas pequenas (< alguns milhares de itens), `.filter().map()` é legível e aceitável. O impacto de dois passes só é relevante em volumes grandes ou loops internos de hot paths (caminhos de código executados com altíssima frequência).

**Ordenação desnecessária**

`Array.sort()` é O(n log n). Se o objetivo é encontrar o máximo ou mínimo, uma iteração linear O(n) resolve.

<details>
<summary>❌ Ruim: sort() para obter o maior valor (O(n log n))</summary>

```javascript
const highestScore = scores.sort((a, b) => b - a)[0];
```

</details>

<details>
<summary>✅ Bom: Math.max() em O(n)</summary>

```javascript
function findHighestScore(scores) {
  const highestScore = Math.max(...scores);
  return highestScore;
}
```

</details>

### Como identificar

- **Code review**: qualquer loop dentro de outro loop sobre a mesma coleção é suspeito
- **Query count logging**: logar o número de queries por request revela N+1 rapidamente
- **Profiler**: medir o tempo real antes de otimizar; sem medição, a otimização vira palpite
- **Critério de aceitação**: para operações em lote ou relatórios, definir na spec o volume esperado e o tempo máximo aceitável

