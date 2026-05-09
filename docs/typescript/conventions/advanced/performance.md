# Performance

> Escopo: TypeScript. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

As diretrizes de performance do JavaScript se aplicam sem mudança. O TypeScript adiciona:
evitar padrões que forçam trabalho desnecessário no compilador e no runtime.
Meça antes de otimizar.

> Base JavaScript: [javascript/conventions/advanced/performance.md](../../../../javascript/conventions/advanced/performance.md)

## Enums em runtime vs const objects

`enum` gera código JavaScript em runtime: um objeto bidirecional com mapeamento numérico. Para
valores que são apenas constantes de domínio, `as const` não gera nada em runtime.

<details>
<summary>❌ Bad — enum gera objeto runtime desnecessário</summary>
<br>

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

<br>

<details>
<summary>✅ Good — const object + union type: sem overhead runtime</summary>
<br>

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

## Type assertions vs type guards

`as T` suprime a verificação em tempo de compilação sem nenhuma garantia em runtime. Uma
type guard valida o valor explicitamente: custo mínimo, contrato real.

<details>
<summary>❌ Bad — as T aceita sem verificar</summary>
<br>

```ts
async function fetchOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}`);
  const data = await response.json();

  return data as Order; // nenhuma verificação — campo ausente passa silenciosamente
}
```

</details>

<br>

<details>
<summary>✅ Good — type guard valida o contrato na fronteira</summary>
<br>

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

## Tipos recursivos: limitar profundidade

Tipos recursivos ilimitados causam lentidão no compilador proporcional à profundidade inferida.
Defina a profundidade máxima explicitamente.

<details>
<summary>❌ Bad — recursão ilimitada, compilador infere profundidade arbitrária</summary>
<br>

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type Config = DeepPartial<ApplicationConfig>; // pode atingir dezenas de níveis
```

</details>

<br>

<details>
<summary>✅ Good — profundidade máxima explícita</summary>
<br>

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

## Lookup table tipado

`satisfies` valida o objeto contra o tipo sem alargá-lo. O resultado preserva os tipos
literais para uso em narrowing, enquanto garante que todas as chaves estão presentes.

<details>
<summary>❌ Bad — Record<> alarga os tipos, perde literais</summary>
<br>

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

<br>

<details>
<summary>✅ Good — satisfies valida sem alargar</summary>
<br>

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
