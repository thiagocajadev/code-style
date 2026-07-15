# Variáveis em Java

Comece toda variável com `final` e tire o modificador só quando o código precisar reatribuir aquele nome. Uma variável que não muda depois de atribuída dispensa o leitor de procurar, no resto do método, se alguém trocou o valor no caminho.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **final** (referência fixa) | modificador que impede reatribuir a variável depois da inicialização |
| **var** (inferência de tipo local) | declaração `var` (Java 10 em diante) deixa o compilador deduzir o tipo da variável local |
| **immutability** (o valor não muda depois de criado) | o objeto nasce pronto e nenhum método altera seu conteúdo, o que dispensa cuidado com concorrência |
| **shadowing** (sombreamento) | variável local que oculta outra de mesmo nome declarada num escopo externo |
| **scope** (escopo) | região do código em que a variável é visível; declarar perto do uso encurta o escopo |
| **effectively final** (efetivamente final) | variável nunca reatribuída, mesmo sem escrever `final`; lambdas só aceitam essa forma |

<a id="unnecessary-mutation"></a>

## Reatribuição desnecessária

A variável sem `final` avisa ao leitor que o valor pode trocar mais adiante. Quando ele nunca troca, o aviso é falso e custa uma releitura.

<details>
<summary>❌ Ruim: a variável anuncia uma troca que nunca acontece</summary>

```java
String userName = "Alice"; // nunca reatribuído
int maxRetries = 3;        // nunca reatribuído
```

</details>

<details>
<summary>✅ Bom: final por padrão, e o contador sem final porque ele troca mesmo</summary>

```java
final var userName = "Alice";
final var maxRetries = 3;

var attempt = 0;
while (attempt < maxRetries) {
    attempt++;
}
```

</details>

<a id="parameter-mutation"></a>

## Alteração do objeto recebido por parâmetro

Quando um método recebe um objeto, ele recebe uma referência para o mesmo objeto que o chamador tem em mãos. Escrever nesse objeto altera o que o chamador enxerga, e a alteração não aparece em lugar nenhum da assinatura. Quem lê `applyDiscount(order)` espera que o `order` dele continue igual depois da chamada.

Devolva o novo estado como retorno. A assinatura passa a dizer o que acontece, e o chamador decide se aproveita o resultado.

<details>
<summary>❌ Ruim: o método escreve no pedido do chamador sem avisar</summary>

```java
private void applyDiscount(Order order) {
    order.setDiscount(BigDecimal.TEN);       // altera o objeto externo
    order.setTotal(order.getTotal().subtract(BigDecimal.TEN));
}
```

</details>

<details>
<summary>✅ Bom: devolve um pedido novo e deixa o original intacto</summary>

```java
private Order applyDiscount(Order order) {
    final var discount = BigDecimal.TEN;
    final var discountedTotal = order.getTotal().subtract(discount);

    final var discountedOrder = order.withDiscount(discount).withTotal(discountedTotal);
    return discountedOrder;
}
```

</details>

<a id="magic-values"></a>

## Evitar valores mágicos

Um número solto no meio de uma condição obriga o leitor a adivinhar de onde ele saiu. `86400000` é um dia em milissegundos, e descobrir isso exige uma conta. A constante nomeada guarda a resposta ao lado do valor, e o nome aparece de novo em cada lugar que usa o número.

<details>
<summary>❌ Ruim: o número não diz de onde saiu nem o que representa</summary>

```java
if (user.getAge() >= 18) { /* ... */ }
if (order.getStatus() == 2) { /* ... */ }

scheduler.schedule(this::syncData, 86400000, TimeUnit.MILLISECONDS);
```

</details>

<details>
<summary>✅ Bom: o nome da constante guarda o significado do número</summary>

```java
private static final int MINIMUM_DRIVING_AGE = 18;
private static final int ORDER_STATUS_APPROVED = 2;
private static final long ONE_DAY_MS = 86_400_000L;

if (user.getAge() >= MINIMUM_DRIVING_AGE) { /* ... */ }
if (order.getStatus() == ORDER_STATUS_APPROVED) { /* ... */ }

scheduler.schedule(this::syncData, ONE_DAY_MS, TimeUnit.MILLISECONDS);
```

</details>

## Records para transportar dados

Um `record` descreve um objeto que nasce pronto e nunca é alterado. O compilador escreve sozinho o construtor, os acessores, o `equals`, o `hashCode` e o `toString`, então a declaração cabe em quatro linhas e não sobra código repetido para alguém errar na revisão.

<details>
<summary>❌ Ruim: uma classe inteira de acessores para carregar quatro campos</summary>

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
<summary>✅ Bom: o record declara os campos e o compilador escreve o resto</summary>

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

## var e a inferência de tipo

Use `var` quando o lado direito da atribuição já mostra o tipo: `new User(...)` deixa claro que a variável é um `User`. Quando o tipo só apareceria na assinatura de um método que está em outro arquivo, escreva o tipo por extenso, porque quem lê o código no diff do pull request não tem o editor para consultar.

<details>
<summary>❌ Ruim: descobrir o tipo exige abrir outro arquivo</summary>

```java
final var result = repository.fetch(); // qual é o tipo?
final var x = buildSomething();        // sem contexto
```

</details>

<details>
<summary>✅ Bom: var onde o tipo aparece na linha, e tipo escrito onde ele esclarece</summary>

```java
final var orders = orderRepository.findAll();    // List<Order>: óbvio pelo nome
final var user = new User("Alice", "alice@example.com");

final Optional<User> found = userRepository.findById(id); // tipo explícito agrega contexto
```

</details>

## Primitivos e wrappers

Prefira o primitivo (`int`, `long`, `boolean`) em variável local e em parâmetro de método. O **wrapper** (`Integer`, `Long`, `Boolean`, a versão do primitivo como objeto) serve para dois casos: quando o valor precisa aceitar `null` e quando ele entra numa coleção genérica, que só guarda objetos.

Passar de um para o outro tem nome, **autoboxing** (empacotamento automático), e cada conversão aloca um objeto novo. Declarar `Integer count = 0` num contador de laço repete essa alocação em toda volta sem ganhar nada em troca.

<details>
<summary>❌ Ruim: o wrapper aparece onde nenhum valor pode ser nulo</summary>

```java
Integer count = 0;           // autoboxing desnecessário
Boolean isActive = true;     // sem necessidade de nulidade
Long totalMs = 86_400_000L;  // valor fixo, nunca null
```

</details>

<details>
<summary>✅ Bom: primitivo no contador, wrapper só dentro da coleção genérica</summary>

```java
int count = 0;
boolean isActive = true;
long totalMs = 86_400_000L;

// wrapper necessário: parâmetro de tipo genérico
final Map<String, Integer> scoreByUser = new HashMap<>();
```

</details>
