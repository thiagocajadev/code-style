# Métodos em Java

Um método cumpre uma tarefa, e o nome dele anuncia qual é. O tamanho vem como consequência: quando o método faz uma coisa só, ele cabe na tela sem esforço. Os dois princípios que guiam o desenho são **SRP** (Single Responsibility Principle · Princípio da Responsabilidade Única) e **cohesion** (coesão), o grau em que as linhas de dentro do método pertencem à mesma tarefa.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SRP** (Single Responsibility Principle · Princípio da Responsabilidade Única) | o método tem uma única razão para mudar |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | o método ou coordena os passos, ou implementa um deles |
| **cohesion** (coesão) | grau em que as instruções do método pertencem à mesma tarefa |
| **god method** (método-deus) | método que busca, valida, calcula, grava e registra log tudo de uma vez |
| **side effect** (efeito colateral) | alteração que o método provoca fora do próprio retorno: escrita em disco, chamada de rede, troca de estado de um objeto |
| **pure function** (função pura) | função sem efeito colateral; a mesma entrada devolve sempre a mesma saída |
| **method extraction** (extração de método) | tirar um bloco coeso de dentro do método e dar um nome a ele |
| **helper** (método auxiliar) | método de apoio que executa um dos passos do coordenador |
| **builder** (construtor fluente) | forma de montar um objeto de muitos campos sem uma lista longa de parâmetros |

<a id="god-method"></a>

## O método que faz tudo

Quando um método busca, valida, calcula, grava e registra log, qualquer mudança em qualquer uma dessas cinco frentes abre o mesmo arquivo. Separe os passos em métodos com nome, e deixe o método de cima só coordenar a sequência.

<details>
<summary>❌ Ruim: busca, valida, calcula, grava e registra log na mesma função</summary>

```java
public Order realizaVenda(String id) {
    Order p = orderRepository.findById(id).orElse(null);
    Order resultado = null;

    if (p != null) {
        if (p.getItems() != null && !p.getItems().isEmpty()) {
            if (!p.getCustomer().isDefaulted()) {
                if (p.getTotal().compareTo(new BigDecimal("100")) > 0) {
                    p.setDiscount(BigDecimal.TEN);
                } else {
                    p.setDiscount(BigDecimal.ZERO);
                }
                p.setTotal(p.getTotal().subtract(p.getDiscount()));
                resultado = orderRepository.save(p);
                log.info("Log qualquer");
            } else {
                log.warn("cliente inadimplente: {}", p.getCustomer().getName());
                resultado = null;
            }
        }
    }

    return resultado;
}
```

</details>

<details>
<summary>✅ Bom: o método de cima coordena e cada passo tem seu próprio nome</summary>

```java
public Order processOrder(String orderId) {
    final var order = fetchOrder(orderId);

    if (isInvalid(order)) {
        notifyRejection(order);
        return null;
    }

    final var invoice = issueInvoice(order);
    return invoice;
}

private Order fetchOrder(String orderId) {
    return orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
}

private boolean isInvalid(Order order) {
    if (order.getItems().isEmpty()) return true;
    if (order.getCustomer().isDefaulted()) return true;

    return false;
}

private void notifyRejection(Order order) {
    log.warn("pedido rejeitado: {}", order.getCustomer().getName());
}

private Order issueInvoice(Order order) {
    final var discountedOrder = applyDiscount(order);
    final var invoice = orderRepository.save(discountedOrder);
    return invoice;
}
```

</details>

<a id="single-level-of-abstraction"></a>

## Um único nível de abstração por método

Um método coordena os passos ou executa um deles. Quando os dois papéis convivem na mesma função, o leitor pula do "o que acontece aqui" para o "como isso é montado" no meio da leitura, e precisa segurar os dois níveis na cabeça ao mesmo tempo.

<details>
<summary>❌ Ruim: a mesma função coordena e monta o detalhe</summary>

```java
public String buildOrderSummary(Order order) {
    final var header = "Order #" + order.getId();

    // orquestra E implementa ao mesmo tempo
    final var lineItems = order.getItems().stream()
        .map(item -> "  - " + item.getName() + ": $" + item.getPrice())
        .collect(Collectors.joining("\n"));

    return header + "\n" + lineItems;
}
```

</details>

<details>
<summary>✅ Bom: o método de cima só chama, e cada auxiliar faz uma coisa</summary>

```java
public String buildOrderSummary(Order order) {
    final var header = buildHeader(order);
    final var lineItems = buildLineItems(order);

    final var summary = header + "\n" + lineItems;
    return summary;
}

private String buildHeader(Order order) {
    final var header = "Order #" + order.getId();
    return header;
}

private String buildLineItems(Order order) {
    final var lines = order.getItems().stream()
        .map(item -> "  - " + item.getName() + ": $" + item.getPrice());
    final var lineItems = lines.collect(Collectors.joining("\n"));
    return lineItems;
}
```

</details>

<a id="separate-compute-from-format"></a>

## Separar cálculo de formatação

O cálculo do total é uma regra de negócio, e o texto que mostra o total é uma escolha de apresentação. Separar os dois deixa o cálculo disponível para a tela, para o PDF e para o teste, sem arrastar junto o formato de exibição.

<details>
<summary>❌ Ruim: a regra de negócio e o texto de exibição saem do mesmo método</summary>

```java
public String getOrderSummary(Order order) {
    final var subtotal = order.getItems().stream()
        .map(Item::getPrice)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    final var tax = subtotal.multiply(new BigDecimal("0.1"));
    final var total = subtotal.add(tax);

    return "Order #" + order.getId() + ": $" + subtotal + " + tax $" + tax + " = $" + total;
}
```

</details>

<details>
<summary>✅ Bom: um método calcula os totais e outro monta o texto</summary>

```java
public String getOrderSummary(Order order) {
    final var totals = calculateTotals(order.getItems());
    final var summary = formatSummary(order.getId(), totals);
    return summary;
}

private OrderTotals calculateTotals(List<Item> items) {
    final var subtotal = items.stream()
        .map(Item::getPrice)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    final var tax = subtotal.multiply(new BigDecimal("0.1"));
    final var totals = new OrderTotals(subtotal, tax, subtotal.add(tax));
    return totals;
}

private String formatSummary(String orderId, OrderTotals totals) {
    final var summary = "Order #%s: $%s + tax $%s = $%s"
        .formatted(orderId, totals.subtotal(), totals.tax(), totals.total());

    return summary;
}
```

</details>

## Retorno direto

O método público responde à pergunta em duas linhas, e o auxiliar abaixo cuida da busca e do erro. Quem abre o arquivo lê a intenção primeiro e desce até o detalhe só se precisar dele.

<details>
<summary>❌ Ruim: uma variável de apoio e um else depois do throw</summary>

```java
public Product findProductById(String id) {
    Product productFound = null;

    final var result = productRepository.findById(id);

    if (result.isEmpty()) {
        throw new NotFoundException("Product not found.");
    } else {
        productFound = result.get();
    }

    return productFound;
}
```

</details>

<details>
<summary>✅ Bom: a intenção fica no topo e a busca desce para o auxiliar</summary>

```java
public Product findProductById(String id) {
    final var product = fetchProduct(id);
    return product;
}

private Product fetchProduct(String id) {
    final var product = productRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Product " + id + " not found."));

    return product;
}
```

</details>

<a id="clean-entry-point"></a>

## Ponto de entrada limpo

A linha que chama o método diz o que deve acontecer. O cálculo dos argumentos desce para dentro do método chamado, porque quem lê a chamada quer a intenção e não a montagem dos valores.

<details>
<summary>❌ Ruim: a chamada carrega o cálculo inteiro nos argumentos</summary>

```java
submitOrder(
    order.getItems().stream()
        .map(Item::getPrice)
        .reduce(BigDecimal.ZERO, BigDecimal::add)
        .multiply(BigDecimal.ONE.subtract(getDiscount(user))),
    Instant.now().toString()
);
```

</details>

<details>
<summary>✅ Bom: a chamada cabe em uma linha e os passos moram dentro</summary>

```java
submitOrder(orderId);

private Invoice submitOrder(String orderId) {
    final var order = fetchOrder(orderId);
    final var pricedOrder = applyPricing(order);

    final var invoice = persistOrder(pricedOrder);
    return invoice;
}
```

</details>

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

O `return` entrega uma variável já pronta, e o nome dessa variável repete a intenção do método. Quando a expressão inteira mora dentro do `return`, o leitor precisa avaliar a expressão de cabeça para descobrir o que sai dali.

<details>
<summary>❌ Ruim: a expressão inteira mora dentro do return</summary>

```java
public String buildGreeting(User user) {
    return "Hello, " + user.getName() + "! You have " + user.getNotifications().size() + " notifications.";
}

public List<User> getActiveUsers(List<User> users) {
    return users.stream()
        .filter(user -> user.isActive() && !user.isBanned())
        .toList();
}
```

</details>

<details>
<summary>✅ Bom: a variável nomeia o resultado e o return só a entrega</summary>

```java
public String buildGreeting(User user) {
    final var greeting = "Hello, %s! You have %d notifications."
        .formatted(user.getName(), user.getNotifications().size());

    return greeting;
}

public List<User> getActiveUsers(List<User> users) {
    final var activeUsers = users.stream()
        .filter(user -> user.isActive() && !user.isBanned())
        .toList();

    return activeUsers;
}
```

</details>

<a id="low-visual-density"></a>

## Baixa densidade visual

Linhas que fazem parte do mesmo passo ficam coladas. Entre um passo e o seguinte entra uma linha em branco, sempre uma só. O bloco passa a ter parágrafos, e o leitor enxerga onde cada etapa começa antes de ler qualquer linha.

<details>
<summary>❌ Ruim: sete linhas seguidas sem separação entre as etapas</summary>

```java
public Invoice processOrder(String orderId) {
    final var order = orderRepository.findById(orderId).orElseThrow();
    if (order == null) return null;
    final var discountedOrder = applyDiscount(order);
    final var invoice = buildInvoice(discountedOrder);
    invoiceRepository.save(invoice);
    notificationService.notifyCustomer(invoice);
    return invoice;
}
```

</details>

<details>
<summary>✅ Bom: busca, cálculo, gravação e retorno em blocos separados</summary>

```java
public Invoice processOrder(String orderId) {
    final var order = orderRepository.findById(orderId).orElseThrow();
    if (order == null) return null;

    final var discountedOrder = applyDiscount(order);
    final var invoice = buildInvoice(discountedOrder);

    invoiceRepository.save(invoice);
    notificationService.notifyCustomer(invoice);

    return invoice;
}
```

</details>

<a id="vertical-parameters"></a>

## Estilo vertical nos parâmetros

Até três parâmetros cabem na mesma linha. Com quatro ou mais, agrupe-os num `record`. O ganho aparece na chamada: cada valor passa a vir acompanhado do nome do campo, e trocar a ordem de dois argumentos do mesmo tipo deixa de compilar em silêncio.

<details>
<summary>❌ Ruim: cinco valores soltos na chamada, sem nada dizendo qual é qual</summary>

```java
private Invoice createInvoice(String orderId, String customerId, BigDecimal amount, LocalDate dueDate, String currency) { /* ... */ }

createInvoice("ord-1", "cust-99", new BigDecimal("149.90"), LocalDate.of(2026, 5, 1), "BRL");
```

</details>

<details>
<summary>✅ Bom: o record agrupa os campos e a chamada mostra um valor por linha</summary>

```java
record InvoiceRequest(String orderId, String customerId, BigDecimal amount, LocalDate dueDate, String currency) {}

private Invoice createInvoice(InvoiceRequest request) { /* ... */ }

createInvoice(new InvoiceRequest(
    "ord-1",
    "cust-99",
    new BigDecimal("149.90"),
    LocalDate.of(2026, 5, 1),
    "BRL"
));
```

</details>
