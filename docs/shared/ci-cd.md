# CI/CD

CI/CD (Continuous Integration / Continuous Delivery, Integração Contínua e Entrega Contínua) é o processo que garante que qualquer mudança no código passe por verificação automática antes de chegar ao usuário.

CI e CD são processos distintos com objetivos diferentes:

| Processo | O que faz | Resultado |
|---|---|---|
| **CI** (Integração Contínua) | Valida qualidade a cada push: lint, testes, build | Artefato verificado |
| **CD** (Entrega Contínua) | Promove o artefato pelos ambientes até produção | Código em produção |

## Pipeline

O pipeline é a sequência de verificações que todo código precisa passar. Cada estágio é um portão: falhou, parou.

```
Lint → Segurança → Testes → Build → Deploy Staging → Smoke → Deploy Prod
```

| Estágio | O que verifica | Critério de falha |
|---|---|---|
| **Lint** | Estilo e formatação | Qualquer violação |
| **Segurança** | Secrets expostos, vulnerabilidades conhecidas | Qualquer secret; CVE explorado |
| **Testes** | Comportamento esperado do sistema | Qualquer falha |
| **Build** | Compilação e empacotamento do artefato | Qualquer erro de build |
| **Deploy Staging** | Promoção para ambiente espelho | Falha no health check |
| **Smoke** | Fluxo crítico funciona em staging | Qualquer falha no caminho crítico |
| **Deploy Prod** | Promoção para produção | Aprovação manual ou canary gate |

O artefato que vai para produção é o mesmo que passou por staging. Fazer rebuild entre ambientes invalida a garantia dos testes: o que foi verificado precisa ser o que é entregue.

## Deploy e Release

Deploy e release são eventos independentes.

**Deploy** é o ato técnico de colocar o código em produção. Acontece automaticamente após merge na `main` com pipeline verde.

**Release** é o ato de tornar a funcionalidade visível ao usuário. Controlado por feature flag, acontece quando o time decide, de forma gradual.

Essa separação reduz o risco de cada entrega. O código pode subir para produção desativado, ser validado com tráfego real em percentual controlado e só então ser ativado para todos.

## Feature Flags

Feature flags (interruptores de funcionalidade) separam o ciclo de vida do código do ciclo de vida da feature.

| Situação | Ação |
|---|---|
| Feature em desenvolvimento | Sobe desativada, código na `main` sem risco |
| Feature pronta, aguardando validação | Ativa para % do tráfego ou grupo interno |
| Feature com problema | Desativa sem rollback de código |
| Feature validada | Ativa para 100%, flag removida |

Flags têm prazo de validade. Uma flag que nunca é removida vira débito técnico: condicionais permanentes que crescem com o código.

## Trunk-Based Development

TBD (Trunk-Based Development, Desenvolvimento Baseado no Tronco) é a estratégia onde a `main` é a fonte única da verdade. Branches existem por dias.

Branches longas acumulam divergência: quanto mais tempo separada da `main`, maior o conflito no merge e maior a superfície de bug. Branches curtas integram cedo, falham cedo e entregam continuamente.

| Prática | Por quê |
|---|---|
| Branch vive menos de 2 dias | Conflito de merge cresce com o tempo afastado |
| Um propósito por branch | Misturar feat + fix dificulta reversão e rastreabilidade |
| `main` sempre deployável | CD só funciona se a `main` estiver sempre verde |

## Pre-commit

CI detecta problemas tarde: após o push, na esteira. Pre-commit hooks detectam imediatamente, antes do commit.

O mínimo útil: lint com auto-fix no código staged. Se o lint falha após o auto-fix, o commit é bloqueado. O custo deve ser baixo: menos de 5 segundos para não criar atrito no fluxo de trabalho.

## Rollback e Fix Forward

Fix forward (corrigir para frente) é a abordagem preferida: abrir um novo PR com a correção, passar pelo pipeline normal e fazer merge. A `main` segue para frente com histórico linear.

Rollback reverte o estado da `main` e cria inconsistência com o histórico. Reservado para emergências: sistema indisponível e fix forward inviável no tempo necessário.
