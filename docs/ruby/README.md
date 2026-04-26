# Ruby

[![Ruby](https://img.shields.io/badge/Ruby-4.0-CC342D?logo=ruby&logoColor=white)](https://www.ruby-lang.org/en/)

Convenções Ruby aplicando os mesmos princípios do guia. Os exemplos usam Ruby 4.0 como
referência; diferenças relevantes com versões anteriores são destacadas onde necessário.

**Ruby** é a linguagem de programação. **Rails** (Ruby on Rails) é um framework (estrutura)
web escrito em Ruby — mesma relação de Python com FastAPI, ou C# com ASP.NET. Você pode
usar Ruby sem Rails, mas Rails sempre roda sobre Ruby.

→ [Quick Reference](quick-reference.md) — nomenclatura, verbos, taboos, tipos, controle de fluxo

## Setup

Configuração inicial de um projeto Ruby: estrutura, tooling e segurança.

| Tópico                                            | Conceitos                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| [Project Foundation](setup/project-foundation.md) | Gemfile, Bundler, .ruby-version, RuboCop, Zeitwerk                  |
| [Security](setup/security.md)                     | Secrets, variáveis de ambiente, credentials.yml.enc, validação      |

## Fundamentos

| Tópico                                          | Conceitos                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| [Naming](conventions/naming.md)                 | snake_case/PascalCase, `?`/`!` sufixos, booleans, taboos                   |
| [Variables](conventions/variables.md)           | Mutabilidade, símbolos, `frozen_string_literal`, constantes                 |
| [Control Flow](conventions/control-flow.md)     | Guard clauses, `unless`, `case/when`, pattern matching `case/in`            |
| [Methods](conventions/methods.md)               | SLA, stepdown, retorno implícito, blocks, procs, lambdas                    |
| [Visual Density](conventions/visual-density.md) | Agrupamento de linhas, return separado, fases de método                     |
| [Types](conventions/types.md)                   | Classes, módulos, `Data.define`, `nil`, duck typing, pattern matching        |

## Avançados

| Tópico                                                              | Conceitos                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)           | `raise`/`rescue`, exceções tipadas, `ensure`, fronteiras         |
| [Async](conventions/advanced/async.md)                             | Fibers, Ractors, Solid Queue, Sidekiq                            |
| [Testing](conventions/advanced/testing.md)                         | RSpec, AAA, `describe`/`context`/`it`, factories                 |
| [Performance](conventions/advanced/performance.md)                 | `frozen_string_literal`, lazy enumerators, alocação de objetos   |
| [Observability](conventions/advanced/observability.md)             | `Logger`, structured logging, semantic_logger                    |
| [Validation](conventions/advanced/validation.md)                   | ActiveModel, dry-validation, validação na fronteira              |
| [Dates](conventions/advanced/dates.md)                             | `Time.now.utc`, `Time.parse`, `ActiveSupport::TimeZone`, ISO 8601 |

## Frameworks

| Tópico                              | Conceitos                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| [Rails 8](frameworks/rails.md)      | MVC, ActiveRecord, Strong Parameters, routes, migrations, Solid Queue, Kamal     |

## Princípios

**Forma**: estrutura e narrativa do método

| Princípio                                                                                         | Descrição                                                               |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [snake_case universal](conventions/naming.md#convenções-de-case)                                  | Métodos e variáveis: `snake_case`; classes e módulos: `PascalCase`      |
| [Nomes expressivos](conventions/naming.md#identificadores-sem-significado)                        | Identificadores que dispensam comentário                                |
| [Orquestrador no topo](conventions/methods.md#sla--uma-responsabilidade-um-nível)                 | Chamada visível antes dos detalhes (top-down)                           |
| [SLA](conventions/methods.md#sla--uma-responsabilidade-um-nível)                                  | Uma responsabilidade, um nível de abstração                             |
| [Sem lógica no retorno](conventions/methods.md#sem-lógica-no-retorno)                             | Extraia o resultado antes de retornar (implicit ou explicit return)     |

<br>

**Legibilidade**: fluxo, densidade visual e nomes

| Princípio                                                                                         | Descrição                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Retorno antecipado](conventions/control-flow.md#guard-clauses)                                   | Saia cedo na falha; sem `else` após `return`                              |
| [Pattern matching](conventions/control-flow.md#pattern-matching)                                  | `case/in` para desestruturar e ramificar por forma                        |
| [Baixa densidade visual](conventions/visual-density.md#parede-de-código)                          | Linhas relacionadas juntas, grupos separados por linha em branco          |
| [Valor fixo por padrão](conventions/variables.md#mutabilidade)                                    | `freeze` explícito; mutação é exceção declarada                           |
| [Sem valores mágicos](conventions/variables.md#constantes-nomeadas)                               | Constantes nomeadas no lugar de literais inline                           |

<br>

**Controle de qualidade**: erros, async e testes

| Princípio                                                                                         | Descrição                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Exceções tipadas](conventions/advanced/error-handling.md#tipos-de-exceção)                       | Subclasses de `StandardError`, identificáveis e tratáveis          |
| [rescue nas fronteiras](conventions/advanced/error-handling.md#rescue-nas-fronteiras)             | `rescue` no ponto de entrada; propague com contexto dentro         |
| [Jobs para I/O longo](conventions/advanced/async.md#background-jobs)                              | Solid Queue / Sidekiq para operações longas fora do request cycle  |
| [Testes estruturados](conventions/advanced/testing.md#aaa--arrange-act-assert)                    | AAA: fases explícitas; assert limpo, sem expressões inline          |
