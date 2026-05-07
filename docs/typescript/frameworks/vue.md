# Vue + Nuxt

> Escopo: TypeScript. Guia baseado em **Vue 3.5** (LTS) com **Nuxt 4.4** e **Pinia 3**.

Vue é uma library reativa de **UI** (User Interface, Interface do Usuário). Nuxt é o framework: roteamento por arquivo, server routes, middleware e otimizações de build integradas. Este guia mostra como implementar os contratos de [operation-flow.md](../../shared/architecture/operation-flow.md) e [frontend-flow.md](../../shared/architecture/frontend-flow.md) com Vue moderno e Nuxt 4.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SFC** (Single File Component, Componente em Arquivo Único) | Arquivo `.vue` com `<template>`, `<script setup>` e `<style>` no mesmo módulo |
| **Composition API** (API de Composição) | Estilo de autoria que organiza a lógica do componente em funções reativas, sem `this` |
| **`<script setup>`** | Açúcar de compilação que executa o bloco como `setup()` e expõe identificadores ao template |
| **`ref`** | Container reativo para primitivos: leitura e escrita via `.value` no script, automático no template |
| **`reactive`** | Proxy reativo para objetos: campos acessados diretamente, sem `.value` |
| **`computed`** (derivado) | Valor reativo calculado a partir de outras fontes: recalcula quando os inputs mudam |
| **`watch`** / **`watchEffect`** | Observadores que disparam quando o valor reativo muda: sincronização com sistemas externos |
| **`defineModel`** | Macro de `v-model` em componentes filhos: cria a prop e o evento de update juntos |
| **Composable** (composável) | Função que começa com `use`, encapsula estado reativo e lógica reutilizável (análogo a hook) |
| **Pinia** | Store oficial do Vue 3: tipada por inferência, suporta setup syntax e devtools |
| **Smart Component** (componente inteligente) | Componente que orquestra dados e estado, delega renderização a **Dumb Components** |
| **Dumb Component** (componente de apresentação) | Componente que recebe dados via `defineProps` e emite eventos via `defineEmits`; sem lógica de negócio |
| **Route Middleware** (proteção de rota Nuxt) | Função executada antes de qualquer página montar, definida em `middleware/` |
| **Server Route** (rota de servidor Nuxt) | Handler em `server/api/`, executado pelo Nitro como endpoint **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) |
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
| **Zod** | Valida dados na fronteira da API | `features/` |
| **API** | Backend externo | backend |

### Nuxt fullstack

Nuxt é frontend e backend. `pages/index.vue` acessa o banco diretamente via Repository em `useAsyncData`, sem passar pela própria **API** (Application Programming Interface, Interface de Programação de Aplicações). Server routes existem para clientes externos (mobile, integrações B2B). Componentes e composables funcionam igual ao cenário SPA para interações client-side.

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

Vue não impõe estrutura. Nuxt 4 introduz a separação `app/` (cliente) versus `server/` (servidor) por padrão. Slice vertical (feature) reúne pages, components, composables, stores e schemas. Middleware e server routes ficam em pastas próprias por serem infraestrutura compartilhada.

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

## SFC com `<script setup>`

Componentes em **SFC** com `<script setup lang="ts">` são o padrão. Sem `setup()` explícito, sem `return` manual, sem `defineComponent`. Props seguem a regra de tipagem do TypeScript: três ou mais campos usam interface separada com sufixo `Props`.

<details>
<summary>❌ Bad — Options API com props inline e tipagem fraca</summary>
<br>

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
  <div>{{ customerName }} — {{ total }}</div>
</template>
```

</details>

<br>

<details>
<summary>✅ Good — `<script setup>` com interface separada e sufixo Props</summary>
<br>

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

## Composition API: estado reativo

`ref` para primitivos, `reactive` para objetos. `computed` para derivados. `watch` apenas para sincronização com sistemas externos (DOM direto, localStorage, analytics), nunca para sincronizar valores reativos entre si.

A regra: prefira `ref` por consistência (sempre `.value` no script, sempre automático no template). `reactive` é útil para grupos coesos de campos que se movem juntos.

<details>
<summary>❌ Bad — estado solto, total recalculado em watcher manual</summary>
<br>

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

<br>

<details>
<summary>✅ Good — `computed` deriva o total; mutação via cópia imutável</summary>
<br>

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

### Reactive props destructuring (Vue 3.5)

Vue 3.5 trouxe destructuring reativo de props. A versão antiga quebrava reatividade no destructure; a nova mantém. Use direto, sem `toRefs`.

<details>
<summary>❌ Bad — `toRefs` desnecessário; verbosidade de antes da 3.5</summary>
<br>

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

<br>

<details>
<summary>✅ Good — destructure direto com defaults; reatividade preservada</summary>
<br>

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
<summary>❌ Bad — componente de lista com lógica de negócio inline</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Smart orquestra com composable; Dumb apresenta</summary>
<br>

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
      {{ order.id }} — {{ order.total }}
      <button type="button" @click="handleCancel(order.id)">Cancelar</button>
    </li>
  </ul>
</template>
```

</details>

### `defineModel` para `v-model` em filhos

Antes do Vue 3.4, `v-model` em filho exigia prop `modelValue` + evento `update:modelValue` manuais. `defineModel` substitui esse boilerplate.

<details>
<summary>❌ Bad — prop e evento manuais para `v-model`</summary>
<br>

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

<br>

<details>
<summary>✅ Good — `defineModel` cria prop e evento juntos</summary>
<br>

```vue
<script setup lang="ts">
const searchTerm = defineModel<string>({ required: true });
</script>

<template>
  <input v-model="searchTerm" type="search" placeholder="Buscar pedido..." />
</template>
```

</details>

## Composables: pipeline Component → Service → apiClient

Composables encapsulam estado de **UI** (`data`, `error`, `isLoading`) e delegam ao **Service**. O **Service** chama o `apiClient` (único ponto de rede) e entrega um tipo de view ao composable. Nome começa com `use`, retorno tipado por interface quando tem três ou mais valores.

<details>
<summary>❌ Bad — fetch direto no componente, pipeline colapsado</summary>
<br>

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

<br>

<details>
<summary>✅ Good — composable encapsula estado; service encapsula chamada de rede</summary>
<br>

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

## Pinia 3: estado global tipado

Pinia é a store oficial do Vue 3. A **setup syntax** mantém o mesmo idioma do `<script setup>`: `ref` para state, `computed` para getters, funções para actions. Tipagem por inferência, sem `defineComponent`-like wrapping.

Use Pinia para estado compartilhado entre rotas (sessão, carrinho, preferências). Estado de uma única página fica em composable, não em store.

<details>
<summary>❌ Bad — Options API da store, tipos perdidos em getters</summary>
<br>

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

<br>

<details>
<summary>✅ Good — setup syntax, tipos inferidos, mutação imutável</summary>
<br>

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

## Guards: Route Middleware do Nuxt

Guards de autenticação e autorização ficam em `middleware/`: executam antes de qualquer page montar, conforme o padrão do [frontend-flow.md](../../shared/architecture/frontend-flow.md). Guard dentro do componente renderiza antes do redirect (redirecionamento), expondo conteúdo restrito por um frame.

`defineNuxtRouteMiddleware` aceita escopo global (em `middleware/global.global.ts`) ou por página via `definePageMeta({ middleware: 'auth' })`.

<details>
<summary>❌ Bad — guard no componente, expõe conteúdo por um frame</summary>
<br>

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

<br>

<details>
<summary>✅ Good — `defineNuxtRouteMiddleware` antes de qualquer render</summary>
<br>

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

## Formulários: schema → Server Route

O fluxo de formulários de [frontend-flow.md](../../shared/architecture/frontend-flow.md) se aplica direto. O schema Zod é a fonte da verdade para cliente e servidor. A **Server Route** implementa o pipeline de escrita: valida, executa regras de negócio, persiste, retorna `Result`.

O servidor retorna erros estruturados por campo e por formulário, nunca apenas `ok: false`.

<details>
<summary>❌ Bad — validação manual sem schema, erros sem estrutura</summary>
<br>

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

<br>

<details>
<summary>✅ Good — schema compartilhado, useFetch tipado, erros por campo</summary>
<br>

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

## Server Routes (Nuxt)

Server routes ficam em `server/api/[recurso].[método].ts`. O nome do arquivo declara o método **HTTP**: `index.post.ts` responde a `POST /api/orders`. O pipeline segue o contrato do [operation-flow.md](../../shared/architecture/operation-flow.md): valida com Zod, executa regras, persiste, retorna resposta tipada.

`readValidatedBody` integra Zod direto no handler, sem pipeline manual de parse + validate.

<details>
<summary>❌ Bad — lógica de negócio inline, sem schema, status hardcoded</summary>
<br>

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

<br>

<details>
<summary>✅ Good — schema Zod, repository, resposta estruturada</summary>
<br>

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

## Webhook Handler

O webhook handler implementa o fluxo de [backend-flow.md](../../shared/architecture/backend-flow.md): captura o raw body antes de qualquer parse, valida o **HMAC**, checa idempotência e responde 200 antes de processar.

Duas regras sem exceção: responder 200 antes de processar (provedores como Stripe e GitHub fazem retry se não receberem resposta em até 30 segundos), e validar o **HMAC** sobre o raw body (parsear o **JSON** antes invalida o cálculo da assinatura).

```
POST /api/webhooks/[provider] → captura raw body → valida HMAC → checa idempotência → 200 OK → enfileira → processa
```

<details>
<summary>❌ Bad — valida sobre JSON parseado, comparação direta, processa no handler</summary>
<br>

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

<br>

<details>
<summary>✅ Good — raw body, timingSafeEqual, idempotência, 200 antes de enfileirar</summary>
<br>

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

A checagem de comprimento antes do `timingSafeEqual` é necessária: buffers de tamanhos diferentes lançam exceção em runtime. Retornar 200 silenciosamente para eventos duplicados é o contrato correto: o provedor não precisa saber que o evento já foi recebido.

## Caching: `defineCachedEventHandler` e `useFetch`

Nuxt 4 traz a Nitro caching layer com `defineCachedEventHandler` (servidor) e cache integrado em `useFetch` (cliente + server-side). Toda rota é dinâmica por padrão; cache é declarado explicitamente por handler ou por chamada.

`maxAge` define o **TTL** (Time-To-Live, Tempo de Vida). `swr` (stale-while-revalidate) serve cache enquanto revalida em background. Tags permitem invalidação seletiva via `useStorage('cache').removeItem()` ou helpers do Nitro.

<details>
<summary>✅ Good — handler cacheado com TTL, SWR e tag</summary>
<br>

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

<br>

<details>
<summary>✅ Good — useFetch com transform e key estável para deduplicação</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Server Route invalida cache após escrita</summary>
<br>

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

`useFetch` deduplica requisições pela mesma `key` em toda a aplicação: dois componentes pedindo `orders-list` compartilham o resultado. Para cache server-side com invalidação granular, prefira `defineCachedEventHandler` com `name` explícito; para fetching client-side com hidratação, `useFetch` é o caminho.
