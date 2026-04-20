# Dates

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões de data do JavaScript se aplicam sem mudança. O TypeScript adiciona: branded types
para distinguir timestamps de datas formatadas em nível de tipo, e tipagem das funções utilitárias
de data.

> Base JavaScript: [javascript/conventions/advanced/dates.md](../../../../javascript/conventions/advanced/dates.md)

## Branded types para timestamps

`string` aceita qualquer string. Um branded type `IsoTimestamp` faz o compilador distinguir
um timestamp UTC válido de uma string genérica: a fronteira é explícita, o resto do código fica
protegido.

<details>
<summary>❌ Bad — string genérica aceita qualquer valor em qualquer posição</summary>
<br>

```ts
interface Order {
  id: string;
  customerId: string;
  createdAt: string;  // string — nada impede passar uma data formatada aqui
}

function formatOrderDate(isoString: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(isoString));
}

const order: Order = {
  id: "ord-1",
  customerId: "cust-99",
  createdAt: formatOrderDate(new Date().toISOString()), // passa — mas é data formatada, não ISO
};
```

</details>

<br>

<details>
<summary>✅ Good — branded type distingue timestamp de string genérica</summary>
<br>

```ts
type IsoTimestamp = string & { readonly __brand: "IsoTimestamp" };

function toIsoTimestamp(date: Date): IsoTimestamp {
  return date.toISOString() as IsoTimestamp;
}

interface Order {
  id: string;
  customerId: string;
  createdAt: IsoTimestamp;
}

function formatOrderDate(timestamp: IsoTimestamp, locale = "pt-BR"): string {
  const date = new Date(timestamp);
  const formatted = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);

  return formatted;
}

const order: Order = {
  id: "ord-1",
  customerId: "cust-99",
  createdAt: toIsoTimestamp(new Date()), // ✅
  // createdAt: "19/04/2026",            // erro de compilação — string não é IsoTimestamp
};
```

</details>

## Temporal API tipada (ES2026)

A [Temporal API](https://tc39.es/proposal-temporal/docs/) é nativa do ES2026. Os tipos estão
disponíveis via `@types/temporal-polyfill` ou no `lib` do TypeScript para ambientes ES2026.

<details>
<summary>✅ Good — Temporal com tipos explícitos</summary>
<br>

```ts
function createScheduledEvent(
  title: string,
  startAt: Temporal.ZonedDateTime,
  durationMinutes: number
): ScheduledEvent {
  const endAt = startAt.add({ minutes: durationMinutes });

  const event: ScheduledEvent = {
    title,
    startAt: startAt.toInstant().toString(),
    endAt: endAt.toInstant().toString(),
  };

  return event;
}

// caller declara o timezone explicitamente
const event = createScheduledEvent(
  "Sprint review",
  Temporal.ZonedDateTime.from("2026-04-20T14:00:00[America/Sao_Paulo]"),
  60
);
```

</details>

## Funções utilitárias com retorno tipado

Funções que convertem ou formatam datas devem ter retorno explícito. O caller sabe o que recebe
sem inspecionar a implementação.

<details>
<summary>❌ Bad — retorno inferido, contrato invisível</summary>
<br>

```ts
function parseOrderDate(raw: unknown) {
  const parsed = new Date(raw as string); // qualquer string aceita
  return parsed;
}
```

</details>

<br>

<details>
<summary>✅ Good — input validado, retorno explícito</summary>
<br>

```ts
function parseIsoDate(isoString: IsoTimestamp): Date {
  const date = new Date(isoString);

  return date;
}

function toUtcIso(date: Date): IsoTimestamp {
  return date.toISOString() as IsoTimestamp;
}
```

</details>
