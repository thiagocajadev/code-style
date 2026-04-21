# Variables

As regras de `const`, `let` e de valor fixo do JavaScript se aplicam aqui. O que TypeScript
adiciona é o sistema de tipos: quando anotar, quando deixar a inferência trabalhar, e como evitar
buracos no contrato.

## Inferência por padrão

TypeScript deriva o tipo quando a atribuição é óbvia. Anotar o que já é visível é redundância
que polui sem agregar.

<details>
<summary>❌ Bad — anotação repete o que a atribuição já diz</summary>
<br>

```ts
const userName: string = "Alice";
const isActive: boolean = true;
const MAX_RETRIES: number = 3;
const orders: Order[] = [];
```

</details>

<br>

<details>
<summary>✅ Good — inferência quando o tipo é óbvio</summary>
<br>

```ts
const userName = "Alice";
const isActive = true;
const MAX_RETRIES = 3;
const orders: Order[] = []; // anotação necessária — array vazio não tem tipo inferível
```

</details>

## Anotar quando a inferência falha

Inferência quebra quando o tipo não pode ser derivado do valor inicial: variáveis não inicializadas,
arrays vazios, objetos parcialmente construídos.

<details>
<summary>❌ Bad — tipo implícito `any` sem aviso visual</summary>
<br>

```ts
let currentUser; // any — sem tipo, sem proteção
const results = []; // never[] — TypeScript não sabe o tipo dos elementos
```

</details>

<br>

<details>
<summary>✅ Good — anotação explícita onde a inferência não alcança</summary>
<br>

```ts
let currentUser: User | null = null;
const results: Order[] = [];
```

</details>

## any vs unknown

`any` desliga o sistema de tipos naquela variável: é um buraco no contrato. `unknown` mantém o
contrato, pois para usar o valor é obrigatório fazer narrowing primeiro.

<details>
<summary>❌ Bad — any apaga todo o benefício do TypeScript</summary>
<br>

```ts
async function fetchExternalData(): Promise<any> {
  const response = await fetch(apiUrl);
  return response.json(); // qualquer coisa pode sair daqui sem aviso
}

const data = await fetchExternalData();
data.user.name; // TypeScript aceita, mas pode explodir em runtime
```

</details>

<br>

<details>
<summary>✅ Good — unknown força narrowing antes do uso</summary>
<br>

```ts
async function fetchExternalData(): Promise<unknown> {
  const response = await fetch(apiUrl);
  return response.json();
}

const raw = await fetchExternalData();

if (!isApiResponse(raw)) throw new ValidationError({ message: "Unexpected response shape." });

const data = raw; // narrowado para ApiResponse — seguro usar
```

</details>

## as const: tipos literais

`as const` converte um objeto ou array em sua forma mais específica: cada valor vira um literal
type, e o objeto inteiro se torna `readonly`. Indispensável para lookup tables e enums sem enum.

<details>
<summary>❌ Bad — tipo inferido como string, perde a especificidade</summary>
<br>

```ts
const ORDER_STATUS = {
  pending: "pending",
  approved: "approved",
  cancelled: "cancelled",
};
// tipo inferido: { pending: string; approved: string; cancelled: string }
// ORDER_STATUS.pending é string — qualquer string passa

function updateStatus(status: string) { /* ... */ } // sem restrição real
```

</details>

<br>

<details>
<summary>✅ Good — as const preserva os literais</summary>
<br>

```ts
const ORDER_STATUS = {
  pending: "pending",
  approved: "approved",
  cancelled: "cancelled",
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
// OrderStatus = "pending" | "approved" | "cancelled"

function updateStatus(status: OrderStatus) { /* ... */ } // só aceita os valores válidos
```

</details>

## satisfies: validar sem alargar o tipo

`satisfies` valida que um objeto atende a uma interface sem perder o tipo literal inferido.
Diferente da anotação direta, que alarga o tipo para a interface.

<details>
<summary>❌ Bad — anotação direta alarga para o tipo base</summary>
<br>

```ts
interface RouteConfig {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
}

const createOrder: RouteConfig = {
  path: "/orders",
  method: "POST",
};

createOrder.method; // tipo: "GET" | "POST" | "PUT" | "DELETE" — perde a especificidade
```

</details>

<br>

<details>
<summary>✅ Good — satisfies valida e preserva o tipo literal</summary>
<br>

```ts
const createOrder = {
  path: "/orders",
  method: "POST",
} satisfies RouteConfig;

createOrder.method; // tipo: "POST" — literal preservado
```

</details>
