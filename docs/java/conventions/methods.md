# Methods

Um método faz uma coisa. Seu nome diz o quê. Seu tamanho cabe na tela. **SRP** (Single
Responsibility Principle, Princípio da Responsabilidade Única) e **cohesion** (coesão)
guiam o desenho.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SRP** (Single Responsibility Principle · Princípio da Responsabilidade Única) | cada método tem uma única razão para mudar |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | cada método opera em um só nível: orquestra passos ou implementa detalhe |
| **cohesion** (coesão) | grau em que as instruções do método pertencem à mesma tarefa |
| **god method** (método-deus) | método que faz tudo: busca, valida, calcula, persiste, loga |
| **side effect** (efeito colateral) | alteração observável fora do retorno do método (I/O, mutação de estado) |
| **pure function** (função pura) | função sem efeito colateral; mesma entrada produz mesma saída |
| **method extraction** (extração de método) | extrair bloco coeso para método nomeado, reduzindo o tamanho do original |
| **helper** (método auxiliar) | método de apoio que implementa um passo do orquestrador; dá nome ao detalhe |
| **builder** (construtor fluente) | padrão para construir objetos com muitos parâmetros sem listas longas |

<a id="god-method"></a>

## God method: múltiplas responsabilidades

<details>
<summary>❌ Ruim: busca, valida, calcula, persiste e loga na mesma função</summary>

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
<summary>✅ Bom: orquestrador no topo, responsabilidades separadas</summary>

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

## SLA: orquestrador ou implementação, nunca os dois

<details>
<summary>❌ Ruim: mesmo método orquestra e implementa</summary>

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
<summary>✅ Bom: orquestrador chama helpers, cada um faz uma coisa</summary>

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

<details>
<summary>❌ Ruim: cálculo e formatação misturados</summary>

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
<summary>✅ Bom: cálculo separado da formatação</summary>

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

## Direct return

O retorno fica no topo do método, com os detalhes encapsulados em auxiliares abaixo.

<details>
<summary>❌ Ruim: variável auxiliar desnecessária, else após throw</summary>

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
<summary>✅ Bom: intenção clara no topo, detalhe abaixo</summary>

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

## Ponto de entrada limpo

O caller expressa o quê, não o como. Toda construção de contexto fica dentro do método.

<details>
<summary>❌ Ruim: caller monta lógica inline antes de chamar</summary>

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
<summary>✅ Bom: entrada de uma linha, detalhes dentro</summary>

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

O retorno nomeia o resultado, não o computa. A variável é expressiva e simétrica com a intenção
do método.

<details>
<summary>❌ Ruim: lógica inline no return</summary>

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
<summary>✅ Bom: variável expressiva antes do return</summary>

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

## Baixa densidade visual

Linhas relacionadas ficam juntas. Grupos distintos se separam com exatamente uma linha em branco.
Nunca duas.

<details>
<summary>❌ Ruim: parede de código sem respiro entre grupos</summary>

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
<summary>✅ Bom: parágrafos de intenção</summary>

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

## Estilo vertical: parâmetros

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um record.

<details>
<summary>❌ Ruim: 4+ parâmetros inline, intenção obscura na chamada</summary>

```java
private Invoice createInvoice(String orderId, String customerId, BigDecimal amount, LocalDate dueDate, String currency) { /* ... */ }

createInvoice("ord-1", "cust-99", new BigDecimal("149.90"), LocalDate.of(2026, 5, 1), "BRL");
```

</details>

<details>
<summary>✅ Bom: record quando 4+ parâmetros</summary>

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
