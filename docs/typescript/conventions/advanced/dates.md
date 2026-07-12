# Datas em TypeScript

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

As regras de data do JavaScript continuam iguais: guardar sempre em **UTC** (Coordinated Universal
Time · Tempo Universal Coordenado), aplicar o fuso só na hora de exibir. O TypeScript acrescenta uma
proteção que o JavaScript não consegue dar. Um **timestamp** (carimbo de tempo) e uma data já
formatada para a tela são os dois uma `string`, e trocar uma pela outra compila sem reclamação. O
**branded type** (tipo marcado) separa as duas no sistema de tipos, e o compilador passa a acusar
a troca.

> Base JavaScript: [javascript/conventions/advanced/dates.md](../../../javascript/conventions/advanced/dates.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) | Referência de tempo sem fuso; formato canônico para armazenar e transmitir |
| **ISO 8601** (International Organization for Standardization 8601, Norma Internacional de Datas) | Formato padrão `YYYY-MM-DDTHH:mm:ss.sssZ` para datas em texto |
| **branded type** (tipo marcado) | `string & { __brand: "IsoTimestamp" }`: distingue valores semânticos em nível de tipo |
| **timestamp** (carimbo de tempo) | Instante no tempo em UTC, normalmente como string ISO ou epoch ms |
| **epoch** (época) | Milissegundos desde 1970-01-01T00:00:00Z; representação numérica do instante |
| **timezone** (fuso horário) | Deslocamento regional aplicado na exibição; nunca no armazenamento |
| **`Date`** (tipo nativo) | Tipo nativo que mistura hora local e UTC; usar atrás de um limite tipado |
| **`Temporal`** (proposta de API moderna) | API que substitui `Date`; separa tipos por intenção (instant, zoned, plain) |

## O tipo marcado separa o timestamp de uma string qualquer

Quando `createdAt` e `formattedDate` são as duas do tipo `string`, o compilador aceita passar uma no
lugar da outra. A data que ia para o banco chega formatada em português, ou a data que ia para a
tela chega em UTC cru, e nada acusa isso até alguém abrir a página.

O tipo marcado resolve pregando uma etiqueta no tipo: `IsoTimestamp` é uma `string` com uma marca
que só a função de validação sabe colocar. Quem quer um `IsoTimestamp` não aceita mais uma `string`
comum. A marca entra em um lugar só, o limite onde o dado é validado, e o resto do código passa a
receber o valor já conferido.

<details>
<summary>❌ Ruim: as duas são string, e o compilador aceita a troca</summary>

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
<summary>✅ Bom: a marca no tipo impede que uma string qualquer entre no lugar</summary>

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

A [**Temporal** (padrão moderno de datas) **API** (Application Programming Interface · Interface de Programação de Aplicações)](https://tc39.es/proposal-temporal/docs/) é nativa do ES2026. Os tipos estão
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

## A função de data declara o que devolve

Funções que convertem ou formatam data ganham retorno explícito. `IsoTimestamp` no retorno diz que
o valor está em UTC e passou pela validação; `string` no retorno diz que ali sai texto para
alguém ler. Sem a anotação, os dois casos têm a mesma cara na chamada, e quem usa a função precisa
abrir a implementação para saber qual dos dois recebeu.

<details>
<summary>❌ Ruim: o retorno não é declarado, e quem chama não sabe o que recebe</summary>

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
