# Datas

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

Guarde e transmita toda data em UTC; só na hora de exibir converta para o fuso do usuário. Essa única regra elimina a maior fonte de bugs silenciosos de data em JavaScript, porque o tipo `Date` mistura **local time** (hora local da máquina) e **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) sem avisar qual dos dois está usando. O formato de transporte é o **ISO 8601** (International Organization for Standardization 8601 · Norma Internacional de Datas): o texto `YYYY-MM-DDTHH:mm:ss.sssZ`, que qualquer sistema lê do mesmo jeito.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) | Referência de tempo sem fuso; formato canônico para armazenar e transmitir |
| **ISO 8601** (International Organization for Standardization 8601 · Norma Internacional de Datas) | Formato padrão `YYYY-MM-DDTHH:mm:ss.sssZ` para datas em texto |
| **Temporal** (proposta de API moderna) | API que substitui `Date` no ECMAScript, separa tipos por intenção (instant, zoned, plain) |
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Contrato público; `Date` e `Intl.DateTimeFormat` são APIs nativas |

## UTC vs hora local

`new Date()` sem argumentos devolve a hora local da máquina que executa o código. Troque a máquina de fuso e o mesmo código passa a dar outro valor. Um servidor em São Paulo e outro em Lisboa gravam horas diferentes para o mesmo instante, e ninguém percebe até o relatório sair errado.

<details>
<summary>❌ Ruim: captura hora local, comportamento depende do servidor</summary>

```js
const createdAt = new Date().toString();
// "Sat Apr 19 2026 11:00:00 GMT-0300": timezone vazando para o valor
```

</details>

<details>
<summary>✅ Bom: UTC explícito, resultado idêntico em qualquer ambiente</summary>

```js
const createdAt = new Date().toISOString();
// "2026-04-19T14:00:00.000Z": inequívoco, portável
```

</details>

## Interpretação de texto inconsistente

`new Date(string)` interpreta o texto de formas diferentes conforme o formato que você passa, e o resultado ainda varia entre **engines** (motores que executam o JavaScript, como o V8 do Chrome). Dois textos quase iguais podem virar dois instantes distintos.

<details>
<summary>❌ Ruim: formato ambíguo, resultado local-dependente</summary>

```js
const date = new Date("01/15/2026");
// Interpretado como meia-noite local; em UTC-3: "2026-01-15T03:00:00.000Z"

const date2 = new Date("2026-01-15");
// Interpretado como meia-noite UTC: "2026-01-15T00:00:00.000Z"
// Mesmo visual, resultados diferentes
```

</details>

<details>
<summary>✅ Bom: ISO 8601 completo, sem ambiguidade</summary>

```js
const date = new Date("2026-01-15T00:00:00.000Z");
// Sempre meia-noite UTC, qualquer engine, qualquer timezone
```

</details>

## Armazenamento vs exibição

Separe o que você guarda do que você mostra. Guardar ou transmitir com `toLocaleDateString()` embute o fuso dentro do próprio valor, e depois não há como recuperar o instante original. O dado só continua portável se você grava em UTC e formata na camada de exibição.

<details>
<summary>❌ Ruim: exibição misturada com armazenamento</summary>

```js
const order = {
  id: "ord_01HV...",
  createdAt: new Date().toLocaleDateString("pt-BR"),
  // "19/04/2026": timezone implícita, não parseável de volta para Date
};
```

</details>

<details>
<summary>✅ Bom: armazenar UTC, formatar só na camada de exibição</summary>

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
// "19/04/2026": formatação explícita, locale e timezone declarados
```

</details>

## Temporal API

`Date` é legado. A [Temporal API](https://tc39.es/proposal-temporal/docs/) (ES2026) resolve os problemas estruturais com um tipo para cada intenção, sem a ambiguidade de fuso do `Date`: `Temporal.Instant` para um instante em UTC, `Temporal.PlainDate` para uma data sem hora, `Temporal.ZonedDateTime` para uma data já com o fuso definido.

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

> `Temporal` tem suporte nativo no Chrome 144+ e Firefox 139+; Safari ainda em progresso.
> Enquanto não há suporte universal, `date-fns` ou `Luxon` são as alternativas recomendadas.
> Evite `moment.js`: descontinuado desde 2020.
