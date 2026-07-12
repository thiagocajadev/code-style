# Funções em TypeScript

Os princípios de função do JavaScript valem aqui inteiros: uma responsabilidade por função, o
orquestrador no topo, nenhuma lógica dentro do `return`. O TypeScript acrescenta uma camada de
contrato. A **signature** (assinatura, a lista de parâmetros tipados mais o tipo de retorno) passa
a ser a documentação da função, e ela precisa se sustentar sozinha: quem chama entende o que entra
e o que sai sem abrir a implementação. Isso pede **return type** (tipo de retorno) explícito nas
funções exportadas, e **generics** (tipos paramétricos) quando o retorno depende do tipo que o
chamador passou.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **return type** (tipo de retorno) | Anotação do que a função devolve; obrigatória em função exportada |
| **signature** (assinatura) | Lista de parâmetros tipados + return type; o contrato público da função |
| **generic** (tipo paramétrico) | Parâmetro de tipo (`<T>`) que carrega tipo do caller para o retorno |
| **overload** (sobrecarga) | Múltiplas assinaturas para a mesma implementação; usar com parcimônia |
| **parameter type** (tipo de parâmetro) | Tipo do argumento na entrada; aceita union, intersection ou genérico |
| **default parameter** (parâmetro padrão) | Valor usado quando o argumento é `undefined` (`function f(x = 0)`) |
| **arrow function** (função flecha) | `() => {}`: sintaxe curta sem `this` próprio; ideal para callbacks |
| **void return** (retorno vazio) | Função sem valor de retorno significativo; declara `: void` explicitamente |

<a id="return-type"></a>

## Toda função exportada declara o que devolve

O compilador infere o retorno sozinho, então a anotação existe por dois outros motivos. O primeiro
é o leitor: `Promise<User | null>` na assinatura avisa que o usuário pode não existir, e quem chama
trata o caso sem precisar abrir a função. O segundo é a estabilidade do contrato. Sem a anotação, o
dia em que alguém mudar o corpo da função e passar a devolver outra coisa, o tipo público muda
junto, sem um erro sequer no arquivo que foi editado. O erro aparece longe dali, nos arquivos que
consomem a função.

<details>
<summary>❌ Ruim: return type implícito em função exportada</summary>

```ts
export async function findUserById(id: string) {
  const user = await db.users.findById(id);
  return user; // o que retorna? depende de olhar a implementação
}

export function calculateInvoiceTotal(items: LineItem[]) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return total;
}
```

</details>

<details>
<summary>✅ Bom: return type explícito nas funções exportadas</summary>

```ts
export async function findUserById(id: string): Promise<User | null> {
  const user = await userRepository.findById(id);
  return user;
}

export function calculateInvoiceTotal(items: LineItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return total;
}
```

</details>

## O objeto de entrada ganha uma interface própria

Quando a função recebe um objeto de configuração ou de domínio, declare o tipo em uma interface
separada e use o nome dela no parâmetro. Escrever o objeto inteiro dentro dos parênteses empurra
cinco linhas de campo para dentro da assinatura, e o leitor que queria saber o que a função faz
precisa atravessar a lista antes de chegar ao retorno. Vale a mesma regra do
[estilo vertical](../../javascript/conventions/functions.md#vertical-parameters): a partir de quatro
campos, os argumentos viram um objeto, e o objeto vira uma interface.

<details>
<summary>❌ Ruim: o tipo escrito dentro dos parênteses esconde a assinatura</summary>

```ts
function createInvoice(data: {
  orderId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  currency: string;
}): Promise<Invoice> { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: interface separada, assinatura limpa</summary>

```ts
interface CreateInvoiceInput {
  orderId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  currency: string;
}

function createInvoice(input: CreateInvoiceInput): Promise<Invoice> { /* ... */ }
```

</details>

## Os sufixos Input e Result nomeiam o contrato da operação

`User` e `Invoice` são tipos do domínio: existem no negócio, e sobrevivem a qualquer função. O que
uma operação recebe e devolve é outra coisa, que só existe por causa dela. Os sufixos `Input` e
`Result` (ou `Output`) marcam essa diferença. `CreateUserInput` diz o que a criação de usuário
precisa receber, e `CreateUserResult` diz o que ela entrega, sem que nenhum dos dois se confunda
com o `User` que o sistema inteiro usa.

<details>
<summary>❌ Ruim: parâmetros soltos e um objeto de retorno que ninguém nomeou</summary>

```ts
async function createUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const user = await persistUser({ name, email, password });
  const token = generateToken(user.id);

  const result = { user, token };

  return result;
}
```

</details>

<details>
<summary>✅ Bom: o contrato da operação tem nome próprio, separado do tipo de domínio</summary>

```ts
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

interface CreateUserResult {
  user: User;
  token: string;
}

async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const user = await persistUser(input);
  const token = generateToken(user.id);

  const result = { user, token };
  return result;
}
```

</details>

## O overload amarra o tipo do retorno ao tipo da entrada

Uma função que devolve `string | number` obriga quem chama a checar qual dos dois veio, mesmo
quando isso já está decidido: quem passou uma `string` sabe que vai receber um `number`. O
**overload** (sobrecarga, várias assinaturas declaradas para a mesma implementação) escreve essa
relação em código, e o compilador passa a saber dela. `parse("42")` tem tipo `number`, e nenhuma
checagem sobra para quem chamou. Declare overload quando a variação é real; para uma assinatura
que não varia, ele é uma linha a mais para manter.

<details>
<summary>❌ Ruim: o retorno é `string | number`, e quem chama não sabe qual dos dois veio</summary>

```ts
function parse(value: string | number): string | number {
  if (typeof value === "string") return parseInt(value, 10);
  return value.toString();
}

const result = parse("42"); // string | number: compilador não sabe que é number
```

</details>

<details>
<summary>✅ Bom: overloads tornam o contrato preciso</summary>

```ts
function parse(value: string): number;
function parse(value: number): string;
function parse(value: string | number): string | number {
  if (typeof value === "string") return parseInt(value, 10);
  return value.toString();
}

const asNumber = parse("42"); // number, compilador sabe
const asString = parse(42); // string, compilador sabe
```

</details>

## O genérico serve para o retorno acompanhar o argumento

Um genérico se paga quando o tipo do retorno depende do tipo que entrou. `firstOrThrow` é o caso:
passe um `Order[]` e receba um `Order`, passe um `User[]` e receba um `User`, sem `as` e sem
checagem no lado de quem chamou. Quando o tipo declarado não aparece no retorno, o genérico
adiciona um parâmetro de tipo à assinatura e não entrega nada em troca. `logAndReturn<T>` funciona
igual com `unknown`, e `validateSchema<T>` devolve `boolean` de qualquer jeito.

<details>
<summary>❌ Ruim: o genérico não chega ao retorno, então não serve para nada</summary>

```ts
function logAndReturn<T>(value: T): T {
  console.log(value); // o genérico não adiciona nada aqui: unknown seria suficiente
  return value;
}

function validateSchema<T>(schema: ZodSchema<T>, data: unknown): boolean {
  return schema.safeParse(data).success; // T não aparece no retorno: desnecessário
}
```

</details>

<details>
<summary>✅ Bom: genérico quando o tipo do retorno depende do argumento</summary>

```ts
function firstOrThrow<TItem>(items: TItem[]): TItem {
  if (items.length === 0) throw new NotFoundError({ message: "List is empty." });

  const first = items[0];
  return first;
}

function parseSchema<TOutput>(schema: ZodSchema<TOutput>, data: unknown): TOutput {
  const result = schema.parse(data); // retorna TOutput: o genérico é necessário
  return result;
}
```

</details>
