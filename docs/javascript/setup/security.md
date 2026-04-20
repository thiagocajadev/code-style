# Security

> [!NOTE]
> Segurança é sempre prioridade em qualquer projeto. Os exemplos abaixo são referências conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio por trás de cada prática.

## Nunca hardcode segredos

Segredos (connection strings, API keys, JWT secrets, senhas) nunca ficam no código-fonte. Um secret no repositório é um secret comprometido, mesmo que removido depois: o histórico do git preserva tudo.

<details>
<summary>❌ Bad — segredo hardcoded no código</summary>
<br>

```js
// db.client.js
const client = new Pool({
  connectionString: "postgres://user:Abc123!@prod-db/app", // exposto no repositório
});

// auth.middleware.js
const token = jwt.sign(payload, "super-secret-key-123"); // vaza com o código
```

</details>

<br>

<details>
<summary>❌ Bad — segredo em config.js commitado</summary>
<br>

```js
// config.js
export const config = {
  db: {
    url: "postgres://user:Abc123!@prod-db/app", // hardcoded
  },
  auth: {
    secret: "super-secret-key-123", // hardcoded
  },
};
```

</details>

<br>

<details>
<summary>✅ Good — segredo resolvido via process.env, injetado pelo ambiente</summary>
<br>

```js
// config.js
export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    secret: process.env.JWT_SECRET,
    audience: process.env.JWT_AUDIENCE,
  },
};
```

</details>

## O que vai em .env.example

`.env.example` é commitado: documenta quais variáveis o projeto precisa, sem valores reais. O `.env` com os valores fica fora do repositório.

| Pode commitar | Nunca commitar |
| --- | --- |
| `.env.example` (chaves sem valores) | `.env` (chaves com valores reais) |
| URLs sem credenciais | Connection strings com senha |
| Nomes de filas, tópicos, buckets | API keys e tokens |
| Feature flags | JWT signing secrets |
| Timeouts e limites | Qualquer valor com `PASSWORD`, `SECRET`, `KEY`, `TOKEN` |

<details>
<summary>✅ Good — .env.example como contrato público</summary>
<br>

```bash
# .env.example — commitado, sem valores reais
DATABASE_URL=
JWT_SECRET=
JWT_AUDIENCE=

PORT=3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

</details>

## dotenv: desenvolvimento

`dotenv` carrega o `.env` local para `process.env` durante o desenvolvimento. É o único ponto onde `.env` é lido, e só em desenvolvimento.

```bash
npm install dotenv
```

```js
// server.js — carregado antes de qualquer import que use process.env
import "dotenv/config";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp(config);
app.listen(config.port);
```

`dotenv` nunca entra em produção. Em staging e produção, as variáveis são injetadas diretamente pelo host (container, cloud provider, CI/CD).

## Variáveis de ambiente: produção

Em produção, `process.env` é populado pelo ambiente de execução. O código não sabe e não precisa saber de onde vêm.

```bash
# Docker / docker-compose
DATABASE_URL=postgres://user:secret@prod-db/app
JWT_SECRET=prod-signing-secret

# ou via arquivo no deploy
--env-file .env.production
```

<details>
<summary>✅ Good — config.js lê process.env uma vez, módulos recebem por injeção</summary>
<br>

```js
// config.js — único ponto de leitura
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

// features/orders/orders.module.js — recebe config.database, nunca process.env
export function registerOrders(app, config) {
  const orderService = createOrderService(config.database);
  // ...
}
```

</details>

## Cadeia de configuração

O Node.js resolve configuração por precedência: cada camada sobrescreve a anterior.

```
.env.example          → contrato público (chaves sem valores, commitado)
.env                  → desenvolvimento local (fora do repositório, via dotenv)
variáveis de ambiente → staging e produção (injetadas pelo host)
secrets manager       → produção, segredos gerenciados externamente
```

Nunca inverta essa ordem. Um valor no `.env.example` nunca deve sobrescrever uma variável de ambiente injetada pelo host.

## .gitignore: linha de defesa local

Mesmo com a cadeia correta, uma linha no `.gitignore` evita acidentes:

```gitignore
# secrets locais
.env
.env.*
!.env.example
*.key
*.pem
secrets.json
```

O `!.env.example` garante que o arquivo de contrato seja sempre commitado.

## JWT: decode vs verify

`jwt.decode()` extrai o payload sem verificar a assinatura. Qualquer token fabricado ou expirado
passa. Em produção, use `jwt.verify()`: valida assinatura, expiração e audience em uma chamada.

<details>
<summary>❌ Bad — decode não valida assinatura, token forjado passa</summary>
<br>

```js
// auth.middleware.js
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const claims = jwt.decode(token); // extrai payload sem verificar assinatura
  if (!claims) return res.status(401).json({ error: "Invalid token" });

  req.user = claims;
  next();
}
```

</details>

<br>

<details>
<summary>✅ Good — verify valida assinatura e expiração</summary>
<br>

```js
// auth.middleware.js
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

## Autorização centralizada

Verificar roles inline em cada handler duplica lógica e cria brechas quando um handler esquece a
checagem. Um middleware de autorização centralizado garante cobertura uniforme.

<details>
<summary>❌ Bad — verificação de role duplicada em cada handler</summary>
<br>

```js
// orders.handler.js
export async function cancelOrderHandler(req, res) {
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await cancelOrder(req.params.id);
  res.json({ message: "Order cancelled" });
}
```

</details>

<br>

<details>
<summary>✅ Good — middleware de autorização centralizado e reutilizável</summary>
<br>

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

// routes/orders.routes.js — regras visíveis na definição da rota
app.delete("/orders/:id", authenticate, authorize(["admin", "manager"]), cancelOrderHandler);
```

</details>

## Session cookie

Cookies de sessão sem flags de segurança são vetores para XSS e CSRF. `httpOnly` impede acesso via JavaScript, `secure` restringe a HTTPS e `sameSite` bloqueia envio cross-origin.

<details>
<summary>❌ Bad — cookie sem flags de segurança</summary>
<br>

```js
// session sem proteção — acessível por JS, enviado em HTTP e em requisições cross-origin
app.use(session({
  secret: config.auth.secret,
  resave: false,
  saveUninitialized: false,
}));
```

</details>

<br>

<details>
<summary>✅ Good — cookie com httpOnly, secure e sameSite</summary>
<br>

```js
const sessionConfig = {
  secret: config.auth.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,               // inacessível via document.cookie
    secure: true,                 // HTTPS only
    sameSite: "strict",           // bloqueia envio cross-origin (CSRF)
    maxAge: 1000 * 60 * 60 * 8,  // 8 horas
  },
};
app.use(session(sessionConfig));
```

</details>
