# Control Flow

> Escopo: Ruby 4.0.

Controle de fluxo em Ruby favorece legibilidade: guard clauses eliminam aninhamento,
`unless` simplifica negações, `case/in` (pattern matching) desestrutura por forma.

## Guard clauses

Saia cedo na falha. Sem `else` após `return`.

<details>
<summary>❌ Bad — aninhamento em cascata</summary>
<br>

```ruby
# frozen_string_literal: true

def process_payment(order)
  if order.present?
    if order.valid?
      if order.total > 0
        charge(order)
      end
    end
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — guard clauses, fluxo plano</summary>
<br>

```ruby
# frozen_string_literal: true

def process_payment(order)
  return unless order.present?
  return unless order.valid?
  return unless order.total.positive?

  charge(order)
end
```

</details>

## unless

Use `unless` para negações simples de uma única condição. Nunca `unless ... else` — inverta a
lógica com `if`.

<details>
<summary>❌ Bad — unless com else (confuso) / unless com condição composta</summary>
<br>

```ruby
# frozen_string_literal: true

unless user.active? && user.verified?
  redirect_to login_path
else
  render :dashboard
end
```

</details>

<br>

<details>
<summary>✅ Good — unless para 1 condição simples; if para o resto</summary>
<br>

```ruby
# frozen_string_literal: true

return unless user.active?

if user.active? && user.verified?
  render :dashboard
else
  redirect_to login_path
end
```

</details>

## Ternário

Use ternário apenas para atribuição de 2 valores. Nunca encadeie ternários.

<details>
<summary>❌ Bad — ternário aninhado</summary>
<br>

```ruby
# frozen_string_literal: true

label = admin? ? "Admin" : verified? ? "Verified" : "Guest"
```

</details>

<br>

<details>
<summary>✅ Good — ternário simples ou case/when para 3+</summary>
<br>

```ruby
# frozen_string_literal: true

label = admin? ? "Admin" : "User"

# 3+ ramos: case/when
label = case role
        when :admin    then "Admin"
        when :verified then "Verified"
        else                "Guest"
        end
```

</details>

## case/when

Use para 3 ou mais ramos sobre um mesmo valor. Mais limpo que `if/elsif` em cascata.

<details>
<summary>❌ Bad — if/elsif em cascata</summary>
<br>

```ruby
# frozen_string_literal: true

def status_label(status)
  if status == :active
    "Active"
  elsif status == :pending
    "Pending"
  elsif status == :cancelled
    "Cancelled"
  else
    "Unknown"
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — case/when declarativo</summary>
<br>

```ruby
# frozen_string_literal: true

def status_label(status)
  label = case status
          when :active    then "Active"
          when :pending   then "Pending"
          when :cancelled then "Cancelled"
          else                 "Unknown"
          end

  label
end
```

</details>

## Pattern matching

`case/in` (Ruby 3.0+) desestrutura por forma. Use para extrair campos de hashes, arrays e
objetos com deconstruct.

<details>
<summary>❌ Bad — acesso manual a campos sem garantia de forma</summary>
<br>

```ruby
# frozen_string_literal: true

def handle_event(event)
  if event[:type] == "payment" && event[:status] == "paid"
    amount = event[:data][:amount]
    notify_finance(amount)
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — pattern matching desestrutura e garante forma</summary>
<br>

```ruby
# frozen_string_literal: true

def handle_event(event)
  case event
  in { type: "payment", status: "paid", data: { amount: Integer => amount } }
    notify_finance(amount)
  in { type: "payment", status: "failed" }
    log_payment_failure(event)
  else
    nil
  end
end
```

</details>

## Iterator funcional

Prefira `map`, `filter`/`select`, `reject`, `reduce`/`sum` no lugar de loops imperativos.

<details>
<summary>❌ Bad — loop imperativo com mutação</summary>
<br>

```ruby
# frozen_string_literal: true

def active_order_totals(orders)
  result = []
  orders.each do |order|
    if order.active?
      result << order.total
    end
  end
  result
end
```

</details>

<br>

<details>
<summary>✅ Good — pipeline funcional sem mutação</summary>
<br>

```ruby
# frozen_string_literal: true

def active_order_totals(orders)
  totals = orders
    .select(&:active?)
    .map(&:total)

  totals
end
```

</details>
