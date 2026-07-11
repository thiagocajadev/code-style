# Naming

Nomes bons tornam comentários desnecessários. Quando o nome carrega a intenção, o comentário deixa de fazer falta. Use **camelCase** (camelo) para identificadores e **PascalCase** (pascal) para tipos.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **camelCase** (camelo) | convenção para variáveis, métodos e parâmetros: `userName`, `findById` |
| **PascalCase** (pascal) | convenção para classes, records, enums e interfaces: `OrderService`, `UserRole` |
| **SCREAMING_SNAKE_CASE** (caixa-alta com underline) | convenção para constantes `static final`: `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **intention-revealing name** (nome que revela intenção) | nome que descreve o propósito, não o tipo: `expirationDays`, não `intD` |
| **domain language** (linguagem do domínio) | termos do negócio na assinatura: `Customer`, `Invoice`, não `Obj1`, `Data` |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `should` deixa booleanos óbvios: `isActive`, `hasPermission` |

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```java
final var r = apply(data, pedido, cb);

private Order apply(Object x, Order p, Function<Order, Order> c) {
    if (p.getCliente().isInadimplente()) return null;
    return c.apply((Order) x);
}
```

</details>

<details>
<summary>✅ Bom</summary>

```java
final var discountedOrder = applyDiscount(order, this::calculateDiscount);

private Order applyDiscount(Order order, UnaryOperator<Order> calculateDiscount) {
    if (order.getCustomer().isDefaulted()) return null;

    final var discountedOrder = calculateDiscount.apply(order);
    return discountedOrder;
}
```

</details>

<a id="portuguese-names"></a>

## Nomes em português

<details>
<summary>❌ Ruim: camelCase com português fica desajeitado</summary>

```java
final var nomeDoUsuario = "Alice";
final var listaDeIds = List.of(1, 2, 3);

private Order retornaOPedido(String id) { /* ... */ }
private Address buscaEnderecoDoCliente(String id) { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: inglês, curto, direto, universal</summary>

```java
final var userName = "Alice";
final var idList = List.of(1, 2, 3);

private Order getOrder(String id) { /* ... */ }
private Address getCustomerAddress(String id) { /* ... */ }
```

</details>

## Mistura de idiomas

<details>
<summary>❌ Ruim: português e inglês no mesmo arquivo</summary>

```java
private void notify(Order pedido) {
    log.warn("cliente inadimplente: {}", pedido.getCliente().getNome());
}

final var resultado = processOrder(pedido);
```

</details>

<details>
<summary>✅ Bom: consistência de idioma</summary>

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
<summary>❌ Ruim: ordem invertida</summary>

```java
getProfileUser();       // "get profile, that's a user"
updateStatusOrder();    // status pertence ao pedido
calculateTotalInvoice();// "invoice total" é a expressão natural
```

</details>

<details>
<summary>✅ Bom: ordem natural</summary>

```java
getUserProfile();
updateOrderStatus();
calculateInvoiceTotal();
```

</details>

## Verbos genéricos

<details>
<summary>❌ Ruim: handle, process, manage, do não dizem nada</summary>

```java
private void handle(Object data) { /* ... */ }
private Order process(Order input) { /* ... */ }

private void manage(List<Item> items) { /* ... */ }
private void doStuff(Object x) { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: verbo de intenção</summary>

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
<summary>❌ Ruim: nome revela infraestrutura, não domínio</summary>

```java
private void callStripe(BigDecimal amount) { /* ... */ }
private User getUserFromDB(String id) { /* ... */ }

private void postToSlack(String message) { /* ... */ }
private void saveToS3(byte[] file) { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```java
private void chargeCustomer(BigDecimal amount) { /* ... */ }
private User findUser(String id) { /* ... */ }

private void notifyTeam(String message) { /* ... */ }
private void archiveDocument(byte[] file) { /* ... */ }
```

</details>

<a id="code-as-documentation"></a>

## Código como documentação

Comentários que explicam o _quê_ mentem: o código muda, o comentário fica. Um nome expressivo
substitui qualquer comentário.

<details>
<summary>❌ Ruim: comentário repete o que o código já diz</summary>

```java
// verifica se o usuário pode excluir registros
if ("active".equals(user.getStatus()) && user.getRoles().contains("admin")) {
    deleteRecord(id);
}

// incrementa tentativas
attempts++;
```

</details>

<details>
<summary>✅ Bom: nome expressivo torna o comentário desnecessário</summary>

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
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```java
final var loading = true;
final var error = false;

final var active = "active".equals(user.getStatus());
final var valid = email.contains("@");
```

</details>

<details>
<summary>✅ Bom: prefixos is, has, can, should</summary>

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
<summary>❌ Ruim: prefixo I revela o artefato, não o papel</summary>

```java
public interface IUserRepository { /* ... */ }
public interface IPaymentGateway { /* ... */ }
public class UserRepositoryImpl implements IUserRepository { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: nome expressa o papel; implementação detalha a tecnologia</summary>

```java
public interface UserRepository { /* ... */ }
public interface PaymentGateway { /* ... */ }

public class JpaUserRepository implements UserRepository { /* ... */ }
public class StripePaymentGateway implements PaymentGateway { /* ... */ }
```

</details>
