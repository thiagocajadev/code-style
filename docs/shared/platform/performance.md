# Performance

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Performance é uma decisão de design. As escolhas de paginação, cache (armazenamento temporário de respostas), processamento assíncrono e lazy loading determinam se o sistema escala ou trava sob carga real.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Cache** (armazenamento temporário) | Resposta armazenada para evitar recomputação ou nova consulta ao banco |
| **TTL** (Time To Live, tempo de vida) | Tempo durante o qual uma entrada em cache é considerada válida |
| **Offset/limit** (paginação por deslocamento e quantidade) | Modelo de paginação que pula N registros e retorna os próximos M |
| **Cursor** | Referência ao último item retornado, usada para paginação estável em dados que mudam |
| **Lazy loading** (carregamento sob demanda) | Carregar dados ou código apenas no momento em que são necessários |
| **N+1** | Anti-padrão que executa uma query por item de uma lista em vez de uma única query em lote |
| **Connection pooling** (agrupamento de conexões) | Reutilização de conexões abertas com o banco para reduzir o custo de handshake por requisição |
| **I/O** (Input/Output, entrada/saída) | Operações que leem ou escrevem em sistemas externos: banco, rede, disco |
| **Big O** | Notação que descreve como o tempo ou espaço de um algoritmo cresce em função do tamanho da entrada |
| **Time complexity** (complexidade de tempo) | Quantas operações o algoritmo executa em relação ao tamanho da entrada |
| **Space complexity** (complexidade de espaço) | Quanta memória o algoritmo usa em relação ao tamanho da entrada |

## Paginação

Retornar todos os registros de uma tabela numa única resposta é a forma mais rápida de tornar um endpoint (ponto de acesso da **API** (Application Programming Interface, Interface de Programação de Aplicações)) inutilizável em produção. A quantidade de dados cresce, o tempo de resposta cresce junto, e o cliente precisa processar mais do que vai usar.

Dois modelos cobrem a maioria dos casos:

| Modelo | Como funciona | Melhor para |
|---|---|---|
| **Offset/limit** | `LIMIT 20 OFFSET 40` (pula N registros) | Listagens com navegação por página |
| **Cursor** | Referência ao último item retornado | Feeds infinitos, dados que mudam frequentemente |

Offset/limit (paginação por deslocamento e quantidade) tem um problema em dados mutáveis: se um registro é inserido ou removido entre páginas, a numeração muda e itens aparecem duplicados ou somem. Cursor evita isso usando o ID ou timestamp (registro de data e hora) do último item como âncora.

A resposta de uma lista paginada inclui os dados e metadados de navegação: total de registros, próxima página ou próximo cursor. O cliente nunca precisa fazer uma segunda chamada só para saber se há mais dados.

## Cache

Cache serve uma resposta armazenada em vez de recomputar. O benefício é direto: menos banco, menos **CPU** (Central Processing Unit, unidade de processamento), menos latência. O risco também: dados desatualizados chegando ao cliente como se fossem frescos.

A decisão central é o **TTL** (Time To Live, tempo de vida): por quanto tempo a resposta armazenada é considerada válida. TTL curto = cache quente mas dado fresco. TTL longo = menos pressão no banco, dado potencialmente obsoleto.

| Estratégia | Quando usar |
|---|---|
| **Cache-aside** | App verifica cache → miss (ausência no cache) → busca no banco → armazena | Leituras frequentes, escrita infrequente |
| **Write-through** | Escrita vai ao banco e ao cache ao mesmo tempo | Consistência alta, latência de escrita aceitável |
| **Invalidação por evento** | Cache limpo quando dado muda | Dado crítico que não pode ser obsoleto |

Dados que mudam frequentemente com custo de desatualização alto (saldo, estoque, status de pedido) não devem ser cacheados sem invalidação ativa. Dados estáticos ou de baixa criticidade (listas de países, configurações de layout) são candidatos naturais a TTL longo.

## Fila e Processamento Assíncrono

Operações lentas dentro de uma requisição **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) aumentam a latência percebida pelo usuário e travam o **worker** (trabalhador) enquanto esperam. Envio de e-mail, geração de relatório, resize de imagem, integração com serviço externo: nenhuma dessas operações precisa bloquear a resposta.

O padrão é: aceitar o trabalho, responder imediatamente, processar em background.

```
Request → persiste job → 202 Accepted → Worker processa → notifica resultado
```

Benefícios diretos: tempo de resposta previsível, isolamento de falhas (job falha sem derrubar o request), retry automático em falhas transitórias.

**Quando usar fila:**
- Operação leva mais de ~500ms
- Depende de serviço externo com **SLA** (Service Level Agreement, Acordo de Nível de Serviço) variável
- Pode falhar e precisa de retry
- Volume pode criar picos que o banco não absorve em tempo real

## Webhook

Webhook (notificação HTTP enviada pelo servidor ao cliente quando o job conclui) elimina o polling: o servidor chama o cliente, sem o cliente precisar perguntar.

```
Worker conclui job → POST <endpoint-do-cliente> → Cliente responde 200 OK
```

| Prática | Motivo |
|---|---|
| ID do job no payload | Idempotência: reentregas não duplicam efeito |
| Assinar com **HMAC** (Hash-based Message Authentication Code, código de autenticação de mensagem por hash) | Valida que a chamada veio do servidor esperado |
| Retry com backoff (espera crescente entre tentativas) exponencial | Absorve falhas transitórias sem sobrecarregar o cliente |
| Registrar todas as tentativas | Auditoria e diagnóstico de entrega |

**Quando usar**: cliente expõe endpoint público, job pode levar minutos ou horas.

## Polling

Polling (consulta periódica ao servidor) é o cliente verificando o status do job em intervalos regulares até a resposta estar pronta.

```
GET /jobs/{id}/status → 202 In Progress → GET /jobs/{id}/status → 200 Done + resultado
```

Sem dependência de endpoint no cliente. O custo é carga desnecessária: a maioria das consultas retorna "em processamento".

**Long polling** (polling que segura a conexão aberta até ter resposta ou o timeout expirar) reduz esse custo. O servidor só responde quando há dado novo. O cliente reconecta imediatamente após receber.

| Modelo | Intervalo | Impacto |
|---|---|---|
| Short polling | Fixo (ex: 2s) | Simples, cria carga mesmo sem mudança de estado |
| Long polling | Servidor decide | Menos requests, maior complexidade no servidor |

**Quando usar**: cliente sem endpoint público, processamento de duração previsível e curta.

## WebSocket

WebSocket (canal bidirecional persistente entre cliente e servidor) mantém uma conexão aberta. O servidor envia o resultado quando o job conclui, sem o cliente perguntar.

```
Cliente conecta → handshake → [conexão ativa] → Servidor envia resultado → Cliente processa
```

Menor latência entre as três opções: o resultado chega assim que disponível, sem intervalo de polling e sem overhead (custo extra) de nova conexão HTTP.

O custo é operacional: cada cliente conectado mantém uma conexão aberta no servidor. Gateway, load balancer (balanceador de carga) e infra precisam suportar conexões persistentes, o que afeta o escalonamento horizontal.

**Quando usar**: **UI** (User Interface, Interface do Usuário) em tempo real, dashboards (painéis ao vivo) e feeds ao vivo, onde a latência mínima justifica a complexidade operacional.

## Lazy Loading

Carregar dados antes de precisar deles desperdiça recursos e aumenta o tempo de inicialização. Lazy loading (carregamento sob demanda) adia o carregamento para o momento do uso.

| Contexto | Aplicação |
|---|---|
| **Banco de dados** | Relacionamentos carregados apenas quando acessados, não no join inicial |
| **Frontend** | Componentes e imagens carregados conforme entram no viewport (área visível da tela) |
| **Módulos** | Código importado só quando o fluxo de execução chega até ele |

O risco clássico é o **N+1**: carregar uma lista de 100 itens e fazer uma query (consulta ao banco) para cada item ao acessar um relacionamento. O resultado são 101 queries em vez de 2. A solução é carregar relacionamentos em lote quando o acesso é previsível.

## Banco de Dados

Índices, tuning de queries, plano de execução e troubleshooting de gargalos estão em [database.md](database.md).

## Complexidade Algorítmica (Big O)

**Big O** descreve como o tempo de execução ou o uso de memória de um algoritmo cresce à medida que a entrada cresce. É a ferramenta para avaliar se uma solução escala antes de medir em produção.

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
<summary>❌ Bad: O(n²) com loop aninhado sobre a mesma coleção</summary>
<br>

```javascript
for (const order of orders) {
  for (const item of orders) {
    if (order.id === item.relatedId) { ... }
  }
}
```

</details>

<br>

<details>
<summary>✅ Good: indexar em O(n), acessar em O(1)</summary>
<br>

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
<summary>❌ Bad: N+1, uma query por item da lista</summary>
<br>

```javascript
const orders = await orderRepository.findAll();

for (const order of orders) {
  order.customer = await customerRepository.findById(order.customerId);
}
```

</details>

<br>

<details>
<summary>✅ Good: duas queries no total com busca em lote</summary>
<br>

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
<summary>❌ Bad: dois passes sobre a mesma lista</summary>
<br>

```javascript
const activeUserNames = users
  .filter(user => user.isActive)
  .map(user => user.name);
```

</details>

<br>

<details>
<summary>✅ Good: um passe com reduce quando o volume importa</summary>
<br>

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
<summary>❌ Bad: sort() para obter o maior valor (O(n log n))</summary>
<br>

```javascript
const highestScore = scores.sort((a, b) => b - a)[0];
```

</details>

<br>

<details>
<summary>✅ Good: Math.max() em O(n)</summary>
<br>

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
- **Profiler**: medir tempo real antes de otimizar; otimização sem medição é especulação
- **Critério de aceitação**: para operações em lote ou relatórios, definir na spec o volume esperado e o tempo máximo aceitável

