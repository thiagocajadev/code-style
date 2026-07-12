# Desenho de API

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
> Idiomas específicos em [csharp/conventions/advanced/api-design.md](../../csharp/conventions/advanced/api-design.md) e [vbnet/conventions/advanced/api-design.md](../../vbnet/conventions/advanced/api-design.md).

A **API** (Application Programming Interface · Interface de Programação de Aplicações) é o contrato entre
cliente e servidor. Desenhar bem significa fixar cinco pontos: o caminho que a requisição percorre, o
que entra, o que sai, o **shape** (formato) da resposta e o que cada verbo e cada status significam.
Some a isso o versionamento, que segura tudo no lugar ao longo do tempo. Com esses pontos estáveis, o
cliente trata qualquer endpoint do mesmo jeito, e o servidor evolui sem quebrar quem já integrou.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **BFF** (Backend for Frontend · Backend para Frontend) | Camada de borda que serve um cliente específico, traduz domínio em contrato de transporte e isola regras de UI do core |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Tipo dedicado ao contrato externo, distinto da entidade de domínio, usado para request e response |
| **Handler** (processador de requisição) | Função que orquestra um caso de uso e devolve `Result`, sem conhecer HTTP |
| **Envelope** (envelope de resposta) | Estrutura padrão `{ data, meta }` que dá shape consistente a sucesso, erro, objeto único e coleção |
| **Correlation ID** (identificador de correlação) | Id gerado na borda, propagado em `meta` e logs, que rastreia uma requisição ponta a ponta |
| **Result** (resultado) | Tipo de domínio que carrega sucesso ou falha sem usar exceções; o controller traduz para HTTP no boundary |
| **idempotency** (operação repetível sem efeito adicional) | Propriedade de uma operação que produz o mesmo estado quando repetida com os mesmos parâmetros |
| **versioning** (versionamento de contrato) | Prefixo estável na rota (`/api/v1`) que congela o formato das respostas; uma mudança incompatível estreia como `/api/v2`, lado a lado |
| **QUERY** (verbo HTTP de leitura com corpo) | Método HTTP de leitura segura que leva o filtro no corpo da requisição, longe do limite da URL; rascunho na IETF |
| **Problem Details** (corpo de erro padronizado · RFC 9457) | Formato comum para o corpo de um erro HTTP: `type`, `title`, `status`, `detail`, `instance` |
| **RFC** (Request for Comments · Pedido de Comentários) | Documento numerado da IETF que fixa um padrão da internet: HTTP, JSON, tokens |
| **IETF** (Internet Engineering Task Force · força-tarefa de engenharia da internet) | Organização aberta, movida por consenso técnico, que padroniza os protocolos da internet e publica as RFCs |

## O caminho de uma requisição

Toda requisição percorre o mesmo caminho, do cliente até o banco e de volta. O **BFF** guarda o
limite externo, o **Handler** conduz o caso de uso, o **Service** concentra a regra compartilhada e o
**Repository** isola o acesso aos dados.

```
Requisição:  Cliente → Controller thin → Handler → Service → Repository → Storage
Resposta:    Storage → entidade → domínio → Result → Envelope → Cliente
```

Cada camada tem uma responsabilidade única:

| Camada | Responsabilidade | Não faz |
|---|---|---|
| **Controller** | Extrai input, chama handler, traduz `Result` em HTTP, monta envelope | Regra de negócio, acesso a banco |
| **Handler** | Orquestra o caso de uso, retorna `Result` com DTO de domínio ou de resposta | Conhecer HTTP, montar envelope |
| **Service** | Regra de negócio, invariantes, coordenação entre repositórios | Validar input de transporte, falar HTTP |
| **Repository** | Ler e escrever no storage, devolver entidade ou primitivo | Regra de negócio, tradução para contrato externo |

A separação tem três efeitos práticos. O handler roda em teste sem que ninguém monte uma requisição
**HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto). O service atende
também ao job que roda em segundo plano. O repository troca de banco sem alterar o resto do código.

Para o que acontece fora do caminho síncrono (job em segundo plano, webhook, evento), veja
[Backend Flow](../architecture/backend-flow.md).

## O BFF é o único que conhece HTTP

O **BFF** (Backend for Frontend · backend feito para um cliente específico) fica na borda e concentra
tudo que é HTTP: cabeçalho, status, cookie, corpo da requisição. Do BFF para dentro, o handler, o
service e o repository falam domínio.

O BFF aqui é uma disciplina de camadas. Ele existe no monolito, no projeto de um arquivo só e no
sistema com microsserviços: o que o define é o conjunto de coisas que ele conhece.

Um teste rápido mostra se o limite está no lugar: renomeie `HttpContext` para `Envelope` em todo o
código. Se o handler continuar compilando e passando nos testes, o limite está correto.

<details>
<summary>❌ Ruim: controller com acesso a banco e regra de negócio</summary>

```js
app.post('/api/v1/orders', async (httpRequest, httpResponse) => {
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

O controller acumula quatro responsabilidades: valida, lê o banco, calcula e grava. Trocar o banco
obriga a mexer no controller. Testar a regra de preço obriga a subir um servidor HTTP.

</details>

<details>
<summary>✅ Bom: controller fino, handler orquestra, service e repository isolados</summary>

```js
// features/orders/ordersController.js
export function registerOrdersController(app, { createOrder }) {
  app.post('/api/v1/orders', async (httpRequest, httpResponse) => {
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

O handler ignora `res`, `status` e `headers`. A regra de criação vai a teste sem nenhum dado
fictício de HTTP no meio.

</details>

## O contrato de entrada

O **DTO** de request descreve o formato que a API aceita. Ele é um tipo próprio da borda, validado
ali mesmo, e vive separado da entidade de domínio, que tem invariantes e comportamento para proteger.

Dois sinais denunciam um contrato de entrada saudável: os campos carregam nome de domínio
(`productId`) e a validação acontece uma vez, antes do handler receber o objeto.

<details>
<summary>❌ Ruim: objeto mutável montado ad-hoc, sem validação explícita</summary>

```js
app.post('/api/v1/orders', async (httpRequest, httpResponse) => {
  const request = httpRequest.body;
  request.quantity = parseInt(request.quantity);

  const order = await createOrder.handle(request);
  const response = httpResponse.status(201).json(order);

  return response;
});
```

O handler recebe o que vier no body, sem validação nenhuma. Campo faltando, tipo errado e formato
inválido só aparecem em runtime, com um stack trace que não aponta para a origem.

</details>

<details>
<summary>✅ Bom: schema de validação no boundary, DTO tipado para o handler</summary>

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
app.post('/api/v1/orders', async (httpRequest, httpResponse) => {
  const parsed = parseOrderRequest(httpRequest.body);

  if (parsed.isFailure) {
    const badRequest = httpResponse.status(400).json({ errors: parsed.error });
    return badRequest;
  }

  const result = await createOrder.handle(parsed.value);
  // ...
});
```

A validação roda uma vez, na borda. O handler recebe um objeto com os tipos certos, porque tudo que
chega até ele já passou pelo schema.

</details>

## O contrato de saída

O DTO de response é o tipo público, o único que o cliente enxerga. A entidade de domínio fica
privada: ela guarda invariantes, comportamento e campos que ficam fora do contrato externo (hash de
senha, flag interna, id de controle).

<details>
<summary>❌ Ruim: entidade de domínio retornada direto</summary>

```js
async function handle(id) {
  const order = await orderService.findById(id);
  const success = Result.ok(order);

  return success;
}
```

Todo campo novo em `Order` passa a aparecer na resposta. O contrato externo cresce sem que ninguém
tenha revisado.

</details>

<details>
<summary>✅ Bom: DTO de resposta explícito, montado a partir do domínio</summary>

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

O DTO lista, campo a campo, o que pertence ao contrato. O campo novo em `Order` fica onde está até
alguém decidir expor.

</details>

## Envelope: toda resposta com a mesma forma

Sem envelope, cada resposta tem um formato diferente: o sucesso volta como objeto solto, o erro volta
como texto, a coleção volta como array. O cliente escreve um tratamento para cada caso.

O envelope `{ data, meta }` dá um formato único a todos eles. O `meta` carrega o mínimo que serve à
observabilidade e à paginação, sem inchar o **payload** (corpo da mensagem). Quem monta o envelope é o
**Controller**, que já é o limite HTTP. O handler segue devolvendo `Result` com o DTO de domínio
dentro.

| Campo | Conteúdo | Quando |
|---|---|---|
| `data` | DTO de resposta (objeto, array ou `null` em delete) | Sempre presente em sucesso |
| `meta.correlationId` | Id propagado nos logs para rastreamento ponta a ponta | Sempre |
| `meta.requestedAt` | Timestamp ISO 8601 UTC da requisição | Sempre |
| `meta.pagination` | `{ page, pageSize, totalPages, totalItems }` | Apenas em coleções paginadas |
| `error.code` | Código estável do erro (ex: `ORDER_NOT_FOUND`) | Apenas em falha |
| `error.message` | Mensagem legível, sem detalhes internos | Apenas em falha |
| `error.details` | Lista de issues de validação | Apenas em `400 Bad Request` |

<details>
<summary>❌ Ruim: shapes inconsistentes entre sucesso e erro</summary>

```js
// 200: { "id": "01HV...", "productId": "...", "quantity": 3 }
// 404: "Order not found."
// 400: { "field": "quantity", "problem": "must be positive" }
```

O cliente precisa de três parsers para as três respostas do mesmo endpoint.

</details>

<details>
<summary>✅ Bom: envelope consistente em sucesso e erro</summary>

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
  if (details) error.details = details;

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

O `correlationId` do `meta` é o mesmo que aparece nos logs daquela requisição. O percurso completo
está em [ID de correlação](../standards/observability.md#correlation-id).

</details>

## O corpo de erro no padrão Problem Details

O corpo de erro merece o mesmo cuidado que o de sucesso, e existe um formato pronto para ele. O
**Problem Details** (RFC 9457) define o objeto com `type`, `title`, `status`, `detail` e `instance`.
Adotar esse formato entrega ao cliente um contrato de erro que ele já conhece de outras APIs, e faz a
resposta funcionar de imediato nas ferramentas que leem o padrão.

| Campo | Conteúdo |
|---|---|
| `type` | URI que identifica a classe do problema (ex: `/problems/not-found`) |
| `title` | Resumo curto e estável do problema (`Not Found`) |
| `status` | Código HTTP, igual ao status da resposta |
| `detail` | Mensagem legível sobre este caso específico |
| `instance` | Caminho do recurso que falhou (`/api/v1/orders/123`) |
| `code` | Identificador estável de máquina (`ORDER_NOT_FOUND`), extensão comum ao RFC |
| `errors` | Lista de campos inválidos, presente só em `400` de validação |

```json
{
  "error": {
    "status": 404,
    "title": "Not Found",
    "detail": "Order 123 not found.",
    "code": "ORDER_NOT_FOUND",
    "type": "/problems/not-found",
    "instance": "/api/v1/orders/123"
  }
}
```

Cada campo serve a um leitor diferente. O `error.code` é o que o código do cliente compara em um
`if`. O `error.detail` é o texto que uma pessoa lê na tela ou no log. O `error.status` repete o HTTP
para quem recebeu só o corpo. O `{ code, message }` da seção anterior é a versão compacta desse mesmo
contrato, com `title` no lugar de `message` e `detail` quando o caso pede mais.

## Paginação

A coleção grande volta paginada. A listagem aceita `?page=` e `?pageSize=`, e a resposta diz onde o
cliente está dentro do conjunto. Esses campos ficam em `meta.pagination`, ao lado de `data`, na ordem
em que a frase se lê: página X de Y, tantos por página, tantos no total.

| Campo | Conteúdo |
|---|---|
| `page` | Página atual, começa em 1 |
| `pageSize` | Registros por página, com um padrão e um teto (ex: padrão 10, máximo 100) |
| `totalPages` | Última página, `ceil(totalItems / pageSize)`, nunca abaixo de 1 |
| `totalItems` | Total de registros no conjunto |

O teto no `pageSize` protege o servidor. Sem ele, um `?pageSize=1000000` puxa a coleção inteira em
uma requisição. O valor padrão cobre o caso comum, e o teto limita o pior caso.

## Verbos REST e rotas

O **REST** (Representational State Transfer · Transferência de Estado Representacional) dá a cada
verbo HTTP um significado fixo. Esse significado vale para a API inteira: o verbo faz a mesma coisa
em qualquer rota.

| Verbo | Semântica | Idempotente | Exemplo |
|---|---|---|---|
| `GET` | Leitura sem efeito colateral | Sim | `GET /api/v1/orders`, `GET /api/v1/orders/{id}` |
| `POST` | Criação de recurso | Não | `POST /api/v1/orders` |
| `PUT` | Substituição completa | Sim | `PUT /api/v1/orders/{id}` |
| `PATCH` | Atualização parcial | Não | `PATCH /api/v1/orders/{id}` |
| `DELETE` | Remoção | Sim | `DELETE /api/v1/orders/{id}` |
| `QUERY` | Leitura segura com filtro no corpo | Sim | `QUERY /api/v1/reports` (rascunho IETF) |

A rota segue cinco convenções, e a **URL** (Uniform Resource Locator · Localizador Uniforme de
Recurso) mostra todas elas:

| Convenção                            | Rota                                   |
| :----------------------------------- | :------------------------------------- |
| Kebab-case                           | `/api/v1/order-items`                  |
| Plural na coleção                    | `/api/v1/orders`                       |
| Ação expressa pelo verbo HTTP        | `POST /api/v1/orders`                  |
| Aninhamento quando a relação é clara | `/api/v1/orders/{id}/items`            |
| Filtro e paginação na query string   | `/api/v1/orders?status=pending&page=2` |

As formas que ficam de fora, e o motivo de cada uma: `/api/v1/orderItems` traz camelCase para dentro
da URL, `/api/v1/order` no singular esconde que a rota devolve uma lista, e `/api/v1/create-order`
repete no caminho aquilo que o `POST` já disse.

A operação que não couber em nenhum dos cinco verbos vira um sub-recurso de ação:
`POST /api/v1/orders/{id}/cancel`.

## Códigos de status

O status code é o primeiro nível do contrato. Antes de abrir o corpo da resposta, o cliente já sabe
se a requisição deu certo, de quem foi o erro e se vale a pena tentar de novo.

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

A diferença entre `400` e `422` é fina. O `400` cobre o erro de forma: o servidor não entendeu o que
chegou. O `422` cobre o erro de regra: o servidor entendeu e recusou. Um cliente que valida antes de
enviar quase nunca vê um `400`, enquanto o `422` sempre chega do servidor, porque só ele conhece a
regra.

## Limite de requisições

Uma API aberta precisa se proteger do abuso e do pico acidental. O **rate limiting** (limitação de
taxa) conta as requisições de cada cliente dentro de uma janela de tempo e recusa o excesso com
`429 Too Many Requests`. A resposta ainda informa quando o cliente pode voltar a tentar.

| Cabeçalho | Conteúdo |
|---|---|
| `Retry-After` | Segundos até a próxima tentativa ser aceita |
| `X-RateLimit-Limit` | Teto de requisições na janela |
| `X-RateLimit-Remaining` | Quantas ainda cabem na janela atual |
| `X-RateLimit-Reset` | Quando a janela reinicia |

A contagem acontece por cliente e por rota. Assim o cliente que abusa consome apenas a própria cota,
e os demais continuam atendidos. Os caminhos de navegação (páginas, documentação, favicon) ficam fora
da contagem. Do lado de quem consome, tratar o `429` funciona como em qualquer integração externa:
esperar e tentar de novo, dobrando a espera a cada tentativa (**exponential backoff** · recuo
exponencial). Detalhe em [Integrations](./integrations.md#rate-limits-and-retries).

## Versionamento

A API é um contrato público. Enquanto alguém consumir uma rota, o formato da resposta precisa
continuar o mesmo, e o versionamento fixa esse compromisso em um ponto visível: o prefixo da rota.

Os recursos vivem sob `/api/v1`. O `/api` separa a superfície de API das páginas de navegação e da
documentação, e o `v1` congela o contrato: enquanto ele existir, os campos e o shape das respostas
seguem os mesmos.

Nem toda mudança quebra o contrato, e é essa diferença que decide onde ela entra:

| Mudança | Exemplo | Onde entra |
|---|---|---|
| Aditiva | Campo opcional novo, rota nova, status novo | Mesma versão (`/api/v1`) |
| Incompatível | Renomear ou remover campo, mudar tipo, remover rota | Versão nova (`/api/v2`) |

A mudança incompatível estreia como `/api/v2` e convive lado a lado com a `/api/v1`. A migração leva
o tempo que precisar: o cliente antigo segue na v1, o novo já nasce na v2, e a v1 sai de cena no dia
em que o último consumidor sair dela.

O endpoint operacional fica fora do contrato de versão. O `GET /health` responde o status e a versão
da aplicação, é infraestrutura, e por isso mora fora do prefixo, direto em `/health`.

O GraphQL segue outro caminho, sem versão na URL. O schema evolui somando campos e marcando os
antigos como `deprecated`, e quem consome escolhe quando parar de pedir o campo velho. Veja
[Integrations](./integrations.md#graphql).

<a id="query-verb"></a>

## Leituras com corpo: o verbo QUERY

O relatório é a leitura que o `GET` atende mal. Cada tela quer um recorte próprio, o filtro cresce, e
a query string tem limite de tamanho, aparece no log do servidor e vai parar no cache. Dois caminhos
resolvem esse caso.

O **QUERY** é um método HTTP recente ([rascunho na IETF](https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/)).
Ele é uma leitura segura e idempotente, como o `GET`, com uma diferença que muda tudo aqui: carrega
um corpo. O filtro grande viaja no body, longe do limite da URL, do log e do cache. A resposta volta
no mesmo envelope das outras rotas REST, porque continua sendo uma leitura como qualquer outra.

```bash
curl -X QUERY https://api.exemplo.dev/api/v1/reports \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","from":"2026-01-01","to":"2026-01-31"}'
```

Uma ressalva de ferramenta: o OpenAPI 3.1 não tem campo para o método QUERY no Path Item, e o suporte
a `query` só chega no 3.2. Enquanto as UIs de documentação ignoram o verbo, descreva a rota em prosa,
com o exemplo acima.

O **GraphQL** ataca o mesmo problema por outro ângulo, deixando o cliente escolher os campos da
resposta em uma única consulta. A resposta sai no contrato do próprio GraphQL (`data` e `errors`),
fora do envelope REST, porque cada protocolo mantém a forma que já se espera dele. Detalhe em
[Integrations](./integrations.md#graphql).

## Traduzir o Result para HTTP no limite

O handler devolve um **Result** (tipo de domínio que carrega o sucesso ou a falha), e o controller
traduz esse Result para HTTP. A tradução mora em um lugar só, colada na porta de entrada, e é isso
que mantém a regra de mapeamento visível em vez de espalhada por dentro do handler.

<details>
<summary>❌ Ruim: handler constrói resposta HTTP, mistura domínio e transporte</summary>

```js
async function handle(id, res) {
  const order = await orderService.findById(id);
  if (!order) {
    return httpResponse.status(404).json({ error: 'Not found' });
  }

  return httpResponse.status(200).json(order);
}
```

O **Handler** ficou preso ao `res`. O **worker** (processo que executa tarefas em segundo plano) lê a
mesma operação da fila, chega sem `res` na mão e não consegue chamar esse handler.

</details>

<details>
<summary>✅ Bom: handler retorna Result, controller traduz no boundary</summary>

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
app.get('/api/v1/orders/:id', async (httpRequest, httpResponse) => {
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

O handler volta a ser uma função de domínio, testável sozinha. A tabela de mapeamento fica em um
arquivo só, versionada e fácil de auditar.

</details>

## Documentação a partir do schema

A documentação da API nasce do mesmo schema que valida a entrada, e essa é a única forma de mantê-la
em dia sem esforço manual. Você declara o schema uma vez, e dele saem três coisas: a validação no
limite, os tipos da linguagem e a especificação **OpenAPI** (formato padrão que descreve a API em um
documento). As três nascem juntas, então nenhuma delas envelhece sem as outras.

```
schema → validação no boundary → tipos → OpenAPI → UI de documentação
```

Com a spec pronta, as ferramentas de leitura a renderizam sem trabalho extra. Scalar, Swagger UI e
Redoc mostram cada rota, o corpo esperado e as respostas possíveis; o GraphiQL faz o mesmo para um
schema GraphQL, lendo o schema pela própria API (**introspection** · consulta que a API responde
sobre si mesma). O que sustenta tudo isso é uma regra só: anotar a rota junto do schema, para o
documento nascer do código.

```js
// features/orders/orderRequest.js
import { z } from 'zod';

export const orderRequestSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .openapi('OrderRequest');
```

O mesmo `orderRequestSchema` valida o body, infere o tipo do request e entra na spec OpenAPI. O campo
novo aparece nos três lugares de uma vez.

## Padrões e RFCs

Um contrato previsível se apoia em norma pública. Cada **RFC** recebe um número estável e um texto
aberto, mantido pela IETF: a [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), por exemplo,
especifica o Problem Details que os erros desta página usam.

Adotar um padrão conhecido rende três ganhos concretos. Quem consome a API reconhece o formato de
outras integrações e não reaprende nada. A revisão de uma mudança fica mais curta, porque a norma já
respondeu metade das perguntas. E as ferramentas prontas (cliente, validador, monitor) funcionam sem
adaptação caso a caso.

| Norma | O que define |
|---|---|
| [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) | Semântica de HTTP: verbos, status codes, cabeçalhos |
| [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) | Problem Details: o corpo padrão de um erro |
| [QUERY (rascunho IETF)](https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/) | O método QUERY: leitura segura com corpo |
| [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750) | Bearer Token: o cabeçalho `Authorization: Bearer` |
| [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) | JWT: token assinado que carrega a identidade |
| [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) | JSON: o formato de troca das mensagens |
| [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0) | A especificação que descreve a API |

Catálogo oficial das normas: [rfc-editor.org/series/rfc](https://www.rfc-editor.org/series/rfc/).

## Cross-links

- [Backend Flow](../architecture/backend-flow.md): jobs, webhooks, event-driven além do pipeline síncrono
- [Observability](../standards/observability.md): correlationId, logs estruturados, níveis
- [Security](./security.md): autenticação, autorização e blindagem de cookies no boundary
- [Integrations](./integrations.md): contratos com sistemas externos (GraphQL, XML/SOAP, HMAC)
- [Messaging](./messaging.md): filas, DLQ e entrega quando a API dispara trabalho assíncrono
- [C# API Design](../../csharp/conventions/advanced/api-design.md): Minimal API, TypedResults, `[AsParameters]`
- [VB.NET API Design](../../vbnet/conventions/advanced/api-design.md): Web API 2, roteamento por atributo, async sem deadlock
