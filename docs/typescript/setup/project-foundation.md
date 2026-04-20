# Project Foundation

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos TypeScript. Os exemplos são
> referências conceituais — o que importa é o princípio: strict mode sempre ativo, path aliases
> para importações limpas, e o compilador como primeira linha de defesa.

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/editorconfig.md) — indentação, charset, trailing whitespace
- ESLint + typescript-eslint — linting com regras TypeScript-aware

```bash
npm install --save-dev typescript tsx @types/node
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

> [!NOTE] [Biome](https://biomejs.dev) suporta TypeScript nativamente e substitui ESLint + Prettier
> em um único binário.

## tsconfig — strict mode sempre ativo

`strict: true` ativa o conjunto de verificações que torna o TypeScript útil: `strictNullChecks`,
`noImplicitAny`, `strictFunctionTypes` e outros. Sem ele, o compilador aceita código que explode
em runtime.

<details>
<summary>✅ Good — tsconfig base com strict e paths</summary>
<br>

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],

    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

</details>

## Path aliases — importações sem `../../`

Path aliases tornam as importações independentes de onde o arquivo está na hierarquia — sem
contagem de `../`. A configuração em `tsconfig.json` precisa ser espelhada no bundler ou loader.

<details>
<summary>❌ Bad — importações relativas profundas</summary>
<br>

```ts
import { UserRepository } from "../../../infra/database/user.repository";
import { BaseError } from "../../../../shared/errors";
import { config } from "../../../config";
```

</details>

<br>

<details>
<summary>✅ Good — alias limpo e independente de profundidade</summary>
<br>

```ts
import { UserRepository } from "@/infra/database/user.repository";
import { BaseError } from "@/shared/errors";
import { config } from "@/config";
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// package.json — para tsx e Node nativo
{
  "imports": {
    "#*": "./src/*"
  }
}
```

</details>

## Entry point enxuto

`server.ts` declara intenção, não implementa. Toda configuração é delegada para módulos tipados.
O arquivo serve como índice do projeto.

<details>
<summary>✅ Good — server.ts como índice, configuração delegada</summary>
<br>

```ts
// server.ts
import { config } from "@/config";
import { createApp } from "@/app";

const app = createApp(config);
app.listen(config.port);
```

</details>

## Configuração centralizada e tipada

`config.ts` é o único ponto de leitura de variáveis de ambiente. O tipo garante que nenhum módulo
acessa `process.env` diretamente e que os campos obrigatórios são verificados na inicialização.

<details>
<summary>❌ Bad — process.env espalhado e sem validação</summary>
<br>

```ts
// auth.middleware.ts
const secret = process.env.JWT_SECRET as string; // pode ser undefined em runtime

// db.client.ts
const url = process.env.DATABASE_URL!; // non-null assertion sem garantia
```

</details>

<br>

<details>
<summary>✅ Good — config.ts como único ponto, com validação na inicialização</summary>
<br>

```ts
// config.ts
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

interface DatabaseConfig {
  url: string;
}

interface AuthConfig {
  secret: string;
  audience: string;
  expiresIn: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
  auth: AuthConfig;
  rateLimit: RateLimitConfig;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  database: {
    url: requireEnv("DATABASE_URL"),
  },
  auth: {
    secret: requireEnv("JWT_SECRET"),
    audience: requireEnv("JWT_AUDIENCE"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100,
  },
};
```

```ts
// features/orders/orders.module.ts
import { AppConfig } from "@/config";

export function registerOrders(app: Express, config: AppConfig): void {
  const orderService = createOrderService(config.database); // recebe só o que precisa
  // ...
}
```

</details>

## Estrutura de arquivos

```
src/
├── server.ts
├── app.ts
├── config.ts
├── middleware.ts
├── shared/
│   ├── errors.ts           ← BaseError + subclasses
│   └── types.ts            ← tipos compartilhados
├── features/
│   ├── orders/
│   │   ├── orders.module.ts      ← registerOrders()
│   │   ├── order.endpoints.ts
│   │   ├── order.service.ts
│   │   └── order.types.ts        ← Order, CreateOrderInput, etc.
│   └── users/
│       ├── users.module.ts       ← registerUsers()
│       ├── user.endpoints.ts
│       ├── user.service.ts
│       └── user.types.ts
└── infra/
    ├── database.client.ts        ← createDatabaseClient(config.database)
    └── auth.middleware.ts        ← authenticate(config.auth)
```

> Tipos de domínio ficam co-localizados com o módulo que os define em `*.types.ts`. Tipos
> compartilhados entre domínios vivem em `shared/types.ts`.
