# Testes

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Testes documentam o comportamento esperado numa forma que a máquina consegue conferir. Um teste que falha precisa contar quem chamou, o que recebeu e o que esperava receber. Quando o teste não deixa isso legível, ele continua verificando o código, mas deixa de documentá-lo.

## Conceitos fundamentais

| Conceito                                                 | O que é                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | Estrutura de três fases para cada teste: montagem do contexto, execução e verificação do resultado                                 |
| **Unit test** (teste unitário)                           | Teste de uma função em isolamento, sem I/O real; dependências externas são substituídas por doubles                                |
| **Integration test** (teste de integração)               | Teste com infraestrutura real (banco, rede, fila) para verificar que os componentes funcionam juntos                               |
| **Doubles** (substitutos de teste)                       | Substitutos de dependências externas: stubs (retornam valor fixo), mocks (verificam interação), fakes (implementação simplificada) |
| **Fixture** (dado de teste pré-definido)                 | Contexto ou dado passado para configurar o estado do teste                                                                         |
| **actual** (valor atual)                                | O que o código devolveu de fato na execução do teste; é o valor que está sob verificação                                           |
| **expected** (valor esperado)                            | O que o código deveria ter devolvido; é o valor que você escreve à mão no teste, como referência                                   |
| **cyclomatic complexity** (complexidade ciclomática)     | Número de caminhos independentes em uma função; equivale ao mínimo de casos de teste necessários para cobertura de ramificações    |

## As três fases de um teste

O padrão **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) tem três fases lógicas, mas apenas duas partes visuais. As declarações (o contexto, a execução e os valores nomeados) formam um bloco só. Uma linha em branco isola a asserção.

```
[Arrange]  montar o contexto: entidades, inputs, dependências
[Act]      executar o comportamento e nomear actual/expected

[Assert]   comparar com variáveis nomeadas
```

Essa separação visual faz parte do padrão. A linha em branco antes da asserção diz onde o preparo termina e a verificação começa. Sem ela, as fases se misturam e o leitor precisa descobrir sozinho onde uma acaba e a outra começa, antes mesmo de entender o que está sendo testado.

### Nada de lógica dentro da asserção

A asserção segue o mesmo princípio do retorno explicativo no código: nomeie os valores antes de comparar. Ela deve se ler como uma frase, sem cálculo nem acesso a propriedade no meio.

| Anti-pattern                          | Problema                                                            |
| ------------------------------------- | ------------------------------------------------------------------- |
| `assert(calculate(100, 10), 90)`      | Literal inline: a falha não diz o que era esperado                  |
| `assert(result.price, getExpected())` | Lógica na comparação: dois pontos de falha simultâneos              |
| `assert(result.items.length, 3)`      | Acesso de propriedade inline: a falha mostra o caminho, não o valor |

`actual` e `expected` são declarados antes da asserção, sempre. Mesmo quando o valor já carrega um nome, declarar `expected` de forma explícita mantém o padrão previsível e a comparação sem ambiguidade.

### Nome do teste

O nome descreve o cenário e o resultado esperado. Prefixos como `should`, `test_` ou `given/when/then` ocupam espaço sem informar nada.

| Evitar                   | Usar                                               |
| ------------------------ | -------------------------------------------------- |
| `should apply discount`  | `applies 10% discount when order exceeds minimum`  |
| `test validation`        | `throws ValidationError when discount is negative` |
| `applyDiscount function` | `returns original price when no discount applies`  |

### Cada teste monta o próprio contexto

Nenhum teste depende de outro para funcionar, e a ordem de execução não pode importar. Estado compartilhado entre testes cria um acoplamento difícil de perceber: a falha só aparece em determinada ordem e não se reproduz quando o teste roda sozinho.

## Testes unitários

Verificam o comportamento de uma unidade isolada: uma função, um método, uma classe. Sem banco, sem rede, sem sistema de arquivos. Quando há dependência externa, ela é substituída por um double (stub, mock ou fake).

A velocidade é a característica central. Rodam em milissegundos e não pedem infraestrutura, o que os torna a ferramenta certa para feedback imediato durante o desenvolvimento e para cobrir casos de borda à exaustão.

| Característica    | Detalhe                                                 |
| ----------------- | ------------------------------------------------------- |
| Velocidade        | Alta: sem I/O (Entrada/Saída)                           |
| Isolamento        | Total: dependências externas substituídas               |
| Cobertura natural | Regras de negócio, transformações, validações, cálculos |
| Quando falha      | Indica bug na lógica da unidade testada                 |

## Testes de integração

Verificam se múltiplos componentes funcionam juntos, usando infraestrutura de verdade: banco de dados, APIs externas, filas, sistema de arquivos.

O custo é o setup: precisam de ambiente, demoram mais e têm mais variáveis envolvidas. Em troca, verificam o que o teste unitário não alcança: se a **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) gerada está correta, se a migration não quebrou o mapeamento, se o endpoint devolve o contrato esperado.

| Característica    | Detalhe                                              |
| ----------------- | ---------------------------------------------------- |
| Velocidade        | Baixa: com I/O real                                  |
| Isolamento        | Parcial: envolve infraestrutura                      |
| Cobertura natural | Limites entre componentes e sistemas externos        |
| Quando falha      | Indica problema na integração, não na lógica isolada |

Um erro comum é usar muitos mocks para simular o banco num teste "unitário" de repositório. O repositório existe para conversar com o banco, então testá-lo contra um banco falso verifica quase nada. Repositório é candidato natural a teste de integração.

## Unitário ou integração?

O que separa os dois é a pergunta que cada um responde. O unitário verifica se a lógica está correta. O de integração verifica se as peças funcionam juntas com infraestrutura real. Os dois são necessários e cobrem coisas diferentes.

```
lógica isolada (funções, cálculos, validações) → unitário
limite com I/O real (banco, rede, fila)        → integração
```

| Cenário                                        | Tipo certo |
| ---------------------------------------------- | ---------- |
| Regra de desconto com múltiplos casos de borda | Unitário   |
| Query SQL retorna os registros corretos        | Integração |
| Validação de entrada com 10 casos inválidos    | Unitário   |
| Endpoint cria pedido e persiste no banco       | Integração |
| Cálculo de frete por CEP e peso                | Unitário   |
| Worker de fila processa mensagem completa      | Integração |

## Complexidade ciclomática

A **cyclomatic complexity** (complexidade ciclomática) conta quantos caminhos independentes existem dentro de uma função. Uma função em linha reta tem complexidade 1, e cada `if`, `else if`, `case`, laço, `&&`, `||` e `catch` soma mais um.

| Faixa | Avaliação                                             |
| ----- | ----------------------------------------------------- |
| 1–10  | Simples; fácil de testar e manter                    |
| 11–20 | Moderada; requer atenção                             |
| 21–50 | Alta; difícil de testar; candidato a refatoração     |
| > 50  | Intratável; cobertura completa é inviável na prática |

Isso tem consequência direta no teste: uma função de complexidade N exige pelo menos N casos para cobrir todas as ramificações. Complexidade alta também concentra risco, porque uma mudança pequena passa a atingir vários caminhos de uma vez.

Passou de 10, as saídas são as mesmas que valem para funções longas:

- extrair a lógica condicional em funções menores, cada uma com uma responsabilidade
- trocar o `switch` extenso por uma tabela de despacho (dispatch table) ou pelo padrão
  **Strategy**
- usar guard clauses para eliminar aninhamento

## Por linguagem

- [JavaScript](../../javascript/conventions/advanced/testing.md)
- [TypeScript](../../typescript/conventions/advanced/testing.md)
- [C#](../../csharp/conventions/advanced/testing.md)
- [VB.NET](../../vbnet/conventions/advanced/testing.md)
