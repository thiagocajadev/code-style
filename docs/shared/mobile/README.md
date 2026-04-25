# Mobile

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Mobile é o conjunto de fundamentos que governam aplicações distribuídas para dispositivos móveis. Os
conceitos desta seção são agnósticos de linguagem: aplicam-se a **Kotlin** (Android), **Swift**
(iOS), **Dart/Flutter** (cross-platform) e qualquer outra stack mobile.

A diferença fundamental em relação a aplicações web é o contexto de execução: o app convive com
recursos restritos (CPU, memória, bateria), conectividade intermitente e um sistema operacional que
pode pausar ou encerrar o processo a qualquer momento. Ignorar esse contexto produz apps instáveis,
com consumo excessivo de bateria e UX que frustra o usuário.

## Por que um subdomínio dedicado?

Mobile cruza os limites de arquitetura, plataforma e qualidade ao mesmo tempo. O **ciclo de vida**
do app impõe restrições que a maioria das stacks web nunca enfrenta. A **navegação** funciona de
forma diferente de routing web. O modelo de **permissões** é do sistema operacional, não da
aplicação. E o **offline-first** é uma decisão de design que permeia banco de dados, sync e UX
juntos.

Separar esses fundamentos em um subdomínio evita que o conhecimento fique fragmentado entre
arquitetura e plataforma sem contexto de onde aplicar.

## Nativo vs cross-platform

| Critério | Nativo (Kotlin / Swift) | Cross-platform (Flutter / React Native) |
|---|---|---|
| Performance | Máxima — acesso direto à GPU e APIs do SO | Muito boa — overhead de bridge ou compilação ahead-of-time |
| Acesso a APIs do SO | Total e imediato | Dependente de plugins; APIs novas chegam com atraso |
| Codebase | Um por plataforma | Único compartilhado |
| Time | Duas especialidades distintas | Uma especialidade com nuances por plataforma |
| UX nativa | Automática | Exige atenção — componentes podem não seguir padrões do SO |

A decisão não é técnica — é de time, produto e roadmap. Nativo vale quando o app usa recursos
avançados do SO (câmera, ARKit, Wear OS) ou quando fidelidade de UX é diferencial competitivo.
Cross-platform vale quando velocidade de entrega e manutenção unificada superam as vantagens nativas.

## Mapa de tópicos

| Tópico | Descrição |
|---|---|
| [App Lifecycle](app-lifecycle.md) | Estados do app, ciclo de vida, cold/warm start e impacto em UX |
| [Navigation](navigation.md) | Stack, tab bar, modal, deep link e back stack |
| [State Management](state-management.md) | UI state vs domain state, unidirectional data flow e reatividade |
| [Offline-first](offline-first.md) | Cache strategy, sync, conflict resolution e network-aware UX |
| [Permissions](permissions.md) | Runtime permissions, graceful degradation e fluxo de solicitação |
