# Types

Java moderno (25 LTS) oferece ferramentas para modelar domínio com precisão:
records para dados imutáveis, sealed classes para hierarquias fechadas, enums
com comportamento, e generics para contratos reutilizáveis.

## Records — dados sem boilerplate (código burocrático)

`record` é o tipo certo para objetos de dados imutáveis. Compacto, seguro e sem
getter/setter manual.

<details>
<summary>❌ Bad — classe de dados verbosa</summary>
<br>

```java
public class UserProfile {
    private final String id;
    private final String name;
    private final String email;

    public UserProfile(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    // equals, hashCode e toString manuais...
}
```

</details>

<br>

<details>
<summary>✅ Good — record elimina o boilerplate</summary>
<br>

```java
public record UserProfile(String id, String name, String email) {}

// uso
final var profile = new UserProfile("u-1", "Alice", "alice@example.com");
profile.name(); // getter gerado
```

</details>

## Records com validação no construtor compacto

<details>
<summary>✅ Good — construtor compacto valida invariantes</summary>
<br>

```java
public record Money(BigDecimal amount, String currency) {
    public Money {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative.");
        }
        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException("Currency is required.");
        }
        currency = currency.toUpperCase();
    }
}
```

</details>

## Sealed classes — hierarquias fechadas

`sealed` restringe quais classes podem implementar uma interface ou estender uma
classe. O compilador garante que todos os casos são cobertos no switch.

<details>
<summary>❌ Bad — hierarquia aberta, switch incompleto passa em silêncio</summary>
<br>

```java
public abstract class PaymentResult {}
public class PaymentSuccess extends PaymentResult { /* ... */ }
public class PaymentFailure extends PaymentResult { /* ... */ }

// alguém pode adicionar PaymentPending sem atualizar o switch
String message = switch (result) {
    case PaymentSuccess s -> "Paid: " + s.getAmount();
    case PaymentFailure f -> "Failed: " + f.getReason();
    default -> "Unknown"; // escapa o problema
};
```

</details>

<br>

<details>
<summary>✅ Good — sealed garante cobertura total em tempo de compilação</summary>
<br>

```java
public sealed interface PaymentResult
    permits PaymentSuccess, PaymentFailure, PaymentPending {}

public record PaymentSuccess(BigDecimal amount) implements PaymentResult {}
public record PaymentFailure(String reason) implements PaymentResult {}
public record PaymentPending(String transactionId) implements PaymentResult {}

// compilador exige todos os cases — sem default necessário
String message = switch (result) {
    case PaymentSuccess s  -> "Paid: " + s.amount();
    case PaymentFailure f  -> "Failed: " + f.reason();
    case PaymentPending p  -> "Pending: " + p.transactionId();
};
```

</details>

## Enums com comportamento

Enums não são só constantes. Podem carregar dados e implementar métodos.

<details>
<summary>❌ Bad — lógica espalhada fora do enum</summary>
<br>

```java
public enum OrderStatus { PENDING, APPROVED, REJECTED, CANCELLED }

// lógica de label duplicada em vários lugares
if (status == OrderStatus.PENDING) label = "Pending review";
else if (status == OrderStatus.APPROVED) label = "Approved";
// ...
```

</details>

<br>

<details>
<summary>✅ Good — enum centraliza os dados e o comportamento</summary>
<br>

```java
public enum OrderStatus {
    PENDING("Pending review"),
    APPROVED("Approved"),
    REJECTED("Rejected"),
    CANCELLED("Cancelled");

    private final String label;

    OrderStatus(String label) { this.label = label; }

    public String label() { return label; }
}

// uso
final var label = order.getStatus().label();
```

</details>

## Generics — contratos reutilizáveis

Generics eliminam casts e tornam os contratos explícitos.

<details>
<summary>❌ Bad — raw type (tipo sem parâmetro genérico) perde a segurança do compilador</summary>
<br>

```java
public List fetchAll() { // raw type
    return repository.findAll();
}

List orders = fetchAll();
Order order = (Order) orders.get(0); // cast manual
```

</details>

<br>

<details>
<summary>✅ Good — tipo parametrizado torna o contrato explícito</summary>
<br>

```java
public List<Order> fetchAll() {
    final var orders = repository.findAll();
    return orders;
}

final var orders = fetchAll();
final var order = orders.getFirst(); // sem cast
```

</details>

## Bounded wildcards (curingas delimitados)

Use bounded wildcards para aceitar coleções de subtipos sem perder a
legibilidade do contrato.

<details>
<summary>✅ Good — covariance (covariância: aceitar tipos mais específicos) com `? extends`</summary>
<br>

```java
// aceita List<Order>, List<PriorityOrder>, List<SampleOrder>
public BigDecimal calculateTotal(List<? extends Order> orders) {
    final var total = orders.stream()
        .map(Order::getTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return total;
}
```

</details>
