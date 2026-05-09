# Project Foundation

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Node.js. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point como índice,
> configuração centralizada, módulos por domínio.

A fundação de um projeto Node.js define três decisões estruturantes: onde fica a configuração, como módulos se organizam por domínio, e como o entry point orquestra o boot da aplicação. Editor, linter e gerenciador de pacotes ficam alinhados antes da primeira linha de domínio.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Entry point** (ponto de entrada) | Arquivo inicial que carrega configuração, registra rotas e sobe o servidor |
| **Middleware** (componente de pipeline) | Função que intercepta a requisição antes ou depois do handler |
| **JWT** (JSON Web Token, Token Web em JSON) | Token assinado usado para autenticação stateless |
| **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) | Linguagem de consulta do banco relacional; usada via driver ou ORM |

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- ESLint + Prettier: linting e formatação de código

```bash
npm init @eslint/config
npm install --save-dev prettier
```

> [!NOTE] [Biome](https://biomejs.dev) é uma alternativa moderna que substitui ESLint + Prettier em
> um único binário: mais rápido e sem conflito de configuração entre as duas ferramentas.

## Entry point enxuto

`server.js` declara intenção, não implementa. Toda configuração é delegada para módulos. O arquivo
serve como índice do projeto: o leitor vê o que existe, não como funciona.

<details>
<summary>❌ Bad — server.js como dumping ground de configuração</summary>
<br>

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

<br>

<details>
<summary>✅ Good — server.js como índice, configuração delegada</summary>
<br>

```js
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp(config);
app.listen(config.port);
```

</details>

## Módulos por domínio

Cada domínio registra suas próprias rotas e dependências. `app.js` não conhece SQL, JWT ou validação:
apenas chama quem conhece. Os módulos ficam co-localizados com o domínio que representam.

<details>
<summary>❌ Bad — app.js conhece SQL, validação e regras de negócio</summary>
<br>

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

<br>

<details>
<summary>❌ Bad — rotas definidas fora do domínio, em arquivo centralizado</summary>
<br>

```js
// routes.js — arquivo monolítico de rotas
import { listOrders, getOrder, createOrder } from "./features/orders/order.endpoints.js";
import { listUsers, getUser } from "./features/users/user.endpoints.js";

export function registerRoutes(app, orderService, userService) {
  app.get("/api/orders", listOrders(orderService));
  app.get("/api/orders/:id", getOrder(orderService));

  app.post("/api/orders", createOrder(orderService));

  app.get("/api/users", listUsers(userService));
  app.get("/api/users/:id", getUser(userService));
  // domínios diferentes no mesmo arquivo — cresce sem controle
}
```

</details>

<br>

<details>
<summary>✅ Good — ponto de entrada agrega os módulos</summary>
<br>

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

<br>

<details>
<summary>✅ Good — domínio de Orders dono das suas rotas</summary>
<br>

```js
// features/orders/orders.module.js
import { createOrderService } from "./order.service.js";
import { findAll, findById, create } from "./order.endpoints.js";

export function registerOrders(app, config) {
  const orderService = createOrderService(config.database);

  app.get("/api/orders", findAll(orderService));
  app.get("/api/orders/:id", findById(orderService));

  app.post("/api/orders", create(orderService));
}
```

```js
// features/orders/order.endpoints.js
export function findAll(orderService) {
  return async (request, response) => {
    const orders = await orderService.findAll();
    response.json(orders);
  };
}

export function findById(orderService) {
  return async (request, response) => {
    const order = await orderService.findById(request.params.id);
    response.json(order);
  };
}

export function create(orderService) {
  return async (request, response) => {
    const order = await orderService.create(request.body);
    response.status(201).json(order);
  };
}
```

</details>

## Configuração centralizada

`config.js` é o único ponto de leitura de variáveis de ambiente. Nenhum módulo acessa `process.env`
diretamente: apenas importa a seção que precisa.

<details>
<summary>❌ Bad — process.env espalhado em todo lugar</summary>
<br>

```js
// auth/auth.middleware.js
const secret = process.env.JWT_SECRET; // leitura direta

// db/db.client.js
const url = process.env.DATABASE_URL; // leitura direta

// server.js
const port = process.env.PORT || 3000; // leitura direta
```

</details>

<br>

<details>
<summary>✅ Good — config.js como único ponto de entrada de env vars</summary>
<br>

```js
// config.js
export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
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
  const orderService = createOrderService(config.database); // recebe a seção
  // ...
}
```

</details>

## Middleware pipeline

A ordem do **middleware** (componente de pipeline) é determinística e importa. Registrar autenticação após roteamento não protege as rotas.

```
express.json()     → parseia o body antes de qualquer handler
rateLimit          → rejeita cedo, antes de autenticação e I/O
cors               → cabeçalhos CORS antes de autenticação
authenticate       → resolve a identidade
rotas              → handlers recebem o usuário já autenticado no contexto
```

<details>
<summary>❌ Bad — authenticate depois das rotas</summary>
<br>

```js
app.use(express.json());
app.use(cors());

app.get("/api/orders", findAll(orderService)); // rota sem proteção
app.post("/api/orders", create(orderService)); // rota sem proteção

app.use(authenticate(config.auth)); // tarde demais
```

</details>

<br>

<details>
<summary>✅ Good — ordem correta do pipeline</summary>
<br>

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
    ├── database.client.js       ← createDatabaseClient(config.database)
    └── auth.middleware.js       ← authenticate(config.auth)
```
