# Naming

As convenções de nomenclatura do JavaScript: camelCase, verbos de intenção, **domain-first** (domínio primeiro). Aplicam-se integralmente. O TypeScript adiciona três categorias novas: **interface** (contrato de objeto), **type alias** (apelido de tipo) e **generic parameter** (parâmetro genérico).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **interface** (contrato de objeto) | Forma de objeto extensível e implementável; usada para shapes públicos |
| **type alias** (apelido de tipo) | `type X = ...` — apelido para union, intersection, mapped ou primitivo |
| **generic parameter** (parâmetro genérico) | Variável de tipo na assinatura (`T`, `K`); ganha nome longo quando o domínio pede |
| **PascalCase** (estilo Pascal) | Convenção para tipos, classes e enums (`UserService`, `OrderStatus`) |
| **camelCase** (estilo camelo) | Convenção para variáveis e funções (`fetchUser`, `currentOrder`) |
| **domain term** (termo de domínio) | Palavra que pertence ao negócio (`invoice`, `subscriber`); evita rótulos técnicos (`object`, `entity`) |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `can`, `should` — torna o nome legível como pergunta (`isActive`) |
| **suffix convention** (convenção de sufixo) | `Props`, `Result`, `Options` — sinaliza papel sem repetir tipo |

## Prefixo I

Herança de Java e C# que não tem lugar em TypeScript. O contexto já diz que é um contrato.
O prefixo polui o nome sem adicionar informação.

<details>
<summary>❌ Ruim — prefixo I em todas as interfaces</summary>
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
<summary>✅ Bom — PascalCase direto, sem prefixo</summary>
<br>

```ts
interface User { /* ... */ }
interface OrderRepository { /* ... */ }
interface PaymentGateway { /* ... */ }

function findUser(repo: OrderRepository): User { /* ... */ }
```

</details>

## Sufixo de papel

Quando o nome precisa expressar o papel estrutural do tipo, não o domínio, use sufixos
reconhecíveis: `Service`, `Repository`, `Handler`, `Config`, `Options`.

<details>
<summary>❌ Ruim — nomes vagos, prefixos desnecessários e sufixos sem papel claro</summary>
<br>

```ts
interface IUserRepository { /* ... */ }       // prefixo I desnecessário
interface AbstractBaseHandler { /* ... */ }   // "Abstract" e "Base" não dizem o papel
interface UserManager { /* ... */ }           // Manager não expressa contrato claro
interface UserHelper { /* ... */ }            // Helper não diz o que faz

interface IOrderService {
  handleOrder(data: unknown): Promise<unknown>;
}
```

</details>

<br>

<details>
<summary>✅ Bom — sufixo expressa papel, não detalhe técnico</summary>
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

## Type aliases: nomes de domínio

Type aliases para primitivos que têm semântica de negócio: o tipo diz _o que é_, não _como é
armazenado_.

<details>
<summary>❌ Ruim — string puro sem semântica</summary>
<br>

```ts
function createOrder(userId: string, productId: string, currency: string): Promise<string> { /* ... */ }
// quem chama não sabe a ordem dos parâmetros — todos são string
```

</details>

<br>

<details>
<summary>✅ Bom — aliases expressam o domínio</summary>
<br>

```ts
type UserId = string;
type ProductId = string;
type Currency = "BRL" | "USD" | "EUR";
type OrderId = string;

function createOrder(userId: UserId, productId: ProductId, currency: Currency): Promise<OrderId> { /* ... */ }
```

</details>

## Genéricos: nomes com contexto

`T` é aceitável para um único parâmetro genérico. Com dois ou mais, nomes curtos perdem o
significado. Use `TItem`, `TKey`, `TValue`, `TResult` para expressar o papel de cada um.

<details>
<summary>❌ Ruim — T, U, V sem significado quando existem múltiplos</summary>
<br>

```ts
function mapCollection<T, U>(items: T[], transform: (item: T) => U): U[] { /* ... */ }

function groupBy<T, U>(items: T[], keySelector: (item: T) => U): Map<U, T[]> { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Bom — nomes que expressam o papel do parâmetro</summary>
<br>

```ts
function mapCollection<TItem, TResult>(items: TItem[], transform: (item: TItem) => TResult): TResult[] { /* ... */ }

function groupBy<TItem, TKey>(items: TItem[], keySelector: (item: TItem) => TKey): Map<TKey, TItem[]> { /* ... */ }
```

</details>

## Enums: evitar o nativo

O `enum` nativo do TypeScript gera código JavaScript em runtime, tem comportamento de coerção
numérica implícito e dificulta tree-shaking. Um const object com union type derivado entrega o
mesmo benefício sem overhead.

<details>
<summary>❌ Ruim — enum nativo com overhead de runtime</summary>
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
<summary>✅ Bom — const object + union type derivado</summary>
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
