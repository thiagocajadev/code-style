# App Lifecycle (Ciclo de Vida do Aplicativo)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O **lifecycle** (ciclo de vida) do aplicativo é o conjunto de estados pelos quais o app passa desde
o lançamento até ser encerrado pelo sistema operacional. Diferente de uma aplicação web, onde o
servidor controla sua própria disponibilidade, um app mobile pode ser pausado, removido da memória
ou encerrado pelo SO a qualquer momento — sem aviso ao usuário.

Entender o ciclo de vida é o pré-requisito para decidir onde salvar estado, quando cancelar
operações e como garantir que o usuário retome o app exatamente de onde parou.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Foreground** (primeiro plano) | App visível e respondendo a eventos do usuário |
| **Background** (segundo plano) | App fora da tela; pode executar tarefas limitadas |
| **Suspended** (suspenso) | App em memória, mas sem execução — SO pode encerrar sem notificação |
| **Killed** (encerrado) | Processo removido da memória; próxima abertura é cold start |
| **Cold start** (início a frio) | App iniciado do zero — processo criado, recursos carregados |
| **Warm start** (início quente) | App retomado da memória; estado preservado, carregamento rápido |
| **Lifecycle callback** (retorno de ciclo de vida) | Método chamado pelo SO quando o app muda de estado |
| **Process death** (morte de processo) | Encerramento pelo SO por pressão de memória; estado volátil perdido |

## Estados e transições

O ciclo de vida segue uma sequência previsível:

```
Lançado → Created → Started → Resumed (Foreground) → Paused → Stopped (Background) → Destroyed
```

A transição crítica é **Resumed → Paused**: é o momento exato em que o app perde o foco. Toda
operação que consome recursos em excesso (câmera, GPS, animações) deve ser pausada aqui.

```
Foreground: Created → Started → Resumed  ← usuário interage aqui
Background: Paused → Stopped             ← app fora da tela
Killed:     Destroyed                    ← SO liberou memória
```

## Cold start vs warm start

**Cold start** acontece quando o processo não existe na memória. O SO cria o processo, carrega
dependências e inicializa a tela inicial. É o caminho mais lento — qualquer operação bloqueante
nessa fase aumenta o tempo percebido de abertura.

**Warm start** acontece quando o app retorna do background com o processo ainda em memória. O SO
restaura a última tela sem recriar o processo. É rápido, mas o estado volátil (variáveis em memória)
pode ter sido limpo se o SO aplicou **process death**.

```
Cold start: SO cria processo → init → tela inicial
Warm start: SO restaura processo → estado recuperado → tela atual
```

A distinção importa porque cold start penaliza o usuário que não abriu o app recentemente. Apps que
fazem trabalho pesado na inicialização (rede, banco de dados) sem estratégia de cache percebem esse
custo como telas em branco ou spinners desnecessários.

## Process death e estado volátil

O SO pode encerrar o processo de um app em background para liberar memória. O usuário não vê esse
encerramento — quando retorna ao app, espera encontrar o estado anterior.

Estado **volátil** é tudo que vive apenas na memória: variáveis, objetos instanciados, resultados
de network não persistidos. Ao retornar de um process death, esse estado é perdido.

A solução é separar o estado em camadas:

| Camada | Onde vive | Sobrevive ao process death? |
|---|---|---|
| UI state efêmero | Memória | Não |
| UI state salvo | Mecanismo de salvamento do SO | Sim |
| Domain state | Banco de dados local | Sim |
| Dados remotos | Servidor + cache local | Sim (se cacheado) |

A regra é: qualquer estado que o usuário perceberia como perdido deve ser persistido antes de
**Paused** — não depois.

## Impacto em UX

| Situação | Comportamento esperado |
|---|---|
| Usuário recebe ligação durante o app | App pausa; ao retomar, estado intacto |
| Usuário muda para outro app por 1 hora | App pode ter sofrido process death; deve restaurar estado relevante |
| Usuário reabre app após 2 dias | Cold start; estado persistido carregado do banco local |
| SO encerra app por memória | Processo morto; próxima abertura é cold start |

A falha mais comum é assumir que o app sempre esteve vivo. Um formulário parcialmente preenchido que
desaparece ao retornar de uma chamada é uma violação direta do contrato de lifecycle.
