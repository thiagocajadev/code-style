# Tipos em Java

O Java 25 LTS traz quatro construções para desenhar o domínio com precisão. O **record** guarda dados que nascem prontos e não mudam. A **sealed class** fecha a lista de filhos de uma hierarquia. O **enum** junta um conjunto fixo de valores com o comportamento de cada um. E os **generics** deixam um mesmo contrato servir a vários tipos sem abrir mão da checagem do compilador.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **record** (registro que não muda) | tipo de dados compacto; o compilador gera o construtor, os acessores e o `equals` |
| **sealed class** (classe selada) | hierarquia fechada com `permits`; o compilador acusa erro se o `switch` esquecer um filho |
| **enum** (enumeração) | conjunto fixo de instâncias nomeadas; cada uma pode ter campos e métodos |
| **generics** (tipos genéricos) | parâmetros de tipo que dão segurança a coleções e contratos |
| **wildcard** (curinga) | `? extends T` e `? super T` ampliam ou restringem o tipo aceito |
| **pattern matching** (correspondência de padrão) | abre records e tipos dentro do `switch` ou do `instanceof` |
| **boilerplate** (código burocrático) | código repetido sem valor de domínio; o record dispensa boa parte dele |

## Records dispensam o código burocrático

O `record` é o tipo certo para um objeto de dados que não muda depois de criado. A declaração cabe em uma linha, e o compilador escreve o construtor, os acessores, o `equals`, o `hashCode` e o `toString`. Nenhum getter manual sobra para alguém escrever errado.

<details>
<summary>❌ Ruim: uma classe inteira de campos e acessores manuais</summary>

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

<details>
<summary>✅ Bom: uma linha declara os campos e o compilador escreve o resto</summary>

```java
public record UserProfile(String id, String name, String email) {}

// uso
final var profile = new UserProfile("u-1", "Alice", "alice@example.com");
profile.name(); // getter gerado
```

</details>

## Records validam no construtor compacto

O **construtor compacto** roda antes de os campos serem gravados, então ele é o lugar para rejeitar valores inválidos e normalizar o que entra. Um `Money` com valor negativo nunca chega a existir, e a moeda sempre nasce em maiúsculas.

<details>
<summary>✅ Bom: o construtor compacto valida e normaliza antes de gravar</summary>

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

## Sealed classes fecham a hierarquia

O `sealed` declara a lista exata de classes que podem implementar uma interface ou estender uma classe. Como o compilador conhece essa lista, ele consegue apontar um `switch` que deixou um caso de fora, e o programa deixa de precisar de um `default` que esconde o esquecimento.

<details>
<summary>❌ Ruim: hierarquia aberta, e o switch incompleto passa sem aviso</summary>

```java
public abstract class PaymentResult {}
public class PaymentSuccess extends PaymentResult { /* ... */ }
public class PaymentFailure extends PaymentResult { /* ... */ }

// alguém pode adicionar PaymentPending sem atualizar o switch
String message = switch (result) {
    case PaymentSuccess s -> "Settled: " + s.getAmount();
    case PaymentFailure f -> "Failed: " + f.getReason();
    default -> "Unknown"; // escapa o problema
};
```

</details>

<details>
<summary>✅ Bom: o sealed faz o compilador exigir todos os casos</summary>

```java
public sealed interface PaymentResult
    permits PaymentSuccess, PaymentFailure, PaymentPending {}

public record PaymentSuccess(BigDecimal amount) implements PaymentResult {}
public record PaymentFailure(String reason) implements PaymentResult {}
public record PaymentPending(String transactionId) implements PaymentResult {}

// compilador exige todos os cases, sem default necessário
String message = switch (result) {
    case PaymentSuccess s -> "Settled: " + s.amount();
    case PaymentFailure f -> "Failed: " + f.reason();
    case PaymentPending p -> "Pending: " + p.transactionId();
};
```

</details>

## Enums com comportamento

O enum guarda mais que uma lista de constantes: cada valor pode carregar campos e responder a métodos. Quando o texto de exibição mora dentro do próprio enum, ele fica num lugar só, e a corrente de `if` que repetia a associação em vários arquivos desaparece.

<details>
<summary>❌ Ruim: a associação de texto se repete fora do enum</summary>

```java
public enum OrderStatus { PENDING, APPROVED, REJECTED, CANCELLED }

// lógica de label duplicada em vários lugares
if (status == OrderStatus.PENDING) label = "Pending review";
else if (status == OrderStatus.APPROVED) label = "Approved";
// ...
```

</details>

<details>
<summary>✅ Bom: o enum guarda o texto e o comportamento junto de cada valor</summary>

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

## Generics deixam o contrato explícito

O parâmetro de tipo diz o que a coleção guarda, e com isso o compilador dispensa a conversão manual e recusa o valor de tipo errado antes de rodar. O **raw type** (a coleção declarada sem o parâmetro, como `List` em vez de `List<Order>`) abre mão dessa checagem e devolve um `Object` que alguém precisa converter à mão.

<details>
<summary>❌ Ruim: o raw type devolve Object e exige conversão manual</summary>

```java
public List fetchAll() { // raw type
    return repository.findAll();
}

List orders = fetchAll();
Order order = (Order) orders.get(0); // cast manual
```

</details>

<details>
<summary>✅ Bom: o tipo parametrizado dispensa a conversão</summary>

```java
public List<Order> fetchAll() {
    final var orders = repository.findAll();
    return orders;
}

final var orders = fetchAll();
final var order = orders.getFirst(); // sem cast
```

</details>

## Curingas delimitados

O **bounded wildcard** (curinga delimitado) faz o método aceitar uma coleção de qualquer subtipo, sem escrever uma versão para cada um. `List<? extends Order>` recebe tanto `List<Order>` quanto `List<PriorityOrder>`, e o contrato continua legível na assinatura.

<details>
<summary>✅ Bom: `? extends` aceita a lista de qualquer subtipo de Order</summary>

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
