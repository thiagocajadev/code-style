# Git avançado: rotina, limpeza de histórico e recuperação

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto. Pré-requisito:
> [git.md](git.md), que cobre nomenclatura de branches, commits convencionais e PRs.

Este guia cobre o Git do dia a dia depois que as convenções já estão claras: a sequência de comandos que fecha uma tarefa, como deixar o histórico legível antes do merge e como sair dos erros que todo mundo comete. A regra que atravessa o arquivo é preferir o caminho que avança o histórico em vez do que reescreve o que já foi publicado.

## Conceitos fundamentais

| Conceito                                    | O que é                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Rebase** (reorganização de commits)       | Reaplica commits de uma branch sobre outro ponto do histórico, produzindo um histórico linear sem commits de merge (mesclagem) extras |
| **Squash** (compactação de commits)         | Agrupa vários commits em um único antes do merge (mesclagem), mantendo o histórico limpo e navegável                                  |
| **Reflog** (registro local de movimentos)   | Histórico interno de todas as posições que HEAD ocupou; usado para recuperar commits aparentemente perdidos                           |
| **Stash** (área temporária)                 | Área temporária que guarda alterações locais sem criar commit, liberando a branch para outra tarefa                                   |
| **Interactive rebase** (rebase interativo)  | Modo de rebase que permite editar, reordenar, compactar ou descartar commits individualmente antes de enviar para review              |
| **git bisect** (busca binária de regressão) | Percorre o histórico em busca do commit que introduziu um bug; funciona bem apenas com histórico linear e commits atômicos            |

## A rotina de uma tarefa, do início ao fim

O ciclo parte da `main` atualizada, usa uma branch com um único propósito e termina com o **PR** (Pull Request · Pedido de Integração) mergeado e a branch removida.

```
pull main → nova branch → commits atômicos → fetch origin/main → merge origin/main → PR → squash and merge → deletar branch
```

| Passo | O que faz |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pull main` | Atualiza a main local antes de criar a branch; garante que você parte do estado mais recente |
| `nova branch` | Isola o trabalho em uma branch com um único propósito: uma feature, uma correção ou uma refatoração |
| `commits atômicos` | Registra cada mudança lógica separadamente durante o desenvolvimento |
| `fetch origin/main` | Baixa as atualizações do remoto sem aplicar nada ainda; permite inspecionar antes de agir |
| `merge origin/main` | Incorpora as mudanças da main na branch sem reescrever histórico; conflitos ficam explícitos aqui |
| `PR` | Envia a branch para review; checks de CI/CD validam antes do merge |
| `squash and merge` | Compacta todos os commits da branch em um único commit limpo na main |
| `deletar branch` | Remove a branch após confirmar que o merge chegou na main e o deploy está estável |

<details>
<summary>❌ Ruim</summary>

```bash
# trabalhar direto na main
git add .
git commit -m "changes"
git push origin main
```

</details>

<details>
<summary>✅ Bom</summary>

```bash
# 1. atualizar main antes de começar
git checkout main
git pull origin main

# 2. criar branch com um único propósito
git checkout -b feat/user-email-verification

# 3. commits atômicos durante o trabalho
git add src/auth/email.js
git commit -m "feat(auth): add email verification token generation"

git add src/auth/email.test.js
git commit -m "test(auth): cover token expiry and reuse scenarios"

# 4. incorporar atualizações da main antes do PR
git fetch origin
git merge origin/main
# sem conflitos: merge commit criado automaticamente
# com conflitos: ver Troubleshooting → Conflitos com a main

# 5. enviar para review
git push origin feat/user-email-verification

# 6. após o merge: aguardar estabilização em produção antes de deletar
git log origin/main --oneline -3

# só então deletar: -d rejeita se a branch não foi mergeada
git branch -d feat/user-email-verification
git push origin --delete feat/user-email-verification
```

</details>

Repare no passo 6: o `-d` minúsculo recusa a deleção se a branch ainda não foi mergeada. É a diferença entre o `-d` e o `-D`, que apaga sem perguntar.

### Trocar de branch no meio de uma tarefa

Quando uma tarefa mais urgente interrompe o trabalho em andamento, o **Stash** guarda as alterações locais sem criar um commit. O código sai da área de trabalho e fica em uma pilha temporária, e a branch volta a ficar limpa para você trocar de contexto.

```
stash → trocar de branch → trabalhar → voltar → stash pop → continuar
```

<details>
<summary>❌ Ruim</summary>

```bash
# commit de WIP polui o histórico e precisa ser limpo antes do PR
git add .
git commit -m "WIP"
git checkout feat/other-priority-task
```

</details>

<details>
<summary>✅ Bom</summary>

```bash
# guardar o estado atual sem commitar
git stash push -m "wip: email verification form"

# trocar para a tarefa prioritária
git checkout feat/other-priority-task

# ... trabalhar, commitar, abrir PR ...

# voltar para a tarefa original
git checkout feat/user-email-verification
git stash pop
```

</details>

## Squash: um commit por PR na main

Um PR com 30 commits fragmentados atrapalha o `git bisect`, que procura o commit que introduziu um bug percorrendo o histórico. O squash compacta o trabalho inteiro da branch em um commit descritivo na hora do merge (mesclagem), e a `main` fica com uma linha por entrega.

```
WIP → fix typo → esqueci de salvar → arrumei → squash → feat(auth): add email verification (#42)
```

<details>
<summary>❌ Ruim: histórico fragmentado no merge</summary>

```
WIP
fix typo
esqueci de salvar
arrumei
mais um ajuste
agora vai
feat: email
```

</details>

<details>
<summary>✅ Bom: GitHub (padrão)</summary>

No PR aberto, clique no dropdown ao lado de "Merge pull request" e selecione **Squash and merge**. O
GitHub abre um editor para ajustar a mensagem antes de confirmar; edite antes de clicar em "Confirm
squash and merge".

```
feat(auth): add email verification on signup (#42)
```

</details>

## O que facilita a vida de quem revisa

Quem revisa o PR lê o código sem o contexto que você tem na cabeça. Os cuidados abaixo custam minutos antes de abrir o PR e economizam horas de idas e vindas depois.

| Prática                                          | Motivo                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Um propósito por PR                              | Reviewer entende o escopo sem precisar deduzir o que está relacionado |
| Título no formato Conventional Commits           | Deixa claro o tipo de mudança antes de abrir o diff                   |
| Descrição com contexto e decisões não óbvias     | Reviewer não precisa perguntar o que você já sabe                     |
| Squash antes do merge                            | Histórico limpo facilita `git bisect` e `git blame` no futuro         |
| Checks verdes antes de pedir review              | Não transfere trabalho de validação para o reviewer                   |
| PR pequeno (menos de 400 linhas como referência) | Diffs grandes cansam e geram reviews superficiais                     |

<details>
<summary>❌ Ruim</summary>

```
título: update
descrição: (vazia)
commits: WIP, fix, arrumei, agora vai, update 2
checks: falhando
linhas alteradas: 1.200
```

</details>

<details>
<summary>✅ Bom</summary>

```
título: feat(auth): add email verification on signup

descrição:
Adiciona verificação de e-mail no cadastro. Token expira em 24h.
Optei por gerar o token no backend para evitar previsibilidade no cliente.

commits: 1 commit limpo via squash
checks: todos verdes
linhas alteradas: 180
```

</details>

A linha que separa os dois exemplos é a segunda do bom: a descrição registra a decisão que o diff sozinho não explica, e quem revisa deixa de perguntar por que o token é gerado no backend.

## Quando algo dá errado

### O que nunca fazer

Cada comando desta tabela destrói trabalho de um jeito que o Git não desfaz sozinho.

| Ação                                       | Consequência                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `git push --force origin main`             | Sobrescreve o histórico da main para toda a equipe; perda permanente             |
| `git reset --hard` sem `git stash` antes   | Descarta alterações locais não commitadas sem chance de recuperação              |
| `git clean -fd` sem revisar com `-n` antes | Remove arquivos não rastreados que podem não estar no `.gitignore`               |
| `git rebase` em branch compartilhada       | Reescreve o histórico que outros já baixaram; gera divergências irreconciliáveis |

### Olhar antes de agir

Todo comando destrutivo tem um irmão que só mostra o que aconteceria.

<details>
<summary>✅ Bom</summary>

```bash
# ver o que mudou nos últimos 3 commits antes de resetar
git diff HEAD~3

# histórico resumido da branch atual
git log --oneline -10

# ver quais arquivos mudaram em cada commit
git log --stat -5

# simular limpeza sem executar (dry-run)
git clean -n -fd
```

</details>

O `-n` do último comando lista os arquivos que o `git clean` apagaria e sai sem apagar nada.

### Guardar trabalho temporário

O stash aceita mais de uma entrada e cada uma leva uma descrição.

<details>
<summary>✅ Bom</summary>

```bash
# salvar alterações locais antes de trocar de contexto
git stash push -m "wip: email verification form"

# listar stashes guardados
git stash list

# restaurar o mais recente e removê-lo da lista
git stash pop

# restaurar um stash específico sem removê-lo
git stash apply stash@{1}
```

</details>

O `pop` restaura e remove da pilha; o `apply` restaura e mantém a entrada guardada, útil quando você quer aplicar o mesmo trabalho em duas branches.

### Conflitos com a main

Se a `main` avançou enquanto você trabalhava, incorpore as mudanças na sua branch com um merge commit. O squash no merge do PR limpa esse commit extra depois, então ele não aparece no histórico final.

`main avança → merge main na branch → conflito resolvido → PR → squash`

<details>
<summary>❌ Ruim: rebase de rotina</summary>

```bash
# rebase força --force-push depois e reescreve histórico já publicado
git rebase origin/main
git push --force origin feat/user-email-verification
```

</details>

<details>
<summary>✅ Bom: forward-only</summary>

```bash
# incorporar main na branch com um merge commit
git fetch origin
git merge origin/main

# sem conflitos: Git cria o merge commit automaticamente, pronto para o PR

# com conflitos: resolver cada arquivo, marcar como resolvido e commitar
git status
git add .
git commit -m "chore: merge main into feat/user-email-verification"
```

</details>

O rebase de rotina exige `--force` no push seguinte, porque ele reescreve commits que já estavam publicados. Quem já baixou a sua branch fica com uma versão que o remoto não reconhece mais.

### Recuperar commits perdidos

O **Reflog** registra todas as posições que o HEAD ocupou na sua máquina, inclusive as que nenhum branch aponta mais. Um commit some da árvore, mas continua no reflog por semanas, e é assim que se recupera trabalho depois de um `reset --hard`.

<details>
<summary>✅ Bom</summary>

```bash
# listar todas as posições recentes do HEAD
git reflog

# saída:
# abc1234 HEAD@{0}: rebase: feat(auth): add email verification
# def5678 HEAD@{1}: commit: test(auth): cover token expiry
# ghi9012 HEAD@{2}: commit: feat(auth): add email verification token

# restaurar para um estado anterior
git checkout HEAD@{2}

# criar branch a partir de um commit perdido
git checkout -b recovery/email-verification ghi9012
```

</details>

O reflog é local: ele registra o que aconteceu no seu clone e não viaja no push.

### Rebase como ferramenta de recuperação

O rebase tem lugar em branches **locais**, que ainda não foram publicadas, e em recuperações pontuais. Em branch compartilhada, ele reescreve o histórico que os outros já baixaram.

<details>
<summary>✅ Bom: limpar commits antes do primeiro push</summary>

```bash
# compactar os 4 últimos commits locais em um antes de publicar
git rebase -i HEAD~4

# no editor: manter 'pick' no primeiro, trocar os demais por 's'
# pick abc1234 feat(auth): add email verification token
# s   def5678 fix typo
# s   ghi9012 WIP
# s   jkl3456 forgot test file
```

</details>

<details>
<summary>✅ Bom: remover commit com dado sensível (branch local)</summary>

```bash
# remover um commit específico do histórico antes de publicar
git rebase -i HEAD~3

# no editor: trocar 'pick' por 'd' (drop) no commit com a senha
# d   abc1234 chore: add config (senha exposta aqui)
# pick def5678 feat(auth): add email verification token
```

</details>

O segundo caso vale enquanto o commit não saiu da sua máquina. Se a senha já foi publicada, o caminho começa por rotacionar a credencial, porque o segredo vazou no instante do push e limpar o histórico depois não o torna seguro de novo.

### Corrigir um problema em produção

O primeiro caminho é criar uma branch de fix a partir da `main` e entregar a correção por um PR normal. Ele mantém o histórico avançando e preserva as mudanças de outros devs que chegaram junto com a sua.

`bug identificado → fix/ branch da main → correção → PR → squash and merge → deploy`

<details>
<summary>✅ Bom</summary>

```bash
# 1. partir da main atualizada
git checkout main
git pull origin main

# 2. criar branch de fix focada no problema
git checkout -b fix/user-email-token-expiry

# 3. corrigir e commitar
git add src/auth/email.js
git commit -m "fix(auth): correct token expiry on email verification"

# 4. verificar se a main avançou antes do PR
git fetch origin
git log origin/main --oneline -3

# 5. PR → squash and merge → confirmar deploy → deletar branch
```

</details>

Quando o tempo é crítico e não há janela para review e deploy de um novo PR, o caminho é reverter. É o que a próxima seção cobre.

### Reverter um deploy com problema

O `git revert` cria um novo commit que desfaz o efeito do commit problemático. O original continua no histórico e pode ser inspecionado pelo hash mesmo depois que a branch foi deletada, o que preserva o rastro do que aconteceu.

```
main: estado estável → feat(auth): add email verification → revert: feat(auth) → produção restaurada
```

| Ponto | O que representa |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `estado estável` | Main antes do seu deploy; produção funcionando |
| `feat(auth): add email verification` | Seu squash commit mergeado; introduziu o bug |
| `revert: feat(auth)` | Novo commit criado pelo `git revert` que desfaz o efeito do anterior |
| `produção restaurada` | Main volta ao comportamento do estado estável; seu commit original permanece no histórico |

Com a `main` revertida, produção volta a funcionar e você recupera o tempo de tratar o bug com calma:

<details>
<summary>✅ Bom</summary>

```bash
# 1. reverter o commit problemático na main
git revert <hash-do-squash-commit>
git push origin main

# 2. inspecionar o que estava no commit original (branch já deletada)
git show <hash-do-squash-commit>

# 3. criar branch de fix a partir da main já revertida
git checkout main
git pull origin main
git checkout -b fix/user-email-verification

# 4. corrigir o problema e commitar
git add src/auth/email.js
git commit -m "fix(auth): correct token expiry on email verification"

# 5. incorporar main antes do PR (forward-only)
git fetch origin
git merge origin/main

# 6. PR → squash and merge → aguardar produção → deletar branch
```

</details>

Se o GitHub ainda mostrar o botão "Restore branch", restaure a branch antes de recriar o trabalho na mão. O histórico completo fica disponível por um período depois da deleção.

---

Branches, commits e PRs: [git.md](git.md). Deploy, release e fix-forward: [ci-cd.md](ci-cd.md).
