# Segurança

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

As decisões de segurança acontecem espalhadas pelo design inteiro: onde guardar a senha do banco, quem valida o formulário, quais flags o cookie de sessão carrega, quais origens a API aceita. Cada uma delas é tomada durante o desenvolvimento normal, e revisar tudo depois sai mais caro que acertar na hora. Os princípios desta página valem para qualquer linguagem ou plataforma.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **XSS** (Cross-Site Scripting · injeção de script) | Ataque que injeta scripts maliciosos na página para roubar dados ou sequestrar sessões |
| **CSRF** (Cross-Site Request Forgery · falsificação de requisição entre sites) | Ataque que força o navegador do usuário autenticado a fazer requisições não autorizadas |
| **CORS** (Cross-Origin Resource Sharing · compartilhamento de recursos entre origens) | Regra que o navegador aplica para decidir quais origens podem chamar a API a partir de outra origem |
| **JWT** (JSON Web Token · token assinado que carrega a identidade do usuário) | Token que o servidor assina e o cliente devolve a cada requisição; a assinatura prova que o conteúdo não foi alterado |
| **authentication** (autenticação) | Verificação de identidade: quem é você? |
| **authorization** (autorização) | Verificação de permissão: o que você pode fazer? |

## Segredos fora do código

Os segredos (connection strings, chaves de **API** (Application Programming Interface · Interface de Programação de Aplicações), segredos de assinatura de JWT, senhas) seguem um ciclo de vida diferente do código. O código é versionado, compartilhado entre o time e às vezes publicado. O segredo é trocado periodicamente, vive só na mão de quem opera e muda a cada ambiente.

Um segredo commitado precisa ser rotacionado, mesmo que o commit seja apagado em seguida. O histórico do git guarda o valor, e qualquer pessoa com acesso ao clone consegue recuperá-lo voltando a um commit anterior.

A regra é uma só: segredo nenhum entra no repositório, nem na branch de desenvolvimento.

## Configuração em camadas

A configuração se resolve por precedência. Cada camada sobrescreve a anterior:

```
config base           → valores não sensíveis (commitado)
config de ambiente    → overrides por ambiente (commitado)
secrets de dev local  → fora do repositório (dotnet user-secrets, .env local)
variáveis de ambiente → staging e produção (injetadas pelo host)
secrets manager       → produção, segredos gerenciados externamente
```

Preserve essa ordem. O valor que está commitado sempre perde para a variável que o host injetou no deploy.

## O que nunca pode ir para o frontend

Tudo que o servidor entrega ao navegador fica visível para o usuário. Ele abre o DevTools, lê o bundle JavaScript, inspeciona o tráfego de rede. Ofuscar o código atrasa a leitura em alguns minutos e não muda esse fato.

| Pode expor no frontend | Nunca expor no frontend |
| --- | --- |
| URLs públicas de endpoint | API keys e tokens |
| Feature flags sem condição de segurança | JWT signing secrets |
| Configuração de layout e UX | Connection strings |
| Identificadores de ambiente (staging/prod) | Credenciais de terceiros |

O frontend chega aos dados chamando o backend autenticado. O backend confere a permissão e devolve só o que aquele usuário pode ver.

## O servidor valida como se o frontend não existisse

A validação no frontend serve à experiência: o usuário vê o erro no campo antes de enviar, sem esperar a resposta do servidor. Ela não protege nada, porque qualquer pessoa consegue montar a requisição por fora do navegador com `curl`, com Postman ou com um script **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto), e nenhuma dessas ferramentas executa a validação da **UI** (User Interface · Interface do Usuário).

As duas validações convivem com papéis separados. O frontend valida para dar retorno rápido ao usuário. O servidor valida para garantir que nenhum dado inválido entre no sistema, e ele valida tudo de novo, do zero.

```
Request → frontend (UX: feedback imediato) → servidor (segurança: autoridade) → handler
```

## Quem é você e o que você pode fazer

São dois controles distintos, e cada um responde a uma pergunta diferente.

| Conceito | Pergunta | O que garante |
| --- | --- | --- |
| **authentication** (autenticação) | Quem é você? | Identidade: sessão válida, token assinado |
| **authorization** (autorização) | O que você pode fazer? | Permissão: roles, policies, escopos |

```
Request → autenticação (quem é você?) → autorização (o que pode fazer?) → handler
```

Um usuário com sessão válida continua sem permissão para acessar o recurso de outro. Quando os dois controles viram um só, aparece o ponto cego clássico: a rota protegida apenas por autenticação libera qualquer usuário logado, inclusive o que deveria enxergar somente os próprios dados.

## Autorização centralizada

Escrever a checagem de permissão dentro de cada handler espalha a regra pelo código todo. O endpoint novo entra sem a checagem porque alguém esqueceu, e a mudança de regra obriga a revisar dezenas de arquivos.

A autorização centralizada leva a regra para um lugar só: um **middleware** (função que roda antes do handler), uma policy ou um atributo na definição da rota. O handler executa a operação sem conhecer a regra de acesso. A cobertura passa a vir da estrutura, e deixa de depender de alguém lembrar.

## As três flags do cookie de sessão

O cookie de sessão sem flags de segurança abre caminho para dois ataques: **XSS** (Cross-Site Scripting · injeção de script) e **CSRF** (Cross-Site Request Forgery · falsificação de requisição entre sites). Três flags fecham esses caminhos:

| Flag | O que protege | Como |
| --- | --- | --- |
| `HttpOnly` | XSS | Script não consegue ler o cookie via `document.cookie` |
| `Secure` | Interceptação de rede | Cookie só é enviado em conexões HTTPS |
| `SameSite=Strict` | CSRF | Cookie não é enviado em requisições cross-origin |

Cada flag cobre um caminho diferente, e nenhuma cobre o caminho da outra. Faltando uma, aquele caminho fica aberto.

## CORS: aceitar chamada só das origens conhecidas

O **CORS** é a regra que o navegador aplica antes de deixar uma página de uma origem chamar uma API de outra. O servidor informa quais origens aceita no cabeçalho `Access-Control-Allow-Origin`. Responder `*` aceita todas elas. Liste as origens conhecidas.

<details>
<summary>❌ Ruim: libera qualquer origem</summary>

```
Access-Control-Allow-Origin: *
```

Qualquer página na web chama a API pelo navegador do usuário. E o `*` deixa de funcionar no dia em que
a sessão virar cookie: o navegador recusa `Access-Control-Allow-Credentials: true` junto com `*`.

</details>

<details>
<summary>✅ Bom: reflete só origens conhecidas</summary>

```js
const allowedOrigins = new Set([
  'https://app.exemplo.dev',
  'http://localhost:3000',
]);

function resolveCorsOrigin(requestOrigin) {
  const isAllowed = allowedOrigins.has(requestOrigin);
  if (!isAllowed) return null;

  return requestOrigin;
}
```

</details>

O CORS existe apenas dentro do navegador. Uma chamada de `curl`, do Postman ou de outro backend passa direto por ele. A allowlist, portanto, não atrapalha ferramenta nem integração server-side: ela fecha só o caminho que o navegador de um terceiro usaria.
