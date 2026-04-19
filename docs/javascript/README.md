# JavaScript

JavaScript é a linguagem usada para ilustrar os fundamentos deste guia. A maioria dos princípios
aqui — nomes expressivos, guard clauses, funções pequenas, fluxo linear — são transportáveis para
qualquer linguagem.

## Setup

Configuração inicial de um projeto Node.js — estrutura, módulos e pipeline.

| Tópico                                            | Conceitos                                   |
| ------------------------------------------------- | ------------------------------------------- |
| [Security](setup/security.md)                     | Secrets, env vars, dotenv, cadeia de config |
| [Project Foundation](setup/project-foundation.md) | Entry point, módulos, config, pipeline      |

## Code Style

| Tópico                                          | Conceitos                                      |
| ----------------------------------------------- | ---------------------------------------------- |
| [Variables](conventions/variables.md)           | `const`, `let`, imutabilidade por padrão       |
| [Naming](conventions/naming.md)                 | camelCase, UPPER_CASE, ordem semântica, inglês |
| [Functions](conventions/functions.md)           | Tamanho, top-down, direct return               |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, early return, iterações         |
| [Error Handling](conventions/error-handling.md) | Erros tipados, try/catch nas fronteiras        |
| [Async](conventions/async.md)                   | async/await, evitar bloqueio                   |
| [Testing](conventions/testing.md)               | AAA, semantic assert, isolamento               |
| [Performance](conventions/performance.md)       | `for...of`, `Set`, string building              |
| [Observability](conventions/observability.md)   | Logging estruturado, níveis, PII, correlationId |
| [Validation](conventions/validation.md)         | Sanitize, Zod, regras de negócio, output filter |
| [Dates](conventions/dates.md)                   | UTC, ISO 8601, parsing, Temporal API            |
| [Quick Reference](quick-reference.md)           | Nomenclatura, verbos, taboos                   |

## Princípios

| Princípio                                                                                           | Descrição                                                            |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                       | Código universal, nomes curtos e sem ambiguidade                     |
| [Código narrativo](conventions/functions.md#god-function--múltiplas-responsabilidades)              | O código conta a história, sem precisar de comentários               |
| [Ponto de entrada limpo](conventions/functions.md#ponto-de-entrada-limpo)                           | Caller de uma linha — o quê, não o como                              |
| [Orquestrador no topo](conventions/functions.md#god-function--múltiplas-responsabilidades)          | Chamada visível antes dos detalhes — top-down                        |
| [Detalhes abaixo](conventions/functions.md#direct-return)                                           | Helpers ficam abaixo do orquestrador — step-down rule                |
| [Retorno antecipado](conventions/control-flow.md#else-após-return)                                  | Guard clauses no topo, fluxo principal livre                         |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata--arrow-antipattern)               | Guard clauses sobre condicionais aninhadas                           |
| [Baixa densidade visual](conventions/functions.md#baixa-densidade-visual)                           | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                          | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#código-como-documentação)                          | Nomes substituem comentários — comentários mentem                    |
| [Funções pequenas](conventions/functions.md#sla--orquestrador-ou-implementação-nunca-os-dois)       | Uma responsabilidade, um nível de abstração                          |
| [Cálculo vs formatação](conventions/functions.md#separar-cálculo-de-formatação)                     | Computar dados e formatar saída em funções separadas                 |
| [CQS](conventions/variables.md#mutação-direta-de-objetos)                                           | Separar comando de consulta, sem efeitos colaterais ocultos          |
| [Dependências explícitas](conventions/async.md#api-client-centralizado)                             | Injetar via parâmetros, evitar estado global                         |
| [Imutabilidade por padrão](conventions/variables.md#let-desnecessário)                              | `const` primeiro, `let` só quando necessário                         |
| [Sem valores mágicos](conventions/variables.md#evitar-valores-mágicos)                              | Constantes nomeadas no lugar de números e strings soltos             |
| [Falhar rápido](conventions/error-handling.md#múltiplos-tipos-de-retorno)                           | Validar cedo, interromper fluxo inválido                             |
| [Contratos consistentes](conventions/error-handling.md#baseerror--abstração-centralizada)           | Respostas padronizadas, sempre o mesmo formato                       |
| [Retorno explícito](conventions/error-handling.md#exceção-como-controle-de-fluxo)                   | Evitar exceções como controle de fluxo                               |
| [Tratamento centralizado de erros](conventions/error-handling.md#baseerror--abstração-centralizada) | Classes de erro tipadas, try/catch nas fronteiras                    |
| [I/O assíncrono](conventions/async.md#callback-hell)                                                | `async/await`, sem bloqueio                                          |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                             | Variável expressiva antes do `return`, simétrica à entrada           |
| [Estilo vertical](conventions/functions.md#estilo-vertical--parâmetros)                             | Até 3 parâmetros por linha — 4+ usa objeto                           |
| [Testes estruturados](conventions/testing.md#fases-misturadas--aaa)                                 | AAA — fases explícitas; assert limpo — sem expressões inline         |
