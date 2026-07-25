# Padrões de aplicação e infraestrutura

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O catálogo **GoF** (Gang of Four · Gangue dos Quatro) de 1994 nasceu antes de a maioria dos sistemas falar com banco de dados por rede, chamar serviços de terceiros e precisar sobreviver à indisponibilidade deles. Os padrões deste documento apareceram depois, e quase todos respondem a uma dessas três realidades: persistência, falha parcial e montagem da aplicação. Os 23 padrões clássicos vivem em [`patterns.md`](./patterns.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Result** (resultado tipado) | Valor de retorno que carrega sucesso ou falha, com os dois visíveis na assinatura |
| **Repository** (repositório) | Interface orientada a domínio que esconde como os dados são lidos e gravados |
| **Specification** (especificação) | Regra de negócio como objeto, capaz de avaliar um item e de virar consulta |
| **Null Object** (objeto de ausência) | Implementação que representa "nenhum" e responde às mesmas chamadas |
| **UoW** (Unit of Work · Unidade de Trabalho) | Agrupa as escritas de uma operação e as confirma de uma vez |
| **CQS** (Command-Query Separation · Separação de Comando e Consulta) | Princípio de função: retorna valor OU produz efeito, nunca os dois |
| **CQRS** (Command Query Responsibility Segregation · Segregação de Responsabilidade de Comando e Consulta) | Padrão arquitetural: modelos de escrita e de leitura separados |
| **Projection** (Projeção) | Modelo de leitura desnormalizado, montado para responder consultas rápido |
| **Circuit Breaker** (disjuntor) | Para de chamar um serviço que está falhando, e volta a testar depois de um intervalo |
| **DI** (Dependency Injection · Injeção de Dependência) | Entregar os colaboradores prontos, em vez de a classe criá-los |
| **IoC** (Inversion of Control · Inversão de Controle) | Quem monta a aplicação decide as implementações, e não cada classe |
| **SDD** (Spec-Driven Development · Desenvolvimento Orientado a Especificações) | A spec define contrato de entradas, saídas e comportamentos antes da implementação |
| **LLM** (Large Language Model · Modelo de Linguagem de Grande Escala) | Modelo de IA treinado em texto que gera código e auxilia no desenvolvimento |

## Referência rápida

| Pattern | Problema que resolve | Sinal de uso |
|---|---|---|
| [**Result**](#result) | Falhas de negócio invisíveis na assinatura | Operação de domínio que pode ser recusada por regra |
| [**Repository**](#repository) | Acoplamento entre domínio e armazenamento | `SELECT` no meio do código de negócio |
| [**Specification**](#specification) | A mesma regra escrita como filtro em vários lugares | Condição de negócio repetida em consulta e em validação |
| [**Null Object**](#null-object) | Verificação de ausência espalhada por quem consome | `if (x)` antes de cada chamada ao mesmo colaborador |
| [**Unit of Work**](#unit-of-work) | Escritas de uma operação confirmadas em momentos diferentes | Operação que grava em dois repositórios |
| [**CQRS**](#cqrs) | Modelo de escrita e de leitura divergem | Relatório complexo, alto volume de consulta |
| [**Circuit Breaker**](#circuit-breaker) | Insistir com um serviço indisponível derruba o chamador | Timeout em cascata, fila de requisições travadas |
| [**Injeção de dependência**](#dependency-injection) | A classe cria os próprios colaboradores | Teste que exige banco e rede para uma regra de negócio |
| [**AI-Driven**](#ai-driven-development) | Geração acelerada sem revisão crítica | Ciclos rápidos com spec bem definida |
| [**SDD**](#sdd) | Decisões de design tomadas dentro do código | Retrabalho descoberto depois da implementação |

Três padrões desta família já têm tratamento completo em outros documentos: **Saga** e **Unit of Work** em [`transactions.md`](./transactions.md), **Outbox** e nova tentativa com espera crescente em [`domain-events.md`](./domain-events.md) e [`backend-flow.md`](./backend-flow.md).

---

<a id="domain-patterns"></a>

## Padrões de domínio

<a id="result"></a>

### Result

Operações que podem falhar têm dois caminhos: sucesso e falha. A forma mais comum de tratar isso é lançar exceções, e o problema é que a exceção fica invisível na assinatura da função. Quem chama precisa ler a implementação para descobrir que a função pode falhar e em quais condições.

<details>
<summary>❌ Ruim: a recusa por regra de negócio sai como exceção</summary>

```js
async function applyCoupon(order, couponCode) {
  const coupon = await couponRepository.findByCode(couponCode);

  if (!coupon) {
    throw new Error("coupon not found");
  }

  if (coupon.isExpired) {
    throw new Error("coupon expired");
  }

  const discountedOrder = order.applyDiscount(coupon.discount);
  return discountedOrder;
}
```

A assinatura promete devolver um pedido. Que ela pode recusar, e por quais motivos, só aparece lendo o corpo inteiro. Para distinguir cupom vencido de cupom inexistente, quem chama compara o texto da mensagem, que muda na primeira revisão de tradução.

</details>

<details>
<summary>✅ Bom: os dois caminhos aparecem no retorno</summary>

```js
async function applyCoupon(order, couponCode) {
  const coupon = await couponRepository.findByCode(couponCode);

  if (!coupon) {
    const couponNotFound = Result.failure("COUPON_NOT_FOUND");
    return couponNotFound;
  }

  if (coupon.isExpired) {
    const couponExpired = Result.failure("COUPON_EXPIRED");
    return couponExpired;
  }

  const discountedOrder = order.applyDiscount(coupon.discount);
  const appliedCoupon = Result.success(discountedOrder);
  return appliedCoupon;
}
```

O motivo da recusa é um código estável, e a camada HTTP o traduz para status e mensagem num lugar só. As exceções voltam a significar o que deveriam: falha de infraestrutura e estado impossível.

</details>

**Quando usar**: operações de domínio que podem ser recusadas por regra de negócio (validação, não encontrado, estado inválido). Exceções de infraestrutura, como falha de banco e tempo esgotado de rede, seguem o caminho normal de exceções.

<a id="repository"></a>

### Repository

O código de negócio deve ignorar **SQL** (Structured Query Language · Linguagem de Consulta Estruturada), **ORM** (Object-Relational Mapper · Mapeador Objeto-Relacional) e qualquer detalhe de armazenamento. Repository encapsula o acesso a dados atrás de uma interface orientada a domínio.

<details>
<summary>❌ Ruim: a regra de reativação monta a consulta</summary>

```js
async function findCustomersForReactivation() {
  const customers = await database.query(
    `SELECT * FROM customers
     WHERE status = 'inactive'
       AND last_purchase_at < NOW() - INTERVAL '90 days'
       AND total_spent >= 1000`
  );

  return customers;
}
```

A regra de reativação está escrita em SQL, e o nome das colunas vazou para a camada que decide quem merece uma campanha. Trocar de banco reescreve esta função, e testar a regra exige um banco de pé.

</details>

<details>
<summary>✅ Bom: o domínio pede em vocabulário de domínio</summary>

```js
async function findCustomersForReactivation(customerRepository) {
  const customers = await customerRepository.findInactiveHighValue({
    inactiveForDays: 90,
    minimumTotalSpent: 1000,
  });

  return customers;
}
```

O domínio fala em cliente inativo de alto valor, e o `SELECT` fica na camada de dados. Essa camada pode mudar de PostgreSQL para outro banco sem tocar a regra, e o teste passa um repositório em memória.

</details>

**Quando usar**: acesso a banco em sistemas com lógica de domínio não trivial. Em CRUD simples sem regra de negócio, o repositório acrescenta uma camada que não devolve nada.

<a id="specification"></a>

### Specification

Uma regra de negócio precisa responder a duas perguntas: este item satisfaz a regra, e quais itens do banco a satisfazem. Escrita como filtro, ela acaba duplicada nos dois lugares e as duas versões divergem.

<details>
<summary>❌ Ruim: a definição de cliente VIP escrita em três lugares</summary>

```js
const vipCustomers = await database.customers.find({
  status: "active",
  totalSpent: { $gte: 1000 },
});

function canAccessVipSupport(customer) {
  const isVip = customer.status === "active" && customer.totalSpent >= 1000;
  return isVip;
}

const vipBadgeVisible = customer.totalSpent >= 1000;
```

Três versões da mesma regra, e a terceira já esqueceu a condição de cliente ativo. Quando o limite subir para 2000, alguém vai encontrar dois dos três lugares.

</details>

<details>
<summary>✅ Bom: a regra é um objeto que avalia e também consulta</summary>

```js
const VIP_MINIMUM_TOTAL_SPENT = 1000;

class VipCustomerSpecification {
  isSatisfiedBy(customer) {
    const isActive = customer.status === "active";
    const spendsEnough = customer.totalSpent >= VIP_MINIMUM_TOTAL_SPENT;

    const isVip = isActive && spendsEnough;
    return isVip;
  }

  toQuery() {
    const query = {
      status: "active",
      totalSpent: { $gte: VIP_MINIMUM_TOTAL_SPENT },
    };

    return query;
  }
}
```

A regra tem um nome e um lugar. O crachá na interface, a permissão de suporte e a consulta ao banco chamam o mesmo objeto, e a mudança de limite toca uma constante.

</details>

**Quando usar**: regras de negócio nomeáveis que aparecem tanto em validação quanto em consulta. Especificações que se combinam com `and` e `or` valem quando o negócio combina os critérios em vários arranjos; com um arranjo só, a álgebra acrescenta mais do que devolve.

<a id="null-object"></a>

### Null Object

Um colaborador opcional espalha verificação de ausência por todos os pontos que o usam. O Null Object entrega uma implementação que representa "nenhum" e responde às mesmas chamadas sem fazer nada.

<details>
<summary>❌ Ruim: cada uso verifica se a política existe</summary>

```js
function calculateFinalPrice(order, customer) {
  const policy = customer.discountPolicy;
  const discount = policy ? policy.calculate(order) : 0;
  const label = policy ? policy.description : "sem desconto";

  const finalPrice = order.total - discount;
  return { finalPrice, label };
}
```

A verificação se repete a cada uso e é fácil de esquecer. O comportamento do cliente sem política fica descrito em pedaços, espalhado por quem consome, em vez de existir num lugar.

</details>

<details>
<summary>✅ Bom: a ausência tem uma implementação com nome</summary>

```js
class NoDiscountPolicy {
  calculate() {
    const discount = 0;
    return discount;
  }

  get description() {
    return "sem desconto";
  }
}

function calculateFinalPrice(order, customer) {
  const discount = customer.discountPolicy.calculate(order);
  const label = customer.discountPolicy.description;

  const finalPrice = order.total - discount;
  const priceSummary = { finalPrice, label };
  return priceSummary;
}
```

Quem consome deixa de verificar. O comportamento do cliente sem desconto fica numa classe com nome, e mudar esse comportamento passa a ser uma edição em um arquivo.

</details>

**Quando usar**: colaborador opcional com um comportamento neutro claro. Quando a ausência precisa ser tratada de forma diferente por quem chama, esconder o `null` atrás de um objeto neutro apaga uma decisão que era do domínio.

---

<a id="persistence-patterns"></a>

## Padrões de persistência

<a id="unit-of-work"></a>

### Unit of Work

Uma operação de negócio grava em mais de um lugar. Sem coordenação, cada repositório confirma a própria escrita, e uma falha no meio deixa o sistema com metade da operação aplicada.

<details>
<summary>❌ Ruim: cada repositório confirma sozinho</summary>

```js
async function transferStock(fromWarehouseId, toWarehouseId, sku, quantity) {
  await warehouseRepository.decreaseStock(fromWarehouseId, sku, quantity);
  await warehouseRepository.increaseStock(toWarehouseId, sku, quantity);

  await transferLogRepository.record(fromWarehouseId, toWarehouseId, sku);
}
```

Uma falha na segunda linha deixa o estoque removido da origem e ausente no destino. O registro de transferência some junto, e não sobra rastro de onde a quantidade parou.

</details>

<details>
<summary>✅ Bom: as escritas confirmam juntas</summary>

```js
async function transferStock(fromWarehouseId, toWarehouseId, sku, quantity) {
  await unitOfWork.run(async (session) => {
    await warehouseRepository.decreaseStock(fromWarehouseId, sku, quantity, session);
    await warehouseRepository.increaseStock(toWarehouseId, sku, quantity, session);

    await transferLogRepository.record(fromWarehouseId, toWarehouseId, sku, session);
  });
}
```

As três escritas entram na mesma sessão e confirmam de uma vez. Uma falha em qualquer ponto desfaz tudo, e o estoque nunca aparece em quantidade errada.

</details>

**Quando usar**: operações que gravam em mais de um repositório dentro do mesmo limite de consistência. O limite certo é o agregado, e [`transactions.md`](./transactions.md) trata do assunto em profundidade, incluindo o caso em que dois agregados precisam ser coordenados por evento em vez de transação.

<a id="cqrs"></a>

### CQRS

> Não confundir com **CQS** (Command-Query Separation), que é um princípio de _função_: a função retorna valor ou produz efeito, nunca os dois. CQRS é um padrão _arquitetural_ que separa modelos inteiros de escrita e leitura.

Em sistemas com lógica de negócio complexa, o modelo de escrita (validações, invariantes, regras de domínio) e o modelo de leitura (relatórios, painéis, listas paginadas) divergem. A forma boa de persistir um dado e a forma boa de exibi-lo são diferentes, e forçar as duas no mesmo modelo prejudica as duas.

<details>
<summary>❌ Ruim: o painel monta a leitura a partir do modelo de escrita</summary>

```js
async function loadSalesDashboard(month) {
  const orders = await orderRepository.findByMonth(month);

  const summaries = await Promise.all(
    orders.map(async (order) => {
      const customer = await customerRepository.findById(order.customerId);
      const items = await orderItemRepository.findByOrder(order.id);

      return buildSummary(order, customer, items);
    })
  );

  return summaries;
}
```

Cada pedido do mês dispara duas consultas extras. O painel carrega o agregado inteiro com todas as suas regras para exibir cinco colunas, e o tempo de resposta acompanha o volume de vendas.

</details>

<details>
<summary>✅ Bom: uma tabela de leitura mantida pelos eventos de escrita</summary>

```js
async function loadSalesDashboard(month) {
  const summaries = await salesSummaryProjection.findByMonth(month);
  return summaries;
}

async function onOrderPlaced(event) {
  await salesSummaryProjection.upsert({
    month: event.placedAt.slice(0, 7),
    customerName: event.customerName,
    orderTotal: event.total,
  });
}
```

O painel faz uma consulta a uma tabela já no formato da tela. O modelo de escrita continua com as regras de domínio, e a projeção é atualizada pelos eventos que ele publica.

</details>

| Responsabilidade | Modelo | Objetivo |
|---|---|---|
| **Command** | Write model | Validar e persistir mudança de estado |
| **Query** | Read model (Projection) | Servir dados prontos para leitura |

**Quando usar**: sistemas onde o modelo de leitura e o de escrita divergem de forma significativa: relatórios complexos, painéis de alto volume, auditoria, histórico de eventos. Em CRUD simples, CQRS acrescenta duas estruturas para manter e não devolve nada. A projeção fica atrás do modelo de escrita por alguns instantes, e a tela precisa suportar isso.

---

<a id="resilience-patterns"></a>

## Padrões de resiliência

<a id="circuit-breaker"></a>

### Circuit Breaker

Um serviço externo fica indisponível. Sem proteção, o chamador continua tentando, cada tentativa espera o tempo limite antes de desistir, e as requisições se acumulam até derrubar quem estava saudável.

<details>
<summary>❌ Ruim: insistir enquanto o serviço estiver fora</summary>

```js
async function fetchShippingQuote(order) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const quote = await carrierApi.quote(order);
      return quote;
    } catch (error) {
      await wait(1000);
    }
  }

  throw new Error("carrier unavailable");
}
```

Com a transportadora fora do ar, cada requisição espera três tempos limite antes de falhar. Mil usuários simultâneos produzem três mil chamadas a um serviço que já está em dificuldade, e as conexões do próprio sistema terminam ocupadas na espera.

</details>

<details>
<summary>✅ Bom: parar de chamar depois de um número de falhas seguidas</summary>

```js
const carrierBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000,
});

async function fetchShippingQuote(order) {
  if (carrierBreaker.isOpen) {
    const fallbackQuote = estimateQuoteFromTable(order);
    return fallbackQuote;
  }

  const quote = await carrierBreaker.call(() => carrierApi.quote(order));
  return quote;
}
```

Depois de cinco falhas seguidas, o disjuntor abre e as chamadas seguintes voltam na hora, com a estimativa da tabela local. Passados trinta segundos, uma chamada de teste decide se o serviço voltou.

</details>

**Quando usar**: toda dependência externa de rede em caminho que o usuário espera. O disjuntor acompanha um tempo limite explícito e uma resposta alternativa; sem essa resposta, ele troca a espera longa por um erro rápido, que ainda é melhor do que a fila travada.

A nova tentativa com espera crescente e a fila de mensagens não processadas estão em [`backend-flow.md`](./backend-flow.md). A coordenação de operações distribuídas que não cabem numa transação está em [`transactions.md`](./transactions.md), como Saga.

---

<a id="composition-patterns"></a>

## Padrões de composição

<a id="dependency-injection"></a>

### Injeção de dependência

Uma classe que cria os próprios colaboradores decide por conta própria com quem vai falar. A injeção de dependência entrega os colaboradores prontos, e quem monta a aplicação passa a decidir as implementações. Esse deslocamento da decisão é a **IoC** (Inversion of Control · Inversão de Controle).

<details>
<summary>❌ Ruim: a classe monta as próprias dependências</summary>

```js
class OrderCheckout {
  constructor() {
    this.orderRepository = new PostgresOrderRepository(process.env.DATABASE_URL);
    this.notifier = new SendGridNotifier(process.env.SENDGRID_KEY);
  }
}
```

Testar `OrderCheckout` exige Postgres e uma chave do SendGrid, mesmo para conferir uma regra de negócio. Trocar de provedor abre a classe de domínio, e cada instância cria a própria conexão.

</details>

<details>
<summary>✅ Bom: os colaboradores chegam prontos, e a montagem fica numa camada só</summary>

```js
class OrderCheckout {
  constructor(orderRepository, notifier) {
    this.orderRepository = orderRepository;
    this.notifier = notifier;
  }
}

export function buildApplication(configuration) {
  const orderRepository = new PostgresOrderRepository(configuration.databaseUrl);
  const notifier = new SendGridNotifier(configuration.sendGridKey);

  const orderCheckout = new OrderCheckout(orderRepository, notifier);
  return orderCheckout;
}
```

A montagem acontece em uma função, no ponto de entrada da aplicação. O teste passa um repositório em memória e um notificador que registra a chamada, sem rede e sem variável de ambiente.

</details>

**Quando usar**: sempre que uma classe depender de I/O, de relógio, de gerador de identificador ou de qualquer coisa que o teste precise controlar. Um contêiner de injeção resolve o grafo de dependências automaticamente e vale a partir de algumas dezenas de serviços; abaixo disso, a função de montagem é mais legível. O princípio por trás está em [`solid.md`](./solid.md#dependency-inversion) e [`principles.md`](./principles.md#explicit-dependencies).

---

<a id="process-patterns"></a>

## Padrões de processo

<a id="ai-driven-development"></a>

### AI-Driven Development

Desenvolvimento assistido por **LLM** integrado ao ciclo de engenharia: geração de código, revisão, sugestão de refatoração e navegação em bases de código grandes.

O risco central está na ausência de revisão crítica. Código gerado sem avaliação contra a spec e os padrões do projeto cria dívida técnica opaca: ele funciona, e ao mesmo tempo desencaixa do modelo de domínio, ignora convenções ou duplica lógica que já existia.

A prática correta:

```
Spec define o contrato → IA gera o candidato → Engenheiro revisa contra spec e padrões → Merge
```

Nesse modelo, a IA acelera a geração e o engenheiro mantém a responsabilidade pelo design e pela qualidade. O critério de avaliação é a spec, e ela substitui a impressão de que o código "parece certo".

**Quando usar**: qualquer tarefa onde o contrato já está definido. A IA produz melhor quando sabe o que deve entregar; tarefas sem spec clara geram código sem critério de aceitação.

<a id="sdd"></a>

### SDD

**SDD** (Spec-Driven Development · Desenvolvimento Orientado a Especificações): a spec (especificação) define entradas, saídas e comportamentos esperados antes de qualquer linha de implementação. A implementação existe para cumprir a spec.

Ciclo:

```
SPEC → PLAN → CODE → TEST → END
```

- **SPEC**: define o contrato, ou seja, o quê e o porquê; o como fica para depois
- **PLAN**: decompõe em tarefas ordenadas com esforço estimado
- **CODE**: implementa o plano, nada além
- **TEST**: verifica que a implementação satisfaz a spec
- **END**: fecha o ciclo com changelog, sincronização do backlog e commit

Rever uma spec é uma conversa. Rever código já implementado obriga a entender o que foi escrito, reescrever e testar de novo. Decisões de design tomadas na spec chegam ao código com a intenção já clara.

> Este guia segue SDD. Referência completa do padrão: [specdrivenguide.org](https://specdrivenguide.org/).

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Os 23 padrões clássicos do catálogo GoF | [`patterns.md`](./patterns.md) |
| Limite transacional, Unit of Work em profundidade, Saga e travas | [`transactions.md`](./transactions.md) |
| Outbox, idempotência, fila de mensagens não processadas | [`backend-flow.md`](./backend-flow.md) |
| Evento de domínio e evento de integração | [`domain-events.md`](./domain-events.md) |
| Os princípios que esses padrões implementam | [`solid.md`](./solid.md) |
| Saber se o padrão é necessário neste momento | [`principles-advanced.md`](./principles-advanced.md) |
