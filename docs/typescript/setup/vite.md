# Vite

> Escopo: TypeScript. Guia baseado em **Vite 8.1**.

**Vite** é a ferramenta que serve o projeto durante o desenvolvimento e o empacota para produção. Ele resolve duas coisas que costumavam ser lentas: subir o servidor local de um projeto grande, e recompilar depois de salvar um arquivo. O ganho vem de não empacotar nada durante o desenvolvimento. O navegador pede um módulo por vez, e o Vite entrega aquele módulo.

Esta página cobre as decisões de configuração que se paga caro para mudar depois: o que entra no pacote final, o que fica de fora, onde mora o segredo, e como o import encontra o arquivo. Vite serve React, Vue, Svelte e biblioteca, e por isso ele fica em `setup/`, e não na página de um framework.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Vite** (ferramenta de build e servidor local) | Serve o projeto em desenvolvimento e empacota para produção |
| **ESM** (ECMAScript Modules · Módulos do ECMAScript) | O formato de import nativo do navegador, que dispensa empacotar em desenvolvimento |
| **HMR** (Hot Module Replacement · Troca de Módulo em Execução) | Troca o módulo salvo na página aberta, preservando o estado da tela |
| **bundle** (pacote final) | O JavaScript que o build gera e que o usuário baixa |
| **code splitting** (divisão do pacote) | Quebrar o pacote em pedaços que chegam sob demanda, em vez de um arquivo só |
| **tree shaking** (remoção do código não usado) | O build descarta o que ninguém importa |
| **path alias** (apelido de caminho) | Mapeamento `@/x` para `src/x`, que elimina a corrente de `../../../` |
| **`import.meta.env`** (variáveis de ambiente do Vite) | O objeto onde as variáveis declaradas chegam ao código do cliente |

## Ambiente

```bash
npm create vite@latest my-app -- --template react-ts
npm install
```

O template já traz `tsconfig.json` com `strict` ligado. As decisões de compilador estão em [Fundação do projeto](project-foundation.md), e valem aqui inteiras.

<a id="env-variables"></a>

## Tudo que tem o prefixo VITE\_ vai para o navegador

O Vite injeta no código do cliente apenas as variáveis cujo nome começa com `VITE_`. As demais ficam de fora do pacote. Essa é a linha que separa configuração pública de segredo, e ela é a decisão de segurança da página.

O prefixo não protege nada sozinho: ele obriga uma escolha. Uma chave de API que ganha o prefixo `VITE_` é publicada, porque o pacote final é um arquivo que o usuário baixa e pode abrir. Qualquer pessoa com o navegador aberto lê o valor. Segredo pertence ao backend, que fala com o provedor e devolve ao cliente só o resultado.

O `envDir` e o `mode` decidem qual arquivo o Vite lê: `.env`, `.env.production`, `.env.local`. O `.env.local` fica no `.gitignore`, e o `.env.example` entra no repositório com as chaves e sem os valores.

<details>
<summary>❌ Ruim: a chave secreta ganha o prefixo e viaja no pacote que o usuário baixa</summary>

```bash
# .env
VITE_STRIPE_SECRET_KEY=sk_live_51H8xY2K...
VITE_DATABASE_URL=postgres://admin:senha@db.internal:5432/orders
VITE_API_URL=https://api.acme.com
```

```ts
// features/checkout/services/payment.ts
export async function chargeOrder(orderId: string): Promise<PaymentResult> {
  const response = await fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { Authorization: `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}` },
    body: JSON.stringify({ orderId }),
  });

  const payment = await response.json();

  return payment;
}
```

A chave secreta e a string de conexão do banco estão no arquivo que o navegador baixa. O prefixo `VITE_` publicou as duas.

</details>

<details>
<summary>✅ Bom: o cliente só conhece o endereço público, e o segredo mora no backend</summary>

```bash
# .env.example
VITE_API_URL=https://api.acme.com
VITE_SENTRY_DSN=https://public@sentry.io/123
```

```ts
// lib/env.ts
import { z } from "zod";

const environmentSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SENTRY_DSN: z.string().url(),
});

export const environment = environmentSchema.parse(import.meta.env);
```

```ts
// features/checkout/services/payment.ts
import { apiClient } from "@/lib/api-client";

export async function chargeOrder(orderId: string): Promise<PaymentResult> {
  const payment = await apiClient.post<PaymentResult>("/v1/charges", { orderId });
  return payment;
}
```

O backend guarda a chave da Stripe e chama o provedor. O cliente conhece o endereço da própria API, que é público de qualquer forma. O `environmentSchema` derruba o build quando falta uma variável, em vez de deixar a tela quebrar em produção com `undefined` na URL.

</details>

<a id="path-alias"></a>

## O apelido de caminho é declarado em dois lugares, e os dois precisam concordar

O `@/features/orders` funciona quando o TypeScript e o Vite concordam sobre o que `@` significa. O TypeScript resolve o apelido para checar o tipo; o Vite resolve para encontrar o arquivo no disco. Declarar em um só faz o editor aceitar o import que o build não encontra, ou o contrário.

<details>
<summary>❌ Ruim: o apelido existe só no tsconfig, e o build não encontra o arquivo</summary>

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

O editor mostra o import resolvido e o autocomplete funciona. O `vite build` falha com "Failed to resolve import", porque ninguém contou ao Vite o que `@` significa.

</details>

<details>
<summary>✅ Bom: um plugin lê o tsconfig e mantém os dois em sincronia</summary>

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

O `vite-tsconfig-paths` lê o `compilerOptions.paths` e configura o Vite a partir dele. O apelido passa a existir num lugar só, e acrescentar `@/features` amanhã não exige lembrar do segundo arquivo.

</details>

<a id="dev-proxy"></a>

## O proxy do servidor local evita configurar CORS para desenvolver

Na SPA, o frontend roda em `localhost:5173` e o backend em `localhost:8080`. São origens diferentes, e o navegador bloqueia a chamada por **CORS** (Cross-Origin Resource Sharing · Compartilhamento de Recursos entre Origens). A saída comum é liberar a origem do desenvolvimento no backend, o que coloca configuração de ambiente local dentro do código de produção.

O `server.proxy` resolve no frontend: o Vite recebe `/api/...` e repassa ao backend. Para o navegador, a chamada nunca saiu da origem, e o CORS não entra na conversa. O código chama `/api/v1/orders` em desenvolvimento e em produção, sem `if` de ambiente.

<details>
<summary>✅ Bom: o Vite repassa a chamada, e o cliente usa o mesmo caminho nos dois ambientes</summary>

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const LOCAL_BACKEND_URL = "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: LOCAL_BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
```

</details>

<a id="code-splitting"></a>

## O pacote se divide na rota, e não no arquivo de configuração

Um pacote único faz a primeira tela esperar pelo código de todas as outras. A tela de login baixa o editor de relatório, a biblioteca de gráfico e a tabela de mil linhas, e mostra um botão e dois campos.

A divisão que funciona acompanha a rota, com `import()` dinâmico. O pedaço chega quando o usuário navega para lá. Escrever `manualChunks` à mão para separar por biblioteca costuma render pior: o Rollup já agrupa o que várias rotas compartilham, e a lista escrita à mão envelhece a cada dependência nova.

O que vale configurar à mão é o limite de aviso, para o build reclamar quando um pedaço cresce além do que a tela justifica.

<details>
<summary>❌ Ruim: o import estático arrasta o editor de relatório para dentro da primeira tela</summary>

```tsx
// app/routes.tsx
import { ReportEditor } from "@/features/reports/components/ReportEditor";
import { LoginPage } from "@/features/auth/components/LoginPage";

export const routes = [
  { path: "/login", element: <LoginPage /> },
  { path: "/reports/:id/edit", element: <ReportEditor /> },
];
```

</details>

<details>
<summary>✅ Bom: a rota pesada chega sob demanda, e a tela de login baixa só o que ela usa</summary>

```tsx
// app/routes.tsx
import { lazy, Suspense } from "react";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { RouteFallback } from "@/components/RouteFallback";

const ReportEditor = lazy(() => import("@/features/reports/components/ReportEditor"));

export const routes = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/reports/:id/edit",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <ReportEditor />
      </Suspense>
    ),
  },
];
```

</details>

<details>
<summary>✅ Bom: o build avisa quando um pedaço passa do tamanho que a tela justifica</summary>

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const CHUNK_WARNING_LIMIT_IN_KB = 500;

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: CHUNK_WARNING_LIMIT_IN_KB,
    sourcemap: true,
  },
});
```

O `sourcemap` ligado faz o erro de produção apontar para a linha do código-fonte, em vez da linha do arquivo empacotado. O arquivo de mapa fica no servidor de erros, e não precisa ser servido ao público.

</details>

## Próximos passos

- [React SPA](../frameworks/react-spa.md): TanStack Router, TanStack Query e Zustand sobre esta base.
- [Fundação do projeto](project-foundation.md): as decisões de compilador que esta página assume.
