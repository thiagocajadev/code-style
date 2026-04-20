# Async

Toda operação que depende de I/O é assíncrona. Bloquear o thread principal trava a aplicação.

## Callback hell

<details>
<summary>❌ Bad — aninhamento cresce sem controle</summary>
<br>

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

<br>

<details>
<summary>✅ Good — async/await, linear e legível</summary>
<br>

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

## .then() encadeado

<details>
<summary>❌ Bad — verboso, difícil de depurar</summary>
<br>

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

<br>

<details>
<summary>✅ Good — mesmo resultado, sem o ruído</summary>
<br>

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

## Bloqueio síncrono

<details>
<summary>❌ Bad — loop síncrono trava o thread principal</summary>
<br>

```js
function wait(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // congela tudo durante ms milissegundos
}

wait(3000); // aplicação trava por 3 segundos
```

</details>

<br>

<details>
<summary>✅ Good — Promise libera o thread enquanto aguarda</summary>
<br>

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

## Promise.all: execução paralela

Quando as operações são independentes entre si, rodá-las em paralelo reduz o tempo total de espera.

<details>
<summary>❌ Bad — await sequencial quando não há dependência</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Promise.all dispara tudo ao mesmo tempo</summary>
<br>

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

## API client centralizado

Um único cliente carrega a configuração base. Os módulos recebem o cliente por injeção: sem `fetch` solto espalhado pelo código.

<details>
<summary>❌ Bad — fetch direto, configuração duplicada em todo lugar</summary>
<br>

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

<br>

<details>
<summary>✅ Good — cliente único, injetado onde precisar</summary>
<br>

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

<details>
<summary>❌ Bad — I/O síncrono bloqueia o event loop</summary>
<br>

```js
// banco de dados síncrono — não existe, mas ilustra o padrão errado
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

<br>

<details>
<summary>✅ Good — toda operação de I/O é async</summary>
<br>

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
