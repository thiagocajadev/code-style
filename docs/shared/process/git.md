# Git

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Convenções de branches (cópias da versão principal), commits (registro das alterações) e estratégia
de entrega.

## Branches

**Trunk-based development** (TBD / Desenvolvimento baseado no tronco / fluxo principal): é uma
estratégia de desenvolvimento de software onde a `main` (fluxo principal) é a **fonte única da
verdade**.

As Branches (cópias) derivam da `main`. Essas cópias devem existir por poucos dias, servindo pra
desenvolver melhorias e correções, voltando pra `main` via Pull Request (PR / Empurrãozinho).

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

| Tipo       | Quando usar                                       |
| ---------- | ------------------------------------------------- |
| `feat`     | Nova funcionalidade visível ao usuário ou sistema |
| `fix`      | Correção de bug                                   |
| `docs`     | Apenas documentação                               |
| `refactor` | Mudança interna sem alterar comportamento         |
| `test`     | Adição ou correção de testes                      |
| `perf`     | Melhoria de performance                           |
| `style`    | Formatação, whitespace, sem mudança de lógica     |
| `chore`    | Tarefas de manutenção (build, deps, config)       |
| `ci`       | Mudanças em pipelines de CI/CD                    |
| `revert`   | Reverte um commit anterior                        |

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

| Prática                      | Motivo                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| PR pequeno e focado          | Review mais rápido, menor superfície de bug, rollout mais seguro |
| Review obrigatório           | Ninguém faz `merge` do próprio PR sem aprovação                  |
| Checks verdes antes do merge | CI/CD valida antes de tocar a `main`                             |
| Merge na `main` diretamente  | Sem branches de longa vida (develop, staging, release)           |

Deploy, release, ambientes e fix forward: [ci-cd.md](ci-cd.md).
