# Quick Reference — Ruby

> Escopo: Ruby 4.0. Cheat-sheet de nomenclatura, tipos, controle de fluxo e padrões idiomáticos.

## Nomenclatura

| Contexto                             | Convenção               | Exemplos                                        |
| ------------------------------------ | ----------------------- | ----------------------------------------------- |
| Métodos e variáveis locais           | `snake_case`            | `find_user`, `calculate_total`, `order_count`   |
| Classes e módulos                    | `PascalCase`            | `UserService`, `OrderRepository`, `PaymentGateway` |
| Constantes                           | `SCREAMING_SNAKE_CASE`  | `MAX_RETRIES`, `DEFAULT_TIMEOUT`                |
| Variáveis de instância               | `@snake_case`           | `@user_id`, `@order_total`                      |
| Variáveis de classe                  | `@@snake_case`          | `@@instance_count`                              |
| Símbolos (chaves de hash)            | `:snake_case`           | `:user_id`, `:status`, `:created_at`            |
| Módulo de namespace                  | `PascalCase`            | `module Billing`, `module Auth`                 |
| Método predicado                     | `snake_case?`           | `active?`, `valid?`, `empty?`                   |
| Método destrutivo / exceção          | `snake_case!`           | `save!`, `destroy!`, `validate!`                |

## Booleans

| Correto (variável)                    | Correto (método)        | Errado                            |
| ------------------------------------- | ----------------------- | --------------------------------- |
| `is_active = user.active?`            | `def active?`           | `active = user.active?`           |
| `has_permission = roles.include?(:admin)` | `def valid?`        | `permission = ...`                |
| `can_delete = is_active && has_permission` | `def empty?`       | `delete = ...`                    |

## Verbos por intenção

| Intenção           | Preferir                                   | Evitar              |
| ------------------ | ------------------------------------------ | ------------------- |
| Ler de storage     | `fetch`, `load`, `find`, `get`             | `retrieve`, `pull`  |
| Escrever/persistir | `save`, `create`, `insert`, `persist`      | `put`, `push`       |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build`  | `get`, `do`         |
| Transformar        | `map`, `transform`, `convert`, `format`    | `process`, `parse`  |
| Validar            | `validate`, `check`, `assert`, `verify`    | `handle`, `test`    |
| Notificar          | `send`, `dispatch`, `notify`, `emit`       | `fire`, `trigger`   |

## Taboos — evitar sempre

| Banido                                              | Substituir por                           |
| --------------------------------------------------- | ---------------------------------------- |
| `handle`, `do_stuff`, `run`, `execute`, `perform`   | verbo de intenção                        |
| `data`, `info`, `obj`, `item`                       | nome de domínio                          |
| `helpers`, `utils`, `common`                        | nome de módulo de domínio                |
| `manager`, `controller` (como serviço)              | `service`, `repository`, `handler`      |

## Declarações

| Uso                                  | Forma                                        |
| ------------------------------------ | -------------------------------------------- |
| Variável local                       | `order_total = 0`                            |
| Variável de instância                | `@user_id = params[:id]`                     |
| Constante de módulo                  | `MAX_RETRIES = 3`                            |
| String congelada (arquivo inteiro)   | `# frozen_string_literal: true` no topo      |
| Hash com símbolos                    | `{ name: "Alice", status: :active }`         |
| Value object                         | `Point = Data.define(:x, :y)`                |

## Controle de fluxo

| Padrão                        | Forma idiomática                                          |
| ----------------------------- | --------------------------------------------------------- |
| Guard clause                  | `return unless order.valid?`                             |
| Unless para negação simples   | `unless user.active?` (máx 1 condição; sem `else unless`) |
| Ternário (2 valores)          | `label = admin? ? "Admin" : "User"`                      |
| Case/when (3+ ramos)          | `case status when :active then ... when :pending then ...` |
| Pattern matching              | `case order in { status: :paid, total: (..100) } then ...` |
| Iterator funcional            | `items.filter(&:active?).map { |i| i.name }`              |

## Erros

| Padrão                          | Forma                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| Lançar exceção                  | `raise OrderError, "cart is empty"`                           |
| Capturar específica             | `rescue OrderError => error`                                  |
| Capturar múltiplas              | `rescue PaymentError, NetworkError => error`                  |
| Garantir execução               | `ensure connection.close`                                     |
| Exceção tipada                  | `class OrderError < StandardError; end`                       |
| Bang: lança em vez de nil/false | `user.save!` (levanta `ActiveRecord::RecordInvalid`)           |

## Tipos fundamentais

| Contexto                       | Tipo / padrão                                       |
| ------------------------------ | --------------------------------------------------- |
| Ausência                       | `nil`                                               |
| Texto                          | `String` (congelar com `frozen_string_literal`)     |
| Identificador leve             | `Symbol` (`:status`, `:role`)                       |
| Número inteiro                 | `Integer`                                           |
| Número decimal                 | `Float` ou `BigDecimal` para moeda                  |
| Coleção ordenada               | `Array`                                             |
| Mapa de chave/valor            | `Hash`                                              |
| Value object imutável          | `Data.define(:field1, :field2)`                     |
| Struct mutável                 | `Struct.new(:field1, :field2, keyword_init: true)` |
