# Dates

Datas são uma das maiores fontes de bugs silenciosos em JavaScript. `Date` mistura local time e
UTC de forma imprevisível — a regra é simples: armazenar e transmitir sempre em UTC ISO 8601,
converter para o fuso local só na exibição.

## UTC vs local time

`new Date()` sem argumentos retorna a hora **local da máquina**. Em servidores com timezones
diferentes, o mesmo código produz resultados diferentes.

<details>
<br>
<summary>❌ Bad — captura hora local, comportamento depende do servidor</summary>

```js
const createdAt = new Date().toString();
// "Sat Apr 19 2026 11:00:00 GMT-0300" — timezone vazando para o valor
```

</details>

<br>

<details>
<br>
<summary>✅ Good — UTC explícito, resultado idêntico em qualquer ambiente</summary>

```js
const createdAt = new Date().toISOString();
// "2026-04-19T14:00:00.000Z" — inequívoco, portável
```

</details>

## Parsing inconsistente

O comportamento de `new Date(string)` muda conforme o formato passado — e varia entre engines.

<details>
<br>
<summary>❌ Bad — formato ambíguo, resultado local-dependente</summary>

```js
const date = new Date("01/15/2026");
// Interpretado como meia-noite local — em UTC-3: "2026-01-15T03:00:00.000Z"

const date2 = new Date("2026-01-15");
// Interpretado como meia-noite UTC — "2026-01-15T00:00:00.000Z"
// Mesmo visual, resultados diferentes
```

</details>

<br>

<details>
<br>
<summary>✅ Good — ISO 8601 completo, sem ambiguidade</summary>

```js
const date = new Date("2026-01-15T00:00:00.000Z");
// Sempre meia-noite UTC, qualquer engine, qualquer timezone
```

</details>

## Armazenamento vs exibição

Armazenar ou transmitir com `toLocaleDateString()` embute o fuso no valor — impossível reverter
depois. Separar armazenamento de exibição mantém o dado portável.

<details>
<br>
<summary>❌ Bad — exibição misturada com armazenamento</summary>

```js
const order = {
  id: "ord_01HV...",
  createdAt: new Date().toLocaleDateString("pt-BR"),
  // "19/04/2026" — timezone implícita, não parseável de volta para Date
};
```

</details>

<br>

<details>
<br>
<summary>✅ Good — armazenar UTC, formatar só na camada de exibição</summary>

```js
const order = {
  id: "ord_01HV...",
  createdAt: new Date().toISOString(), // armazenamento
};

function formatOrderDate(isoString, locale = "pt-BR") {
  const date = new Date(isoString);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);

  return formattedDate;
}
// "19/04/2026" — formatação explícita, locale e timezone declarados
```

</details>

## Temporal API

`Date` é legado — a [Temporal API](https://tc39.es/proposal-temporal/docs/) (ES2025, Stage 4)
resolve os problemas estruturais com tipos explícitos: `Temporal.Instant` para timestamps UTC,
`Temporal.PlainDate` para datas sem hora, `Temporal.ZonedDateTime` para datas com timezone.

```js
// Timestamp UTC inequívoco
const now = Temporal.Now.instant();
// Temporal.Instant <2026-04-19T14:00:00Z>

// Data sem hora (sem ambiguidade de timezone)
const birthDate = Temporal.PlainDate.from("1990-08-21");

// Data com timezone explícita
const appointment = Temporal.ZonedDateTime.from(
  "2026-04-19T14:00:00[America/Sao_Paulo]"
);
```

> Enquanto `Temporal` não tem suporte universal, `date-fns` ou `Luxon` são as alternativas
> recomendadas. Evitar `moment.js` — deprecated desde 2020.
