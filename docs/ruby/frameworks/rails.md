# Rails 8

> Escopo: Ruby on Rails 8.0 + Ruby 4.0.

**Ruby on Rails** (ou simplesmente Rails) é um framework web **MVC**
(Model-View-Controller) escrito em Ruby. Rails segue duas convenções centrais:
**Convention over Configuration** (convenção sobre configuração — menos decisões
explícitas) e **Don't Repeat Yourself** (não se repita — SSOT, fonte única de
verdade). Rails 8 eliminou a dependência de Redis para cache e jobs com **Solid
Cache** e **Solid Queue**.

## Conceitos fundamentais

| Conceito                                                  | O que é                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **MVC** (Model-View-Controller, Modelo-Visão-Controlador) | Model (domínio + banco), View (templates), Controller (entrada + roteamento)                                |
| **ActiveRecord**                                          | **ORM** (Object-Relational Mapper, mapeador objeto-relacional) embutido; cada classe mapeia uma tabela      |
| **Strong Parameters**                                     | Whitelist (lista de permissões) de params no controller — previne **mass assignment** (atribuição em massa) |
| **Concerns**                                              | Módulos de comportamento compartilhado entre models ou controllers                                          |
| **Migrations**                                            | Arquivos versionados de alteração de **schema** (esquema) do banco de dados                                 |
| **Solid Queue**                                           | Backend de jobs baseado em banco (sem Redis); padrão Rails 8                                                |
| **Kamal**                                                 | Ferramenta de **deploy** (implantação) para VMs Linux com Docker; padrão Rails 8                            |

## Controller thin

Controllers são finos. Validam a entrada, delegam para serviços, traduzem para
HTTP. Nenhuma lógica de negócio dentro do controller.

<details>
<summary>❌ Bad — lógica de negócio no controller</summary>
<br>

```ruby
# frozen_string_literal: true

class OrdersController < ApplicationController
  def create
    order = Order.new(order_params)
    return render json: { error: "invalid" }, status: :unprocessable_entity unless order.valid?

    total = order.items.sum { |i| i.price * i.quantity }
    discount = current_user.premium? ? total * 0.1 : 0
    order.total = total - discount

    order.save!
    OrderMailer.confirmation(current_user, order).deliver_later

    render json: order, status: :created
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — controller delega para serviço, traduz resultado para HTTP</summary>
<br>

```ruby
# frozen_string_literal: true

class OrdersController < ApplicationController
  def create
    order = OrderService.new.submit(current_user, order_params)
    render json: order, status: :created

  rescue ActiveRecord::RecordInvalid => error
    render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity

  rescue OrderErrors::PaymentFailed => error
    render json: { error: error.message }, status: :payment_required
  end

  private

  def order_params
    params.require(:order).permit(:name, :total, :status, items_attributes: %i[product_id quantity])
  end
end
```

</details>

## Model — validações e associações

Models declaram validações e associações. Lógica de negócio complexa fica em
service objects (objetos de serviço), não no model.

<details>
<summary>❌ Bad — model com lógica de negócio e callbacks ocultos</summary>
<br>

```ruby
# frozen_string_literal: true

class Order < ApplicationRecord
  belongs_to :user
  has_many :items

  after_create :send_confirmation_email
  after_create :notify_warehouse
  after_update :recalculate_loyalty_points

  def total
    items.sum { |i| i.price * i.quantity } * (user.premium? ? 0.9 : 1.0)
  end

  private

  def send_confirmation_email
    OrderMailer.confirmation(user, self).deliver_later
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — model declara dados e validações; lógica fica no serviço</summary>
<br>

```ruby
# frozen_string_literal: true

class Order < ApplicationRecord
  belongs_to :user
  has_many :items, dependent: :destroy

  validates :status, inclusion: { in: %w[pending active paid cancelled] }
  validates :total, numericality: { greater_than_or_equal_to: 0 }

  scope :active,    -> { where(status: :active) }
  scope :paid,      -> { where(status: :paid) }
  scope :recent,    -> { order(created_at: :desc) }

  def active?  = status == "active"
  def paid?    = status == "paid"
end
```

</details>

## Migrations

Migrations são versionadas e irreversíveis em produção. Sempre implemente
`change` (ou `up`/`down`) com operações reversíveis quando possível.

<details>
<summary>❌ Bad — migration sem índice em foreign key</summary>
<br>

```ruby
# frozen_string_literal: true

class CreateOrders < ActiveRecord::Migration[8.0]
  def change
    create_table :orders do |t|
      t.integer :user_id
      t.string :status
      t.decimal :total
      t.timestamps
    end
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — references com índice, tipos explícitos</summary>
<br>

```ruby
# frozen_string_literal: true

class CreateOrders < ActiveRecord::Migration[8.0]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true, index: true
      t.string :status, null: false, default: "pending"
      t.decimal :total, precision: 10, scale: 2, null: false, default: "0.0"
      t.timestamps
    end

    add_index :orders, :status
  end
end
```

</details>

## Rotas RESTful

Use recursos RESTful (`resources`, `resource`) sempre que possível. Rotas
customizadas são exceção — declare `only:` para limitar os verbos gerados.

<details>
<summary>❌ Bad — rotas manuais onde resources resolveria</summary>
<br>

```ruby
# frozen_string_literal: true

Rails.application.routes.draw do
  get "/orders",          to: "orders#index"
  get "/orders/:id",      to: "orders#show"
  post "/orders",         to: "orders#create"
  put "/orders/:id",      to: "orders#update"
  delete "/orders/:id",   to: "orders#destroy"
  post "/orders/:id/pay", to: "orders#pay"
end
```

</details>

<br>

<details>
<summary>✅ Good — resources + member action semântica</summary>
<br>

```ruby
# frozen_string_literal: true

Rails.application.routes.draw do
  resources :orders, only: %i[index show create update destroy] do
    member do
      post :pay
      post :cancel
    end
  end
end
```

</details>

## Background jobs com Solid Queue

Rails 8 usa Solid Queue por padrão. Jobs herdam de `ApplicationJob`. Passe IDs,
não objetos.

```ruby
# frozen_string_literal: true

# Gemfile (Rails 8 — já incluído por padrão)
# gem "solid_queue"

# config/application.rb
config.active_job.queue_adapter = :solid_queue

# app/jobs/invoice_generation_job.rb
class InvoiceGenerationJob < ApplicationJob
  queue_as :invoices

  retry_on NetworkError, wait: :polynomially_longer, attempts: 3

  def perform(order_id)
    order = Order.find(order_id)

    InvoiceGenerator.generate(order)
    order.update!(invoice_generated_at: Time.now.utc)
  end
end

# Enfileirar
InvoiceGenerationJob.perform_later(order.id)
InvoiceGenerationJob.set(wait: 5.minutes).perform_later(order.id)
```

## Autenticação com generator

Rails 8 gera scaffold de autenticação completo com
`rails generate authentication`.

```bash
bin/rails generate authentication
bin/rails db:migrate
```

Gera `User`, `Session`, `AuthenticationController`, `PasswordsController` e
rotas — sem gems externas para o fluxo básico de sessão.

## Concerns

Use concerns para extrair comportamento reutilizado em múltiplos models ou
controllers.

```ruby
# frozen_string_literal: true

# app/models/concerns/auditable.rb
module Auditable
  extend ActiveSupport::Concern

  included do
    before_create  :set_created_by
    before_update  :set_updated_by
  end

  private

  def set_created_by
    self.created_by = Current.user&.id
  end

  def set_updated_by
    self.updated_by = Current.user&.id
  end
end

# Uso no model
class Order < ApplicationRecord
  include Auditable
end
```
