# JavaScript

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2025-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

JavaScript é a linguagem que este guia usa para mostrar os fundamentos, porque ela deixa cada
decisão à vista: nada obriga a nomear bem, a sair cedo de uma função ou a manter o fluxo plano.
O que você aprende aqui viaja com você. Nomes expressivos, guard clauses, funções pequenas e
fluxo linear valem igual em C#, Python ou Go, e cada página aponta o equivalente na outra
linguagem quando ele existe.

→ [Referência rápida](quick-reference.md): nomenclatura, verbos, nomes proibidos, tipos, controle de fluxo

## Setup

O que se decide antes da primeira linha de domínio: onde a configuração é lida, como os módulos
se dividem e onde os segredos ficam.

| Tópico                                                     | Conceitos                                            |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [Fundação do projeto](setup/project-foundation.md)         | Entry point, módulos por domínio, config, middleware |
| [Segurança](setup/security.md)                             | Segredos, variáveis de ambiente, dotenv, JWT         |

## Fundamentos

| Tópico                                              | Conceitos                                               |
| --------------------------------------------------- | ------------------------------------------------------- |
| [Variáveis](conventions/variables.md)               | `const`, `let`, valor fixo por padrão                   |
| [Nomes](conventions/naming.md)                      | camelCase, UPPER_CASE, ordem semântica, inglês          |
| [Funções](conventions/functions.md)                 | Tamanho, top-down, retorno direto                       |
| [Controle de fluxo](conventions/control-flow.md)    | Guard clauses, retorno antecipado, iterações            |
| [Densidade visual](conventions/visual-density.md)   | Agrupamento de linhas, return separado, fases do método |

## Avançados

| Tópico                                                         | Conceitos                                                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [Tratamento de erros](conventions/advanced/error-handling.md)  | Erros tipados, try/catch nos limites do sistema                                                             |
| [Programação assíncrona](conventions/advanced/async.md)        | async/await, evitar bloqueio                                                                                |
| [Testes](conventions/advanced/testing.md)                      | AAA, assert com significado, isolamento                                                                     |
| [Performance](conventions/advanced/performance.md)             | `for...of`, `Set`, montagem de string                                                                       |
| [Observabilidade](conventions/advanced/observability.md)       | Log estruturado, níveis, PII, correlationId                                                                 |
| [Validação](conventions/advanced/validation.md)                | Sanitize, Zod, regras de negócio, filtro de saída                                                           |
| [Datas](conventions/advanced/dates.md)                         | UTC, ISO 8601, interpretação de texto, Temporal API                                                         |
| [Modelagem de entidades](conventions/advanced/entity-modeling.md) | Ponteiro enxuto ao canônico shared, privacidade com `#field`, `Object.freeze`, `Symbol.iterator`, `instanceof` no limite |
| [Referência rápida](quick-reference.md)                        | Nomenclatura, verbos, nomes proibidos                                                                        |

## Frameworks

| Tópico                                                  | Conceitos                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| [Bot Discord](frameworks/bot/discord.md)                | discord.js: conexão ao Gateway, intents, slash commands, embeds     |
| [Bot Telegram](frameworks/bot/telegram.md)              | Telegraf: comandos, botões inline, middleware, webhook              |
| [Bot WhatsApp](frameworks/bot/whatsapp.md)              | Baileys e Meta Cloud API: sessão, webhook, mensagem por template    |
| [Bot Slack](frameworks/bot/slack.md)                    | Bolt for JS: ack em 3s, eventos, Block Kit, Socket Mode             |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio                                                                                                        | Descrição                                                            |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#nomes-em-português)                                                    | Código universal, nomes curtos e sem ambiguidade                     |
| [Código narrativo](conventions/functions.md#função-que-faz-tudo-várias-responsabilidades)                       | O código conta a história, sem precisar de comentários               |
| [Ponto de entrada limpo](conventions/functions.md#ponto-de-entrada-limpo)                                        | Caller de uma linha: o quê, não o como                               |
| [Estilo vertical](conventions/functions.md#estilo-vertical-parâmetros)                                          | Até 3 parâmetros por linha; 4+ usa objeto                            |
| [Orquestrador no topo](conventions/functions.md#função-que-faz-tudo-várias-responsabilidades)                   | Chamada visível antes dos detalhes (top-down)                        |
| [Detalhes abaixo](conventions/functions.md#retorno-direto)                                                        | Helpers ficam abaixo do orquestrador (step-down rule)                |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                                          | Saída de uma linha: o retorno nomeia o resultado, não o computa      |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                             | Descrição                                                            |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                           | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#aninhamento-em-cascata)                                    | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/functions.md#baixa-densidade-visual)                             | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                            | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#código-como-documentação)                            | Nomes substituem comentários; comentários mentem                     |
| [Sem valores mágicos](conventions/variables.md#evitar-valores-mágicos)                                | Constantes nomeadas no lugar de números e strings soltos             |

<br>

**Controle de qualidade**: estado, erros, async e testes

| Princípio                                                                                                        | Descrição                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Funções pequenas](conventions/functions.md#um-nível-de-abstração-por-função)                                   | Uma responsabilidade, um nível de abstração                  |
| [Cálculo vs formatação](conventions/functions.md#separar-cálculo-de-formatação)                                  | Computar dados e formatar saída em funções separadas         |
| [Valor fixo por padrão](conventions/variables.md#let-desnecessário)                                              | `const` primeiro, `let` só quando necessário                 |
| [CQS](conventions/variables.md#alteração-direta-de-objetos)                                                        | Separar comando de consulta, sem efeitos colaterais ocultos  |
| [Dependências explícitas](conventions/advanced/async.md#cliente-de-api-centralizado)                             | Injetar via parâmetros, evitar estado global                 |
| [Falhar rápido](conventions/advanced/error-handling.md#múltiplos-tipos-de-retorno)                               | Validar cedo, interromper fluxo inválido                     |
| [Retorno explícito](conventions/advanced/error-handling.md#exceção-como-controle-de-fluxo)                       | Evitar exceções como controle de fluxo                       |
| [Contratos consistentes](conventions/advanced/error-handling.md#baseerror-abstração-centralizada)               | Respostas padronizadas, sempre o mesmo formato               |
| [Tratamento centralizado de erros](conventions/advanced/error-handling.md#baseerror-abstração-centralizada)     | Classes de erro tipadas, try/catch nos limites do sistema    |
| [I/O assíncrono](conventions/advanced/async.md#callbacks-aninhados-sem-controle)                                 | `async/await`, sem bloqueio                                  |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas-aaa)                                     | AAA: fases explícitas; assert limpo: sem expressões inline   |
