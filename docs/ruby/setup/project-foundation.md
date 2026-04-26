# Project Foundation

> Escopo: Ruby 4.0.

Um projeto Ruby bem estruturado parte do **Bundler** (gerenciador de dependências) e do
**RuboCop** (linter e formatter). O arquivo `.ruby-version` fixa a versão do interpretador;
o `Gemfile` declara as dependências.

## Conceitos fundamentais

| Conceito         | O que é                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| **Bundler**      | Gerenciador de dependências; resolve e instala gems do `Gemfile`        |
| **Gemfile**      | Manifesto de dependências do projeto                                    |
| **Gemfile.lock** | Versões exatas resolvidas; deve ser commitado no controle de versão     |
| **RuboCop**      | Linter e formatter; enforça convenções via `.rubocop.yml`              |
| **Zeitwerk**     | Autoloader (carregador automático) de código por convenção de nomes     |
| **.ruby-version**| Arquivo que declara a versão Ruby do projeto; lido por rbenv e chruby   |

## Estrutura de projeto

```
my_app/
├── .ruby-version          # "4.0.3"
├── Gemfile
├── Gemfile.lock
├── .rubocop.yml
├── lib/
│   └── my_app/
│       ├── order.rb
│       └── payment.rb
├── spec/
│   └── my_app/
│       └── order_spec.rb
└── bin/
    └── console
```

Para aplicações Rails a estrutura é gerada pelo `rails new`.

## Gemfile

<details>
<summary>❌ Bad — versões sem constraints, grupo de test misturado</summary>
<br>

```ruby
source "https://rubygems.org"

gem "rails"
gem "pg"
gem "rspec-rails"
gem "factory_bot_rails"
```

</details>

<br>

<details>
<summary>✅ Good — constraints semânticas, grupos declarados</summary>
<br>

```ruby
# frozen_string_literal: true

source "https://rubygems.org"

ruby "4.0.3"

gem "rails", "~> 8.0"
gem "pg", "~> 1.5"
gem "puma", "~> 6.0"

group :development, :test do
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails", "~> 6.4"
  gem "faker", "~> 3.4"
end

group :development do
  gem "rubocop", "~> 1.75", require: false
  gem "rubocop-rails", "~> 2.29", require: false
  gem "rubocop-rspec", "~> 3.5", require: false
end
```

</details>

## RuboCop

Configuração base para projetos Ruby/Rails:

```yaml
# .rubocop.yml
require:
  - rubocop-rails
  - rubocop-rspec

AllCops:
  NewCops: enable
  TargetRubyVersion: 4.0
  Exclude:
    - "db/schema.rb"
    - "bin/**/*"
    - "vendor/**/*"

Style/FrozenStringLiteralComment:
  Enabled: true
  EnforcedStyle: always

Layout/LineLength:
  Max: 120

Metrics/MethodLength:
  Max: 20

Metrics/BlockLength:
  Exclude:
    - "spec/**/*"
    - "config/routes.rb"
```

Execute `bundle exec rubocop -A` para auto-corrigir.

## Comandos essenciais

| Ação                                | Comando                          |
| ----------------------------------- | -------------------------------- |
| Instalar dependências               | `bundle install`                 |
| Adicionar gem                       | `bundle add nome_da_gem`         |
| Atualizar gem específica            | `bundle update nome_da_gem`      |
| Lint e auto-fix                     | `bundle exec rubocop -A`         |
| Executar testes                     | `bundle exec rspec`              |
| Console interativo                  | `bundle exec rails console`      |
| Verificar versão Ruby               | `ruby -v`                        |
