# Tratamento de erros em Java

> Escopo: Java 25 LTS. Idiomas específicos deste ecossistema.

Um erro bem estruturado deixa claro se o que aconteceu foi um **problema de negócio**, como um pedido que não existe, ou uma **falha técnica**, como o banco fora do ar. O `try/catch` serve para capturar a exceção e decidir o que fazer com ela. Quando o `catch` registra a falha e devolve `null`, ele apaga a informação do erro, e o problema reaparece mais longe, sem a pista de onde nasceu.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **checked exception** (exceção verificada) | exceção que o compilador obriga a declarar ou capturar, como `IOException` |
| **unchecked exception** (exceção não verificada) | subclasse de `RuntimeException`; não precisa ser declarada; a escolha no código moderno |
| **try-with-resources** (bloco que fecha recursos sozinho) | bloco que fecha os recursos `AutoCloseable` na saída, com ou sem exceção |
| **AutoCloseable** (fechável automaticamente) | interface que marca um recurso para o `try-with-resources` fechar |
| **stack trace** (rastreamento de pilha) | a sequência de chamadas que levou até a exceção |

<a id="multiple-return-types"></a>

## Um único tipo de retorno

Quando o método devolve `null` na falta do ID, `null` no ID em branco e `null` no pedido não encontrado, quem chama recebe o mesmo `null` para três causas diferentes e não sabe qual delas ocorreu. Lançar uma exceção tipada em cada caso dá ao chamador a causa exata, e o caminho de sucesso devolve sempre um `Order` de verdade.

<details>
<summary>❌ Ruim: null para três causas diferentes, e quem chama não distingue qual foi</summary>

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

<details>
<summary>✅ Bom: cada falha lança a exceção que nomeia a causa</summary>

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

<a id="baseexception-centralized-abstraction"></a>

## Uma exceção base para o projeto inteiro

Uma `RuntimeException` genérica não diz se o erro foi culpa do cliente ou do servidor, e obriga cada `catch` a ler a mensagem de texto para decidir. Uma hierarquia com raiz comum resolve isso: cada exceção carrega o código HTTP e a ação sugerida, e um único handler traduz qualquer uma delas para a resposta certa.

<details>
<summary>❌ Ruim: RuntimeException genérica, sem código nem tipo</summary>

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

<details>
<summary>✅ Bom: hierarquia com raiz comum, cada exceção com código e ação</summary>

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

## O try/catch que descarta o erro

Quando o `catch` registra a falha e devolve `null`, ele descarta a exceção original e apaga o rastro de onde o problema começou. Quem chamou recebe `null` e trata como "não encontrado", quando na verdade o banco pode ter caído. Propague a exceção com o contexto e deixe o tratamento para o limite do sistema.

<details>
<summary>❌ Ruim: captura, registra log e devolve null</summary>

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

<details>
<summary>✅ Bom: propaga com contexto e trata no limite do sistema</summary>

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

## try-with-resources para fechar recursos

Abra todo recurso que implementa `AutoCloseable`, como um arquivo ou uma conexão, dentro de um `try-with-resources`. Ele fecha o recurso na saída do bloco mesmo quando uma exceção interrompe o meio do caminho. O fechamento manual no `finally` depende de alguém lembrar de escrevê-lo, e o esquecimento vaza o recurso.

<details>
<summary>❌ Ruim: fechamento manual no finally, fácil de esquecer</summary>

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

<details>
<summary>✅ Bom: try-with-resources garante fechamento automático</summary>

```java
public String readFile(Path path) throws IOException {
    try (final var reader = Files.newBufferedReader(path)) {
        final var content = reader.readLine();
        return content;
    }
}
```

</details>

## Exceção não é controle de fluxo

Um valor ausente num mapa é um resultado esperado, e o código deve tratá-lo com uma verificação. Capturar o `NullPointerException` para transformar o ausente em `null` usa a exceção como um `if` disfarçado, esconde o caso normal e mascara o dia em que o `NullPointerException` vier de outra linha. Devolva um `Optional` e deixe o ausente explícito na assinatura.

<details>
<summary>❌ Ruim: try/catch tratando um caso de negócio comum</summary>

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

<details>
<summary>✅ Bom: Optional deixa o valor ausente explícito na assinatura</summary>

```java
public Optional<User> getUser(String id) {
    final var user = userMap.get(id);
    return Optional.ofNullable(user);
}
```

</details>

## Quando usar try/catch

| Use                                          | Evite                                                 |
| -------------------------------------------- | ----------------------------------------------------- |
| I/O externo (banco, rede, arquivo)           | Em chamadas que já propagam o erro sozinhas           |
| Limite do sistema (controller HTTP)          | Para registrar log e devolver null, o que esconde a falha |
| Para traduzir erro técnico em erro de negócio | Quando uma camada acima já vai tratar o erro          |
| `try-with-resources` para recursos externos  | No lugar de `Optional` ou de uma verificação de null  |
