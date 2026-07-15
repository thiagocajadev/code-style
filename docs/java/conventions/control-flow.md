# Controle de fluxo em Java

> Escopo: Java 25 LTS.

A construção certa depende de três respostas: quantas condições o método precisa avaliar, se elas escolhem um valor ou disparam uma ação, e se o método pode terminar antes de chegar ao fim. Duas ferramentas resolvem a maior parte dos casos. A **guard clause** (cláusula de proteção) trata o caso inválido no topo e devolve o método plano. A **switch expression** (expressão de seleção) troca uma corrente longa de `if/else` por uma lista de casos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `if` no topo do método que sai cedo no caso inválido e evita aninhar o resto |
| **early return** (retorno antecipado) | sair do método assim que o resultado for conhecido, sem passar por um `else` |
| **ternary** (operador ternário) | `cond ? a : b`, uma condição curta que escolhe entre dois valores |
| **switch expression** (expressão de seleção) | `switch` que devolve um valor; aceita a seta `->` e pattern matching no Java moderno |
| **pattern matching** (correspondência de padrão) | abre o tipo dentro do `switch` ou do `instanceof` sem escrever a conversão à mão |
| **sealed class** (classe selada) | hierarquia fechada: o compilador conhece todos os filhos e acusa erro se o `switch` esquecer um |

<a id="if-and-else"></a>

## If e else

Para dois caminhos, o `if/else` resolve. Quando o primeiro bloco termina em `return`, o `else` sobra: o método já saiu, e as linhas seguintes só rodam no outro caso.

<details>
<summary>❌ Ruim: o else vem depois de um return que já encerrou o método</summary>

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

<details>
<summary>✅ Bom: o retorno antecipado dispensa o else</summary>

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

O ternário escolhe entre dois valores numa linha, para uma atribuição simples. Encadear vários vira um quebra-cabeça: o leitor precisa seguir cada `?` e cada `:` para achar qual ramo responde. Com três alternativas ou mais, passe para guard clauses ou switch expression.

<details>
<summary>❌ Ruim: cinco condições encadeadas num único ternário</summary>

```java
final var label = score >= 90 ? "A"
    : score >= 80 ? "B"
    : score >= 70 ? "C"
    : score >= 60 ? "D"
    : "F";
```

</details>

<details>
<summary>✅ Bom: ternário para dois valores e guard clauses para três ou mais</summary>

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

<a id="nested-conditionals"></a>

## Guard clauses no lugar do aninhamento em cascata

Cada `if` aninhado empurra a lógica principal um nível mais para dentro, e o caminho principal acaba no fundo de quatro chaves. A guard clause vira a ordem: cada condição inválida sai no topo com um `return`, e o caminho principal fica plano, no nível de fora do método.

<details>
<summary>❌ Ruim: o caminho principal fica no fundo de quatro if aninhados</summary>

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

<details>
<summary>✅ Bom: cada caso inválido sai no topo e o caminho principal fica plano</summary>

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

## Switch expression para escolher um valor

Quando vários `if/else` devolvem um valor por chave, a lista de condições é um catálogo disfarçado. A switch expression com seta (`->`) escreve esse catálogo direto: uma linha por caso, sem `break` e sem o **fall-through** (a execução escorregar de um caso para o seguinte quando falta o `break`), que a forma tradicional deixa acontecer por engano.

<details>
<summary>❌ Ruim: switch tradicional, com variável de apoio e um break por caso</summary>

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

<details>
<summary>✅ Bom: uma linha por caso, sem break e sem variável de apoio</summary>

```java
private String getStatusLabel(OrderStatus status) {
    final var label = switch (status) {
        case PENDING -> "Pending review";
        case APPROVED -> "Approved";
        case REJECTED -> "Rejected";
        case CANCELLED -> "Cancelled";
    };

    return label;
}
```

</details>

## Switch para disparar ações

Quando cada caso executa um conjunto de ações em vez de devolver um valor, o `switch` com bloco `{}` separa os casos melhor que uma corrente de `if/else`. Cada ramo fica visível dentro das próprias chaves, e a chave que decide aparece uma vez no topo.

<details>
<summary>❌ Ruim: corrente de if/else para escolher qual ação disparar</summary>

```java
private void processPaymentEvent(PaymentEvent event) {
    if (event.type() == PaymentEventType.SUCCESS) {
        sendReceipt(event.orderId());
        updateOrderStatus(event.orderId(), "settled");
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

<details>
<summary>✅ Bom: o switch separa cada conjunto de ações no próprio bloco</summary>

```java
private void processPaymentEvent(PaymentEvent event) {
    switch (event.type()) {
        case SUCCESS -> {
            sendReceipt(event.orderId());
            updateOrderStatus(event.orderId(), "settled");
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

## Pattern matching por tipo

Do Java 21 em diante, o `switch` reconhece o tipo do valor e abre o objeto na mesma linha, sem a conversão manual que o `instanceof` clássico exige. Quando o tipo é uma sealed class, o compilador conhece a lista fechada de filhos e acusa erro se o `switch` deixar um de fora, então o `default` deixa de ser necessário.

<details>
<summary>❌ Ruim: instanceof seguido da conversão escrita à mão</summary>

```java
private String describePayment(PaymentResult result) {
    if (result instanceof PaymentSuccess) {
        final var success = (PaymentSuccess) result;
        return "Settled: " + success.amount();
    } else if (result instanceof PaymentFailure) {
        final var failure = (PaymentFailure) result;
        return "Failed: " + failure.reason();
    }
    return "Unknown";
}
```

</details>

<details>
<summary>✅ Bom: o switch abre o tipo e a sealed class cobre todos os casos</summary>

```java
// sealed interface PaymentResult permits PaymentSuccess, PaymentFailure, PaymentPending {}

private String describePayment(PaymentResult result) {
    final var description = switch (result) {
        case PaymentSuccess s -> "Settled: " + s.amount();
        case PaymentFailure f -> "Failed: " + f.reason();
        case PaymentPending p -> "Pending: " + p.transactionId();
    };

    return description;
}
```

</details>

---

_As construções acima escolhem **qual caminho** o método segue. As de baixo controlam **quantas vezes** ele percorre uma coleção._

## Parar na primeira ocorrência

Antes de escrever um laço à mão, veja se `findFirst`, `anyMatch` ou `allMatch` já resolve. Esses métodos param assim que encontram o resultado e deixam o resto da lista sem visitar, então o laço não precisa de uma flag para lembrar que já achou.

<details>
<summary>❌ Ruim: laço com flag continua rodando depois de encontrar</summary>

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

<details>
<summary>✅ Bom: o stream para na primeira ocorrência</summary>

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

Para executar uma ação em cada item de uma coleção, o `for-each` basta e se lê direto: nenhum índice, nenhuma variável de controle para manter. O `for` com índice só se justifica quando o índice em si entra na lógica.

<details>
<summary>❌ Ruim: for com índice que nunca é lido</summary>

```java
for (int i = 0; i < orders.size(); i++) {
    notifyCustomer(orders.get(i));
}
```

</details>

<details>
<summary>✅ Bom: for-each executa a ação em cada item</summary>

```java
for (final var order : orders) {
    notifyCustomer(order);
}
```

</details>

> `for-each` suporta `break` e `continue`. Para transformações e buscas, prefira streams.

## while

O `while` serve quando não existe uma coleção para percorrer e a parada depende de uma condição de estado, como uma conexão que ficou pronta. Escrever isso num `for` com índice cria um contador que ninguém usa e sugere uma contagem que não existe.

<details>
<summary>❌ Ruim: o for finge contar, mas a parada é por estado</summary>

```java
for (int attempt = 0; attempt < maxAttempts; attempt++) {
    final var connection = connectToDatabase();
    if (connection.isReady()) break; // o índice não tem significado aqui
}
```

</details>

<details>
<summary>✅ Bom: o while para quando a condição de estado muda</summary>

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

O `do-while` avalia a condição no fim, então a primeira volta roda sempre. Use quando o corpo precisa executar ao menos uma vez antes da primeira checagem, como ao drenar uma fila que você sabe ter pelo menos um item.

<details>
<summary>❌ Ruim: o while checa antes e pode nunca executar o corpo</summary>

```java
// verifica antes de executar: se a fila já estiver vazia, nunca executa
while (!taskQueue.isEmpty()) {
    final var task = taskQueue.dequeue();
    executeTask(task);
}
```

</details>

<details>
<summary>✅ Bom: o do-while garante a primeira execução</summary>

```java
// drena a fila: processa pelo menos um item antes de verificar
do {
    final var task = taskQueue.dequeue();
    executeTask(task);
} while (!taskQueue.isEmpty());
```

</details>
