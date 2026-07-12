# React + Next.js

> Escopo: TypeScript. Guia baseado em **React 19.2** com **Next.js 16** (App Router).

React é uma biblioteca de **UI** (User Interface · Interface do Usuário). Next.js é o framework: roteamento por arquivo, Server Components,
Server Actions e otimizações de build integradas. Este guia mostra como implementar os contratos de
[operation-flow.md](../../shared/architecture/operation-flow.md) e
[frontend-flow.md](../../shared/architecture/frontend-flow.md) com React e Next.js.

## Conceitos fundamentais

| Conceito                                                                                              | O que é                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **RSC** (React Server Component · Componente de Servidor)                                              | Componente renderizado no servidor: acessa banco e APIs diretamente, sem enviar código ao cliente          |
| **RCC** (React Client Component · Componente de Cliente)                                               | Componente com `"use client"`: acessa estado, eventos e APIs do navegador                                  |
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
| **Zod** | Valida os dados no limite entre a API e o sistema | `features/` |
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
└── schemas/order.ts          → Zod: valida no limite da API
lib/
└── api-client.ts             → único caller de rede: retorna Result<T>
proxy.ts                      → guard: executa antes de qualquer render
```

### Next.js fullstack

Next.js é frontend e backend. `page.tsx` acessa o banco diretamente via Repository, sem passar pela própria **API** (Application Programming Interface · Interface de Programação de Aplicações) Route. API Routes existem para clientes externos (mobile, integrações B2B). RCC e hooks funcionam igual ao cenário anterior para interações client-side.

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

## O componente começa no servidor e só vai para o cliente quando precisa

Todo componente nasce como **RSC**, e ganha `"use client"` apenas quando precisa de algo que só
existe no navegador: estado, efeito ou evento do usuário. Marcar como cliente o que não precisa
disso manda código para o navegador à toa, e o texto estático da página passa a viajar junto com o
JavaScript que o renderiza.

O **RSC** cumpre o papel do **Loader** de
[frontend-flow.md](../../shared/architecture/frontend-flow.md): ele busca os dados antes de
renderizar, o que dispensa o estado de carregamento e evita a cascata de requisições que aparece
quando cada componente busca o que precisa depois de já estar na tela.

<details>
<summary>❌ Ruim: o componente vira cliente sem ter nenhuma interatividade</summary>

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

<details>
<summary>✅ Bom: o componente de servidor busca os dados e renderiza já preenchido</summary>

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

O `page.tsx` é o orquestrador da rota. Ele chama quem busca os dados e monta os componentes que os
exibem, e a regra de negócio fica com o Service ou o Repository. Um `page.tsx` que calcula desconto
e monta query é onde a lógica se esconde de quem a procura.

<details>
<summary>❌ Ruim: o page.tsx busca dados e ainda aplica regra de negócio</summary>

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
      {order.customer.name}: R$ {total}
    </div>
  );
}
```

</details>

<details>
<summary>✅ Bom: page.tsx como orquestrador</summary>

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

## As props do componente ganham uma interface com sufixo Props

As props seguem a regra das funções TypeScript: a partir de três campos, o tipo sai da assinatura e
vira uma interface própria, com o sufixo `Props`. O prefixo `I` continua fora, e o tipo escrito
dentro dos parênteses também: ele empurra a lista de campos para o meio da assinatura, e o leitor
atravessa cinco linhas antes de ver o que o componente recebe.

<details>
<summary>❌ Ruim: o tipo escrito dentro dos parênteses do componente</summary>

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
      {customerName}: {total}
    </div>
  );
}
```

</details>

<details>
<summary>✅ Bom: interface separada com sufixo Props</summary>

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
      {customerName}: {total}
    </div>
  );
}
```

</details>

## O caminho é componente, hook, service, apiClient

Nos componentes de cliente, o fluxo de
[operation-flow.md](../../shared/architecture/operation-flow.md) aparece em três peças. O **hook**
guarda o estado da tela (`data`, `error`, `isLoading`) e não sabe de rede. O **Service** aplica a
regra e transforma o dado no formato que a tela usa. O `apiClient` é o único lugar que fala com a
rede.

Quando tudo isso acontece dentro do componente, com `fetch` e `useState` juntos, a chamada de rede
não é reaproveitável, o tratamento de erro se repete a cada tela, e testar a regra exige montar o
componente.

O retorno do hook vira interface quando tem três valores ou mais.

<details>
<summary>❌ Ruim: fetch, estado e regra dentro do componente</summary>

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

<details>
<summary>✅ Bom: hook encapsula estado; service encapsula chamada de rede</summary>

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

## A checagem de acesso mora no Proxy, antes de qualquer render

A verificação de autenticação e de permissão fica no `proxy.ts`, que roda antes de a página começar
a renderizar, como manda o [frontend-flow.md](../../shared/architecture/frontend-flow.md).

Feita dentro do componente, ela chega tarde. O componente renderiza, o `useEffect` roda depois, e o
redirecionamento acontece por último. Nesse intervalo o conteúdo restrito já foi pintado na tela, e
o usuário sem permissão chega a vê-lo antes de ser mandado embora.

<details>
<summary>❌ Ruim: a checagem no componente deixa o conteúdo aparecer antes do redirecionamento</summary>

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

<details>
<summary>✅ Bom: guard no Proxy, antes de qualquer render</summary>

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

## O formulário valida com o mesmo schema no cliente e no servidor

O fluxo de [frontend-flow.md](../../shared/architecture/frontend-flow.md) vale aqui inteiro. O
schema Zod é a única declaração das regras do formulário, e os dois lados o usam: o cliente para
avisar o usuário na hora, o servidor para não confiar no que chegou. A **Server Action** executa a
escrita na ordem de sempre: valida, aplica a regra, persiste, devolve o resultado.

O erro volta estruturado, campo a campo, e é isso que permite à tela mostrar a mensagem embaixo do
input que a causou. Um `ok: false` sozinho obriga o formulário a exibir um aviso genérico, e o
usuário fica procurando qual campo errou.

<details>
<summary>❌ Ruim: validação escrita à mão, sem schema, e o erro volta sem estrutura</summary>

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

<details>
<summary>✅ Bom: um schema para os dois lados, e o erro volta campo a campo</summary>

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

## As rotas de API

As rotas ficam em `app/api/[recurso]/route.ts`, e cada método **HTTP** (HyperText Transfer Protocol ·
Protocolo de Transferência de Hipertexto) vira uma função exportada com o nome dele. O caminho
dentro da rota é o mesmo do [operation-flow.md](../../shared/architecture/operation-flow.md): valida
a entrada, aplica a regra, persiste, devolve a resposta.

<details>
<summary>❌ Ruim: regra de negócio dentro da rota, sem schema, e o status escrito na mão</summary>

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

<details>
<summary>✅ Bom: schema Zod, repository, resposta estruturada</summary>

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

## O handler de webhook

O handler segue o fluxo de [backend-flow.md](../../shared/architecture/backend-flow.md): pega o
corpo cru da requisição antes de qualquer conversão, confere a assinatura **HMAC**, verifica se
aquele evento já foi recebido, responde 200 e só então processa.

Duas regras não abrem exceção. A primeira é responder 200 antes de processar: provedores como Stripe
e GitHub reenviam o evento se a resposta demorar mais de 30 segundos, e um processamento lento vira
evento duplicado. A segunda é calcular o **HMAC** sobre o corpo cru. Converter o
**JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) primeiro reordena campos e
muda espaços, e a assinatura calculada sobre esse texto não bate mais com a que o provedor enviou.

```
POST /api/webhooks/[provider] → captura raw body → valida HMAC → checa idempotência → 200 OK → enfileira → processa
```

<details>
<summary>❌ Ruim: assina o JSON já convertido, compara com ===, e processa antes de responder</summary>

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

<details>
<summary>✅ Bom: raw body, timingSafeEqual, idempotência, 200 antes de enfileirar</summary>

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

A checagem de comprimento antes do `timingSafeEqual` é obrigatória: a função lança exceção quando os
dois buffers têm tamanhos diferentes. Devolver 200 para um evento repetido é o contrato certo, e não
é omissão: o provedor precisa saber que a entrega chegou, e o que ele faz com essa informação é parar
de reenviar.

## Cache com `use cache`

No Next.js 16, nada é guardado em cache sem que alguém peça. Todo código dinâmico roda a cada
requisição, e a diretiva `"use cache"` é o que marca uma função ou um componente como cacheável.

As três peças se dividem assim: `cacheLife()` define quanto tempo o dado vale, `cacheTag()` dá um
nome ao dado para poder invalidá-lo depois, e `updateTag()`, chamado dentro de uma Server Action,
descarta o cache daquele nome logo após a escrita. É esta última que garante que o usuário veja a
própria alteração na hora, em vez de continuar olhando a versão antiga da tela.

<details>
<summary>✅ Bom: função cacheada com perfil e tag</summary>

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

<details>
<summary>✅ Bom: Server Action invalida o cache após escrita</summary>

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
