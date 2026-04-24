# Segurança

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Segurança é uma propriedade que atravessa todas as decisões de design, do banco de dados ao frontend. Os princípios abaixo valem para qualquer linguagem ou plataforma.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **XSS** (Cross-Site Scripting, injeção de script) | Ataque que injeta scripts maliciosos na página para roubar dados ou sequestrar sessões |
| **CSRF** (Cross-Site Request Forgery, falsificação de requisição entre sites) | Ataque que força o navegador do usuário autenticado a fazer requisições não autorizadas |
| **JWT** (JSON Web Token, Token Web em JSON) | Token assinado que transmite identidade e claims entre cliente e servidor |
| **Autenticação** (authentication) | Verificação de identidade: quem é você? |
| **Autorização** (authorization) | Verificação de permissão: o que você pode fazer? |

## Segredos fora do código

Segredos (connection strings, **API** (Application Programming Interface, Interface de Programação de Aplicações) keys, JWT secrets, senhas) têm um ciclo de vida diferente do código. Código é versionado, compartilhado e eventualmente público. Segredos são rotativos, privados e específicos por ambiente.

Um secret no repositório é um secret comprometido. Mesmo após a remoção, o histórico do git preserva tudo: qualquer checkout anterior expõe o valor.

A regra é simples: segredos ficam fora do repositório, inclusive em branches de desenvolvimento.

## Configuração em camadas

Configuração resolve por precedência. Cada camada sobrescreve a anterior:

```
config base           → valores não sensíveis (commitado)
config de ambiente    → overrides por ambiente (commitado)
secrets de dev local  → fora do repositório (dotnet user-secrets, .env local)
variáveis de ambiente → staging e produção (injetadas pelo host)
secrets manager       → produção, segredos gerenciados externamente
```

Nunca inverta essa ordem. Um valor commitado nunca deve sobrescrever uma variável injetada pelo host.

## Frontend: escopo mínimo

O navegador é um ambiente hostil. Todo código entregue ao cliente é visível para qualquer pessoa que abre o DevTools, inspeciona o bundle ou intercepta o tráfego de rede. Não há segredo seguro no frontend.

| Pode expor no frontend | Nunca expor no frontend |
| --- | --- |
| URLs públicas de endpoint | API keys e tokens |
| Feature flags sem condição de segurança | JWT signing secrets |
| Configuração de layout e UX | Connection strings |
| Identificadores de ambiente (staging/prod) | Credenciais de terceiros |

O frontend acessa dados por meio de chamadas ao backend autenticado. O backend verifica a autorização e entrega apenas o que o usuário tem permissão de ver.

## Validação: servidor é autoridade

Validação no frontend melhora a experiência: feedback imediato sem roundtrip de rede. Mas validação no frontend não tem valor de segurança.

Qualquer requisição pode ser construída fora do navegador, sem passar pela **UI** (User Interface, Interface do Usuário). Ferramentas como `curl`, Postman ou qualquer script **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) ignoram as regras de validação do frontend.

O servidor valida todas as entradas como se o frontend não existisse. As duas validações coexistem com responsabilidades distintas: frontend valida por **UX** (User Experience, Experiência do Usuário), servidor valida por segurança.

```
Request → frontend (UX: feedback imediato) → servidor (segurança: autoridade) → handler
```

## Autenticação vs autorização

São dois controles distintos com implementações distintas.

| Conceito | Pergunta | O que garante |
| --- | --- | --- |
| **Autenticação** (authentication) | Quem é você? | Identidade: sessão válida, token assinado |
| **Autorização** (authorization) | O que você pode fazer? | Permissão: roles, policies, escopos |

```
Request → autenticação (quem é você?) → autorização (o que pode fazer?) → handler
```

Um usuário pode ser autenticado (sessão válida) mas não autorizado (sem permissão para o recurso). Misturar os dois controles cria pontos cegos: uma rota protegida apenas por autenticação aceita qualquer usuário autenticado, independente do role.

## Autorização centralizada

Verificar permissões dentro de cada handler distribui a regra por todo o código. Quando um novo endpoint é adicionado, a verificação pode ser esquecida. Quando a regra muda, precisa ser atualizada em vários lugares.

Autorização centralizada move a regra para uma camada única: **middleware** (componente de pipeline), policy ou atributo. O handler não conhece a regra de acesso, só executa. A cobertura é garantida estruturalmente, não por disciplina individual.

## Blindagem de cookies

Cookies de sessão sem flags de segurança são vetores para dois ataques clássicos: **XSS** (Cross-Site Scripting, injeção de script) e **CSRF** (Cross-Site Request Forgery, falsificação de requisição entre sites). Três flags fecham essas brechas:

| Flag | O que protege | Como |
| --- | --- | --- |
| `HttpOnly` | XSS | Script não consegue ler o cookie via `document.cookie` |
| `Secure` | Interceptação de rede | Cookie só é enviado em conexões HTTPS |
| `SameSite=Strict` | CSRF | Cookie não é enviado em requisições cross-origin |

As três flags são complementares. Ausência de qualquer uma deixa um vetor de ataque aberto.
