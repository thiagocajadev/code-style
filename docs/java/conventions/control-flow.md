# Control Flow

> Escopo: Java 25 LTS.

Controle de fluxo evolui com a complexidade. A ferramenta certa depende de quantas condições
existem, se mapeiam valores ou executam ações, e se o fluxo pode precisar de saída antecipada.

## If e else

O ponto de partida. Para dois caminhos, `if/else` funciona. O `else` após um `return` é ruído:
o fluxo já saiu.

<details>
<summary>❌ Bad — else desnecessário após return</summary>
<br>

```java
private BigDecimal getDiscount(User user) {
    if (user.isPremium()) {
        return new BigDecimal("0.2");
    } else {
        return new BigDecimal("0.05");
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — early return elimina o else</summary>
<br>

```java
private BigDecimal getDiscount(User user) {
    if (user.isPremium()) {
        final var discount = new BigDecimal("0.2");
        return discount;
    }

    final var discount = new BigDecimal("0.05");
    return discount;
}
```

</details>

## Ternário

Para atribuição de dois valores possíveis em uma linha, não para lógica de fluxo. Encadeado,
vira puzzle (quebra-cabeça). Três ou mais alternativas → guard clauses ou switch expression.

<details>
<summary>❌ Bad — ternário encadeado ilegível</summary>
<br>

```java
final var label = score >= 90 ? "A"
    : score >= 80 ? "B"
    : score >= 70 ? "C"
    : score >= 60 ? "D"
    : "F";
```

</details>

<br>

<details>
<summary>✅ Good — ternário para dois valores; guard clauses para três ou mais</summary>
<br>

```java
final var label = user.isPremium() ? "Premium" : "Standard";

// 3+ alternativas → guard clauses
private String getGrade(int score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
}
```

</details>

## Guard clauses — aninhamento em cascata

Quando as condições crescem e se aninham, cada nível enterra a lógica um nível mais fundo.
Guard clauses invertem: valide as saídas no topo e deixe o caminho feliz limpo.

<details>
<summary>❌ Bad — lógica enterrada em múltiplos níveis</summary>
<br>

```java
private Invoice processOrder(Order order) {
    if (order != null) {
        if (order.isActive()) {
            if (!order.getItems().isEmpty()) {
                if (order.getCustomer() != null) {
                    return process(order);
                }
            }
        }
    }
    return null;
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clauses, caminho feliz ao fundo</summary>
<br>

```java
private Invoice processOrder(Order order) {
    if (order == null) return null;
    if (!order.isActive()) return null;

    if (order.getItems().isEmpty()) return null;
    if (order.getCustomer() == null) return null;

    final var invoice = process(order);
    return invoice;
}
```

</details>

## Switch expression — lookup de valor

Quando múltiplos guards ou `if/else` retornam um valor para cada chave, a lista de condições
vira um catálogo. Switch expression com arrow (`->`) é compacto, sem fall-through (queda entre casos) acidental e
sem `break`.

<details>
<summary>❌ Bad — switch tradicional verboso com fall-through implícito</summary>
<br>

```java
private String getStatusLabel(OrderStatus status) {
    String label;
    switch (status) {
        case PENDING:
            label = "Pending review";
            break;
        case APPROVED:
            label = "Approved";
            break;
        case REJECTED:
            label = "Rejected";
            break;
        default:
            label = "Unknown";
    }
    return label;
}
```

</details>

<br>

<details>
<summary>✅ Good — switch expression: compacto, sem fall-through, sem break</summary>
<br>

```java
private String getStatusLabel(OrderStatus status) {
    final var label = switch (status) {
        case PENDING   -> "Pending review";
        case APPROVED  -> "Approved";
        case REJECTED  -> "Rejected";
        case CANCELLED -> "Cancelled";
    };
    return label;
}
```

</details>

## Switch — despacho de ações

Quando cada caso precisa executar múltiplas ações (não retornar um valor, mas fazer algo),
`switch` com bloco `{}` é mais claro que um `if/else` encadeado.

<details>
<summary>❌ Bad — if/else encadeado para despacho de ações</summary>
<br>

```java
private void processPaymentEvent(PaymentEvent event) {
    if (event.type() == PaymentEventType.SUCCESS) {
        sendReceipt(event.orderId());
        updateOrderStatus(event.orderId(), "paid");
    } else if (event.type() == PaymentEventType.FAILED) {
        notifyFailure(event.userId());
        scheduleRetry(event.orderId());
    } else if (event.type() == PaymentEventType.REFUNDED) {
        sendRefundConfirmation(event.userId());
        updateOrderStatus(event.orderId(), "refunded");
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — switch para despacho de comportamento</summary>
<br>

```java
private void processPaymentEvent(PaymentEvent event) {
    switch (event.type()) {
        case SUCCESS -> {
            sendReceipt(event.orderId());
            updateOrderStatus(event.orderId(), "paid");
        }
        case FAILED -> {
            notifyFailure(event.userId());
            scheduleRetry(event.orderId());
        }
        case REFUNDED -> {
            sendRefundConfirmation(event.userId());
            updateOrderStatus(event.orderId(), "refunded");
        }
    }
}
```

</details>

## Pattern matching — tipo e desestruturação

Java 21+ permite desestruturar no switch direto do tipo, eliminando o cast manual. Com sealed
classes, o compilador garante exaustividade — sem `default` necessário.

<details>
<summary>❌ Bad — instanceof + cast manual</summary>
<br>

```java
private String describePayment(PaymentResult result) {
    if (result instanceof PaymentSuccess) {
        final var success = (PaymentSuccess) result;
        return "Paid: " + success.amount();
    } else if (result instanceof PaymentFailure) {
        final var failure = (PaymentFailure) result;
        return "Failed: " + failure.reason();
    }
    return "Unknown";
}
```

</details>

<br>

<details>
<summary>✅ Good — pattern matching com desestruturação; sealed garante exaustividade</summary>
<br>

```java
// sealed interface PaymentResult permits PaymentSuccess, PaymentFailure, PaymentPending {}

private String describePayment(PaymentResult result) {
    final var description = switch (result) {
        case PaymentSuccess s  -> "Paid: " + s.amount();
        case PaymentFailure f  -> "Failed: " + f.reason();
        case PaymentPending p  -> "Pending: " + p.transactionId();
    };
    return description;
}
```

</details>

---

_As ferramentas acima resolvem **decisão**: qual caminho seguir. As abaixo resolvem
**iteração**: quantas vezes percorrer._

## Circuit break

Antes de escrever um loop, verifique se `findFirst`, `anyMatch` ou `allMatch` já resolve.
Esses métodos param no primeiro match — sem percorrer o resto.

<details>
<summary>❌ Bad — loop manual com flag percorre tudo</summary>
<br>

```java
private Product findFirstExpiredProduct(List<Product> products) {
    Product expiredProduct = null;

    for (final var product : products) {
        if (expiredProduct == null && product.isExpired()) {
            expiredProduct = product; // continua iterando mesmo após encontrar
        }
    }

    return expiredProduct;
}
```

</details>

<br>

<details>
<summary>✅ Good — stream para no primeiro match</summary>
<br>

```java
// para no primeiro match
final var expiredProduct = products.stream().filter(Product::isExpired).findFirst();

// para no primeiro true
final var hasExpiredProduct = products.stream().anyMatch(Product::isExpired);

// para no primeiro false
final var allProductsActive = products.stream().allMatch(Product::isActive);
```

</details>

## for-each

Para efeitos colaterais sobre cada item de uma coleção, `for-each` é legível e suficiente:
sem índice, sem variável de controle.

<details>
<summary>❌ Bad — for indexado quando o índice nunca é usado</summary>
<br>

```java
for (int i = 0; i < orders.size(); i++) {
    notifyCustomer(orders.get(i));
}
```

</details>

<br>

<details>
<summary>✅ Good — for-each para efeitos colaterais por item</summary>
<br>

```java
for (final var order : orders) {
    notifyCustomer(order);
}
```

</details>

> `for-each` suporta `break` e `continue`. Para transformações e buscas, prefira streams.

## while

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice ou
tamanho, `while` é a escolha natural.

<details>
<summary>❌ Bad — for simulando condição de parada por estado</summary>
<br>

```java
for (int attempt = 0; attempt < maxAttempts; attempt++) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break; // o índice não tem significado aqui
}
```

</details>

<br>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>
<br>

```java
var attempt = 0;

while (attempt < maxAttempts) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break;

    attempt++;
}
```

</details>

## do-while

Use `do-while` quando a primeira iteração deve sempre executar, independente da condição.

<details>
<summary>❌ Bad — while quando a fila deve processar ao menos um item</summary>
<br>

```java
// verifica antes de executar — se a fila já estiver vazia, nunca executa
while (!taskQueue.isEmpty()) {
    final var task = taskQueue.dequeue();
    executeTask(task);
}
```

</details>

<br>

<details>
<summary>✅ Good — do-while quando a primeira execução é garantida</summary>
<br>

```java
// drena a fila: processa pelo menos um item antes de verificar
do {
    final var task = taskQueue.dequeue();
    executeTask(task);
} while (!taskQueue.isEmpty());
```

</details>
