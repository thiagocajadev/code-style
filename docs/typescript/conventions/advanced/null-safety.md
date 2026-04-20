# Null Safety

> Escopo: TypeScript. Visão transversal: [shared/null-safety.md](../../../shared/null-safety.md).

TypeScript tem dois mecanismos complementares: o sistema de tipos em compile time e os operadores
de runtime. Juntos, eles eliminam null inesperado sem obrigar checagem manual em cada ponto de uso.

> Conceito geral: [Null Safety](../../../shared/null-safety.md)

## Configuração: compilador como primeira linha de defesa

`strict: true` já inclui `strictNullChecks`. `noUncheckedIndexedAccess` vai além: acesso por índice
passa a retornar `T | undefined`, forçando o tratamento de posições que podem não existir.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

<details>
<summary>❌ Bad — sem strictNullChecks, null passa silenciosamente</summary>
<br>

```ts
// sem strict: true — TypeScript aceita tudo isso sem reclamar
function getFirstItem(items: string[]) {
  return items[0].toUpperCase(); // explode se items for vazio
}

let user: User;
console.log(user.name); // ReferenceError em runtime
```

</details>

<br>

<details>
<summary>✅ Good — compilador aponta os problemas antes do runtime</summary>
<br>

```ts
// com strict + noUncheckedIndexedAccess
function getFirstItem(items: string[]): string | undefined {
  const first = items[0]; // tipo: string | undefined — noUncheckedIndexedAccess
  return first;
}

// ou com guard:
function getFirstOrThrow(items: string[]): string {
  const first = items[0];
  if (!first) throw new NotFoundError({ message: "List is empty." });

  return first;
}
```

</details>

## null vs undefined

TypeScript tem dois valores de ausência. A convenção:

| Valor | Quando usar |
| --- | --- |
| `undefined` | Propriedade opcional, parâmetro não passado, ausência por omissão |
| `null` | Ausência **intencional e explícita**: campo atribuído como "sem valor" |

Prefira `undefined` para opcionais: é o padrão da linguagem. Reserve `null` para quando a
ausência precisa ser **atribuída** explicitamente (ex: limpar um campo em um update).

<details>
<summary>❌ Bad — null e undefined misturados sem intenção</summary>
<br>

```ts
interface User {
  id: string;
  nickname: null | undefined | string; // qual é o contrato?
}

function findUser(id: string): User | null | undefined {
  // quem chama precisa checar os dois
}
```

</details>

<br>

<details>
<summary>✅ Good — um tipo de ausência por contexto</summary>
<br>

```ts
interface User {
  id: string;
  nickname?: string; // opcional — undefined quando não preenchido
}

// busca de entidade: null quando não encontrada
function findUser(id: string): User | null {
  const user = userRepository.findById(id) ?? null;
  return user;
}

// update: null para limpar o campo explicitamente
interface UpdateUserInput {
  nickname?: string | null; // string = novo valor, null = limpar, undefined = não alterar
}
```

</details>

## Coleções nunca são nulas

Função que retorna uma coleção **sempre retorna** `[]` quando não há elementos. Null em lista não
tem semântica útil. Quem chama não deveria precisar checar antes de iterar.

<details>
<summary>❌ Bad — null em coleção quebra qualquer iteração</summary>
<br>

```ts
async function findOrdersByUser(userId: string): Promise<Order[] | null> {
  const orders = await db.orders.findByUser(userId);
  return orders.length ? orders : null;
}

// caller defende-se de null antes de poder usar
const orders = await findOrdersByUser(userId);
if (orders) {
  orders.forEach(processOrder);
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia como estado neutro</summary>
<br>

```ts
async function findOrdersByUser(userId: string): Promise<Order[]> {
  const orders = await orderRepository.findByUser(userId);
  return orders; // ORM já retorna [] quando não há resultados
}

// caller usa diretamente — sem defesa desnecessária
const orders = await findOrdersByUser(userId);
orders.forEach(processOrder);
```

</details>

## Propriedades de coleção em interfaces e classes

Propriedades que representam listas sempre têm tipo `T[]`, nunca `T[] | null`. Inicializadas
como `[]` na declaração ou no construtor.

<details>
<summary>❌ Bad — null como estado inicial de lista</summary>
<br>

```ts
interface Order {
  id: string;
  items: LineItem[] | null; // null força checagem antes de qualquer .map() ou .filter()
}

class Cart {
  items: CartItem[] | null = null;

  total(): number {
    return this.items?.reduce((sum, item) => sum + item.price, 0) ?? 0; // defesa em cascata
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — lista vazia como default, sem null</summary>
<br>

```ts
interface Order {
  id: string;
  items: LineItem[]; // sempre array — [] quando vazio
}

class Cart {
  items: CartItem[] = [];

  total(): number {
    const total = this.items.reduce((sum, item) => sum + item.price, 0);
    return total;
  }
}
```

</details>

## Normalizar na fronteira

Dados externos: resposta de API, input de formulário, config. Chegam sem garantia. Normalize
com `?? []` no ponto de entrada, antes de propagar para o domínio.

<details>
<summary>❌ Bad — campos null/undefined da API propagam direto para o domínio</summary>
<br>

```ts
interface ApiUserResponse {
  id: string;
  orders?: Order[] | null;   // API pode omitir ou retornar null
  tags?: string[] | null;
}

async function fetchUserOrders(userId: string): Promise<Order[]> {
  const response = await externalApi.get<ApiUserResponse>(`/users/${userId}`);

  // propaga null/undefined para quem chamou — domínio precisa se defender
  return response.orders; // tipo: Order[] | null | undefined — erro de compilação com strict
}

// caller obrigado a se defender de null em cada uso
async function buildUserSummary(userId: string) {
  const orders = await fetchUserOrders(userId);
  const count = orders?.length ?? 0; // defesa que deveria ter acontecido na fronteira
}
```

</details>

<br>

<details>
<summary>✅ Good — normalização na fronteira, domínio trabalha com tipos limpos</summary>
<br>

```ts
async function fetchUserOrders(userId: string): Promise<Order[]> {
  const response = await externalApi.get<{ orders?: Order[] }>(`/users/${userId}/orders`);
  const orders = response.orders ?? []; // normaliza na fronteira

  return orders;
}
```

</details>

## Optional chaining e nullish coalescing

`?.` e `??` são atalhos para navegação segura e defaults, não substitutos de validação. Use
quando a ausência é um caso esperado e tratável inline. Quando a ausência é um erro, use guard
clause.

<details>
<summary>❌ Bad — encadeamento que esconde condição de negócio</summary>
<br>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await db.orders.findById(orderId);
  return order?.total ?? 0; // se não existe, é 0? ou deveria ser um erro?
}
```

</details>

<br>

<details>
<summary>✅ Good — guard clause quando ausência é erro; ?. quando ausência é esperada</summary>
<br>

```ts
// ausência é erro → guard clause
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError({ message: `Order ${orderId} not found.` });

  const total = order.total;
  return total;
}

// ausência é esperada → ?. e ?? são suficientes
function formatUserCity(user?: User): string {
  const city = user?.address?.city ?? "Unknown";
  return city;
}
```

</details>

## Non-null assertion: uso restrito

O operador `!` diz ao compilador "confie em mim, não é null". Desliga a verificação naquele ponto.
Aceitável apenas quando você tem garantia externa que o compilador não consegue verificar.

<details>
<summary>❌ Bad — ! para silenciar o compilador sem garantia real</summary>
<br>

```ts
const user = findUser(id)!; // e se retornar null?
const email = form.fields.get("email")!.value; // e se a chave não existir?
```

</details>

<br>

<details>
<summary>✅ Good — guard clause no lugar de !</summary>
<br>

```ts
const user = await findUser(id);
if (!user) throw new NotFoundError({ message: `User ${id} not found.` });

const emailField = form.fields.get("email");
if (!emailField) throw new ValidationError({ message: "Email field is required." });

const email = emailField.value;
```

</details>

<br>

<details>
<summary>✅ Good — ! aceitável com garantia documentada</summary>
<br>

```ts
// após um type guard já verificado no bloco acima, ! é defensável
const map = new Map<string, User>();
map.set("admin", adminUser);

// sabemos que "admin" existe — foi inserido duas linhas acima
const admin = map.get("admin")!;
```

</details>
