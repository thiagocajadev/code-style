# Types

O sistema de tipos do TypeScript tem duas construções principais para descrever formas: **interface** (contrato de objeto) e **type alias** (apelido de tipo). Cada uma tem um domínio natural. Usá-las nos lugares errados não quebra, mas cria inconsistência que escala mal. Acima delas, **structural typing** (tipagem estrutural) determina compatibilidade pelo formato, não pelo nome.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **interface** (contrato de objeto) | Forma de objeto extensível via `extends` e implementável via `implements` |
| **type alias** (apelido de tipo) | `type X = ...`: apelido para union, intersection, mapped, primitivo ou shape |
| **structural typing** (tipagem estrutural) | Compatibilidade decidida pelo formato; tipos com mesmo shape são compatíveis |
| **union** (união) | `A | B`: valor que pode ser de um ou outro tipo |
| **intersection** (interseção) | `A & B`: valor que satisfaz ambos os tipos simultaneamente |
| **literal type** (tipo literal) | Valor exato como tipo (`"active"`, `42`); usado em discriminated unions |
| **utility type** (tipo utilitário) | `Partial`, `Pick`, `Omit`, `Record`: derivam tipos de outros sem repetição |
| **branded type** (tipo marcado) | Primitivo + tag de tipo para distinguir valores semânticos (`UserId`, `Email`) |

## type vs interface

A distinção prática: `interface` descreve o shape de um objeto e pode ser estendida ou implementada.
`type` descreve qualquer coisa: union, intersection, mapped type, alias de primitivo. Não pode
ser reaberta.

<details>
<summary>❌ Ruim: type onde interface seria natural, interface onde type seria correto</summary>

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

## Genéricos

Genérico em tipos é justificado quando o shape varia com o parâmetro de tipo. Sem variação real,
é abstração sem propósito.

<details>
<summary>❌ Ruim: genérico que não muda o shape</summary>

```ts
interface Response<T> {
  success: boolean;
  message: string; // T nunca aparece: o genérico não serve para nada aqui
}
```

</details>

<details>
<summary>✅ Bom: genérico quando o shape depende do tipo</summary>

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

## Utility types: compor em vez de duplicar

Utility types permitem derivar contratos a partir de tipos existentes. Evitam duplicação e mantêm
os tipos sincronizados quando o tipo base muda.

<details>
<summary>❌ Ruim: duplicação manual do shape com diferenças</summary>

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

## Discriminated unions

Quando um valor pode ser de formas diferentes dependendo do contexto, uma union de interfaces com
um campo literal discriminante permite narrowing automático, sem type assertion, sem cast.

<details>
<summary>❌ Ruim: campo opcional para cada variant, sem discriminante</summary>

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
<summary>✅ Bom: campo discriminante com narrowing automático</summary>

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

## Intersection types: combinar sem herança

Intersection combina dois tipos em um. Útil para compor shapes ortogonais sem criar hierarquia de
classes.

<details>
<summary>❌ Ruim: duplicação manual de campos de shapes existentes</summary>

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
<summary>✅ Bom: intersection para compor shapes independentes</summary>

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

## Evitar type assertions

`as Type` diz ao compilador "confie em mim" e desliga a verificação naquele ponto. Quando o
compilador precisa de convencimento, geralmente é o shape que está errado.

<details>
<summary>❌ Ruim: as Type para forçar o compilador a aceitar</summary>

```ts
const user = await fetchUser(id) as User; // e se retornar null?

const config = JSON.parse(raw) as AppConfig; // JSON.parse retorna any: qualquer shape passa
```

</details>

<details>
<summary>✅ Bom: narrowing real ou validação de esquema</summary>

```ts
const raw = await fetchUser(id);
if (!raw) throw new NotFoundError({ message: `User ${id} not found.` });

const user = raw; // narrowado para User

const parsed = AppConfigSchema.parse(JSON.parse(raw)); // Zod valida e retorna AppConfig
```

</details>
