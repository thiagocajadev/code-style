# Governance

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Governança é a decisão de como o projeto é entendido e navegado, além de como é construído. Um
projeto bem governado é aquele onde qualquer pessoa, do não técnico ao especialista, consegue
navegar, entender e contribuir com contexto.

## Convicções

**Código serve o time.** A melhor solução é aquela que o próximo dev consegue ler, manter e evoluir
com confiança. Elegância sem legibilidade tem valor limitado.

**Governança sobre o ciclo completo.** Cada decisão técnica tem consequências além do momento
presente: na manutenção, no onboarding, na escalabilidade do time. Pensar em governança é antecipar
essas consequências antes de escrevê-las no código.

**Complexidade resumida.** Todo sistema tem complexidade inerente. O trabalho é organizá-la em
camadas acessíveis: do não técnico que precisa entender o que o sistema faz, ao especialista que
precisa entender por que cada decisão foi tomada.

**Consistência como multiplicador.** Padrões previsíveis reduzem carga cognitiva. Um dev que aprende
como um módulo funciona aprende todos. A consistência escala o time sem escalar o treinamento.

**Processo, não pessoa.** Quando algo falha, o foco vai para o processo que permitiu a falha, não
para quem executou. Culpar pessoas não resolve o problema. Entender o que no processo falhou, e
corrigir, é o que impede a falha de se repetir.

## O Pensamento de Staff Engineer (Engenheiro de Alto Nível)

O **SDLC** (Software Development Life Cycle, Ciclo de Vida de Desenvolvimento de Software) começa antes
do primeiro commit e termina depois do último deploy. Design, implementação, testes, entrega,
operação e manutenção: cada fase tem peso nas decisões que o engenheiro toma hoje.

Staff engineers pensam em sistemas. A pergunta que orienta o trabalho muda de "como implementar
isso?" para "como isso afeta o time que vai manter, o dev que vai fazer onboarding, o produto que
vai crescer?".

Isso se traduz em perguntas constantes antes de qualquer decisão:

- Quem vai manter esse código em seis meses?
- Um dev novo consegue entender o que esse módulo faz sem pedir ajuda?
- A decisão de hoje cria ou reduz complexidade futura?
- O padrão estabelecido aqui se aplica ao resto do sistema?

A resposta a essas perguntas é o que diferencia código que funciona de código que serve o time.

## Landing e Onboarding

Landing é o primeiro contato com o projeto. O que o dev vê primeiro determina se o projeto parece
acessível ou opaco.

Um bom landing é hierárquico: do geral para o específico, do conceito para a implementação.

```
README                → o que é, como rodar, onde encontrar o quê
docs/shared/          → princípios agnósticos de linguagem e plataforma
docs/<linguagem>/     → convenções específicas da stack
quick-reference.md    → consulta rápida para devs já integrados
```

O README é a porta de entrada. Alguém que nunca viu o projeto precisa conseguir, em menos de 5
minutos: entender o que o projeto faz, rodar localmente e saber onde procurar o que precisa. Se
precisar pedir ajuda para qualquer um desses três, o README está incompleto.

Onboarding eficiente transfere conhecimento estrutural, não pontual. Um dev que entende como um
módulo é organizado entende todos os outros, porque o padrão é o mesmo. A consistência do projeto é
o que torna o onboarding escalável.

## Complexidade em Camadas

A complexidade de um sistema existe. Governance é sobre apresentá-la na dose certa, para a audiência
certa, no momento certo.

Documentação em camadas serve esse propósito:

| Audiência      | O que precisa                                   | Onde encontra                     |
| -------------- | ----------------------------------------------- | --------------------------------- |
| Não técnico    | Entender o que o sistema faz e como se organiza | README, docs conceituais          |
| Dev iniciando  | Rodar, contribuir, entender convenções          | README, quick-reference, exemplos |
| Dev experiente | Detalhes de padrões e decisões de arquitetura   | docs/shared, ADRs                 |
| Especialista   | Raciocínio por trás de cada escolha técnica     | ADRs, comentários de decisão      |

Quando qualquer uma dessas audiências abre o projeto e diz "entendi", a governança está funcionando.

## Naming como Governança

Nomes são o mecanismo de governança mais barato e mais eficiente. Um nome expressivo comunica
intenção sem documentação adicional.

O custo de um nome ruim escala com o tempo: cada dev que lê `data`, `helper` ou `utils` precisa
rastrear de onde veio e o que faz. Um nome expressivo paga essa dívida uma vez, na hora de escrever.

Naming consistente cria um vocabulário compartilhado. Quando toda a base de código usa `fetch` para
leitura, `save` para escrita e `calculate` para derivação, o leitor sabe o que esperar de qualquer
função que ainda não viu. O projeto fala uma língua só, e qualquer novo membro aprende o vocabulário
uma vez.

## Consistência como Multiplicador

Consistência reduz carga cognitiva. Quando os padrões são previsíveis, o leitor gasta energia
entendendo o domínio, não decifrando o estilo.

A consequência prática: um dev que entende como um módulo é estruturado entende todos. O onboarding
de uma área do sistema transfere para todas as outras. A consistência escala o time sem escalar o
treinamento.

Inconsistência tem o efeito inverso. Cada módulo exige reaprendizado. O time cresce, mas a
transferência de conhecimento não funciona, porque cada parte do sistema "tem seu jeito".

## Decision Records

**ADRs** (Architecture Decision Records, Registros de Decisão de Arquitetura) documentam o porquê das
decisões, não apenas o quê. Código mostra o que foi feito. O ADR mostra por que foi feito assim e
quais alternativas foram consideradas.

Decisões sem registro se tornam lore: conhecimento que existe apenas na cabeça de quem estava
presente. Quando essas pessoas saem, o conhecimento vai com elas. Quem chega depois questiona a
decisão, refaz a análise e às vezes reverte algo que tinha um motivo legítimo.

Três elementos tornam um ADR útil:

| Elemento          | Conteúdo                                                     |
| ----------------- | ------------------------------------------------------------ |
| **Contexto**      | O problema que existia e as restrições do momento            |
| **Decisão**       | O que foi escolhido e por quê                                |
| **Consequências** | O que fica melhor, o que fica pior, o que precisa de atenção |

## Code Review como Governança

Code review é o ponto onde governança se encontra com execução. Uma revisão que verifica apenas bugs
perde a oportunidade de verificar se o código se encaixa no sistema.

Perguntas que orientam uma revisão com pensamento de governança:

- O nome dessa função faz sentido para quem nunca viu o contexto?
- Esse padrão é consistente com o restante do módulo?
- A documentação foi atualizada para essa mudança?
- Quem vai manter isso em um ano vai entender sem contexto adicional?

O objetivo da revisão é o código que vai durar, não a aprovação rápida. Uma revisão rigorosa em
código que vai viver por anos tem mais valor do que uma revisão superficial que passa rapidamente.

## Processo auditável

Um processo é bom quando se torna auditável. Auditável significa que em qualquer ponto do ciclo é
possível medir qualidade sem depender de memória ou de quem estava presente.

Cada etapa tem entrada, saída e um critério verificável. Quando isso está em ordem, qualquer pessoa
(dev, tech lead, pessoas de negocio) consegue inspecionar um ponto ou o ciclo inteiro e aferir o
estado real do projeto.

```
Spec → Implementação → Review → CI → Deploy → Observação
```

| Etapa         | Saída                                     | O que é auditável                  |
| ------------- | ----------------------------------------- | ---------------------------------- |
| Spec          | ADR, ticket, critérios de aceite          | Decisões registradas e rastreáveis |
| Implementação | Código + testes                           | Histórico git, cobertura           |
| Review        | PR com aprovações e feedback              | Rastreabilidade de cada mudança    |
| CI            | Build + lint + testes automatizados       | Pass/fail por commit               |
| Deploy        | Artefato versionado, quem + quando + onde | Rastreabilidade de entrega         |
| Observação    | Logs, métricas, alertas                   | Estado real em produção            |

> A ordem e etapas podem variar conforme o tipo de projeto, escopo e divisão de equipes. O
> importante é ter clareza sobre cada etapa e garantir que todas sejam executadas.

O sinal de que o processo está auditável: quando uma falha acontece em produção, cada etapa responde
por seu registro. Qual decisão originou o problema, em qual review passou, qual teste não cobriu,
qual deploy o introduziu. O time encontra as respostas sem depender de memória.

## Checklists como ferramenta de qualidade

Quando o processo está alinhado, checklists rápidos de verificação funcionam como ferramenta natural
de controle. Cada etapa tem seu próprio checklist: leve, específico e aplicado no momento certo.

O objetivo é pegar não conformidades antes que se propaguem. Um item não verificado na Spec vira
retrabalho na Review. Um item não verificado na Review vira bug em produção.

| Etapa         | Exemplos de verificação                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Spec          | Critérios de aceite definidos? Decisão registrada em ADR ou ticket?       |
| Implementação | Testes cobrem os caminhos críticos? Naming segue as convenções?           |
| Review        | Padrão consistente com o restante do módulo? Documentação atualizada?     |
| CI            | Build passa? Lint sem warnings? Cobertura dentro do threshold?            |
| Deploy        | Versão identificável? Rollback mapeado? Feature flag ativa se necessário? |
| Observação    | Logs estruturados? Alerta configurado? Métricas de baseline registradas?  |

Checklists não substituem julgamento. Servem para não esquecer o óbvio sob pressão.

## O sinal de governança funcionando

O sinal mais claro: pessoas de diferentes contextos conseguem interagir com o projeto com confiança.

O não técnico entende o que o sistema faz e como está organizado. O dev novo contribui em dias, sem
precisar pedir contexto. O dev experiente localiza o que precisa sem perguntar. O especialista
encontra o raciocínio por trás das decisões.

Quando qualquer um deles abre o projeto e diz "ficou fácil de entender", a governança cumpriu o
propósito.
