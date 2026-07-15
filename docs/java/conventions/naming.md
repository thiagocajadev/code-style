# Nomes em Java

Um nome bem escolhido dispensa o comentário. Quando o identificador já diz o que o valor representa e o que o método faz, o leitor entende a linha sem procurar explicação em volta. Java escreve identificadores em **camelCase** (primeira palavra minúscula, as seguintes com inicial maiúscula) e tipos em **PascalCase** (todas as palavras com inicial maiúscula).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **camelCase** (camelo) | convenção para variáveis, métodos e parâmetros: `userName`, `findById` |
| **PascalCase** (pascal) | convenção para classes, records, enums e interfaces: `OrderService`, `UserRole` |
| **SCREAMING_SNAKE_CASE** (caixa-alta com underline) | convenção para constantes `static final`: `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **intention-revealing name** (nome que revela a intenção) | nome que descreve o propósito do valor: `expirationDays` em vez de `intD` |
| **domain language** (linguagem do domínio) | termos do negócio na assinatura: `Customer`, `Invoice`, `Order` |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `should` deixa o booleano óbvio: `isActive`, `hasPermission` |

<a id="meaningless-identifiers"></a>

## Identificadores sem significado

Uma letra solta obriga o leitor a reconstruir o significado a partir das linhas ao redor. O nome completo entrega o significado na hora.

<details>
<summary>❌ Ruim: letras soltas escondem o que o método faz</summary>

```java
final var r = apply(data, pedido, cb);

private Order apply(Object x, Order p, Function<Order, Order> c) {
    if (p.getCliente().isInadimplente()) return null;
    return c.apply((Order) x);
}
```

</details>

<details>
<summary>✅ Bom: o nome do parâmetro já diz o que ele calcula</summary>

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

O código do projeto é escrito em inglês, e o português no identificador quebra a leitura no meio da frase. As palavras de ligação ("do", "de", "da") também alongam o nome sem acrescentar significado.

<details>
<summary>❌ Ruim: o português alonga o nome e mistura dois idiomas na mesma linha</summary>

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

Em inglês o nome segue a ordem natural da fala: ação, depois objeto, depois contexto. `getUserProfile` se lê como uma frase; `getProfileUser` obriga o leitor a remontar a ordem.

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

`handle`, `process`, `manage` e `do` cabem em qualquer método, e por isso descrevem nenhum. Escolha o verbo que diz a operação exata.

<details>
<summary>❌ Ruim: verbos que cabem em qualquer método</summary>

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

## Nome que fala a linguagem do negócio

O nome do método descreve a intenção de negócio. O nome do fornecedor, do banco e do serviço de armazenamento ficam de fora, porque eles trocam com o tempo e o significado da operação continua o mesmo. `chargeCustomer` sobrevive à troca da Stripe pelo Adyen; `callStripe` vira mentira no dia da migração.

<details>
<summary>❌ Ruim: o nome expõe o fornecedor e a tecnologia</summary>

```java
private void callStripe(BigDecimal amount) { /* ... */ }
private User getUserFromDB(String id) { /* ... */ }

private void postToSlack(String message) { /* ... */ }
private void saveToS3(byte[] file) { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: o nome sobrevive à troca do fornecedor</summary>

```java
private void chargeCustomer(BigDecimal amount) { /* ... */ }
private User findUser(String id) { /* ... */ }

private void notifyTeam(String message) { /* ... */ }
private void archiveDocument(byte[] file) { /* ... */ }
```

</details>

<a id="code-as-documentation"></a>

## Código como documentação

Um comentário que explica **o quê** repete a linha logo abaixo dele. Quando alguém altera a linha e esquece o comentário, o texto passa a descrever um comportamento que não existe mais. Extrair a condição para uma variável com nome bom resolve os dois problemas de uma vez: a intenção fica no código, e ela acompanha qualquer alteração.

<details>
<summary>❌ Ruim: o comentário repete o que a linha abaixo já diz</summary>

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
<summary>✅ Bom: a condição vira uma variável com nome que explica a regra</summary>

```java
final var canDeleteRecord = "active".equals(user.getStatus())
    && user.getRoles().contains("admin");

if (canDeleteRecord) {
    deleteRecord(id);
}

attempts++;
```

</details>

## Nomes de booleano

O prefixo `is`, `has`, `can` ou `should` avisa que o valor responde sim ou não. Sem ele, `error` pode ser um booleano, uma mensagem ou uma exceção, e o leitor precisa procurar a declaração para saber.

<details>
<summary>❌ Ruim: sem prefixo, o tipo do valor fica ambíguo</summary>

```java
final var loading = true;
final var error = false;

final var active = "active".equals(user.getStatus());
final var valid = email.contains("@");
```

</details>

<details>
<summary>✅ Bom: o prefixo anuncia a resposta sim ou não</summary>

```java
final var isActive = "active".equals(user.getStatus());
final var hasPermission = user.getRoles().contains("admin");

final var canDelete = isActive && hasPermission;
final var shouldRetry = attempt < MAX_RETRIES;
```

</details>

## Interfaces sem prefixo `I`

Java escreve a interface com o nome do papel que ela cumpre: `UserRepository`, `PaymentGateway`. O prefixo `I`, comum em C#, gasta um caractere para repetir o que a declaração já diz. A implementação é que ganha o qualificador da tecnologia, e aí o nome vira informação útil: `JpaUserRepository` avisa que a persistência passa por JPA.

<details>
<summary>❌ Ruim: o prefixo repete a declaração e o sufixo Impl não informa nada</summary>

```java
public interface IUserRepository { /* ... */ }
public interface IPaymentGateway { /* ... */ }
public class UserRepositoryImpl implements IUserRepository { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: a interface nomeia o papel e a implementação nomeia a tecnologia</summary>

```java
public interface UserRepository { /* ... */ }
public interface PaymentGateway { /* ... */ }

public class JpaUserRepository implements UserRepository { /* ... */ }
public class StripePaymentGateway implements PaymentGateway { /* ... */ }
```

</details>
