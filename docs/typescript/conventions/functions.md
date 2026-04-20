# Functions

Os princípios de funções do JavaScript: responsabilidade única, top-down, sem lógica no retorno.
Aplicam-se aqui sem exceção. O TypeScript adiciona: anotar o return type de funções exportadas e
tipar parâmetros de forma que o contrato se sustente sem comentários.

## Return type

Funções exportadas sempre têm return type explícito. O compilador já infere. A anotação é para o
leitor e para garantir que a assinatura pública não mude silenciosamente.

<details>
<summary>❌ Bad — return type implícito em função exportada</summary>
<br>

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

<br>

<details>
<summary>✅ Good — return type explícito nas funções exportadas</summary>
<br>

```ts
export async function findUserById(id: string): Promise<User | null> {
  const user = await db.users.findById(id);

  return user;
}

export function calculateInvoiceTotal(items: LineItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return total;
}
```

</details>

## Parâmetros tipados: interface para objetos

Quando a função recebe um objeto de configuração ou dados de domínio, o tipo vai em uma interface
separada, não inline no parâmetro. Segue a mesma regra do [estilo vertical](../../javascript/conventions/functions.md#estilo-vertical--parâmetros):
4+ campos usam objeto; o objeto usa interface.

<details>
<summary>❌ Bad — tipo inline obscurece a assinatura</summary>
<br>

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

<br>

<details>
<summary>✅ Good — interface separada, assinatura limpa</summary>
<br>

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

## Convenção de sufixo Input/Output

Interfaces de entrada e saída de uma operação usam os sufixos `Input` e `Output` (ou `Result`).
Isso os distingue dos tipos de domínio puros como `User` e `Invoice`.

<details>
<summary>❌ Bad — primitivos soltos sem interface, contrato sem nome</summary>
<br>

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

<br>

<details>
<summary>✅ Good — sufixos Input e Output separam contratos de operação dos tipos de domínio</summary>
<br>

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

## Overloads: quando a assinatura varia com o tipo

Overloads expressam explicitamente que a função retorna tipos diferentes dependendo do parâmetro.
Use apenas quando a variação é real e precisa ser capturada pelo compilador.

<details>
<summary>❌ Bad — union type no retorno sem discriminação — o caller recebe `string | number` sem saber qual</summary>
<br>

```ts
function parse(value: string | number): string | number {
  if (typeof value === "string") return parseInt(value, 10);
  return value.toString();
}

const result = parse("42"); // string | number — compilador não sabe que é number
```

</details>

<br>

<details>
<summary>✅ Good — overloads tornam o contrato preciso</summary>
<br>

```ts
function parse(value: string): number;
function parse(value: number): string;
function parse(value: string | number): string | number {
  if (typeof value === "string") return parseInt(value, 10);
  return value.toString();
}

const asNumber = parse("42"); // number — compilador sabe
const asString = parse(42); // string — compilador sabe
```

</details>

## Genéricos em funções: só quando preserva o tipo do chamador

Genérico em função é justificado quando o tipo do retorno depende do tipo do argumento. Sem essa
relação, é só complexidade.

<details>
<summary>❌ Bad — genérico sem propósito, poderia ser unknown ou o tipo concreto</summary>
<br>

```ts
function logAndReturn<T>(value: T): T {
  console.log(value); // o genérico não adiciona nada aqui — unknown seria suficiente
  return value;
}

function validateSchema<T>(schema: ZodSchema<T>, data: unknown): boolean {
  return schema.safeParse(data).success; // T não aparece no retorno — desnecessário
}
```

</details>

<br>

<details>
<summary>✅ Good — genérico quando o tipo do retorno depende do argumento</summary>
<br>

```ts
function firstOrThrow<TItem>(items: TItem[]): TItem {
  if (items.length === 0) throw new NotFoundError({ message: "List is empty." });

  const first = items[0];
  return first;
}

function parseSchema<TOutput>(schema: ZodSchema<TOutput>, data: unknown): TOutput {
  const result = schema.parse(data); // retorna TOutput — o genérico é necessário
  return result;
}
```

</details>
