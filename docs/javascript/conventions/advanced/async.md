# Programação assíncrona em JavaScript

> Escopo: JavaScript. Idiomas específicos deste ecossistema.

JavaScript executa o seu código em um **thread** (linha de execução) único. Enquanto esse thread trabalha, mais nada avança: o clique não responde, a próxima requisição fica na fila. A saída é nunca segurar o thread em uma operação lenta. Toda operação de **I/O** (Input/Output · Entrada/Saída), seja rede, disco ou banco, é assíncrona: ela sai do caminho, libera o thread e avisa quando o resultado chega. O trabalho deste guia é escrever esse fluxo de forma linear com `async`/`await`, sem o aninhamento que os callbacks acumulavam.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **I/O** (Input/Output · Entrada/Saída) | Operação que atravessa o limite do processo: rede, disco, banco |
| **callback** (função de retorno) | Função passada como argumento para executar quando a operação termina |
| **Promise** (promessa de valor) | Objeto que representa o resultado futuro de uma operação assíncrona |
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Contrato público de uma biblioteca ou serviço externo |

<a id="nested-callbacks"></a>

## Callbacks aninhados sem controle

Um `callback` (função de retorno) que depende do resultado de outro vira um aninhamento que empurra o código para a direita a cada passo. Com três operações encadeadas já fica difícil de ler e de tratar erro em cada nível.

<details>
<summary>❌ Ruim: cada passo empurra o código mais para a direita</summary>

```js
function fetchUserData(id, callback) {
  getUser(id, (user) => {
    getOrders(user.id, (orders) => {
      getInvoices(orders[0].id, (invoices) => {
        callback({ user, orders, invoices });
      });
    });
  });
}
```

</details>

<details>
<summary>✅ Bom: async/await, linear e legível</summary>

```js
async function fetchUserData(id) {
  const user = await getUser(id);
  const orders = await getOrders(user.id);
  const invoices = await getInvoices(orders[0].id);

  const userData = { user, orders, invoices };
  return userData;
}
```

</details>

## Cadeia de .then() no lugar de await

Encadear `.then()` desfaz o aninhamento e cria outro problema: cada passo vira uma função dentro de outra função, escrita só para levar o resultado adiante. `await` lê como código síncrono e mantém cada valor no mesmo escopo, à mão do passo seguinte.

<details>
<summary>❌ Ruim: verboso, difícil de depurar</summary>

```js
function fetchUserData(id) {
  return getUser(id)
    .then((user) => getOrders(user.id).then((orders) => ({ user, orders })))
    .then(({ user, orders }) =>
      getInvoices(orders[0].id).then((invoices) => ({ user, orders, invoices }))
    );
}
```

</details>

<details>
<summary>✅ Bom: mesmo resultado, sem o ruído</summary>

```js
async function fetchUserData(id) {
  const user = await getUser(id);
  const orders = await getOrders(user.id);
  const invoices = await getInvoices(orders[0].id);

  const userData = { user, orders, invoices };
  return userData;
}
```

</details>

## Bloqueio síncrono do thread principal

Um laço que gira só para deixar o tempo passar segura o thread inteiro: nada mais roda até ele terminar. A espera correta devolve o thread e agenda a volta, com `setTimeout` dentro de uma `Promise`.

<details>
<summary>❌ Ruim: loop síncrono trava o thread principal</summary>

```js
function wait(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // congela tudo durante ms milissegundos
}

wait(3000); // aplicação trava por 3 segundos
```

</details>

<details>
<summary>✅ Bom: Promise libera o thread enquanto aguarda</summary>

```js
function wait(ms) {
  const timer = new Promise((resolve) => setTimeout(resolve, ms));
  return timer;
}

async function run() {
  await wait(3000);
  console.log("done");
}
```

</details>

## Promise.all para operações independentes

Quando as operações não dependem uma da outra, dispará-las juntas em vez de uma após a outra corta o tempo total de espera para o tempo da mais lenta.

<details>
<summary>❌ Ruim: await sequencial quando não há dependência</summary>

```js
async function fetchDashboard(userId) {
  const orders = await fetchOrders(userId);     // espera terminar
  const invoices = await fetchInvoices(userId); // só começa depois

  const profile = await fetchProfile(userId);   // só começa depois

  const dashboard = { orders, invoices, profile };

  return dashboard;
}
```

</details>

<details>
<summary>✅ Bom: Promise.all dispara tudo ao mesmo tempo</summary>

```js
async function fetchDashboard(userId) {
  const requests = [
    fetchOrders(userId),
    fetchInvoices(userId),
    fetchProfile(userId),
  ];
  const [orders, invoices, profile] = await Promise.all(requests);

  const dashboard = { orders, invoices, profile };
  return dashboard;
}
```

</details>

> Use `Promise.all` quando as operações não dependem umas das outras.
> Se uma falhar, todas falham. Use `Promise.allSettled` quando quiser continuar mesmo com erros parciais.

<a id="centralized-api-client"></a>

## Cliente de API centralizado

Um único cliente guarda a configuração base: URL, cabeçalhos, autenticação. Os módulos recebem esse cliente por parâmetro, sem `fetch` solto e sem a mesma configuração repetida em cada arquivo.

<details>
<summary>❌ Ruim: fetch direto, configuração duplicada em todo lugar</summary>

```js
// user.service.js
async function fetchUser(id) {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await response.json();

  return user;
}

// order.service.js
async function fetchOrders(userId) {
  const response = await fetch(`https://api.example.com/orders?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const orders = await response.json();

  return orders;
}
```

</details>

<details>
<summary>✅ Bom: cliente único, injetado onde precisar</summary>

```js
// api.client.js
function createApiClient(baseUrl, token) {
  async function get(path) {
    const fetchConfig = { headers: { Authorization: `Bearer ${token}` } };
    const response = await fetch(`${baseUrl}${path}`, fetchConfig);

    const body = await response.json();
    return body;
  }

  const client = { get };
  return client;
}

export const apiClient = createApiClient("https://api.example.com", token);
```

```js
// user.service.js
async function fetchUser(apiClient, id) {
  const user = await apiClient.get(`/users/${id}`);
  return user;
}

// order.service.js
async function fetchOrders(apiClient, userId) {
  const orders = await apiClient.get(`/orders?userId=${userId}`);
  return orders;
}
```

</details>

## Quando criar uma função async

A regra é direta: se a função faz I/O, ela é `async` e usa `await`. As versões síncronas de leitura de banco ou de arquivo (`readFileSync`) bloqueiam o thread e não têm lugar no caminho de uma requisição.

<details>
<summary>❌ Ruim: I/O síncrono bloqueia o event loop</summary>

```js
// banco de dados síncrono: não existe, mas ilustra o padrão errado
function findUser(id) {
  const user = database.querySync("SELECT * FROM users WHERE id = $1", [id]);
  return user;
}

// leitura de arquivo síncrona trava o processo
function readConfig() {
  const config = fs.readFileSync("./config.json", "utf-8");
  return config;
}
```

</details>

<details>
<summary>✅ Bom: toda operação de I/O é async</summary>

```js
// banco de dados
async function findUser(id) {
  const user = await database.query("SELECT * FROM users WHERE id = $1", [id]);
  return user;
}

// API externa
async function fetchRates() {
  const response = await fetch("https://api.example.com/rates");
  const rates = await response.json();
  return rates;
}

// leitura de arquivo
async function readConfig() {
  const config = await fs.promises.readFile("./config.json", "utf-8");
  return config;
}
```

</details>
