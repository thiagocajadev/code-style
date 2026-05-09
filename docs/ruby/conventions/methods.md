# Methods

> Escopo: Ruby 4.0.

Métodos Ruby retornam implicitamente a última expressão avaliada. Use `return` explícito
apenas para saída antecipada (guard clause). Blocks, procs e lambdas são primeiro-classe.

## SLA — uma responsabilidade, um nível

Cada método executa uma operação ou orquestra outras. Nunca as duas ao mesmo tempo.

<details>
<summary>❌ Bad — método que faz tudo</summary>
<br>

```ruby
# frozen_string_literal: true

def process_checkout(user_id, cart)
  raise "cart is empty" if cart.items.empty?

  total = cart.items.sum { |item| item.price * item.quantity }
  discount = user_id.even? ? 0.1 : 0.0
  final_total = total * (1.0 - discount)

  order = Order.create!(user_id: user_id, total: final_total)
  OrderMailer.confirmation(user_id, order.id).deliver_later

  Receipt.new(order_id: order.id, total: final_total)
end
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador + métodos de detalhe</summary>
<br>

```ruby
# frozen_string_literal: true

def process_checkout(user_id, cart)
  validate_cart(cart)

  total = calculate_total(cart, user_id)
  order = persist_order(user_id, total)

  notify_customer(user_id, order.id)

  Receipt.new(order_id: order.id, total: total)
end

private

def validate_cart(cart)
  raise CartError, "cart is empty" if cart.items.empty?
end

def calculate_total(cart, user_id)
  subtotal = cart.items.sum { |item| item.price * item.quantity }
  discount_rate = compute_discount_rate(user_id)

  subtotal * (1.0 - discount_rate)
end

def persist_order(user_id, total)
  Order.create!(user_id: user_id, total: total)
end

def notify_customer(user_id, order_id)
  OrderMailer.confirmation(user_id, order_id).deliver_later
end
```

</details>

## Sem lógica no retorno

Extraia o resultado para uma variável nomeada antes de retornar. O retorno implícito (última
expressão) é idiomático — mas sem lógica inline.

<details>
<summary>❌ Bad — lógica na última linha</summary>
<br>

```ruby
# frozen_string_literal: true

def find_discounted_orders(user)
  Order.where(user: user).select { |o| o.total > 100 }.map { |o| o.total * 0.9 }
end
```

</details>

<br>

<details>
<summary>✅ Good — resultado nomeado, retorno implícito limpo</summary>
<br>

```ruby
# frozen_string_literal: true

def find_discounted_orders(user)
  eligible_orders = Order.where(user: user).select { |o| o.total > 100 }

  eligible_orders.map { |o| o.total * 0.9 }
end
```

</details>

## Stepdown — orquestrador acima dos detalhes

Declare o método orquestrador antes dos métodos auxiliares. O leitor entende o fluxo
principal antes de descer para os detalhes.

<details>
<summary>❌ Bad — auxiliares antes do orquestrador</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderService
  private

  def validate(order)
    raise OrderError unless order.valid?
  end

  def save(order)
    order.save!
  end

  public

  def submit(order)
    validate(order)
    save(order)
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador no topo, detalhes abaixo</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderService
  def submit(order)
    validate(order)
    save(order)
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

## Assinatura — keyword arguments

Use keyword arguments (argumentos nomeados) quando o método recebe 3 ou mais parâmetros.
Destructuring no corpo, não na assinatura.

<details>
<summary>❌ Bad — argumentos posicionais em excesso</summary>
<br>

```ruby
# frozen_string_literal: true

def create_order(user_id, product_id, quantity, discount_code, shipping_address)
  # ...
end

create_order(1, 42, 3, "SAVE10", "Rua das Flores, 100")
```

</details>

<br>

<details>
<summary>✅ Good — keyword arguments; chamada auto-documentada</summary>
<br>

```ruby
# frozen_string_literal: true

def create_order(user_id:, product_id:, quantity:, discount_code: nil, shipping_address:)
  # ...
end

create_order(
  user_id: 1,
  product_id: 42,
  quantity: 3,
  discount_code: "SAVE10",
  shipping_address: "Rua das Flores, 100"
)
```

</details>

## Blocks

`do...end` para blocos de múltiplas linhas; `{}` para blocos de uma linha. Não misture os dois
estilos em contextos equivalentes.

<details>
<summary>❌ Bad — estilos misturados</summary>
<br>

```ruby
# frozen_string_literal: true

orders.each { |order|
  process(order)
  notify(order)
}

total = items.map do |item| item.price end
```

</details>

<br>

<details>
<summary>✅ Good — {} para 1 linha, do...end para múltiplas</summary>
<br>

```ruby
# frozen_string_literal: true

orders.each do |order|
  process(order)
  notify(order)
end

total = items.sum { |item| item.price }
```

</details>

## Lambda vs Proc

Use **lambda** para comportamento de função (valida aridade, `return` local). Use **Proc**
(procedimento) com `&` para passar um bloco como argumento.

<details>
<summary>❌ Bad — Proc onde lambda é necessário (return vaza)</summary>
<br>

```ruby
# frozen_string_literal: true

apply_discount = Proc.new { |order| order.total * 0.9 }

def run(order, transform)
  result = transform.call(order)
  result
end
```

</details>

<br>

<details>
<summary>✅ Good — lambda para transformação com retorno local</summary>
<br>

```ruby
# frozen_string_literal: true

apply_discount = ->(order) { order.total * 0.9 }

def run(order, transform)
  discounted = transform.call(order)

  discounted
end

run(order, apply_discount)
```

</details>
