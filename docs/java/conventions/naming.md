# Naming

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```java
final var r = apply(data, pedido, cb);

private Order apply(Object x, Order p, Function<Order, Order> c) {
    if (p.getCliente().isInadimplente()) return null;
    return c.apply((Order) x);
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```java
final var discountedOrder = applyDiscount(order, this::calculateDiscount);

private Order applyDiscount(Order order, UnaryOperator<Order> calculateDiscount) {
    if (order.getCustomer().isDefaulted()) return null;

    final var discountedOrder = calculateDiscount.apply(order);
    return discountedOrder;
}
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — camelCase com português fica desajeitado</summary>
<br>

```java
final var nomeDoUsuario = "Alice";
final var listaDeIds = List.of(1, 2, 3);

private Order retornaOPedido(String id) { /* ... */ }
private Address buscaEnderecoDoCliente(String id) { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```java
final var userName = "Alice";
final var idList = List.of(1, 2, 3);

private Order getOrder(String id) { /* ... */ }
private Address getCustomerAddress(String id) { /* ... */ }
```

</details>

## Mistura de idiomas

<details>
<summary>❌ Bad — português e inglês no mesmo arquivo</summary>
<br>

```java
private void notify(Order pedido) {
    log.warn("cliente inadimplente: {}", pedido.getCliente().getNome());
}

final var resultado = processOrder(pedido);
```

</details>

<br>

<details>
<summary>✅ Good — consistência de idioma</summary>
<br>

```java
private void notifyDefault(Order order) {
    log.warn("defaulted customer: {}", order.getCustomer().getName());
}

final var invoice = processOrder(order);
```

</details>

## Ordem semântica invertida

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```java
getProfileUser();       // "get profile, that's a user"
updateStatusOrder();    // status pertence ao pedido
calculateTotalInvoice();// "invoice total" é a expressão natural
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```java
getUserProfile();
updateOrderStatus();
calculateInvoiceTotal();
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage, do não dizem nada</summary>
<br>

```java
private void handle(Object data) { /* ... */ }
private Order process(Order input) { /* ... */ }

private void manage(List<Item> items) { /* ... */ }
private void doStuff(Object x) { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```java
private void validatePayment(Payment payment) { /* ... */ }
private BigDecimal calculateOrderTotal(List<Item> items) { /* ... */ }

private void notifyCustomerDefault(Order order) { /* ... */ }
private Order applySeasonalDiscount(Order order) { /* ... */ }
```

</details>

## Taxonomia de verbos

| Intenção           | Preferir                                  | Evitar             |
| ------------------ | ----------------------------------------- | ------------------ |
| Ler de storage     | `fetch`, `load`, `find`, `get`            | `retrieve`, `pull` |
| Escrever/persistir | `save`, `persist`, `create`, `insert`     | `put`, `push`      |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build` | `get`, `do`        |
| Transformar        | `map`, `transform`, `convert`, `format`   | `process`, `parse` |
| Validar            | `validate`, `check`, `assert`, `verify`   | `handle`, `test`   |
| Notificar          | `send`, `dispatch`, `notify`, `emit`      | `fire`, `trigger`  |

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de como ou onde a operação acontece.

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```java
private void callStripe(BigDecimal amount) { /* ... */ }
private User getUserFromDB(String id) { /* ... */ }

private void postToSlack(String message) { /* ... */ }
private void saveToS3(byte[] file) { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```java
private void chargeCustomer(BigDecimal amount) { /* ... */ }
private User findUser(String id) { /* ... */ }

private void notifyTeam(String message) { /* ... */ }
private void archiveDocument(byte[] file) { /* ... */ }
```

</details>

## Código como documentação

Comentários que explicam o _quê_ mentem: o código muda, o comentário fica. Um nome expressivo
substitui qualquer comentário.

<details>
<summary>❌ Bad — comentário repete o que o código já diz</summary>
<br>

```java
// verifica se o usuário pode excluir registros
if ("active".equals(user.getStatus()) && user.getRoles().contains("admin")) {
    deleteRecord(id);
}

// incrementa tentativas
attempts++;
```

</details>

<br>

<details>
<summary>✅ Good — nome expressivo torna o comentário desnecessário</summary>
<br>

```java
final var canDeleteRecord = "active".equals(user.getStatus())
    && user.getRoles().contains("admin");

if (canDeleteRecord) {
    deleteRecord(id);
}

attempts++;
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```java
final var loading = true;
final var error = false;

final var active = "active".equals(user.getStatus());
final var valid = email.contains("@");
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is, has, can, should</summary>
<br>

```java
final var isActive = "active".equals(user.getStatus());
final var hasPermission = user.getRoles().contains("admin");

final var canDelete = isActive && hasPermission;
final var shouldRetry = attempt < MAX_RETRIES;
```

</details>

## Interfaces sem prefixo `I`

Java não usa o prefixo `I` para interfaces (diferente de C#). O nome deve expressar o papel,
não o artefato.

<details>
<summary>❌ Bad — prefixo I revela o artefato, não o papel</summary>
<br>

```java
public interface IUserRepository { /* ... */ }
public interface IPaymentGateway { /* ... */ }
public class UserRepositoryImpl implements IUserRepository { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — nome expressa o papel; implementação detalha a tecnologia</summary>
<br>

```java
public interface UserRepository { /* ... */ }
public interface PaymentGateway { /* ... */ }

public class JpaUserRepository implements UserRepository { /* ... */ }
public class StripePaymentGateway implements PaymentGateway { /* ... */ }
```

</details>
