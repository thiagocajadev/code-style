# Async

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões assíncronos do JavaScript: async/await, Promise.all, **API** (Application Programming Interface · Interface de Programação de Aplicações) client centralizado. Aplicam-se sem mudança. O TypeScript adiciona: **`Promise<T>`** (promessa tipada) com tipo explícito no retorno, **generic** (tipo paramétrico) em clientes de **I/O** (Input/Output · Entrada/Saída) e tipagem correta de `Promise.all`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa o limite do processo: rede, disco, banco |
| **`Promise<T>`** (promessa tipada) | Objeto que representa o resultado futuro tipado de uma operação assíncrona |
| **`async`/`await`** (assíncrono/aguardar) | Açúcar sobre Promises; permite escrever assíncrono com fluxo linear |
| **generic** (tipo paramétrico) | Parâmetro de tipo (`<T>`) que carrega o shape esperado da resposta para o caller |
| **`Awaited<T>`** (utilitário de desembrulho) | Utilitário que extrai o tipo de dentro de uma `Promise<T>` |
| **`Promise.all`** (paralelismo tipado) | Resolve um array de promises em paralelo; preserva tuple de tipos |
| **`Result<T, E>`** (resultado tipado) | Padrão de retorno que carrega sucesso ou erro tipado, sem `throw` |

## Return type de funções async

Toda função `async` retorna uma `Promise`. O tipo do retorno deve declarar o que está dentro dela.

<details>
<summary>❌ Ruim: return type implícito em função async exportada</summary>

```ts
export async function findUserById(id: string) {
  const user = await db.users.findById(id);
  return user; // Promise<User | null>, mas o contrato não está visível
}
```

</details>

<details>
<summary>✅ Bom: Promise<T> explícito</summary>

```ts
export async function findUserById(id: string): Promise<User | null> {
  const user = await userRepository.findById(id);
  return user;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const order = await orderRepository.create(input);
  return order;
}
```

</details>

## Promise.all tipado

`Promise.all` preserva a tupla de tipos quando os argumentos são literais de array. TypeScript
infere cada posição corretamente.

<details>
<summary>❌ Ruim: await sequencial quando não há dependência</summary>

```ts
async function fetchDashboard(userId: string): Promise<Dashboard> {
  const orders = await fetchOrders(userId);     // espera terminar
  const invoices = await fetchInvoices(userId); // só começa depois
  const profile = await fetchProfile(userId);   // só começa depois

  const dashboard = { orders, invoices, profile };

  return dashboard;
}
```

</details>

<details>
<summary>✅ Bom: Promise.all com tipos preservados</summary>

```ts
async function fetchDashboard(userId: string): Promise<Dashboard> {
  const [orders, invoices, profile] = await Promise.all([
    fetchOrders(userId),   // Promise<Order[]>
    fetchInvoices(userId), // Promise<Invoice[]>
    fetchProfile(userId),  // Promise<UserProfile>
  ]);
  // TypeScript infere: [Order[], Invoice[], UserProfile]

  const dashboard: Dashboard = { orders, invoices, profile };
  return dashboard;
}
```

</details>

> `Promise.allSettled` retorna `PromiseSettledResult<T>[]`. Use quando quiser continuar mesmo com
> falhas parciais e precisar inspecionar cada resultado.

## API client tipado

Um cliente genérico com `get<T>` e `post<T>` transfere a responsabilidade de tipagem para o
caller, que sabe o shape esperado, sem usar `any`.

<details>
<summary>❌ Ruim: fetch direto com any espalhado pelo código</summary>

```ts
// user.service.ts
async function fetchUser(id: string) {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user: any = await response.json(); // any: sem contrato

  return user;
}
```

</details>

<details>
<summary>✅ Bom: cliente genérico, caller declara o tipo esperado</summary>

```ts
// api.client.ts
interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
  post<TBody, TResponse>(path: string, body: TBody): Promise<TResponse>;
}

function createApiClient(baseUrl: string, token: string): ApiClient {
  async function get<TResponse>(path: string): Promise<TResponse> {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json() as TResponse;
    return body;
  }

  async function post<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as TResponse;
    return result;
  }

  const client: ApiClient = { get, post };
  return client;
}
```

```ts
// user.service.ts
async function fetchUser(apiClient: ApiClient, id: string): Promise<User> {
  const user = await apiClient.get<User>(`/users/${id}`);
  return user;
}

// order.service.ts
async function createOrder(apiClient: ApiClient, input: CreateOrderInput): Promise<Order> {
  const order = await apiClient.post<CreateOrderInput, Order>("/orders", input);
  return order;
}
```

</details>

## Callbacks assíncronos em arrays

Métodos de array como `map` e `filter` não são `async-aware`: retornam `Promise[]`, não os valores
resolvidos. Use `Promise.all` para aguardar.

<details>
<summary>❌ Ruim: map com async retorna Promise[], não os valores</summary>

```ts
async function enrichOrders(orders: Order[]): Promise<EnrichedOrder[]> {
  const enriched = orders.map(async (order) => {
    const customer = await fetchCustomer(order.customerId);
    return { ...order, customer };
  });
  // enriched é Promise<EnrichedOrder>[], não EnrichedOrder[]

  return enriched; // erro de tipos
}
```

</details>

<details>
<summary>✅ Bom: Promise.all resolve o array de promises</summary>

```ts
async function enrichOrders(orders: Order[]): Promise<EnrichedOrder[]> {
  const enrichmentTasks = orders.map(async (order) => {
    const customer = await fetchCustomer(order.customerId);

    const enrichedOrder: EnrichedOrder = { ...order, customer };
    return enrichedOrder;
  });

  const enrichedOrders = await Promise.all(enrichmentTasks);
  return enrichedOrders;
}
```

</details>
