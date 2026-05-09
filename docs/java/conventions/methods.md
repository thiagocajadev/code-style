# Methods

Um método faz uma coisa. Seu nome diz o quê. Seu tamanho cabe na tela.

## God method — múltiplas responsabilidades

<details>
<summary>❌ Bad — busca, valida, calcula, persiste e loga na mesma função</summary>
<br>

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

<br>

<details>
<summary>✅ Good — orquestrador no topo, responsabilidades separadas</summary>
<br>

```java
public Order processOrder(String orderId) {
    final var order = fetchOrder(orderId);
    if (isInvalid(order)) return null;

    final var invoice = issueInvoice(order);
    return invoice;
}

private Order fetchOrder(String orderId) {
    return orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
}

private boolean isInvalid(Order order) {
    if (order.getItems().isEmpty()) return true;
    if (order.getCustomer().isDefaulted()) {
        notifyDefault(order);
        return true;
    }
    return false;
}

private Order issueInvoice(Order order) {
    final var discountedOrder = applyDiscount(order);
    final var invoice = orderRepository.save(discountedOrder);
    return invoice;
}
```

</details>

## SLA — orquestrador ou implementação, nunca os dois

<details>
<summary>❌ Bad — mesmo método orquestra e implementa</summary>
<br>

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

<br>

<details>
<summary>✅ Good — orquestrador chama helpers, cada um faz uma coisa</summary>
<br>

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

## Separar cálculo de formatação

<details>
<summary>❌ Bad — cálculo e formatação misturados</summary>
<br>

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

<br>

<details>
<summary>✅ Good — cálculo separado da formatação</summary>
<br>

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
<summary>❌ Bad — variável auxiliar desnecessária, else após throw</summary>
<br>

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

<br>

<details>
<summary>✅ Good — intenção clara no topo, detalhe abaixo</summary>
<br>

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
<summary>❌ Bad — caller monta lógica inline antes de chamar</summary>
<br>

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

<br>

<details>
<summary>✅ Good — entrada de uma linha, detalhes dentro</summary>
<br>

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

## Sem lógica no retorno

O retorno nomeia o resultado, não o computa. A variável é expressiva e simétrica com a intenção
do método.

<details>
<summary>❌ Bad — lógica inline no return</summary>
<br>

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

<br>

<details>
<summary>✅ Good — variável expressiva antes do return</summary>
<br>

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
<summary>❌ Bad — parede de código sem respiro entre grupos</summary>
<br>

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

<br>

<details>
<summary>✅ Good — parágrafos de intenção</summary>
<br>

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

## Estilo vertical — parâmetros

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um record.

<details>
<summary>❌ Bad — 4+ parâmetros inline, intenção obscura na chamada</summary>
<br>

```java
private Invoice createInvoice(String orderId, String customerId, BigDecimal amount, LocalDate dueDate, String currency) { /* ... */ }

createInvoice("ord-1", "cust-99", new BigDecimal("149.90"), LocalDate.of(2026, 5, 1), "BRL");
```

</details>

<br>

<details>
<summary>✅ Good — record quando 4+ parâmetros</summary>
<br>

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
