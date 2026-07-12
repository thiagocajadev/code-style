# Ciclo de vida do aplicativo

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O **lifecycle** (ciclo de vida) é a sequência de estados pelos quais o app passa, do lançamento até o sistema operacional encerrá-lo. Um servidor web decide sozinho quando sobe e quando cai. Um app mobile pode ser pausado, tirado da memória ou encerrado pelo sistema a qualquer momento, e o usuário não recebe aviso nenhum disso.

Entender esses estados é o que permite decidir três coisas: onde salvar o estado, quando cancelar as operações em andamento e como devolver o usuário exatamente ao ponto onde ele parou.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Foreground** (primeiro plano) | App visível e respondendo a eventos do usuário |
| **Background** (segundo plano) | App fora da tela; pode executar tarefas limitadas |
| **Suspended** (suspenso) | App em memória, mas sem execução; SO pode encerrar sem notificação |
| **Killed** (encerrado) | Processo removido da memória; próxima abertura é cold start |
| **Cold start** (início a frio) | App iniciado do zero; processo criado, recursos carregados |
| **Warm start** (início quente) | App retomado da memória; estado preservado, carregamento rápido |
| **Lifecycle callback** (retorno de ciclo de vida) | Método chamado pelo SO quando o app muda de estado |
| **Process death** (morte de processo) | Encerramento pelo SO por pressão de memória; estado volátil perdido |

## Estados e transições

O ciclo segue uma sequência previsível:

```
Lançado → Created → Started → Resumed (Foreground) → Paused → Stopped (Background) → Destroyed
```

A transição que mais importa é **Resumed → Paused**, o momento exato em que o app perde o foco. Tudo que consome recurso caro (câmera, GPS, animação em andamento) precisa parar aqui, porque a partir daí o app gasta bateria sem ninguém olhando para a tela.

```
Foreground: Created → Started → Resumed  ← usuário interage aqui
Background: Paused → Stopped             ← app fora da tela
Killed:     Destroyed                    ← SO liberou memória
```

## Cold start e warm start

O **cold start** acontece quando o processo do app não existe na memória. O sistema cria o processo, carrega as dependências e monta a primeira tela. É o caminho mais lento, e qualquer operação bloqueante nessa fase entra direto no tempo que o usuário espera olhando para a tela de abertura.

O **warm start** acontece quando o app volta do background com o processo ainda vivo. O sistema restaura a última tela sem recriar nada, e a volta é rápida. O estado em memória pode ter sumido mesmo assim, caso o sistema tenha aplicado o **process death** enquanto o app estava fora da tela.

```
Cold start: SO cria processo → init → tela inicial
Warm start: SO restaura processo → estado recuperado → tela atual
```

A diferença aparece na percepção de quem usa. O cold start recai sobre quem abre o app depois de dias, e um app que faz trabalho pesado na inicialização (chamada de rede, leitura de banco) sem cache entrega essa espera na forma de tela branca ou spinner.

## Process death e estado em memória

O sistema encerra o processo de um app em background para liberar memória para o app que está na frente. O usuário não vê nada acontecer. Ele volta ao app e espera encontrar tudo como deixou.

O estado **volátil** é tudo que vive apenas na memória: variáveis, objetos instanciados, o resultado da chamada de rede que ninguém gravou. Esse estado some junto com o processo.

A saída é separar o estado em camadas:

| Camada | Onde vive | Sobrevive ao process death? |
|---|---|---|
| UI state em memória | Memória | Não |
| UI state salvo | Mecanismo de salvamento do SO | Sim |
| Domain state | Banco de dados local | Sim |
| Dados remotos | Servidor + cache local | Sim (se cacheado) |

A regra prática: todo estado cuja perda o usuário notaria precisa estar gravado antes de o app chegar em **Paused**. Depois disso, o sistema pode encerrar o processo sem avisar, e não há mais onde rodar código de salvamento.

## O que o usuário sente

| Situação | Comportamento esperado |
|---|---|
| Usuário recebe ligação durante o app | App pausa; ao retomar, estado intacto |
| Usuário muda para outro app por 1 hora | App pode ter sofrido process death; deve restaurar estado relevante |
| Usuário reabre app após 2 dias | Cold start; estado persistido carregado do banco local |
| SO encerra app por memória | Processo morto; próxima abertura é cold start |

A falha mais comum é o código assumir que o app ficou vivo o tempo todo. O formulário meio preenchido que se apaga quando o usuário volta de uma ligação é esse erro chegando na tela.
