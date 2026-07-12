# Variáveis em TypeScript

As regras de `const`, `let` e valor que não muda depois de atribuído vêm do JavaScript e continuam
as mesmas. O que o TypeScript acrescenta é a decisão de tipo: quando anotar, quando deixar a
**type inference** (inferência de tipo, o compilador deduzindo o tipo a partir do valor) trabalhar
sozinha, e como usar `as const`, `satisfies` e `unknown` para o contrato não abrir buraco.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **type inference** (inferência de tipo) | Compilador deduz o tipo a partir da atribuição; padrão preferido |
| **type annotation** (anotação de tipo) | Declaração explícita do tipo (`const x: number = 0`); usar quando agrega informação |
| **`as const`** (afirmação literal) | Congela o valor como literal exato e torna campos `readonly` |
| **`satisfies`** (operador de conformidade) | Valida que o valor cumpre o tipo sem alargar a tipagem inferida |
| **`any`** (tipo escape) | Desliga a checagem naquela variável; anti-padrão, salvo em um limite controlado do sistema |
| **`unknown`** (tipo seguro de origem desconhecida) | Tipo amplo que obriga a checar antes de usar; o substituto correto de `any` |
| **narrowing** (estreitamento de tipo) | Checagem que reduz o tipo até o compilador saber com o que está lidando |
| **non-null assertion** (afirmação de não-nulo, `!`) | Força não-nulo sem checagem; evitar fora de testes ou inicialização garantida |
| **definite assignment** (atribuição garantida) | `let x!: T`: promete ao compilador que será atribuído antes do uso |

<a id="what-is-inference"></a>

## O que é inferência de tipo

Inferência é o compilador descobrir o tipo sozinho, olhando para o valor que você atribuiu. Quando
você escreve `const userName = "Alice"`, ninguém disse ao TypeScript que `userName` é uma `string`.
Ele leu o valor `"Alice"`, concluiu que só pode ser uma `string`, e passou a tratar a variável assim
daí em diante. A partir desse momento `userName.toUpperCase()` é aceito, e `userName * 2` é acusado
como erro, exatamente como se o tipo estivesse escrito na declaração.

Isso vale para o resto da linguagem, e não só para variáveis. O retorno de uma função é inferido a
partir do que ela devolve; o tipo de um item dentro de um `map` é inferido a partir do array; o tipo
de um objeto é inferido campo a campo. Escrever tipo à mão é a exceção, reservada para os casos em
que não existe valor de onde inferir, ou em que o tipo inferido é mais amplo do que se quer.

Vale saber o limite da inferência: ela olha o valor daquele momento, e nada mais. Um array vazio
não tem elemento de onde tirar o tipo, uma variável declarada sem valor não tem valor nenhum, e uma
resposta que chegou pela rede é um `unknown` que o compilador não tem como adivinhar. Nesses três
casos a anotação deixa de ser redundância e vira a única fonte de informação.

<a id="inference-by-default"></a>

## Deixe o compilador inferir o tipo óbvio

O TypeScript deriva o tipo a partir do valor atribuído. Escrever `const userName: string = "Alice"`
repete no tipo o que o valor já mostra, e o leitor passa por duas informações para receber uma. A
anotação vale quando ela acrescenta algo que o valor não diz.

<details>
<summary>❌ Ruim: anotação repete o que a atribuição já diz</summary>

```ts
const userName: string = "Alice";
const isActive: boolean = true;
const MAX_RETRIES: number = 3;
const orders: Order[] = [];
```

</details>

<details>
<summary>✅ Bom: inferência quando o tipo é óbvio</summary>

```ts
const userName = "Alice";
const isActive = true;
const MAX_RETRIES = 3;
const orders: Order[] = []; // anotação necessária: array vazio não tem tipo inferível
```

</details>

## Anote quando não há valor de onde inferir

A inferência precisa de um valor inicial para funcionar. Sem ele, o compilador não tem de onde tirar
o tipo: uma variável declarada vazia vira `any`, e um array vazio vira `never[]`, que não aceita
nenhum elemento depois. Nos dois casos a anotação é o que informa o tipo.

<details>
<summary>❌ Ruim: tipo implícito `any` sem aviso visual</summary>

```ts
let currentUser; // any: sem tipo, sem proteção
const results = []; // never[]: TypeScript não sabe o tipo dos elementos
```

</details>

<details>
<summary>✅ Bom: anotação explícita onde a inferência não alcança</summary>

```ts
let currentUser: User | null = null;
const results: Order[] = [];
```

</details>

<a id="any-vs-unknown"></a>

## Use `unknown` no lugar de `any`

`any` desliga a checagem de tipos naquela variável, e o efeito atravessa tudo que sai dela:
`data.user.name` compila mesmo quando a resposta não tem `user`, e o erro só aparece em runtime,
no navegador do usuário. `unknown` diz a mesma coisa (o valor chegou de fora e não se sabe o que é)
sem abrir mão da checagem: para usar o valor, é preciso primeiro provar ao compilador o que ele é.

<details>
<summary>❌ Ruim: any apaga todo o benefício do TypeScript</summary>

```ts
async function fetchExternalData(): Promise<any> {
  const response = await fetch(apiUrl);
  return response.json(); // qualquer coisa pode sair daqui sem aviso
}

const data = await fetchExternalData();
data.user.name; // TypeScript aceita, mas pode explodir em runtime
```

</details>

<details>
<summary>✅ Bom: unknown obriga a checar o formato antes de usar o valor</summary>

```ts
async function fetchExternalData(): Promise<unknown> {
  const response = await fetch(apiUrl);
  return response.json();
}

const raw = await fetchExternalData();
if (!isApiResponse(raw)) throw new ValidationError({ message: "Unexpected response shape." });

const data = raw; // narrowado para ApiResponse: seguro usar
```

</details>

## `as const` prende o valor ao literal exato

Sem `as const`, o compilador vê `pending: "pending"` e infere `string`, porque supõe que o campo
pode receber outra string depois. O tipo aceita qualquer string, e a restrição que o objeto parecia
declarar não existe. Com `as const`, cada valor vira o literal exato (`"pending"`, e não `string`),
e o objeto inteiro passa a ser somente leitura. É o que permite derivar dele um union type com os
valores válidos, o padrão que substitui o `enum`.

<details>
<summary>❌ Ruim: tipo inferido como string, perde a especificidade</summary>

```ts
const ORDER_STATUS = {
  pending: "pending",
  approved: "approved",
  cancelled: "cancelled",
};
// tipo inferido: { pending: string; approved: string; cancelled: string }
// ORDER_STATUS.pending é string: qualquer string passa

function updateStatus(status: string) { /* ... */ } // sem restrição real
```

</details>

<details>
<summary>✅ Bom: as const preserva os literais</summary>

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

## `satisfies` confere o tipo e preserva o literal

Anotar `const createOrder: RouteConfig` faz o compilador tratar o objeto como um `RouteConfig`
qualquer, e `createOrder.method` volta a ser o union inteiro (`"GET" | "POST" | "PUT" | "DELETE"`).
A informação de que ali dentro o método é `"POST"` se perde na anotação.

`satisfies` faz a mesma conferência (o objeto cumpre o contrato? falta campo? sobra campo?) e
mantém o tipo que foi inferido do valor. `createOrder.method` continua sendo `"POST"`.

<details>
<summary>❌ Ruim: a anotação troca o literal pelo tipo base</summary>

```ts
interface RouteConfig {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
}

const createOrder: RouteConfig = {
  path: "/orders",
  method: "POST",
};

createOrder.method; // tipo: "GET" | "POST" | "PUT" | "DELETE", perde a especificidade
```

</details>

<details>
<summary>✅ Bom: satisfies valida e preserva o tipo literal</summary>

```ts
const createOrder = {
  path: "/orders",
  method: "POST",
} satisfies RouteConfig;

createOrder.method; // tipo: "POST", literal preservado
```

</details>
