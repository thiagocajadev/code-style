# Código assíncrono em TypeScript

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões assíncronos do JavaScript continuam valendo aqui: `async`/`await`, `Promise.all` para o
que pode correr em paralelo, e um cliente de **API** (Application Programming Interface · Interface
de Programação de Aplicações) centralizado no lugar de `fetch` espalhado. O que o TypeScript
acrescenta é o tipo do que ainda não chegou. Uma **`Promise<T>`** (promessa tipada) declara no
retorno o que vai estar dentro dela quando a operação terminar, e um **generic** (tipo paramétrico)
deixa quem chama o cliente de **I/O** (Input/Output · Entrada/Saída) dizer qual resposta espera,
sem recorrer a `any`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa o limite do processo: rede, disco, banco |
| **`Promise<T>`** (promessa tipada) | Objeto que representa o resultado futuro tipado de uma operação assíncrona |
| **`async`/`await`** (assíncrono/aguardar) | Açúcar sobre Promises; permite escrever assíncrono com fluxo linear |
| **generic** (tipo paramétrico) | Parâmetro de tipo (`<T>`) que leva ao retorno o formato de resposta que quem chama declarou |
| **`Awaited<T>`** (utilitário de desembrulho) | Utilitário que extrai o tipo de dentro de uma `Promise<T>` |
| **`Promise.all`** (paralelismo tipado) | Resolve um array de promises em paralelo; preserva tuple de tipos |
| **`Result<T, E>`** (resultado tipado) | Padrão de retorno que carrega sucesso ou erro tipado, sem `throw` |

## A função async declara o que vem dentro da Promise

Toda função `async` devolve uma `Promise`, e o que importa para quem chama é o que está dentro
dela. `Promise<User | null>` no retorno avisa que o usuário pode não existir, e o `null` é tratado
na hora. Sem a anotação, essa informação só aparece para quem abrir a implementação.

<details>
<summary>❌ Ruim: a função async exportada não diz o que devolve</summary>

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

## Chamadas independentes correm juntas, e os tipos sobrevivem

Três `await` em sequência esperam um pelo outro sem motivo: se as três chamadas não dependem do
resultado uma da outra, a função demora a soma dos três tempos em vez do maior deles.
`Promise.all` dispara as três de uma vez.

Do lado dos tipos, nada se perde. `Promise.all` devolve cada posição com o tipo que ela tinha, e a
desestruturação no `const [user, orders, invoices]` chega com `User`, `Order[]` e `Invoice[]` nos
lugares certos.

<details>
<summary>❌ Ruim: um await espera o outro sem depender dele</summary>

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
<summary>✅ Bom: as três chamadas correm juntas, cada tipo no seu lugar</summary>

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

## O cliente de API deixa quem chama declarar o tipo da resposta

Um cliente com `get<T>` e `post<T>` resolve um problema de posse da informação: o cliente não tem
como saber o que cada rota devolve, mas quem chama sabe. O parâmetro de tipo transporta essa
informação até o retorno, e o `any` deixa de ser necessário.

<details>
<summary>❌ Ruim: fetch direto, e o any se espalha a partir da resposta</summary>

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
<summary>✅ Bom: o cliente é genérico, e quem chama declara o tipo que espera</summary>

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

## O `map` com função async devolve promessas, não valores

`map` não sabe esperar. Ao receber uma função `async`, ele chama a função para cada item, recolhe o
que ela devolveu (uma `Promise`) e monta um array delas. O resultado é um `Promise<User>[]`, e
qualquer tentativa de ler `user.name` ali dentro falha, porque o objeto ainda não chegou.
`Promise.all` em volta do `map` resolve as promessas e devolve os valores.

<details>
<summary>❌ Ruim: o map devolve um array de promessas, e ninguém as aguarda</summary>

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
<summary>✅ Bom: Promise.all aguarda as promessas e entrega os valores</summary>

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
