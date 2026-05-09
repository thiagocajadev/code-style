# React + Next.js

> Escopo: TypeScript. Guia baseado em **React 19.2** com **Next.js 16** (App Router).

React é uma biblioteca de **UI** (User Interface, Interface do Usuário). Next.js é o framework: roteamento por arquivo, Server Components,
Server Actions e otimizações de build integradas. Este guia mostra como implementar os contratos de
[operation-flow.md](../../shared/architecture/operation-flow.md) e
[frontend-flow.md](../../shared/architecture/frontend-flow.md) com React e Next.js.

## Conceitos fundamentais

| Conceito                                                                                              | O que é                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **RSC** (React Server Component, Componente de Servidor)                                              | Componente renderizado no servidor: acessa banco e APIs diretamente, sem enviar código ao cliente          |
| **RCC** (React Client Component, Componente de Cliente)                                               | Componente com `"use client"`: acessa estado, eventos e APIs do navegador                                  |
| **Server Action** (Ação de Servidor)                                                                  | Função assíncrona com `"use server"`: executa no servidor, invocável em formulários e event handlers       |
| **App Router** (Roteador de Aplicação)                                                                | Sistema de roteamento do Next.js baseado em hierarquia de pastas em `app/`                                 |
| **Proxy** (proxy de rede)                                                                             | Arquivo `proxy.ts` executado antes do handler da rota: guards de autenticação, redirecionamentos           |
| **Hydration** (hidratação)                                                                            | Processo de sincronizar o HTML renderizado no servidor com o estado do cliente                             |
| **HMAC** (Hash-based Message Authentication Code, Código de Autenticação de Mensagem Baseado em Hash) | Mecanismo que valida a origem e integridade de um webhook comparando assinaturas com segredo compartilhado |

## Fluxo de Operação

Next.js funciona como frontend puro (chamando qualquer backend) ou como fullstack (executando backend no mesmo projeto). O slice `features/` é o mesmo nos dois cenários; o que muda é o que cada artefato faz dentro dele.

### Next.js como frontend

Next.js cuida de UI e roteamento. Todo acesso a dados passa pelo `apiClient`, que aponta para qualquer backend (C#, Java, Node, etc.).

**Render:** `URL → proxy.ts → page.tsx → Service → apiClient → API`

**Interação:** `User Action → RCC → Hook → Service → apiClient → API`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | Navegação inicia a resolução da rota no App Router | navegador |
| **proxy.ts** | Guard de autenticação executado antes de qualquer render | `app/` |
| **page.tsx** | Orquestrador RSC: chama Service, monta componentes com dados | `app/` |
| **RCC** | Componente com `"use client"`: captura estado e eventos do browser | `features/` |
| **Hook** | Gerencia estado de UI (`data`, `error`, `isLoading`) | `features/` |
| **Service** | Chama apiClient e transforma para view type | `features/` |
| **apiClient** | Único caller de rede: retorna `Result<T>` | `lib/` |
| **Zod** | Valida dados na fronteira da API | `features/` |
| **API** | Backend externo (C#, Java, Node, etc.) | backend |

```
app/
└── orders/[id]/page.tsx     → RSC: chama Service, monta componentes
features/orders/
├── components/
│   ├── OrderDetail.tsx       → RSC: renderiza dados
│   └── CreateOrderForm.tsx   → RCC "use client": captura estado e eventos
├── hooks/use-orders.ts       → estado de UI: data, error, isLoading
├── services/order.ts         → chama apiClient, transforma para view type
└── schemas/order.ts          → Zod: valida na fronteira da API
lib/
└── api-client.ts             → único caller de rede: retorna Result<T>
proxy.ts                      → guard: executa antes de qualquer render
```

### Next.js fullstack

Next.js é frontend e backend. `page.tsx` acessa o banco diretamente via Repository, sem passar pela própria **API** (Application Programming Interface, Interface de Programação de Aplicações) Route. API Routes existem para clientes externos (mobile, integrações B2B). RCC e hooks funcionam igual ao cenário anterior para interações client-side.

**Leitura:** `URL → proxy.ts → page.tsx → Repository → render`

**Escrita:** `Submit → Server Action → Zod → Repository → updateTag → result`

**Webhook:** `POST → route.ts → HMAC → idempotência → 200 OK → enqueue → Worker`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | Navegação inicia a resolução da rota no App Router | navegador |
| **proxy.ts** | Guard de autenticação executado antes de qualquer render | `app/` |
| **page.tsx** | Orquestrador RSC: acessa Repository diretamente, monta componentes | `app/` |
| **Server Action** | Executa no servidor: valida, persiste e invalida cache | `features/` |
| **route.ts** | Named export por método HTTP: entry point para clientes externos | `app/api/` |
| **Zod** | Schema compartilhado: valida input no cliente e no servidor | `features/` |
| **Service** | Regras de negócio; transforma dados para persistência ou resposta | `features/` |
| **Repository** | Acesso direto ao banco: queries e mutações | `features/` |
| **updateTag** | Invalida o cache após escrita: garante read-your-writes | `features/` |
| **HMAC** | Valida a assinatura do webhook sobre o raw body | `app/api/` |
| **enqueue** | Adiciona job à fila para processamento assíncrono | `lib/` |
| **Worker** | Consome e executa o job de forma independente | externo |
| **Response** | `NextResponse.json()` tipado com status explícito | `app/api/` |

```
app/
├── orders/[id]/page.tsx              → RSC: acessa Repository diretamente
└── api/
    ├── orders/route.ts               → API Route: para clientes externos
    └── webhooks/[provider]/route.ts  → Webhook Handler: HMAC, idempotência, enqueue
features/orders/
├── components/
│   ├── OrderDetail.tsx               → RSC: renderiza dados
│   └── CreateOrderForm.tsx           → RCC "use client": captura estado e eventos
├── hooks/use-orders.ts               → estado de UI: data, error, isLoading
├── actions/order.ts                  → Server Action: valida, persiste, invalida cache
├── services/order.ts                 → regras de negócio, transforma para view type
├── repositories/order.ts             → acesso direto ao banco
├── queries/orders.ts                 → "use cache": leitura cacheada com tag
└── schemas/order.ts                  → Zod: contrato cliente/servidor
lib/
├── api-client.ts                     → chama APIs externas (quando necessário)
└── queue.ts                          → enfileira jobs para processamento assíncrono
proxy.ts                              → guard: executa antes de qualquer render
```

## Componentes: Server vs Client

Todo componente começa como **RSC**. Recebe `"use client"` apenas quando precisa de interatividade:
estado, efeitos ou eventos de browser.

**RSC** cobre o papel do **Loader** definido em
[frontend-flow.md](../../shared/architecture/frontend-flow.md): acessa dados antes do render, sem
estado de loading, sem waterfall.

<details>
<summary>❌ Bad — RCC desnecessário para conteúdo sem interatividade</summary>
<br>

```tsx
"use client";

import { useEffect, useState } from "react";

export function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then(setProduct);
  }, [id]);

  if (!product) return <Skeleton />;

  return <h1>{product.name}</h1>;
}
```

</details>

<br>

<details>
<summary>✅ Good — RSC acessa dados diretamente, sem loading state</summary>
<br>

```tsx
import { productRepository } from "@/lib/repositories/product";
import { NotFound } from "@/components/ui/NotFound";

interface ProductDetailProps {
  id: string;
}

export async function ProductDetail({ id }: ProductDetailProps) {
  const product = await productRepository.findById(id);
  if (!product) return <NotFound entity="produto" />;

  return <h1>{product.name}</h1>;
}
```

</details>

O `page.tsx` é o orquestrador da rota: delega renderização a componentes e dados a repositórios.
Sem lógica de negócio inline.

<details>
<summary>❌ Bad — lógica de dados e negócio misturada no page.tsx</summary>
<br>

```tsx
export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await db.orders.findUnique({
    where: { id: params.id },
    include: { items: true, customer: true },
  });

  if (!order) return <div>Pedido não encontrado</div>;

  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div>
      {order.customer.name} — R$ {total}
    </div>
  );
}
```

</details>

<br>

<details>
<summary>✅ Good — page.tsx como orquestrador</summary>
<br>

```tsx
// app/orders/[id]/page.tsx
import { orderRepository } from "@/lib/repositories/order";
import { OrderDetail } from "@/components/orders/OrderDetail";
import { NotFound } from "@/components/ui/NotFound";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await orderRepository.findWithDetails(id);
  if (!order) return <NotFound entity="pedido" />;

  return <OrderDetail order={order} />;
}
```

</details>

## Props: interface com sufixo Props

Props de componentes seguem a mesma regra das funções TypeScript: objetos com três ou mais campos
usam interface separada, com sufixo `Props`. Sem `I` prefix, sem tipo inline.

<details>
<summary>❌ Bad — tipo inline na assinatura do componente</summary>
<br>

```tsx
export function OrderCard({
  id,
  status,
  total,
  customerName,
}: {
  id: string;
  status: OrderStatus;
  total: number;
  customerName: string;
}) {
  return (
    <div>
      {customerName} — {total}
    </div>
  );
}
```

</details>

<br>

<details>
<summary>✅ Good — interface separada com sufixo Props</summary>
<br>

```tsx
interface OrderCardProps {
  id: string;
  status: OrderStatus;
  total: number;
  customerName: string;
}

export function OrderCard({ id, status, total, customerName }: OrderCardProps) {
  return (
    <div>
      {customerName} — {total}
    </div>
  );
}
```

</details>

## Hooks: pipeline Component → Service → apiClient

Em **RCCs**, o pipeline de [operation-flow.md](../../shared/architecture/operation-flow.md) se
aplica diretamente: o hook encapsula estado de UI (`data`, `error`, `isLoading`) e delega ao
**Service**. O **Service** chama o `apiClient` (único ponto de rede) e entrega um tipo de view ao hook.

O retorno do hook é tipado com interface quando tem três ou mais valores.

<details>
<summary>❌ Bad — fetch dentro do componente, pipeline colapsado</summary>
<br>

```tsx
"use client";

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders);
  }, []);

  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>{o.id}</li>
      ))}
    </ul>
  );
}
```

</details>

<br>

<details>
<summary>✅ Good — hook encapsula estado; service encapsula chamada de rede</summary>
<br>

```ts
// lib/services/order.ts
import { apiClient } from "@/lib/api-client";
import type { OrderView } from "@/lib/types/views";

export async function listOrders(): Promise<OrderView[]> {
  const result = await apiClient.get<Order[]>("/orders");
  if (!result.success) return [];

  const orderViews = result.data.map(toOrderView);
  return orderViews;
}
```

```ts
// hooks/use-orders.ts
interface UseOrdersResult {
  orders: OrderView[];
  isLoading: boolean;
  error: string | null;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch(() => setError("Não foi possível carregar os pedidos."))
      .finally(() => setIsLoading(false));
  }, []);

  const ordersResult = { orders, isLoading, error };

  return ordersResult;
}
```

```tsx
// components/orders/OrderList.tsx
"use client";

export function OrderList() {
  const { orders, isLoading, error } = useOrders();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>{order.customerName}</li>
      ))}
    </ul>
  );
}
```

</details>

## Guards: Proxy

Guards de autenticação e autorização ficam no `proxy.ts`: executam antes de qualquer render,
conforme o padrão do [frontend-flow.md](../../shared/architecture/frontend-flow.md). Guard dentro de
componente renderiza antes do redirect (redirecionamento), expondo conteúdo restrito por um frame.

<details>
<summary>❌ Bad — guard no componente, expõe conteúdo por um frame</summary>
<br>

```tsx
"use client";

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  return <Dashboard />;
}
```

</details>

<br>

<details>
<summary>✅ Good — guard no Proxy, antes de qualquer render</summary>
<br>

```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await verifySession(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);

    return redirectResponse;
  }

  const nextResponse = NextResponse.next();
  return nextResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/orders/:path*"],
};
```

</details>

## Formulários: schema → Server Action

O fluxo de formulários de [frontend-flow.md](../../shared/architecture/frontend-flow.md) se aplica
diretamente. O schema Zod é a fonte da verdade para cliente e servidor. A **Server Action**
implementa o pipeline de escrita: valida → regras de negócio → persiste → retorna `Result`.

O servidor retorna erros estruturados por campo e por formulário, nunca apenas `ok: false`.

<details>
<summary>❌ Bad — validação manual sem schema, erros sem estrutura</summary>
<br>

```tsx
// app/actions/order.ts
"use server";

export async function createOrder(formData: FormData) {
  const productId = formData.get("productId") as string;
  const quantity = parseInt(formData.get("quantity") as string);

  if (!productId || quantity < 1) return { ok: false };

  await db.orders.create({ data: { productId, quantity } });

  return { ok: true };
}
```

</details>

<br>

<details>
<summary>✅ Good — schema compartilhado, Server Action tipada com Result estruturado</summary>
<br>

```ts
// lib/schemas/order.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

```ts
// app/actions/order.ts
"use server";

import { createOrderSchema } from "@/lib/schemas/order";
import { orderRepository } from "@/lib/repositories/order";

interface CreateOrderResult {
  ok: boolean;
  orderId?: string;
  fieldErrors?: Partial<Record<keyof CreateOrderInput, string[]>>;
  formError?: string;
}

export async function createOrder(
  _prev: CreateOrderResult | null,
  formData: FormData,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse({
    productId: formData.get("productId"),
    quantity: Number(formData.get("quantity")),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const failResult = { ok: false, fieldErrors };

    return failResult;
  }

  const order = await orderRepository.create(parsed.data);
  const orderResult = { ok: true, orderId: order.id };

  return orderResult;
}
```

```tsx
// components/orders/CreateOrderForm.tsx
"use client";

import { useActionState } from "react";
import { createOrder } from "@/app/actions/order";

export function CreateOrderForm() {
  const [state, action, isPending] = useActionState(createOrder, null);

  return (
    <form action={action}>
      <fieldset disabled={isPending}>
        <input name="productId" type="text" aria-describedby="productId-error" />
        {state?.fieldErrors?.productId && (
          <span id="productId-error">{state.fieldErrors.productId[0]}</span>
        )}

        <input name="quantity" type="number" min="1" aria-describedby="quantity-error" />
        {state?.fieldErrors?.quantity && (
          <span id="quantity-error">{state.fieldErrors.quantity[0]}</span>
        )}

        {state?.formError && <p role="alert">{state.formError}</p>}

        <button type="submit">{isPending ? "Enviando..." : "Criar pedido"}</button>
      </fieldset>
    </form>
  );
}
```

</details>

`<fieldset disabled>` cobre todos os campos durante a requisição: previne double-submit (envio
duplicado) sem desabilitar cada input individualmente.

## API Routes

API Routes ficam em `app/api/[recurso]/route.ts`. Cada método **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) é um named export. O pipeline
segue o mesmo contrato do [operation-flow.md](../../shared/architecture/operation-flow.md): valida →
regras de negócio → persiste → retorna Response.

<details>
<summary>❌ Bad — lógica de negócio inline, sem schema, status code hardcoded</summary>
<br>

```ts
// app/api/orders/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.productId || !body.quantity) {
    return new Response("Invalid", { status: 400 });
  }

  const order = await db.orders.create({ data: body });

  return Response.json(order);
}
```

</details>

<br>

<details>
<summary>✅ Good — schema Zod, repository, resposta estruturada</summary>
<br>

```ts
// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/schemas/order";
import { orderRepository } from "@/lib/repositories/order";

export async function GET(): Promise<NextResponse> {
  const orders = await orderRepository.listAll();
  const response = NextResponse.json(orders);

  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorResponse = NextResponse.json({ fieldErrors }, { status: 422 });

    return errorResponse;
  }

  const order = await orderRepository.create(parsed.data);
  const createdResponse = NextResponse.json(order, { status: 201 });

  return createdResponse;
}
```

</details>

## Webhook Handler

O webhook handler implementa o fluxo de
[backend-flow.md](../../shared/architecture/backend-flow.md): captura o raw body antes de qualquer
parse, valida o **HMAC**, checa idempotência e responde 200 antes de processar.

Duas regras sem exceção: responder 200 antes de processar (provedores como Stripe e GitHub fazem
retry se não receberem resposta em até 30 segundos) e validar o **HMAC** sobre o raw body (parsear
o **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) antes invalida o cálculo da assinatura).

```
POST /api/webhooks/[provider] → captura raw body → valida HMAC → checa idempotência → 200 OK → enfileira → processa
```

<details>
<summary>❌ Bad — valida sobre JSON parseado, comparação direta, processa no handler</summary>
<br>

```ts
// app/api/webhooks/[provider]/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const signature = request.headers.get("x-signature");

  const expected = createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(JSON.stringify(body))
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processWebhookPayload(body);

  return NextResponse.json({ ok: true });
}
```

</details>

<br>

<details>
<summary>✅ Good — raw body, timingSafeEqual, idempotência, 200 antes de enfileirar</summary>
<br>

```ts
// app/api/webhooks/[provider]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { webhookRepository } from "@/lib/repositories/webhook";
import { jobQueue } from "@/lib/queue";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const receivedSignature = request.headers.get("x-signature") ?? "";
  const eventId = request.headers.get("x-event-id") ?? "";

  const expectedSignature = createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  const signaturesMatch =
    expectedSignature.length === receivedSignature.length &&
    timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature));

  if (!signaturesMatch) {
    const unauthorizedResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return unauthorizedResponse;
  }

  const alreadyReceived = await webhookRepository.findByEventId(eventId);

  if (alreadyReceived) {
    const duplicateResponse = NextResponse.json({ ok: true });

    return duplicateResponse;
  }

  await webhookRepository.save({ eventId, rawBody });
  await jobQueue.enqueue("webhook.process", { eventId });

  const acceptedResponse = NextResponse.json({ ok: true });

  return acceptedResponse;
}
```

</details>

A checagem de comprimento antes do `timingSafeEqual` é necessária: buffers de tamanhos diferentes
lançam exceção em runtime. Retornar 200 silenciosamente para eventos duplicados é o contrato correto:
o provedor não precisa saber que o evento já foi recebido.

## Caching: `use cache`

Next.js 16 introduz o `"use cache"` como diretiva opt-in. Todo código dinâmico executa em tempo de
requisição por padrão; cache é declarado explicitamente por função ou componente.

`cacheLife()` define o perfil de expiração. `cacheTag()` marca os dados para invalidação seletiva.
`updateTag()` em Server Actions garante **read-your-writes** (leitura imediata após escrita): o
usuário vê as próprias mudanças na hora.

<details>
<summary>✅ Good — função cacheada com perfil e tag</summary>
<br>

```ts
// lib/queries/orders.ts
"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { orderRepository } from "@/lib/repositories/order";

export async function getCachedOrders(): Promise<Order[]> {
  cacheLife("hours");
  cacheTag("orders");

  const orders = await orderRepository.listAll();
  return orders;
}
```

</details>

<br>

<details>
<summary>✅ Good — Server Action invalida o cache após escrita</summary>
<br>

```ts
// app/actions/order.ts
"use server";

import { updateTag } from "next/cache";
import { createOrderSchema } from "@/lib/schemas/order";
import { orderRepository } from "@/lib/repositories/order";

export async function createOrder(
  _prev: CreateOrderResult | null,
  formData: FormData,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse({
    productId: formData.get("productId"),
    quantity: Number(formData.get("quantity")),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const failResult = { ok: false, fieldErrors };

    return failResult;
  }

  const order = await orderRepository.create(parsed.data);

  updateTag("orders");

  const orderResult = { ok: true, orderId: order.id };

  return orderResult;
}
```

</details>

`updateTag()` só está disponível em Server Actions. Para invalidação externa (webhook, cron), use
`revalidateTag(tag, "max")` com perfil `cacheLife`.
