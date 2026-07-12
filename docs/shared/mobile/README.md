# Mobile

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Esta seção reúne os fundamentos que governam aplicações para dispositivos móveis. Os conceitos são agnósticos de linguagem e valem para **Kotlin** (Android), **Swift** (iOS), **Dart/Flutter** (cross-platform) e qualquer outra stack mobile.

O que separa mobile da web é o contexto de execução. O app roda com recursos limitados (CPU, memória, bateria), com conectividade que vai e volta, e sob um sistema operacional que pode pausar ou encerrar o processo dele a qualquer momento para atender outro app. Um código escrito sem contar com isso produz app que consome bateria demais, perde o que o usuário digitou e trava quando o sinal cai.

## Por que estes tópicos ficam separados

Mobile atravessa arquitetura, plataforma e qualidade ao mesmo tempo. O **ciclo de vida** do app impõe restrições que a maioria das stacks web nunca encontra. A **navegação** funciona por pilha de telas, com regras próprias. O modelo de **permissões** pertence ao sistema operacional, e o app apenas pede. E o **offline-first** é uma decisão de design que alcança banco de dados, sincronização e interface de uma vez.

Reunir esses fundamentos em um lugar só evita que o conhecimento fique espalhado entre arquitetura e plataforma, sem indicar onde se aplica.

## Nativo e cross-platform

| Critério | Nativo (Kotlin / Swift) | Cross-platform (Flutter / React Native) |
|---|---|---|
| Performance | Máxima; acesso direto à GPU e APIs do SO | Muito boa; overhead de bridge ou compilação ahead-of-time |
| Acesso a APIs do SO | Total e imediato | Dependente de plugins; APIs novas chegam com atraso |
| Codebase | Um por plataforma | Único compartilhado |
| Time | Duas especialidades distintas | Uma especialidade com nuances por plataforma |
| UX nativa | Automática | Exige atenção; componentes podem não seguir padrões do SO |

A escolha envolve time, produto e roadmap, além da técnica. O nativo compensa quando o app depende de recursos avançados do sistema (câmera, ARKit, Wear OS) ou quando a fidelidade da experiência é o diferencial do produto. O cross-platform compensa quando a velocidade de entrega e a manutenção de uma base única pesam mais que essas vantagens.

## Mapa de tópicos

| Tópico | Descrição |
|---|---|
| [Ciclo de vida do aplicativo](app-lifecycle.md) | Estados do app, cold e warm start, process death e impacto na experiência |
| [Navegação entre telas](navigation.md) | Pilha, barra de abas, modal, deep link e back stack |
| [Gerenciamento de estado](state-management.md) | Estado da tela e estado do domínio, fluxo unidirecional e reatividade |
| [Offline-first](offline-first.md) | Estratégias de cache, sincronização, resolução de conflito e estado da rede |
| [Permissões do dispositivo](permissions.md) | Permissões em tempo de execução, negação definitiva e fluxo de solicitação |
