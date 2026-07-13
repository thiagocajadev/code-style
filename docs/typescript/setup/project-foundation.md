# Fundação de um projeto TypeScript

> [!NOTE]
> Essa estrutura reflete como costumo iniciar projetos TypeScript. Os exemplos são
> referências conceituais. O que importa é o princípio: strict mode sempre ativo, path aliases
> para importações limpas, e o compilador como primeira linha de defesa.

Três decisões tomadas no início do projeto definem quanto o TypeScript vai ajudar depois. A
primeira é ligar o **`strict`** (modo estrito) no **`tsconfig.json`** (arquivo de configuração do
compilador): sem ele, o compilador aceita `any` implícito e deixa passar o nulo, e a linguagem vira
decoração. A segunda é configurar o **path alias** (apelido de caminho) em `compilerOptions.paths`,
para que mover um arquivo de pasta não exija consertar uma sequência de `../../../` em quinze
imports. A terceira é rodar o compilador no pre-commit e na **CI** (Continuous Integration ·
Integração Contínua), porque uma checagem que só roda na máquina de quem lembrou de rodá-la não
protege ninguém.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **`tsconfig.json`** (arquivo de configuração do compilador) | Manifesto que controla parsing, checagem e emissão; raiz do projeto TS |
| **`strict`** (modo estrito) | Flag que liga um pacote de checagens (`strictNullChecks`, `noImplicitAny`, etc.) |
| **path alias** (apelido de caminho) | Mapeamento `@/x` → `src/x` em `compilerOptions.paths`; elimina `../../../` |
| **module resolution** (resolução de módulos) | Estratégia (`bundler`, `node16`) que define como imports são localizados |
| **CI** (Continuous Integration · Integração Contínua) | Pipeline automatizado que roda checagens a cada push; última linha de defesa |
| **ESLint** (linter de JS/TS) | Linter que aplica regras estáticas; com `typescript-eslint` ganha contexto de tipo |
| **`tsc`** (TypeScript Compiler) | Compilador oficial; valida tipos e emite JS conforme o target |
| **target** (versão de saída) | Nível de ECMAScript que o compilador emite (`ES2022`, `ESNext`) |

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- ESLint + typescript-eslint: linting com regras TypeScript-aware

```bash
npm install --save-dev typescript tsx @types/node
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

> [!NOTE]
> [Biome](https://biomejs.dev) suporta TypeScript nativamente e substitui ESLint + Prettier
> em um único binário.

## O modo estrito fica ligado desde o primeiro dia

`strict: true` liga de uma vez o conjunto de checagens que faz o TypeScript valer a pena:
`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` e outras. Sem elas, o parâmetro sem tipo
vira `any` em silêncio, o nulo cabe em qualquer tipo, e o compilador aprova código que quebra assim
que roda.

Ligar depois é caro: um projeto de meses acumula centenas de erros no dia em que a flag é ativada,
e a saída fácil vira desligá-la de novo. No primeiro dia, o custo é zero.

<details>
<summary>❌ Ruim: tsconfig sem strict, e com padrões que o TS6 já deixou para trás</summary>

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "outDir": "./dist",
    "noImplicitAny": false,
    "strictNullChecks": false,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

`target: ES6` e `module: commonjs` são depreciados no TS6. `baseUrl` foi removido: caminhos em
`paths` já devem ser relativos à raiz do projeto (`"./src/*"`). Flags de strict manual (`noImplicitAny`,
`strictNullChecks`) são substituídas por `strict: true`.

</details>

<details>
<summary>✅ Bom: tsconfig base com strict e paths</summary>

```json
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2025"],

    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    "types": ["node"],

    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

</details>

> [!NOTE]
> **TypeScript 6, novos defaults.** `strict`, `module: esnext` e `target: es2025` passaram
> a ser padrão. O campo `types` agora é `[]` por padrão: declare explicitamente os pacotes `@types`
> que o projeto usa (ex.: `["node"]`, `["node", "jest"]`). `baseUrl` foi depreciado: use `paths`
> com caminhos relativos completos a partir da raiz (`"./src/*"`).

## O apelido de caminho tira o `../../` dos imports

Com `@/features/orders`, o import não depende de onde o arquivo que importa está. Mover o arquivo de
pasta deixa de quebrar a linha, e ninguém precisa contar quantos níveis subir.

A configuração vive no `tsconfig.json`, e precisa ser repetida no bundler ou no loader que roda o
código. O compilador entende o apelido, e quem executa o programa também precisa entender.

<details>
<summary>❌ Ruim: o import conta os níveis até a raiz</summary>

```ts
import { UserRepository } from "../../../infra/database/user.repository";
import { BaseError } from "../../../../shared/errors";
import { config } from "../../../config";
```

</details>

<details>
<summary>✅ Bom: o apelido não muda quando o arquivo muda de pasta</summary>

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
// package.json: para tsx e Node nativo
{
  "imports": {
    "#*": "./src/*"
  }
}
```

</details>

## O ponto de entrada é um índice

`server.ts` mostra o que a aplicação faz ao subir, em ordem, e cada linha delega o trabalho a um
módulo próprio. Quem abre o arquivo pela primeira vez entende a aplicação em vinte linhas, e sabe
onde procurar cada assunto.

<details>
<summary>✅ Bom: o server.ts lista os passos, e cada módulo cuida do seu</summary>

```ts
// server.ts
import { config } from "@/config";
import { createApp } from "@/app";

const app = createApp(config);
app.listen(config.port);
```

</details>

## A configuração é lida em um lugar só, e validada ao subir

`config.ts` é o único arquivo que toca `process.env`. Com `process.env` espalhado, cada módulo lê a
variável do jeito dele, e uma variável ausente vira `undefined` que atravessa o sistema até quebrar
longe da causa, em produção, na primeira requisição que precisar dela.

Lendo tudo em um arquivo e validando ali, a aplicação nem sobe com a configuração errada. A falha
aparece no deploy, com o nome da variável que falta, e não em uma tela de usuário.

<details>
<summary>❌ Ruim: process.env lido em todo lugar, sem ninguém validar</summary>

```ts
// auth.middleware.ts
const secret = process.env.JWT_SECRET as string; // pode ser undefined em runtime

// db.client.ts
const url = process.env.DATABASE_URL!; // non-null assertion sem garantia
```

</details>

<details>
<summary>✅ Bom: um só arquivo lê o ambiente, e a aplicação não sobe sem o que precisa</summary>

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
