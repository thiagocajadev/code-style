# Estreitamento de tipo em TypeScript

Uma variável do tipo `string | number` não deixa você chamar `.padStart()`, porque o método existe
na `string` e não no `number`. Para usar o valor, é preciso primeiro provar ao compilador com qual
dos dois você está lidando. Esse é o **narrowing** (estreitamento de tipo): partir de um tipo amplo
e chegar a um específico dentro de um bloco.

O TypeScript acompanha cada checagem que você escreve. Um `if (typeof id === "number")` é um
**type guard** (guarda de tipo), e dentro dele o compilador já trata `id` como `number`, sem que
ninguém precise afirmar nada. É o contrário do `as`, a **type assertion** (afirmação de tipo), que
declara o tipo sem conferir e assume o risco de estar errado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **narrowing** (estreitamento) | Refinamento de um tipo amplo para um específico dentro de um bloco |
| **type guard** (guarda de tipo) | Expressão que estreita o tipo (`typeof`, `instanceof`, `in`, predicate) |
| **type predicate** (predicado de tipo) | Função `(x): x is T` que diz ao compilador o tipo após retornar `true` |
| **type assertion** (afirmação de tipo) | `as T`: força o tipo sem checagem; último recurso, evitar |
| **discriminated union** (união discriminada) | Union cujo membro é identificado por campo literal (`kind`, `type`) |
| **in operator** (operador `in`) | Verifica presença de propriedade; estreita union por shape |
| **instanceof** (verificação de instância) | Estreita pelo construtor; usado com classes e erros customizados |
| **never** (tipo impossível) | Tipo sem valores; resultado da exhaustiveness check no `default` |

## `typeof` estreita os tipos primitivos

Para `string`, `number`, `boolean` e companhia, a checagem é o `typeof`, e o compilador a entende
sem ajuda. O `as string` do exemplo Ruim afirma um tipo que ninguém conferiu: quando chega um
`number`, `padStart` não existe naquele valor, e a chamada quebra no navegador.

<details>
<summary>❌ Ruim: o as afirma que é string, e ninguém conferiu</summary>

```ts
function formatId(id: string | number): string {
  const formatted = (id as string).padStart(6, "0"); // assume string sem verificar
  return formatted; // explode em runtime se id for number
}
```

</details>

<details>
<summary>✅ Bom: typeof para primitivos</summary>

```ts
function formatId(id: string | number): string {
  if (typeof id === "number") {
    const formatted = id.toString().padStart(6, "0");
    return formatted;
  }

  return id; // narrowado para string
}
```

</details>

## `instanceof` estreita instâncias de classe

Para objetos criados a partir de uma classe, incluindo os erros customizados, a checagem é o
`instanceof`. Ele pergunta pelo construtor, e o compilador estreita o tipo a partir da resposta.

Comparar `error.name === "NotFoundError"` parece equivalente e não é: `name` é uma `string` comum,
que qualquer objeto pode ter com qualquer valor. O `as NotFoundError` que precede a comparação
ainda desliga a checagem do compilador naquela linha.

<details>
<summary>❌ Ruim: compara o nome do erro, que é uma string qualquer</summary>

```ts
async function findUser(id: string): Promise<User> {
  try {
    const user = await db.users.findById(id);
    return user;
  } catch (error) {
    if ((error as NotFoundError).name === "NotFoundError") throw error; // name pode ser qualquer string
    throw new InternalServerError({ cause: error });
  }
}
```

</details>

<details>
<summary>✅ Bom: instanceof para classes e erros tipados</summary>

```ts
async function findUser(id: string): Promise<User> {
  try {
    const user = await userRepository.findById(id);
    return user;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;    // propaga o erro de negócio
    throw new InternalServerError({ cause: error });    // encapsula o técnico
  }
}
```

</details>

<a id="custom-type-guards"></a>

## A função predicado nomeia a checagem que `typeof` não resolve

Checar se um valor vindo de fora é um `PaymentEvent` leva cinco condições encadeadas, e no fim
delas o compilador ainda diz que o tipo é `object`. A checagem escrita dentro do `if` não chega a
lugar nenhum, e precisa ser repetida em cada função que recebe o evento.

A saída é uma função cujo retorno é declarado como `value is PaymentEvent`, chamada de **type
predicate** (predicado de tipo). Ela guarda as cinco condições atrás de um nome (`isPaymentEvent`),
e o `is` diz ao compilador o que concluir quando ela devolve `true`. Depois de
`if (!isPaymentEvent(event)) throw`, `event.amount` é um `number`.

<details>
<summary>❌ Ruim: cinco condições no if, e o tipo continua sendo object</summary>

```ts
function processPayment(event: unknown) {
  if (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    "amount" in event &&
    typeof (event as any).amount === "number"
  ) {
    // tipo ainda é object: TypeScript não sabe que é PaymentEvent
  }
}
```

</details>

<details>
<summary>✅ Bom: função predicado nomeada, reutilizável e tipada</summary>

```ts
function isPaymentEvent(value: unknown): value is PaymentEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "amount" in value &&
    typeof (value as PaymentEvent).amount === "number"
  );
}

function processPayment(event: unknown) {
  if (!isPaymentEvent(event)) throw new ValidationError({ message: "Invalid payment event." });

  const amount = event.amount; // number: compilador sabe
}
```

</details>

<a id="discriminated-unions"></a>

## O campo discriminante estreita o tipo sem checagem manual

`NotificationEvent` reúne três formatos de notificação, e cada um traz campos próprios: o e-mail tem
`recipient`, o SMS tem `phone`, o push tem `deviceToken`. Ler `event.recipient` sem checar nada é
erro de compilação, e com razão: o valor pode ser um SMS, que não tem esse campo.

O campo `type` é o discriminante, e ele resolve a checagem sozinho. Dentro de `case "email"`, o
compilador sabe que só o primeiro formato tem `type: "email"`, e libera `recipient` e `subject`.
Nenhuma linha de checagem foi escrita à mão.

<details>
<summary>❌ Ruim: lê um campo que só existe em um dos formatos, sem checar qual chegou</summary>

```ts
type NotificationEvent =
  | { type: "email"; recipient: string; subject: string }
  | { type: "sms"; phone: string; body: string }
  | { type: "push"; deviceToken: string; title: string; body: string };

function sendNotification(event: NotificationEvent) {
  // acessa recipient sem verificar se type é "email": erro de compilação
  sendEmail(event.recipient, event.subject); // Property 'recipient' does not exist on type 'NotificationEvent'
}
```

</details>

<details>
<summary>✅ Bom: o case decide o formato, e o compilador libera os campos certos</summary>

```ts
type NotificationEvent =
  | { type: "email"; recipient: string; subject: string }
  | { type: "sms"; phone: string; body: string }
  | { type: "push"; deviceToken: string; title: string; body: string };

function sendNotification(event: NotificationEvent) {
  switch (event.type) {
    case "email":
      sendEmail(event.recipient, event.subject); // narrowado para email variant
      break;

    case "sms":
      sendSms(event.phone, event.body); // narrowado para sms variant
      break;

    case "push":
      sendPush(event.deviceToken, event.title, event.body); // narrowado para push variant
      break;
  }
}
```

</details>

<a id="exhaustiveness"></a>

## O `never` no default acusa o caso que ninguém tratou

Um `switch` que esquece um caso não avisa nada: a função devolve `undefined` e a tela mostra um
espaço em branco. O erro nasce no dia em que alguém acrescenta um valor ao tipo, e aparece semanas
depois, em produção.

`const _exhaustive: never = status` no `default` transforma esse esquecimento em erro de build. O
tipo `never` não aceita valor nenhum. Enquanto todos os casos estiverem cobertos, nada sobra para
chegar ao `default`, e a atribuição compila. Assim que um valor novo entra no tipo e ninguém
escreve o `case` dele, é ele que sobra, ele não cabe em `never`, e o compilador aponta a linha.

<details>
<summary>❌ Ruim: o caso esquecido devolve undefined e ninguém fica sabendo</summary>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending": return "Pending review";
    case "approved": return "Approved";
    case "shipped": return "Shipped";
    // "cancelled" esquecido: retorna undefined em runtime
  }
}
```

</details>

<details>
<summary>✅ Bom: never no default garante cobertura total</summary>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending": return "Pending review";
    case "approved": return "Approved";
    case "shipped": return "Shipped";
    case "cancelled": return "Cancelled";
    default: {
      const _exhaustive: never = status; // erro de compilação se faltar um caso
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}
```

</details>

## `?.` e `??` tratam a ausência, e não dizem o que ela significa

`return order?.total ?? 0` devolve zero quando o pedido não existe, e o leitor fica sem saber se
isso é uma regra do negócio (pedido sem item vale zero) ou se é um pedido inexistente sendo tratado
como se fosse legítimo. Os dois casos viram o mesmo número na resposta, e quem chamou não tem como
distinguir.

A cláusula de proteção separa os dois. `if (!order) throw new NotFoundError(...)` diz que pedido
inexistente é erro, e o `total` que sobra abaixo é o valor de um pedido que existe. Os operadores
`?.` e `??` continuam servindo quando a ausência é esperada e o valor padrão é a regra.

<details>
<summary>❌ Ruim: o zero pode ser a regra do negócio ou um pedido que não existe</summary>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await db.orders.findById(orderId);
  return order?.total ?? 0; // se order não existe, é 0? ou é um erro?
}
```

</details>

<details>
<summary>✅ Bom: a cláusula de proteção diz que pedido inexistente é erro</summary>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError({ message: `Order ${orderId} not found.` });

  const total = order.total;
  return total;
}
```

</details>
