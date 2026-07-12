# Performance em TypeScript

> Escopo: TypeScript. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

As diretrizes de performance do JavaScript continuam valendo, e a primeira delas é medir antes de
mexer. O TypeScript acrescenta um segundo lugar onde o tempo é gasto. Além do **runtime** (tempo de
execução), existe o **compiler** (compilador), que trabalha a cada vez que você salva um arquivo, e
tipos escritos sem cuidado o fazem trabalhar demais. Esta página cobre os dois lados: o código que
sobra no arquivo final entregue ao navegador, e o tipo que deixa o editor lento.

> Base JavaScript: [javascript/conventions/advanced/performance.md](../../../javascript/conventions/advanced/performance.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho quente) | Trecho de código executado em volume ou frequência alta; otimizar aqui rende |
| **`enum`** (enumeração com runtime) | Constrói objeto bidirecional em runtime; tipo + valor; mais peso que `as const` |
| **`as const`** (afirmação literal) | Congela como literal; não gera nada em runtime; substituto idiomático de `enum` |
| **type complexity** (complexidade de tipo) | Custo do compilador resolver tipos profundos, recursivos ou condicionais |
| **conditional type** (tipo condicional) | `T extends U ? A : B`; poderoso mas custoso quando aninhado |
| **declaration merging** (fusão de declarações) | Múltiplas `interface` com mesmo nome se combinam; pode inflar tipos |
| **bundle size** (tamanho do bundle) | Peso final do JS entregue; `enum` adiciona, `as const` não |
| **profiling** (perfilamento) | Medição empírica de onde tempo e memória são gastos; meça antes de otimizar |

## O enum vira código no arquivo final, o `as const` não

O `enum` compila para um objeto JavaScript de verdade, com o mapeamento nos dois sentidos (do nome
para o valor e do valor para o nome). Esse objeto entra no arquivo que o navegador baixa, e continua
lá mesmo quando o único uso dele era dizer quais status um pedido pode ter.

O objeto `as const` com o union type derivado dá o mesmo autocompletar e a mesma checagem, e some
na compilação: os tipos desaparecem, e o que resta é o objeto de constantes que você mesmo escreveu.

<details>
<summary>❌ Ruim: o enum gera um objeto que viaja para o navegador sem necessidade</summary>

```ts
enum OrderStatus {
  Pending = "pending",
  Approved = "approved",
  Cancelled = "cancelled",
}

function getLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.Pending]: "Aguardando",
    [OrderStatus.Approved]: "Aprovado",
    [OrderStatus.Cancelled]: "Cancelado",
  };

  const label = labels[status];

  return label;
}
```

</details>

<details>
<summary>✅ Bom: o objeto as const some na compilação e não pesa no arquivo final</summary>

```ts
const ORDER_STATUS = {
  Pending: "pending",
  Approved: "approved",
  Cancelled: "cancelled",
} as const;

type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

const ORDER_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando",
  approved: "Aprovado",
  cancelled: "Cancelado",
};

function getLabel(status: OrderStatus): string {
  const label = ORDER_LABELS[status];
  return label;
}
```

</details>

## O `as` não custa nada e não garante nada

`as T` é gratuito em runtime, e é gratuito porque não faz nada: ele apenas cala o compilador. O
dado que veio da rede continua sendo o que era, e a primeira linha que ler um campo inexistente
quebra.

A checagem de verdade custa algumas comparações, o que é irrelevante perto de uma chamada de rede
que acabou de acontecer. Em troca, ela devolve uma garantia real sobre o valor no ponto em que ele
entra no sistema.

<details>
<summary>❌ Ruim: o as aceita o dado sem conferir nada</summary>

```ts
async function fetchOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}`);
  const data = await response.json();

  return data as Order; // nenhuma verificação: campo ausente passa silenciosamente
}
```

</details>

<details>
<summary>✅ Bom: a checagem confere o dado no limite em que ele entra</summary>

```ts
function isOrder(value: unknown): value is Order {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "customerId" in value
  );
}

async function fetchOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}`);
  const data: unknown = await response.json();
  if (!isOrder(data)) throw new Error(`Invalid order shape for id ${id}`);

  return data;
}
```

</details>

## O tipo recursivo sem limite deixa o editor lento

Um tipo que se refere a si mesmo sem parada obriga o compilador a descer nível por nível até o
fundo da estrutura, e ele faz isso a cada vez que o arquivo é analisado. Em objetos aninhados, o
custo cresce rápido, e o sintoma aparece no editor: o autocompletar demora, e depois desiste.

Declarar a profundidade máxima resolve. O tipo aceita descer alguns níveis e para, o que cobre o
uso real e mantém o compilador rápido.

<details>
<summary>❌ Ruim: a recursão não tem parada, e o compilador desce até o fundo</summary>

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type Config = DeepPartial<ApplicationConfig>; // pode atingir dezenas de níveis
```

</details>

<details>
<summary>✅ Bom: profundidade máxima explícita</summary>

```ts
type DeepPartial<T, Depth extends number = 3> = Depth extends 0
  ? T
  : {
      [K in keyof T]?: T[K] extends object
        ? DeepPartial<T[K], [-1, 0, 1, 2][Depth]>
        : T[K];
    };
```

</details>

## A tabela de consulta usa `satisfies`

Anotar a tabela como `Record<OrderStatus, string>` faz duas coisas: garante que todas as chaves
estão lá, e troca cada valor literal pelo tipo `string`. A segunda é uma perda: o compilador
deixa de saber que o rótulo de `approved` é `"Aprovado"`, e passa a saber apenas que é texto.

`satisfies` mantém a primeira garantia e não paga a segunda. As chaves continuam obrigatórias, e
cada valor continua sendo o literal exato que foi escrito.

<details>
<summary>❌ Ruim: o Record troca cada literal pelo tipo string</summary>

```ts
const DISCOUNT_RATES: Record<string, number> = {
  premium: 0.2,
  standard: 0.1,
  trial: 0.05,
};

// DISCOUNT_RATES["premium"] → number (não 0.2)
// aceita chaves inválidas em runtime sem erro de tipos
```

</details>

<details>
<summary>✅ Bom: satisfies exige todas as chaves e preserva cada literal</summary>

```ts
type CustomerTier = "premium" | "standard" | "trial";

const DISCOUNT_RATES = {
  premium: 0.2,
  standard: 0.1,
  trial: 0.05,
} satisfies Record<CustomerTier, number>;

// DISCOUNT_RATES["premium"] → 0.2 (literal, não number)
// chave inválida → erro de compilação
```

</details>
