# Security

> Escopo: JavaScript (setup). Princípios transversais em [shared/platform/security.md](../../shared/platform/security.md).

Esta página cobre apenas o que é específico do ecossistema Node: onde colocar o quê, quais ferramentas usar, quais patterns idiomáticos. As regras conceituais (segredos fora do repositório, validação no servidor, HttpOnly + Secure + SameSite) vivem em [shared/platform/security.md](../../shared/platform/security.md) e não são repetidas aqui.

---

## Onde cada coisa vai

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Contrato público (commitado) | `.env.example` | Chaves esperadas, sem valores |
| Dev local (fora do repositório) | `.env` + `dotenv` | Connection string local, chave de teste |
| Staging/produção | Variáveis do host (container, PaaS) | Segredos reais, injetados no deploy |
| Secrets gerenciados | Vault, AWS Secrets Manager, Doppler | Rotação automática, auditoria |

`.env.example` documenta a superfície de configuração do projeto. Clonar o repo e rodar `cp .env.example .env` dá ao dev a lista do que precisa preencher.

---

## .env.example

```bash
DATABASE_URL=
JWT_SECRET=
JWT_AUDIENCE=

PORT=3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

Chaves com valor zero indicam segredos (devem vir do ambiente). Chaves com valor default indicam config não sensível.

---

## dotenv: apenas em desenvolvimento

`dotenv` carrega `.env` para `process.env`. Importar uma vez no bootstrap, antes de qualquer módulo que leia `process.env`.

```bash
npm install dotenv
```

```js
// server.js
import "dotenv/config";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp(config);
app.listen(config.port);
```

Em staging e produção, `dotenv` não entra no bundle. As variáveis são injetadas pelo container ou PaaS diretamente.

---

## config.js: único ponto de leitura

`process.env` é fronteira. Ler diretamente no meio da lógica espalha dependência global e dificulta teste. O padrão é um `config.js` que lê uma vez, valida e exporta um objeto consumido por injeção.

<details>
<summary>❌ Bad — process.env espalhado pela aplicação</summary>
<br>

```js
// orders.service.js
export function createOrderService() {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const rate = parseInt(process.env.RATE_LIMIT_MAX, 10);
  // ...
}
```

</details>

<br>

<details>
<summary>✅ Good — leitura em um lugar, módulos recebem por parâmetro</summary>
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
};

// features/orders/orders.module.js
export function registerOrders(app, config) {
  const orderService = createOrderService(config.database);
  // ...
}
```

</details>

---

## JWT: verify, nunca decode

`jwt.decode()` extrai o payload sem verificar assinatura. Qualquer token fabricado ou vencido passa. Em produção, use sempre `jwt.verify()`.

<details>
<summary>❌ Bad — decode aceita token forjado</summary>
<br>

```js
export function authenticate(request, response, next) {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) return response.status(401).json({ error: "Unauthorized" });

  const claims = jwt.decode(token); // não verifica assinatura
  request.user = claims;
  next();
}
```

</details>

<br>

<details>
<summary>✅ Good — verify valida assinatura e expiração</summary>
<br>

```js
export function authenticate(request, response, next) {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) {
    const body = { error: "Unauthorized" };
    response.status(401).json(body);
    return;
  }

  try {
    const claims = jwt.verify(token, config.auth.secret);
    request.user = claims;
    next();
  } catch {
    const body = { error: "Invalid token" };
    response.status(401).json(body);
  }
}
```

</details>

---

## Autorização: middleware reutilizável

Checar role dentro de cada handler duplica lógica. Um middleware `authorize(roles)` aplica a regra uma vez na definição da rota.

```js
// middleware/authorize.js
export function authorize(allowedRoles) {
  return function checkRole(request, response, next) {
    const isAllowed = allowedRoles.includes(request.user.role);
    if (!isAllowed) {
      const body = { error: "Forbidden" };
      response.status(403).json(body);
      return;
    }
    next();
  };
}

// routes/orders.routes.js
app.delete("/orders/:id", authenticate, authorize(["admin", "manager"]), cancelOrderHandler);
```

---

## Session cookie com flags

`express-session` aceita as três flags obrigatórias diretamente no binding. Ver [shared/platform/security.md](../../shared/platform/security.md) para o racional de cada uma.

```js
const sessionConfig = {
  secret: config.auth.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 8,
  },
};
app.use(session(sessionConfig));
```

---

## .gitignore

```gitignore
.env
.env.*
!.env.example
*.key
*.pem
secrets.json
```

O `!.env.example` garante que o contrato público seja sempre commitado.
