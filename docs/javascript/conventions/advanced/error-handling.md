# Tratamento de erros em JavaScript

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

Um bom tratamento de erro começa por separar dois tipos que pedem respostas opostas. O **problema de negócio** (uma regra violada, um recurso que não existe) o chamador precisa conhecer para responder ao usuário. A **falha técnica** (um timeout, o banco fora do ar) o chamador raramente consegue tratar: ela vira log, métrica e, quando cabe, **retry** (nova tentativa). Misturar os dois esconde o que importa. E `try/catch` serve para capturar o erro no lugar certo, nunca para escondê-lo de quem chamou a função.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Error** (classe de erro) | Classe nativa do JS; toda exceção deve estender ou usar uma subclasse |
| **custom error** (erro customizado) | Subclasse de `Error` com nome semântico (`NotFoundError`, `ConflictError`); permite `catch` por tipo |
| **business error** (erro de negócio) | Regra de domínio violada; chamador precisa saber para responder |
| **technical error** (erro técnico) | Falha de infraestrutura (rede, banco, timeout); chamador raramente pode tratar |
| **stack trace** (rastro de chamadas) | Lista de funções chamadas até o ponto do erro; preservar é essencial para debug |
| **error cause** (causa do erro) | Erro original encapsulado em um novo (`new Error('msg', { cause: original })`) |
| **fail fast** (falhar rápido) | Lançar erro no menor escopo possível; evita estado corrompido se propagando |
| **swallow** (engolir) | Capturar erro sem tratar nem propagar; antipadrão clássico |

<a id="multiple-return-types"></a>

## Múltiplos tipos de retorno

Uma função que devolve `null`, `undefined`, `false` ou um objeto conforme o caso obriga quem chama a adivinhar. Cada saída pede uma verificação diferente, e é fácil deixar um caso passar. Lançar um erro tipado para cada falha deixa o caminho de sucesso com um único formato de retorno.

<details>
<summary>❌ Ruim: null, undefined, false e objeto na mesma função</summary>

```js
function processOrder(order) {
  if (!order) return null;
  if (order.items.length === 0) return undefined;

  if (order.customer.defaulted) return false;

  return { success: true, order };
}

// quem chama não sabe o que esperar
const result = processOrder(order);
if (result) { /* ... */ }           // false passa, undefined também

if (result !== null) { /* ... */ }  // e undefined?
```

</details>

<details>
<summary>✅ Bom: contrato consistente, sempre o mesmo formato</summary>

```js
function processOrder(order) {
  if (!order) throw new ValidationError({ message: "Order is required." });
  if (order.items.length === 0) throw new ValidationError({ message: "Order has no items." });
  if (order.customer.defaulted) throw new BusinessError({ message: "Customer has unsettled debts." });

  const processedOrder = { success: true, order };
  return processedOrder;
}
```

</details>

## Erro como string

`throw` de uma string joga fora o tipo e o contexto. Quem captura não consegue distinguir um erro do outro com `instanceof`, nem ler um código ou uma ação sugerida. O mínimo é lançar uma subclasse de `Error`, que carrega nome, mensagem e rastro de chamadas.

<details>
<summary>❌ Ruim: string solta, impossível tratar com instanceof</summary>

```js
async function findUser(id) {
  const user = await db.query(id);

  if (!user) {
    throw "User not found"; // sem tipo, sem contexto
  }

  return user;
}
```

</details>

<details>
<summary>✅ Bom: erros tipados, identificáveis e tratáveis</summary>

```js
async function findUser(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError({ message: `User ${id} not found.` });

  return user;
}
```

</details>

<a id="baseerror-centralized-abstraction"></a>

## BaseError: abstração centralizada

Uma classe base concentra o contrato de todos os erros da aplicação: nome, mensagem, ação sugerida e código HTTP. As subclasses (`NotFoundError`, `ValidationError`) só preenchem esses campos. O limite do sistema então serializa qualquer uma delas do mesmo jeito, com um `toJSON` único.

<details>
<summary>❌ Ruim: throw com string solta, sem tipo, sem contrato</summary>

```js
// errors.js: não existe, cada módulo lança o que quiser
async function findUser(id) {
  const user = await db.query(id);
  if (!user) throw "User not found"; // sem tipo, não dá para instanceof

  return user;
}

async function processOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    return order;
  } catch (error) {
    console.log(error); // engole o erro, não relança
    return null;
  }
}
```

</details>

<details>
<summary>✅ Bom: contrato único para todos os erros da aplicação</summary>

```js
// errors.js
export class BaseError extends Error {
  constructor({ name, message, action, statusCode, cause }) {
    super(message, { cause });
    this.name = name || "BaseError";

    this.action = action || "Contact support.";
    this.statusCode = statusCode || 500;
  }

  toJSON() {
    const envelope = {
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

export class NotFoundError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      name: "NotFoundError",
      message: message || "Resource not found.",
      action: action || "Check if the resource exists.",
      statusCode: 404,
      cause,
    });
  }
}

export class ValidationError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      name: "ValidationError",
      message: message || "Invalid input.",
      action: action || "Review the input data.",
      statusCode: 400,
      cause,
    });
  }
}

export class InternalServerError extends BaseError {
  constructor({ cause } = {}) {
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

<a id="catch-that-hides-the-error"></a>

## try/catch que captura o erro e não avisa ninguém

Capturar o erro, logar uma frase genérica e devolver `null` esconde a falha: o chamador recebe um vazio sem saber por quê. O `catch` no lugar certo relança o erro de negócio como veio e embrulha a falha técnica em um erro da aplicação, com a causa original preservada.

<details>
<summary>❌ Ruim: captura, loga e retorna null</summary>

```js
async function findProductById(id) {
  try {
    const results = await db.query(id);

    if (results.rowCount === 0) {
      throw "Product not found";
    }

    return results.rows[0];
  } catch (error) {
    console.log("Something went wrong"); // engole o erro
    return null;
  }
}
```

</details>

<details>
<summary>✅ Bom: propaga com contexto, trata no limite do sistema</summary>

```js
async function findProductById(id) {
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

<a id="exception-as-control-flow"></a>

## Exceção como controle de fluxo

O `try/catch` serve para o que o código não consegue prever: a rede caiu no meio da requisição, o arquivo sumiu do disco. Uma chave que pode não estar no objeto é caso previsto, e o `??` com valor padrão resolve na mesma linha da leitura.

Usar `try/catch` para isso muda onde o comportamento normal fica escrito. O caminho que roda quase sempre passa a morar no `catch`, e quem lê o código precisa entrar no bloco de erro para descobrir o que acontece no caso comum.

<details>
<summary>❌ Ruim: try/catch controlando lógica de negócio normal</summary>

```js
function getUser(id) {
  try {
    return userMap[id]; // undefined não é uma exceção
  } catch {
    return null;
  }
}
```

</details>

<details>
<summary>✅ Bom: verificação explícita, sem exceção para fluxo normal</summary>

```js
function getUser(id) {
  const user = userMap[id] ?? null;
  return user;
}
```

</details>

### Quando usar try/catch

| Use | Não use |
| --- | --- |
| I/O externo (DB, rede, arquivo) | Para encadear chamadas que já propagam erros |
| Limite do sistema (controller HTTP)    | Para logar e ignorar: mascara problemas   |
| Para mapear erro técnico → erro de negócio | Quando o erro já será tratado em camada superior |
