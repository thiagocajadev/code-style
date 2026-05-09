# Testing

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Testes documentam o comportamento esperado. Um teste que falha conta uma
história: quem chamou, o que recebeu, o que esperava.

## Conceitos fundamentais

| Conceito                                                | O que é                                                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **AAA** (Arrange, Act, Assert, Arrumar, Agir, Atestar) | Estrutura de três fases para cada teste: montagem do contexto, execução e verificação do resultado                                 |
| **Unit test** (teste unitário)                          | Teste de uma função em isolamento, sem I/O real; dependências externas são substituídas por doubles                                |
| **Integration test** (teste de integração)              | Teste com infraestrutura real (banco, rede, fila) para verificar que os componentes funcionam juntos                               |
| **Doubles** (substitutos de teste)                      | Substitutos de dependências externas: stubs (retornam valor fixo), mocks (verificam interação), fakes (implementação simplificada) |
| **Fixture** (dado de teste pré-definido)                | Contexto ou dado passado para configurar o estado do teste                                                                         |
| **Complexidade ciclomática** (cyclomatic complexity)    | Número de caminhos independentes em uma função; equivale ao mínimo de casos de teste necessários para cobertura de ramificações    |

## AAA

O padrão **AAA** (Arrange, Act, Assert, Arrumar, Agir, Atestar) divide cada
teste em três fases explícitas, separadas por uma linha em branco.

```
[Arrange]  montar o contexto: entidades, inputs, dependências

[Act]      executar o comportamento sob teste

[Assert]   verificar o resultado com variáveis nomeadas
```

A separação visual é parte do padrão. Cada linha em branco entre fases é
intencional: sinaliza onde termina o contexto, onde acontece a execução e onde
está a verificação. Um teste sem separação mistura as três fases e obriga o
leitor a identificar os limites antes de entender o que está sendo testado.

### No logic no assert

O assert segue o mesmo princípio do retorno explicativo no código: variáveis
nomeadas antes da comparação. O assert lê como uma frase, sem cálculo nem acesso
de propriedade inline.

| Anti-pattern                          | Problema                                                            |
| ------------------------------------- | ------------------------------------------------------------------- |
| `assert(calculate(100, 10), 90)`      | Literal inline: a falha não diz o que era esperado                  |
| `assert(result.price, getExpected())` | Lógica na comparação: dois pontos de falha simultâneos              |
| `assert(result.items.length, 3)`      | Acesso de propriedade inline: a falha mostra o caminho, não o valor |

`actual` e `expected` são declarados antes do assert, sempre. Mesmo quando o
valor já tem nome, declarar `expected` explicitamente mantém o padrão
consistente e o assert sem ambiguidade.

### Nome do teste

O nome descreve o cenário e o resultado esperado. Prefixos como `should`,
`test_`, `given/when/then` não agregam informação.

| Evitar                   | Usar                                               |
| ------------------------ | -------------------------------------------------- |
| `should apply discount`  | `applies 10% discount when order exceeds minimum`  |
| `test validation`        | `throws ValidationError when discount is negative` |
| `applyDiscount function` | `returns original price when no discount applies`  |

### Isolamento

Cada teste monta seu próprio contexto. Nenhum teste depende de outro para
funcionar: a ordem de execução não deve importar. Estado compartilhado entre
testes é o tipo de acoplamento mais silencioso, pois falhas dependem da ordem de
execução e são difíceis de reproduzir isoladamente.

## Testes Unitários

Verificam o comportamento de uma unidade isolada: uma função, um método, uma
classe. Sem banco, sem rede, sem sistema de arquivos. Dependências externas são
substituídas por doubles (stubs, mocks, fakes) quando necessário.

Velocidade é a característica central: rodam em milissegundos, sem setup de
infraestrutura. Isso os torna adequados para feedback rápido durante o
desenvolvimento e cobertura exaustiva de casos de borda.

| Característica    | Detalhe                                                 |
| ----------------- | ------------------------------------------------------- |
| Velocidade        | Alta: sem I/O (Entrada/Saída)                           |
| Isolamento        | Total: dependências externas substituídas               |
| Cobertura natural | Regras de negócio, transformações, validações, cálculos |
| Quando falha      | Indica bug na lógica da unidade testada                 |

## Testes de Integração

Verificam como múltiplos componentes funcionam juntos, com infraestrutura real:
banco de dados, APIs externas, filas, sistema de arquivos.

O custo é o setup: precisam de ambiente, são mais lentos e têm mais variáveis. O
benefício é verificar o que testes unitários não alcançam: que a query **SQL**
(Structured Query Language, Linguagem de Consulta Estruturada) está correta, que
a migration não quebrou o mapeamento, que o endpoint retorna o contrato
esperado.

| Característica    | Detalhe                                              |
| ----------------- | ---------------------------------------------------- |
| Velocidade        | Baixa: com I/O real                                  |
| Isolamento        | Parcial: envolve infraestrutura                      |
| Cobertura natural | Fronteiras entre componentes e sistemas externos     |
| Quando falha      | Indica problema na integração, não na lógica isolada |

Um erro frequente é usar mocks extensivos para simular o banco em testes
"unitários" de repositório. O repositório existe para falar com o banco:
testá-lo com banco falso verifica quase nada. Repositórios são candidatos
naturais a testes de integração.

## Unitário ou integração?

A distinção é o que cada tipo verifica. Testes unitários verificam se a lógica
está correta. Testes de integração verificam se os componentes funcionam juntos
com infraestrutura real. Os dois são necessários e se complementam.

```
lógica isolada (funções, cálculos, validações) → unitário
fronteira com I/O real (banco, rede, fila)     → integração
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

**Complexidade ciclomática** (cyclomatic complexity) mede o número de caminhos
independentes em uma função. A complexidade mínima é 1 (linha reta); cada `if`,
`else if`, `case`, loop, `&&`, `||` e `catch` soma +1.

| Faixa | Avaliação                                             |
| ----- | ----------------------------------------------------- |
| 1–10  | Simples — fácil de testar e manter                    |
| 11–20 | Moderada — requer atenção                             |
| 21–50 | Alta — difícil de testar; candidato a refatoração     |
| > 50  | Intratável — cobertura completa é inviável na prática |

A métrica tem uma consequência direta nos testes: uma função com complexidade N
exige pelo menos N casos de teste para cobertura de branch (cobertura de
ramificações). Funções com complexidade alta concentram risco — uma mudança
pequena pode quebrar múltiplos caminhos.

Quando a complexidade supera 10, as ações são as mesmas que para funções longas:

- extrair lógica condicional em funções menores com responsabilidade única
- substituir `switch` extenso por tabela de despacho (dispatch table) ou padrão
  **Strategy**
- usar guard clauses para eliminar aninhamento

## Por linguagem

- [JavaScript](../javascript/conventions/advanced/testing.md)
- [TypeScript](../typescript/conventions/advanced/testing.md)
- [C#](../csharp/conventions/advanced/testing.md)
- [VB.NET](../vbnet/conventions/advanced/testing.md)
