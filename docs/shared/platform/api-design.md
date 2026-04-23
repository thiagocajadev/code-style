# API Design

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
> Idiomas específicos em [csharp/conventions/advanced/api-design.md](../../csharp/conventions/advanced/api-design.md) e [vbnet/conventions/advanced/api-design.md](../../vbnet/conventions/advanced/api-design.md).

**API** (Application Programming Interface, Interface de Programação de Aplicações) é o contrato entre
cliente e servidor. Um design bom padroniza quatro coisas: o pipeline de uma requisição, o contrato
de entrada e saída, o shape (formato) da resposta e a semântica de verbos e status. Quando esses
quatro pontos estão previsíveis, o cliente trata qualquer endpoint da mesma forma, e o servidor
evolui sem quebrar integração.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **BFF** (Backend for Frontend, Backend para Frontend) | Camada de borda que serve um cliente específico, traduz domínio em contrato de transporte e isola regras de UI do core |
| **DTO** (Data Transfer Object, Objeto de Transferência de Dados) | Tipo dedicado ao contrato externo, distinto da entidade de domínio, usado para request e response |
| **Envelope** (envelope de resposta) | Estrutura padrão `{ data, meta }` que dá shape consistente a sucesso, erro, objeto único e coleção |
| **Correlation ID** (identificador de correlação) | Id gerado na borda, propagado em `meta` e logs, que rastreia uma requisição ponta a ponta |
| **Result** (resultado) | Tipo de domínio que carrega sucesso ou falha sem usar exceções; o controller traduz para HTTP no boundary |
| **Idempotência** (operação repetível sem efeito adicional) | Propriedade de uma operação que produz o mesmo estado quando repetida com os mesmos parâmetros |

## Pipeline de uma requisição

Toda requisição atravessa o mesmo caminho, do cliente até a persistência e de volta. O **BFF** é o
boundary (fronteira) externo; o handler é o coração do caso de uso; o service concentra a lógica
compartilhada; o repository isola o acesso a dados.

```
Cliente → Controller thin → Handler → Service → Repository → Storage
       ←    Envelope     ← Result ← domínio ← entidade   ←
```

Cada camada tem uma responsabilidade única:

| Camada | Responsabilidade | Não faz |
|---|---|---|
| **Controller** | Extrai input, chama handler, traduz `Result` em HTTP, monta envelope | Regra de negócio, acesso a banco |
| **Handler** | Orquestra o caso de uso, retorna `Result` com DTO de domínio ou de resposta | Conhecer HTTP, montar envelope |
| **Service** | Regra de negócio, invariantes, coordenação entre repositórios | Validar input de transporte, falar HTTP |
| **Repository** | Ler e escrever no storage, devolver entidade ou primitivo | Regra de negócio, tradução para contrato externo |

A separação protege o domínio: o handler pode ser testado sem montar uma requisição HTTP, o service
pode ser reaproveitado por um job em background e o repository pode trocar de storage sem mexer no
resto.

Para padrões de runtime além do pipeline síncrono (background jobs, webhooks, event-driven), veja
[Backend Flow](../architecture/backend-flow.md).

## BFF como boundary

O **BFF** (Backend for Frontend) é o único ponto que conhece HTTP. Qualquer coisa além dele, handler,
service, repository, fala domínio. Isso vale mesmo quando o projeto não tem microsserviços: o BFF é
uma disciplina de camadas, não um deploy separado.

O sinal de que o boundary foi respeitado é simples: se você renomeasse `HttpContext` para `Envelope`
em todo o código e o handler continuasse funcionando, o boundary está no lugar.

<details>
<summary>❌ Bad — controller com acesso a banco e regra de negócio</summary>
<br>

```js
app.post('/api/orders', async (httpRequest, httpResponse) => {
  const { productId, quantity } = httpRequest.body;

  if (!productId) {
    return httpResponse.status(400).json({ message: 'Product required.' });
  }

  const product = await db.products.findById(productId);
  if (!product) {
    return httpResponse.status(404).json({ message: 'Product not found.' });
  }

  const total = product.price * quantity;
  const order = await db.orders.insert({ productId, quantity, total });

  return httpResponse.status(201).json(order);
});
```

Cada responsabilidade colada na próxima: o controller valida, lê banco, calcula e grava. Trocar o
storage exige mexer no controller. Testar a regra de preço exige subir um servidor HTTP.

</details>

<br>

<details>
<summary>✅ Good — controller fino, handler orquestra, service e repository isolados</summary>
<br>

```js
// features/orders/ordersController.js
export function registerOrdersController(app, { createOrder }) {
  app.post('/api/orders', async (httpRequest, httpResponse) => {
    const result = await createOrder.handle(httpRequest.body);
    if (result.isFailure) {
      const badRequest = httpResponse.status(400).json({ message: result.error });

      return badRequest;
    }

    const apiResponse = buildEnvelope(result.value, httpRequest);
    const created = httpResponse.status(201).json(apiResponse);

    return created;
  });
}
```

```js
// features/orders/createOrderHandler.js
export function createOrderHandler({ orderService }) {
  async function handle(request) {
    const serviceResult = await orderService.createOrder(request);
    if (serviceResult.isFailure) {
      const failure = Result.fail(serviceResult.error);
      return failure;
    }

    const order = serviceResult.value;
    const orderResponse = {
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      total: order.total,
      createdAt: order.createdAt,
    };

    const success = Result.ok(orderResponse);
    return success;
  }

  return { handle };
}
```

O handler não conhece `res`, `status` ou `headers`. Testar a regra de criação não exige nenhum
mock de HTTP.

</details>

## Contrato de Request

**DTOs** de request definem o formato esperado do input. São tipos próprios da API, validados no
boundary, nunca entidades de domínio reaproveitadas.

Dois sinais de um contrato de request saudável: campos com nome de domínio (`productId`, não
`product_id_str`) e validação centralizada antes do handler receber o objeto.

<details>
<summary>❌ Bad — objeto mutável montado ad-hoc, sem validação explícita</summary>
<br>

```js
app.post('/api/orders', async (httpRequest, httpResponse) => {
  const request = httpRequest.body;
  request.quantity = parseInt(request.quantity);

  const order = await createOrder.handle(request);
  const response = httpResponse.status(201).json(order);

  return response;
});
```

O handler recebe o que vier no body. Campo faltando, tipo errado e formato inválido só aparecem
depois, em runtime, com stack trace confuso.

</details>

<br>

<details>
<summary>✅ Good — schema de validação no boundary, DTO tipado para o handler</summary>
<br>

```js
// features/orders/orderRequest.js
import { z } from 'zod';

export const orderRequestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export function parseOrderRequest(body) {
  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    const validation = Result.fail(parsed.error.issues);
    return validation;
  }

  const request = Result.ok(parsed.data);
  return request;
}
```

```js
app.post('/api/orders', async (httpRequest, httpResponse) => {
  const parsed = parseOrderRequest(httpRequest.body);
  if (parsed.isFailure) {
    const badRequest = httpResponse.status(400).json({ errors: parsed.error });

    return badRequest;
  }

  const result = await createOrder.handle(parsed.value);
  // ...
});
```

A validação acontece uma vez, na borda. O handler recebe um objeto já com tipos corretos e garante
que qualquer objeto que chegue nele é válido.

</details>

## Contrato de Response

Response DTO é o tipo público que o cliente conhece. A entidade de domínio é privada: ela tem
invariantes, comportamentos e campos que não devem vazar (hash de senha, flags internas, ids de
controle interno).

<details>
<summary>❌ Bad — entidade de domínio retornada direto</summary>
<br>

```js
async function handle(id) {
  const order = await orderService.findById(id);
  const success = Result.ok(order);

  return success;
}
```

Qualquer campo novo em `Order` vaza automaticamente para o cliente. O contrato externo cresce sem
ninguém revisar.

</details>

<br>

<details>
<summary>✅ Good — DTO de resposta explícito, montado a partir do domínio</summary>
<br>

```js
async function handle(id) {
  const serviceResult = await orderService.findById(id);
  if (serviceResult.isFailure) {
    const failure = Result.fail(serviceResult.error);
    return failure;
  }

  const order = serviceResult.value;
  const orderResponse = {
    id: order.id,
    productId: order.productId,
    quantity: order.quantity,
    total: order.total,
    createdAt: order.createdAt,
  };

  const success = Result.ok(orderResponse);
  return success;
}
```

O DTO lista, um por um, os campos que fazem parte do contrato. Adicionar campo novo em `Order` não
muda a resposta até que alguém decida expor.

</details>

## Response Envelope

Respostas sem envelope têm shapes inconsistentes: sucesso retorna objeto nu, erro retorna string,
coleção retorna array. Cada shape exige tratamento separado no cliente.

Um envelope `{ data, meta }` garante contrato previsível. O campo `meta` carrega apenas o que ajuda
na observabilidade e paginação, sem inflar o payload. A montagem do envelope pertence ao
**Controller** (boundary HTTP). O handler continua devolvendo `Result` com DTO de domínio.

| Campo | Conteúdo | Quando |
|---|---|---|
| `data` | DTO de resposta (objeto, array ou `null` em delete) | Sempre presente em sucesso |
| `meta.correlationId` | Id propagado nos logs para rastreamento ponta a ponta | Sempre |
| `meta.requestedAt` | Timestamp ISO 8601 UTC da requisição | Sempre |
| `meta.pagination` | `{ page, pageSize, total }` | Apenas em coleções paginadas |
| `error.code` | Código estável do erro (ex: `ORDER_NOT_FOUND`) | Apenas em falha |
| `error.message` | Mensagem legível, sem detalhes internos | Apenas em falha |
| `error.details` | Lista de issues de validação | Apenas em `400 Bad Request` |

<details>
<summary>❌ Bad — shapes inconsistentes entre sucesso e erro</summary>
<br>

```js
// 200: { "id": "01HV...", "productId": "...", "quantity": 3 }
// 404: "Order not found."
// 400: { "field": "quantity", "problem": "must be positive" }
```

O cliente precisa de três parsers diferentes para três tipos de resposta do mesmo endpoint.

</details>

<br>

<details>
<summary>✅ Good — envelope consistente em sucesso e erro</summary>
<br>

```js
// shared/envelope.js
export function buildEnvelope(data, httpRequest) {
  const correlationId = httpRequest.headers['x-correlation-id'] ?? crypto.randomUUID();
  const meta = {
    correlationId,
    requestedAt: new Date().toISOString(),
  };
  const envelope = { data, meta };

  return envelope;
}

export function buildErrorEnvelope(code, message, httpRequest, details) {
  const correlationId = httpRequest.headers['x-correlation-id'] ?? crypto.randomUUID();
  const error = { code, message };
  if (details) {
    error.details = details;
  }
  const meta = {
    correlationId,
    requestedAt: new Date().toISOString(),
  };
  const envelope = { error, meta };

  return envelope;
}
```

```js
// 200: { "data": { "id": "01HV...", ... }, "meta": { "correlationId": "abc-123", "requestedAt": "2026-04-23T14:32:00Z" } }
// 404: { "error": { "code": "ORDER_NOT_FOUND", "message": "Order not found." }, "meta": { ... } }
// 400: { "error": { "code": "INVALID_INPUT", "message": "Validation failed.", "details": [...] }, "meta": { ... } }
```

O `correlationId` em `meta` é o mesmo propagado nos logs da requisição. Veja
[Correlation ID](../standards/observability.md#correlation-id) para o fluxo completo.

</details>

## Verbos REST e rotas

**REST** (Representational State Transfer, Transferência de Estado Representacional) usa verbos HTTP
com semântica definida. O mesmo verbo deve significar a mesma coisa em qualquer endpoint.

| Verbo | Semântica | Idempotente | Exemplo |
|---|---|---|---|
| `GET` | Leitura sem efeito colateral | Sim | `GET /api/orders`, `GET /api/orders/{id}` |
| `POST` | Criação de recurso | Não | `POST /api/orders` |
| `PUT` | Substituição completa | Sim | `PUT /api/orders/{id}` |
| `PATCH` | Atualização parcial | Não | `PATCH /api/orders/{id}` |
| `DELETE` | Remoção | Sim | `DELETE /api/orders/{id}` |

Convenções de rota:

- Kebab-case na URL: `/api/order-items`, não `/api/orderItems`
- Plural para coleções: `/api/orders`, não `/api/order`
- Sem verbo na URL: `POST /api/orders`, não `POST /api/create-order`
- Recurso aninhado quando há relação clara: `/api/orders/{id}/items`
- Query string para filtro e paginação: `/api/orders?status=pending&page=2`

Verbos customizados (`/cancel`, `/approve`) entram como sub-recurso de ação quando a operação não se
encaixa nos cinco verbos padrão: `POST /api/orders/{id}/cancel`.

## Status codes

Status code é o primeiro nível de contrato: antes de ler o body, o cliente já sabe se a requisição
deu certo, se o erro é dele ou do servidor, e se vale tentar de novo.

| Status | Quando usar |
|---|---|
| `200 OK` | Leitura ou operação bem-sucedida com corpo de resposta |
| `201 Created` | Recurso criado; incluir id ou header `Location` |
| `202 Accepted` | Aceito para processamento assíncrono; cliente consulta depois |
| `204 No Content` | Operação bem-sucedida sem corpo (ex: `DELETE`, `PUT` sem retorno) |
| `400 Bad Request` | Input inválido: JSON malformado, campo faltando, tipo errado |
| `401 Unauthorized` | Não autenticado, credencial ausente ou inválida |
| `403 Forbidden` | Autenticado, mas sem permissão para o recurso |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Estado incompatível: duplicata, versão obsoleta |
| `422 Unprocessable Entity` | Input válido, mas regra de negócio violada |
| `429 Too Many Requests` | Rate limit atingido |
| `500 Internal Server Error` | Falha inesperada; nunca expor detalhes ao cliente |

A distinção entre `400` e `422` é sutil mas útil: `400` é erro de forma (o servidor não entendeu),
`422` é erro de regra (o servidor entendeu, mas rejeitou). Cliente com validação local evita `400`;
`422` sempre vem do servidor.

## Result para HTTP no boundary

O handler devolve **Result** (tipo de domínio com sucesso ou falha). O controller traduz para HTTP.
Essa tradução acontece em um único lugar, perto da porta, para que a regra de mapeamento fique
visível e não espalhada pelo handler.

<details>
<summary>❌ Bad — handler constrói resposta HTTP, mistura domínio e transporte</summary>
<br>

```js
async function handle(id, res) {
  const order = await orderService.findById(id);
  if (!order) {
    return httpResponse.status(404).json({ error: 'Not found' });
  }

  return httpResponse.status(200).json(order);
}
```

Handler acoplado a `res`. Não dá para reaproveitar em um worker que lê da fila e não tem `res`.

</details>

<br>

<details>
<summary>✅ Good — handler retorna Result, controller traduz no boundary</summary>
<br>

```js
// features/orders/findOrderByIdHandler.js
export function findOrderByIdHandler({ orderService }) {
  async function handle(id) {
    const serviceResult = await orderService.findById(id);
    if (serviceResult.isFailure) {
      const failure = Result.fail(serviceResult.error);
      return failure;
    }

    const order = serviceResult.value;
    const orderResponse = {
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      total: order.total,
      createdAt: order.createdAt,
    };

    const success = Result.ok(orderResponse);
    return success;
  }

  return { handle };
}
```

```js
// features/orders/ordersController.js
app.get('/api/orders/:id', async (httpRequest, httpResponse) => {
  const result = await findOrderById.handle(httpRequest.params.id);
  if (result.isFailure) {
    const httpStatus = mapErrorToStatus(result.error);
    const envelope = buildErrorEnvelope(result.error.code, result.error.message, httpRequest);
    const errorResponse = httpResponse.status(httpStatus).json(envelope);

    return errorResponse;
  }

  const envelope = buildEnvelope(result.value, httpRequest);
  const okResponse = httpResponse.status(200).json(envelope);

  return okResponse;
});
```

```js
// shared/errorMapping.js
const errorStatusByCode = {
  ORDER_NOT_FOUND: 404,
  ORDER_ALREADY_CANCELLED: 409,
  INVALID_INPUT: 400,
  RULE_VIOLATION: 422,
};

export function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

O handler volta para ser testável como função pura de domínio. A tabela de mapeamento fica em um só
lugar, versionada e auditável.

</details>

## Cross-links

- [Backend Flow](../architecture/backend-flow.md) — jobs, webhooks, event-driven além do pipeline síncrono
- [Observability](../standards/observability.md) — correlationId, logs estruturados, níveis
- [Security](./security.md) — autenticação, autorização e blindagem de cookies no boundary
- [Integrations](./integrations.md) — contratos com sistemas externos (GraphQL, XML/SOAP, HMAC)
- [Messaging](./messaging.md) — filas, DLQ e entrega quando a API dispara trabalho assíncrono
- [C# API Design](../../csharp/conventions/advanced/api-design.md) — Minimal API, TypedResults, `[AsParameters]`
- [VB.NET API Design](../../vbnet/conventions/advanced/api-design.md) — Web API 2, roteamento por atributo, async sem deadlock
