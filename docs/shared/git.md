# Git

Convenções de branches, commits e estratégia de entrega.

## Branches

**Trunk-based development** (TBD / Desenvolvimento baseado no tronco / fluxo principal): é uma
estratégia de desenvolvimento de software onde a `main` (fluxo principal) é a **fonte única da
verdade**.

As Branches (cópias) derivam da `main`. Essas cópias devem existir por poucos dias, servindo pra
desenvolver melhorias e correções, voltando pra `main` via Pull Request (PR / Empurrãozinho).

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

```
feature-nova
minha-branch
fix
thiago/ajuste
branch-do-joao-refactor-e-tambem-o-bug-do-login
```

</details>

<details>
<summary>✅ Good</summary>

```
feat/user-email-verification
fix/order-discount-rounding
docs/git-conventions
refactor/payment-service-split
```

</details>

## Commits

Sigo o [Conventional Commits](https://www.conventionalcommits.org/). Cada commit descreve **o que**
mudou e **por que** — não como.

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
<summary>✅ Good</summary>

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

- Imperativo: `add`, `fix`, `remove`, `update` — não `added`, `fixing`, `removes`
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

## Deploy e Release

Deploy (implantação) e release (lançamento) são eventos independentes.

- **Deploy**: código vai para produção automaticamente após merge na `main` com pipeline (esteira)
  verde
- **Release**: funcionalidade fica visível ao usuário — controlada por feature flag (liga/desliga)

Novas features (funcionalidades) sobem desativadas. Ativação é gradual: por ambiente, percentual ou
grupo específico.

## Incidentes e Correções

| Situação                  | Ação                                              |
| ------------------------- | ------------------------------------------------- |
| Bug em produção           | Abrir PR na `main` com o fix — **fix forward**    |
| Feature causando problema | Desativar a feature flag — sem rollback de código |
| Sistema indisponível      | Rollback como exceção crítica — último recurso    |

A `main` representa sempre o estado mais recente e funcional do sistema. Rollback de código viola
esse invariante e só é justificável quando o sistema está indisponível e o fix forward é inviável.

## Pipeline de Desenvolvimento

O mesmo código é promovido de ambiente em ambiente — sem rebuilds, sem branches por ambiente.

<img src="../../assets/dev-pipeline-linear-flow.svg" alt="dev-pipeline-linear-flow" width="540" />

| Ambiente  | Responsabilidade                                                        |
| --------- | ----------------------------------------------------------------------- |
| `dev`     | Primeira validação após merge — comportamento básico, sem regressão     |
| `qa`      | Validação funcional completa — cenários reais, integrações e edge cases |
| `staging` | Ambiente espelho de prod — última barreira antes da entrega real        |
| `prod`    | Entrega final — observabilidade ativa nos primeiros minutos após deploy |

### Pós-deploy

O deploy não encerra o ciclo. Após cada promoção para `prod`:

- Monitorar logs e métricas por tempo determinado (ex: 15–30 min)
- Confirmar que a feature flag está desativada se a feature ainda não é pública
- Validar o comportamento esperado com um smoke test manual ou automatizado
- Só encerrar o acompanhamento após estabilização
