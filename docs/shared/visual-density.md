# Visual Density

Código é lido muito mais vezes do que escrito. Densidade visual é sobre agrupar o que pertence junto e separar o que é distinto, sem precisar de comentários para guiar o olho.

## Referência rápida

| Regra | Descrição |
|---|---|
| **Máx 2 linhas por grupo** | Nunca 3+ linhas consecutivas sem blank: quebrar no meio: 2+1 ou 2+2 |
| **`return` separado** | Blank antes do `return` quando há múltiplos passos antes dele |
| **Declaração + guarda = 1 par** | A variável e o `if` que a valida ficam juntos; blank vem depois do par |
| **Strings longas** | Extrair fragmentos em variáveis nomeadas antes de montar o resultado |
| **Nunca duplo blank** | Exatamente uma linha em branco entre grupos: duas é ruído |

## A regra central

**Máximo 2 linhas consecutivas por grupo.** Linhas relacionadas ficam juntas. Passos distintos são separados por exatamente uma linha em branco. Nunca duas linhas em branco: é ruído, não respiro.

## `return` sempre separado

O `return` encerra uma função; visualmente, ele pertence a um parágrafo próprio quando há mais de um passo antes dele. Se a função tem só uma linha, o `return` fica junto.

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam um par semântico. A linha em branco vem **depois** do par, não entre eles.

## 3 linhas viram 2+1, 4 linhas viram 2+2

Quando um bloco tem 3 ou 4 linhas relacionadas sem nenhuma separação, quebre no meio. Cada parte torna-se identificável.

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter no máximo 2 linhas antes de um respiro.

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

---

## Por linguagem

Os mesmos princípios com exemplos idiomáticos de cada stack:

- [JavaScript](../javascript/conventions/visual-density.md)
- [C#](../csharp/conventions/visual-density.md)
- [CSS](../css/conventions/visual-density.md)
- [SQL](../sql/conventions/visual-density.md)
