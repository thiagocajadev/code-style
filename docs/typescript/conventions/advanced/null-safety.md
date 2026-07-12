# Segurança contra nulos em TypeScript

> Escopo: TypeScript. Visão transversal: [shared/standards/null-safety.md](../../../shared/standards/null-safety.md).

O TypeScript ataca o nulo por dois lados. Em **compile time** (tempo de compilação), o sistema de
tipos só deixa um valor ser `null` ou `undefined` quando alguém declarou isso, e acusa toda leitura
que não tratou o caso. Em **runtime** (tempo de execução), os operadores `?.` e `??` tratam a
ausência na linha em que ela aparece. A chave que liga o primeiro lado é o
**`strictNullChecks`** (checagem estrita de nulos): sem ele, `null` cabe dentro de qualquer tipo, e
o compilador não tem o que apontar.

> Conceito geral: [Null Safety](../../../shared/standards/null-safety.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **`strictNullChecks`** (checagem estrita de nulos) | Flag do compilador que separa `null`/`undefined` dos demais tipos |
| **`noUncheckedIndexedAccess`** (acesso por índice checado) | Flag que faz `arr[i]` retornar `T | undefined`, forçando tratamento |
| **nullish coalescing** (coalescência de ausente, `??`) | Retorna o lado direito apenas se o esquerdo for `null` ou `undefined` |
| **optional chaining** (encadeamento opcional, `?.`) | Acessa propriedade ou método sem lançar erro se a base for nullish |
| **non-null assertion** (afirmação de não-nulo, `!`) | Força não-nulo sem checagem; último recurso, evitar |
| **definite assignment** (atribuição garantida, `!:`) | Promete ao compilador que o campo será atribuído antes do uso |
| **type guard** (guarda de tipo) | `if (x !== null)`; estreita o tipo após a checagem dentro do bloco |
| **boundary** (limite) | Ponto onde dados externos entram (HTTP, DB, fila); local correto para validar nulos |

## O compilador é a primeira linha de defesa

`strict: true` já liga o `strictNullChecks`, e é o mínimo. `noUncheckedIndexedAccess` vai além e
trata um buraco que passa despercebido: por padrão, `users[10]` tem tipo `User` mesmo quando o array
tem três elementos, e o `undefined` que sai dali só aparece quando a página quebra. Com a flag
ligada, o acesso por índice devolve `User | undefined`, e o compilador exige o tratamento.

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
<summary>❌ Ruim: sem strictNullChecks, null passa silenciosamente</summary>

```ts
// sem strict: true: TypeScript aceita tudo isso sem reclamar
function getFirstItem(items: string[]) {
  return items[0].toUpperCase(); // explode se items for vazio
}

let user: User;
console.log(user.name); // ReferenceError em runtime
```

</details>

<details>
<summary>✅ Bom: compilador aponta os problemas antes do runtime</summary>

```ts
// com strict + noUncheckedIndexedAccess
function getFirstItem(items: string[]): string | undefined {
  const first = items[0]; // tipo: string | undefined: noUncheckedIndexedAccess
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

## `null` e `undefined` têm papéis diferentes

O TypeScript tem dois valores para dizer que algo não está lá, e usar os dois sem critério faz o
leitor perguntar, a cada campo, qual dos dois vai chegar. A convenção do projeto separa os papéis:

| Valor | Quando usar |
| --- | --- |
| `undefined` | Propriedade opcional, parâmetro não passado, ausência por omissão |
| `null` | Ausência **intencional e explícita**: campo atribuído como "sem valor" |

Prefira `undefined` para opcionais: é o padrão da linguagem. Reserve `null` para quando a
ausência precisa ser **atribuída** explicitamente (ex: limpar um campo em um update).

<details>
<summary>❌ Ruim: null e undefined misturados sem intenção</summary>

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

<details>
<summary>✅ Bom: um tipo de ausência por contexto</summary>

```ts
interface User {
  id: string;
  nickname?: string; // opcional: undefined quando não preenchido
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

<a id="collections-never-null"></a>

## Coleções nunca são nulas

Uma função que devolve lista devolve `[]` quando não há elementos. Uma lista nula e uma lista vazia
significam a mesma coisa para quem vai percorrê-la (não há o que percorrer), e a diferença entre as
duas só serve para obrigar uma checagem antes de cada `for` e cada `map`. Devolvendo `[]`, o laço
roda zero vezes e o assunto está resolvido.

<details>
<summary>❌ Ruim: a lista nula quebra o laço de quem a recebeu</summary>

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

<details>
<summary>✅ Bom: lista vazia como estado neutro</summary>

```ts
async function findOrdersByUser(userId: string): Promise<Order[]> {
  const orders = await orderRepository.findByUser(userId);
  return orders; // ORM já retorna [] quando não há resultados
}

// caller usa diretamente: sem defesa desnecessária
const orders = await findOrdersByUser(userId);
orders.forEach(processOrder);
```

</details>

## O campo de lista já nasce como lista vazia

A mesma regra vale para campos de interface e de classe. Um campo declarado como `T[]` e inicializado
com `[]` na declaração ou no construtor nunca chega nulo a quem o lê. Declará-lo como `T[] | null`
espalha a checagem por todo lugar que toca o campo, e basta um esquecimento para a página quebrar.

<details>
<summary>❌ Ruim: a lista começa nula, e todo acesso precisa checar</summary>

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

<details>
<summary>✅ Bom: a lista vazia é o valor inicial, e o campo nunca é nulo</summary>

```ts
interface Order {
  id: string;
  items: LineItem[]; // sempre array: [] quando vazio
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

## Limpe o dado no limite, antes de ele entrar no domínio

Resposta de **API** (Application Programming Interface · Interface de Programação de Aplicações),
campo de formulário e arquivo de configuração chegam sem garantia nenhuma. Se o `null` que veio de
fora entrar no domínio como está, cada função lá dentro passa a conviver com ele, e a checagem se
repete em toda camada.

O lugar de resolver isso é o ponto de entrada. Um `?? []` e um `?? ""` no limite convertem a
ausência no valor neutro de uma vez, e o domínio inteiro passa a trabalhar com tipos que não
carregam nulo.

<details>
<summary>❌ Ruim: o null da API entra no domínio e se espalha por todas as camadas</summary>

```ts
interface ApiUserResponse {
  id: string;
  orders?: Order[] | null;   // API pode omitir ou retornar null
  tags?: string[] | null;
}

async function fetchUserOrders(userId: string): Promise<Order[]> {
  const response = await externalApi.get<ApiUserResponse>(`/users/${userId}`);

  // propaga null/undefined para quem chamou: domínio precisa se defender
  return response.orders; // tipo: Order[] | null | undefined: erro de compilação com strict
}

// caller obrigado a se defender de null em cada uso
async function buildUserSummary(userId: string) {
  const orders = await fetchUserOrders(userId);
  const count = orders?.length ?? 0; // defesa que deveria ter acontecido no limite
}
```

</details>

<details>
<summary>✅ Bom: o dado é limpo no limite, e o domínio recebe tipos sem nulo</summary>

```ts
async function fetchUserOrders(userId: string): Promise<Order[]> {
  const response = await externalApi.get<{ orders?: Order[] }>(`/users/${userId}/orders`);
  const orders = response.orders ?? []; // normaliza no limite
  return orders;
}
```

</details>

## `?.` e `??` tratam a ausência esperada

Os dois operadores servem quando a ausência faz parte do fluxo normal e tem um valor padrão óbvio:
o usuário não preencheu o telefone, e o campo aparece em branco. Nesses casos, resolver na própria
linha é o certo.

Quando a ausência significa que algo deu errado, esses operadores escondem o erro atrás de um valor
qualquer. `order?.total ?? 0` devolve zero para um pedido que não existe, e a resposta sai como se
fosse um pedido legítimo de valor zero. Aí o lugar é a cláusula de proteção, que interrompe o fluxo
e diz o que aconteceu.

<details>
<summary>❌ Ruim: o encadeamento devolve um valor padrão para um caso que era erro</summary>

```ts
async function getOrderTotal(orderId: string): Promise<number> {
  const order = await db.orders.findById(orderId);
  return order?.total ?? 0; // se não existe, é 0? ou deveria ser um erro?
}
```

</details>

<details>
<summary>✅ Bom: a proteção trata o erro, e o ?. trata a ausência que era esperada</summary>

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

## O `!` desliga a checagem, e cabe em poucos lugares

O operador `!` afirma ao compilador que aquele valor não é nulo, e ele acredita sem conferir. Se a
afirmação estiver errada, o erro reaparece em runtime, no mesmo lugar onde a checagem teria pegado.

Ele se justifica quando você tem uma garantia que o compilador não consegue enxergar, como um
elemento do DOM que o próprio arquivo HTML declara. Fora disso, cabe a cláusula de proteção, que
custa uma linha e trata o caso em vez de negá-lo.

<details>
<summary>❌ Ruim: o ! cala o compilador sem nenhuma garantia por trás</summary>

```ts
const user = findUser(id)!; // e se retornar null?
const email = form.fields.get("email")!.value; // e se a chave não existir?
```

</details>

<details>
<summary>✅ Bom: a cláusula de proteção no lugar do !</summary>

```ts
const user = await findUser(id);
if (!user) throw new NotFoundError({ message: `User ${id} not found.` });

const emailField = form.fields.get("email");
if (!emailField) throw new ValidationError({ message: "Email field is required." });

const email = emailField.value;
```

</details>

<details>
<summary>✅ Bom: ! aceitável com garantia documentada</summary>

```ts
// após um type guard já verificado no bloco acima, ! é defensável
const map = new Map<string, User>();
map.set("admin", adminUser);

// sabemos que "admin" existe: foi inserido duas linhas acima
const admin = map.get("admin")!;
```

</details>
