# Autenticação, autorização e transporte de credencial

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto. Pré-requisito:
> [security.md](security.md), que separa autenticação de autorização e explica por que o servidor
> valida como se o frontend não existisse.
>
> Este arquivo é a fonte única do projeto sobre **cookie**: atributos de `Set-Cookie`, `SameSite`,
> `Secure`, `HttpOnly` e prefixos de nome. As demais páginas apontam para cá em vez de repetir.

Todo sistema com usuário responde três perguntas em sequência: quem é você, o que você pode fazer, e como você prova isso na próxima requisição. A terceira é a que gera mais confusão, porque a resposta muda com o cliente: um navegador guarda credencial de um jeito, um app nativo de outro, e um serviço chamando outro serviço de um terceiro. Este documento cobre os padrões que resolvem as três, que são OAuth, **OIDC** (OpenID Connect · autenticação construída sobre OAuth), **JWT** (JSON Web Token · token assinado que carrega a identidade) e a família JOSE, mais o funcionamento do cookie atributo por atributo, o cuidado com cache de resposta autenticada, e a decisão de onde guardar o token em cada tipo de cliente. As classes de falha correspondentes estão em [security-advanced.md](security-advanced.md#a07-authentication-failures).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **OAuth 2.0** (Open Authorization · autorização aberta) | Protocolo para um aplicativo obter acesso limitado a um recurso em nome do usuário, sem receber a senha dele |
| **OIDC** (OpenID Connect · conexão de identidade aberta) | Camada de autenticação sobre OAuth 2.0, que acrescenta um token descrevendo quem o usuário é |
| **PKCE** (Proof Key for Code Exchange · prova de posse na troca do código) | Segredo gerado pelo cliente a cada início de fluxo, que impede que um código de autorização interceptado seja trocado por token |
| **JWT** (JSON Web Token · token web em JSON) | Token que carrega dados assinados, verificáveis sem consultar o emissor |
| **JOSE** (JSON Object Signing and Encryption · assinatura e criptografia de objetos JSON) | Conjunto de padrões que define como assinar, criptografar e representar chaves em JSON |
| **claim** (afirmação) | Cada campo dentro do token, como `sub` para o identificador do usuário e `exp` para o instante de expiração |
| **bearer token** (token ao portador) | Token que autoriza quem o apresenta, sem provar posse de nada; roubá-lo é suficiente para usá-lo |
| **cookie jar** (pote de cookies) | Armazenamento onde o cliente guarda cookies e decide, por domínio e caminho, quais envia em cada requisição |
| **SameSite** (mesmo site) | Atributo do cookie que decide se ele acompanha requisições partidas de outro site |
| **CSRF** (Cross-Site Request Forgery · falsificação de requisição entre sites) | Ataque que faz o navegador do usuário autenticado enviar uma requisição que ele não pediu |
| **XSS** (Cross-Site Scripting · injeção de script na página) | Ataque que faz a página executar script do atacante, que passa a ler tudo que o JavaScript da página alcança |
| **SPA** (Single-Page Application · aplicação de página única) | Interface que roda inteira no navegador e conversa com a API por requisições em JavaScript |
| **ETag** (entity tag · etiqueta da versão do recurso) | Identificador da versão de uma resposta, usado pelo cliente para perguntar se aquilo mudou |
| **BFF** (Backend For Frontend · backend dedicado ao frontend) | Backend próprio de uma interface, que guarda o token no servidor e entrega ao navegador apenas um cookie de sessão |
| **DPoP** (Demonstrating Proof of Possession · demonstração de posse) | Mecanismo que prende o token a uma chave do cliente, então o token roubado não funciona sozinho |
| **mTLS** (mutual TLS · TLS com autenticação nas duas pontas) | O cliente também apresenta certificado, e o token pode ser preso a ele |
| **passkey** (chave de acesso) | Par de chaves criado no dispositivo e preso ao domínio do site, que substitui a senha e não funciona em site de phishing |
| **WebAuthn** (Web Authentication · autenticação web) | API do navegador que cria e usa esses pares de chave |

<a id="session-vs-token"></a>

## Sessão no servidor e token autocontido

As duas formas de manter alguém logado diferem em onde a verdade mora.

Na sessão no servidor, o cookie carrega um identificador aleatório sem significado, e o servidor consulta o próprio armazenamento para saber quem é aquilo. No token autocontido, o cookie ou o cabeçalho carrega os dados assinados, e o servidor confere a assinatura sem consultar nada.

| Aspecto | Sessão no servidor | Token autocontido (JWT) |
|---|---|---|
| Onde estão os dados | No servidor, indexados pelo identificador | Dentro do próprio token, no cliente |
| Custo por requisição | Uma leitura no armazenamento de sessão | Verificação de assinatura, sem I/O (leitura em disco ou em rede) |
| Revogar agora | Apagar a linha, e vale na próxima requisição | Não vale até expirar, sem lista de revogação |
| Alterar permissão | Vale na requisição seguinte | Vale quando o token for renovado |
| Escala horizontal | Exige armazenamento compartilhado, como Redis | Qualquer instância verifica sozinha |
| Tamanho no transporte | Dezenas de bytes | Centenas de bytes, e cresce com cada claim |

A escolha prática costuma ser híbrida: token de acesso curto e autocontido para as chamadas de API, mais um refresh token com registro no servidor, que é o ponto onde a revogação funciona. Sessão no servidor continua sendo a resposta mais simples para uma aplicação web que renderiza no servidor e não expõe API para terceiros.

O identificador de sessão precisa de pelo menos 64 bits de entropia, o que dá 16 caracteres em hexadecimal. Entropia importa mais que comprimento: identificador longo com trecho previsível, como timestamp ou nome do host, tem a entropia do trecho aleatório e nada mais.

<a id="oauth"></a>

## OAuth 2.0: delegação de acesso

OAuth existe para resolver um problema específico: dar a um aplicativo acesso limitado a um recurso seu que vive em outro lugar, sem entregar sua senha a ele. Quatro papéis participam:

| Papel | Quem é | Exemplo |
|---|---|---|
| **Resource owner** (dono do recurso) | O usuário | Você |
| **Client** (cliente) | O aplicativo que quer o acesso | O app de agenda que quer ler seu calendário |
| **Authorization server** (servidor de autorização) | Quem autentica e emite token | Contas Google |
| **Resource server** (servidor de recurso) | Quem guarda o dado e aceita o token | API do Google Calendar |

O fluxo recomendado hoje é o authorization code com PKCE, e ele tem uma ordem fixa:

```
cliente gera code_verifier → redireciona com code_challenge → usuário autentica → redirect com code → cliente troca code + code_verifier por token → chama API com access token
```

O `code_verifier` é um valor aleatório que fica no cliente. O `code_challenge` enviado no início é o hash dele. Quem interceptar o código de autorização no meio do caminho não consegue trocá-lo por token, porque não tem o `code_verifier` original. Isso fecha o ataque de interceptação de código, que é o risco real em app nativo, onde o redirect passa pelo sistema operacional.

| Grant type | Para que serve | Estado |
|---|---|---|
| **Authorization code + PKCE** | Usuário autenticando em app web, SPA ou nativo | Recomendado para todo cliente |
| **Client credentials** | Serviço chamando serviço, sem usuário envolvido | Recomendado |
| **Device authorization** | TV, console e dispositivo sem teclado confortável | Recomendado nesse caso |
| **Refresh token** | Obter novo access token sem reautenticar | Recomendado, com rotação |
| **Implicit** | Devolvia token direto na URL | Removido |
| **Resource owner password credentials** | O app coletava a senha e a trocava por token | Removido |

A referência de segurança publicada para OAuth 2.0 é o [RFC 9700](https://datatracker.ietf.org/doc/rfc9700/), a Best Current Practice que consolida o que se aprendeu desde 2012.

<a id="oauth-2-1"></a>

### O que a versão 2.1 mudou

A OAuth 2.1 ainda é Internet-Draft, na revisão `draft-ietf-oauth-v2-1-15` de março de 2026, e não é RFC. Isso não a torna teórica: ela consolida práticas que os provedores grandes já aplicam, e as bibliotecas atuais assumem esse comportamento.

- **PKCE deixou de ser opcional** e passou a valer para todo cliente no authorization code, inclusive o cliente confidencial que guarda segredo no servidor.
- **O implicit grant saiu.** Devolver token no fragmento da URL expõe a credencial ao histórico do navegador, ao `Referer` e a qualquer script na página.
- **O password grant saiu.** Um app que coleta a senha do usuário para trocá-la por token treina o usuário a digitar senha em telas de terceiros, que é o comportamento que o phishing explora.
- **Redirect URI passou a exigir comparação exata de string.** Correspondência por prefixo ou por curinga permite desviar o código para um caminho controlado pelo atacante no mesmo domínio.

<a id="oidc"></a>

## OIDC: autenticação em cima da autorização

OAuth responde "este aplicativo pode acessar tal recurso". Ele não responde "quem é o usuário". Usar OAuth puro para login funciona por acidente e falha em um caso específico: um access token válido, obtido por outro aplicativo para outro propósito, prova acesso e não prova identidade para a sua aplicação.

OIDC acrescenta o `id_token`, um JWT que descreve o usuário e é destinado ao seu cliente. A confusão entre os dois tokens é o erro mais comum da área:

| Token | Para quem é | Para que serve | Onde não usar |
|---|---|---|---|
| `access_token` | Para o servidor de recurso | Autorizar a chamada de API | Não use para descobrir quem é o usuário |
| `id_token` | Para o seu cliente | Afirmar quem autenticou, quando e por qual provedor | Não envie como credencial para uma API |

As claims do `id_token` que precisam ser conferidas: `iss` (quem emitiu), `aud` (para qual cliente foi emitido, que deve ser o seu `client_id`), `exp` (validade), `iat` (instante de emissão) e `nonce` (número usado uma única vez: o valor aleatório que você enviou no início do fluxo, que liga a resposta ao seu pedido).

Provedores OIDC publicam a configuração em `/.well-known/openid-configuration`, com endpoints e a URL do conjunto de chaves públicas. Ler esse documento em vez de fixar URLs no código deixa a rotação de chave do provedor acontecer sem alterar sua aplicação.

<a id="jwt-jose"></a>

## JWT e a família JOSE

JOSE é o guarda-chuva, e JWT é um dos formatos dentro dele:

| Padrão | RFC | O que define |
|---|---|---|
| **JWS** (JSON Web Signature · assinatura) | 7515 | Como assinar um conteúdo e representar a assinatura |
| **JWE** (JSON Web Encryption · criptografia) | 7516 | Como criptografar o conteúdo, para que nem quem intercepta consiga ler |
| **JWK** (JSON Web Key · chave) | 7517 | Como representar uma chave em JSON, e um conjunto delas em JWKS |
| **JWA** (JSON Web Algorithms · algoritmos) | 7518 | Os nomes dos algoritmos, como `RS256` e `ES256` |
| **JWT** (JSON Web Token · token) | 7519 | O formato de claims que viaja dentro de um JWS ou de um JWE |

Um JWT assinado tem três partes separadas por ponto: cabeçalho, payload e assinatura. As duas primeiras são **Base64URL** (codificação de bytes em texto seguro para URL), que qualquer pessoa desfaz: cola o token em um decodificador e lê o conteúdo. Dado sensível dentro de um JWT assinado está exposto, e é para isso que existe o JWE.

| Claim | Significado | Conferir? |
|---|---|---|
| `iss` | Quem emitiu | Sim, contra o emissor esperado |
| `sub` | Identificador do usuário | Sim, é a identidade que você vai usar |
| `aud` | Para quem o token foi emitido | Sim, contra o identificador da sua API |
| `exp` | Instante de expiração | Sim, sempre |
| `nbf` | Não vale antes deste instante | Sim, quando presente |
| `iat` | Instante de emissão | Útil para recusar token antigo demais |
| `jti` | Identificador único do token | Necessário para lista de revogação |

<details>
<summary>❌ Ruim: o token é lido sem verificação de assinatura</summary>

```js
const payload = jwt.decode(token);

if (payload.role === 'admin') {
  await deleteAllInvoices();
}
```

`decode` desmonta o token e ignora a assinatura. Qualquer pessoa monta um JWT com `role: "admin"`,
codifica em Base64URL e passa. A mesma falha aparece de outra forma quando a verificação existe mas
aceita qualquer algoritmo: o atacante troca `alg` por `none`, ou assina com HS256 usando a chave
pública RSA como segredo.

</details>

<details>
<summary>✅ Bom: assinatura verificada com algoritmo, emissor e destinatário fixados</summary>

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = 'https://login.exemplo.dev';
const AUDIENCE = 'api://invoices';
const publicKeys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, publicKeys, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['RS256'],
  });

  const claims = Result.ok(payload);
  return claims;
}
```

</details>

Três parâmetros fecham três ataques distintos. `algorithms` impede a troca de algoritmo. `issuer` impede que um token de outro provedor seja aceito. `audience` impede que um token emitido para outro serviço da sua própria organização valha na sua API. O `createRemoteJWKSet` busca a chave pública pelo identificador `kid` do cabeçalho e mantém cache, o que faz a rotação de chave do provedor funcionar sem deploy.

Bibliotecas que implementam JOSE, com a versão vigente hoje:

| Ecossistema | Biblioteca | Versão | Nota |
|---|---|---|---|
| JavaScript e TypeScript | `jose` | 6.2.4 | 103,5 milhões de downloads por semana. Usa Web Crypto, roda em Node, browser, Deno, Bun e edge, e cobre JWE e JWKS |
| JavaScript e TypeScript | `jsonwebtoken` | 9.0.3 | 53,3 milhões por semana. API síncrona, só Node, sem JWE. Escolha de manutenção, não de projeto novo |
| .NET | `Microsoft.IdentityModel.JsonWebTokens` | 8.21.0 | Base do middleware de autenticação do ASP.NET Core |
| Python | `PyJWT` | 2.13.0 | Foco em JWT. Para o fluxo OAuth e OIDC completo, `Authlib` 1.7.2 |
| Java e Kotlin | `nimbus-jose-jwt` | 10.3 | Implementação completa de JOSE na JVM |

<a id="cookie"></a>

## O cookie por dentro

O cookie jar é o armazenamento que o cliente mantém para cookies, junto com as regras de quando enviar cada um. No navegador ele é invisível para você e o navegador decide sozinho, comparando domínio, caminho, esquema e contexto da requisição. Em cliente HTTP de linha de comando ou de biblioteca, o pote é explícito e você o controla: `curl -c` grava e `curl -b` envia, e é por isso que um script que autentica e depois "perde" a sessão em geral está criando um pote novo a cada chamada.

O servidor cria cookie com o cabeçalho `Set-Cookie`, um por cookie. Cada atributo muda o alcance ou a proteção:

| Atributo | O que faz | Recomendação |
|---|---|---|
| `Nome=valor` | O par que será enviado de volta | Valor sem significado, aleatório, quando for identificador de sessão |
| `Domain` | Quais hosts recebem o cookie | Omitir. Sem `Domain`, o cookie fica preso ao host exato que o criou. Declarar `Domain=.exemplo.dev` entrega o cookie a todo subdomínio |
| `Path` | Quais caminhos recebem | O mais restrito que servir. `Path=/` quando é sessão da aplicação inteira |
| `Expires` e `Max-Age` | Quando o cookie morre | Omitir os dois em cookie de sessão, e ele morre com o navegador. `Max-Age` vence `Expires` onde os dois aparecem |
| `Secure` | Só envia em HTTPS | Sempre. Sem isso, uma requisição em HTTP entrega o cookie a quem observa a rede |
| `HttpOnly` | JavaScript não lê via `document.cookie` | Sempre em cookie de sessão. É o que impede um XSS de copiar a sessão |
| `SameSite` | Se acompanha requisição vinda de outro site | `Lax` ou `Strict`, conforme a tabela abaixo |
| `Partitioned` | Guarda o cookie separado por site de topo | Necessário em cookie de terceiro que ainda precise funcionar |

<details>
<summary>❌ Ruim: o cookie de sessão sai sem proteção e com alcance amplo</summary>

```
Set-Cookie: session=8f3a2b; Domain=.exemplo.dev; Path=/
```

Sem `Secure`, vaza na primeira requisição em HTTP. Sem `HttpOnly`, um XSS copia a sessão. Sem
`SameSite`, o navegador aplica o default e o comportamento passa a depender da versão dele. E o
`Domain` amplo entrega a sessão a qualquer subdomínio, incluindo aquele host de teste que alguém
subiu e esqueceu.

</details>

<details>
<summary>✅ Bom: prefixo de nome, alcance mínimo e as três proteções</summary>

```js
const SESSION_MAX_AGE_SECONDS = 1800;

function buildSessionCookie(sessionId) {
  const attributes = [
    `__Host-session=${sessionId}`,
    'Path=/',
    'Secure',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];

  const cookie = attributes.join('; ');
  return cookie;
}
```

</details>

O prefixo `__Host-` no nome é regra que o navegador impõe: ele recusa o cookie se faltar `Secure`, se houver `Domain`, ou se `Path` não for `/`. Isso põe a proteção sob verificação do navegador, em vez de deixá-la na memória de quem escreve o código. Um subdomínio comprometido também deixa de conseguir sobrescrever o cookie da aplicação principal. Quando o cookie precisa mesmo ser compartilhado entre subdomínios, o prefixo é `__Secure-`, que exige `Secure` e permite `Domain`.

<a id="samesite"></a>

### SameSite: Strict, Lax e None

| Valor | Quando o cookie é enviado | Consequência |
|---|---|---|
| `Strict` | Só em requisição partida do próprio site | Proteção maior. O usuário que chega por link externo aterrissa deslogado, e o retorno de um provedor de identidade externo não carrega o cookie |
| `Lax` | Em navegação de topo por GET vindo de fora, e em tudo que parte do próprio site | Bloqueia POST entre sites, que é o vetor clássico de CSRF, e mantém funcionando o link externo e o redirect de login |
| `None` | Sempre, inclusive em contexto de terceiro | Exige `Secure`. Hoje também exige `Partitioned` para continuar funcionando enquanto os navegadores restringem cookie de terceiro |

Navegadores baseados em Chromium tratam cookie sem `SameSite` declarado como `Lax` desde o Chrome 80, e esse é o comportamento vigente. Declarar o valor de forma explícita continua valendo, porque o default não é igual em todos os clientes.

A escolha entre `Strict` e `Lax` depende de como o login termina. Fluxo que autentica no próprio domínio aceita `Strict` sem prejuízo. Fluxo que volta de um provedor externo por redirect precisa de `Lax`, porque o retorno é uma navegação de topo partida de outro site, e um cookie `Strict` não acompanha essa navegação: o usuário completa o login no provedor, volta para a sua aplicação e chega sem sessão. Trocar `Lax` por `Strict` sem esse cuidado produz um bug que aparece só em produção com provedor real.

`SameSite` reduz a superfície de CSRF e não a elimina. Requisição GET que altera estado continua atravessando `Lax`, e cookie de terceiro legítimo obriga `None`. Em aplicação que muda estado por cookie, mantenha token anti-CSRF, ou confira `Origin` no servidor para toda requisição que escreve.

O particionamento por site de topo, chamado de **CHIPS** (Cookies Having Independent Partitioned State · cookies com estado particionado independente), guarda o cookie de terceiro numa gaveta separada por site que o incorpora. Um cookie definido com `SameSite=None; Secure; Partitioned` dentro de um iframe passa a existir uma vez por site hospedeiro, em vez de acompanhar o usuário por todos eles. Safari bloqueia a maior parte do cookie de terceiro por padrão, e Firefox particiona por site, então integração que depende de cookie em iframe precisa ser testada nos três navegadores.

<a id="session-lifecycle"></a>

### Fixação de sessão e os três prazos

Renove o identificador de sessão sempre que o nível de privilégio mudar, e principalmente no login. Sem isso, um atacante planta um identificador conhecido no navegador da vítima antes dela autenticar, e depois usa o mesmo identificador já autenticado. Três prazos convivem:

- **Prazo por inatividade**: encerra a sessão depois de um tempo sem uso, e limita a janela de quem roubou o cookie.
- **Prazo absoluto**: encerra depois de uma duração máxima, com atividade ou sem. Obriga reautenticação periódica.
- **Renovação periódica do identificador**: troca o identificador no meio da sessão, e reduz o tempo em que um identificador vazado serve.

No logout, apague a sessão no servidor primeiro. Expirar o cookie sem invalidar o registro deixa a sessão viva para quem tiver copiado o valor.

<a id="cache-etag"></a>

## Cache, ETag e resposta autenticada

O `ETag` é um identificador da versão de um recurso. O servidor o envia na resposta, o cliente devolve em `If-None-Match` na próxima vez, e o servidor responde `304 Not Modified` sem corpo quando nada mudou. É o mecanismo de revalidação mais barato que existe, e o problema não está nele: está no que acontece quando ele acompanha uma resposta que só um usuário deveria ver.

Duas consequências aparecem quando resposta autenticada entra em cache.

A primeira é vazamento por cache compartilhado. Um **CDN** (Content Delivery Network · rede de distribuição de conteúdo) ou proxy que recebe `Cache-Control: public` guarda a resposta e a serve para o próximo que pedir aquela URL. Se o corpo tinha o nome, o e-mail e a fatura de um cliente, o próximo visitante recebe o dado dele. A URL era a mesma, e o que diferenciava os dois era o cookie que o cache ignorou.

A segunda é rastreamento. Um `ETag` é um valor arbitrário que o servidor escolhe e o cliente devolve com fidelidade, o que o torna um identificador persistente. Limpar cookies não limpa cache, então esse identificador sobrevive à limpeza que o usuário fez acreditando ter apagado o rastro. Isso é conhecido como supercookie, e é o motivo para não derivar `ETag` de nada ligado ao usuário: derive do conteúdo, com hash do corpo da resposta ou versão do registro.

<details>
<summary>❌ Ruim: resposta com dado do usuário liberada para cache compartilhado</summary>

```
Cache-Control: public, max-age=300
ETag: "user-8f3a2b-session-1d4c"
```

O CDN guarda a fatura de um cliente e a entrega ao próximo que abrir a mesma URL. E o `ETag`
carrega identificador de usuário e de sessão, então ele identifica a pessoa mesmo depois de ela
apagar os cookies.

</details>

<details>
<summary>✅ Bom: fora de qualquer cache, com a variação declarada</summary>

```
Cache-Control: no-store
Vary: Cookie, Authorization
```

</details>

`no-store` mantém a resposta fora do cache do navegador e dos intermediários, e é o valor certo para qualquer resposta com dado de sessão. Quando o requisito é permitir cache no navegador do próprio usuário, `private` autoriza o cache local e proíbe o compartilhado. `Vary: Cookie, Authorization` declara que a resposta muda conforme essas credenciais, o que impede o cache de tratar duas requisições diferentes como a mesma. Sobre cache como ferramenta de desempenho, ver [performance.md](performance.md).

No logout, `Clear-Site-Data: "cache", "cookies", "storage"` pede ao navegador que descarte o que ficou do lado do cliente.

<a id="token-browser"></a>

## Token no navegador

A pergunta "onde guardo o token no frontend" tem uma resposta curta: em lugar nenhum que o JavaScript da página alcance.

| Lugar | Sobrevive ao recarregar | JavaScript lê | Vai sozinho na requisição | Veredito |
|---|---|---|---|---|
| `localStorage` | Sim | Sim | Não | Qualquer XSS copia o token. Não guarde credencial aqui |
| `sessionStorage` | Só na aba | Sim | Não | O mesmo problema, com janela menor |
| Variável em memória | Não | Sim, no mesmo contexto | Não | Aceitável para access token curto, com renovação silenciosa |
| Cookie `HttpOnly` | Sim | Não | Sim | Recomendado. Exige cuidado com CSRF |

O padrão que resolve isso em SPA é o BFF: um backend próprio do frontend guarda os tokens do lado do servidor, e o navegador só recebe um cookie de sessão opaco.

```
navegador → cookie de sessão → BFF (guarda access e refresh token) → chama a API com Bearer → resposta
```

O navegador nunca vê o access token, então não existe token para um XSS roubar. O que um XSS ainda consegue é fazer requisições em nome do usuário enquanto a página está aberta, porque o cookie acompanha as chamadas ao BFF. A defesa contra isso é impedir o XSS, com **CSP** (Content Security Policy · política que limita o que a página pode executar) e escape de saída, e não escolher melhor onde guardar o token.

Com sessão em cookie, o CSRF volta ao mapa. `SameSite=Lax` cobre o POST entre sites, e sobra a requisição GET que altera estado e o cenário com cookie de terceiro. Uma verificação de origem no servidor fecha o resto:

<details>
<summary>❌ Ruim: a rota de escrita confia no cookie e não olha de onde veio a chamada</summary>

```js
app.post('/api/transfers', async (request, response) => {
  const transfer = await createTransfer(request.body, request.session.userId);

  return response.json(transfer);
});
```

Uma página de terceiro submete um formulário para essa URL, o navegador anexa o cookie de sessão
e a transferência acontece sem o usuário ter pedido.

</details>

<details>
<summary>✅ Bom: a origem é conferida antes de qualquer escrita</summary>

```js
const ALLOWED_ORIGINS = new Set(['https://app.exemplo.dev']);

function isTrustedOrigin(request) {
  const origin = request.headers.origin ?? request.headers.referer;
  if (!origin) {
    return false;
  }

  const parsed = URL.parse(origin);

  const isAllowed = parsed !== null && ALLOWED_ORIGINS.has(parsed.origin);
  return isAllowed;
}
```

</details>

O navegador envia `Origin` em toda requisição que escreve e não permite que a página altere esse cabeçalho, o que o torna uma fonte confiável para essa decisão. Onde o time preferir token anti-CSRF, o padrão é o mesmo de sempre: valor aleatório por sessão, entregue no HTML ou em cookie legível, e devolvido em cabeçalho que o servidor compara.

<a id="token-mobile"></a>

## Token no app mobile

Em app nativo mudam três coisas: não existe cookie jar gerenciado por um navegador que você controla, o binário é inspecionável por quem instalou, e o armazenamento local pode ser lido em aparelho comprometido ou em backup.

A referência aqui é o RFC 8252, publicado como BCP 212, e a exigência central dele é sobre onde a tela de login aparece: **app nativo não pode usar user-agent embutido para autorizar.** O motivo é direto. Uma WebView, que é um navegador embutido dentro do próprio app, permite ao app ler cada tecla digitada no formulário de login, o que captura usuário e senha, e nada além da confiança impede isso. O fluxo correto usa o browser do sistema, com `ASWebAuthenticationSession` no iOS e Custom Tabs no Android, que rodam fora do processo do app e reaproveitam a sessão já existente no navegador.

O RFC lista três formas de o redirect voltar para o app, em ordem de preferência:

| Forma | Como funciona | Nota |
|---|---|---|
| **URI `https` reivindicada** | Universal Links no iOS, App Links no Android | Preferida. O sistema garante a identidade do app de destino, porque a posse do domínio foi comprovada |
| **Esquema de uso privado** | `com.exemplo.app:/oauth2redirect` | Aceitável. O esquema precisa conter ponto, em notação de domínio invertido. Outro app pode registrar o mesmo esquema |
| **Loopback** | `http://127.0.0.1:{porta}/{caminho}` | Para aplicação de desktop |

O app é cliente público: qualquer segredo no binário é extraível, então não existe client secret. PKCE é obrigatório, e o RFC afirma isso de forma direta tanto para o cliente quanto para o servidor de autorização.

<details>
<summary>❌ Ruim: o refresh token vai para o armazenamento comum de preferências</summary>

```swift
UserDefaults.standard.set(refreshToken, forKey: "refresh_token")
```

`UserDefaults` grava em arquivo `plist` (formato de lista de propriedades da Apple) sem criptografia. O equivalente no Android é
`SharedPreferences` em texto puro. Os dois aparecem em backup e são legíveis em aparelho
comprometido.

</details>

<details>
<summary>✅ Bom: Keychain, restrito ao aparelho e ao estado desbloqueado</summary>

```swift
func storeRefreshToken(_ token: String) throws {
    let attributes: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "refresh-token",
        kSecValueData as String: Data(token.utf8),
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]

    let status = SecItemAdd(attributes as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw KeychainError.storeFailed(status)
    }
}
```

</details>

`kSecAttrAccessibleWhenUnlockedThisDeviceOnly` diz duas coisas: o item só é legível com o aparelho desbloqueado, e não sai em backup para outro dispositivo. No Android, o par disso é o Keystore com chave respaldada em hardware e com exigência de autenticação do usuário, guardando o valor em `EncryptedSharedPreferences`. Nos dois sistemas a chave vive em hardware isolado, Secure Enclave no iOS e módulo equivalente no Android, e não sai de lá.

Para o refresh token, some a isso a exigência de biometria antes do uso em operação sensível, e a rotação com detecção de reuso descrita abaixo.

<a id="client-comparison"></a>

## O mesmo token, três clientes

| Decisão | Navegador (SPA ou web) | App mobile nativo | Serviço para serviço |
|---|---|---|---|
| Fluxo | Authorization code + PKCE | Authorization code + PKCE no browser do sistema | Client credentials |
| Onde a credencial fica | Cookie `HttpOnly` do BFF, ou access token em memória | Keychain ou Keystore, respaldado em hardware | Secret manager, ou identidade federada sem segredo |
| Client secret | Só existe se houver backend, e fica nele | Não existe | Existe, fora do código |
| Tela de login | Página do provedor, redirect de topo | Browser do sistema, nunca WebView embutida | Não se aplica |
| Prender o token ao portador | DPoP | DPoP | mTLS quando já existe **PKI** (Public Key Infrastructure · infraestrutura de chaves públicas) |
| Risco principal | XSS lendo o que a página alcança | Extração do armazenamento local e do binário | Segredo de longa duração vazado |

<a id="lifetime-rotation"></a>

## Prazo, rotação e revogação

Access token curto é o que limita o dano de um vazamento, porque o token para de valer sozinho. Refresh token longo é o que evita pedir senha toda hora, e é por isso que ele precisa de proteção maior.

Rotação com detecção de reuso é o mecanismo que transforma um roubo silencioso em incidente detectado. Cada uso do refresh token emite um novo e invalida o anterior. Se o valor antigo reaparecer, existem duas cópias em circulação, o que só acontece quando alguém copiou uma delas.

<details>
<summary>✅ Bom: rotação com família de tokens e revogação em bloco no reuso</summary>

```js
async function rotateRefreshToken(presentedToken) {
  const stored = await refreshTokenRepository.findByValue(presentedToken);
  if (!stored) {
    const unknown = Result.failure('unknown refresh token');
    return unknown;
  }

  if (stored.usedAt) {
    await sessionRepository.revokeFamily(stored.familyId);

    const reused = Result.failure('refresh token reuse detected');
    return reused;
  }

  const issued = await issueTokenPair(stored.familyId);
  await refreshTokenRepository.markUsed(stored.id);

  const rotated = Result.ok(issued);
  return rotated;
}
```

</details>

A família liga todos os tokens descendentes do mesmo login. Ao detectar reuso, revogar a família inteira encerra tanto a sessão do atacante quanto a do usuário legítimo, porque não há como saber qual das duas cópias é a original. O usuário refaz o login, e o atacante perde o acesso.

Revogação de access token autocontido exige um passo extra, porque a assinatura continua válida até `exp`. Duas saídas: manter o prazo curto o suficiente para a janela ser aceitável, ou consultar uma lista de `jti` revogados nas rotas sensíveis, o que devolve um I/O por requisição naquele subconjunto.

<a id="sender-constrained"></a>

## Prender o token a quem o obteve

Bearer token autoriza quem o apresenta. Isso significa que um token copiado do log, do proxy ou da memória funciona nas mãos de qualquer um. Dois padrões removem essa propriedade:

| Mecanismo | Como prende | Quando escolher |
|---|---|---|
| **DPoP** ([RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449)) | O cliente gera um par de chaves e assina um JWT por requisição, provando posse da chave ligada ao token | SPA e app mobile, que não apresentam certificado de cliente |
| **mTLS** ([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705)) | O token é preso ao certificado do cliente apresentado no handshake, registrado na claim `cnf` | Serviço para serviço onde já existe PKI |

DPoP opera na camada de aplicação e não depende de infraestrutura de certificado, o que o torna viável para cliente de vida curta. mTLS dá garantia de identidade mais forte, com o custo de emitir e rotacionar certificado. A **FAPI** 2.0 (Financial-grade API · perfil de API para o setor financeiro), usada em open banking, exige token preso ao portador e aceita os dois.

<a id="passkeys"></a>

## Passkeys e WebAuthn

Uma passkey é um par de chaves criado pelo autenticador do dispositivo e preso à origem do site. A chave privada não sai do dispositivo, e o servidor guarda só a pública. O login é um desafio assinado, então não existe segredo compartilhado para vazar em um banco de dados, e não existe o que digitar em uma página de phishing: a assinatura só é produzida para o domínio que registrou a chave.

Três detalhes decidem se a implementação funciona na prática:

- **Credencial descobrível**, também chamada de resident key, é a que fica listada no autenticador e permite ao usuário entrar sem digitar identificador. Ela é pré-requisito do autofill de passkey.
- **Conditional UI**, o autofill, mostra a passkey no campo de login como sugestão. Ela só aparece quando existe credencial descobrível registrada. Provedores que entregam esse comportamento ligado por padrão relatam adoção bem maior que os que exigem habilitar.
- **Attestation**, a verificação de qual modelo de autenticador criou a chave, faz sentido em ambiente corporativo que só aceita chave física homologada. Para produto voltado ao consumidor, o valor padrão em 2026 é `none`: aceite o autenticador que o usuário preferir.

Times que embarcam passkey com um fluxo de cadastro bem resolvido relatam entre 50% e 70% de adoção voluntária em seis meses. O que trava a adoção é o usuário não encontrar a passkey onde esperava, e não a criptografia.

Passkey substitui a senha e não substitui a recuperação de conta. O caminho alternativo continua existindo, e ele passa a ser o elo mais fraco: um fluxo de recuperação por código de e-mail devolve ao sistema a fragilidade que a passkey tirou.

<a id="frameworks"></a>

## Frameworks que resolvem o fluxo

Implementar OAuth, OIDC, rotação de refresh, **MFA** (Multi-Factor Authentication · autenticação com mais de um fator) e gestão de permissão à mão custa meses e produz superfície de ataque própria. Quatro opções gratuitas cobrem isso, todas com login Google, e a escolha é por camada. Os dados abaixo são de 25 de julho de 2026:

| Opção | Versão | Licença | Stars | O que entrega |
|---|---|---|---|---|
| **Keycloak** | 26.7.0 | Apache-2.0 | 35.830 | Servidor de identidade completo. OIDC e SAML, federação com LDAP, provedores sociais, **RBAC** (Role-Based Access Control · controle de acesso por papel), console de administração. O padrão da área, com operação pesada |
| **Better Auth** | 1.6.25 | MIT | 29.319 | Biblioteca dentro da sua aplicação, em TypeScript. Usuários no seu próprio banco, organizações, RBAC, **2FA** (autenticação com dois fatores), passkeys e mais de 80 provedores |
| **Authentik** | 2026.5.6 | MIT, com edição enterprise separada | 22.483 | Servidor de identidade com os fluxos editáveis na interface, mais fácil de operar que o Keycloak |
| **Zitadel** | 4.16.1 | AGPL-3.0 | 14.535 | Servidor de identidade com multi-tenancy e auditoria de origem. Trocou Apache 2.0 por AGPL em 2025, e a licença exige publicar modificação |
| **Supabase Auth** | 2.193.1 | MIT | 2.506 | Serviço gerenciado com plano gratuito, e o mesmo código disponível para rodar por conta própria |

A decisão sai de duas perguntas. Quantas aplicações compartilham o mesmo login, e quem vai operar isso.

| Situação | Escolha |
|---|---|
| Uma aplicação, time sem gente dedicada a identidade | Biblioteca na aplicação: Better Auth |
| Várias aplicações com login único, ou exigência de SAML e LDAP | Servidor de identidade: Keycloak, ou Authentik quando a operação precisa ser mais leve |
| Multi-tenancy com isolamento estrito entre clientes | Zitadel, respeitada a AGPL |
| Sem ninguém para operar servidor de identidade | Gerenciado, com plano gratuito |

Um aviso que vale mais que a tabela: **o Auth.js, antigo NextAuth, foi absorvido pelo Better Auth no início de 2026 e está em modo manutenção, com correção de segurança e sem feature nova.** É o conselho desatualizado que mais circula, e um projeto novo que começar por ele começa em uma dependência parada.

<a id="review-checklist"></a>

## Checklist de revisão

- O fluxo usa authorization code com PKCE, e nenhuma rota devolve token em fragmento de URL?
- A identidade do usuário vem do `id_token`, e não de um `access_token`?
- A verificação do JWT fixa `algorithms`, `issuer` e `audience`, e usa `verify` em vez de `decode`?
- O cookie de sessão tem `Secure`, `HttpOnly`, `SameSite` declarado e prefixo `__Host-`?
- O `SameSite` escolhido combina com o fluxo de login, considerando o redirect de provedor externo?
- O identificador de sessão é renovado no login, e o logout apaga o registro no servidor?
- Nenhuma credencial é guardada em `localStorage` ou `sessionStorage`?
- Toda rota de escrita confere `Origin`, ou exige token anti-CSRF?
- Resposta autenticada sai com `Cache-Control: no-store` e `Vary` declarado?
- O `ETag` deriva do conteúdo, e não de identificador de usuário ou de sessão?
- No app nativo, o login abre no browser do sistema, e nunca em WebView embutida?
- O token no app está no Keychain ou no Keystore, com respaldo em hardware?
- O refresh token rotaciona a cada uso, com detecção de reuso e revogação da família?
- Existe caminho de revogação que funciona antes de o access token expirar?

## Veja também

- [security.md](security.md): princípios transversais, autenticação e autorização, segredo fora do código
- [security-advanced.md](security-advanced.md): OWASP Top 10:2025, hash de senha, cabeçalhos de segurança, cadeia de suprimentos
- [api-design.md](api-design.md): contrato de Request e Response, envelope, autenticação no limite da API
- [performance.md](performance.md): cache como ferramenta de desempenho, e o custo de cada estratégia
- [../standards/observability.md](../standards/observability.md): o que nunca logar, e o identificador de correlação
- [../mobile/app-lifecycle.md](../mobile/app-lifecycle.md): ciclo de vida do app, e onde o token é lido na retomada
- [../architecture/frontend-flow.md](../architecture/frontend-flow.md): fluxo do frontend até a chamada autenticada
