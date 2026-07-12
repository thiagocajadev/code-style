# Git: branches, commits e pull requests

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O Git guarda o histórico do projeto e coordena o trabalho de várias pessoas no mesmo código. Este guia cobre as três decisões que aparecem todo dia: como nomear a **branch** (cópia isolada do código), como escrever o **commit** (registro de uma alteração) e como levar o trabalho de volta para a versão principal via **PR** (Pull Request · Pedido de Integração).

## Conceitos fundamentais

| Conceito                                                             | O que é                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **TBD** (Trunk-Based Development · Desenvolvimento baseado no tronco) | Estratégia onde a main é a única fonte da verdade; branches são curtas e focadas |
| **Branch** (cópia)                                                   | Cópia isolada do código para desenvolver uma mudança sem afetar a main           |
| **Commit** (registro de alteração)                                   | Snapshot do código em um momento, com descrição do que mudou e por quê           |
| **PR** (Pull Request · Pedido de Integração)                          | Solicitação de mesclagem de uma branch para a main, com revisão obrigatória      |
| **Merge** (mesclagem)                                                | Integração das alterações de uma branch de volta à main                          |

## Branches

No **trunk-based development** (TBD · desenvolvimento baseado no tronco), a `main` é a única versão que vale. Todo o resto é temporário e existe para voltar para ela.

Cada branch nasce da `main`, vive poucos dias enquanto você desenvolve uma melhoria ou correção, e volta para a `main` por um PR. Uma branch aberta por semanas acumula divergência: quanto mais a `main` avança sem você, mais conflitos aparecem na hora de mesclar.

```
main → branch → commits → PR → review → merge → main
```

| Regra                     | Motivo                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Branch derivada da `main` | Evita divergência acumulada e conflitos tardios                                   |
| Curta e focada            | Quanto menor o PR, mais fácil a revisão e menor a chance de regressão             |
| Um propósito por branch   | Misturar `feat` + `fix` + `refactor` dificulta a reversão e a rastreabilidade     |
| Nunca branch de branch    | Dependências implícitas adicionam complexidade ao processo de `merge` (mesclagem) |

### Nomenclatura

O nome da branch diz o tipo do trabalho e o que ele faz, nesta forma:

```
<tipo>/<descricao-em-kebab-case>
```

<details>
<summary>❌ Ruim</summary>

```
feature-nova
minha-branch
fix
thiago/ajuste
branch-do-joao-refactor-e-tambem-o-bug-do-login
```

</details>

<details>
<summary>✅ Bom</summary>

```
feat/user-email-verification
fix/order-discount-rounding
docs/git-conventions
refactor/payment-service-split
```

</details>

O nome da pessoa não entra: a autoria já está no commit. A última linha do exemplo ruim mostra o outro sintoma, uma branch com dois propósitos misturados.

## Commits

Uma boa estratégia para nomear commits é o [Conventional Commits](https://www.conventionalcommits.org/). Cada commit descreve **o que** mudou e **por que** mudou. O como já está no diff.

```
<tipo>[escopo opcional]: <descrição no imperativo, em inglês, sem ponto final>
```

### Tipos

| Tipo       | Quando usar                                                      |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | Nova funcionalidade visível ao usuário ou sistema                |
| `fix`      | Correção de bug                                                  |
| `docs`     | Apenas documentação                                              |
| `refactor` | Mudança interna sem alterar comportamento                        |
| `test`     | Adição ou correção de testes                                     |
| `perf`     | Melhoria de performance                                          |
| `style`    | Formatação, whitespace (espaço em branco), sem mudança de lógica |
| `chore`    | Tarefas de manutenção (build, deps, config)                      |
| `ci`       | Mudanças em pipelines de CI/CD                                   |
| `revert`   | Reverte um commit anterior                                       |

<details>
<summary>❌ Ruim</summary>

```
fix bug
update
arrumei o login
WIP
changes
feat: adiciona validação no campo de e-mail do usuário no formulário de cadastro da tela de onboarding
```

</details>

<details>
<summary>✅ Bom</summary>

```
feat(auth): add email verification on signup
fix(order): correct discount rounding for fractional quantities
docs: add git conventions
refactor(payment): extract charge logic into PaymentService
chore: upgrade eslint to v9
```

</details>

As cinco primeiras mensagens ruins não sobrevivem a uma busca no histórico daqui a seis meses: `update` e `changes` valem para qualquer commit do repositório. A última é longa demais e cabe melhor no corpo do commit.

### Escopo

O escopo é opcional e serve quando o tipo sozinho não diz onde a mudança caiu. Prefira nomes de módulo ou domínio: `auth`, `order`, `payment`, `user`, `cart`.

### Descrição

- Imperativo: `add`, `fix`, `remove`, `update` (não `added`, `fixing`, `removes`)
- Inglês
- Sem maiúscula inicial, sem ponto final
- Até ~72 caracteres

## Pull Requests

O PR é onde outra pessoa lê o código antes que ele chegue na `main`. Quanto menor o PR, mais atenção cada linha recebe.

| Prática                                                   | Motivo                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| PR pequeno e focado                                       | Review (revisão) mais rápido, menor superfície de bug, rollout (implantação gradual) mais seguro |
| Review obrigatório                                        | Ninguém faz `merge` do próprio PR sem aprovação                                                  |
| Checks (verificações automatizadas) verdes antes do merge | CI/CD valida antes de tocar a `main`                                                             |
| Merge na `main` diretamente                               | Sem branches de longa vida (develop, staging, release)                                           |
| Squash antes do merge                                     | Um commit por PR mantém o histórico legível e viabiliza debug com `git bisect` (busca binária de regressão) |

Rotina diária, rebase, squash e troubleshooting: [git-advanced.md](git-advanced.md). Deploy, release, ambientes e fix forward: [ci-cd.md](ci-cd.md).
