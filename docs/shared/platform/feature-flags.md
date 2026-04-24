# Feature Flags

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Feature flags (interruptores de funcionalidade) separam o ciclo de vida do **código** do ciclo de
vida da **feature**. Código pode estar em produção desativado. Feature pode ser ativada para 1% dos
usuários antes de 100%. Uma feature problemática pode ser desligada sem rollback de deploy.

Esta página aprofunda o vocabulário que [ci-cd.md](../process/ci-cd.md) esboça na seção de deploy vs
release. Flags como caso particular de configuração dinâmica aparecem também em
[configuration.md](configuration.md).

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
| **TTL** (Time To Live, tempo de validade) | Tempo durante o qual o valor de uma flag em cache local é considerado válido                     |

---

## Toggle (interruptor) por propósito

Nem toda flag serve ao mesmo fim. Misturar propósitos no mesmo mecanismo cria confusão: a regra de
negócio convive com o experimento, o kill switch (desligador de emergência) convive com permissão de
usuário. Quatro categorias cobrem a maioria dos casos:

| Categoria      | Propósito                                                                               | Vida útil                                  |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Release**    | Esconder código não terminado em produção                                               | Dias a semanas, removida na release        |
| **Experiment** | A/B test, medir efeito de variação                                                      | Enquanto o teste roda, removida na decisão |
| **Ops**        | Kill switch, controle de carga, throttling (limitação de taxa)                          | Semi-permanente, usada em incidentes       |
| **Permission** | Habilitar feature por plano, role (perfil de acesso), entitlement (permissão por plano) | Permanente, parte do modelo de negócio     |

Os quatro tipos têm auditoria, governança e prazo de validade diferentes. Release deve morrer.
Permission nunca morre. Tratar todos como o mesmo tipo atrapalha a decisão de limpeza.

---

## Rollout (ativação gradual): do invisível ao universal

Uma flag não precisa ser binária ativa/inativa. Rollout controla **quem** vê a feature, em que
proporção, em que ordem:

```
off              →  ninguém vê
internal         →  apenas contas do time e QA
beta             →  segmento opt-in (adesão voluntária) de clientes
% gradual        →  1% → 10% → 50% → 100%
segmentado       →  por plano, geografia, role, feature entitlement
on               →  todos veem
```

O padrão comum é: **interno → beta → gradual → total**. Cada transição é uma chance de observar
métricas (erro, latência, conversão) antes de ampliar. Pular etapas é trocar visibilidade por
velocidade.

**Sinal de rollout mal feito**: o time pula de 0% direto para 100%. A flag existe mas não entrega o
benefício de release controlada. Vira apenas uma ramificação condicional extra no código.

---

## Dark launch (ativação invisível)

Dark launch é colocar o código novo em produção **sem que o usuário perceba**. A feature roda em
paralelo com a antiga: a lógica é executada, mas o resultado não é exposto. O output pode ser
logado, comparado com o antigo ou descartado.

Três formas típicas:

- **Shadow**: a requisição vai para o novo código e para o antigo; a resposta retornada ao usuário é
  a do antigo. O time compara os dois outputs offline.
- **Silent metrics**: o novo código emite métricas em produção (tempo, taxa de erro) sem afetar o
  fluxo. Valida performance sob carga real.
- **Write-to-shadow**: a escrita acontece no sistema antigo e em um buffer (área temporária) do
  novo; consistência é verificada antes de promover.

Dark launch é a forma mais segura de validar um caminho crítico (migração de banco, reescrita de
cálculo, troca de provedor). Mais caro de implementar, mais barato que um incidente em produção.

---

## Kill switch (matar feature)

Kill switch é a flag que **desliga uma feature problemática em segundos**, sem abrir **PR** (Pull Request, Pedido de Integração), sem rebuild
(recompilação), sem deploy. É a rede de segurança quando algo descompensa: picos de erro, latência
fora do limite, regressão detectada em métrica.

Diferente de uma flag de release, o kill switch:

- **Vive para sempre** como parte do código operacional, não é removido após rollout.
- **É acionado por ops**, não pelo time de produto.
- **Retorna comportamento seguro**: cair para o caminho antigo, retornar erro explícito, servir
  resposta degradada. Nunca ficar pendurado sem resposta.

O desenho é: para toda feature nova de alto risco (escrita, cobrança, integração externa), existe
kill switch desde o primeiro deploy. Descobrir na meia-noite do incidente que não há switch é
descobrir tarde demais.

---

## Avaliação: onde a decisão acontece

Uma flag é avaliada em três pontos possíveis, cada um com trade-off (equilíbrio entre fatores)
próprio:

| Ponto                                   | Latência                     | Consistência   | Exemplo de uso                                                      |
| --------------------------------------- | ---------------------------- | -------------- | ------------------------------------------------------------------- |
| **Build-time** (em tempo de compilação) | Zero (código morto removido) | Total          | Features experimentais que nunca entram em produção                 |
| **Startup** (na inicialização)          | Zero em runtime              | Por instância  | Features de infraestrutura que não mudam durante a vida do processo |
| **Runtime** (em tempo de execução)      | Custo por avaliação          | Por requisição | Rollout gradual, kill switch, experimentos                          |

A maioria das flags úteis é runtime: o valor muda sem restart (reinicialização), o rollout é
ajustável, o kill switch responde ao incidente imediatamente.

O custo por avaliação importa. Consultar um serviço externo a cada chamada de função é
insustentável. O padrão é **cache local com TTL (Time To Live, tempo de validade) curto**: o cliente
da flag sincroniza com o backend a cada poucos segundos e responde localmente ao código. Ver
[performance.md](performance.md) seção Cache.

---

## Estrutura do condicional no código

Como a flag aparece no código determina se ela será fácil de remover depois. Três padrões:

**1. inline (embutido no fluxo) espalhado (pior)**

Vira código duplicado e quase impossível de remover.

```js
if (flags.isNewCheckoutEnabled) {
  ... 80 linhas do novo fluxo ...
} else {
  ... 80 linhas do antigo ...
}
```

**2. isolamento por função (aceitável)**

Cobre a maior parte dos casos: a flag escolhe qual implementação injetar, as duas implementações são
pares independentes.

```js
const checkout = flags.isNewCheckoutEnabled ? newCheckout : legacyCheckout;
checkout.process(order);
```

**3. strategy (estratégia) com registro (escalável)**

Vale quando há mais de duas variantes ou a decisão de qual variante usar depende de vários fatores.

```js
const strategy = checkoutStrategies[flags.checkoutVariant];
strategy.process(order);
```

A regra é: **a flag define qual caminho segue; o caminho não sabe que foi escolhido por flag**. O
consumidor chama `checkout.process(order)` sem `if` em volta. Remover a flag, depois que a nova
implementação venceu, é apagar a escolha e manter a implementação.

---

## Dívida: toda flag tem prazo de validade

Flag que nunca é removida vira débito permanente: condicional no código, configuração no sistema,
cognição para quem lê. O custo cresce em juros compostos — quantas flags inativas estão rodando
hoje? Quais são seguras de remover?

Três práticas contêm a dívida:

- **Prazo explícito**: no momento de criar, registrar a data de remoção esperada. Release flag:
  dias. Experimento: duração do teste. Ops: permanente, registrar como tal.
- **Inventário auditável**: listar todas as flags vivas, dono, propósito, última mudança. Sem
  inventário, ninguém sabe o que pode sair.
- **Cleanup como tarefa explícita**: no momento que o rollout chega a 100%, a remoção da flag entra
  no backlog (lista de tarefas pendentes) com prioridade. Adiar é criar lixo de longo prazo.

**Sinal de má gestão**: o time tem dezenas de flags ligadas em 100% há meses. O sistema de flags
virou registro arqueológico de decisões antigas, não ferramenta de release.

---

## Flags e testes

O código com flag tem pelo menos dois caminhos. Os dois precisam ser testados. Dois padrões
funcionam:

- **Teste por variante**: cada teste roda com uma configuração de flag específica, passada via
  fixture (dado de teste pré-definido). O flag service em teste é injetado com valores fixos.
- **Teste do caminho novo em isolamento**: a nova implementação é testada sem flag, como qualquer
  outra unidade. O teste da escolha (qual caminho é ativado) é um teste separado, menor.

O que não funciona: ler o flag service real em teste. O teste passa a depender de configuração
externa e vira frágil.

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
