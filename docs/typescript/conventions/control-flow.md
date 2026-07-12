# Controle de fluxo em TypeScript

Os padrões de controle de fluxo do JavaScript continuam iguais aqui: sair cedo, evitar aninhamento,
deixar o caminho feliz no nível de menos recuo. O TypeScript acrescenta um efeito que o JavaScript
não tem. Cada checagem que você escreve para controlar o fluxo também informa o compilador, que
passa a saber mais sobre o tipo da variável depois dela. Isso é o **narrowing** (estreitamento de
tipo), e ele aparece de três formas nesta página: no guard que elimina o nulo, no `switch` sobre uma
**discriminated union** (união discriminada) e no **exhaustiveness check** (verificação de
exaustividade), que faz o compilador acusar o caso esquecido.

> Base JavaScript: [javascript/conventions/control-flow.md](../../javascript/conventions/control-flow.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **narrowing** (estreitamento) | Refinamento de um tipo amplo para um específico após guard ou comparação |
| **type guard** (guarda de tipo) | Expressão que estreita o tipo (`typeof`, `instanceof`, predicate) |
| **discriminated union** (união discriminada) | Union cujo membro é identificado por um campo literal (`kind`, `type`) |
| **exhaustiveness check** (verificação de exaustividade) | Garantia em compilação de que todos os casos da union foram tratados |
| **never** (tipo impossível) | Tipo sem valores; usado em ramos inalcançáveis e checagem de exaustividade |
| **assertion function** (função de afirmação) | Função que lança se a condição falha e estreita o tipo no caller (`asserts x is T`) |
| **early return** (retorno antecipado) | Sair da função assim que o resultado é conhecido; reduz aninhamento |

## A cláusula de proteção elimina o nulo do resto da função

Em TypeScript, a **guard clause** (cláusula de proteção, o `if` que sai da função assim que o caso
inválido aparece) faz dois trabalhos ao mesmo tempo. Ela interrompe o fluxo, como em qualquer
linguagem, e ensina o tipo ao compilador. Depois de `if (!order) return`, o tipo de `order` deixa de
ser `Order | null` e passa a ser `Order` até o fim da função. O `?.` some de todas as linhas
seguintes, porque não existe mais nulo para tratar.

<details>
<summary>❌ Ruim: o valor pode ser nulo, e o ?. se espalha por todas as linhas</summary>

```ts
async function processOrder(orderId: string): Promise<void> {
  const order = await findOrder(orderId); // Order | null

  await sendReceipt(order?.customerId);   // customerId pode ser undefined aqui
  await updateStatus(order?.id, "done");  // id pode ser undefined
}
```

</details>

<details>
<summary>✅ Bom: guard estreita o tipo, resto do código é não-nulo</summary>

```ts
async function processOrder(orderId: string): Promise<void> {
  const order = await findOrder(orderId); // Order | null
  if (!order) return;
  // order: Order. Compilador garante não-nulo daqui para baixo

  await sendReceipt(order.customerId);
  await updateStatus(order.id, "done");
}
```

</details>

## O switch sobre o campo discriminante estreita o tipo sozinho

Uma união discriminada é um union em que cada membro carrega um campo literal que o identifica,
como o `type` de `PaymentEvent`. Ao ver `switch (event.type)`, o compilador liga cada `case` ao
membro correspondente: dentro de `case "payment_success"`, `event.amount` existe e é um `number`;
dentro de `case "payment_failed"`, quem existe é `event.reason`. Escrever `as` para chegar ao campo
é trabalho que o compilador já fez, e o `as` ainda desliga a checagem que protegia aquela linha.

<details>
<summary>❌ Ruim: if/else com o tipo forçado à mão em cada ramo</summary>

```ts
type PaymentEvent =
  | { type: "payment_success"; orderId: string; amount: number }
  | { type: "payment_failed"; orderId: string; reason: string }
  | { type: "payment_refunded"; orderId: string };

function handlePaymentEvent(event: PaymentEvent): void {
  if (event.type === "payment_success") {
    const e = event as { type: "payment_success"; orderId: string; amount: number };
    sendReceipt(e.orderId, e.amount);
  } else if (event.type === "payment_failed") {
    const e = event as { type: "payment_failed"; orderId: string; reason: string };
    notifyFailure(e.orderId, e.reason);
  }
}
```

</details>

<details>
<summary>✅ Bom: dentro de cada case, o compilador já sabe qual é o tipo</summary>

```ts
function handlePaymentEvent(event: PaymentEvent): void {
  switch (event.type) {
    case "payment_success":
      sendReceipt(event.orderId, event.amount); // amount disponível aqui
      break;

    case "payment_failed":
      notifyFailure(event.orderId, event.reason); // reason disponível aqui
      break;

    case "payment_refunded":
      issueRefund(event.orderId);
      break;
  }
}
```

</details>

## O never no default faz o compilador acusar o caso que faltou

Um `default: return "Unknown"` aceita qualquer status que ninguém tratou, e o dia em que
`"cancelled"` entra no tipo, a tela passa a mostrar "Unknown" sem que nada tenha quebrado no build.
O erro só aparece quando alguém abre a página.

`assertNever` inverte isso. O parâmetro é do tipo `never`, que não aceita valor nenhum. Enquanto
todos os `case` estiverem cobertos, o que sobra no `default` é `never`, e a chamada compila. Assim
que um membro novo entra na união, sobra esse membro no `default`, ele não cabe em `never`, e o
compilador aponta a linha. O caso esquecido vira erro de build.

<details>
<summary>❌ Ruim: o caso novo entra no tipo e o switch continua compilando</summary>

```ts
type OrderStatus = "pending" | "approved" | "shipped" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":   return "Aguardando";
    case "approved":  return "Aprovado";
    case "shipped":   return "Enviado";
    // "cancelled" adicionado ao tipo mas esquecido aqui: retorna undefined
    default:          return "Unknown";
  }
}
```

</details>

<details>
<summary>✅ Bom: never no default, compilador avisa se faltar um caso</summary>

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":    return "Aguardando";
    case "approved":   return "Aprovado";
    case "shipped":    return "Enviado";
    case "cancelled":  return "Cancelado";
    default:           return assertNever(status);
    // adicionar "returned" ao tipo → erro de compilação aqui
  }
}
```

</details>

## A função predicado dá nome à checagem e a torna reaproveitável

A checagem escrita dentro do `if` estreita o tipo até certo ponto e para: o compilador conclui que
`data` é um objeto com aquelas chaves, e ainda assim exige o `as Order` para chegar em
`customerId`. Além disso, a mesma sequência de condições precisa ser repetida em cada lugar que
recebe o valor.

Uma função com retorno `value is Order` resolve as duas coisas. Ela dá um nome à checagem
(`isOrder`), e o compilador propaga a conclusão para quem chamou: depois de `if (!isOrder(data))
throw`, `data` é um `Order`, e o `as` desaparece.

<details>
<summary>❌ Ruim: a checagem se repete e ainda exige o as no final</summary>

```ts
function processApiResponse(data: unknown): void {
  if (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "customerId" in data
  ) {
    // data: object. Ainda não é Order para o compilador
    sendConfirmation((data as Order).customerId);
  }
}
```

</details>

<details>
<summary>✅ Bom: a função predicado nomeia a checagem, e o compilador confia nela</summary>

```ts
function isOrder(value: unknown): value is Order {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "customerId" in value &&
    "total" in value
  );
}

function processApiResponse(data: unknown): void {
  if (!isOrder(data)) throw new Error("Invalid order payload");

  sendConfirmation(data.customerId); // data: Order. Compilador sabe
}
```

</details>
