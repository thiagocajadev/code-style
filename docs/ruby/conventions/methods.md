# Methods

> Escopo: Ruby 4.0.

Métodos Ruby retornam implicitamente a última expressão avaliada. Use `return` explícito
apenas para saída antecipada (guard clause). Blocks, procs e lambdas são primeiro-classe.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **method** (método) | Unidade de comportamento definida com `def`; retorna a última expressão por padrão |
| **block** (bloco) | Pedaço de código passado a um método entre `do...end` ou `{ }`; invocado via `yield` |
| **yield** (entregar controle ao bloco) | Palavra-chave que executa o bloco recebido pelo método chamado |
| **proc** (objeto de bloco) | Bloco capturado como objeto; argumentos extras são ignorados, `return` sai do escopo enclosing |
| **lambda** (função anônima estrita) | Proc com checagem estrita de aridade e `return` que sai apenas da lambda |
| **splat** (`*args`, `**kwargs`) | Coleta argumentos posicionais ou nomeados em array/hash dentro do método |
| **keyword arguments** (argumentos nomeados) | Parâmetros declarados com `:`, passados pelo nome no call site |
| **SLA** (Single Level of Abstraction, Único Nível de Abstração) | Cada método opera em um só nível: orquestra passos ou implementa detalhe |
| **helper** (método auxiliar) | Método de apoio que implementa um passo do orquestrador; dá nome ao detalhe |

## SLA: uma responsabilidade, um nível

Cada método executa uma operação ou orquestra outras. Nunca as duas ao mesmo tempo.

<details>
<summary>❌ Ruim: método que faz tudo</summary>

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

<details>
<summary>✅ Bom: orquestrador + métodos de detalhe</summary>

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
expressão) é idiomático, mas sem lógica inline.

<details>
<summary>❌ Ruim: lógica na última linha</summary>

```ruby
# frozen_string_literal: true

def find_discounted_orders(user)
  Order.where(user: user).select { |o| o.total > 100 }.map { |o| o.total * 0.9 }
end
```

</details>

<details>
<summary>✅ Bom: resultado nomeado, retorno implícito limpo</summary>

```ruby
# frozen_string_literal: true

def find_discounted_orders(user)
  eligible_orders = Order.where(user: user).select { |o| o.total > 100 }

  eligible_orders.map { |o| o.total * 0.9 }
end
```

</details>

## Stepdown: orquestrador acima dos detalhes

Declare o método orquestrador antes dos métodos auxiliares. O leitor entende o fluxo
principal antes de descer para os detalhes.

<details>
<summary>❌ Ruim: auxiliares antes do orquestrador</summary>

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

<details>
<summary>✅ Bom: orquestrador no topo, detalhes abaixo</summary>

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

## Assinatura: keyword arguments

Use keyword arguments (argumentos nomeados) quando o método recebe 3 ou mais parâmetros.
Destructuring no corpo, não na assinatura.

<details>
<summary>❌ Ruim: argumentos posicionais em excesso</summary>

```ruby
# frozen_string_literal: true

def create_order(user_id, product_id, quantity, discount_code, shipping_address)
  # ...
end

create_order(1, 42, 3, "SAVE10", "Rua das Flores, 100")
```

</details>

<details>
<summary>✅ Bom: keyword arguments; chamada auto-documentada</summary>

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
<summary>❌ Ruim: estilos misturados</summary>

```ruby
# frozen_string_literal: true

orders.each { |order|
  process(order)
  notify(order)
}

total = items.map do |item| item.price end
```

</details>

<details>
<summary>✅ Bom: {} para 1 linha, do...end para múltiplas</summary>

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
<summary>❌ Ruim: Proc onde lambda é necessário (return vaza)</summary>

```ruby
# frozen_string_literal: true

apply_discount = Proc.new { |order| order.total * 0.9 }

def run(order, transform)
  result = transform.call(order)
  result
end
```

</details>

<details>
<summary>✅ Bom: lambda para transformação com retorno local</summary>

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
