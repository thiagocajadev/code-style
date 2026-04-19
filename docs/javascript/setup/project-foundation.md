# Project Foundation

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Node.js. Os exemplos são referências
> conceituais — podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point como índice,
> configuração centralizada, módulos por domínio.

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/editorconfig.md) — indentação, charset, trailing whitespace
- ESLint + Prettier — linting e formatação de código

```bash
npm init @eslint/config
npm install --save-dev prettier
```

> [!NOTE] [Biome](https://biomejs.dev) é uma alternativa moderna que substitui ESLint + Prettier em
> um único binário — mais rápido e sem conflito de configuração entre as duas ferramentas.

## Entry point enxuto

`server.js` declara intenção — não implementa. Toda configuração é delegada para módulos. O arquivo
serve como índice do projeto: o leitor vê o que existe, não como funciona.

<details>
<summary>❌ Bad — server.js como dumping ground de configuração</summary>

```js
import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

const app = express();

app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),
);

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // process.env solto
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/users/:id", async (req, res) => {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  res.json(user.rows[0]);
});

app.post("/orders", async (req, res) => {
  const order = await db.query("INSERT INTO orders ...", [req.body]);
  res.status(201).json(order.rows[0]);
});

app.listen(process.env.PORT || 3000);
```

</details>

<details>
<summary>✅ Good — server.js como índice, configuração delegada</summary>

```js
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp(config);
app.listen(config.port);
```

</details>

## Módulos por domínio

Cada domínio registra suas próprias rotas e dependências. `app.js` não conhece SQL, JWT ou validação
— apenas chama quem conhece. Os módulos ficam co-localizados com o domínio que representam.

<details>
<summary>❌ Bad — app.js conhece SQL, validação e regras de negócio</summary>

```js
// app.js
import express from "express";
import pg from "pg";
import jwt from "jsonwebtoken";

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());

app.get("/api/orders", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
  const { rows } = await db.query("SELECT * FROM orders WHERE user_id = $1", [userId]);
  res.json(rows);
});

app.post("/api/orders", async (req, res) => {
  if (!req.body.productId || !req.body.quantity) {
    return res.status(400).json({ error: "productId and quantity required" });
  }
  const { rows } = await db.query("INSERT INTO orders ...", [req.body]);
  res.status(201).json(rows[0]);
});
```

</details>

<details>
<summary>✅ Good — ponto de entrada agrega os módulos</summary>

```js
// app.js
import express from "express";
import { applyMiddleware } from "./middleware.js";
import { registerUsers } from "./features/users/users.module.js";
import { registerOrders } from "./features/orders/orders.module.js";

export function createApp(config) {
  const app = express();
  applyMiddleware(app, config);
  registerUsers(app, config);
  registerOrders(app, config);
  return app;
}
```

</details>

<details>
<summary>✅ Good — domínio de Orders dono das suas rotas</summary>

```js
// features/orders/orders.module.js
import { createOrderService } from "./order.service.js";
import { findAll, findById, create } from "./order.endpoints.js";

export function registerOrders(app, config) {
  const orderService = createOrderService(config.db);

  app.get("/api/orders", findAll(orderService));
  app.get("/api/orders/:id", findById(orderService));
  app.post("/api/orders", create(orderService));
}
```

```js
// features/orders/order.endpoints.js
export function findAll(orderService) {
  return async (req, res) => {
    const orders = await orderService.findAll();
    res.json(orders);
  };
}

export function findById(orderService) {
  return async (req, res) => {
    const order = await orderService.findById(req.params.id);
    res.json(order);
  };
}

export function create(orderService) {
  return async (req, res) => {
    const order = await orderService.create(req.body);
    res.status(201).json(order);
  };
}
```

</details>

## Configuração centralizada

`config.js` é o único ponto de leitura de variáveis de ambiente. Nenhum módulo acessa `process.env`
diretamente — apenas importa a seção que precisa.

<details>
<summary>❌ Bad — process.env espalhado em todo lugar</summary>

```js
// auth/auth.middleware.js
const secret = process.env.JWT_SECRET; // leitura direta

// db/db.client.js
const url = process.env.DATABASE_URL; // leitura direta

// server.js
const port = process.env.PORT || 3000; // leitura direta
```

</details>

<details>
<summary>✅ Good — config.js como único ponto de entrada de env vars</summary>

```js
// config.js
export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    secret: process.env.JWT_SECRET,
    audience: process.env.JWT_AUDIENCE,
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100,
  },
};
```

```js
// features/orders/orders.module.js
export function registerOrders(app, config) {
  const orderService = createOrderService(config.db); // recebe a seção
  // ...
}
```

</details>

## Middleware pipeline

A ordem do middleware é determinística e importa. Registrar autenticação após roteamento não protege
as rotas.

```
express.json()     → parseia o body antes de qualquer handler
rateLimit          → rejeita cedo, antes de autenticação e I/O
cors               → cabeçalhos CORS antes de autenticação
authenticate       → resolve a identidade
rotas              → handlers recebem req.user já preenchido
```

<details>
<summary>❌ Bad — authenticate depois das rotas</summary>

```js
app.use(express.json());
app.use(cors());

app.get("/api/orders", findAll(orderService)); // rota sem proteção
app.post("/api/orders", create(orderService)); // rota sem proteção

app.use(authenticate(config.auth)); // tarde demais
```

</details>

<details>
<summary>✅ Good — ordem correta do pipeline</summary>

```js
// middleware.js
import cors from "cors";
import rateLimit from "express-rate-limit";
import express from "express";
import { authenticate } from "./auth/auth.middleware.js";

export function applyMiddleware(app, config) {
  app.use(express.json());
  app.use(rateLimit(config.rateLimit));
  app.use(cors());
  app.use(authenticate(config.auth));
}
```

</details>

## Estrutura de arquivos

```
src/
├── server.js
├── app.js
├── config.js
├── middleware.js
├── features/
│   ├── orders/
│   │   ├── orders.module.js     ← registerOrders()
│   │   ├── order.endpoints.js
│   │   └── order.service.js
│   └── users/
│       ├── users.module.js      ← registerUsers()
│       ├── user.endpoints.js
│       └── user.service.js
└── infra/
    ├── db.client.js             ← createDbClient(config.db)
    └── auth.middleware.js       ← authenticate(config.auth)
```
