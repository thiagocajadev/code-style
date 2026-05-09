# Performance

> Escopo: Java 25 LTS. Otimize onde há evidência de problema; código legível sempre.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho crítico de execução) | trecho de código chamado com altíssima frequência; impacto de overhead é amplificado |
| **overhead** (custo adicional) | processamento extra além da lógica de negócio; alocações, boxing, chamadas de método |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é processamento; parallelStream() pode ajudar |
| **I/O-bound** (limitado por entrada e saída) | operação cujo gargalo é rede, disco ou banco; virtual threads resolvem melhor |
| **pré-alocação** | informar a capacidade inicial de uma coleção para evitar realocações internas |
| **ForkJoinPool** (pool de roubo de trabalho) | pool compartilhado da JVM usado por `parallelStream()`; não bloquear nele com I/O |

## Streams vs loops — escolha consciente

Streams são declarativos e legíveis para pipelines de transformação. Para operações simples
sobre coleções pequenas, a diferença de performance é irrelevante. Para hot paths
(caminhos críticos de execução), prefira `for-each`.

<details>
<summary>✅ Good — stream para transformação declarativa</summary>
<br>

```java
final var activeUserIds = users.stream()
    .filter(User::isActive)
    .map(User::getId)
    .toList();
```

</details>

<br>

<details>
<summary>✅ Good — for-each em hot path: sem overhead de stream</summary>
<br>

```java
// chamado milhões de vezes por segundo
for (final var item : items) {
    total = total.add(item.getPrice());
}
```

</details>

## ArrayList — pré-alocação

`ArrayList` cresce dobrando de tamanho. Se o tamanho final é conhecido, passe-o no construtor
para evitar realocações.

<details>
<summary>❌ Bad — ArrayList cresce dinamicamente com realocação</summary>
<br>

```java
final var results = new ArrayList<String>();

for (final var item : items) {
    results.add(process(item)); // pode realocar várias vezes
}
```

</details>

<br>

<details>
<summary>✅ Good — tamanho inicial conhecido</summary>
<br>

```java
final var results = new ArrayList<String>(items.size());

for (final var item : items) {
    results.add(process(item));
}
```

</details>

## String — concatenação em loop

O operador `+` em loop cria um objeto `String` por iteração. `StringBuilder` reutiliza o buffer.

<details>
<summary>❌ Bad — concatenação cria N objetos</summary>
<br>

```java
String result = "";
for (final var item : items) {
    result += item.getName() + ", "; // N objetos String
}
```

</details>

<br>

<details>
<summary>✅ Good — StringBuilder ou String.join()</summary>
<br>

```java
// para listas, String.join() é mais expressivo
final var result = items.stream()
    .map(Item::getName)
    .collect(Collectors.joining(", "));

// para construção condicional em loop
final var builder = new StringBuilder(items.size() * 20);
for (final var item : items) {
    if (item.isActive()) builder.append(item.getName()).append(", ");
}
```

</details>

## HashMap — capacidade inicial

`HashMap` redimensiona quando atinge 75% de sua capacidade (fator de carga padrão). Para mapas
de tamanho conhecido, calcule a capacidade inicial: `tamanho / 0.75 + 1`.

<details>
<summary>❌ Bad — HashMap com capacidade padrão (16), realoca se >12 entradas</summary>
<br>

```java
final var cache = new HashMap<String, User>(); // padrão: 16
// com 100 usuários: ~7 realocações
```

</details>

<br>

<details>
<summary>✅ Good — capacidade calculada</summary>
<br>

```java
final int expectedSize = 100;
final var cache = new HashMap<String, User>(expectedSize * 2); // fator de segurança 2x
```

</details>

## Stream.parallel() — usar com critério

`Stream.parallel()` usa o ForkJoinPool (pool de roubo de trabalho) comum da JVM. É benéfico
apenas para operações CPU-bound sobre grandes datasets (conjuntos de dados). Para I/O-bound,
use virtual threads.

<details>
<summary>❌ Bad — parallel para operação I/O-bound (piora o throughput)</summary>
<br>

```java
final var results = orders.parallelStream()
    .map(order -> orderRepository.findDetails(order.getId())) // I/O — bloqueia o ForkJoin pool
    .toList();
```

</details>

<br>

<details>
<summary>✅ Good — parallel apenas para CPU-bound com dados grandes</summary>
<br>

```java
// CPU-bound: cálculo pesado sobre lista grande (>10k elementos)
final var total = largePriceList.parallelStream()
    .map(Price::computeAdjusted) // cálculo puro, sem I/O
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

</details>

## Collections.unmodifiableList vs List.of

Para coleções que não devem ser modificadas após criação, prefira `List.of`, `Set.of` e
`Map.of` (imutáveis por construção) a `Collections.unmodifiableList` (wrapper mutável).

<details>
<summary>❌ Bad — wrapper ainda permite mutação se a referência original vazar</summary>
<br>

```java
final var mutableList = new ArrayList<>(items);
final var readOnly = Collections.unmodifiableList(mutableList);

mutableList.add(newItem); // readOnly reflete a mudança!
```

</details>

<br>

<details>
<summary>✅ Good — List.of() é imutável por construção</summary>
<br>

```java
final var immutableItems = List.of("a", "b", "c"); // lança UnsupportedOperationException em add/remove
final var copyOf = List.copyOf(mutableList);        // cópia imutável de uma lista existente
```

</details>
