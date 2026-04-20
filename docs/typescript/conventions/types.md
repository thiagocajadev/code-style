# Types

O sistema de tipos do TypeScript tem duas construções principais para descrever formas: `interface`
e `type`. Cada uma tem um domínio natural. Usá-las nos lugares errados não quebra, mas cria
inconsistência que escala mal.

## type vs interface

A distinção prática: `interface` descreve o shape de um objeto e pode ser estendida ou implementada.
`type` descreve qualquer coisa: union, intersection, mapped type, alias de primitivo. Não pode
ser reaberta.

<details>
<summary>❌ Bad — type onde interface seria natural, interface onde type seria correto</summary>
<br>

```ts
// type para shape de objeto — funciona, mas não é a convenção
type User = {
  id: string;
  name: string;
};

// interface para union type — não compila
interface OrderStatus = "pending" | "approved"; // erro de sintaxe
```

</details>

<br>

<details>
<summary>✅ Good — interface para objetos e contratos</summary>
<br>

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

<br>

<details>
<summary>✅ Good — type para uniões, intersections e aliases</summary>
<br>

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
<summary>❌ Bad — genérico que não muda o shape</summary>
<br>

```ts
interface Response<T> {
  success: boolean;
  message: string; // T nunca aparece — o genérico não serve para nada aqui
}
```

</details>

<br>

<details>
<summary>✅ Good — genérico quando o shape depende do tipo</summary>
<br>

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
<summary>❌ Bad — duplicação manual do shape com diferenças</summary>
<br>

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

<br>

<details>
<summary>✅ Good — derivar a partir do tipo base</summary>
<br>

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
<summary>❌ Bad — campo opcional para cada variant, sem discriminante</summary>
<br>

```ts
interface PaymentResult {
  success?: boolean;
  transactionId?: string; // só existe quando success é true
  errorCode?: string;     // só existe quando success é false
  errorMessage?: string;
}

function handlePayment(result: PaymentResult) {
  if (result.success) {
    console.log(result.transactionId); // string | undefined — TypeScript não garante
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — campo discriminante com narrowing automático</summary>
<br>

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
    console.log(result.transactionId); // string — TypeScript garante
    return;
  }

  console.log(result.errorMessage); // string — narrowado para PaymentFailure
}
```

</details>

## Intersection types: combinar sem herança

Intersection combina dois tipos em um. Útil para compor shapes ortogonais sem criar hierarquia de
classes.

<details>
<summary>❌ Bad — duplicação manual de campos de shapes existentes</summary>
<br>

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

<br>

<details>
<summary>✅ Good — intersection para compor shapes independentes</summary>
<br>

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
<summary>❌ Bad — as Type para forçar o compilador a aceitar</summary>
<br>

```ts
const user = await fetchUser(id) as User; // e se retornar null?

const config = JSON.parse(raw) as AppConfig; // JSON.parse retorna any — qualquer shape passa
```

</details>

<br>

<details>
<summary>✅ Good — narrowing real ou validação de schema</summary>
<br>

```ts
const raw = await fetchUser(id);
if (!raw) throw new NotFoundError({ message: `User ${id} not found.` });
const user = raw; // narrowado para User

const parsed = AppConfigSchema.parse(JSON.parse(raw)); // Zod valida e retorna AppConfig
```

</details>
