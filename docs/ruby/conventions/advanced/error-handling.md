# Error Handling

> Escopo: Ruby 4.0.

Ruby usa `raise`/`rescue` para controle de erros. Exceções são objetos — herde de
`StandardError` para criar tipos próprios. `rescue` fica nas fronteiras do sistema;
dentro do domínio, propague com contexto.

## Conceitos fundamentais

| Conceito           | O que é                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `raise`            | Lança uma exceção (não use `throw`, que tem semântica diferente em Ruby)        |
| `rescue`           | Captura exceção em um bloco `begin/rescue/end` ou no corpo do método            |
| `ensure`           | Bloco executado sempre, com ou sem exceção (equivalente a `finally`)            |
| `StandardError`    | Classe base para exceções de aplicação; `Exception` é a raiz — não capture ela |
| **Bang method**    | Método `!` que lança exceção em vez de retornar `nil`/`false`                   |

## Tipos de exceção

Crie hierarquia de exceções por domínio. Herdar de `StandardError` permite que `rescue`
genérico não engula erros do sistema (como `SignalException`).

<details>
<summary>❌ Bad — strings ou RuntimeError sem tipo</summary>
<br>

```ruby
# frozen_string_literal: true

def submit_order(order)
  raise "invalid order" unless order.valid?
  raise "payment failed" unless charge(order)
end
```

</details>

<br>

<details>
<summary>✅ Good — exceções tipadas e hierarquia de domínio</summary>
<br>

```ruby
# frozen_string_literal: true

module OrderErrors
  class Base < StandardError; end

  class InvalidOrder < Base
    def initialize(order_id)
      super("order #{order_id} failed validation")
    end
  end

  class PaymentFailed < Base
    def initialize(order_id, reason:)
      super("payment for order #{order_id} failed: #{reason}")
    end
  end
end

def submit_order(order)
  raise OrderErrors::InvalidOrder.new(order.id) unless order.valid?

  charged = charge(order)
  raise OrderErrors::PaymentFailed.new(order.id, reason: charged.error) unless charged.success?
end
```

</details>

## rescue nas fronteiras

Capture exceções nas fronteiras de entrada (controllers, workers, CLIs). Dentro do domínio,
deixe propagar — não engula erros silenciosamente.

<details>
<summary>❌ Bad — rescue silencioso dentro do domínio</summary>
<br>

```ruby
# frozen_string_literal: true

def calculate_discount(order)
  begin
    apply_coupon(order)
  rescue StandardError
    nil
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — rescue específico na fronteira com log e re-raise</summary>
<br>

```ruby
# frozen_string_literal: true

# Fronteira: controller ou worker
def submit
  OrderService.new.submit(current_order)
rescue OrderErrors::InvalidOrder => error
  render json: { error: error.message }, status: :unprocessable_entity
rescue OrderErrors::PaymentFailed => error
  render json: { error: error.message }, status: :payment_required
end
```

</details>

## begin / rescue / ensure

Use `begin/rescue/ensure/end` quando precisar de cleanup garantido (fechar conexão, liberar
lock). No corpo de um método, omita `begin` — o método inteiro funciona como bloco.

<details>
<summary>❌ Bad — begin desnecessário no corpo do método</summary>
<br>

```ruby
# frozen_string_literal: true

def fetch_report(id)
  begin
    report = Report.find(id)
    report.generate
  rescue ActiveRecord::RecordNotFound
    nil
  ensure
    audit_log.write("fetch_report called")
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — rescue direto no método, ensure para cleanup</summary>
<br>

```ruby
# frozen_string_literal: true

def fetch_report(id)
  report = Report.find(id)

  report.generate
rescue ActiveRecord::RecordNotFound
  nil
ensure
  audit_log.write("fetch_report called for id=#{id}")
end
```

</details>

## Retry com limite

Use `retry` dentro do `rescue` para retentar operações transitórias. Sempre limite as
tentativas para evitar loop infinito.

<details>
<summary>❌ Bad — retry sem limite</summary>
<br>

```ruby
# frozen_string_literal: true

def call_external_api(payload)
  response = HttpClient.post(payload)
  response
rescue NetworkError
  retry
end
```

</details>

<br>

<details>
<summary>✅ Good — retry limitado com backoff</summary>
<br>

```ruby
# frozen_string_literal: true

MAX_RETRIES = 3

def call_external_api(payload)
  attempts = 0

  begin
    HttpClient.post(payload)
  rescue NetworkError => error
    attempts += 1
    raise error if attempts >= MAX_RETRIES

    sleep(2**attempts)
    retry
  end
end
```

</details>
