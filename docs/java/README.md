# Java

[![Java](https://img.shields.io/badge/Java-25_LTS-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)

Java é uma linguagem de tipagem estática, orientada a objetos, com foco em legibilidade e
segurança. Os princípios deste guia (nomes expressivos, guard clauses, métodos
pequenos, fluxo linear) aplicam-se diretamente ao ecossistema Java moderno: records,
pattern matching (casamento de padrões) e virtual threads (threads virtuais).

→ [Quick Reference](quick-reference.md): nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Java: estrutura, build e pipeline.

| Tópico                                            | Conceitos                                      |
| ------------------------------------------------- | ---------------------------------------------- |
| [Security](setup/security.md)                     | Secrets, env vars, Spring Security, JWT        |
| [Project Foundation](setup/project-foundation.md) | Gradle, estrutura de pacotes, DI, config       |

## Fundamentos

| Tópico                                          | Conceitos                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| [Variables](conventions/variables.md)           | `final` por padrão, records, constantes, valores mágicos        |
| [Naming](conventions/naming.md)                 | PascalCase, camelCase, UPPER_SNAKE_CASE, ordem semântica         |
| [Methods](conventions/methods.md)               | Tamanho, top-down, direct return, parâmetros                     |
| [Types](conventions/types.md)                   | Records, sealed classes, enums, generics                         |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, early return, pattern matching, streams           |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de método          |

## Avançados

| Tópico                                                        | Conceitos                                         |
| ------------------------------------------------------------- | ------------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)      | Exceções tipadas, try-with-resources, fronteiras  |
| [Async](conventions/advanced/async.md)                        | Virtual threads, CompletableFuture, Loom          |
| [Testing](conventions/advanced/testing.md)                    | JUnit 6, AssertJ, Mockito, AAA                    |
| [Performance](conventions/advanced/performance.md)            | Streams vs loops, pré-alocação, String building   |
| [Observability](conventions/advanced/observability.md)        | SLF4J, Logback, Micrometer, MDC, correlationId    |
| [Validation](conventions/advanced/validation.md)              | Jakarta Bean Validation, fronteiras, custom       |
| [Null Safety](conventions/advanced/null-safety.md)            | Optional, Objects.requireNonNullElse, guard       |
| [Dates](conventions/advanced/dates.md)                        | java.time, UTC, ISO 8601, DateTimeFormatter       |
| [Entity Modeling](conventions/advanced/entity-modeling.md)    | `record` para IDs, `sealed interface`, `Optional` em retorno, factory estática |
| [Quick Reference](quick-reference.md)                         | Nomenclatura, verbos, taboos                      |

## Frameworks

| Tópico                                       | Conceitos                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| [Spring Boot](frameworks/spring.md)          | @RestController, DI, Spring Data JPA, @ControllerAdvice, paginação    |

## Princípios

**Forma**: estrutura e narrativa do método

| Princípio                                                                                               | Descrição                                                            |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](conventions/naming.md#portuguese-names)                                           | Código universal, nomes curtos e sem ambiguidade                     |
| [Código narrativo](conventions/methods.md#god-method)                      | O código conta a história, sem precisar de comentários               |
| [Ponto de entrada limpo](conventions/methods.md#ponto-de-entrada-limpo)                                 | Caller de uma linha: o quê, não o como                               |
| [Estilo vertical](conventions/methods.md#vertical-parameters)                                   | Até 3 parâmetros por linha; 4+ usa record ou builder                 |
| [Orquestrador no topo](conventions/methods.md#god-method)                  | Chamada visível antes dos detalhes (top-down)                        |
| [Sem lógica no retorno](conventions/methods.md#no-logic-in-return)                                   | Saída de uma linha: o retorno nomeia o resultado, não o computa      |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                    | Descrição                                                            |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#if-e-else)                                  | Saída cedo na falha, sem else após return                            |
| [Fluxo linear](conventions/control-flow.md#guard-clauses-aninhamento-em-cascata)                           | Aninhamento em cascata substituído por fluxo plano                   |
| [Baixa densidade visual](conventions/methods.md#baixa-densidade-visual)                      | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                   | Variáveis e métodos que dispensam explicação                         |
| [Código como documentação](conventions/naming.md#code-as-documentation)                   | Nomes substituem comentários; comentários mentem                     |
| [Sem valores mágicos](conventions/variables.md#magic-values)                       | Constantes nomeadas no lugar de números e strings soltos             |

<br>

**Controle de qualidade**: estado, erros, async e testes

| Princípio                                                                                              | Descrição                                                    |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [Métodos pequenos](conventions/methods.md#single-level-of-abstraction)            | Uma responsabilidade, um nível de abstração                  |
| [Cálculo vs formatação](conventions/methods.md#separate-compute-from-format)                          | Computar dados e formatar saída em métodos separados         |
| [Final por padrão](conventions/variables.md#unnecessary-mutation)                                     | `final` primeiro, variável mutável só quando necessário      |
| [CQS](conventions/variables.md#parameter-mutation)                                                  | Separar comando de consulta, sem efeitos colaterais ocultos  |
| [Falhar rápido](conventions/advanced/error-handling.md#multiple-return-types)                     | Validar cedo, interromper fluxo inválido                     |
| [Contratos consistentes](conventions/advanced/error-handling.md#baseexception-centralized-abstraction) | Respostas padronizadas, sempre o mesmo formato               |
| [I/O assíncrono](conventions/advanced/async.md#thread-bloqueada-desnecessariamente)                    | Virtual threads, sem bloqueio desnecessário                  |
| [Testes estruturados](conventions/advanced/testing.md#fases-misturadas-aaa)                           | AAA: fases explícitas; assert limpo: sem expressões inline   |
