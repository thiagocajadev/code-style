# Null Safety

> Escopo: Java 25 LTS.

`null` em Java é a ausência de valor — mas não diz _por que_ o valor está ausente. `Optional<T>`
torna a ausência explícita no contrato do método e força o chamador a lidar com ela.

## null direto no retorno

<details>
<summary>❌ Bad — null silencioso: o chamador pode esquecer de verificar</summary>
<br>

```java
public User findUser(String id) {
    return userRepository.findById(id); // pode retornar null
}

// chamador esquece de verificar
final var user = userService.findUser("u-1");
final var email = user.getEmail(); // NullPointerException em runtime
```

</details>

<br>

<details>
<summary>✅ Good — Optional torna a ausência explícita no contrato</summary>
<br>

```java
public Optional<User> findUser(String id) {
    final var user = userRepository.findById(id);
    return Optional.ofNullable(user);
}

// chamador é forçado a lidar com ausência
final var email = userService.findUser("u-1")
    .map(User::getEmail)
    .orElse("no-email@example.com");
```

</details>

## orElseThrow — ausência como exceção

Quando a ausência é um erro de negócio (recurso obrigatório não encontrado), use `orElseThrow`
em vez de verificar o `Optional` manualmente.

<details>
<summary>❌ Bad — verificação manual verbosa</summary>
<br>

```java
public User getUser(String id) {
    final var optional = userRepository.findById(id);
    if (optional.isEmpty()) {
        throw new NotFoundException("User " + id + " not found.");
    }
    return optional.get();
}
```

</details>

<br>

<details>
<summary>✅ Good — orElseThrow expressa a intenção diretamente</summary>
<br>

```java
public User getUser(String id) {
    final var user = userRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("User " + id + " not found."));
    return user;
}
```

</details>

## Objects.requireNonNullElse — valor padrão

Para parâmetros que podem ser null mas têm um padrão razoável, `Objects.requireNonNullElse`
é mais expressivo que o operador ternário.

<details>
<summary>❌ Bad — ternário com verificação de null</summary>
<br>

```java
public String getDisplayName(String name) {
    return name != null ? name : "Anonymous";
}
```

</details>

<br>

<details>
<summary>✅ Good — semântica declarativa</summary>
<br>

```java
public String getDisplayName(String name) {
    final var displayName = Objects.requireNonNullElse(name, "Anonymous");
    return displayName;
}
```

</details>

## Guard clauses para null

Quando null é uma pré-condição inválida (o método não deve receber null), lance exceção no
topo — não deixe o null propagar.

<details>
<summary>❌ Bad — null propaga para NullPointerException interno</summary>
<br>

```java
public Invoice processOrder(Order order) {
    final var discount = applyDiscount(order); // NPE aqui se order for null
    return buildInvoice(discount);
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clause no topo, falha rápida e mensagem clara</summary>
<br>

```java
public Invoice processOrder(Order order) {
    Objects.requireNonNull(order, "Order is required.");

    final var discountedOrder = applyDiscount(order);
    final var invoice = buildInvoice(discountedOrder);
    return invoice;
}
```

</details>

## Optional não é container universal

`Optional` foi projetado para **retorno de método**. Não use como parâmetro, campo de classe ou
em coleções.

<details>
<summary>❌ Bad — Optional em lugares errados</summary>
<br>

```java
public void notify(Optional<User> user) { /* ... */ } // parâmetro

public class Order {
    private Optional<String> notes; // campo de instância
}

final var users = List.of(Optional.of(user1), Optional.empty()); // em coleção
```

</details>

<br>

<details>
<summary>✅ Good — Optional apenas no retorno de método</summary>
<br>

```java
public Optional<User> findUser(String id) { /* ... */ }

public class Order {
    private String notes; // null quando ausente, verificar com Objects.requireNonNullElse
}

public void notify(User user) {
    Objects.requireNonNull(user, "User is required."); // guard clause no receptor
    /* ... */
}
```

</details>
