# Performance em Java

> Escopo: Java 25 LTS. Otimize onde há evidência de problema; código legível sempre.

Otimize o trecho que uma medição apontou como lento, e mantenha o resto do código legível. As dicas abaixo tratam de casos onde a escolha mais rápida também é clara, ou onde o ganho aparece num **hot path** (o trecho chamado muitas vezes por segundo, onde qualquer custo extra se multiplica). Fora desses casos, escreva o código que se lê melhor e deixe a otimização para quando o profiler mostrar o gargalo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho de execução crítico) | trecho chamado muitas vezes por segundo; qualquer custo extra ali se multiplica |
| **overhead** (custo extra) | processamento além da lógica de negócio: alocações, boxing, chamadas de método |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é o processamento; o `parallelStream()` pode ajudar |
| **I/O-bound** (limitado por entrada e saída) | operação cujo gargalo é rede, disco ou banco; as virtual threads resolvem melhor |
| **preallocation** (pré-alocação) | informar a capacidade inicial de uma coleção para evitar que ela cresça em etapas |
| **ForkJoinPool** (pool de roubo de trabalho) | pool compartilhado da JVM que o `parallelStream()` usa; não prender ele com I/O |

## Stream ou laço: uma escolha consciente

O stream se lê bem para uma sequência de transformações, e para coleção pequena a diferença de tempo não aparece. Num hot path, o `for-each` evita o custo extra que o stream cria a cada elemento (um objeto de pipeline e uma chamada de método por etapa), e o ganho passa a valer porque o trecho roda muitas vezes por segundo.

<details>
<summary>✅ Bom: stream para uma transformação declarativa</summary>

```java
final var activeUserIds = users.stream()
    .filter(User::isActive)
    .map(User::getId)
    .toList();
```

</details>

<details>
<summary>✅ Bom: for-each no trecho chamado muitas vezes, sem o custo extra do stream</summary>

```java
// chamado milhões de vezes por segundo
for (final var item : items) {
    total = total.add(item.getPrice());
}
```

</details>

## Pré-alocar o ArrayList

Quando o `ArrayList` enche, ele cria um array maior e copia tudo para o novo. Se você já sabe quantos itens vai guardar, passe esse número no construtor: a lista nasce do tamanho certo e a cópia não acontece nenhuma vez.

<details>
<summary>❌ Ruim: a lista cresce em etapas e copia os itens a cada vez</summary>

```java
final var results = new ArrayList<String>();

for (final var item : items) {
    results.add(process(item)); // pode realocar várias vezes
}
```

</details>

<details>
<summary>✅ Bom: a lista nasce do tamanho final</summary>

```java
final var results = new ArrayList<String>(items.size());

for (final var item : items) {
    results.add(process(item));
}
```

</details>

## Concatenar String dentro de um laço

Uma `String` não muda depois de criada, então o `+` dentro do laço cria um objeto novo a cada volta e joga o anterior fora. Com mil itens, são mil objetos descartados. O `StringBuilder` escreve tudo no mesmo buffer, e o `String.join` resolve o caso da lista em uma linha.

<details>
<summary>❌ Ruim: o + no laço cria um objeto novo por volta</summary>

```java
String result = "";
for (final var item : items) {
    result += item.getName() + ", "; // N objetos String
}
```

</details>

<details>
<summary>✅ Bom: StringBuilder no laço, String.join para a lista</summary>

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

## Capacidade inicial do HashMap

O `HashMap` refaz sua tabela interna quando chega a 75% da capacidade, que é o fator de carga padrão. Para um mapa de tamanho conhecido, informe a capacidade inicial pela conta `tamanho / 0,75 + 1`, e o mapa evita refazer a tabela enquanto você o preenche.

<details>
<summary>❌ Ruim: capacidade padrão de 16, refaz a tabela acima de 12 entradas</summary>

```java
final var cache = new HashMap<String, User>(); // padrão: 16
// com 100 usuários: ~7 realocações
```

</details>

<details>
<summary>✅ Bom: capacidade informada pela conta</summary>

```java
final int expectedSize = 100;
final var cache = new HashMap<String, User>(expectedSize * 2); // fator de segurança 2x
```

</details>

## Stream.parallel() com critério

O `Stream.parallel()` divide o trabalho no ForkJoinPool comum da JVM, o mesmo que outras partes da aplicação usam. Ele compensa em operação limitada por CPU sobre uma lista grande, onde há cálculo de verdade para dividir entre os núcleos. Numa operação de I/O, cada elemento parado esperando a rede ocupa uma thread desse pool compartilhado, e as demais partes da aplicação ficam sem vaga; ali as virtual threads servem melhor.

<details>
<summary>❌ Ruim: parallel numa operação de I/O prende o pool compartilhado</summary>

```java
final var results = orders.parallelStream()
    .map(order -> orderRepository.findDetails(order.getId())) // I/O: bloqueia o ForkJoin pool
    .toList();
```

</details>

<details>
<summary>✅ Bom: parallel só no cálculo pesado sobre lista grande</summary>

```java
// CPU-bound: cálculo pesado sobre lista grande (>10k elementos)
final var total = largePriceList.parallelStream()
    .map(Price::computeAdjusted) // cálculo puro, sem I/O
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

</details>

## List.of no lugar de Collections.unmodifiableList

Para uma coleção que ninguém deve alterar depois de criada, prefira `List.of`, `Set.of` e `Map.of`, que criam uma coleção fixa de verdade. O `Collections.unmodifiableList` só embrulha a lista original: quem ainda tem a referência à lista de dentro consegue escrever nela, e a mudança aparece na versão que era para ser fixa.

<details>
<summary>❌ Ruim: o embrulho deixa a lista original alterar o resultado</summary>

```java
final var mutableList = new ArrayList<>(items);
final var readOnly = Collections.unmodifiableList(mutableList);

mutableList.add(newItem); // readOnly reflete a mudança!
```

</details>

<details>
<summary>✅ Bom: List.of cria uma coleção fixa de verdade</summary>

```java
final var immutableItems = List.of("a", "b", "c"); // lança UnsupportedOperationException em add/remove
final var copyOf = List.copyOf(mutableList);        // cópia imutável de uma lista existente
```

</details>
