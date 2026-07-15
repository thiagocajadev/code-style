# Segurança contra null em Java

> Escopo: Java 25 LTS.

Um `null` em Java diz que o valor está ausente, mas não diz o motivo da ausência, e o tipo do método não avisa que ela pode acontecer. O **Optional** (tipo que embrulha um valor que pode não existir) coloca a ausência na assinatura do método, então quem chama vê que precisa tratá-la e o compilador ajuda a não esquecer.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Optional** (valor que pode não existir) | tipo que mostra na assinatura se o valor está presente ou ausente |
| **NullPointerException** (erro de referência nula) | erro lançado ao acessar um membro de uma referência que vale `null` |
| **null check** (verificação de nulo) | comparação explícita com `null` antes de usar a referência |
| **@Nullable** (anotação de valor que pode ser nulo) | marca um parâmetro ou retorno que aceita `null` |
| **@NonNull** (anotação de valor que nunca é nulo) | marca um parâmetro ou retorno que nunca vale `null` |
| **Objects.requireNonNull** (rejeição imediata de nulo) | método que lança `NullPointerException` na hora se o valor for `null` |

## null direto no retorno

Um método que devolve `null` não avisa na assinatura que a ausência é possível, então quem chama acessa o resultado direto e descobre o problema só quando o `NullPointerException` estoura em produção. Devolver `Optional<User>` põe a ausência no tipo, e o chamador precisa abrir o `Optional` antes de chegar ao valor.

<details>
<summary>❌ Ruim: o null não aparece no tipo, e o chamador esquece de verificar</summary>

```java
public User findUser(String id) {
    return userRepository.findById(id); // pode retornar null
}

// chamador esquece de verificar
final var user = userService.findUser("u-1");
final var email = user.getEmail(); // NullPointerException em runtime
```

</details>

<details>
<summary>✅ Bom: o Optional põe a ausência no tipo do retorno</summary>

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

## orElseThrow quando a ausência é um erro

Quando o valor ausente significa um erro de negócio, como um recurso obrigatório que não existe, o `orElseThrow` já abre o `Optional` e lança a exceção certa numa linha. Checar o `isEmpty` à mão e chamar `get` depois gasta quatro linhas para o mesmo efeito.

<details>
<summary>❌ Ruim: checa isEmpty e chama get em quatro linhas</summary>

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

<details>
<summary>✅ Bom: orElseThrow abre o Optional e lança em uma linha</summary>

```java
public User getUser(String id) {
    final var user = userRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("User " + id + " not found."));

    return user;
}
```

</details>

## Objects.requireNonNullElse para o valor padrão

Quando um parâmetro pode vir `null` e existe um valor padrão razoável, o `Objects.requireNonNullElse` diz na própria chamada que a segunda opção é o padrão. O ternário `name != null ? name : "Anonymous"` faz o mesmo, mas obriga o leitor a montar a condição de cabeça para chegar à mesma conclusão.

<details>
<summary>❌ Ruim: o ternário esconde a intenção de valor padrão</summary>

```java
public String getDisplayName(String name) {
    return name != null ? name : "Anonymous";
}
```

</details>

<details>
<summary>✅ Bom: o nome do método já diz que a segunda opção é o padrão</summary>

```java
public String getDisplayName(String name) {
    final var displayName = Objects.requireNonNullElse(name, "Anonymous");
    return displayName;
}
```

</details>

## Guard clause para null de entrada

Quando o método não deve receber `null` de jeito nenhum, rejeite o valor no topo com `Objects.requireNonNull`. Deixar o `null` seguir adiante adia o `NullPointerException` para uma linha lá dentro, e a mensagem aponta para o método interno, longe da causa real. A guard clause falha na primeira linha e diz qual argumento veio errado.

<details>
<summary>❌ Ruim: o null segue adiante e estoura numa linha interna</summary>

```java
public Invoice processOrder(Order order) {
    final var discount = applyDiscount(order); // NPE aqui se order for null
    return buildInvoice(discount);
}
```

</details>

<details>
<summary>✅ Bom: a guard clause falha na primeira linha e nomeia o argumento</summary>

```java
public Invoice processOrder(Order order) {
    Objects.requireNonNull(order, "Order is required.");

    final var discountedOrder = applyDiscount(order);
    final var invoice = buildInvoice(discountedOrder);
    return invoice;
}
```

</details>

## Optional serve para o retorno, não para tudo

O `Optional` foi desenhado para o **retorno de método**. Como parâmetro, ele obriga o chamador a embrulhar o valor antes de passar. Como campo de classe, ele não sobrevive à serialização e pesa em cada instância. Dentro de uma coleção, ele cria duas formas de ausência, o `Optional.empty` e a chave que não existe. Nesses três lugares, use `null` com verificação ou um `Optional` só na hora de devolver.

<details>
<summary>❌ Ruim: Optional como parâmetro, campo e item de coleção</summary>

```java
public void notify(Optional<User> user) { /* ... */ } // parâmetro

public class Order {
    private Optional<String> notes; // campo de instância
}

final var users = List.of(Optional.of(user1), Optional.empty()); // em coleção
```

</details>

<details>
<summary>✅ Bom: Optional só no retorno, null com verificação no resto</summary>

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
