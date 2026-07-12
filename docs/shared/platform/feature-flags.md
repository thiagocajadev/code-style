# Feature flags: separar o deploy do código da entrega da feature

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Uma **feature flag** (interruptor de funcionalidade) permite que o código esteja em produção com a funcionalidade desligada. O deploy deixa de ser o momento em que o usuário passa a ver a novidade, e esses dois eventos podem acontecer em dias diferentes.

Isso muda três coisas na prática. O código incompleto pode ser integrado sem esperar a feature ficar pronta. A feature pode ser ligada para 1% dos usuários antes de chegar aos 100%. E a feature que deu problema pode ser desligada na hora, sem esperar um rollback de deploy.

Esta página aprofunda o vocabulário que [ci-cd.md](../process/ci-cd.md) esboça na seção de deploy vs release. A flag como caso particular de configuração dinâmica aparece em [configuration.md](configuration.md).

## Conceitos fundamentais

| Conceito                                  | O que é                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Feature** (funcionalidade)              | Comportamento visível ao usuário, cujo ciclo de vida é independente do ciclo de deploy do código |
| **Deploy** (implantação)                  | Ato técnico de colocar o código em produção; não implica que a feature esteja visível ao usuário |
| **Toggle** (interruptor)                  | Mecanismo que habilita ou desabilita uma feature sem deploy                                      |
| **Rollout** (ativação gradual)            | Estratégia de ativar uma feature progressivamente para subconjuntos de usuários                  |
| **Dark launch** (ativação invisível)      | Executar o novo código em produção sem expor o resultado ao usuário                              |
| **Kill switch** (chave de emergência)     | Flag que desativa uma feature problemática imediatamente, sem deploy ou rollback                 |
| **Runtime** (tempo de execução)           | Ponto de avaliação da flag a cada requisição, permitindo mudança sem restart                     |
| **TTL** (Time To Live · tempo de validade) | Tempo durante o qual o valor de uma flag em cache local é considerado válido                     |

---

## Quatro propósitos diferentes para uma flag

As flags servem a fins distintos, e o mesmo mecanismo acaba abrigando todos eles. A regra de negócio permanente fica na mesma lista do experimento que dura duas semanas, e ninguém consegue mais dizer quais podem ser apagadas. Quatro categorias cobrem a maioria dos casos:

| Categoria      | Propósito                                                                               | Vida útil                                  |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Release**    | Esconder código não terminado em produção                                               | Dias a semanas, removida na release        |
| **Experiment** | A/B test, medir efeito de variação                                                      | Enquanto o teste roda, removida na decisão |
| **Ops**        | Kill switch, controle de carga, throttling (limitação de taxa)                          | Semi-permanente, usada em incidentes       |
| **Permission** | Habilitar feature por plano, role (perfil de acesso), entitlement (permissão por plano) | Permanente, parte do modelo de negócio     |

Cada categoria tem prazo de validade próprio. A flag de release existe para ser apagada assim que o rollout termina. A de permission faz parte do modelo de negócio e fica para sempre. Registrar a categoria no momento da criação é o que torna a limpeza possível depois.

---

## Ativar aos poucos, de ninguém até todos

A flag aceita mais estados que ligado e desligado. O **rollout** controla quem vê a feature, em que proporção e em que ordem:

```
off              →  ninguém vê
internal         →  apenas contas do time e QA
beta             →  segmento opt-in (adesão voluntária) de clientes
% gradual        →  1% → 10% → 50% → 100%
segmentado       →  por plano, geografia, role, feature entitlement
on               →  todos veem
```

A progressão usual é **interno → beta → gradual → total**. Cada degrau é uma oportunidade de olhar as métricas (taxa de erro, latência, conversão) com um público pequeno antes de ampliar. Quem pula de 0% direto para 100% abre mão dessa observação, e a flag vira um `if` a mais no código sem nenhum benefício de release controlada.

---

## Rodar o código novo sem o usuário ver

O **dark launch** coloca o código novo em produção e esconde o resultado. A lógica executa de verdade, com tráfego de verdade, e o que ela devolve fica em log, vai para comparação ou é descartado.

Três formas típicas:

- **Shadow**: a requisição vai para o novo código e para o antigo; a resposta retornada ao usuário é
  a do antigo. O time compara os dois outputs offline.
- **Silent metrics**: o novo código emite métricas em produção (tempo, taxa de erro) sem afetar o
  fluxo. Valida performance sob carga real.
- **Write-to-shadow**: a escrita acontece no sistema antigo e em um buffer (área temporária) do
  novo; consistência é verificada antes de promover.

Vale o esforço quando o caminho é crítico: migração de banco, reescrita de cálculo financeiro, troca de provedor de pagamento. Implementar o dark launch custa tempo de engenharia, e esse tempo é menor que o de um incidente com os dados dos clientes.

---

## Desligar a feature em segundos durante um incidente

O **kill switch** desativa uma feature na hora, sem abrir **PR** (Pull Request · Pedido de Integração), sem rebuild (recompilação) e sem deploy. Ele existe para o momento em que a taxa de erro dispara, a latência estoura o limite ou uma métrica de negócio despenca.

Ele se comporta de forma diferente de uma flag de release em três pontos:

- **Vive para sempre** como parte do código operacional, e continua no lugar depois que o rollout termina.
- **É acionado pelo time de operação**, no meio do incidente.
- **Cai em um comportamento seguro**: voltar ao caminho antigo, devolver um erro explícito ou servir uma resposta reduzida. A requisição sempre recebe uma resposta.

Toda feature nova de alto risco (escrita, cobrança, integração externa) nasce com kill switch no primeiro deploy. Escrever o switch durante o incidente adiciona um ciclo de build e deploy a um sistema que já está quebrado.

---

## Onde a flag é avaliada

São três momentos possíveis, e cada um cobra um preço diferente:

| Ponto                                   | Latência                     | Consistência   | Exemplo de uso                                                      |
| --------------------------------------- | ---------------------------- | -------------- | ------------------------------------------------------------------- |
| **Build-time** (em tempo de compilação) | Zero (código morto removido) | Total          | Features experimentais que nunca entram em produção                 |
| **Startup** (na inicialização)          | Zero em runtime              | Por instância  | Features de infraestrutura que não mudam durante a vida do processo |
| **Runtime** (em tempo de execução)      | Custo por avaliação          | Por requisição | Rollout gradual, kill switch, experimentos                          |

A maioria das flags úteis é avaliada em **runtime**, porque é o único ponto em que o valor muda sem reiniciar o processo. É o que torna possível ajustar o rollout de 10% para 50% e acionar o kill switch enquanto o incidente acontece.

O custo por avaliação importa. Consultar um serviço externo a cada chamada de função adiciona uma ida à rede dentro do caminho quente. O padrão é o **cache local com TTL** (Time To Live · tempo de validade) **curto**: o cliente da flag sincroniza com o backend a cada poucos segundos e responde ao código a partir da memória. Ver [performance.md](performance.md), seção Cache.

---

## Como a flag aparece no código

A forma do condicional decide se a flag vai ser fácil de remover depois. Três padrões, do pior ao melhor:

**1. inline (embutido no fluxo) espalhado (pior)**

Duplica o fluxo inteiro dentro de um `if`, e remover a flag depois exige reler as 160 linhas para decidir o que fica.

```js
if (flags.isNewCheckoutEnabled) {
  ... 80 linhas do novo fluxo ...
} else {
  ... 80 linhas do antigo ...
}
```

**2. isolamento por função (aceitável)**

Cobre a maior parte dos casos. A flag escolhe qual implementação usar, e as duas são módulos independentes com a mesma interface.

```js
const checkout = flags.isNewCheckoutEnabled ? newCheckout : legacyCheckout;
checkout.process(order);
```

**3. strategy (estratégia) com registro (escalável)**

Vale quando há mais de duas variantes, ou quando a escolha depende de vários fatores combinados.

```js
const strategy = checkoutStrategies[flags.checkoutVariant];
strategy.process(order);
```

A regra vale para os três: **a flag escolhe o caminho, e o caminho escolhido ignora que uma flag existe**. Quem chama escreve `checkout.process(order)` sem `if` em volta. Quando a nova implementação vence, remover a flag é apagar a linha da escolha e manter a implementação inteira.

---

## Toda flag tem prazo de validade

A flag que ninguém remove deixa três coisas para trás: o condicional no código, a entrada no painel de configuração e a dúvida de quem lê o arquivo e precisa descobrir por que aquele caminho alternativo existe. Depois de alguns meses, o time não consegue mais responder quantas flags estão ativas nem quais são seguras de apagar.

Três práticas seguram isso:

- **Prazo explícito**: no momento de criar, registrar a data de remoção esperada. Release flag:
  dias. Experimento: duração do teste. Ops: permanente, registrar como tal.
- **Inventário auditável**: listar todas as flags vivas, dono, propósito, última mudança. Sem
  inventário, ninguém sabe o que pode sair.
- **Cleanup como tarefa explícita**: no momento que o rollout chega a 100%, a remoção da flag entra
  no backlog (lista de tarefas pendentes) com prioridade. Adiar é criar lixo de longo prazo.

O sinal de que a gestão saiu do controle é uma lista com dezenas de flags ligadas em 100% há meses. Elas guardam decisões que já foram tomadas, e o sistema de flags parou de servir para controlar release.

---

## Flags e testes

O código com flag tem pelo menos dois caminhos, e os dois precisam de teste. Dois padrões funcionam:

- **Teste por variante**: cada teste roda com uma configuração de flag específica, passada via
  fixture (dado de teste pré-definido). O flag service em teste é injetado com valores fixos.
- **Teste do caminho novo em isolamento**: a nova implementação é testada sem flag, como qualquer
  outra unidade. O teste da escolha (qual caminho é ativado) é um teste separado, menor.

Ler o flag service real dentro do teste quebra os dois padrões. O resultado do teste passa a depender de uma configuração que vive fora do repositório, e alguém mudando o rollout em produção faz a suíte falhar sem que nenhuma linha de código tenha mudado.

---

## Referência rápida

| Decisão                                       | Regra                                                                |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Esconder código não terminado em produção     | Release flag, remover após rollout                                   |
| Medir variação de comportamento               | Experiment flag, remover após decisão                                |
| Desligar feature em incidente                 | Kill switch, permanente, acionado por ops                            |
| Habilitar por plano/role                      | Permission flag, permanente                                          |
| Progressão de rollout                         | Interno → beta → % gradual → total                                   |
| Validar feature de risco antes do usuário ver | Dark launch (shadow, silent metrics)                                 |
| Avaliação da flag                             | Runtime com cache local, TTL curto                                   |
| Estrutura no código                           | Flag escolhe implementação, implementação não sabe                   |
| Flag ligada em 100% há tempo                  | Agendar remoção, manter inventário auditável                         |
| Como testar                                   | Fixture com valores fixos; nunca ler flag service em teste           |
| Deploy vs release, visão geral                | Ver [ci-cd.md](../process/ci-cd.md)                                  |
| Flag como config dinâmica                     | Ver [configuration.md](configuration.md) seção "Mudanças em runtime" |
