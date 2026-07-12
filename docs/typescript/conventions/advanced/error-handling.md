# Tratamento de erros em TypeScript

> Escopo: TypeScript. Idiomas específicos deste ecossistema.

Os princípios do JavaScript continuam valendo: erros com tipo próprio, `try/catch` nos limites do
sistema, e nenhum `catch` que captura a falha sem avisar ninguém. O TypeScript acrescenta três
coisas. A hierarquia de erros vira um contrato que o compilador conhece, o **`instanceof`**
(verificação de instância) estreita o tipo do erro dentro do `catch`, e o **`Result<T, E>`**
(resultado tipado) permite devolver a falha como valor de retorno, sem `throw`, quando ela é
esperada.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **`Error`** (classe nativa de erro) | Classe base do JS; toda exceção customizada deve estendê-la |
| **custom error** (erro customizado) | Subclasse de `Error` com nome semântico (`NotFoundError`, `ConflictError`) |
| **business error** (erro de negócio) | Regra de domínio violada; chamador precisa saber para responder |
| **technical error** (erro técnico) | Falha de infraestrutura (rede, banco, timeout); chamador raramente trata |
| **`instanceof`** (verificação de instância) | Operador que estreita o tipo do erro pelo construtor no `catch` |
| **`Result<T, E>`** (resultado tipado) | União discriminada `{ ok: true, value } | { ok: false, error }` no retorno |
| **`unknown`** (tipo seguro de origem desconhecida) | Tipo do `catch` por padrão; exige narrowing antes de uso |
| **error cause** (causa do erro) | Erro original encapsulado no novo (`new Error(msg, { cause: original })`) |

## A função devolve uma coisa só, e falha lançando erro

Uma função que devolve `null` em um caminho, `false` em outro e um objeto de erro em um terceiro
obriga quem chama a testar as três formas para descobrir o que aconteceu. Pior: as três significam
coisas diferentes, e nada no tipo diz qual delas indica o quê.

O contrato consistente é devolver o valor quando dá certo e lançar um erro com nome quando não dá.
Quem chama trata `NotFoundError` e `ValidationError` pelo nome, e o compilador acompanha o tipo do
retorno em um caminho só.

<details>
<summary>❌ Ruim: null, undefined, false e objeto saindo da mesma função</summary>

```ts
function processOrder(order: Order | null): { success: boolean; order: Order } | null | false {
  if (!order) return null;
  if (order.items.length === 0) return false;
  if (order.customer.defaulted) return null;

  return { success: true, order };
  // quem chama recebe uma union inútil: precisa checar todos os casos manualmente
}
```

</details>

<details>
<summary>✅ Bom: contrato consistente, lança exceções tipadas</summary>

```ts
function processOrder(order: Order | null): ProcessedOrder {
  if (!order) throw new ValidationError({ message: "Order is required." });
  if (order.items.length === 0) throw new ValidationError({ message: "Order has no items." });
  if (order.customer.defaulted) throw new BusinessError({ message: "Customer has unsettled debts." });

  const processedOrder: ProcessedOrder = { success: true, order };
  return processedOrder;
}
```

</details>

## Uma classe base dá contrato a todos os erros da aplicação

Erros criados com `new Error("not found")` chegam ao `catch` como texto. Quem trata precisa comparar
a mensagem para saber o que aconteceu, e a comparação quebra no dia em que alguém corrige uma
palavra da frase. Não há código de status, não há contexto, e não há como distinguir um erro de
negócio de uma falha de infraestrutura.

Uma classe base resolve isso de uma vez: ela fixa o que todo erro da aplicação carrega (nome,
mensagem, código HTTP, contexto, causa original), e cada subclasse preenche a parte dela. O `catch`
passa a perguntar pelo tipo, e o limite HTTP passa a ter todos os campos de que precisa para montar
a resposta.

<details>
<summary>❌ Ruim: erros sem hierarquia, sem contrato e sem contexto</summary>

```ts
// erros lançados como string ou Error genérico sem tipo
async function findOrder(orderId: string): Promise<Order> {
  const order = await db.orders.findById(orderId);
  if (!order) throw new Error("not found"); // sem tipo, sem statusCode, sem action

  return order;
}

// classes de erro sem base comum: catch não consegue distinguir
class NotFound extends Error {
  constructor(message: string) {
    super(message);
  }
}

class BadInput extends Error {
  constructor(message: string) {
    super(message);
  }
}

// caller não tem como checar statusCode ou action: acessa name como string
try {
  const order = await findOrder(id);
} catch (error) {
  if ((error as Error).message === "not found") { // frágil: string hardcoded
    return Response.json({ error: (error as Error).message }, { status: 404 });
  }
}
```

</details>

<details>
<summary>✅ Bom: contrato único para todos os erros da aplicação</summary>

```ts
// errors.ts
interface BaseErrorParams {
  name?: string;
  message: string;
  action?: string;
  statusCode?: number;
  cause?: unknown;
}

interface ErrorEnvelope {
  error: {
    name: string;
    message: string;
    action: string;
    statusCode: number;
  };
}

export class BaseError extends Error {
  readonly action: string;
  readonly statusCode: number;

  constructor({ name, message, action, statusCode, cause }: BaseErrorParams) {
    super(message, { cause });
    this.name = name ?? "BaseError";
    this.action = action ?? "Contact support.";
    this.statusCode = statusCode ?? 500;
  }

  toJSON(): ErrorEnvelope {
    const envelope: ErrorEnvelope = {
      error: {
        name: this.name,
        message: this.message,
        action: this.action,
        statusCode: this.statusCode,
      },
    };

    return envelope;
  }
}

interface SubErrorParams {
  message?: string;
  action?: string;
  cause?: unknown;
}

export class NotFoundError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "NotFoundError",
      message: message ?? "Resource not found.",
      action: action ?? "Check if the resource exists.",
      statusCode: 404,
      cause,
    });
  }
}

export class ValidationError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "ValidationError",
      message: message ?? "Invalid input.",
      action: action ?? "Review the input data.",
      statusCode: 400,
      cause,
    });
  }
}

export class BusinessError extends BaseError {
  constructor({ message, action, cause }: SubErrorParams = {}) {
    super({
      name: "BusinessError",
      message: message ?? "Business rule violation.",
      action: action ?? "Check the operation requirements.",
      statusCode: 422,
      cause,
    });
  }
}

export class InternalServerError extends BaseError {
  constructor({ cause }: Pick<SubErrorParams, "cause"> = {}) {
    super({
      name: "InternalServerError",
      message: "An unexpected error occurred.",
      action: "Contact support.",
      statusCode: 500,
      cause,
    });
  }
}
```

</details>

## No `catch`, o erro chega como `unknown`

Em TypeScript estrito, o parâmetro do `catch` é `unknown`, e a razão é simples: `throw` aceita
qualquer valor, então o que chega ali pode ser um `Error`, uma string, ou um número. Ler
`error.message` direto não compila, e não deveria mesmo.

O `instanceof` é a checagem que resolve. Ele pergunta pelo construtor, o compilador estreita o tipo
a partir da resposta, e dentro do `if` o erro tem os campos daquela classe. É o que permite separar
o erro de negócio, que sobe como está, do erro técnico, que é encapsulado com contexto antes de
subir.

<details>
<summary>❌ Ruim: lê os campos do erro sem checar o que ele é</summary>

```ts
async function findProductById(id: string): Promise<Product> {
  try {
    const product = await db.products.findById(id);
    return product;
  } catch (error) {
    console.log(error.message); // erro de compilação: error é unknown
    return null;
  }
}
```

</details>

<details>
<summary>✅ Bom: instanceof identifica o erro, e a causa original sobe junto</summary>

```ts
async function findProductById(id: string): Promise<Product> {
  try {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError({
        message: `Product ${id} not found.`,
        action: "Check if the product ID is correct.",
      });
    }

    return product;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    throw new InternalServerError({ cause: error });
  }
}
```

</details>

## Onde o try/catch cabe

O `try/catch` existe para os pontos em que você tem o que fazer com a falha. Nos demais, ele
acrescenta um bloco que só repassa o erro adiante, e o erro já subiria sozinho.

| Cabe                                             | Não cabe                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| Chamada de I/O externo (banco, rede, arquivo)    | Em volta de chamadas que já propagam o erro sozinhas    |
| Limite do sistema (o controller HTTP)            | Para registrar no log e seguir como se nada tivesse acontecido |
| Para traduzir erro técnico em erro de negócio    | Quando a camada de cima já trata aquele erro            |
