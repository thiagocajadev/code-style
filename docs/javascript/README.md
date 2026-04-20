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

## Fundamentos

| Tópico                                          | Conceitos                                                       |
| ----------------------------------------------- | --------------------------------------------------------------- |
| [Variables](conventions/variables.md)           | `const`, `let`, imutabilidade por padrão                        |
| [Naming](conventions/naming.md)                 | camelCase, UPPER_CASE, ordem semântica, inglês                  |
| [Functions](conventions/functions.md)           | Tamanho, top-down, direct return                                |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, early return, iterações                          |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de método         |

## Avançados

| Tópico                                                      | Conceitos                                       |
| ----------------------------------------------------------- | ----------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)   | Erros tipados, try/catch nas fronteiras         |
| [Async](conventions/advanced/async.md)                     | async/await, evitar bloqueio                    |
| [Testing](conventions/advanced/testing.md)                 | AAA, semantic assert, isolamento                |
| [Performance](conventions/advanced/performance.md)         | `for...of`, `Set`, string building              |
| [Observability](conventions/advanced/observability.md)     | Logging estruturado, níveis, PII, correlationId |
| [Validation](conventions/advanced/validation.md)           | Sanitize, Zod, regras de negócio, output filter |
| [Dates](conventions/advanced/dates.md)                     | UTC, ISO 8601, parsing, Temporal API            |
| [Quick Reference](quick-reference.md)                      | Nomenclatura, verbos, taboos                    |

## Princípios

**Forma** — estrutura e narrativa da função

| Princípio                                                                                                        | Descrição                                                            |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                                    | Código universal, nomes curtos e sem ambiguidade                     |
| [Código narrativo](conventions/functions.md#god-function--múltiplas-responsabilidades)                           | O código conta a história, sem precisar de comentários               |
| [Ponto de entrada limpo](conventions/functions.md#ponto-de-entrada-limpo)                                        | Caller de uma linha — o quê, não o como                              |
| [Estilo vertical](conventions/functions.md#estilo-vertical--parâmetros)                                          | Até 3 parâmetros por linha — 4+ usa objeto                           |
| [Orquestrador no topo](conventions/functions.md#god-function--múltiplas-responsabilidades)                       | Chamada visível antes dos detalhes — top-down                        |
| [Detalhes abaixo](conventions/functions.md#direct-return)                                                        | Helpers ficam abaixo do orquestrador — step-down rule                |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                                          | Saída de uma linha — o retorno nomeia o resultado, não o computa     |

<br>

**Legibilidade** — fluxo, densidade visual e nomes

| Princípio                                                                                             | Descrição                                                            |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                           | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata)                                    | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/functions.md#baixa-densidade-visual)                             | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                            | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#código-como-documentação)                            | Nomes substituem comentários — comentários mentem                    |
| [Sem valores mágicos](conventions/variables.md#evitar-valores-mágicos)                                | Constantes nomeadas no lugar de números e strings soltos             |

<br>

**Controle de Qualidade** — estado, erros, async e testes

| Princípio                                                                                                        | Descrição                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Funções pequenas](conventions/functions.md#sla--orquestrador-ou-implementação-nunca-os-dois)                    | Uma responsabilidade, um nível de abstração                  |
| [Cálculo vs formatação](conventions/functions.md#separar-cálculo-de-formatação)                                  | Computar dados e formatar saída em funções separadas         |
| [Imutabilidade por padrão](conventions/variables.md#let-desnecessário)                                           | `const` primeiro, `let` só quando necessário                 |
| [CQS](conventions/variables.md#mutação-direta-de-objetos)                                                        | Separar comando de consulta, sem efeitos colaterais ocultos  |
| [Dependências explícitas](conventions/advanced/async.md#api-client-centralizado)                                 | Injetar via parâmetros, evitar estado global                 |
| [Falhar rápido](conventions/advanced/error-handling.md#múltiplos-tipos-de-retorno)                               | Validar cedo, interromper fluxo inválido                     |
| [Retorno explícito](conventions/advanced/error-handling.md#exceção-como-controle-de-fluxo)                       | Evitar exceções como controle de fluxo                       |
| [Contratos consistentes](conventions/advanced/error-handling.md#baseerror--abstração-centralizada)               | Respostas padronizadas, sempre o mesmo formato               |
| [Tratamento centralizado de erros](conventions/advanced/error-handling.md#baseerror--abstração-centralizada)     | Classes de erro tipadas, try/catch nas fronteiras            |
| [I/O assíncrono](conventions/advanced/async.md#callback-hell)                                                    | `async/await`, sem bloqueio                                  |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas--aaa)                                     | AAA — fases explícitas; assert limpo — sem expressões inline |
