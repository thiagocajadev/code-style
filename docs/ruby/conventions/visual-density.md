# Visual Density

> Escopo: Ruby 4.0.

Densidade visual é o espaço em branco que separa intenções. Linhas relacionadas ficam juntas;
grupos lógicos distintos são separados por uma linha em branco. Nunca 2 linhas em branco
consecutivas; nunca parede de código sem respiração.

## Parede de código

<details>
<summary>❌ Bad — sem separação entre fases</summary>
<br>

```ruby
# frozen_string_literal: true

def submit_order(user_id, cart)
  raise CartError, "cart is empty" if cart.items.empty?
  total = cart.items.sum(&:price)
  discount_rate = compute_discount_rate(user_id)
  final_total = total * (1.0 - discount_rate)
  order = Order.create!(user_id: user_id, total: final_total)
  OrderMailer.confirmation(user_id, order.id).deliver_later
  Receipt.new(order_id: order.id, total: final_total)
end
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas por linha em branco</summary>
<br>

```ruby
# frozen_string_literal: true

def submit_order(user_id, cart)
  raise CartError, "cart is empty" if cart.items.empty?

  total = cart.items.sum(&:price)
  discount_rate = compute_discount_rate(user_id)
  final_total = total * (1.0 - discount_rate)

  order = Order.create!(user_id: user_id, total: final_total)
  OrderMailer.confirmation(user_id, order.id).deliver_later

  Receipt.new(order_id: order.id, total: final_total)
end
```

</details>

## Explaining return separado

O resultado nomeado fica na linha anterior ao retorno implícito ou `return` explícito.
Separe-o do bloco lógico anterior com uma linha em branco quando o bloco tem 2+ linhas.

<details>
<summary>❌ Bad — resultado colado ao bloco</summary>
<br>

```ruby
# frozen_string_literal: true

def build_summary(orders)
  active = orders.select(&:active?)
  total = active.sum(&:total)
  count = active.size
  OrderSummary.new(total: total, count: count)
end
```

</details>

<br>

<details>
<summary>✅ Good — resultado separado, retorno implícito limpo</summary>
<br>

```ruby
# frozen_string_literal: true

def build_summary(orders)
  active = orders.select(&:active?)
  total = active.sum(&:total)
  count = active.size

  OrderSummary.new(total: total, count: count)
end
```

</details>

## Density dentro de classes

Separe métodos públicos entre si com uma linha em branco. Separe a seção `private` com uma
linha em branco acima.

<details>
<summary>❌ Bad — métodos colados, private sem separação</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderService
  def submit(order)
    validate(order)
    save(order)
  end
  def cancel(order)
    order.update!(status: :cancelled)
  end
  private
  def validate(order)
    raise OrderError unless order.valid?
  end
  def save(order)
    order.save!
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — métodos separados, private com espaçamento correto</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderService
  def submit(order)
    validate(order)
    save(order)
  end

  def cancel(order)
    order.update!(status: :cancelled)
  end

  private

  def validate(order)
    raise OrderError, "order is invalid" unless order.valid?
  end

  def save(order)
    order.save!
  end
end
```

</details>

## Grupo de atributos

Agrupe `attr_reader`, `attr_writer`, `attr_accessor` em blocos por acesso, separados do
`initialize` por uma linha em branco.

<details>
<summary>❌ Bad — atributos misturados sem padrão</summary>
<br>

```ruby
# frozen_string_literal: true

class User
  attr_accessor :name
  def initialize(name:, email:)
    @name = name
    @email = email
  end
  attr_reader :email
end
```

</details>

<br>

<details>
<summary>✅ Good — atributos agrupados acima do initialize</summary>
<br>

```ruby
# frozen_string_literal: true

class User
  attr_reader :email
  attr_accessor :name

  def initialize(name:, email:)
    @name = name
    @email = email
  end
end
```

</details>
