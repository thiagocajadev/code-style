# Observability

Os padrões de logging estruturado do JavaScript se aplicam sem mudança. O TypeScript adiciona:
interface tipada para o logger, contexto de correlação tipado e garantia em compilação de que
campos obrigatórios não são omitidos.

> Base JavaScript: [javascript/conventions/advanced/observability.md](../../../../javascript/conventions/advanced/observability.md)

> Conceitos agnósticos: [shared/observability.md](../../../../shared/observability.md)

## Interface tipada para o logger

Tipar a interface do logger força o caller a passar um objeto estruturado — não uma string —
e permite trocar a implementação (Pino, Winston, mock) sem alterar os callers.

<details>
<summary>❌ Bad — logger sem tipo aceita qualquer forma de chamada</summary>
<br>

```ts
// qualquer assinatura passa — strings, objetos, mistura
logger.info(`Order ${orderId} created`);
logger.error(error);
```

</details>

<br>

<details>
<summary>✅ Good — interface tipada, caller obrigado a estruturar</summary>
<br>

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

## Contexto de correlação tipado

`AsyncLocalStorage` com tipo explícito garante que todos os campos obrigatórios do contexto
estão presentes. O caller não pode omitir `correlationId` por engano.

<details>
<summary>❌ Bad — contexto sem tipo, campos podem estar ausentes</summary>
<br>

```ts
const requestStore = new AsyncLocalStorage<Record<string, unknown>>();

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers["x-correlation-id"] ?? crypto.randomUUID();
  requestStore.run({ correlationId }, next); // qualquer shape passa
}

// mixin — campo pode estar ausente sem erro de compilação
const context = requestStore.getStore();
logger.info({ ...context }, "processing"); // context pode ser undefined
```

</details>

<br>

<details>
<summary>✅ Good — store tipado, campos obrigatórios em compilação</summary>
<br>

```ts
interface RequestContext {
  correlationId: string;
}

const requestStore = new AsyncLocalStorage<RequestContext>();

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers["x-correlation-id"] as string | undefined) ?? crypto.randomUUID();

  res.setHeader("x-correlation-id", correlationId);

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

## Níveis de log tipados

Tipar os níveis impede strings inválidas e permite que o caller seja configurável sem perder
a verificação em compilação.

<details>
<summary>❌ Bad — nível como string, qualquer valor aceito</summary>
<br>

```ts
function createLogger(level: string) {
  return pino({ level }); // "debugg", "infoo" — sem erro de compilação
}
```

</details>

<br>

<details>
<summary>✅ Good — union type nos níveis</summary>
<br>

```ts
type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

function createLogger(level: LogLevel = "info") {
  return pino({ level });
}

// "debugg" → erro de compilação
```

</details>
