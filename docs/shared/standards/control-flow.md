# Control Flow

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Controle de fluxo evolui com a complexidade. A ferramenta certa depende de quantas condições
existem, se mapeiam valores ou executam ações, e se o fluxo pode precisar de saída antecipada.
O princípio é sempre o mesmo: sair cedo na falha, nunca aninhar o caminho feliz.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Guard clause** (cláusula de guarda) | Condição que retorna cedo na falha, antes do caminho feliz |
| **Early return** (retorno antecipado) | Saída imediata que elimina o `else` e reduz profundidade de indentação |
| **Arrow antipattern** (pirâmide de condições) | Aninhamento excessivo de `if/else` que enterra a lógica principal |
| **Ternário** | Operador inline `condição ? valorVerdadeiro : valorFalso`; limitado a duas alternativas |
| **Lookup table** (tabela de mapeamento) | Objeto, mapa ou dicionário que substitui chains de `if` para mapeamento de chave → valor |
| **Fallthrough** (queda entre casos) | Execução automática do próximo `case` em `switch`; bug silencioso quando acidental |
| **Exhaustiveness check** (verificação de exaustividade) | Garantia de que todos os casos de um tipo são tratados; o compilador avisa quando um falta |
| **Circuit break** (saída antecipada de laço) | Encerramento do laço no primeiro resultado relevante, sem percorrer o restante |

## Quando usar cada ferramenta

Ordem crescente de complexidade. Prefira sempre a ferramenta mais simples que resolve o problema.

| Ferramenta | Quando usar |
|---|---|
| `if/else` | Dois caminhos mutuamente exclusivos; nunca use `else` após um `return` |
| Ternário | Atribuição de dois valores possíveis em uma linha; nunca aninhar |
| Guard clause | Saída antecipada na falha; mantém o caminho feliz sem indentação extra |
| Lookup / Map / Dictionary | Mapeamento estático de chave → valor com 3 ou mais entradas; substitui `if/else` chain |
| `switch` / `match` / `when` | Três ou mais casos sobre o mesmo valor; ação por caso ou mapeamento com exaustividade garantida |
| Circuit break (`find`, `some`, `any`) | Busca ou verificação que para no primeiro match; não percorre o restante |
| `for` / `for-in` / `foreach` | Iteração com efeito colateral por item; sem índice quando o índice não é usado |
| `while` | Critério de parada por condição, sem coleção pré-definida |
| `do-while` | Primeira execução garantida antes de verificar a condição |

## Veja também

Cada linguagem tem o guia específico com os construtores nativos e exemplos BAD/GOOD:

[JavaScript](../../javascript/conventions/control-flow.md) ·
[TypeScript](../../typescript/conventions/control-flow.md) ·
[C#](../../csharp/conventions/control-flow.md) ·
[VB.NET](../../vbnet/conventions/control-flow.md) ·
[Python](../../python/conventions/control-flow.md) ·
[Go](../../go/conventions/control-flow.md) ·
[PHP](../../php/conventions/control-flow.md) ·
[Kotlin](../../kotlin/conventions/control-flow.md) ·
[Swift](../../swift/conventions/control-flow.md) ·
[Dart](../../dart/conventions/control-flow.md)
