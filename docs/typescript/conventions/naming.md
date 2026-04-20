# Naming

As convenções de nomenclatura do JavaScript — camelCase, verbos de intenção, domain-first — se
aplicam integralmente. O TypeScript adiciona três categorias novas: interfaces, type aliases e
parâmetros genéricos.

## Prefixo I

Herança de Java e C# que não tem lugar em TypeScript. O contexto já diz que é um contrato —
o prefixo polui o nome sem adicionar informação.

<details>
<summary>❌ Bad — prefixo I em todas as interfaces</summary>
<br>

```ts
interface IUser { /* ... */ }
interface IOrderRepository { /* ... */ }
interface IPaymentGateway { /* ... */ }

function findUser(repo: IOrderRepository): IUser { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — PascalCase direto, sem prefixo</summary>
<br>

```ts
interface User { /* ... */ }
interface OrderRepository { /* ... */ }
interface PaymentGateway { /* ... */ }

function findUser(repo: OrderRepository): User { /* ... */ }
```

</details>

## Sufixo de papel

Quando o nome precisa expressar o papel estrutural do tipo — não o domínio — use sufixos
reconhecíveis: `Service`, `Repository`, `Handler`, `Config`, `Options`.

<details>
<summary>✅ Good — sufixo expressa papel, não detalhe técnico</summary>
<br>

```ts
interface UserService {
  findById(id: string): Promise<User>;
  create(data: CreateUserInput): Promise<User>;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface AuthConfig {
  secret: string;
  audience: string;
  expiresIn: string;
}
```

</details>

## Type aliases — nomes de domínio

Type aliases para primitivos que têm semântica de negócio: o tipo diz _o que é_, não _como é
armazenado_.

<details>
<summary>❌ Bad — string puro sem semântica</summary>
<br>

```ts
function createOrder(userId: string, productId: string, currency: string): Promise<string> { /* ... */ }
// quem chama não sabe a ordem dos parâmetros — todos são string
```

</details>

<br>

<details>
<summary>✅ Good — aliases expressam o domínio</summary>
<br>

```ts
type UserId = string;
type ProductId = string;
type Currency = "BRL" | "USD" | "EUR";
type OrderId = string;

function createOrder(userId: UserId, productId: ProductId, currency: Currency): Promise<OrderId> { /* ... */ }
```

</details>

## Genéricos — nomes com contexto

`T` é aceitável para um único parâmetro genérico. Com dois ou mais, nomes curtos perdem o
significado. Use `TItem`, `TKey`, `TValue`, `TResult` para expressar o papel de cada um.

<details>
<summary>❌ Bad — T, U, V sem significado quando existem múltiplos</summary>
<br>

```ts
function mapCollection<T, U>(items: T[], transform: (item: T) => U): U[] { /* ... */ }

function groupBy<T, U>(items: T[], keySelector: (item: T) => U): Map<U, T[]> { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — nomes que expressam o papel do parâmetro</summary>
<br>

```ts
function mapCollection<TItem, TResult>(items: TItem[], transform: (item: TItem) => TResult): TResult[] { /* ... */ }

function groupBy<TItem, TKey>(items: TItem[], keySelector: (item: TItem) => TKey): Map<TKey, TItem[]> { /* ... */ }
```

</details>

## Enums — evitar o nativo

O `enum` nativo do TypeScript gera código JavaScript em runtime, tem comportamento de coerção
numérica implícito e dificulta tree-shaking. Um const object com union type derivado entrega o
mesmo benefício sem overhead.

<details>
<summary>❌ Bad — enum nativo com overhead de runtime</summary>
<br>

```ts
enum OrderStatus {
  Pending = "pending",
  Approved = "approved",
  Cancelled = "cancelled",
}

function updateStatus(status: OrderStatus) { /* ... */ }

updateStatus(OrderStatus.Approved); // obrigado a usar o enum — não aceita a string direta
```

</details>

<br>

<details>
<summary>✅ Good — const object + union type derivado</summary>
<br>

```ts
const ORDER_STATUS = {
  pending: "pending",
  approved: "approved",
  cancelled: "cancelled",
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
// "pending" | "approved" | "cancelled"

function updateStatus(status: OrderStatus) { /* ... */ }

updateStatus("approved"); // string literal aceita diretamente
updateStatus(ORDER_STATUS.approved); // ou via objeto — ambos funcionam
```

</details>
