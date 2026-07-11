# Segurança em projetos Node.js

> Escopo: JavaScript (setup). Princípios transversais em [shared/platform/security.md](../../shared/platform/security.md).

Esta página responde ao "onde eu ponho isso no Node?": em que arquivo mora cada **secret** (credencial, chave ou token), qual biblioteca faz o trabalho e como o código idiomático fica. O porquê de cada regra (segredo fora do repositório, validação no servidor, cookie com HttpOnly, Secure e SameSite) está em [shared/platform/security.md](../../shared/platform/security.md), e não é repetido aqui.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Secret** (segredo) | Credencial, chave ou token; nunca vai para o repositório |
| **PaaS** (Platform as a Service · Plataforma como Serviço) | Ambiente gerenciado (Heroku, Railway, Fly) que injeta variáveis no deploy |
| **Token** (bilhete de acesso) | Texto que o cliente apresenta a cada requisição para provar quem é, como um crachá |
| **JWT** (JSON Web Token · token assinado que identifica o usuário) | Credencial que o cliente envia a cada requisição; o servidor confere a assinatura em vez de guardar sessão |
| **Handler** (função que atende a rota) | Função que recebe a requisição e devolve a resposta |
| **Middleware** (função que roda antes do handler) | Função que intercepta a requisição antes ou depois do handler |
| **Payload** (corpo da mensagem) | Dados que acompanham a requisição ou o token |

---

## Onde cada segredo mora

O valor real nunca fica no repositório. O que fica versionado é a lista de chaves que o projeto espera, e cada ambiente preenche essa lista do seu jeito:

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Contrato público (commitado) | `.env.example` | Chaves esperadas, sem valores |
| Dev local (fora do repositório) | `.env` + `dotenv` | Connection string local, chave de teste |
| Staging/produção | Variáveis do host (container, PaaS) | Segredos reais, injetados no deploy |
| Secrets gerenciados | Vault, AWS Secrets Manager, Doppler | Rotação automática, auditoria |

O `.env.example` é o contrato: ele mostra a superfície de configuração do projeto sem revelar nada. Quem clona o repositório roda `cp .env.example .env` e recebe pronta a lista do que precisa preencher para subir o sistema. Em staging e produção quem preenche é o host, seja o container ou a **PaaS** (Platform as a Service · Plataforma como Serviço), que injeta as variáveis no momento do deploy.

---

## O arquivo de contrato

A ausência de valor já carrega significado neste arquivo:

```bash
DATABASE_URL=
JWT_SECRET=
JWT_AUDIENCE=

PORT=3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

Chave vazia é segredo, e só o ambiente sabe o valor. Chave com valor preenchido é configuração não sensível, e o padrão que está ali serve para rodar local sem perguntar nada a ninguém.

---

## dotenv só existe em desenvolvimento

O `dotenv` lê o arquivo `.env` e copia o conteúdo para `process.env`, a área de variáveis de ambiente que o Node expõe ao processo. Importe uma única vez, na primeira linha do arquivo que sobe a aplicação, antes de qualquer módulo que vá ler `process.env`. Importar depois significa ler uma variável que ainda não existe.

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

Em staging e produção o `dotenv` não é chamado: o container ou a PaaS já entregam as variáveis prontas ao processo, e não existe arquivo `.env` no servidor para ler.

---

## config.js é o único que lê process.env

`process.env` é o limite entre o mundo externo e o seu código. Toda leitura solta no meio da lógica cria uma dependência invisível: a função passa a exigir que uma variável global esteja certa, e o teste que não souber disso quebra sem dizer o porquê. Concentre a leitura em um `config.js` que lê uma vez, valida e exporta um objeto. Os módulos recebem esse objeto por parâmetro, e o teste passa o seu.

<details>
<summary>❌ Ruim: process.env espalhado pela aplicação</summary>

```js
// orders.service.js
export function createOrderService() {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const rate = parseInt(process.env.RATE_LIMIT_MAX, 10);
  // ...
}
```

</details>

<details>
<summary>✅ Bom: leitura em um lugar, módulos recebem por parâmetro</summary>

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

## Use verify, nunca decode

Um **JWT** (JSON Web Token · token assinado que identifica o usuário) é um texto assinado que carrega quem é o usuário. A assinatura é o que prova que o servidor emitiu aquele token, e conferir a assinatura é o trabalho inteiro. `jwt.decode()` não confere nada: ele só abre o **payload** (corpo da mensagem, os dados que o token carrega) e devolve o conteúdo. Qualquer pessoa pode escrever um token dizendo que é admin, mandar para o seu endpoint e ser aceita. `jwt.verify()` confere a assinatura com o segredo e recusa o que está vencido.

<details>
<summary>❌ Ruim: decode aceita token forjado</summary>

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

<details>
<summary>✅ Bom: verify valida assinatura e expiração</summary>

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

## Checar a permissão uma vez, na definição da rota

Repetir `if (user.role !== "admin")` dentro de cada handler espalha a mesma regra por dezenas de arquivos, e basta esquecer um para abrir um buraco. Um **middleware** (função que roda antes do handler) `authorize(roles)` recebe a lista de papéis permitidos e devolve a função que o Express executa antes do handler. A rota passa a declarar quem pode chamá-la, na própria linha em que é definida.

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

## O cookie de sessão com as três flags obrigatórias

O `express-session` aceita as três flags no próprio objeto de configuração, sem plugin nem truque. `httpOnly` esconde o cookie do JavaScript da página, `secure` só o transmite por HTTPS e `sameSite` impede que outro site o envie por você. O motivo de cada uma está em [shared/platform/security.md](../../shared/platform/security.md).

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

## O que o Git nunca deve ver

Uma linha esquecida aqui vaza um segredo para sempre, porque o histórico do Git guarda o que foi commitado mesmo depois de o arquivo ser removido:

```gitignore
.env
.env.*
!.env.example
*.key
*.pem
secrets.json
```

A linha `.env.*` bloqueia as variantes por ambiente (`.env.local`, `.env.production`) que costumam nascer no meio do projeto. A exceção `!.env.example` reabre a porta para o contrato público, que é o único arquivo da família que deve ser commitado.

---

## Quando o segredo vaza

Trate o segredo como queimado no instante em que ele toca um commit. Não importa se o push foi para um repositório privado, se você apagou o arquivo no commit seguinte ou se ninguém parece ter visto: a partir do momento em que a chave existiu no histórico, ela pode ter sido clonada, indexada por um bot que varre o GitHub ou guardada em cache de CI. Bots de varredura encontram chave nova em repositório público em questão de minutos.

A ordem das ações importa, e quase todo mundo erra nela:

1. **Rotacione a credencial primeiro.** Revogue a chave no provedor e emita outra. Enquanto isso não acontece, todo o resto é teatro: limpar o histórico não desfaz as cópias que já saíram.
2. **Invalide o que a chave sustentava.** Se o que vazou foi o `JWT_SECRET`, todos os tokens assinados com ele continuam válidos até expirarem. Trocar o segredo derruba as sessões, e é isso que você quer.
3. **Procure o uso indevido.** Olhe os logs de acesso do provedor no período entre o commit e a rotação: chamada de origem estranha, pico de consumo, recurso criado que ninguém pediu.
4. **Só então limpe o histórico.** `git filter-repo` (ou o BFG) reescreve os commits e remove o valor. Isso muda o hash de todo commit afetado, obriga um `push --force` e quebra o clone de quem já tinha o repositório, então combine com o time antes.
5. **Avise quem precisa saber.** Time, responsável pela segurança e, se houve acesso a dado de terceiro, quem a política da empresa manda notificar.

```bash
pip install git-filter-repo
git filter-repo --invert-paths --path .env
git push --force --all
```

O passo que evita a próxima vez é automático: ative o **secret scanning** (varredura de segredos) com push protection no GitHub, que barra o commit antes de ele sair da máquina, ou instale o `gitleaks` como hook de pre-commit. Um hook que custa dois segundos por commit paga a primeira rotação de emergência que ele evitar.

```bash
npm install --save-dev @gitleaks/gitleaks
npx gitleaks protect --staged --verbose
```
