# Python

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://docs.python.org/3.14/)

As convenções de Python aplicando os mesmos princípios do guia. Os exemplos usam Python 3.14 como referência, e as diferenças que importam em versões anteriores estão marcadas onde aparecem.

→ [Referência rápida](quick-reference.md): nomes, verbos, o que evitar, type hints, strings, desempacotamento

## Setup

A configuração inicial de um projeto Python: estrutura, ferramentas e segurança.

| Tópico                                            | Conceitos                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| [Base do projeto](setup/project-foundation.md) | pyproject.toml, venv, estrutura de módulos, ponto de entrada        |
| [Segurança](setup/security.md)                     | segredos, variáveis de ambiente, pydantic-settings, cadeia de configuração   |

## Fundamentos

| Tópico                                            | Conceitos                                                    |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [Variáveis](conventions/variables.md)             | `Final`, `dataclass(frozen=True)`, t-string e f-string, pathlib |
| [Nomes](conventions/naming.md)                   | snake_case, PascalCase, UPPER_SNAKE, `_privado`, booleano     |
| [Funções](conventions/functions.md)             | um nível de abstração, orquestrador, guarda de entrada, retorno direto              |
| [Controle de fluxo](conventions/control-flow.md)       | guarda de entrada, retorno antecipado, match/case, comprehension      |
| [Densidade visual](conventions/visual-density.md)   | agrupamento de linhas, retorno isolado, fases da função      |

## Avançados

| Tópico                                                         | Conceitos                                            |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [Tratamento de erro](conventions/advanced/error-handling.md)      | exceções tipadas, hierarquia, limites do sistema             |
| [Assíncrono](conventions/advanced/async.md)                        | asyncio, async/await, gather, evitar o bloqueio        |
| [Testes](conventions/advanced/testing.md)                    | pytest, AAA, fixtures, assert que descreve a regra              |
| [Performance](conventions/advanced/performance.md)            | generator, set, join, evitar cópia desnecessária  |
| [Observabilidade](conventions/advanced/observability.md)        | log estruturado, níveis, dado pessoal, correlation_id     |
| [Validação](conventions/advanced/validation.md)              | Pydantic, validação no limite, filtro de saída      |
| [Datas](conventions/advanced/dates.md)                        | datetime com fuso, zoneinfo, ISO 8601, strptime         |
| [Modelagem de entidades](conventions/advanced/entity-modeling.md)    | `NewType` para IDs, `@dataclass(frozen=True)`, `Sequence[T]` só de leitura, `classmethod` como fábrica |

## Frameworks

| Tópico                             | Conceitos                                                      |
| ---------------------------------- | -------------------------------------------------------------- |
| [FastAPI](frameworks/fastapi.md)   | router, schema, rota, injeção de dependência, assíncrono   |
| [HTMX](frameworks/htmx.md)         | fragmento, hx-target, hx-swap, atualização fora do alvo, indicador de carga          |
| [Reflex](frameworks/reflex.md)     | State, computed var, handler de evento, componente, Python 3.14  |

## MicroPython / IoT

| Tópico                                                       | Conceitos                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [MicroPython](conventions/advanced/micropython.md)           | diferenças da biblioteca padrão, limites de hardware, asyncio, watchdog        |

→ Padrões de domínio IoT (debounce, máquina de estados, alertas): [shared/platform/iot.md](../shared/platform/iot.md)

## Princípios

**Forma**: a estrutura e a narrativa da função

| Princípio                                                                                    | Descrição                                                            |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#portuguese-names)                                | Nomes curtos, sem ambiguidade, legíveis para qualquer time           |
| [snake_case nativo](conventions/naming.md#case-conventions)                                | Identificadores em snake_case; classes em PascalCase                 |
| [Nomes expressivos](conventions/naming.md#meaningless-identifiers)                   | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#code-as-documentation)                   | O nome extraído acompanha a mudança; o comentário fica para trás     |
| [Orquestrador no topo](conventions/functions.md#god-function)    | A chamada aparece antes dos detalhes, de cima para baixo             |
| [Um nível de abstração](conventions/functions.md#single-level-of-abstraction)              | Uma responsabilidade por função, num só nível de detalhe             |
| [Sem lógica no retorno](conventions/functions.md#no-logic-in-return)                      | O retorno dá nome a um resultado já pronto                           |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                    | Descrição                                                            |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-and-else)                                  | Sai cedo na falha, e o `else` depois do `return` some                |
| [Fluxo linear](conventions/control-flow.md#nested-conditionals)                           | O aninhamento em cascata vira fluxo plano                            |
| [Baixa densidade visual](conventions/visual-density.md#core-rule)                     | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Valor fixo por padrão](conventions/variables.md#direct-mutation)                             | `Final` e `frozen=True`: alterar exige um passo explícito            |
| [Sem valores mágicos](conventions/variables.md#magic-values)                              | Constantes nomeadas no lugar do literal solto no meio do código      |
| [Consulta separada de escrita](conventions/variables.md#direct-mutation)                                               | A função devolve o novo estado, sem efeito colateral escondido       |

<br>

**Controle de qualidade**: estado, erros, código assíncrono e testes

| Princípio                                                                                           | Descrição                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Exceções tipadas](conventions/advanced/error-handling.md#exception-as-string)                     | Subclasses de `Exception`, identificáveis e tratáveis        |
| [Falhar cedo](conventions/advanced/error-handling.md#multiple-return-types)                  | Validar na entrada e interromper o fluxo inválido            |
| [Erro tratado no limite](conventions/advanced/error-handling.md#swallowed-error)              | `try/except` nos limites do sistema, propagando com contexto |
| [Entrada e saída assíncronas](conventions/advanced/async.md#blocking-sync-call)                                  | `async`/`await`, sem travar o event loop                     |
| [Concorrência explícita](conventions/advanced/async.md#gather-parallel-execution)                   | `asyncio.gather` para chamadas independentes em paralelo     |
| [Testes estruturados](conventions/advanced/testing.md#mixed-phases-aaa)                        | AAA: as três fases visíveis, com assert limpo                |
