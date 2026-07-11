# Functions

Os princípios de funções do JavaScript: responsabilidade única, top-down, sem lógica no retorno. Aplicam-se aqui sem exceção. O TypeScript adiciona: anotar o **return type** (tipo de retorno) de funções exportadas e tipar parâmetros de forma que o **signature** (assinatura) se sustente sem comentários, com **generics** (tipos paramétricos) quando o contrato precisar carregar tipos.

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

## Return type

Funções exportadas sempre têm return type explícito. O compilador já infere. A anotação é para o
leitor e para garantir que a assinatura pública não mude silenciosamente.

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

## Parâmetros tipados: interface para objetos

Quando a função recebe um objeto de configuração ou dados de domínio, o tipo vai em uma interface
separada, não inline no parâmetro. Segue a mesma regra do [estilo vertical](../../javascript/conventions/functions.md#vertical-parameters):
4+ campos usam objeto; o objeto usa interface.

<details>
<summary>❌ Ruim: tipo inline obscurece a assinatura</summary>

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

## Convenção de sufixo Input/Output

Interfaces de entrada e saída de uma operação usam os sufixos `Input` e `Output` (ou `Result`).
Isso os distingue dos tipos de domínio puros como `User` e `Invoice`.

<details>
<summary>❌ Ruim: primitivos soltos sem interface, contrato sem nome</summary>

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
<summary>✅ Bom: sufixos Input e Output separam contratos de operação dos tipos de domínio</summary>

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
<summary>❌ Ruim: union type no retorno sem discriminação; o caller recebe `string | number` sem saber qual</summary>

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

## Genéricos em funções: só quando preserva o tipo do chamador

Genérico em função é justificado quando o tipo do retorno depende do tipo do argumento. Sem essa
relação, é só complexidade.

<details>
<summary>❌ Ruim: genérico sem propósito, poderia ser unknown ou o tipo concreto</summary>

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
