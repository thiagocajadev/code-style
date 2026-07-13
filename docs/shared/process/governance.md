# Governança: manter o projeto compreensível ao longo do tempo

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Governança é o conjunto de decisões sobre como o projeto é entendido e percorrido, o que vai além de como o código é escrito. A meta é uma só: qualquer pessoa que chega, do não técnico ao especialista, consegue achar o que precisa, entender o que encontrou e contribuir com contexto.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SDLC** (Software Development Life Cycle · Ciclo de Vida de Desenvolvimento de Software) | Conjunto de fases do desenvolvimento: design, implementação, testes, entrega, operação e manutenção |
| **ADR** (Architecture Decision Record · Registro de Decisão de Arquitetura) | Documento que registra o porquê de uma decisão técnica, as alternativas consideradas e as consequências |
| **Onboarding** (integração) | Processo de integração de um novo membro ao projeto, transferindo conhecimento estrutural |
| **Landing** (primeiro contato) | Ponto de entrada do projeto; o que um dev vê primeiro ao abrir o repositório |

## No que eu acredito

**Código serve o time.** A melhor solução é aquela que o próximo dev consegue ler, manter e evoluir com confiança. Uma solução elegante que ninguém entende tem valor limitado, porque toda mudança nela passa a depender de quem a escreveu.

**Governança cobre o ciclo completo.** Cada decisão técnica produz efeitos depois do commit: na manutenção, no onboarding, na capacidade de o time crescer. Pensar em governança é antecipar esses efeitos enquanto a mudança ainda é simples de fazer.

**Complexidade organizada em camadas.** Todo sistema tem uma complexidade própria, que não some. O trabalho é apresentá-la em camadas: o não técnico precisa entender o que o sistema faz, e o especialista precisa entender por que cada decisão foi tomada.

**Consistência ajuda a aprender.** Padrões previsíveis exigem menos esforço de leitura. Um dev que aprende como um módulo funciona já sabe se achar nos outros, porque a forma se repete.

**Foco no processo.** Quando algo falha, a investigação vai para o processo que deixou a falha passar. Culpar quem executou deixa o processo intacto, e a falha volta com outra pessoa no lugar.

## Como um staff engineer pensa

O **SDLC** (Software Development Life Cycle · Ciclo de Vida de Desenvolvimento de Software) começa antes do primeiro commit e termina depois do último deploy. Design, implementação, testes, entrega, operação e manutenção: cada uma dessas fases sofre o efeito das decisões tomadas hoje.

O staff engineer raciocina sobre o sistema inteiro. A pergunta que guia o trabalho deixa de ser "como implementar isso?" e passa a ser "como isso afeta o time que vai manter, o dev que chega mês que vem e o produto que vai crescer?".

Na prática, são perguntas que antecedem cada decisão:

- Quem vai manter esse código em seis meses?
- Um dev novo consegue entender o que esse módulo faz sem pedir ajuda?
- A decisão de hoje cria ou reduz complexidade futura?
- O padrão estabelecido aqui se aplica ao resto do sistema?

Responder a essas quatro perguntas dentro de uma tarefa comum já é fazer governança.

## O primeiro contato e a integração de quem chega

O **landing** é o primeiro contato com o projeto, e ele define a impressão inicial. Quem abre o repositório encontra um caminho claro para o que precisa, ou desiste e vai perguntar para alguém.

Um bom landing é hierárquico, do geral para o específico, do conceito para a implementação.

```
README                → o que é, como rodar, onde encontrar o quê
docs/shared/          → princípios agnósticos de linguagem e plataforma
docs/<linguagem>/     → convenções específicas da stack
quick-reference.md    → consulta rápida para devs já integrados
```

O README é a porta de entrada. Alguém que nunca viu o projeto precisa conseguir três coisas em menos de 5 minutos: entender o que o projeto faz, rodar localmente e saber onde procurar o resto. Se qualquer uma delas exigir perguntar para um colega, o README está incompleto.

O **onboarding** eficiente transfere conhecimento estrutural. Um dev que entende como um módulo está organizado entende também os outros, porque todos seguem o mesmo padrão. É a consistência do projeto que permite ensinar uma vez e valer para o repositório inteiro.

## Complexidade em camadas

A complexidade do sistema existe e não vai sumir. A governança decide como apresentá-la, na medida que cada leitor precisa.

A documentação em camadas serve esse propósito:

| Audiência      | O que precisa                                   | Onde encontra                     |
| -------------- | ----------------------------------------------- | --------------------------------- |
| Não técnico    | Entender o que o sistema faz e como se organiza | README, docs conceituais          |
| Dev iniciando  | Rodar, contribuir, entender convenções          | README, quick-reference, exemplos |
| Dev experiente | Detalhes de padrões e decisões de arquitetura   | docs/shared, ADRs                 |
| Especialista   | Raciocínio que sustenta cada escolha técnica    | ADRs, comentários de decisão      |

A governança está funcionando quando cada uma dessas audiências abre o projeto e encontra o seu nível.

## O nome é a governança de menor esforço

Um nome expressivo comunica a intenção sem exigir documentação em volta. Ele leva alguns segundos de reflexão na hora de escrever e poupa leitura toda vez que alguém passa por ali.

Um nome ruim dá trabalho de novo a cada leitura. Cada dev que encontra `data`, `helper` ou `utils` precisa abrir o arquivo e rastrear de onde a variável veio para saber o que ela guarda. Esse rastreio se repete com cada pessoa.

Um vocabulário consistente ajuda ainda mais. Quando a base inteira usa `fetch` para leitura, `save` para escrita e `calculate` para derivação, o leitor já sabe o que esperar de uma função que nunca viu.

## Consistência ajuda a aprender

Padrões previsíveis deixam o leitor concentrado no domínio, em vez de decifrar o estilo de cada arquivo.

O efeito prático aparece no onboarding: quem entende a estrutura de um módulo entende todos os outros, e o aprendizado de uma área do sistema se transfere para as demais. O time cresce sem que o treinamento cresça junto.

A inconsistência produz o efeito oposto. Cada módulo com o seu jeito próprio obriga a um reaprendizado por área, e o conhecimento de quem já está no time deixa de transferir para quem chega.

## ADR: registrar por que a decisão foi tomada

Os **ADRs** (Architecture Decision Records · Registros de Decisão de Arquitetura) guardam o raciocínio que levou à escolha. O código mostra o que foi feito; o ADR guarda o motivo, as alternativas que estavam na mesa e o que se abriu mão ao escolher.

Decisão sem registro vira conhecimento que só existe na cabeça de quem estava presente. Quando essas pessoas saem, o motivo sai junto. Quem chega depois questiona a decisão, refaz a mesma análise e às vezes reverte uma escolha que tinha um motivo legítimo e invisível.

Três elementos tornam um ADR útil:

| Elemento          | Conteúdo                                                     |
| ----------------- | ------------------------------------------------------------ |
| **Contexto**      | O problema que existia e as restrições do momento            |
| **Decisão**       | O que foi escolhido e por quê                                |
| **Consequências** | O que fica melhor, o que fica pior, o que precisa de atenção |

## Normas de referência

Existe um conjunto de normas públicas que já resolveu problemas comuns de vocabulário, segurança, versionamento e troca de dados entre sistemas. Adotar essas normas encurta discussão de preferência pessoal. Uma auditoria externa também reconhece a norma sem precisar aprender a convenção da casa.

O agrupamento por domínio ajuda a localizar a norma certa no contexto certo.

**Linguagem normativa e datas**

| Norma | O que padroniza |
|---|---|
| **RFC 2119** (Request for Comments · Pedido de Comentários) | Vocabulário de obrigatoriedade: MUST, SHOULD, MAY. Usado em specs e ADRs para deixar o grau de exigência explícito |
| **ISO 8601** (International Organization for Standardization · Organização Internacional de Normalização) | Representação de datas e horários: `2026-04-23T14:30:00Z`. Resolve ambiguidade entre formatos regionais |

**Protocolos HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) **e autenticação**

| Norma | O que padroniza |
|---|---|
| RFC 7231 e RFC 9110 | Semântica do HTTP: métodos, status codes, cabeçalhos |
| RFC 6749 | OAuth 2.0 (Open Authorization · Autorização Aberta): fluxo de autorização delegada |
| RFC 7519 | JWT (JSON Web Token · token assinado que carrega a identidade do usuário): formato de token de claims assinado |

**Qualidade e segurança**

| Norma | O que padroniza |
|---|---|
| ISO/IEC 25010 | Atributos de qualidade de software: manutenibilidade, confiabilidade, performance, segurança, usabilidade |
| ISO/IEC 27001 | Controles de segurança da informação no nível de organização |
| ISO/IEC 27035 | Resposta a incidentes: detecção, contenção, erradicação, pós-mortem |
| **OWASP ASVS** (Application Security Verification Standard · Padrão de Verificação de Segurança de Aplicação) | Checklist de requisitos de segurança de aplicação com níveis de maturidade, mantido pela OWASP |
| OWASP Top 10 | Lista das dez classes de vulnerabilidade mais comuns em aplicações web |

**Versionamento e entrega**

| Norma | O que padroniza |
|---|---|
| **SemVer 2.0.0** (Semantic Versioning · Versionamento Semântico) | Formato `MAJOR.MINOR.PATCH` com regras de incremento conforme o tipo de mudança |
| **Conventional Commits** (Commits Convencionais) | Prefixos padronizados em mensagens de commit: `feat:`, `fix:`, `docs:`, `chore:` |
| Keep a Changelog | Estrutura do `CHANGELOG.md`: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security` |

A norma serve de ponto de referência. Um projeto pode divergir dela quando existe motivo concreto, e o desvio vale tanto quanto a conformidade desde que registrado em um **ADR**. O problema aparece quando a divergência acontece por inércia, sem decisão documentada: quem chega depois fica sem saber se aquilo foi uma escolha deliberada ou um acidente que ninguém corrigiu.

## O code review é onde a governança encontra o código

Uma revisão que procura apenas bugs deixa passar a pergunta principal: este código se encaixa no sistema que já existe?

Perguntas que orientam uma revisão com pensamento de governança:

- O nome dessa função faz sentido para quem nunca viu o contexto?
- Esse padrão é consistente com o restante do módulo?
- A documentação foi atualizada para essa mudança?
- Quem vai manter isso em um ano vai entender sem contexto adicional?

Aprovar sem olhar essas perguntas devolve o PR ao autor em minutos, e o problema volta para o time meses depois, quando alguém precisa mexer naquele código.

## Processo auditável

Um processo auditável permite conferir a qualidade em qualquer ponto do ciclo sem depender da memória de quem estava presente.

Cada etapa tem entrada, saída e um critério de verificação. Com isso em ordem, qualquer pessoa (dev, tech lead, alguém do negócio) olha um ponto isolado ou o ciclo inteiro e enxerga o estado real do projeto.

```
Spec → Implementation → Review → CI → Deploy → Observability
```

| Etapa                                                            | O que ela entrega                                                                              | O que dá para conferir depois                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Spec** (especificação)                                         | O que vai ser feito, com critérios de aceite e a decisão anotada                                | Onde a decisão está escrita e quem a tomou     |
| **Implementation** (implementação)                               | Código e testes                                                                                | O histórico do git e o quanto os testes cobrem |
| **Review** (revisão de código)                                   | Comentários e aprovação no **PR** (Pull Request · pedido de mesclagem no código principal)      | Quem revisou cada mudança e o que foi apontado |
| **CI** (Continuous Integration · Integração Contínua)            | O build, o lint e os testes rodando sozinhos a cada envio de código                             | Se cada commit passou ou falhou                |
| **Deploy** (publicação)                                          | A versão que foi para o ar, com quem publicou, quando e onde                                   | Qual versão está rodando em cada ambiente      |
| **Observability** (acompanhamento do sistema em produção)        | Logs, métricas e alertas                                                                       | O que o sistema está fazendo agora             |

> A ordem e etapas podem variar conforme o tipo de projeto, escopo e divisão de equipes. O
> importante é ter clareza sobre cada etapa e garantir que todas sejam executadas.

No dia de uma falha em produção, cada etapa responde com o seu registro: qual decisão originou o problema, em qual review ele passou, qual teste não cobriu o caso, qual deploy o introduziu. O time reconstrói o que aconteceu a partir desses registros.

## Checklists como ferramenta de qualidade

Com o processo alinhado, um checklist curto por etapa funciona como controle de qualidade. Cada um é leve, específico e aplicado no momento em que a etapa acontece.

O propósito é pegar o desvio antes que ele se espalhe. O item esquecido na Spec vira retrabalho na Review, e o item esquecido na Review vira bug em produção.

| Etapa              | Exemplos de verificação                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Spec**           | Os critérios de aceite estão definidos? A decisão ficou registrada em ADR ou no ticket?             |
| **Implementation** | Os testes cobrem os caminhos críticos? Os nomes seguem as convenções?                               |
| **Review**         | O padrão combina com o resto do módulo? A documentação foi atualizada?                              |
| **CI**             | O build passa? O lint está limpo? A cobertura de testes ficou dentro do mínimo acordado?            |
| **Deploy**         | Dá para identificar a versão? A volta atrás está mapeada? A **feature flag** (chave que liga e desliga a funcionalidade) está ativa se for o caso? |
| **Observability**  | Os logs saem estruturados? O alerta está configurado? As métricas de referência ficaram registradas? |

O checklist cobre o óbvio que se esquece sob pressão. O julgamento sobre o que o código deveria fazer continua com quem revisa.

## Como saber se a governança está funcionando

O sinal aparece quando pessoas de contextos diferentes conseguem trabalhar no projeto com confiança.

O não técnico entende o que o sistema faz e como está organizado. O dev novo contribui em dias, sem precisar pedir contexto. O dev experiente localiza o que precisa sem perguntar. O especialista encontra o raciocínio que levou a cada decisão.

Se qualquer um deles abre o projeto e consegue seguir sozinho, a governança está fazendo o trabalho dela.
