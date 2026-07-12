# Tipos em TypeScript

O TypeScript tem duas construções para descrever a forma de um valor: a **interface** (contrato de
objeto) e o **type alias** (apelido de tipo). Cada uma tem o seu lugar natural, e trocar as duas
compila do mesmo jeito. O que se perde é a consistência: quem lê o código passa a não conseguir
prever qual das duas vai encontrar.

Acima das duas está o **structural typing** (tipagem estrutural), a regra que decide se um valor
cabe em um tipo. O TypeScript compara o formato: se o objeto tem os campos que o tipo pede, com os
tipos que o tipo pede, ele serve. O nome que foi dado ao tipo não participa dessa decisão.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **interface** (contrato de objeto) | Forma de objeto extensível via `extends` e implementável via `implements` |
| **type alias** (apelido de tipo) | `type X = ...`: apelido para union, intersection, mapped, primitivo ou shape |
| **structural typing** (tipagem estrutural) | Compatibilidade decidida pelo formato; dois tipos com os mesmos campos são intercambiáveis |
| **union** (união) | `A | B`: valor que pode ser de um ou outro tipo |
| **intersection** (interseção) | `A & B`: valor que satisfaz ambos os tipos simultaneamente |
| **literal type** (tipo literal) | Valor exato como tipo (`"active"`, `42`); usado em discriminated unions |
| **utility type** (tipo utilitário) | `Partial`, `Pick`, `Omit`, `Record`: derivam tipos de outros sem repetição |
| **branded type** (tipo marcado) | Primitivo + tag de tipo para distinguir valores semânticos (`UserId`, `Email`) |

<a id="type-vs-interface"></a>

## Quando usar `interface` e quando usar `type`

`interface` descreve o formato de um objeto. Ela aceita `extends` e `implements`, e é a escolha
para contratos: o que um objeto de domínio tem, o que um repositório oferece, o que um serviço
expõe.

`type` descreve qualquer outra coisa que a `interface` não alcança: union, intersection, apelido de
um primitivo, tipo derivado de outro tipo. Um union escrito como `interface` nem compila, e é essa
a linha que separa as duas na prática.

<details>
<summary>❌ Ruim: type para um objeto simples, e interface onde só type funciona</summary>

```ts
// type para shape de objeto: funciona, mas não é a convenção
type User = {
  id: string;
  name: string;
};

// interface para union type: não compila
interface OrderStatus = "pending" | "approved"; // erro de sintaxe
```

</details>

<details>
<summary>✅ Bom: interface para objetos e contratos</summary>

```ts
interface User {
  id: string;
  name: string;
  email: string;
}

interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

interface UserService extends EventEmitter {
  findById(id: string): Promise<User>;
}
```

</details>

<details>
<summary>✅ Bom: type para uniões, intersections e aliases</summary>

```ts
type OrderStatus = "pending" | "approved" | "cancelled" | "shipped";

type UserId = string;
type Timestamp = number;

type AdminUser = User & { permissions: string[] };

type ApiResponse<T> = { data: T; meta: ResponseMeta };
```

</details>

<a id="generics"></a>

## Genéricos

Um genérico se justifica quando o formato do tipo muda de acordo com o parâmetro recebido.
`PaginatedResult<TItem>` é o caso: os campos `total` e `hasNextPage` são sempre iguais, e `items`
muda conforme quem usa. Quando o parâmetro de tipo não aparece em campo nenhum, ele é uma peça a
mais na assinatura sem efeito no resultado.

<details>
<summary>❌ Ruim: o parâmetro de tipo não aparece em nenhum campo</summary>

```ts
interface Response<T> {
  success: boolean;
  message: string; // T nunca aparece: o genérico não serve para nada aqui
}
```

</details>

<details>
<summary>✅ Bom: o parâmetro de tipo decide o formato de um campo</summary>

```ts
interface ApiResponse<TData> {
  data: TData;
  meta: {
    total: number;
    page: number;
  };
}

interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  hasNextPage: boolean;
}

// uso
async function listOrders(): Promise<PaginatedResult<Order>> { /* ... */ }
async function listUsers(): Promise<PaginatedResult<User>> { /* ... */ }
```

</details>

## Derive o tipo a partir do que já existe

`UserDTO` copiado à mão a partir de `User` fica correto no dia em que foi escrito. O problema chega
depois: quem acrescenta um campo em `User` precisa lembrar de acrescentar nos outros três tipos que
copiaram os campos dele, e o compilador não lembra por ninguém.

Os **utility types** (tipos utilitários, como `Partial`, `Pick`, `Omit` e `Record`) escrevem essa
relação em código. `Omit<User, "password">` é lido como "o usuário, sem a senha", e ele acompanha o
`User` sozinho: campo novo em `User` aparece no DTO no mesmo instante.

<details>
<summary>❌ Ruim: o tipo é copiado à mão e sai de sincronia com o original</summary>

```ts
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface UserDTO {          // duplica User sem password
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface UpdateUserInput {  // duplica User com todos os campos opcionais
  name?: string;
  email?: string;
  password?: string;
}
```

</details>

<details>
<summary>✅ Bom: derivar a partir do tipo base</summary>

```ts
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

type UserDTO = Omit<User, "password">;

type UpdateUserInput = Partial<Pick<User, "name" | "email" | "password">>;
```

</details>

<a id="discriminated-unions"></a>

## A união discriminada modela o valor que tem formas diferentes

Um `PaymentResult` com todos os campos opcionais descreve estados que não existem. O tipo aceita um
resultado com `success: true` e `errorCode` preenchido ao mesmo tempo, e aceita um objeto vazio. Do
outro lado, dentro do `if (result.success)`, o compilador continua dizendo que `transactionId` pode
ser `undefined`, porque nada no tipo liga um campo ao outro.

A união discriminada declara os estados que existem de verdade, um por interface, cada um com um
campo literal que o identifica (`status: "success"`). O compilador passa a conhecer a ligação:
depois de checar `result.status === "success"`, `transactionId` é uma `string`, e os campos de erro
não estão disponíveis ali.

<details>
<summary>❌ Ruim: campos opcionais soltos, e o tipo aceita combinações impossíveis</summary>

```ts
interface PaymentResult {
  success?: boolean;
  transactionId?: string; // só existe quando success é true
  errorCode?: string;     // só existe quando success é false
  errorMessage?: string;
}

function handlePayment(result: PaymentResult) {
  if (result.success) {
    console.log(result.transactionId); // string | undefined: TypeScript não garante
  }
}
```

</details>

<details>
<summary>✅ Bom: o campo discriminante diz qual é o estado, e o compilador acompanha</summary>

```ts
interface PaymentSuccess {
  status: "success";
  transactionId: string;
}

interface PaymentFailure {
  status: "failure";
  errorCode: string;
  errorMessage: string;
}

type PaymentResult = PaymentSuccess | PaymentFailure;

function handlePayment(result: PaymentResult) {
  if (result.status === "success") {
    console.log(result.transactionId); // string: TypeScript garante
    return;
  }

  console.log(result.errorMessage); // string: narrowado para PaymentFailure
}
```

</details>

## A intersection soma dois tipos sem criar hierarquia

Auditoria e exclusão lógica são preocupações que aparecem em várias entidades e não têm relação
entre si. Resolver isso com herança obriga a inventar uma classe base que carrega as duas, e toda
entidade que precisa de uma acaba herdando a outra.

A **intersection** (interseção, escrita com `&`) soma os campos sem hierarquia nenhuma.
`BaseOrder & Auditable & SoftDeletable` é lido como a soma das três partes, cada uma declarada
separada e reaproveitável onde fizer sentido.

<details>
<summary>❌ Ruim: os campos de cada parte são copiados dentro da entidade</summary>

```ts
interface Auditable {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface SoftDeletable {
  deletedAt: string | null;
}

interface Order {
  id: string;
  customerId: string;
  total: number;
  // campos de Auditable duplicados manualmente
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // campos de SoftDeletable duplicados manualmente
  deletedAt: string | null;
}
```

</details>

<details>
<summary>✅ Bom: cada parte é declarada uma vez, e a entidade soma as três</summary>

```ts
interface Auditable {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface SoftDeletable {
  deletedAt: string | null;
}

type Order = BaseOrder & Auditable & SoftDeletable;
```

</details>

## O `as` desliga a checagem no ponto em que ela era necessária

`as User` é uma afirmação sua, e o compilador aceita sem conferir nada. Se `fetchUser` devolver
`null`, o tipo continua dizendo `User`, e a linha que lê `user.name` quebra em runtime. Com
`JSON.parse`, que devolve `any`, é pior: qualquer formato passa pelo `as AppConfig`, inclusive um
JSON de outra versão da aplicação.

O `as` costuma aparecer no lugar exato onde o dado veio de fora e ninguém sabe o que ele é, que é
onde a checagem mais valia. Nesses pontos, cabe estreitar o tipo com um `if` de verdade, ou validar
o dado com um schema.

<details>
<summary>❌ Ruim: o as afirma um tipo que ninguém conferiu</summary>

```ts
const user = await fetchUser(id) as User; // e se retornar null?

const config = JSON.parse(raw) as AppConfig; // JSON.parse retorna any: qualquer shape passa
```

</details>

<details>
<summary>✅ Bom: uma checagem de verdade, ou um schema que valida o dado</summary>

```ts
const raw = await fetchUser(id);
if (!raw) throw new NotFoundError({ message: `User ${id} not found.` });
const user = raw; // narrowado para User

const parsed = AppConfigSchema.parse(JSON.parse(raw)); // Zod valida e retorna AppConfig
```

</details>
