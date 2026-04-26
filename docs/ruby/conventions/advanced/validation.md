# Validation

> Escopo: Ruby 4.0. Padrões transversais de validação em [shared/platform/security.md](../../../../shared/platform/security.md).

Validação acontece na fronteira do sistema: entrada de usuário, parâmetros de API,
eventos externos. Dentro do domínio, confie nos tipos. Ruby oferece **ActiveModel::Validations**
(disponível standalone, sem Rails) e a gem **dry-validation** para contratos declarativos.

## Conceitos fundamentais

| Conceito                    | O que é                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| **ActiveModel::Validations**| Módulo extraído do Rails; adiciona `validates`, `errors` a qualquer classe   |
| **dry-validation**          | Gem para contratos declarativos com predicados compostos e mensagens tipadas |
| **Strong Parameters**       | Mecanismo Rails que exige whitelist (lista de permissões) de params de controller |
| **fail-fast**               | Validar cedo e abortar fluxo inválido antes de chegar ao domínio             |

## ActiveModel::Validations

Use para modelos de domínio ou objetos de formulário sem ActiveRecord.

<details>
<summary>❌ Bad — validação manual espalhada no método</summary>
<br>

```ruby
# frozen_string_literal: true

def create_order(params)
  raise "name is required" if params[:name].blank?
  raise "total must be positive" unless params[:total].to_f.positive?
  raise "status is invalid" unless %w[pending active].include?(params[:status])

  Order.create!(params)
end
```

</details>

<br>

<details>
<summary>✅ Good — validação declarativa com ActiveModel</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderInput
  include ActiveModel::Validations
  include ActiveModel::Conversion
  extend ActiveModel::Naming

  attr_accessor :name, :total, :status

  validates :name, presence: true, length: { maximum: 100 }
  validates :total, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[pending active] }

  def initialize(attributes = {})
    attributes.each { |key, value| public_send(:"#{key}=", value) }
  end
end

def create_order(params)
  input = OrderInput.new(params)

  raise ValidationError, input.errors.full_messages unless input.valid?

  Order.create!(name: input.name, total: input.total, status: input.status)
end
```

</details>

## dry-validation — contratos declarativos

Use para APIs onde o schema de entrada é complexo ou vem de fontes externas.

```ruby
# frozen_string_literal: true

require "dry-validation"

class OrderContract < Dry::Validation::Contract
  params do
    required(:name).filled(:string)
    required(:total).filled(:float)
    required(:status).filled(:string)
    optional(:discount_code).maybe(:string)
  end

  rule(:total) do
    key.failure("must be greater than 0") unless value.positive?
  end

  rule(:status) do
    key.failure("must be pending or active") unless %w[pending active].include?(value)
  end
end

def create_order(params)
  result = OrderContract.new.call(params)

  raise ValidationError, result.errors.to_h unless result.success?

  Order.create!(result.to_h)
end
```

## Strong Parameters (Rails)

Em controllers Rails, use `permit` para declarar explicitamente quais parâmetros são
aceitos. Nunca passe `params` diretamente para o modelo.

<details>
<summary>❌ Bad — mass assignment sem whitelist</summary>
<br>

```ruby
# frozen_string_literal: true

def create
  Order.create!(params[:order])
end
```

</details>

<br>

<details>
<summary>✅ Good — strong parameters com whitelist explícita</summary>
<br>

```ruby
# frozen_string_literal: true

def create
  order = Order.create!(order_params)

  render json: order, status: :created
end

private

def order_params
  params.require(:order).permit(:name, :total, :status, :discount_code)
end
```

</details>

## Validação de tipo na fronteira

Use `Integer()` e `Float()` (com maiúscula) para converter e validar em uma etapa.
Eles lançam `ArgumentError` para entradas inválidas — ao contrário de `.to_i` que retorna `0`.

<details>
<summary>❌ Bad — to_i silencia entrada inválida</summary>
<br>

```ruby
# frozen_string_literal: true

def find_order(params)
  order_id = params[:order_id].to_i
  Order.find(order_id)
end
```

</details>

<br>

<details>
<summary>✅ Good — Integer() lança ArgumentError em entrada inválida</summary>
<br>

```ruby
# frozen_string_literal: true

def find_order(params)
  order_id = Integer(params[:order_id])

  Order.find(order_id)
rescue ArgumentError
  raise ValidationError, "order_id must be an integer"
end
```

</details>
