# Nomes em TypeScript

Tudo que vale para nomes em JavaScript continua valendo aqui: camelCase, verbo que declara a intenção, nome tirado do negócio em vez do tipo técnico. O TypeScript acrescenta três categorias de nome que o JavaScript não tem, porque não tem tipos: a **interface** (contrato que descreve a forma de um objeto), o **type alias** (apelido dado a um tipo) e o **generic parameter** (parâmetro genérico, a variável de tipo que aparece na assinatura). Esta página cobre as três.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **interface** (contrato de objeto) | Forma de objeto extensível e implementável; usada para shapes públicos |
| **type alias** (apelido de tipo) | `type X = ...`: apelido para union, intersection, mapped ou primitivo |
| **generic parameter** (parâmetro genérico) | Variável de tipo na assinatura (`T`, `K`); ganha nome longo quando o domínio pede |
| **PascalCase** (estilo Pascal) | Convenção para tipos, classes e enums (`UserService`, `OrderStatus`) |
| **camelCase** (estilo camelo) | Convenção para variáveis e funções (`fetchUser`, `currentOrder`) |
| **domain term** (termo de domínio) | Palavra que pertence ao negócio (`invoice`, `subscriber`); evita rótulos técnicos (`object`, `entity`) |
| **boolean prefix** (prefixo booleano) | `is`, `has`, `can`, `should`: torna o nome legível como pergunta (`isActive`) |
| **suffix convention** (convenção de sufixo) | `Props`, `Result`, `Options`: sinaliza papel sem repetir tipo |

<a id="i-prefix"></a>

## O prefixo I fica fora do nome da interface

O `I` de `IUser` vem do Java e do C#, onde a convenção nasceu. Em TypeScript ele não acrescenta
informação: quem lê `interface User` já tem a palavra `interface` na frente dos olhos. O prefixo
alonga o nome em todo lugar onde o tipo aparece, e a assinatura fica mais longa sem ficar mais
clara.

<details>
<summary>❌ Ruim: prefixo I em todas as interfaces</summary>

```ts
interface IUser { /* ... */ }
interface IOrderRepository { /* ... */ }
interface IPaymentGateway { /* ... */ }

function findUser(repo: IOrderRepository): IUser { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: PascalCase direto, sem prefixo</summary>

```ts
interface User { /* ... */ }
interface OrderRepository { /* ... */ }
interface PaymentGateway { /* ... */ }

function findUser(repo: OrderRepository): User { /* ... */ }
```

</details>

## O sufixo mostra o papel do tipo na arquitetura

Alguns tipos existem para cumprir um papel na estrutura do sistema, e o sufixo é o lugar de dizer
qual. `Service`, `Repository`, `Handler`, `Config` e `Options` são reconhecíveis: quem bate o olho
no nome já sabe onde a peça encaixa. `Manager` e `Helper` falham nesse teste, porque servem para
qualquer coisa.

<details>
<summary>❌ Ruim: nomes vagos, prefixos desnecessários e sufixos sem papel claro</summary>

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

<details>
<summary>✅ Bom: o sufixo mostra onde a peça encaixa</summary>

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

## O apelido de tipo diz o que o valor representa

Uma assinatura com três `string` seguidas obriga quem chama a conferir a documentação para saber
a ordem. Um apelido como `type UserId = string` resolve a leitura: `createOrder(userId: UserId,
productId: ProductId)` mostra qual valor vai em qual posição.

O apelido não muda nada em runtime, e vale saber o que ele não faz: o compilador continua aceitando
um `ProductId` no lugar de um `UserId`, porque para ele os dois são `string`. O ganho está na
assinatura que o leitor entende de primeira.

<details>
<summary>❌ Ruim: três parâmetros string seguidos, sem dizer qual é qual</summary>

```ts
function createOrder(userId: string, productId: string, currency: string): Promise<string> { /* ... */ }
// quem chama não sabe a ordem dos parâmetros: todos são string
```

</details>

<details>
<summary>✅ Bom: o apelido nomeia o que cada parâmetro carrega</summary>

```ts
type UserId = string;
type ProductId = string;
type Currency = "BRL" | "USD" | "EUR";
type OrderId = string;

function createOrder(userId: UserId, productId: ProductId, currency: Currency): Promise<OrderId> { /* ... */ }
```

</details>

## Com dois genéricos na assinatura, uma letra deixa de bastar

`T` sozinho funciona: existe um só parâmetro de tipo, e o leitor não tem com o que confundir. A
partir do segundo, `T` e `U` viram adivinhação, porque nada na letra diz qual deles é a entrada e
qual é o resultado. Nomes como `TItem`, `TKey`, `TValue` e `TResult` respondem isso na própria
assinatura.

<details>
<summary>❌ Ruim: T e U não dizem qual é a entrada e qual é a saída</summary>

```ts
function mapCollection<T, U>(items: T[], transform: (item: T) => U): U[] { /* ... */ }

function groupBy<T, U>(items: T[], keySelector: (item: T) => U): Map<U, T[]> { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: nomes que expressam o papel do parâmetro</summary>

```ts
function mapCollection<TItem, TResult>(items: TItem[], transform: (item: TItem) => TResult): TResult[] { /* ... */ }

function groupBy<TItem, TKey>(items: TItem[], keySelector: (item: TItem) => TKey): Map<TKey, TItem[]> { /* ... */ }
```

</details>

## Prefira um objeto `as const` ao enum nativo

O `enum` é a única construção de tipo do TypeScript que sobrevive à compilação. `interface` e `type`
desaparecem quando o código vira JavaScript; o `enum` vira um objeto de verdade e viaja no arquivo
final que o navegador baixa. Como ele é um objeto que o build não consegue provar que ninguém usa,
o **tree-shaking** (a remoção do código não utilizado durante o build) costuma deixá-lo passar.

Um objeto marcado com `as const`, mais o union type derivado dele, dá o mesmo autocompletar e a
mesma checagem em compilação, aceita a string literal direto na chamada, e some quando o TypeScript
compila.

<details>
<summary>❌ Ruim: o enum nativo sobrevive à compilação e vai para o arquivo final</summary>

```ts
enum OrderStatus {
  Pending = "pending",
  Approved = "approved",
  Cancelled = "cancelled",
}

function updateStatus(status: OrderStatus) { /* ... */ }

updateStatus(OrderStatus.Approved); // obrigado a usar o enum: não aceita a string direta
```

</details>

<details>
<summary>✅ Bom: um objeto as const, e o union type derivado dele</summary>

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
updateStatus(ORDER_STATUS.approved); // ou via objeto: ambos funcionam
```

</details>
