# CI/CD: verificar cada mudança antes que ela chegue ao usuário

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**CI/CD** (Continuous Integration and Continuous Delivery · Integração Contínua e Entrega Contínua) é o processo que submete qualquer mudança de código a uma verificação automática antes de ela chegar ao usuário. O código passa por lint, testes e build sem que ninguém precise lembrar de rodar nada.

As duas metades resolvem problemas diferentes, e vale separá-las desde o começo. A estratégia de branches que sustenta esse fluxo está em [git.md](git.md).

| Processo                          | O que faz                                                           | Resultado           |
| --------------------------------- | ------------------------------------------------------------------- | ------------------- |
| **CI** (Integração Contínua)      | Valida qualidade a cada push (envio de código): lint, testes, build | Artefato verificado |
| **CD** (Entrega Contínua)         | Promove o artefato pelos ambientes até produção com aprovação manual no último estágio | Artefato pronto para produção |
| **CD** (Deploy Contínuo)          | Promove o artefato até produção automaticamente, sem aprovação manual | Código em produção  |

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Pipeline** (sequência de etapas de verificação) | Conjunto ordenado de estágios que todo código deve passar; cada estágio é um portão |
| **Lint** (análise estática de estilo) | Verificação estática de estilo e formatação do código |
| **Smoke test** (teste de fumaça) | Teste rápido do fluxo crítico após deploy para confirmar que o sistema responde |
| **Fix forward** (corrigir para frente) | Estratégia de corrigir bugs com um novo commit e deploy, sem reverter o histórico |
| **Rollback** (reversão) | Retorno do artefato em produção à versão anterior; reservado para emergências |
| **Pre-commit hook** (gancho de pré-commit) | Automação executada localmente antes de cada commit, com custo máximo de 5 segundos |

## O pipeline e seus portões

O **pipeline** é a sequência de verificações por onde todo código passa. Cada estágio funciona como um portão: se ele falha, a mudança para ali e não avança para o próximo.

```
Lint → Segurança → Testes → Build → Deploy Staging → Smoke → Deploy Prod
```

| Estágio            | O que verifica                                | Critério de falha                 |
| ------------------ | --------------------------------------------- | --------------------------------- |
| **Lint**           | Estilo e formatação                           | Qualquer violação                 |
| **Segurança**      | Secrets expostos, vulnerabilidades conhecidas | Qualquer secret; CVE explorado    |
| **Testes**         | Comportamento esperado do sistema             | Qualquer falha                    |
| **Build**          | Compilação e empacotamento do artefato        | Qualquer erro de build            |
| **Deploy Staging** | Promoção para ambiente espelho                | Falha no health check             |
| **Smoke**          | Fluxo crítico funciona em staging             | Qualquer falha no caminho crítico |
| **Deploy Prod**    | Promoção para produção                        | Aprovação manual ou canary gate   |

O artefato que chega em produção é o mesmo que passou por staging. Refazer o build entre um ambiente e outro produz um binário que ninguém testou, e a garantia dos testes se perde no caminho.

## Ambientes

O mesmo artefato é promovido de ambiente em ambiente, sem rebuilds e sem uma branch por ambiente. Cada etapa acrescenta confiança antes da promoção seguinte.

<img src="../../../assets/dev-pipeline-linear-flow.svg" alt="dev-pipeline-linear-flow" width="540" />

| Ambiente  | Responsabilidade                                                       |
| --------- | ---------------------------------------------------------------------- |
| `dev`     | Primeira validação após merge: comportamento básico, sem regressão     |
| `qa`      | Validação funcional completa: cenários reais, integrações e edge cases |
| `staging` | Ambiente espelho de prod: última barreira antes da entrega real        |
| `prod`    | Entrega final: observabilidade ativa nos primeiros minutos após deploy |

### O que fazer depois do deploy

```
deploy prod → logs e métricas → smoke test → validar feature flag → estabilização
```

O ciclo continua depois que o código sobe. A cada promoção para `prod`:

- Monitorar logs e métricas por tempo determinado (ex: 15–30 min)
- Confirmar que a feature flag está desativada se a feature ainda não é pública
- Validar o comportamento esperado com um smoke test manual ou automatizado
- Só encerrar o acompanhamento após estabilização

## Deploy e release são eventos separados

```
merge na main → deploy (automático) → feature flag desativada → release gradual → 100%
```

**Deploy** é o ato técnico de colocar o código em produção. Acontece automaticamente depois do merge na `main`, com o pipeline verde.

**Release** é o ato de tornar a funcionalidade visível ao usuário. Uma feature flag controla o momento, e o time decide quando abrir, para quantos e em que ritmo.

A separação reduz o risco de cada entrega. O código sobe desativado, recebe tráfego real em um percentual controlado e só depois disso é ativado para todos.

## Feature flags

As **feature flags** (interruptores de funcionalidade) separam o ciclo de vida do código do ciclo de vida da feature.

| Situação                             | Ação                                        |
| ------------------------------------ | ------------------------------------------- |
| Feature em desenvolvimento           | Sobe desativada, código na `main` sem risco |
| Feature pronta, aguardando validação | Ativa para % do tráfego ou grupo interno    |
| Feature com problema                 | Desativa sem rollback de código             |
| Feature validada                     | Ativa para 100%, flag removida              |

Toda flag tem prazo de validade. A flag que ninguém remove vira dívida técnica: um condicional permanente que todo mundo que passa por aquele arquivo precisa entender.

## Pre-commit: pegar o erro antes do commit

O CI acusa o problema depois do push, quando o pipeline já rodou. Um **pre-commit hook** roda na sua máquina, antes do commit existir, e devolve o erro em segundos.

```
código staged → lint → auto-fix → commit
```

O custo precisa ficar abaixo de 5 segundos. Um hook lento vira o primeiro candidato a ser desativado com `--no-verify`.

## Corrigir para frente, e reverter só na emergência

O **fix forward** (corrigir para frente) é a abordagem preferida. A `main` continua avançando, com histórico linear.

```
bug em prod → PR na main → pipeline → merge → deploy
```

| Etapa       | Ação                                                      |
| ----------- | --------------------------------------------------------- |
| Identificar | Confirmar o comportamento inesperado via logs e métricas  |
| Isolar      | Desativar a feature flag se o bug estiver coberto por uma |
| Corrigir    | Abrir PR na `main` com a correção                         |
| Validar     | Pipeline verde: lint, testes, build                       |
| Entregar    | Merge e deploy seguindo o fluxo normal                    |
| Confirmar   | Monitorar logs após deploy para garantir estabilização    |

⚠️ O rollback fica reservado para a emergência: sistema indisponível e sem tempo para o fix forward passar pelo pipeline. Ele reverte o estado da `main` e deixa o histórico fora de sincronia com o que está rodando em produção.

| Etapa      | Ação                                                         |
| ---------- | ------------------------------------------------------------ |
| Avaliar    | Sistema indisponível e correção inviável no tempo necessário |
| Reverter   | Rollback do artefato no ambiente de prod                     |
| Comunicar  | Notificar stakeholders (partes interessadas) sobre o incidente e a reversão        |
| Investigar | Identificar a causa raiz sem pressão de produção             |
| Corrigir   | Retomar pelo fluxo de fix forward após estabilização         |
