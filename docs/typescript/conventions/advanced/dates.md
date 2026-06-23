# Dates

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os padrões de data do JavaScript se aplicam sem mudança. O TypeScript adiciona: **branded type** (tipo marcado) para distinguir **timestamps** (carimbos de tempo) de datas formatadas em nível de tipo, e tipagem das funções utilitárias de data.

> Base JavaScript: [javascript/conventions/advanced/dates.md](../../../javascript/conventions/advanced/dates.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **UTC** (Coordinated Universal Time, Tempo Universal Coordenado) | Referência de tempo sem fuso; formato canônico para armazenar e transmitir |
| **ISO 8601** (International Organization for Standardization 8601, Norma Internacional de Datas) | Formato padrão `YYYY-MM-DDTHH:mm:ss.sssZ` para datas em texto |
| **branded type** (tipo marcado) | `string & { __brand: "IsoTimestamp" }`: distingue valores semânticos em nível de tipo |
| **timestamp** (carimbo de tempo) | Instante no tempo em UTC, normalmente como string ISO ou epoch ms |
| **epoch** (época) | Milissegundos desde 1970-01-01T00:00:00Z; representação numérica do instante |
| **timezone** (fuso horário) | Deslocamento regional aplicado na exibição; nunca no armazenamento |
| **`Date`** (tipo nativo) | Tipo built-in que mistura local e UTC; usar atrás de fronteira tipada |
| **`Temporal`** (proposta de API moderna) | API que substitui `Date`; separa tipos por intenção (instant, zoned, plain) |

## Branded types para timestamps

`string` aceita qualquer string. Um branded type `IsoTimestamp` faz o compilador distinguir
um timestamp UTC válido de uma string genérica: a fronteira é explícita, o resto do código fica
protegido.

<details>
<summary>❌ Ruim: string genérica aceita qualquer valor em qualquer posição</summary>

```ts
interface Order {
  id: string;
  customerId: string;
  createdAt: string;  // string: nada impede passar uma data formatada aqui
}

function formatOrderDate(isoString: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(isoString));
}

const order: Order = {
  id: "ord-1",
  customerId: "cust-99",
  createdAt: formatOrderDate(new Date().toISOString()), // passa: mas é data formatada, não ISO
};
```

</details>

<details>
<summary>✅ Bom: branded type distingue timestamp de string genérica</summary>

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
  // createdAt: "19/04/2026",            // erro de compilação: string não é IsoTimestamp
};
```

</details>

## Temporal API tipada (ES2026)

A [**Temporal** (padrão moderno de datas) **API** (Application Programming Interface, Interface de Programação de Aplicações)](https://tc39.es/proposal-temporal/docs/) é nativa do ES2026. Os tipos estão
disponíveis via `@types/temporal-polyfill` ou no `lib` do TypeScript para ambientes ES2026.

<details>
<summary>✅ Bom: Temporal com tipos explícitos</summary>

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
<summary>❌ Ruim: retorno inferido, contrato invisível</summary>

```ts
function parseOrderDate(raw: unknown) {
  const parsed = new Date(raw as string); // qualquer string aceita
  return parsed;
}
```

</details>

<details>
<summary>✅ Bom: input validado, retorno explícito</summary>

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
