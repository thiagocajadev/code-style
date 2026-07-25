# BPM: modelar o processo de negócio antes de automatizar

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**BPM** (Business Process Management · Gestão de Processos de Negócio) trata de como o trabalho atravessa uma organização: quem faz o quê, em que ordem, sob qual condição e com qual prazo. O objeto de estudo é o processo do negócio (admissão de funcionário, análise de crédito, reembolso de despesa), e não o processo do time que constrói software. Esse último está em [`agile.md`](./agile.md).

O motivo de isso interessar a quem programa: todo sistema que automatiza um processo carrega o desenho desse processo em algum lugar. Quando o desenho não foi escrito, ele acaba distribuído entre colunas de status, condicionais em serviços diferentes e um acordo verbal que ninguém registrou.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **BPM** (Business Process Management · Gestão de Processos de Negócio) | Disciplina de mapear, executar e melhorar processos de trabalho |
| **BPMN** (Business Process Model and Notation · Notação e Modelo de Processo de Negócio) | Notação gráfica padronizada para desenhar processos |
| **pool** (participante do processo) | Uma organização ou sistema inteiro que participa do fluxo |
| **lane** (raia) | Um papel ou área dentro do participante, dono das tarefas daquela faixa |
| **task** (tarefa) | Uma unidade de trabalho, feita por pessoa ou por sistema |
| **gateway** (desvio) | Ponto onde o fluxo se divide por condição ou volta a se juntar |
| **event** (evento) | Algo que acontece e move o fluxo: início, fim, prazo esgotado, mensagem recebida |
| **orchestration** (orquestração) | Um coordenador central conhece a ordem e conduz os passos |
| **choreography** (coreografia) | Cada participante reage a eventos, sem coordenador |
| **workflow engine** (motor de processo) | Software que executa o modelo e guarda em que ponto cada instância está |
| **state machine** (máquina de estados) | Conjunto fechado de estados e das transições permitidas entre eles |
| **SLA** (Service Level Agreement · Acordo de Nível de Serviço) | Prazo acordado para uma etapa ou para o processo inteiro |

## Referência rápida da notação

| Elemento | Desenho | Para que serve |
|---|---|---|
| **Task** | Retângulo arredondado | Uma etapa de trabalho, com um verbo no nome |
| **Gateway exclusivo** | Losango com X | Um caminho é escolhido entre vários |
| **Gateway paralelo** | Losango com + | Todos os caminhos seguem ao mesmo tempo |
| **Evento de início** | Círculo de borda fina | O que dá partida no processo |
| **Evento de fim** | Círculo de borda grossa | Onde a instância termina |
| **Evento de prazo** | Círculo com relógio | Dispara quando o tempo acordado se esgota |
| **Sequence flow** | Seta contínua | Ordem entre etapas dentro do mesmo participante |
| **Message flow** | Seta tracejada | Comunicação entre participantes diferentes |
| **Pool e lane** | Faixas horizontais | Quem é dono de cada etapa |

A notação completa tem mais de cem símbolos. Os nove acima cobrem a maior parte dos diagramas úteis, e um diagrama que precisa de mais que isso costuma estar tentando descrever o sistema em vez do processo.

---

<a id="when-to-model"></a>

## O que o modelo responde que a prosa não responde

Um processo descrito em texto corrido parece completo até alguém procurar o que acontece fora do caminho principal.

<details>
<summary>❌ Ruim: o processo descrito em prosa, com os desvios implícitos</summary>

```
O cliente solicita o crédito pelo aplicativo. A área de análise
verifica os documentos e o histórico. Se estiver tudo certo, o
crédito é aprovado e o limite é liberado. Caso contrário, o
cliente é avisado.
```

O texto não diz quem aprova acima de um certo valor, o que acontece se o cliente não enviar o documento, qual o prazo da análise nem o que fazer quando o prazo estoura. Cada uma dessas perguntas vai aparecer durante a implementação, e a resposta vai ser dada por quem estiver programando naquela hora.

</details>

<details>
<summary>✅ Bom: o fluxo escrito com os desvios e os donos explícitos</summary>

```
Caminho principal
Solicitação recebida → Validar documentos → Consultar histórico → Decidir limite → Liberar crédito → Notificar cliente

Desvio: documento faltando
Validar documentos → Solicitar reenvio → aguarda 5 dias → Reenvio recebido → volta para Validar documentos

Desvio: prazo de reenvio esgotado
Solicitar reenvio → prazo de 5 dias vence → Arquivar solicitação → Notificar cliente

Desvio: valor acima de R$ 50.000
Decidir limite → Aprovar em comitê → Liberar crédito
```

| Etapa | Dono | Prazo |
|---|---|---|
| Validar documentos | Análise (automático) | 1 hora |
| Consultar histórico | Análise (automático) | 1 hora |
| Decidir limite | Análise (pessoa) | 2 dias úteis |
| Aprovar em comitê | Comitê de crédito | 5 dias úteis |

As quatro perguntas que faltavam têm resposta escrita. O prazo de cada etapa vira um evento de prazo no modelo e um alerta no sistema, e o dono de cada etapa define quem recebe o alerta.

</details>

Vale modelar quando o processo atravessa mais de uma área, tem prazo acordado, tem etapa feita por pessoa misturada com etapa automática, ou precisa ser auditado. Um fluxo de três passos dentro de um único serviço não precisa de diagrama, e desenhá-lo produz um documento que envelhece sem que ninguém perceba.

---

<a id="explicit-process"></a>

## O processo dentro do código

Quando o processo não tem representação própria, ele fica espalhado. Descobrir em que ponto uma solicitação está passa a exigir a leitura de vários serviços.

<details>
<summary>❌ Ruim: o estado do processo espalhado em colunas soltas</summary>

```js
async function approveCreditRequest(requestId) {
  const request = await creditRequestRepository.findById(requestId);

  if (request.documentsValidated && request.historyChecked) {
    if (request.amount > 50000 && !request.committeeApproved) {
      request.pendingCommittee = true;
      await creditRequestRepository.save(request);
      return;
    }

    request.approved = true;
    await creditRequestRepository.save(request);
  }
}
```

Cinco campos booleanos descrevem o estado, e as combinações possíveis entre eles não estão em lugar nenhum. Uma solicitação com `approved` e `pendingCommittee` ao mesmo tempo é possível, e nada impede isso. Para responder onde a solicitação parou, alguém lê o código.

</details>

<details>
<summary>✅ Bom: o processo declarado como estados e transições permitidas</summary>

```js
const creditRequestWorkflow = {
  received: { validate: "underAnalysis" },
  underAnalysis: {
    approveDirectly: "approved",
    escalateToCommittee: "awaitingCommittee",
    reject: "rejected",
  },
  awaitingCommittee: { approve: "approved", reject: "rejected" },
  approved: {},
  rejected: {},
};

function applyTransition(request, transitionName) {
  const nextStatus = creditRequestWorkflow[request.status][transitionName];

  if (!nextStatus) {
    throw new Error(`${transitionName} is not allowed from ${request.status}`);
  }

  const updatedRequest = request.withStatus(nextStatus);
  return updatedRequest;
}
```

O desenho do processo está num objeto que dá para ler de uma vez, e ele se parece com o diagrama que o negócio aprovou. Combinações impossíveis deixam de acontecer, porque a transição não existe no mapa.

</details>

Essa é a forma mais simples, e serve para processo curto que roda dentro de uma requisição. Para processo que dura dias, envolve pessoas e precisa sobreviver a reinicialização, o padrão [State](../architecture/patterns.md#state) organiza melhor as regras de cada etapa, e um motor de processo assume a persistência.

---

<a id="orchestration-vs-choreography"></a>

## Orquestração e coreografia

Um processo distribuído entre serviços tem duas formas de saber qual é o próximo passo.

| | Orquestração | Coreografia |
|---|---|---|
| Quem conhece a ordem | Um coordenador central | Ninguém, cada serviço reage a um evento |
| Como o passo seguinte começa | O coordenador chama | O serviço publica um evento e outro escuta |
| Ver onde a instância está | Consultar o coordenador | Reconstruir a partir dos eventos |
| Acrescentar um passo | Editar o coordenador | Assinar o evento em um serviço novo |
| Risco principal | O coordenador acumula a regra de todos | Ninguém enxerga o fluxo inteiro |

A escolha costuma seguir a necessidade de auditoria. Processo que precisa responder "onde está a solicitação 4712 e por quem ela passou" pede orquestração, porque a resposta fica num lugar. Processo cujos passos são reações independentes, sem prazo comum, funciona bem em coreografia, e [`domain-events.md`](../architecture/domain-events.md) trata da mecânica dos eventos.

Quando os passos precisam ser desfeitos em caso de falha, o padrão é a Saga, descrita em [`transactions.md`](../architecture/transactions.md).

---

<a id="workflow-engine"></a>

## Motor de processo

Um motor de processo (Camunda, Temporal, Flowable, AWS Step Functions) recebe o modelo, guarda em que ponto cada instância está e cuida do que é difícil de escrever à mão: retomar depois de uma queda, disparar o alerta de prazo, apresentar a fila de tarefas para as pessoas e registrar o histórico para auditoria.

| Traga o motor quando | Fique sem ele quando |
|---|---|
| O processo dura dias ou semanas | Tudo termina dentro de uma requisição |
| Existem etapas feitas por pessoas | Todas as etapas são automáticas |
| Há prazo por etapa com alerta ou escalonamento | Não existe prazo acordado |
| A auditoria precisa do histórico de quem decidiu o quê | O log da aplicação já responde |
| O processo muda com frequência e quem muda é o negócio | O fluxo muda junto com o código, por engenharia |

O motor traz um componente novo para operar, um formato de modelo para versionar e a questão do que fazer com as instâncias que já estavam rodando quando o modelo mudou. Essa última pergunta aparece na primeira alteração do processo e vale decidir antes de escolher a ferramenta.

---

<a id="when-bpm-hurts"></a>

## Quando o modelo atrapalha

- **O diagrama vira documentação paralela.** Ele foi desenhado uma vez, o código seguiu em frente, e agora as duas descrições discordam. O modelo se sustenta quando ele é executado pelo motor ou quando existe uma revisão que compara os dois.
- **O modelo descreve o sistema, e não o processo.** Diagrama com chamada de API, nome de tabela e tratamento de erro deixou de servir a quem entende do negócio, que era o público dele.
- **Um fluxo simples ganha um motor.** Três passos automáticos dentro de um serviço não precisam de infraestrutura de processo.
- **A notação vira a discussão.** Escolher entre dois tipos de gateway ocupa a reunião enquanto a pergunta sobre o que fazer quando o prazo estoura continua sem resposta.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Organizar o trabalho do time que constrói o software | [`agile.md`](./agile.md) |
| DDD, BDD, TDD e os estilos arquiteturais | [`methodologies.md`](./methodologies.md) |
| Entender o problema antes de desenhar o processo | [`design-thinking.md`](./design-thinking.md) |
| O padrão State e os padrões clássicos | [`../architecture/patterns.md`](../architecture/patterns.md) |
| Eventos de domínio, outbox e idempotência | [`../architecture/domain-events.md`](../architecture/domain-events.md) |
| Saga e coordenação de operações distribuídas | [`../architecture/transactions.md`](../architecture/transactions.md) |
