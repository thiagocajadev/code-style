# Vue + Nuxt

> Escopo: TypeScript. Guia baseado em **Vue 3.5** (LTS) com **Nuxt 4.4** e **Pinia 3**.

Vue é uma library reativa de **UI** (User Interface · Interface do Usuário). Nuxt é o framework: roteamento por arquivo, server routes, middleware e otimizações de build integradas. Este guia mostra como implementar os contratos de [operation-flow.md](../../shared/architecture/operation-flow.md) e [frontend-flow.md](../../shared/architecture/frontend-flow.md) com Vue moderno e Nuxt 4.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SFC** (Single File Component · Componente em Arquivo Único) | Arquivo `.vue` com `<template>`, `<script setup>` e `<style>` no mesmo módulo |
| **Composition API** (API de Composição) | Estilo de autoria que organiza a lógica do componente em funções reativas, sem `this` |
| **`<script setup>`** (bloco setup do SFC) | Açúcar de compilação que executa o bloco como `setup()` e expõe identificadores ao template |
| **`ref`** (referência reativa) | Container reativo para primitivos: leitura e escrita via `.value` no script, automático no template |
| **`reactive`** (objeto reativo) | Proxy reativo para objetos: campos acessados diretamente, sem `.value` |
| **`computed`** (derivado) | Valor reativo calculado a partir de outras fontes: recalcula quando os inputs mudam |
| **`watch`** / **`watchEffect`** (observadores reativos) | Observadores que disparam quando o valor reativo muda: sincronização com sistemas externos |
| **`defineModel`** (macro de `v-model`) | Macro de `v-model` em componentes filhos: cria a prop e o evento de update juntos |
| **Composable** (composável) | Função que começa com `use`, encapsula estado reativo e lógica reutilizável (análogo a hook) |
| **Pinia** (biblioteca de state management do Vue) | Store oficial do Vue 3: tipada por inferência, suporta setup syntax e devtools |
| **Smart Component** (componente inteligente) | Componente que orquestra dados e estado, delega renderização a **Dumb Components** |
| **Dumb Component** (componente de apresentação) | Componente que recebe dados via `defineProps` e emite eventos via `defineEmits`; sem lógica de negócio |
| **Route Middleware** (proteção de rota Nuxt) | Função executada antes de qualquer página montar, definida em `middleware/` |
| **Server Route** (rota de servidor Nuxt) | Handler em `server/api/`, executado pelo Nitro como endpoint **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) |
| **HMAC** (Hash-based Message Authentication Code, Código de Autenticação de Mensagem Baseado em Hash) | Mecanismo que valida origem e integridade de um webhook comparando assinaturas com segredo compartilhado |

## Fluxo de Operação

Vue funciona como library pura (SPA com Vite + Vue Router) ou como base do Nuxt (fullstack com server routes). O slice `features/` é o mesmo nos dois cenários; o que muda é como cada artefato acessa dados.

### Vue como SPA

Vue cuida da **UI**. Roteamento via Vue Router, acesso a dados via `apiClient` apontando para qualquer backend (C#, Java, Node).

**Render:** `URL → Vue Router → Guard → Page → Composable → Service → apiClient → API`

**Interação:** `User Action → Component → Composable → Service → apiClient → API`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | Navegação inicia a resolução da rota no Vue Router | navegador |
| **Vue Router** | Mapeia a URL para guard e page component | `core/` |
| **Guard** | `beforeEnter` da rota; verifica autenticação antes da page montar | `core/` |
| **Page** | Smart Component da rota: orquestra estado, monta componentes | `features/` |
| **Composable** | Encapsula estado de **UI** (`data`, `error`, `isLoading`) | `features/` |
| **Service** | Chama apiClient e transforma para view type | `features/` |
| **apiClient** | Único caller de rede: retorna `Result<T>` | `lib/` |
| **Zod** | Valida os dados no limite entre a API e o sistema | `features/` |
| **API** | Backend externo | backend |

### Nuxt fullstack

Nuxt é frontend e backend. `pages/index.vue` acessa o banco diretamente via Repository em `useAsyncData`, sem passar pela própria **API** (Application Programming Interface · Interface de Programação de Aplicações). Server routes existem para clientes externos (mobile, integrações B2B). Componentes e composables funcionam igual ao cenário SPA para interações client-side.

**Leitura:** `URL → middleware → page.vue → useAsyncData → Repository → render`

**Escrita:** `Submit → Server Route → Zod → Repository → updateTag → Result`

**Webhook:** `POST → server/api/.post.ts → HMAC → idempotência → 200 OK → enqueue → Worker`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | Navegação inicia a resolução da rota no Nuxt | navegador |
| **middleware** | Guard executado antes de qualquer page montar | `middleware/` |
| **page.vue** | Smart Component da rota: acessa Repository via `useAsyncData` | `app/pages/` |
| **Server Route** | Handler em `server/api/`: valida, persiste, invalida cache | `server/api/` |
| **Zod** | Schema compartilhado: valida no cliente e no servidor | `shared/schemas/` |
| **Service** | Regras de negócio; transforma dados para persistência ou resposta | `features/` |
| **Repository** | Acesso direto ao banco: queries e mutações | `features/` |
| **updateTag** | Invalida cache após escrita: garante read-your-writes | `features/` |
| **HMAC** | Valida assinatura do webhook sobre o raw body | `server/api/webhooks/` |
| **enqueue** | Adiciona job à fila para processamento assíncrono | `server/utils/` |
| **Worker** | Consome e executa o job de forma independente | externo |
| **Response** | `defineEventHandler` retorna objeto JSON com status explícito | `server/api/` |

## Estrutura de pastas

Vue deixa a estrutura por sua conta. O Nuxt 4 já vem com a separação entre `app/` (o que roda no cliente) e `server/` (o que roda no servidor). Dentro delas, a organização é por funcionalidade: cada fatia reúne as páginas, os componentes, os composables, as stores e os schemas do mesmo assunto. Middleware e server routes ficam em pastas próprias, porque são infraestrutura que atende o sistema inteiro.

```
app/
├── pages/
│   └── orders/[id].vue                → page: orquestra useAsyncData + componentes
├── features/
│   └── orders/
│       ├── components/
│       │   ├── OrderDetail.vue         → Dumb: defineProps, defineEmits
│       │   └── CreateOrderForm.vue     → Smart: useForm, dispara Server Route
│       ├── composables/use-orders.ts   → estado de UI: data, error, isLoading
│       ├── stores/order.ts             → Pinia: estado global tipado
│       ├── services/order.ts           → chama apiClient, transforma view type
│       └── schemas/order.ts            → Zod: contrato cliente/servidor
├── middleware/
│   ├── auth.ts                         → defineNuxtRouteMiddleware: verifica sessão
│   └── role.ts                         → defineNuxtRouteMiddleware: verifica papel
└── plugins/
    └── api-client.ts                   → registra apiClient como provide global
server/
├── api/
│   ├── orders/
│   │   ├── index.get.ts                → GET /api/orders: listAll
│   │   ├── index.post.ts               → POST /api/orders: cria, valida com Zod
│   │   └── [id].get.ts                 → GET /api/orders/:id
│   └── webhooks/
│       └── [provider].post.ts          → Webhook Handler: HMAC, idempotência, enqueue
├── repositories/order.ts               → acesso ao banco (Prisma, Drizzle, etc.)
└── utils/
    ├── queue.ts                        → enfileira jobs
    └── verify-signature.ts             → timingSafeEqual sobre raw body
shared/
└── schemas/order.ts                    → Zod compartilhado app/ ↔ server/
```

## O componente usa `<script setup>`

O padrão é o **SFC** com `<script setup lang="ts">`. Ele dispensa o `setup()` escrito à mão, o
`return` que expunha cada variável ao template e o `defineComponent` em volta de tudo: o que você
declara no bloco já está visível para o template. As props seguem a regra do TypeScript, e a partir
de três campos ganham uma interface própria com o sufixo `Props`.

<details>
<summary>❌ Ruim: Options API, props declaradas como tipo solto e tipagem fraca</summary>

```vue
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    id: String,
    status: String,
    total: Number,
    customerName: String,
  },
});
</script>

<template>
  <div>{{ customerName }}: {{ total }}</div>
</template>
```

</details>

<details>
<summary>✅ Bom: `<script setup>` com interface separada e sufixo Props</summary>

```vue
<script setup lang="ts">
interface OrderCardProps {
  id: string;
  status: OrderStatus;
  total: number;
  customerName: string;
}

const { customerName, total } = defineProps<OrderCardProps>();
</script>

<template>
  <article class="order-card">
    <h2>{{ customerName }}</h2>
    <p>{{ total }}</p>
  </article>
</template>
```

</details>

## Estado reativo: `ref`, `computed` e `watch`

`ref` guarda um valor que muda, `computed` calcula um valor a partir de outros, e `watch` reage a
uma mudança para falar com o mundo de fora (o DOM, o `localStorage`, o analytics).

O erro comum é usar `watch` para manter dois valores reativos em sincronia, recalculando o total
sempre que a lista muda. Isso é o trabalho do `computed`, que declara a relação uma vez e recalcula
sozinho, sem que ninguém precise lembrar de disparar a atualização. O `watch` escrito para isso é
uma cópia manual dessa mesma lógica, e ela sai de sincronia no dia em que alguém alterar a lista por
outro caminho.

Prefira `ref` por padrão, inclusive para objetos: o acesso é sempre por `.value` no script e sempre
direto no template, e essa consistência evita a dúvida a cada leitura. `reactive` cabe em grupos de
campos que andam juntos.

<details>
<summary>❌ Ruim: o total é recalculado à mão dentro de um watch</summary>

```vue
<script setup lang="ts">
import { ref, watch } from "vue";

const items = ref<CartItem[]>([]);
const total = ref(0);

watch(items, (currentItems) => {
  total.value = currentItems.reduce((sum, item) => sum + item.price * item.qty, 0);
});

function addItem(item: CartItem): void {
  items.value.push(item);
}
</script>
```

</details>

<details>
<summary>✅ Bom: o `computed` deriva o total, e a lista é substituída por uma cópia nova</summary>

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const items = ref<CartItem[]>([]);
const total = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.qty, 0),
);

function addItem(item: CartItem): void {
  const nextItems = [...items.value, item];
  items.value = nextItems;
}

function clearCart(): void {
  items.value = [];
}
</script>

<template>
  <section>
    <p>Total: {{ total }}</p>
    <button type="button" @click="clearCart">Limpar</button>
  </section>
</template>
```

</details>

### Props podem ser desestruturadas direto (Vue 3.5)

Até o Vue 3.4, desestruturar as props no `<script setup>` quebrava a reatividade: o valor era copiado
uma vez e não acompanhava mais as mudanças, e por isso existia o `toRefs`. O Vue 3.5 mudou isso, e a
desestruturação passou a manter a reatividade, inclusive com valor padrão. O `toRefs` deixou de ser
necessário nesse caso.

<details>
<summary>❌ Ruim: `toRefs` mantido por hábito, do tempo em que era obrigatório</summary>

```vue
<script setup lang="ts">
import { toRefs, computed } from "vue";

interface PriceTagProps {
  price: number;
  currency: string;
}

const props = defineProps<PriceTagProps>();
const { price, currency } = toRefs(props);

const formatted = computed(() => `${currency.value} ${price.value.toFixed(2)}`);
</script>
```

</details>

<details>
<summary>✅ Bom: desestrutura direto, com valor padrão, e a reatividade continua</summary>

```vue
<script setup lang="ts">
import { computed } from "vue";

interface PriceTagProps {
  price: number;
  currency?: string;
}

const { price, currency = "BRL" } = defineProps<PriceTagProps>();
const formatted = computed(() => `${currency} ${price.toFixed(2)}`);
</script>

<template>
  <span class="price-tag">{{ formatted }}</span>
</template>
```

</details>

## Smart e Dumb Components

O pipeline de [operation-flow.md](../../shared/architecture/operation-flow.md) se mapeia direto: **Smart Component** chama o **Composable**, que chama o **Service**, que chama o `apiClient`. **Dumb Component** recebe dados via `defineProps` e emite eventos via `defineEmits`.

Fluxo: `Smart → defineProps → Dumb → defineEmits → Smart`

<details>
<summary>❌ Ruim: o componente de lista carrega a regra de negócio dentro dele</summary>

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/lib/api-client";

const orders = ref<Order[]>([]);

onMounted(async () => {
  const result = await apiClient.get<Order[]>("/orders");
  if (result.success) {
    orders.value = result.data.filter((o) => o.status !== "cancelled");
  }
});

async function cancelOrder(id: string): Promise<void> {
  await apiClient.delete(`/orders/${id}`);
  orders.value = orders.value.filter((o) => o.id !== id);
}
</script>
```

</details>

<details>
<summary>✅ Bom: Smart orquestra com composable; Dumb apresenta</summary>

```vue
<!-- Smart Component: pages/orders/index.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { useOrders } from "@/features/orders/composables/use-orders";
import OrderList from "@/features/orders/components/OrderList.vue";

const { orders, cancelOrder } = useOrders();
const activeOrders = computed(() =>
  orders.value.filter((order) => order.status !== "cancelled"),
);
</script>

<template>
  <OrderList :orders="activeOrders" @cancel="cancelOrder" />
</template>
```

```vue
<!-- Dumb Component: features/orders/components/OrderList.vue -->
<script setup lang="ts">
interface OrderListProps {
  orders: Order[];
}

defineProps<OrderListProps>();

const emit = defineEmits<{
  cancel: [orderId: string];
}>();

function handleCancel(orderId: string): void {
  emit("cancel", orderId);
}
</script>

<template>
  <ul>
    <li v-for="order in orders" :key="order.id">
      {{ order.id }}: {{ order.total }}
      <button type="button" @click="handleCancel(order.id)">Cancelar</button>
    </li>
  </ul>
</template>
```

</details>

### `defineModel` para o `v-model` no componente filho

Até o Vue 3.4, aceitar `v-model` em um componente filho exigia declarar a prop `modelValue` e o
evento `update:modelValue` à mão, e lembrar de emitir o evento a cada mudança. `defineModel` cria os
dois de uma vez e devolve uma referência que se escreve direto.

<details>
<summary>❌ Ruim: a prop e o evento declarados um a um</summary>

```vue
<script setup lang="ts">
interface SearchInputProps {
  modelValue: string;
}

const props = defineProps<SearchInputProps>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <input :value="modelValue" @input="onInput" />
</template>
```

</details>

<details>
<summary>✅ Bom: `defineModel` cria prop e evento juntos</summary>

```vue
<script setup lang="ts">
const searchTerm = defineModel<string>({ required: true });
</script>

<template>
  <input v-model="searchTerm" type="search" placeholder="Buscar pedido..." />
</template>
```

</details>

## O caminho é componente, composable, service, apiClient

O composable guarda o estado da tela (`data`, `error`, `isLoading`) e não sabe de rede. O **Service**
aplica a regra e transforma o dado no formato que a tela usa. O `apiClient` é o único lugar que fala
com a rede.

Com `fetch` e `ref` dentro do componente, as três responsabilidades ficam no mesmo arquivo: a chamada
não é reaproveitável, o tratamento de erro se repete a cada tela, e testar a regra exige montar o
componente.

O nome do composable começa com `use`, e o retorno vira interface quando tem três valores ou mais.

<details>
<summary>❌ Ruim: fetch, estado e regra dentro do componente</summary>

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";

const orders = ref<Order[]>([]);

onMounted(async () => {
  const response = await fetch("/api/orders");
  orders.value = await response.json();
});
</script>
```

</details>

<details>
<summary>✅ Bom: composable encapsula estado; service encapsula chamada de rede</summary>

```ts
// features/orders/services/order.ts
import { apiClient } from "@/lib/api-client";
import type { OrderView } from "@/features/orders/types";

export async function listOrders(): Promise<OrderView[]> {
  const result = await apiClient.get<Order[]>("/orders");
  if (!result.success) {
    return [];
  }

  const orderViews = result.data.map(toOrderView);
  return orderViews;
}
```

```ts
// features/orders/composables/use-orders.ts
import { ref, onMounted } from "vue";
import { listOrders } from "@/features/orders/services/order";
import type { OrderView } from "@/features/orders/types";

interface UseOrdersResult {
  orders: Ref<OrderView[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
}

export function useOrders(): UseOrdersResult {
  const orders = ref<OrderView[]>([]);
  const isLoading = ref(true);
  const error = ref<string | null>(null);

  async function fetchOrders(): Promise<void> {
    try {
      const fetched = await listOrders();
      orders.value = fetched;
    } catch {
      error.value = "Não foi possível carregar os pedidos.";
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(fetchOrders);

  const ordersResult = { orders, isLoading, error };
  return ordersResult;
}
```

```vue
<!-- components/OrderList.vue -->
<script setup lang="ts">
import { useOrders } from "@/features/orders/composables/use-orders";

const { orders, isLoading, error } = useOrders();
</script>

<template>
  <Skeleton v-if="isLoading" />
  <ErrorMessage v-else-if="error" :message="error" />
  <ul v-else>
    <li v-for="order in orders" :key="order.id">{{ order.customerName }}</li>
  </ul>
</template>
```

</details>

## Pinia: o estado que atravessa rotas

Pinia é a store oficial do Vue 3, e a **setup syntax** dela fala a mesma língua do `<script setup>`:
`ref` para o estado, `computed` para os valores derivados, funções para as ações. Os tipos saem da
inferência, sem nenhuma casca em volta.

A Pinia serve ao estado que várias rotas compartilham: a sessão do usuário, o carrinho, as
preferências. O estado que só uma página usa fica no composable dela, que morre junto com a página.
Colocá-lo na store faz o valor sobreviver à navegação, e a tela reabre com o dado da visita anterior.

<details>
<summary>❌ Ruim: a store escrita em Options API, e os getters perdem o tipo</summary>

```ts
// stores/cart.ts
import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [] as CartItem[],
  }),
  getters: {
    total: (state) => state.items.reduce((sum, item) => sum + item.price, 0),
  },
  actions: {
    add(item: CartItem) {
      this.items.push(item);
    },
  },
});
```

</details>

<details>
<summary>✅ Bom: setup syntax, tipos inferidos, e a escrita troca a lista por uma cópia nova</summary>

```ts
// stores/cart.ts
import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);
  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.qty, 0),
  );

  function addItem(item: CartItem): void {
    const nextItems = [...items.value, item];
    items.value = nextItems;
  }

  function clearCart(): void {
    items.value = [];
  }

  const cartApi = { items, total, addItem, clearCart };
  return cartApi;
});
```

```vue
<!-- components/CartSummary.vue -->
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCartStore } from "@/features/cart/stores/cart";

const cartStore = useCartStore();
const { total } = storeToRefs(cartStore);
</script>

<template>
  <p>Total: {{ total }}</p>
  <button type="button" @click="cartStore.clearCart">Limpar carrinho</button>
</template>
```

</details>

`storeToRefs` preserva reatividade ao destructurar state e getters; actions podem ser destructuradas direto da store, sem perder o `this` interno.

## A checagem de acesso mora no middleware, antes de qualquer render

A verificação de autenticação e de permissão fica em `middleware/`, e roda antes de a página montar,
como manda o [frontend-flow.md](../../shared/architecture/frontend-flow.md).

Feita dentro do componente, ela chega tarde. O componente monta, o `onMounted` roda depois, e o
redirecionamento acontece por último. Nesse intervalo o conteúdo restrito já foi pintado na tela, e
o usuário sem permissão chega a vê-lo antes de ser mandado embora.

`defineNuxtRouteMiddleware` vale para o app inteiro (em `middleware/global.global.ts`) ou para uma
página só, declarado em `definePageMeta({ middleware: 'auth' })`.

<details>
<summary>❌ Ruim: a checagem no componente deixa o conteúdo aparecer antes do redirecionamento</summary>

```vue
<script setup lang="ts">
import { useAuth } from "@/features/auth/composables/use-auth";

const { user } = useAuth();
const router = useRouter();

watchEffect(() => {
  if (!user.value) {
    router.push("/login");
  }
});
</script>

<template>
  <Dashboard />
</template>
```

</details>

<details>
<summary>✅ Bom: `defineNuxtRouteMiddleware` antes de qualquer render</summary>

```ts
// middleware/auth.ts
import { useSession } from "@/features/auth/composables/use-session";

export default defineNuxtRouteMiddleware(async (route) => {
  const session = await useSession();

  if (!session.value) {
    const loginRedirect = navigateTo("/login");
    return loginRedirect;
  }
});
```

```ts
// middleware/role.ts
export default defineNuxtRouteMiddleware((route) => {
  const requiredRole = route.meta.role as UserRole | undefined;
  const session = useSessionState();

  if (requiredRole && !session.value?.roles.includes(requiredRole)) {
    const forbiddenRedirect = navigateTo("/forbidden");
    return forbiddenRedirect;
  }
});
```

```vue
<!-- pages/admin/users.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  role: "admin",
});
</script>

<template>
  <AdminUsersPage />
</template>
```

</details>

## O formulário valida com o mesmo schema no cliente e no servidor

O fluxo de [frontend-flow.md](../../shared/architecture/frontend-flow.md) vale aqui inteiro. O schema
Zod é a única declaração das regras do formulário, e os dois lados o usam: o cliente para avisar o
usuário na hora, o servidor para não confiar no que chegou. A **Server Route** executa a escrita na
ordem de sempre: valida, aplica a regra, persiste, devolve o resultado.

O erro volta estruturado, campo a campo, e é isso que permite à tela mostrar a mensagem embaixo do
input que a causou. Um `ok: false` sozinho obriga o formulário a exibir um aviso genérico, e o
usuário fica procurando qual campo errou.

<details>
<summary>❌ Ruim: validação escrita à mão, sem schema, e o erro volta sem estrutura</summary>

```vue
<script setup lang="ts">
import { ref } from "vue";

const productId = ref("");
const quantity = ref(1);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
  if (!productId.value || quantity.value < 1) {
    error.value = "Inválido";
    return;
  }

  await $fetch("/api/orders", {
    method: "POST",
    body: { productId: productId.value, quantity: quantity.value },
  });
}
</script>
```

</details>

<details>
<summary>✅ Bom: schema compartilhado, useFetch tipado, erros por campo</summary>

```ts
// shared/schemas/order.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface CreateOrderResult {
  ok: boolean;
  orderId?: string;
  fieldErrors?: Partial<Record<keyof CreateOrderInput, string[]>>;
  formError?: string;
}
```

```vue
<!-- features/orders/components/CreateOrderForm.vue -->
<script setup lang="ts">
import { reactive, ref } from "vue";
import {
  createOrderSchema,
  type CreateOrderInput,
  type CreateOrderResult,
} from "@/shared/schemas/order";

const formState = reactive<CreateOrderInput>({
  productId: "",
  quantity: 1,
});

const isSubmitting = ref(false);
const result = ref<CreateOrderResult | null>(null);

async function submit(): Promise<void> {
  const parsed = createOrderSchema.safeParse(formState);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    result.value = { ok: false, fieldErrors };
    return;
  }

  isSubmitting.value = true;

  const submission = await $fetch<CreateOrderResult>("/api/orders", {
    method: "POST",
    body: parsed.data,
  });

  result.value = submission;
  isSubmitting.value = false;
}
</script>

<template>
  <form @submit.prevent="submit">
    <fieldset :disabled="isSubmitting">
      <input
        v-model="formState.productId"
        type="text"
        aria-describedby="productId-error"
      />
      <span
        v-if="result?.fieldErrors?.productId"
        id="productId-error"
      >
        {{ result.fieldErrors.productId[0] }}
      </span>

      <input
        v-model.number="formState.quantity"
        type="number"
        min="1"
        aria-describedby="quantity-error"
      />
      <span
        v-if="result?.fieldErrors?.quantity"
        id="quantity-error"
      >
        {{ result.fieldErrors.quantity[0] }}
      </span>

      <p v-if="result?.formError" role="alert">{{ result.formError }}</p>

      <button type="submit">
        {{ isSubmitting ? "Enviando..." : "Criar pedido" }}
      </button>
    </fieldset>
  </form>
</template>
```

</details>

`<fieldset :disabled>` cobre todos os campos durante a requisição: previne double-submit (envio duplicado) sem desabilitar cada input individualmente.

## As rotas de servidor do Nuxt

As rotas ficam em `server/api/[recurso].[método].ts`, e o nome do arquivo declara o método
**HTTP**: `index.post.ts` responde a `POST /api/orders`. O caminho dentro da rota é o do
[operation-flow.md](../../shared/architecture/operation-flow.md): valida com Zod, aplica a regra,
persiste, devolve a resposta tipada.

`readValidatedBody` faz a leitura do corpo e a validação em um passo só, o que dispensa converter o
JSON e depois validá-lo em duas linhas separadas.

<details>
<summary>❌ Ruim: regra de negócio dentro da rota, sem schema, e o status escrito na mão</summary>

```ts
// server/api/orders/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.productId || !body.quantity) {
    throw createError({ statusCode: 400, statusMessage: "Invalid" });
  }

  const order = await db.orders.create({ data: body });
  return order;
});
```

</details>

<details>
<summary>✅ Bom: schema Zod, repository, resposta estruturada</summary>

```ts
// server/api/orders/index.post.ts
import { createOrderSchema } from "@/shared/schemas/order";
import { orderRepository } from "@/server/repositories/order";

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, createOrderSchema.safeParse);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorPayload = { ok: false, fieldErrors };

    setResponseStatus(event, 422);
    return errorPayload;
  }

  const order = await orderRepository.create(parsed.data);
  const successPayload = { ok: true, orderId: order.id };

  setResponseStatus(event, 201);
  return successPayload;
});
```

```ts
// server/api/orders/index.get.ts
import { orderRepository } from "@/server/repositories/order";

export default defineEventHandler(async () => {
  const orders = await orderRepository.listAll();
  return orders;
});
```

</details>

## O handler de webhook

O handler segue o fluxo de [backend-flow.md](../../shared/architecture/backend-flow.md): pega o
corpo cru da requisição antes de qualquer conversão, confere a assinatura **HMAC**, verifica se
aquele evento já foi recebido, responde 200 e só então processa.

Duas regras não abrem exceção. A primeira é responder 200 antes de processar: provedores como Stripe
e GitHub reenviam o evento se a resposta demorar mais de 30 segundos, e um processamento lento vira
evento duplicado. A segunda é calcular o **HMAC** sobre o corpo cru. Converter o **JSON** primeiro
reordena campos e muda espaços, e a assinatura calculada sobre esse texto não bate mais com a que o
provedor enviou.

```
POST /api/webhooks/[provider] → captura raw body → valida HMAC → checa idempotência → 200 OK → enfileira → processa
```

<details>
<summary>❌ Ruim: assina o JSON já convertido, compara com ===, e processa antes de responder</summary>

```ts
// server/api/webhooks/[provider].post.ts
import { createHmac } from "node:crypto";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const signature = getHeader(event, "x-signature");

  const expected = createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(JSON.stringify(body))
    .digest("hex");

  if (expected !== signature) {
    throw createError({ statusCode: 401 });
  }

  await processWebhookPayload(body);
  return { ok: true };
});
```

</details>

<details>
<summary>✅ Bom: raw body, timingSafeEqual, idempotência, 200 antes de enfileirar</summary>

```ts
// server/api/webhooks/[provider].post.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { webhookRepository } from "@/server/repositories/webhook";
import { jobQueue } from "@/server/utils/queue";

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event);
  const receivedSignature = getHeader(event, "x-signature") ?? "";
  const eventId = getHeader(event, "x-event-id") ?? "";

  const expectedSignature = createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(rawBody ?? "")
    .digest("hex");

  const signaturesMatch =
    expectedSignature.length === receivedSignature.length &&
    timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    );

  if (!signaturesMatch) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const alreadyReceived = await webhookRepository.findByEventId(eventId);

  if (alreadyReceived) {
    const duplicateAck = { ok: true };
    return duplicateAck;
  }

  await webhookRepository.save({ eventId, rawBody });
  await jobQueue.enqueue("webhook.process", { eventId });

  const acceptedAck = { ok: true };
  return acceptedAck;
});
```

</details>

A checagem de comprimento antes do `timingSafeEqual` é obrigatória: a função lança exceção quando os dois buffers têm tamanhos diferentes. Devolver 200 para um evento repetido é o contrato certo, e não é omissão: o provedor precisa saber que a entrega chegou, e o que ele faz com essa informação é parar de reenviar.

## Cache com `defineCachedEventHandler` e `useFetch`

No Nuxt 4, nada é guardado em cache sem que alguém peça: toda rota é dinâmica, e o cache é declarado
handler a handler, ou chamada a chamada. `defineCachedEventHandler` cuida do lado do servidor, e o
`useFetch` traz cache integrado no cliente.

`maxAge` diz por quanto tempo o dado vale, o **TTL** (Time-To-Live · Tempo de Vida). `swr`
(stale-while-revalidate) entrega o dado vencido de imediato e busca a versão nova em segundo plano,
o que troca uma espera do usuário por um dado alguns segundos velho. As tags dão nome ao dado, e é
por elas que ele é descartado depois, com `useStorage('cache').removeItem()` ou com os utilitários
do Nitro.

<details>
<summary>✅ Bom: handler cacheado com TTL, SWR e tag</summary>

```ts
// server/api/orders/index.get.ts
import { orderRepository } from "@/server/repositories/order";

export default defineCachedEventHandler(
  async () => {
    const orders = await orderRepository.listAll();
    return orders;
  },
  {
    maxAge: 60 * 60,
    swr: true,
    name: "orders",
    getKey: () => "list",
  },
);
```

</details>

<details>
<summary>✅ Bom: useFetch com transform e key estável para deduplicação</summary>

```vue
<!-- pages/orders/index.vue -->
<script setup lang="ts">
import type { Order } from "@/features/orders/types";

const { data: orders, error, refresh } = await useFetch<Order[]>("/api/orders", {
  key: "orders-list",
  transform: (response) => response.filter((order) => order.status !== "draft"),
});
</script>

<template>
  <ErrorMessage v-if="error" :message="error.message" />
  <OrderList v-else :orders="orders ?? []" @refresh="refresh" />
</template>
```

</details>

<details>
<summary>✅ Bom: Server Route invalida cache após escrita</summary>

```ts
// server/api/orders/index.post.ts
import { createOrderSchema } from "@/shared/schemas/order";
import { orderRepository } from "@/server/repositories/order";

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, createOrderSchema.safeParse);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorPayload = { ok: false, fieldErrors };

    setResponseStatus(event, 422);
    return errorPayload;
  }

  const order = await orderRepository.create(parsed.data);
  const cacheStorage = useStorage("cache");

  await cacheStorage.removeItem("nitro:functions:orders:list.json");

  const successPayload = { ok: true, orderId: order.id };
  return successPayload;
});
```

</details>

`useFetch` junta em uma só as requisições que compartilham a mesma `key`: dois componentes pedindo `orders-list` ao mesmo tempo geram uma chamada, e os dois recebem o resultado dela. Para cache no servidor com descarte por nome, use `defineCachedEventHandler` com o `name` declarado. Para buscar no cliente e aproveitar o que veio renderizado do servidor, use `useFetch`.
