# Variables

Dúvida? Use `final`. Só omita quando precisar reatribuir. **Immutability** (imutabilidade) reduz bugs e torna o fluxo previsível.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **final** (referência fixa) | modificador que impede reatribuição da variável após inicialização |
| **var** (inferência de tipo local) | declaração `var` (Java 10+) deixa o compilador inferir o tipo da variável local |
| **immutability** (imutabilidade) | propriedade de um valor que não muda após criado; reduz bugs e facilita concorrência |
| **shadowing** (sombreamento) | variável local que oculta uma de mesmo nome em escopo externo |
| **scope** (escopo) | região do código em que a variável é visível; declarar perto do uso encurta o escopo |
| **effectively final** (efetivamente final) | variável que nunca é reatribuída, mesmo sem `final`; lambdas exigem isso |

## Mutação desnecessária

<details>
<summary>❌ Ruim: variável reatribuída sem necessidade</summary>

```java
String userName = "Alice"; // nunca reatribuído
int maxRetries = 3;        // nunca reatribuído
```

</details>

<details>
<summary>✅ Bom: final por padrão, mutável só quando necessário</summary>

```java
final var userName = "Alice";
final var maxRetries = 3;

var attempt = 0;
while (attempt < maxRetries) {
    attempt++;
}
```

</details>

## Mutação de parâmetros

Parâmetros são passados por referência para objetos. Alterar o estado de um parâmetro muda o
objeto do chamador: efeito colateral invisível e difícil de rastrear.

<details>
<summary>❌ Ruim: mutação do parâmetro recebido</summary>

```java
private void applyDiscount(Order order) {
    order.setDiscount(BigDecimal.TEN);       // altera o objeto externo
    order.setTotal(order.getTotal().subtract(BigDecimal.TEN));
}
```

</details>

<details>
<summary>✅ Bom: retorna novo estado, sem efeitos colaterais</summary>

```java
private Order applyDiscount(Order order) {
    final var discount = BigDecimal.TEN;
    final var discountedTotal = order.getTotal().subtract(discount);

    final var discountedOrder = order.withDiscount(discount).withTotal(discountedTotal);
    return discountedOrder;
}
```

</details>

## Evitar valores mágicos

Números e strings soltos no código não dizem nada. Constantes nomeadas tornam a intenção visível.

<details>
<summary>❌ Ruim: o que significa 18? e 86400000?</summary>

```java
if (user.getAge() >= 18) { /* ... */ }
if (order.getStatus() == 2) { /* ... */ }

scheduler.schedule(this::syncData, 86400000, TimeUnit.MILLISECONDS);
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;
private static final long ONE_DAY_MS = 86_400_000L;

if (user.getAge() >= MINIMUM_DRIVING_AGE) { /* ... */ }
if (order.getStatus() == ORDER_STATUS_APPROVED) { /* ... */ }

scheduler.schedule(this::syncData, ONE_DAY_MS, TimeUnit.MILLISECONDS);
```

</details>

## Records: imutabilidade estrutural

Para objetos de dados que não mudam após a criação, use `record`. O compilador gera construtor,
getters, `equals`, `hashCode` e `toString` automaticamente.

<details>
<summary>❌ Ruim: classe mutável para transportar dados</summary>

```java
public class InvoiceData {
    private String orderId;
    private String customerId;
    private BigDecimal amount;
    private String currency;

    // getters e setters manuais, equals/hashCode verbosos
}
```

</details>

<details>
<summary>✅ Bom: record elimina o boilerplate e garante imutabilidade</summary>

```java
public record InvoiceData(
    String orderId,
    String customerId,
    BigDecimal amount,
    String currency
) {}

// uso
final var invoice = new InvoiceData("ord-1", "cust-99", new BigDecimal("149.90"), "BRL");
```

</details>

## var: inferência de tipo

`var` reduz verbosidade quando o tipo é óbvio pelo lado direito da atribuição. Não use quando o
tipo inferido não é imediatamente claro.

<details>
<summary>❌ Ruim: var obscurece o tipo</summary>

```java
final var result = repository.fetch(); // qual é o tipo?
final var x = buildSomething();        // sem contexto
```

</details>

<details>
<summary>✅ Bom: var quando o tipo é óbvio; tipo explícito quando agrega clareza</summary>

```java
final var orders = orderRepository.findAll();    // List<Order>: óbvio pelo nome
final var user = new User("Alice", "alice@example.com");

final Optional<User> found = userRepository.findById(id); // tipo explícito agrega contexto
```

</details>

## Primitivos vs wrappers

Use primitivos (`int`, `long`, `boolean`) para valores locais e parâmetros de método. Use
wrappers (tipos de referência: `Integer`, `Long`, `Boolean`) apenas quando nulidade ou uso em
coleções genéricas for necessário.

<details>
<summary>❌ Ruim: wrapper com autoboxing (conversão automática de primitivo para referência) desnecessário</summary>

```java
Integer count = 0;           // autoboxing desnecessário
Boolean isActive = true;     // sem necessidade de nulidade
Long totalMs = 86_400_000L;  // valor fixo, nunca null
```

</details>

<details>
<summary>✅ Bom: primitivo por padrão, wrapper só quando necessário</summary>

```java
int count = 0;
boolean isActive = true;
long totalMs = 86_400_000L;

// wrapper necessário: parâmetro de tipo genérico
final Map<String, Integer> scoreByUser = new HashMap<>();
```

</details>
