# Rust

[![Rust](https://img.shields.io/badge/Rust-1.95-000000?logo=rust&logoColor=white)](https://doc.rust-lang.org/book/)

Convenções Rust aplicando os mesmos princípios do guia. Os exemplos usam Rust 1.95 (2024 Edition)
como referência; diferenças relevantes com versões anteriores são destacadas onde necessário.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Rust: estrutura, tooling e segurança.

| Tópico                                            | Conceitos                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| [Project Foundation](setup/project-foundation.md) | Cargo.toml, workspace, estrutura por domínio, toolchain               |
| [Security](setup/security.md)                     | Secrets, variáveis de ambiente, validação na fronteira                |

## Fundamentos

| Tópico                                          | Conceitos                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| [Naming](conventions/naming.md)                 | snake_case/PascalCase, exported vs private, booleans, taboos               |
| [Variables](conventions/variables.md)           | `let`, `let mut`, `const`, `static`, shadowing, inferência de tipos        |
| [Control Flow](conventions/control-flow.md)     | `match`, `if let`, `while let`, `?`, guard clauses, retorno antecipado     |
| [Functions](conventions/functions.md)           | Assinaturas, `?`, stepdown, SLA, explaining return, closures               |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de função                    |
| [Types](conventions/types.md)                   | `struct`, `enum`, traits, `Option`, `Result`, generics, newtype            |

## Avançados

| Tópico                                                              | Conceitos                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)           | `thiserror`, `anyhow`, `?`, sem `unwrap()` em produção          |
| [Async](conventions/advanced/async.md)                             | Tokio, `async fn`, `.await`, `spawn`, `select!`, shutdown        |
| [Null Safety](conventions/advanced/null-safety.md)                 | `Option<T>`, `if let`, `let-else`, `?`, `map`/`and_then`        |
| [Testing](conventions/advanced/testing.md)                         | `#[test]`, `#[tokio::test]`, table-driven, testes de integração |
| [Performance](conventions/advanced/performance.md)                 | Ownership, clones desnecessários, `Arc`, `Mutex`, benchmarks     |
| [Observability](conventions/advanced/observability.md)             | `tracing`, spans estruturados, `#[instrument]`, níveis           |
| [Validation](conventions/advanced/validation.md)                   | `validator`, validação na fronteira, tipos como contratos        |
| [Dates](conventions/advanced/dates.md)                             | `chrono`, UTC por padrão, sem `NaiveDateTime` em produção        |

## Frameworks

| Tópico                                          | Conceitos                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| [Blockchain](frameworks/blockchain.md)          | Solana/Anchor: programa, accounts, instrução, BAD/GOOD em Rust               |

## Princípios

**Forma**: estrutura e narrativa da função

| Princípio                                                                                          | Descrição                                                                |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [snake_case universal](conventions/naming.md#convenções-de-case)                                   | Funções, variáveis e módulos: `snake_case`; tipos e traits: `PascalCase` |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                         | Identificadores que dispensam comentário                                 |
| [Orquestrador no topo](conventions/functions.md#stepdown--orquestrador-acima-dos-detalhes)         | Chamada visível antes dos detalhes (top-down)                            |
| [SLA](conventions/functions.md#sla--uma-responsabilidade-um-nível)                                 | Uma responsabilidade, um nível de abstração                              |
| [Sem lógica no retorno](conventions/functions.md#sem-lógica-no-retorno)                            | Extraia o resultado antes de retornar                                    |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                          | Descrição                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Retorno antecipado com `?`](conventions/control-flow.md#operador-)                               | Propague erros cedo com `?`; sem else após retorno implícito              |
| [Match exaustivo](conventions/control-flow.md#match)                                               | Todos os casos cobertos pelo compilador; sem padrão catch-all desnecessário |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código)                           | Linhas relacionadas juntas, grupos separados por linha em branco          |
| [Imutável por padrão](conventions/variables.md#let-vs-let-mut)                                     | `let` é o padrão; `let mut` só quando necessário                         |
| [Sem valores mágicos](conventions/variables.md#constantes-nomeadas)                                | `const` no lugar de literais inline                                      |

<br>

**Controle de qualidade**: erros, concorrência e testes

| Princípio                                                                                          | Descrição                                                         |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Sem unwrap() em produção](conventions/advanced/error-handling.md#unwrap-e-expect)                 | Use `?` ou trate o `Result`; `unwrap` apenas em testes ou demos  |
| [thiserror para bibliotecas](conventions/advanced/error-handling.md#tipos-de-erro-com-thiserror)   | Erros tipados e descritivos nas fronteiras de biblioteca          |
| [anyhow para aplicações](conventions/advanced/error-handling.md#anyhow-para-aplicações)            | Contexto de erro progressivo sem overhead de types customizados   |
| [async com Tokio](conventions/advanced/async.md#tokio-runtime)                                     | Runtime padrão; `#[tokio::main]` no entry point                  |
| [Testes table-driven](conventions/advanced/testing.md#table-driven-tests)                          | Casos de teste em vec de structs; cobertura por dados, não por cópias |
