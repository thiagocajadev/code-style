# Error Handling

> Escopo: Java 25 LTS. Idiomas específicos deste ecossistema.

Erros bem estruturados separam o que é **problema de negócio** do que é **falha técnica**.
`try/catch` existe para capturar, nunca para esconder.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **checked exception** (exceção verificada) | exceção que o compilador obriga a declarar ou capturar; ex.: `IOException` |
| **unchecked exception** (exceção não verificada) | subclasse de `RuntimeException`; não obrigada a declarar; preferida em código moderno |
| **try-with-resources** (bloco de recursos gerenciados) | bloco que fecha recursos `AutoCloseable` automaticamente ao sair, com ou sem exceção |
| **AutoCloseable** | interface que marca um recurso fechável automaticamente pelo `try-with-resources` |
| **stack trace** (rastreamento de pilha) | sequência de chamadas que levou à exceção |

## Múltiplos tipos de retorno

<details>
<summary>❌ Bad — null, Optional vazio e objeto na mesma função com contrato inconsistente</summary>
<br>

```java
public Order processOrder(String orderId) {
    if (orderId == null) return null;
    if (orderId.isBlank()) return null;

    final var order = orderRepository.findById(orderId).orElse(null);
    if (order == null) return null;

    // quem chama não sabe o que esperar
    return order;
}
```

</details>

<br>

<details>
<summary>✅ Good — contrato consistente: lança exceção tipada em caso de falha</summary>
<br>

```java
public Order processOrder(String orderId) {
    if (orderId == null || orderId.isBlank()) {
        throw new ValidationException("Order ID is required.");
    }

    final var order = orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order " + orderId + " not found."));

    final var processedOrder = applyProcessing(order);
    return processedOrder;
}
```

</details>

## BaseException — abstração centralizada

<details>
<summary>❌ Bad — RuntimeException genérica, sem tipo, sem contrato</summary>
<br>

```java
public User findUser(String id) {
    final var user = userRepository.findById(id).orElse(null);
    if (user == null) throw new RuntimeException("User not found"); // sem tipo

    return user;
}

public Order processOrder(String orderId) {
    try {
        return getOrder(orderId);
    } catch (Exception e) {
        System.out.println("Something went wrong"); // engole o erro
        return null;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — hierarquia de exceções tipada, contrato único</summary>
<br>

```java
// exceptions/AppException.java
public abstract class AppException extends RuntimeException {
    private final String action;
    private final int statusCode;

    protected AppException(String message, String action, int statusCode) {
        super(message);
        this.action = action;
        this.statusCode = statusCode;
    }

    protected AppException(String message, String action, int statusCode, Throwable cause) {
        super(message, cause);
        this.action = action;
        this.statusCode = statusCode;
    }

    public String action() { return action; }
    public int statusCode() { return statusCode; }
}

// exceptions/NotFoundException.java
public class NotFoundException extends AppException {
    public NotFoundException(String message) {
        super(message, "Check if the resource exists.", 404);
    }
}

// exceptions/ValidationException.java
public class ValidationException extends AppException {
    public ValidationException(String message) {
        super(message, "Review the input data.", 400);
    }
}

// exceptions/InternalException.java
public class InternalException extends AppException {
    public InternalException(Throwable cause) {
        super("An unexpected error occurred.", "Contact support.", 500, cause);
    }
}
```

</details>

## try/catch que engole o erro

<details>
<summary>❌ Bad — captura, loga e retorna null</summary>
<br>

```java
public Product findProductById(String id) {
    try {
        return productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("not found"));
    } catch (Exception e) {
        log.error("Something went wrong"); // engole o erro
        return null;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — propaga com contexto, trata na fronteira</summary>
<br>

```java
public Product findProductById(String id) {
    try {
        final var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product " + id + " not found."));
        return product;
    } catch (NotFoundException e) {
        throw e;
    } catch (Exception e) {
        throw new InternalException(e);
    }
}
```

</details>

## try-with-resources (bloco de recursos gerenciados)

Recursos que implementam `AutoCloseable` (interface que marca recursos fecháveis automaticamente)
devem ser abertos em `try-with-resources`. Garante fechamento mesmo em caso de exceção.

<details>
<summary>❌ Bad — fechamento manual em finally, propenso a erro</summary>
<br>

```java
public String readFile(Path path) throws IOException {
    BufferedReader reader = null;
    try {
        reader = Files.newBufferedReader(path);
        return reader.readLine();
    } finally {
        if (reader != null) reader.close(); // esquecido frequentemente
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — try-with-resources garante fechamento automático</summary>
<br>

```java
public String readFile(Path path) throws IOException {
    try (final var reader = Files.newBufferedReader(path)) {
        final var content = reader.readLine();
        return content;
    }
}
```

</details>

## Exceção como controle de fluxo

<details>
<summary>❌ Bad — try/catch controlando lógica de negócio normal</summary>
<br>

```java
public User getUser(String id) {
    try {
        return userMap.get(id); // null não é uma exceção
    } catch (NullPointerException e) {
        return null;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — verificação explícita, sem exceção para fluxo normal</summary>
<br>

```java
public Optional<User> getUser(String id) {
    final var user = userMap.get(id);
    return Optional.ofNullable(user);
}
```

</details>

## Quando usar try/catch

| Use                                          | Não use                                               |
| -------------------------------------------- | ----------------------------------------------------- |
| I/O externo (DB, rede, arquivo)              | Para encadear chamadas que já propagam erros          |
| Fronteira do sistema (controller HTTP)       | Para logar e ignorar: mascara problemas               |
| Para mapear erro técnico → erro de negócio   | Quando o erro já será tratado em camada superior      |
| `try-with-resources` para recursos externos  | Como substituto de `Optional` ou verificação de null  |
