# React SPA

> Escopo: TypeScript. Guia baseado em **React 19.2** com **TanStack Router 1.170**, **TanStack Query 5.101** e **Zustand 5.0**, sobre [Vite](../setup/vite.md).

Uma **SPA** (Single Page Application · aplicação de página única) é o React puro: o roteamento acontece no navegador, o backend é um projeto separado, e o servidor entrega um HTML vazio que o JavaScript preenche. É o cenário do painel interno, do produto atrás de login, do aplicativo que fala com uma API que já existe.

Três bibliotecas cobrem o que o React não traz. O **TanStack Router** resolve a rota com o tipo checado pelo compilador. O **TanStack Query** cuida do dado que veio do servidor. O **Zustand** guarda o estado que nasce e morre no navegador. A página existe para traçar a linha entre os dois últimos, porque é ali que a maioria dos projetos erra.

Quando o projeto pode renderizar no servidor, [Next.js](react-nextjs.md) resolve as mesmas necessidades com **RSC** (React Server Component · Componente de Servidor) e Server Actions, e nenhuma das três bibliotecas é necessária.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SPA** (Single Page Application · aplicação de página única) | O navegador carrega o app uma vez e troca de tela sem pedir HTML novo ao servidor |
| **server state** (estado do servidor) | Dado que pertence ao backend e chega por rede: pedido, usuário, catálogo |
| **client state** (estado do cliente) | Dado que nasce e morre no navegador: filtro da tela, passo do formulário, tema |
| **TanStack Query** (biblioteca de estado do servidor) | Busca, guarda em cache, revalida e sincroniza o dado que veio da API |
| **TanStack Router** (biblioteca de roteamento tipado) | Resolve a rota, os parâmetros e a busca com o tipo checado em tempo de compilação |
| **Zustand** (biblioteca de estado global) | Store pequena, lida por seletor, sem as cerimônias de action e reducer |
| **query key** (chave da consulta) | O array que identifica o dado no cache e decide o que revalidar |
| **stale time** (tempo até envelhecer) | Quanto tempo o dado em cache é considerado fresco e dispensa nova busca |
| **selector** (seletor) | Função que lê um pedaço da store, e só re-renderiza quando aquele pedaço muda |

## Fluxo de Operação

O roteamento e o acesso a dados acontecem no navegador. O backend é externo, e o `apiClient` é o único ponto que fala com ele.

**Render:** `URL → Router → beforeLoad → loader → ensureQueryData → apiClient → API`

**Interação:** `Ação do usuário → Componente → useMutation → apiClient → API → invalidateQueries`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | A navegação começa no roteador do navegador | navegador |
| **Router** | Resolve a rota e valida os parâmetros contra o tipo declarado | `routes/` |
| **beforeLoad** | Checagem de acesso: roda antes do loader e redireciona quem não pode entrar | `routes/` |
| **loader** | Pede o dado da rota ao cache antes de renderizar a tela | `routes/` |
| **Query** | Guarda o dado do servidor em cache, revalida e devolve o estado de carregamento | `features/` |
| **Store** | Guarda o estado que só existe no navegador | `features/` |
| **Service** | Chama o `apiClient` e transforma a resposta para o tipo da tela | `features/` |
| **Zod** | Valida a resposta no limite entre a API e o sistema | `features/` |
| **apiClient** | Único caller de rede: devolve `Result<T>` | `lib/` |
| **API** | Backend externo (C#, Java, Node, etc.) | backend |

```
routes/
├── __root.tsx                      → layout raiz e providers
├── orders.index.tsx                → loader: pede a lista ao cache
└── orders.$orderId.tsx             → beforeLoad: guard; loader: pede o pedido
features/orders/
├── components/OrderList.tsx        → lê o filtro na store, lê o dado no Query
├── queries/order.queries.ts        → queryOptions: a chave e a função de busca
├── mutations/order.mutations.ts    → useMutation: escreve e invalida a chave
├── stores/order-filter.store.ts    → Zustand: o filtro da tela
├── services/order.service.ts       → chama apiClient, transforma para o tipo da tela
└── schemas/order.schema.ts         → Zod: valida no limite da API
lib/
├── api-client.ts                   → único caller de rede: devolve Result<T>
└── query-client.ts                 → configuração do cache: stale time, retry
```

<a id="server-state-vs-client-state"></a>

## O Query é dono do dado do servidor, e o Zustand do dado do navegador

Esta é a regra que decide o desenho da aplicação inteira. Todo dado que veio da API pertence ao **TanStack Query**, e ele guarda o valor, a data em que buscou, o estado de carregamento e o erro. Todo dado que nasce no navegador pertence ao **Zustand**: o filtro que o usuário escolheu, o passo do assistente, o tema, o item no carrinho antes do checkout.

O erro comum é copiar a resposta do Query para dentro do Zustand, com um `useEffect` no meio. A partir dali existem duas cópias do mesmo pedido: a que o Query revalida e a que a store guarda. Quando o Query busca de novo e o valor muda, a store continua mostrando o valor velho, e ninguém sabe qual das duas a tela está lendo. O bug que nasce daí aparece como um dado que "às vezes não atualiza", e ele é difícil de reproduzir porque depende de quando a revalidação rodou.

O teste para separar os dois é uma pergunta: se dois usuários abrirem esta tela ao mesmo tempo, eles precisam ver o mesmo valor? Se sim, o dado é do servidor, e ele fica no Query. O filtro que um deles digitou é dele, e fica na store.

<details>
<summary>❌ Ruim: a resposta da API é copiada para a store, e passam a existir duas verdades sobre o mesmo pedido</summary>

```ts
// features/orders/stores/order.store.ts
import { create } from "zustand";

interface OrderState {
  orders: OrderView[];
  isLoading: boolean;
  setOrders: (orders: OrderView[]) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  isLoading: false,
  setOrders: (orders) => set({ orders }),
}));
```

```tsx
// features/orders/components/OrderList.tsx
export function OrderList() {
  const { data } = useQuery(ordersQuery());
  const orders = useOrderStore((state) => state.orders);
  const setOrders = useOrderStore((state) => state.setOrders);

  useEffect(() => {
    if (data) setOrders(data);
  }, [data, setOrders]);

  return <OrderTable orders={orders} />;
}
```

A tela lê `orders` da store, e a store só muda quando o efeito roda. O Query revalida em segundo plano, atualiza o cache e a store fica para trás até o próximo render disparar o efeito.

</details>

<details>
<summary>✅ Bom: o Query guarda o pedido, a store guarda o filtro, e cada dado tem um dono só</summary>

```ts
// features/orders/stores/order-filter.store.ts
import { create } from "zustand";
import type { OrderStatus } from "../schemas/order.schema";

type StatusFilter = OrderStatus | "all";

interface OrderFilterState {
  status: StatusFilter;
  searchTerm: string;
  selectStatus: (status: StatusFilter) => void;
  changeSearchTerm: (searchTerm: string) => void;
  clearFilters: () => void;
}

const INITIAL_FILTERS = { status: "all", searchTerm: "" } as const;

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  ...INITIAL_FILTERS,
  selectStatus: (status) => set({ status }),
  changeSearchTerm: (searchTerm) => set({ searchTerm }),
  clearFilters: () => set(INITIAL_FILTERS),
}));
```

```tsx
// features/orders/components/OrderList.tsx
export function OrderList() {
  const status = useOrderFilterStore((state) => state.status);
  const { data: orders, isPending, isError } = useQuery(ordersQuery(status));

  if (isPending) return <OrderListSkeleton />;
  if (isError) return <OrderListError />;

  return <OrderTable orders={orders} />;
}
```

O filtro entra na chave da consulta, então trocar o status busca a lista daquele status e guarda as duas no cache. Voltar para o filtro anterior mostra o resultado na hora, porque ele continua lá.

</details>

<a id="tanstack-query"></a>

## O TanStack Query substitui o hook com três useState

O hook que busca dado com `useState` para o valor, `useState` para o carregamento e `useState` para o erro é o padrão que aparece em [React + Next.js](react-nextjs.md) e em quase todo projeto React. Ele funciona, e cada tela reimplementa o mesmo trio. O que ele não faz é o resto: cache entre telas, revalidação quando a janela volta ao foco, nova tentativa depois de falha de rede, e o cancelamento da busca antiga quando o filtro muda no meio dela.

A busca antiga é o problema que passa despercebido. O usuário digita no filtro, duas buscas saem, e a primeira responde depois da segunda. A tela mostra o resultado do filtro que o usuário já abandonou.

O `queryOptions` guarda a chave e a função de busca num lugar só, e o mesmo objeto serve o componente, o loader da rota e a invalidação depois da escrita.

<details>
<summary>❌ Ruim: três estados, sem cache, sem nova tentativa, e a busca antiga sobrescreve a nova</summary>

```ts
// features/orders/hooks/use-orders.ts
export function useOrders(status: StatusFilter): UseOrdersResult {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders(status)
      .then(setOrders)
      .catch(() => setError("Não foi possível carregar os pedidos."))
      .finally(() => setIsLoading(false));
  }, [status]);

  return { orders, isLoading, error };
}
```

</details>

<details>
<summary>✅ Bom: a chave e a busca ficam num objeto, e o Query cuida do cache e da revalidação</summary>

```ts
// features/orders/queries/order.queries.ts
import { queryOptions } from "@tanstack/react-query";
import { listOrders } from "../services/order.service";
import type { StatusFilter } from "../stores/order-filter.store";

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export function ordersQuery(status: StatusFilter) {
  const options = queryOptions({
    queryKey: ["orders", { status }],
    queryFn: () => listOrders(status),
    staleTime: FIVE_MINUTES_IN_MS,
  });

  return options;
}
```

```ts
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE_IN_MS = 60 * 1000;
const MAX_RETRY_ATTEMPTS = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE_IN_MS,
      retry: MAX_RETRY_ATTEMPTS,
      refetchOnWindowFocus: true,
    },
  },
});
```

O `staleTime` decide quanto tempo o dado é considerado fresco. Em zero, o Query busca de novo a cada vez que um componente monta, e o cache deixa de servir para alguma coisa.

</details>

<a id="mutations"></a>

## A escrita invalida a chave, e o Query busca o dado novo

Depois de criar um pedido, a lista na tela está velha. O `useMutation` escreve, e o `invalidateQueries` marca a chave como envelhecida: o Query busca de novo o que a tela está mostrando naquele momento, e ignora o que ninguém está olhando.

A alternativa manual é atualizar a lista à mão dentro do `onSuccess`, o que reconstrói no cliente o que o servidor já sabe. O total, a numeração e a data de criação vêm do backend, e a cópia montada no navegador diverge dele na primeira regra que mudar.

<details>
<summary>✅ Bom: a escrita invalida a chave, e o dado novo chega do servidor</summary>

```ts
// features/orders/mutations/order.mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder } from "../services/order.service";
import type { CreateOrderInput } from "../schemas/order.schema";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return mutation;
}
```

```tsx
// features/orders/components/CreateOrderForm.tsx
export function CreateOrderForm() {
  const { mutate: createOrder, isPending } = useCreateOrder();

  const submitOrder = (input: CreateOrderInput) => {
    createOrder(input);
  };

  return <OrderForm onSubmit={submitOrder} isSubmitting={isPending} />;
}
```

A chave `["orders"]` invalida a lista inteira, incluindo as variações por filtro que estão no cache. Passar a chave completa (`["orders", { status: "pending" }]`) invalida só aquele filtro, e deixa os outros mostrando dado velho.

</details>

<a id="tanstack-router"></a>

## A rota declara o tipo dos parâmetros, e o compilador cobre o resto

O roteador comum devolve `string | undefined` para todo parâmetro, e a tela descobre no navegador que o `orderId` não veio. O **TanStack Router** declara o formato da rota, e o compilador passa a acusar o link que aponta para um caminho que não existe e o parâmetro que falta.

O `beforeLoad` é o lugar da checagem de acesso, e ele roda antes do loader: quem não pode entrar é redirecionado sem que a busca do dado chegue a sair. O `loader` pede o dado ao cache do Query com `ensureQueryData`, e a tela renderiza com o dado já disponível, sem o piscar do estado de carregamento a cada navegação.

<details>
<summary>❌ Ruim: o parâmetro chega como texto ou ausente, e a validação vira responsabilidade da tela</summary>

```tsx
// features/orders/components/OrderDetail.tsx
export function OrderDetail() {
  const { orderId } = useParams();

  if (!orderId) return <NotFound />;

  const { data: order } = useQuery(orderQuery(orderId));

  return <OrderSummary order={order} />;
}
```

</details>

<details>
<summary>✅ Bom: a rota valida o parâmetro, a checagem de acesso roda antes, e o dado chega pronto</summary>

```tsx
// routes/orders.$orderId.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { orderQuery } from "@/features/orders/queries/order.queries";
import { OrderSummary } from "@/features/orders/components/OrderSummary";

const orderParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export const Route = createFileRoute("/orders/$orderId")({
  params: {
    parse: (params) => orderParamsSchema.parse(params),
  },
  beforeLoad: ({ context }) => {
    const isSignedIn = context.session.isAuthenticated;

    if (!isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(orderQuery(params.orderId));
  },
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { data: order } = useSuspenseQuery(orderQuery(orderId));

  return <OrderSummary order={order} />;
}
```

O `useSuspenseQuery` dispensa a checagem de carregamento no componente, porque o loader já garantiu o dado. O `orderId` chega tipado como `string`, e um UUID malformado na URL é recusado na rota.

</details>

<a id="zustand"></a>

## A store é lida por seletor, e não inteira

Ler a store inteira com `useOrderFilterStore()` faz o componente re-renderizar a cada mudança em qualquer campo dela. O campo de busca digitado re-renderiza a tabela, os botões e o cabeçalho, porque todos leram o mesmo objeto.

O seletor resolve isso: `useOrderFilterStore((state) => state.status)` só acorda o componente quando `status` muda. O componente que lê dois campos usa dois seletores, e o que precisa de vários campos de uma vez usa `useShallow`, que compara campo a campo em vez de comparar a identidade do objeto.

A store fica pequena. Uma store por assunto (o filtro dos pedidos, a sessão, o tema) lê melhor do que uma store única que junta tudo, e o seletor de uma store pequena é mais difícil de errar.

<details>
<summary>❌ Ruim: o componente lê a store inteira, e cada tecla digitada re-renderiza a tabela</summary>

```tsx
// features/orders/components/OrderFilters.tsx
export function OrderFilters() {
  const { status, searchTerm, selectStatus, changeSearchTerm } = useOrderFilterStore();

  return (
    <FilterBar
      status={status}
      searchTerm={searchTerm}
      onStatusChange={selectStatus}
      onSearchChange={changeSearchTerm}
    />
  );
}
```

</details>

<details>
<summary>✅ Bom: cada campo entra por um seletor, e o componente acorda só quando aquele campo muda</summary>

```tsx
// features/orders/components/OrderFilters.tsx
import { useShallow } from "zustand/react/shallow";
import { useOrderFilterStore } from "../stores/order-filter.store";

export function OrderFilters() {
  const { status, searchTerm } = useOrderFilterStore(
    useShallow((state) => ({ status: state.status, searchTerm: state.searchTerm })),
  );
  const selectStatus = useOrderFilterStore((state) => state.selectStatus);
  const changeSearchTerm = useOrderFilterStore((state) => state.changeSearchTerm);

  return (
    <FilterBar
      status={status}
      searchTerm={searchTerm}
      onStatusChange={selectStatus}
      onSearchChange={changeSearchTerm}
    />
  );
}
```

As funções que escrevem na store (`selectStatus`, `changeSearchTerm`) têm identidade estável, e lê-las por seletor não provoca render.

</details>

<a id="persistence"></a>

## A store persistida guarda o que o usuário escolheu, e nunca a sessão

O `persist` do Zustand grava a store no `localStorage`, e a escolha do usuário sobrevive ao recarregar a página. Serve para o tema, o idioma e o layout da tabela.

O token de sessão fica fora dessa lista. Qualquer script que rode na página lê o `localStorage`, e um **XSS** (Cross-Site Scripting · injeção de script na página) transforma o token guardado ali em sessão roubada. O token pertence a um cookie `HttpOnly`, que o JavaScript não alcança.

<details>
<summary>✅ Bom: a store persistida guarda a preferência de exibição, e o campo de sessão fica de fora</summary>

```ts
// features/settings/stores/preferences.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface PreferencesState {
  theme: Theme;
  rowsPerPage: number;
  changeTheme: (theme: Theme) => void;
  changeRowsPerPage: (rowsPerPage: number) => void;
}

const DEFAULT_ROWS_PER_PAGE = 25;
const PREFERENCES_STORAGE_KEY = "acme.preferences";

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "light",
      rowsPerPage: DEFAULT_ROWS_PER_PAGE,
      changeTheme: (theme) => set({ theme }),
      changeRowsPerPage: (rowsPerPage) => set({ rowsPerPage }),
    }),
    { name: PREFERENCES_STORAGE_KEY },
  ),
);
```

</details>

## Próximos passos

- [TanStack Table](tanstack-table.md): colunas, ordenação, paginação e virtualização.
- [Vite](../setup/vite.md): o build, as variáveis de ambiente e a divisão do pacote.
- [React + Next.js](react-nextjs.md): o mesmo problema resolvido com render no servidor.
- [Arquitetura de componentes](../../shared/architecture/component-architecture.md): quando o estado global vale o custo.
