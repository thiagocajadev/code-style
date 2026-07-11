# Performance em JavaScript

> Escopo: JavaScript. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

Estas diretrizes valem para os **hot paths** (caminhos quentes, o código executado em grande volume ou com frequência alta): laços apertados, handlers de requisição, processamento de stream. Fora deles, escolha a legibilidade. A **premature optimization** (otimização prematura) troca clareza por um ganho que muitas vezes nem existe. Meça primeiro, otimize depois.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho quente) | Trecho de código executado em volume ou frequência alta; otimizar aqui rende |
| **cold path** (caminho frio) | Trecho raro (inicialização, erro); aqui a legibilidade vale mais que a velocidade |
| **V8** (engine do Chrome/Node.js) | Motor JavaScript do Node.js e Chrome; otimiza quando o código é previsível e mantém formas estáveis de objeto |
| **JIT** (Just-In-Time, Compilação Sob Demanda) | Compilador que traduz JS para código de máquina em tempo de execução |
| **allocation** (alocação) | Criação de objeto na heap; pressão de alocação custa GC |
| **GC** (Garbage Collection · Coleta de Lixo) | Liberação automática de memória; pausas afetam latência |
| **Big O** (notação assintótica) | Custo do algoritmo em função do tamanho da entrada (`O(n)`, `O(n²)`, `O(log n)`) |
| **profiling** (perfilamento) | Medição empírica de onde tempo e memória são gastos; `node --prof`, `clinic`, Chrome DevTools |
| **stream** (fluxo) | Leitura/escrita em pedaços; evita carregar arquivo inteiro na memória |

## for...of no lugar de forEach em hot paths

`forEach` chama um **callback** (função de retorno) para cada item da lista: cada volta paga o
custo de mais uma chamada de função. O laço `for...of` não usa callback: ele pega o próximo item e
roda o corpo do laço direto. Em um hot path, essa diferença por item soma.

<details>
<summary>❌ Ruim: callback alocado por iteração</summary>

```js
function calculateTotalRevenue(orders) {
  let total = 0;
  orders.forEach((order) => {
    total += order.amount;
  });

  return total;
}
```

</details>

<details>
<summary>✅ Bom: for...of sem overhead de callback</summary>

```js
function calculateTotalRevenue(orders) {
  let total = 0;
  for (const order of orders) {
    total += order.amount;
  }

  return total;
}
```

</details>

## Set para testar pertencimento

`Array.includes()` percorre o array do início ao fim: O(n) por verificação. `Set.has()` responde em
O(1) via hash. Para uma lista fixa consultada com frequência, crie o `Set` uma vez no módulo e
reutilize a cada chamada.

<details>
<summary>❌ Ruim: Array.includes percorre tudo a cada chamada</summary>

```js
const PREMIUM_CATEGORIES = ["electronics", "jewelry", "watches"];

function filterPremiumProducts(products) {
  const premiumProducts = products.filter((product) =>
    PREMIUM_CATEGORIES.includes(product.category)
  );

  return premiumProducts;
}
```

</details>

<details>
<summary>✅ Bom: Set.has resolve em O(1)</summary>

```js
const PREMIUM_CATEGORIES = new Set(["electronics", "jewelry", "watches"]);

function filterPremiumProducts(products) {
  const premiumProducts = products.filter((product) =>
    PREMIUM_CATEGORIES.has(product.category)
  );

  return premiumProducts;
}
```

</details>

## UUID v7 para chaves ordenadas no índice

`crypto.randomUUID()` gera um **UUID** (Universally Unique Identifier · Identificador Único Universal) v4, que é aleatório. Como o valor é imprevisível, cada nova linha entra em um ponto qualquer do índice, e o banco precisa remanejar as páginas para abrir espaço no meio. O UUID v7 é **time-ordered** (ordenado por tempo): um valor gerado depois é sempre maior que o anterior, então cada inserção vai para o fim do índice, em sequência, sem remanejar nada.
Veja o impacto no banco em [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md#tipo-de-id-bigint-vs-uuid).

<details>
<summary>❌ Ruim: crypto.randomUUID() é v4: random, fragmenta índice</summary>

```js
function createOrder(request) {
  const orderId = crypto.randomUUID(); // v4: random, page splits no banco

  return saveOrder({ id: orderId, ...request });
}
```

</details>

<details>
<summary>✅ Bom: UUID v7: time-ordered, sequencial no índice</summary>

```js
import { v7 as uuidv7 } from "uuid";

function createOrder(request) {
  const orderId = uuidv7(); // time-ordered: sequencial no índice, sem fragmentação

  return saveOrder({ id: orderId, ...request });
}
```

</details>

## Concatenar strings em loop

Concatenar com `+` ou com template literal dentro de um loop aloca uma nova string a cada iteração,
porque uma string em JavaScript não pode ser alterada depois de criada. Para montar uma string aos
poucos, acumule os pedaços em um array e chame `join()` no final: uma única alocação, um resultado só.

<details>
<summary>❌ Ruim: nova string alocada por iteração</summary>

```js
function buildOrderReport(orders) {
  let report = "";
  for (const order of orders) {
    report += `#${order.id}: ${order.customer}, ${order.total}\n`;
  }

  return report;
}
```

</details>

<details>
<summary>✅ Bom: array + join, uma alocação no final</summary>

```js
function buildOrderReport(orders) {
  const lines = [];
  for (const order of orders) {
    lines.push(`#${order.id}: ${order.customer}, ${order.total}`);
  }

  const report = lines.join("\n");
  return report;
}
```

</details>
