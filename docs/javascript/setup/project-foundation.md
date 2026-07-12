# Fundação de um projeto Node.js

> [!NOTE]  
> Essa estrutura reflete como costumo iniciar projetos Node.js. Os exemplos são
> referências conceituais: podem não cobrir todos os detalhes de implementação
> e, conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que
> importa é o princípio: entry point como índice, configuração centralizada,
> módulos por domínio.

Três decisões definem a fundação de um projeto Node.js, e o time convive com elas
por anos: onde a configuração é lida, como os módulos se dividem por domínio, e o
que o **entry point** (arquivo por onde a aplicação começa a rodar) faz quando o
processo sobe. Esta página mostra a forma que mantém as três
respostas visíveis no código. Editor, linter e gerenciador de pacotes ficam
alinhados antes da primeira linha de domínio, porque acertar isso depois custa um
diff que toca o repositório inteiro.

## Conceitos fundamentais

| Conceito                                                                | O que é                                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Entry point** (ponto de entrada)                                      | Arquivo inicial que carrega configuração, registra rotas e sobe o servidor                                 |
| **Handler** (função que atende a rota)                                  | Função que recebe a requisição e devolve a resposta                                                        |
| **Middleware** (função que roda antes do handler)                       | Função que intercepta a requisição antes ou depois do handler                                              |
| **Token** (bilhete de acesso)                                           | Texto que o cliente apresenta a cada requisição para provar quem é, como um crachá / credencial                       |
| **JWT** (JSON Web Token · token assinado que identifica o usuário)      | Credencial que o cliente envia a cada requisição; o servidor confere a assinatura em vez de guardar sessão |
| **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) | Linguagem de consulta do banco relacional; usada via driver ou ORM                                         |

## Preparar o editor antes do primeiro arquivo

Duas ferramentas resolvem o atrito de formatação que aparece na primeira revisão
de código em dupla:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset,
  trailing whitespace
- ESLint + Prettier: linting e formatação de código

```bash
npm init @eslint/config
npm install --save-dev prettier
```

> [!NOTE] [Biome](https://biomejs.dev) é uma alternativa moderna que substitui
> ESLint + Prettier em um único binário: mais rápido e sem conflito de
> configuração entre as duas ferramentas.

## O arquivo que sobe o servidor é um índice, não um depósito

`server.js` declara a intenção e delega o resto. Quem abre o arquivo vê o que o
projeto tem, não como cada parte funciona: lê a configuração, monta a aplicação,
escuta a porta. Quando esse mesmo arquivo acumula rota, autenticação e conexão de
banco, ele vira o lugar onde toda mudança passa, e duas pessoas nunca conseguem
mexer no projeto sem conflito.

<details>
<summary>❌ Ruim: server.js como depósito de toda a configuração</summary>

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
  const user = await db.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
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
<summary>✅ Bom: server.js como índice, configuração delegada</summary>

```js
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp(config);
app.listen(config.port);
```

</details>

## Cada domínio registra as próprias rotas

Quem cuida de pedidos é o módulo de pedidos. Ele registra as rotas de `/orders`,
cria o serviço de que precisa e recebe a fatia da configuração que lhe diz
respeito. O `app.js` não conhece SQL, não conhece JWT, não valida corpo de
requisição: ele chama quem conhece, e a lista dessas chamadas é o mapa do
sistema. Um arquivo central de rotas parece organizado no primeiro mês e vira
lista de conflitos de merge no terceiro, porque todo domínio novo edita a mesma
linha.

<details>
<summary>❌ Ruim: app.js conhece SQL, validação e regras de negócio</summary>

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

  const { rows } = await db.query("SELECT * FROM orders WHERE user_id = $1", [
    userId,
  ]);
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
<summary>❌ Ruim: rotas definidas fora do domínio, em arquivo centralizado</summary>

```js
// routes.js: arquivo monolítico de rotas
import {
  listOrders,
  getOrder,
  createOrder,
} from "./features/orders/order.endpoints.js";
import { listUsers, getUser } from "./features/users/user.endpoints.js";

export function registerRoutes(app, orderService, userService) {
  app.get("/api/orders", listOrders(orderService));
  app.get("/api/orders/:id", getOrder(orderService));

  app.post("/api/orders", createOrder(orderService));

  app.get("/api/users", listUsers(userService));
  app.get("/api/users/:id", getUser(userService));
  // domínios diferentes no mesmo arquivo: cresce sem controle
}
```

</details>

<details>
<summary>✅ Bom: ponto de entrada agrega os módulos</summary>

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
<summary>✅ Bom: domínio de Orders dono das suas rotas</summary>

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

## Uma única porta de entrada para as variáveis de ambiente

`config.js` lê `process.env` e mais ninguém lê. Cada módulo recebe por parâmetro
a seção que lhe cabe: o de pedidos recebe `config.database`, o de autenticação
recebe `config.auth`. O ganho aparece no teste, onde passar um objeto qualquer
substitui a configuração real, e aparece no dia em que uma variável muda de nome:
existe um arquivo para editar, não uma busca por `process.env` no repositório
inteiro.

<details>
<summary>❌ Ruim: process.env espalhado em todo lugar</summary>

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
<summary>✅ Bom: config.js como único ponto de entrada de env vars</summary>

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

## A ordem do pipeline decide o que fica protegido

O Express executa cada **middleware** (função que roda antes do handler) na ordem em que ele foi registrado, sem exceção. Registrar a
autenticação depois das rotas deixa as rotas abertas: quando o pedido chega, o
handler já respondeu, e o middleware de autenticação nunca é alcançado. A
sequência abaixo é a que protege:

```
express.json()     → faz parse do body antes de qualquer handler
rateLimit          → rejeita cedo, antes de autenticação e I/O
cors               → cabeçalhos CORS antes de autenticação
authenticate       → resolve a identidade
rotas              → handlers recebem o usuário já autenticado no contexto
```

<details>
<summary>❌ Ruim: authenticate depois das rotas</summary>

```js
app.use(express.json());
app.use(cors());

app.get("/api/orders", findAll(orderService)); // rota sem proteção
app.post("/api/orders", create(orderService)); // rota sem proteção

app.use(authenticate(config.auth)); // tarde demais
```

</details>

<details>
<summary>✅ Bom: ordem correta do pipeline</summary>

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

## Onde cada arquivo mora

A árvore abaixo é o desenho completo: quatro arquivos na raiz de `src/` para
subir e configurar, uma pasta por domínio em `features/`, e o que conversa com o
mundo externo (banco, autenticação) isolado em `infra/`.

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
