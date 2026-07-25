# Segurança avançada: OWASP Top 10:2025, cadeia de suprimentos e criptografia

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto. Pré-requisito:
> [security.md](security.md), que cobre segredo fora do código, configuração em camadas, validação
> no servidor e a separação entre autenticação e autorização.

A lista do **OWASP** (Open Worldwide Application Security Project · projeto aberto de segurança de aplicações) nomeia as dez classes de falha que mais aparecem em aplicações reais. Ela serve de vocabulário comum entre quem escreve o código, quem revisa o PR e quem audita o sistema: dizer "isso é A01" economiza um parágrafo de explicação. Este documento cobre a edição de 2025, uma categoria por seção, cada uma com exemplo de código, e fecha com o padrão de verificação, os portões do pipeline e a migração criptográfica que já começou. Identidade mora em [auth.md](auth.md): OAuth, **OIDC** (OpenID Connect · autenticação construída sobre OAuth), JWT, cookie, e o token no navegador ou no app.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **OWASP** (Open Worldwide Application Security Project · projeto aberto de segurança de aplicações) | Comunidade que publica a lista das dez classes de falha mais frequentes em aplicações web, revisada a cada três ou quatro anos |
| **CWE** (Common Weakness Enumeration · Enumeração de Fraquezas Comuns) | Catálogo numerado de tipos de defeito, onde `CWE-89` é injeção de SQL; cada categoria do Top 10 agrupa dezenas deles |
| **CVE** (Common Vulnerabilities and Exposures · Vulnerabilidades e Exposições Comuns) | Identificador de uma falha concreta em um produto ou versão específicos, como `CVE-2021-44228` no Log4j. O CWE nomeia a classe do defeito, e o CVE nomeia a ocorrência |
| **IDOR** (Insecure Direct Object Reference · referência direta insegura a objeto) | O identificador do registro vem da requisição e a consulta não confere de quem ele é, então o usuário lê o dado de outro |
| **SSRF** (Server-Side Request Forgery · falsificação de requisição pelo servidor) | O atacante escolhe a URL que o servidor vai chamar, e alcança serviços internos que não estão expostos na internet |
| **CSP** (Content Security Policy · política de conteúdo permitido) | Cabeçalho que diz ao navegador quais scripts, estilos e origens aquela página pode carregar |
| **nonce** (número usado uma única vez) | Valor aleatório gerado a cada resposta, que autoriza uma execução específica e perde a validade em seguida |
| **XSS** (Cross-Site Scripting · injeção de script na página) | Ataque que faz a página executar script do atacante, com acesso a tudo que o JavaScript da página alcança |
| **allowlist** (lista do que é permitido) | Relação fechada do que pode passar, onde o que não está listado é recusado |
| **salt** (valor aleatório somado à senha) | Texto único por usuário concatenado à senha antes do hash, para que senhas iguais produzam hashes diferentes |
| **lockfile** (arquivo de trava de versões) | Arquivo que registra a versão exata de cada dependência instalada, incluindo as transitivas |
| **HSTS** (HTTP Strict Transport Security · transporte seguro obrigatório) | Cabeçalho que instrui o navegador a só falar com o domínio por HTTPS, mesmo se o usuário digitar `http://` |
| **SBOM** (Software Bill of Materials · lista de materiais do software) | Inventário legível por máquina de toda dependência que entrou no artefato, com versão e origem |
| **provenance** (procedência) | Atestado assinado que registra qual repositório, commit e workflow produziram aquele pacote |
| **SLSA** (Supply-chain Levels for Software Artifacts · níveis de segurança para artefatos de software) | Escala de exigências sobre o build, de "tem procedência registrada" até "build isolado e reproduzível" |
| **ASVS** (Application Security Verification Standard · padrão de verificação de segurança de aplicações) | Lista numerada de requisitos verificáveis em três níveis de exigência, usada como roteiro de auditoria |
| **Argon2id** (função de derivação de chave a partir de senha) | Algoritmo lento e caro em memória, feito para transformar senha em hash resistente a força bruta |
| **HMAC** (Hash-based Message Authentication Code · código de autenticação de mensagem por hash) | Assinatura simétrica que prova que a mensagem veio de quem conhece o segredo e não foi alterada |
| **fail closed** (falhar fechando) | Quando o controle de segurança não consegue decidir, a resposta é negar e desfazer o que estava em curso |
| **STRIDE** (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege · seis categorias de ameaça) | Roteiro para levantar ameaças de um desenho antes de implementá-lo |
| **PQC** (Post-Quantum Cryptography · criptografia pós-quântica) | Família de algoritmos que resiste a um computador quântico; a migração começou pelos handshakes de TLS |

<a id="the-ten"></a>

## As dez categorias

O código de cada categoria tem duas partes. O `A` é o prefixo que a OWASP usa para numerar risco de aplicação (*application*), e o número é a posição no ranking: `A01` é a classe de falha mais frequente, `A10` é a décima. Quando o texto precisa deixar clara a edição, o ano entra junto, no formato `A01:2025`. A letra nunca ganhou expansão oficial em documento da OWASP, ela vem da numeração adotada nas primeiras edições e ficou.

Essa posição não mede gravidade. Uma falha de `A09` pode custar mais caro que uma de `A01` no seu sistema. O que o ranking diz é com que frequência aquela classe apareceu no levantamento.

| Código | Categoria | O que é |
|---|---|---|
| [A01](#a01-broken-access-control) | Broken Access Control (controle de acesso quebrado) | O usuário alcança dado ou ação de outro, porque a rota confere se existe sessão e não confere de quem é o registro. Carrega o SSRF (`CWE-918`) e o CSRF (`CWE-352`) como fraquezas mapeadas |
| [A02](#a02-security-misconfiguration) | Security Misconfiguration (configuração insegura) | Valor de fábrica que ninguém trocou: credencial padrão, recurso desnecessário ligado, cabeçalho de segurança ausente, bucket público |
| [A03](#a03-supply-chain) | Software Supply Chain Failures (falhas na cadeia de suprimentos) | Alguém adulterou o caminho entre o código-fonte e o artefato que subiu em produção |
| [A04](#a04-cryptographic-failures) | Cryptographic Failures (falhas de criptografia) | Algoritmo fraco, hash rápido guardando senha, chave exposta, dado sensível trafegando ou parado sem proteção |
| [A05](#a05-injection) | Injection (injeção) | Texto de origem externa chega a um interpretador e parte dele é lida como comando. XSS mora aqui dentro |
| [A06](#a06-insecure-design) | Insecure Design (desenho inseguro) | O desenho não previu o abuso, e implementação sem nenhum bug não corrige isso |
| [A07](#a07-authentication-failures) | Authentication Failures (falhas de autenticação) | Credencial que já vazou, senha fraca aceita, sessão que não termina |
| [A08](#a08-integrity-failures) | Software or Data Integrity Failures (falhas de integridade) | Código ou dado vindo de fora é tratado como confiável sem verificação de origem |
| [A09](#a09-logging-failures) | Security Logging & Alerting Failures (falhas de registro e alerta) | O evento de segurança não é registrado, ou é registrado e não dispara alerta para ninguém |
| [A10](#a10-exceptional-conditions) | Mishandling of Exceptional Conditions (tratamento errado de condição excepcional) | O erro é tratado de um jeito que libera acesso, com `CWE-636` (falhar abrindo) no centro |

A lista sai de dado medido: 589 CWEs mapeadas sobre 2,8 milhões de aplicações, com teto de 40 CWEs por categoria. Oito categorias vêm desse levantamento e duas vêm de pesquisa com profissionais, que é como o OWASP inclui risco que ainda não aparece em volume.

<a id="a01-broken-access-control"></a>

## A01: quem pode ver o quê

Autorização quebrada é a falha mais comum e a mais barata de explorar: o atacante não precisa de ferramenta, ele troca um número na URL. A causa quase sempre é a mesma: a rota confere se existe sessão válida e não confere se aquele registro pertence a quem pediu.

<details>
<summary>❌ Ruim: a consulta confia no identificador que veio na URL</summary>

```js
async function findInvoice(request, response) {
  const invoice = await database.invoice.findUnique({
    where: { id: request.params.invoiceId },
  });

  return response.json(invoice);
}
```

Qualquer usuário autenticado troca o `invoiceId` no endereço e lê a fatura de outra empresa.
A rota tem autenticação e não tem autorização.

</details>

<details>
<summary>✅ Bom: a posse do registro entra na consulta, e a ausência responde igual à recusa</summary>

```js
async function findInvoice({ invoiceId, tenantId }) {
  const invoice = await database.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    const notFound = Result.notFound('invoice');
    return notFound;
  }

  const found = Result.ok(invoice);
  return found;
}
```

</details>

Duas decisões nesse exemplo valem para qualquer stack. A primeira é que o dono entra na cláusula de filtro, antes da leitura: o registro que não é do requisitante nem chega à memória do processo. A segunda é que fatura inexistente e fatura de terceiro devolvem a mesma resposta, porque um 404 para uma e um 403 para outra informam ao atacante quais identificadores existem.

O OWASP recomenda negar por padrão, centralizar o controle em código do servidor, aplicar a posse do registro no próprio modelo de dados, registrar e alertar cada falha de autorização, e cobrir a regra com teste de integração. A centralização está em [security.md](security.md#centralized-authorization).

<a id="ssrf"></a>

### SSRF: quando o atacante escolhe o endereço que o servidor vai buscar

O SSRF é uma das fraquezas mapeadas em A01, porque o efeito é o mesmo: acesso a recurso que a política não autorizava. O servidor ocupa uma posição de rede privilegiada, então uma URL escolhida pelo usuário alcança o serviço de metadados da nuvem, o banco na rede interna e o painel administrativo sem porta pública.

<details>
<summary>❌ Ruim: o endereço vem do usuário e o servidor busca sem perguntar</summary>

```js
async function fetchAvatar(imageUrl) {
  const response = await fetch(imageUrl);
  const image = await response.arrayBuffer();

  return image;
}
```

`http://169.254.169.254/latest/meta-data/iam/security-credentials/` devolve credencial temporária
da instância na AWS. `http://localhost:9200` devolve o índice inteiro do Elasticsearch interno.

</details>

<details>
<summary>✅ Bom: allowlist de host, HTTPS obrigatório e redirecionamento recusado</summary>

```js
const ALLOWED_IMAGE_HOSTS = new Set(['cdn.exemplo.dev', 'avatars.exemplo.dev']);

async function fetchAvatar(imageUrl) {
  const isAllowed = isAllowedImageHost(imageUrl);
  if (!isAllowed) {
    const rejected = Result.failure('image host not allowed');
    return rejected;
  }

  const response = await fetch(imageUrl, { redirect: 'error' });
  const image = await response.arrayBuffer();

  const loaded = Result.ok(image);
  return loaded;
}

function isAllowedImageHost(imageUrl) {
  const parsed = URL.parse(imageUrl);
  if (!parsed) {
    return false;
  }

  const isHttps = parsed.protocol === 'https:';
  const isKnownHost = ALLOWED_IMAGE_HOSTS.has(parsed.hostname);

  const isAllowed = isHttps && isKnownHost;
  return isAllowed;
}
```

</details>

`redirect: 'error'` fecha o desvio que passa por cima da allowlist: o host aprovado responde `302` para `http://169.254.169.254`, e um cliente que segue redirecionamento por padrão obedece. Validar o endereço na entrada e depois seguir para onde a resposta mandar valida uma coisa e busca outra.

Bloquear por lista de endereços proibidos não funciona no lugar da allowlist. `127.0.0.1` também é `127.1`, `0x7f.1`, `[::1]` e qualquer domínio público que resolva para o loopback.

<a id="a02-security-misconfiguration"></a>

## A02: o default que ninguém trocou

As causas que o OWASP lista nesta categoria são operacionais, e nenhuma delas exige código novo para ser corrigida: **hardening** (endurecimento da configuração) desligado, recurso que ninguém usa continuando ativo, credencial de fábrica intacta, mensagem de erro contando demais, bucket de nuvem com permissão pública por padrão e cabeçalho de segurança ausente.

Os cabeçalhos abaixo vêm do Cheat Sheet do OWASP e são os que uma aplicação web deve enviar:

| Cabeçalho | Valor recomendado | O que resolve |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Impede o primeiro acesso em HTTP e o rebaixamento da conexão |
| `X-Content-Type-Options` | `nosniff` | O navegador para de adivinhar o tipo do arquivo e executar como script o que foi servido como texto |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Impede que o caminho completo com identificadores vaze no `Referer` para terceiros |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | Desliga recurso de dispositivo que a aplicação não usa |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola a janela de quem abriu a página |
| `Cache-Control` | `no-store` em resposta autenticada | Mantém dado de sessão fora de cache de navegador e de proxy |
| `X-Frame-Options` | `DENY` | Clickjacking. A diretiva `frame-ancestors` do CSP substitui esse cabeçalho nos navegadores atuais |

Três cabeçalhos que ainda aparecem em tutorial devem sair: `Expect-CT` está obsoleto, `Public-Key-Pins` foi removido do Chromium em 2018, e `X-XSS-Protection` deve ser desligado com `0` ou omitido, porque a implementação antiga abria caminho para vazamento. Também vale remover `Server`, `X-Powered-By` e `X-AspNet-Version`, que entregam a versão exata do que roda ali.

<a id="csp"></a>

### CSP com nonce por resposta

Uma política que lista domínios confiáveis envelhece mal: basta um deles hospedar um endpoint que reflete conteúdo, e a lista deixa de significar algo. A política recomendada hoje prende a execução a um valor aleatório por resposta.

<details>
<summary>❌ Ruim: a política permite script embutido e qualquer origem</summary>

```
Content-Security-Policy: script-src 'self' 'unsafe-inline' *
```

`unsafe-inline` desliga a proteção que o cabeçalho existe para dar: o script que o atacante
injetou na página roda com a mesma permissão do script legítimo.

</details>

<details>
<summary>✅ Bom: nonce por resposta, com o resto negado</summary>

```js
function buildContentPolicy(nonce) {
  const directives = [
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ];

  const policy = directives.join('; ');
  return policy;
}

function createNonce() {
  const nonce = crypto.randomBytes(16).toString('base64');
  return nonce;
}
```

</details>

O `nonce` é gerado a cada resposta e copiado para o atributo `nonce` das tags `<script>` que o template renderiza. `strict-dynamic` estende a confiança aos scripts que um script já autorizado criar, o que evita anotar cada elemento. `object-src 'none'` e `base-uri 'none'` fecham dois desvios clássicos, plugin legado e reescrita da URL base.

Um detalhe de implementação que o Cheat Sheet marca em negrito: nunca escreva um middleware que injeta o `nonce` em toda tag `<script>` da resposta. O script que o atacante injetou também recebe o valor.

<a id="a03-supply-chain"></a>

## A03: o caminho entre o código-fonte e o artefato publicado

A pergunta desta categoria é se alguém adulterou alguma etapa entre o commit e o artefato que subiu em produção. O escopo passa longe de "sua dependência tem CVE conhecida": cobre o build, o registro de pacotes, a credencial de publicação e as actions do pipeline. Os exemplos que o OWASP cita são o SolarWinds, o roubo de US$ 1,5 bilhão na Bybit em 2025 e o worm Shai-Hulud, que se propagou sozinho pelo npm e publicou versão maliciosa em mais de 500 pacotes.

A onda de maio de 2026 mostrou o limite dos controles: 84 versões adulteradas em 42 pacotes do TanStack, em poucas horas, num alvo que tinha **2FA** (autenticação com dois fatores) em todas as contas de mantenedor, publicação por OIDC em vez de token de longa duração e atestado de procedência assinado em cada release. Os pacotes maliciosos saíram com procedência válida, emitida por uma execução de **CI** (Continuous Integration · integração contínua) legitimamente autorizada.

A leitura prática disso é que procedência responde de onde o pacote veio, e essa resposta não afirma que ele é confiável. Ela vale quando o escopo está preso: qual repositório, qual ref e qual arquivo de workflow podem publicar aquele nome.

| Controle | O que faz | Onde falha sozinho |
|---|---|---|
| `npm ci` com lockfile commitado | Instala a árvore exata que passou no teste | Não protege se a versão pinada já é a maliciosa |
| `--ignore-scripts` na instalação | Impede que `postinstall` execute no seu ambiente | Não cobre código executado em tempo de import |
| Action pinada por SHA de commit | Congela o conteúdo, porque tag é ponteiro móvel | Exige atualização por bot, ou o pin apodrece |
| Publicação por OIDC com escopo preso a repositório, ref e workflow | Remove o token de longa duração e limita quem publica | Não impede build legítimo comprometido |
| Procedência e assinatura | Registra origem e detecta alteração posterior | Atesta um build que pode estar comprometido |
| SBOM com inventário central | Responde em minutos qual serviço usa o pacote afetado | Inventário sem alerta não avisa ninguém |
| Espera antes de adotar versão nova | Deixa o serviço de alerta sinalizar a onda antes de você instalar | Custa dias de atraso em correção urgente |

<details>
<summary>❌ Ruim: a tag se move, o script roda e a instalação resolve versão nova sozinha</summary>

```yaml
steps:
  - uses: actions/checkout@v4
  - run: npm install
```

`@v4` é ponteiro móvel: quem controlar o repositório da action reescreve a tag e o build passa a
executar outro código. E `npm install` reescreve o lockfile, então a árvore testada não é a
publicada.

</details>

<details>
<summary>✅ Bom: conteúdo congelado por SHA, instalação reprodutível e script de pacote desligado</summary>

```yaml
permissions:
  contents: read
  id-token: write

steps:
  # o comentário guarda a versão legível; o pin de verdade é o SHA do commit
  - uses: actions/checkout@<sha-do-commit-da-tag-v5.0.0>
  - run: npm ci --ignore-scripts
  - run: npm audit signatures
```

</details>

`permissions` declarado no topo com `contents: read` é o mesmo princípio de menor privilégio da nuvem: o token do job não precisa escrever no repositório para rodar teste. `id-token: write` existe para a publicação por OIDC, e só entra no job que publica.

Ferramenta de inventário e alerta contínuo fecha o ciclo. O OWASP cita o Dependency-Track para acompanhar dependência direta e transitiva a partir do SBOM. Pipeline e ambientes estão em [ci-cd.md](../process/ci-cd.md).

<a id="a04-cryptographic-failures"></a>

## A04: hash rápido, hash de senha e o que já está quebrado

Dois usos de hash costumam se confundir, e a confusão produz banco de senha vazável. Hash de integridade precisa ser rápido, porque roda sobre arquivo grande a cada verificação. Hash de senha precisa ser lento e caro em memória, porque a única defesa contra quem já tem o banco é o custo por tentativa.

MD5 e SHA-1 falham nos dois papéis, e falham com números concretos:

| Fato medido | Número |
|---|---|
| Senhas com hash MD5 recuperadas em menos de uma hora, com uma única RTX 5090, sobre 231 milhões de senhas reais de vazamento (Kaspersky, 2026) | 60% |
| Dessas, recuperadas em até 60 segundos | 48% |
| Velocidade da mesma placa em MD5 | ~220 GH/s |
| Velocidade da mesma placa em SHA-1 | ~68 GH/s |
| Custo de uma colisão de prefixo escolhido em MD5 | segundos a um dia, em máquina comum |
| Custo de uma colisão de prefixo escolhido em SHA-1 (ataque SHA-mbles) | ~US$ 45 mil em 2020, com projeção abaixo de US$ 10 mil |

Uma placa de vídeo de consumo testando 220 bilhões de candidatos por segundo é o que transforma "hash não é reversível" em irrelevante: o ataque é gerar candidatos em volume até um deles casar. Salt continua obrigatório e não muda essa conta, porque salt impede tabela pré-computada e não reduz a velocidade por tentativa. O texto do OWASP é direto: hash gerado por função simples ou rápida pode ser quebrado por **GPU** (Graphics Processing Unit · placa de vídeo) mesmo com salt.

<details>
<summary>❌ Ruim: senha guardada com hash de integridade</summary>

```js
function hashPassword(password) {
  const hashed = crypto.createHash('md5').update(password).digest('hex');

  return hashed;
}
```

Sem salt, sem custo e com algoritmo quebrado. Trocar `md5` por `sha256` aqui melhora pouco: a
mesma placa faz bilhões de SHA-256 por segundo.

</details>

<details>
<summary>✅ Bom: Argon2id com os parâmetros mínimos publicados</summary>

```js
import argon2 from 'argon2';

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function hashPassword(password) {
  const hashed = await argon2.hash(password, PASSWORD_HASH_OPTIONS);
  return hashed;
}

async function isMatchingPassword({ password, storedHash }) {
  const isMatching = await argon2.verify(storedHash, password);
  return isMatching;
}
```

</details>

`memoryCost: 19456` são os 19 MiB que o OWASP define como piso, com duas iterações e paralelismo 1. A biblioteca gera o salt, embute os parâmetros no hash e compara em tempo constante, então nada disso precisa ser escrito à mão.

| Algoritmo | Parâmetro mínimo | Quando usar |
|---|---|---|
| **Argon2id** | 19 MiB de memória, `t=2`, `p=1` | Primeira escolha |
| **scrypt** | `N=2^17` (128 MiB), `r=8`, `p=1` | Quando não há Argon2 disponível |
| **bcrypt** | custo ≥ 10 | Só em sistema legado. Trunca em 72 bytes, então a senha precisa de limite de tamanho |
| **PBKDF2-HMAC-SHA-512** | 220.000 iterações | Quando a exigência é conformidade FIPS-140 |

Migrar um banco com MD5 não exige resetar a senha de todo mundo. No próximo login bem-sucedido, valide contra o hash antigo e regrave com Argon2id, marcando a linha como migrada. Contas que não voltarem entram em expiração forçada depois do prazo que você escolher.

O resto da categoria trata de transporte e de chave: TLS 1.2 ou superior com cifras de forward secrecy (sigilo futuro, onde a chave de uma sessão não abre as sessões anteriores), nada de FTP ou SMTP sem criptografia, chave crítica em **HSM** (Hardware Security Module · módulo de segurança em hardware), criptografia autenticada como AES-GCM em vez de CBC, gerador aleatório criptográfico em vez de `Math.random()`, e cache desligado em resposta com dado sensível. CBC e MD5 aparecem na lista explícita de construções a abandonar.

<a id="a05-injection"></a>

## A05: interpretador executando o que era dado

Injeção acontece quando texto de origem externa chega a um interpretador e parte dele é lida como comando. A família inteira mora aqui, incluindo XSS, que o OWASP classifica como variante de alta frequência e impacto menor, com mais de 30 mil CVEs mapeadas.

<details>
<summary>❌ Ruim: a consulta é montada por concatenação</summary>

```js
const query = `SELECT * FROM invoices WHERE customer_id = ${customerId}`;
const invoices = await database.query(query);
```

`customerId` valendo `1 OR 1=1` devolve a tabela inteira. Valendo `1; DROP TABLE invoices`, o
banco recebe dois comandos.

</details>

<details>
<summary>✅ Bom: consulta parametrizada, com as colunas declaradas</summary>

```js
async function listInvoicesByCustomer(customerId) {
  const invoices = await database.query(
    'SELECT id, total, status FROM invoices WHERE customer_id = $1',
    [customerId],
  );

  return invoices;
}
```

</details>

O parâmetro nunca é interpretado como sintaxe: o banco recebe a estrutura da consulta e os valores por caminhos separados. Declarar as colunas em vez de `SELECT *` também tira do resultado a coluna sensível que alguém adicionar na tabela depois.

Bancos de documento têm uma variante que passa por quem só aprendeu a defender SQL. O operador viaja dentro do próprio objeto:

<details>
<summary>❌ Ruim: o corpo da requisição entra inteiro no filtro</summary>

```js
const user = await collection.findOne({
  email: request.body.email,
  password: request.body.password,
});
```

Um corpo com `{"email": "alvo@exemplo.dev", "password": {"$ne": null}}` vira "qualquer senha
diferente de nulo", e o login passa.

</details>

<details>
<summary>✅ Bom: o esquema valida na entrada e o filtro recebe primitivos</summary>

```js
const credentialSchema = validate.object({
  email: validate.string().email(),
  password: validate.string().min(12),
});

async function findUserByCredential(payload) {
  const credential = credentialSchema.parse(payload);

  const user = await collection.findOne({ email: credential.email });
  return user;
}
```

</details>

A senha não entra na consulta: o registro é buscado pelo e-mail e a senha é conferida depois, contra o hash, com a função de verificação da biblioteca. O `parse` do esquema garante que `email` é string, e um objeto com `$ne` é recusado antes de chegar ao driver.

O OWASP acrescenta validação positiva no servidor, escape com a sintaxe do interpretador de destino quando a consulta parametrizada não existir, e análise estática, dinâmica e interativa no pipeline, que são SAST, DAST e IAST. Convenções de SQL estão em [database.md](database.md).

<a id="a06-insecure-design"></a>

## A06: a falha que implementação perfeita não corrige

A categoria começa por uma distinção. Um desenho seguro ainda pode ter defeito de implementação, e um desenho inseguro continua inseguro mesmo com implementação impecável. Se o fluxo de recuperação de senha usa pergunta secreta, escrever esse fluxo sem nenhum bug entrega um sistema em que a resposta que várias pessoas conhecem substitui a senha.

Os dois exemplos que o OWASP escolheu tratam de regra de negócio. No primeiro, uma rede de cinema dá desconto para grupos de até 15 pessoas e não limita quantos assentos uma reserva pode conter. Um atacante reserva centenas de assentos de uma vez e não paga, e a sala fica bloqueada até o prazo de pagamento vencer. No segundo, um comércio eletrônico sem defesa contra automação entrega o estoque limitado de placa de vídeo a revendedor em segundos.

**STRIDE** é o roteiro para achar isso antes de implementar. Cada letra é uma pergunta feita sobre o desenho:

| Letra | Ameaça | Pergunta sobre o desenho |
|---|---|---|
| **S**poofing (falsificação de identidade) | Alguém se passa por outro | Como o sistema prova quem está do outro lado? |
| **T**ampering (alteração) | Dado ou mensagem é modificado no caminho | O que detecta alteração entre o cliente e o servidor? |
| **R**epudiation (repúdio) | O autor nega o que fez | Qual registro sobrevive para provar a ação? |
| **I**nformation disclosure (vazamento) | Dado chega a quem não devia | Quais campos saem na resposta, e para quem? |
| **D**enial of service (indisponibilidade) | O serviço para de responder | Qual chamada é caro repetir, e o que limita a repetição? |
| **E**levation of privilege (elevação de privilégio) | Usuário comum ganha poder de administrador | Onde a permissão é decidida e quem pode influenciar essa decisão? |

O caso de abuso entra no refinamento ao lado do critério de aceite, e sai de lá como teste automatizado. Vale voltar ao cinema para ver como isso fica escrito:

| O que o time escreve | Frase |
|---|---|
| História de usuário | O cliente reserva assentos com desconto de grupo |
| Caso de abuso | O cliente reserva 400 assentos numa transação e não paga |
| Regra que sai daí | Nenhuma reserva aceita mais de 15 assentos |

A terceira linha é a que vira código de teste. A primeira, sozinha, produz um teste que passa enquanto o sistema continua vulnerável, porque reservar 400 assentos também é reservar assentos com desconto de grupo.

<a id="a07-authentication-failures"></a>

## A07: identidade fraca e sessão que não termina

Os ataques desta categoria não quebram criptografia, eles usam credencial que já vazou. Credential stuffing testa listas de vazamento em massa. Password spray tenta a mesma senha provável em muitas contas, e a rotação obrigatória de senha produz exatamente o padrão que ele espera: `Inverno2025` vira `Inverno2026`.

As recomendações do OWASP para esta categoria: exigir **MFA** (Multi-Factor Authentication · autenticação com mais de um fator), eliminar credencial de fábrica, testar senha nova contra as 10 mil piores e contra base de vazamento conhecido, seguir o NIST 800-63b e abandonar a rotação periódica sem suspeita de comprometimento, limitar tentativa com cuidado para o limite não virar negação de serviço, gerar identificador de sessão no servidor com entropia alta depois do login, e validar `audience`, `issuer` e escopo do token. O tratamento completo de token, sessão, OAuth e passkey está em [auth.md](auth.md).

Um detalhe que atravessa qualquer implementação é a mensagem de erro. Resposta diferente para e-mail inexistente e para senha errada transforma a tela de login em consulta de base de clientes.

<details>
<summary>❌ Ruim: a resposta conta se a conta existe</summary>

```js
if (!user) {
  return response.status(404).json({ error: 'e-mail não cadastrado' });
}

const isMatching = await argon2.verify(user.passwordHash, password);
if (!isMatching) {
  return response.status(401).json({ error: 'senha incorreta' });
}
```

Duas respostas diferentes e dois tempos de resposta diferentes: sem usuário, nenhum hash é
verificado, e a resposta volta bem mais rápido.

</details>

<details>
<summary>✅ Bom: resposta única, e o custo de verificação é pago sempre</summary>

```js
const DUMMY_HASH = process.env.DUMMY_PASSWORD_HASH;

async function authenticate({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const storedHash = user?.passwordHash ?? DUMMY_HASH;
  const isMatching = await argon2.verify(storedHash, password);

  if (!user || !isMatching) {
    const denied = Result.failure('invalid credentials');
    return denied;
  }

  const authenticated = Result.ok(user);
  return authenticated;
}
```

</details>

O hash de descarte existe para igualar o tempo: e-mail que não existe passa pela mesma verificação caro que um e-mail real, então o tempo de resposta para de revelar a diferença.

<a id="a08-integrity-failures"></a>

## A08: aceitar código e dado sem verificar a origem

Esta categoria cobre o que acontece quando o sistema trata como confiável algo que veio de fora sem verificação: plugin de origem duvidosa, atualização de firmware sem assinatura, objeto serializado que o cliente devolveu e o servidor desserializa em classe viva.

O caso mais comum no dia a dia é o webhook. O provedor manda uma requisição para uma URL sua, e a URL é pública. Sem verificação de assinatura, qualquer pessoa que descubra o endereço confirma pagamento que não aconteceu.

<details>
<summary>❌ Ruim: a assinatura é comparada com igualdade comum</summary>

```js
const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature === expected) {
  await confirmPayment(payload);
}
```

`===` em string para de comparar no primeiro byte diferente, e o tempo de resposta conta quantos
bytes iniciais estavam certos. Isso permite descobrir a assinatura byte a byte.

</details>

<details>
<summary>✅ Bom: comparação em tempo constante, com o tamanho conferido antes</summary>

```js
import crypto from 'node:crypto';

function isValidWebhookSignature({ payload, signature, secret }) {
  const expected = computeSignature({ payload, secret });
  const received = Buffer.from(signature, 'hex');

  if (received.length !== expected.length) {
    return false;
  }

  const isValid = crypto.timingSafeEqual(received, expected);
  return isValid;
}

function computeSignature({ payload, secret }) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);

  const signature = hmac.digest();
  return signature;
}
```

</details>

`timingSafeEqual` exige buffers do mesmo tamanho, então a checagem de comprimento vem antes e responde falso sem lançar. O HMAC roda sobre o corpo bruto da requisição, antes de qualquer parser de JSON: reserializar o objeto muda espaçamento e ordem de chave, e a assinatura deixa de fechar.

Nas demais frentes, o OWASP pede assinatura digital para verificar origem de software, consumo de biblioteca restrito a repositório confiável, revisão obrigatória de mudança de código e de configuração, controle de acesso dentro do pipeline, e recusa de dado serializado sem assinatura vindo de cliente.

<a id="a09-logging-failures"></a>

## A09: log que ninguém lê e alerta que ninguém dispara

Guardar log não fecha esta categoria. O que conta é o alerta chegar a alguém que tem um roteiro de resposta na mão. O que chama atenção nos exemplos citados é a duração: um plano de saúde com invasão sem detecção por sete anos, uma companhia aérea com dado de passageiro exposto por uma década, e outra com mais de 400 mil registros de pagamento comprometidos e multa de € 20 milhões por **GDPR** (General Data Protection Regulation · regulamento europeu de proteção de dados).

| Evento | Registrar | Por quê |
|---|---|---|
| Login, com sucesso e com falha | Sempre, com contexto de usuário | É a série que revela credential stuffing, o teste em massa de credenciais vazadas |
| Falha de autorização | Sempre | Usuário legítimo tentando o recurso de outro é sinal, não ruído |
| Falha de validação no servidor | Sempre | Requisição que a UI não conseguiria produzir indica chamada fora do navegador |
| Transação desfeita por rollback (reversão ao estado anterior) | Sempre, com o motivo | Liga A09 a A10 |
| Mudança de permissão e de configuração | Sempre, em trilha append-only | Sem isso não se reconstrói o que aconteceu |

Duas armadilhas específicas. A primeira é `CWE-117`, injeção em log: texto de entrada com quebra de linha inventa uma linha de log inteira e falsifica a trilha, e a defesa é log estruturado com o valor em campo, nunca interpolado na mensagem. A segunda é `CWE-532`, dado sensível dentro do log; senha, token e cartão não entram, e a lista completa do que fica de fora está em [observability.md](../standards/observability.md#never-log).

<details>
<summary>❌ Ruim: a mensagem carrega o token e a entrada crua</summary>

```js
logger.info(`login falhou para ${email} com token ${token}`);
```

O token vira credencial disponível a quem lê log. E `email` com `\n` fabrica uma linha nova, com o
formato que o parser espera.

</details>

<details>
<summary>✅ Bom: campos estruturados, identificador em vez de credencial</summary>

```js
logger.warn('authentication failed', {
  event: 'auth.login.failed',
  userId: user?.id ?? null,
  correlationId,
  remoteAddress,
});
```

</details>

Alerta é a outra metade. O log de falha de login só serve com um limiar ligado a ele: tantas falhas por conta em tantos minutos, tantas contas distintas a partir do mesmo endereço. Sem limiar e sem playbook, a série fica gravada e ninguém olha.

<a id="a10-exceptional-conditions"></a>

## A10: o erro tratado errado

Esta categoria cobre três falhas em sequência: não impedir a condição anormal, não perceber quando ela ocorre, e responder mal depois que ela ocorreu. `CWE-636`, falhar abrindo, é o centro: o controle de segurança não consegue decidir e o sistema segue como se a resposta tivesse sido "pode".

<details>
<summary>❌ Ruim: o controle de permissão libera quando a consulta falha</summary>

```js
async function canAccessReport(userId, reportId) {
  try {
    const permission = await permissionService.find(userId, reportId);

    return permission.isAllowed;
  } catch {
    return true;
  }
}
```

Derrubar o serviço de permissão passa a ser a forma mais fácil de obter acesso. E o `catch` vazio
apaga o registro de que algo falhou.

</details>

<details>
<summary>✅ Bom: falha nega, registra e devolve resposta sem detalhe interno</summary>

```js
async function canAccessReport({ userId, reportId }) {
  try {
    const permission = await permissionService.find(userId, reportId);

    const isAllowed = permission.isAllowed === true;
    return isAllowed;
  } catch (error) {
    logger.error('permission lookup failed', { userId, reportId, error });
    return false;
  }
}
```

</details>

Os outros dois cenários da categoria seguem a mesma regra. Transação de vários passos interrompida no meio precisa de rollback completo, porque recuperação parcial deixa o registro em estado que nenhuma regra previu, e é assim que se duplica transferência. Exceção não capturada em upload deixa handle de arquivo aberto até esgotar o recurso.

E a mensagem de erro que volta ao cliente não carrega stack trace (rastreamento da pilha de chamadas) nem texto do banco: o `SELECT` que apareceu na tela é o mapa que o atacante usa para montar a injeção. O envelope de resposta com identificador de correlação, e o detalhe apenas no log do servidor, está em [api-design.md](api-design.md).

<a id="asvs"></a>

## ASVS 5.0: o checklist verificável

O Top 10 nomeia risco. O **ASVS** transforma risco em requisito que se marca como atendido ou não. A versão 5.0 saiu em maio de 2025 com cerca de 350 requisitos em 17 capítulos, e a reorganização acompanhou o que as aplicações passaram a usar: ganhou capítulo de segurança de frontend, de token autocontido, de OAuth e OIDC, e de WebRTC. O capítulo de arquitetura da versão 4 foi removido e seus requisitos foram distribuídos. Cada requisito tem identificador rastreável no formato `v5.0.0-3.2.1`, que serve para citar em PR e em relatório.

| Nível | Para quê | Como usar |
|---|---|---|
| **L1** | Verificável de fora, sem acesso ao código | Piso para qualquer aplicação exposta na internet |
| **L2** | Aplicação que trata dado sensível ou transação | Alvo padrão da maioria dos produtos |
| **L3** | Sistema crítico, onde falha custa vida ou valor alto | Exige revisão de código e justificativa por requisito |

O nível se escolhe na abertura do projeto, e a auditoria só confere: o requisito de L2 muda desenho, e desenho não se ajusta na véspera da entrega.

<a id="pipeline-gates"></a>

## Os portões de segurança no pipeline

Cada família de ferramenta acha uma classe diferente de problema, e nenhuma cobre a das outras.

| Portão | O que examina | Onde roda | Acha |
|---|---|---|---|
| **Secret scanning** | Diff do commit | Pre-commit e no PR | Chave e token indo para o repositório |
| **SAST** (Static Application Security Testing · análise estática) | Código-fonte | No PR | Injeção, concatenação de consulta, uso de função obsoleta |
| **SCA** (Software Composition Analysis · análise de composição) | Lockfile e SBOM | No PR e agendado | Dependência com CVE, licença incompatível, pacote sem manutenção |
| **IaC scanning** | Terraform, manifesto, Dockerfile | No PR | Bucket público, porta aberta, container como root |
| **DAST** (Dynamic Application Security Testing · análise dinâmica) | Aplicação rodando | Em staging, agendado | Header ausente, cookie sem flag, autorização quebrada em rota real |

Secret scanning e SAST bloqueiam o merge. SCA e IaC bloqueiam por severidade, com prazo declarado para o resto. DAST roda fora do caminho crítico do merge, porque precisa da aplicação de pé e leva tempo.

<a id="post-quantum"></a>

## Criptografia pós-quântica: o que fazer agora

A ameaça relevante hoje é capturar agora para decifrar depois. Tráfego capturado hoje e guardado continua criptografado por chave que um computador quântico futuro resolve, e isso importa para dado com validade longa: prontuário, contrato, segredo industrial. O OWASP fixou um prazo no texto da A04: sistema de alto risco protegido até o fim de 2030.

Três movimentos cabem agora, sem esperar padrão novo:

- **TLS híbrido no que você controla.** As pilhas atuais negociam troca de chave que combina curva elíptica clássica com **ML-KEM**, o mecanismo padronizado pelo NIST. Híbrido significa que quebrar um dos dois lados não basta, o que remove o risco de adotar cedo.
- **Agilidade de algoritmo antes de troca de algoritmo.** O que trava migração é algoritmo escrito à mão no meio do código. Centralize em um módulo que expõe intenção (`encryptAtRest`, `signToken`) e esconde a primitiva, e a troca passa a ser uma mudança em um arquivo.
- **Inventário de onde há criptografia.** Chave em HSM, chave em variável de ambiente, certificado de cliente, token assinado, campo cifrado no banco. Sem essa lista, o plano de migração não tem escopo.

Assinatura tem prazo mais folgado que confidencialidade: assinatura verificada hoje e descartada não sofre com captura para decifrar depois. A prioridade da migração é o dado que fica guardado por anos.

<a id="review-checklist"></a>

## Checklist de revisão

Perguntas para o PR, na ordem em que costumam falhar:

- A consulta filtra pelo dono do registro, ou só valida que existe sessão?
- Fatura inexistente e fatura de terceiro devolvem a mesma resposta?
- Alguma URL de origem externa é buscada pelo servidor sem allowlist e sem `redirect: 'error'`?
- A senha usa Argon2id com os parâmetros mínimos, e nenhum caminho grava MD5 ou SHA-1?
- Toda consulta é parametrizada, e o filtro de documento recebe primitivo validado por esquema?
- O esquema de validação roda no servidor, e não só no formulário?
- A resposta de erro de login é idêntica para conta inexistente e senha errada?
- A assinatura de webhook é comparada com `timingSafeEqual`, sobre o corpo bruto?
- Algum `catch` devolve permissão, sucesso ou valor padrão quando a checagem de segurança falha?
- A mensagem de erro que chega ao cliente está livre de stack trace e de texto do banco?
- Falha de login e falha de autorização geram log estruturado, sem token no corpo da mensagem?
- Existe limiar de alerta ligado a esses logs, com alguém para responder?
- As actions do pipeline estão pinadas por SHA, e a instalação usa lockfile?

## Veja também

- [security.md](security.md): princípios transversais, segredo fora do código, configuração em camadas, validação no servidor
- [auth.md](auth.md): OAuth, OIDC, JWT e JOSE, cookie por dentro, token no navegador e no app mobile
- [api-design.md](api-design.md): envelope de resposta, contrato de erro, autenticação no limite
- [../standards/observability.md](../standards/observability.md): log estruturado, níveis e o que nunca logar
- [../process/ci-cd.md](../process/ci-cd.md): portões do pipeline, ambientes, deploy e release
- [../ai/security.md](../ai/security.md): prompt injection, jailbreak e injeção indireta em aplicação com LLM
- [cloud.md](cloud.md): permissão mínima, secret manager, container
- [../architecture/system-design.md](../architecture/system-design.md): requisitos de segurança no desenho do sistema
