# Git

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Convenções de branches (cópias da versão principal), commits (registro das alterações) e estratégia
de entrega.

## Conceitos fundamentais

| Conceito                                                             | O que é                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **TBD** (Trunk-Based Development, Desenvolvimento baseado no tronco) | Estratégia onde a main é a única fonte da verdade; branches são curtas e focadas |
| **Branch** (cópia)                                                   | Cópia isolada do código para desenvolver uma mudança sem afetar a main           |
| **Commit** (registro de alteração)                                   | Snapshot do código em um momento, com descrição do que mudou e por quê           |
| **PR** (Pull Request, Pedido de Integração)                          | Solicitação de mesclagem de uma branch para a main, com revisão obrigatória      |
| **Merge** (mesclagem)                                                | Integração das alterações de uma branch de volta à main                          |

## Branches

**Trunk-based development** (TBD / Desenvolvimento baseado no tronco / fluxo principal): é uma
estratégia de desenvolvimento de software onde a `main` (fluxo principal) é a **fonte única da
verdade**.

As Branches (cópias) derivam da `main`. Essas cópias devem existir por poucos dias, servindo pra
desenvolver melhorias e correções, voltando pra `main` via Pull Request (PR / Pedido de Integração).

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

```
<tipo>/<descricao-em-kebab-case>
```

<details>
<summary>❌ Bad</summary>
<br>

```
feature-nova
minha-branch
fix
thiago/ajuste
branch-do-joao-refactor-e-tambem-o-bug-do-login
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```
feat/user-email-verification
fix/order-discount-rounding
docs/git-conventions
refactor/payment-service-split
```

</details>

## Commits

Uma ótima estratégia para nomear commits (registro das alterações) é o
[Conventional Commits](https://www.conventionalcommits.org/). Cada commit descreve **o que** mudou e
**por que**, não como.

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
<summary>❌ Bad</summary>
<br>

```
fix bug
update
arrumei o login
WIP
changes
feat: adiciona validação no campo de e-mail do usuário no formulário de cadastro da tela de onboarding
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```
feat(auth): add email verification on signup
fix(order): correct discount rounding for fractional quantities
docs: add git conventions
refactor(payment): extract charge logic into PaymentService
chore: upgrade eslint to v9
```

</details>

### Escopo

Opcional. Usado quando o contexto não é óbvio pelo tipo. Prefira nomes de módulo ou domínio: `auth`,
`order`, `payment`, `user`, `cart`.

### Descrição

- Imperativo: `add`, `fix`, `remove`, `update` (não `added`, `fixing`, `removes`)
- Inglês
- Sem maiúscula inicial, sem ponto final
- Até ~72 caracteres

## Pull Requests

| Prática                                                   | Motivo                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| PR pequeno e focado                                       | Review (revisão) mais rápido, menor superfície de bug, rollout (implantação gradual) mais seguro |
| Review obrigatório                                        | Ninguém faz `merge` do próprio PR sem aprovação                                                  |
| Checks (verificações automatizadas) verdes antes do merge | CI/CD valida antes de tocar a `main`                                                             |
| Merge na `main` diretamente                               | Sem branches de longa vida (develop, staging, release)                                           |
| Squash antes do merge                                     | Um commit por PR mantém o histórico legível e viabiliza debug com `git bisect` (busca binária de regressão) |

Rotina diária, rebase, squash e troubleshooting: [git-advanced.md](git-advanced.md). Deploy, release, ambientes e fix forward: [ci-cd.md](ci-cd.md).
