# Async

Toda operação que depende de I/O é assíncrona. Bloquear o thread principal trava a aplicação inteira.

## Callback hell

<details>
<summary>❌ Bad — aninhamento cresce sem controle</summary>

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
<summary>✅ Good — async/await, linear e legível</summary>

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
<summary>✅ Good — mesmo resultado, sem o ruído</summary>

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

```js
function wait(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // congela tudo durante ms milissegundos
}

wait(3000); // aplicação trava por 3 segundos
```

</details>

<details>
<summary>✅ Good — Promise libera o thread enquanto aguarda</summary>

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await wait(3000);
  console.log("done");
}
```

</details>

## Promise.all — execução paralela

Quando as operações são independentes entre si, rodá-las em paralelo reduz o tempo total de espera.

<details>
<summary>❌ Bad — await sequencial quando não há dependência</summary>

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
<summary>✅ Good — Promise.all dispara tudo ao mesmo tempo</summary>

```js
async function fetchDashboard(userId) {
  const [orders, invoices, profile] = await Promise.all([
    fetchOrders(userId),
    fetchInvoices(userId),
    fetchProfile(userId),
  ]);

  const dashboard = { orders, invoices, profile };
  return dashboard;
}
```

</details>

> Use `Promise.all` quando as operações não dependem umas das outras.
> Se uma falhar, todas falham — use `Promise.allSettled` quando quiser continuar mesmo com erros parciais.

## API client centralizado

Um único cliente carrega a configuração base. Os módulos recebem o cliente por injeção — sem `fetch` solto espalhado pelo código.

<details>
<summary>❌ Bad — fetch direto, configuração duplicada em todo lugar</summary>

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
<summary>✅ Good — cliente único, injetado onde precisar</summary>

```js
// api.client.js
function createApiClient(baseUrl, token) {
  async function get(path) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    return body;
  }

  return { get };
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
<summary>✅ Good — toda operação de I/O é async</summary>

```js
// banco de dados
async function findUser(id) {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
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
