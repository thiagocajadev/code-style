# Observabilidade em TypeScript

> Escopo: TypeScript. Visão transversal: [shared/standards/observability.md](../../../shared/standards/observability.md).

O **structured logging** (log estruturado, o log emitido como objeto JSON em vez de frase solta) do
JavaScript continua igual aqui. O que o TypeScript acrescenta é a garantia de que o log sai
completo. Uma interface tipada para o logger obriga quem chama a passar um objeto, e um contexto
tipado faz o compilador acusar o `correlationId` que alguém esqueceu de incluir. O campo que falta
deixa de ser algo que você descobre no dia do incidente, quando o log não serve para nada.

> Base JavaScript: [javascript/conventions/advanced/observability.md](../../../javascript/conventions/advanced/observability.md)

> Conceitos agnósticos: [shared/standards/observability.md](../../../shared/standards/observability.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **structured logging** (log estruturado) | Log emitido como objeto JSON com campos pesquisáveis, não string concatenada |
| **`Logger`** (interface tipada de log) | Contrato que o logger cumpre; obriga quem chama a passar um objeto estruturado |
| **log level** (nível de log) | Severidade tipada por união literal: `"trace" | "debug" | "info" | "warn" | "error"` |
| **correlation ID** (ID de correlação) | Identificador único por requisição que aparece em todos os logs do mesmo fluxo |
| **`LogContext`** (contexto tipado) | Tipo do payload do log; campos obrigatórios não podem ser omitidos |
| **redaction** (redação) | Remoção ou mascaramento de campos sensíveis antes de emitir |
| **PII** (Personally Identifiable Information · Informação Pessoal Identificável) | Dado que identifica um indivíduo; nunca sai cru no log |
| **trace** (rastro) | Caminho de uma requisição atravessando múltiplos serviços; cada salto é um span |

## A interface do logger obriga o log a ser estruturado

Um logger sem tipo aceita `logger.info("pedido criado " + orderId)`, e o resultado é uma frase.
Buscar por ela no painel de logs significa procurar por texto, e filtrar por cliente ou por status
deixa de ser possível, porque não existe campo para filtrar.

A interface tipada resolve na origem: o segundo parâmetro é um objeto, e quem chama não tem como
passar uma string concatenada. Ela também deixa a implementação trocável, porque o código depende
do contrato e não do Pino ou do Winston.

<details>
<summary>❌ Ruim: o logger sem tipo aceita a frase concatenada</summary>

```ts
// qualquer assinatura passa: strings, objetos, mistura
logger.info(`Order ${orderId} created`);
logger.error(error);
```

</details>

<details>
<summary>✅ Bom: a interface obriga quem chama a passar campos pesquisáveis</summary>

```ts
interface Logger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

// uso
const orderContext = { orderId, customerId };
logger.info(orderContext, "order created");
```

</details>

## O contexto de correlação declara os campos obrigatórios

O **correlation ID** (ID de correlação) é o que permite juntar todas as linhas de log de uma mesma
requisição, mesmo quando ela passa por três serviços. Ele só serve se estiver em todas elas, e um
contexto sem tipo não garante isso: basta alguém montar o objeto sem o campo, e aquele fluxo fica
sem rastro.

`AsyncLocalStorage` com o tipo declarado transforma o esquecimento em erro de compilação. O
`correlationId` faz parte do contrato do contexto, e um objeto sem ele não entra.

<details>
<summary>❌ Ruim: o contexto não tem tipo, e o campo pode faltar sem ninguém notar</summary>

```ts
const requestStore = new AsyncLocalStorage<Record<string, unknown>>();

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers["x-correlation-id"] ?? crypto.randomUUID();
  requestStore.run({ correlationId }, next); // qualquer shape passa
}

// mixin: campo pode estar ausente sem erro de compilação
const context = requestStore.getStore();
logger.info({ ...context }, "processing"); // context pode ser undefined
```

</details>

<details>
<summary>✅ Bom: o contexto é tipado, e o campo que falta vira erro de compilação</summary>

```ts
interface RequestContext {
  correlationId: string;
}

const requestStore = new AsyncLocalStorage<RequestContext>();

export function correlationMiddleware(request: Request, response: Response, next: NextFunction): void {
  const correlationId =
    (request.headers["x-correlation-id"] as string | undefined) ?? crypto.randomUUID();

  response.setHeader("x-correlation-id", correlationId);

  const store: RequestContext = { correlationId };
  requestStore.run(store, next);
}

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}
```

```ts
// logger com mixin tipado
import pino from "pino";

export const logger = pino({
  mixin(): Record<string, unknown> {
    const context = getRequestContext();
    if (!context) return {};

    const mixin: Record<string, unknown> = { correlationId: context.correlationId };
    return mixin;
  },
});
```

</details>

## O nível de log é uma união literal, não uma string

Com o nível declarado como `string`, `logger.log("infoo", ...)` compila, e a linha some do painel
porque nenhum filtro conhece esse nível. A união literal (`"trace" | "debug" | "info" | "warn" |
"error"`) limita os valores aceitos aos que existem, e o erro de digitação vira erro de compilação.

<details>
<summary>❌ Ruim: o nível é uma string, e qualquer valor passa</summary>

```ts
function createLogger(level: string) {
  return pino({ level }); // "debugg", "infoo": sem erro de compilação
}
```

</details>

<details>
<summary>✅ Bom: union type nos níveis</summary>

```ts
type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

function createLogger(level: LogLevel = "info") {
  return pino({ level });
}

// "debugg" → erro de compilação
```

</details>
