# Dates

> Escopo: Ruby 4.0. Padrão ISO 8601 em [shared/standards/editorconfig.md](../../../../shared/standards/editorconfig.md).

Ruby oferece `Time` na stdlib para datas e horas. Rails adiciona `ActiveSupport::TimeWithZone`
para manipulação de fusos horários. A regra é simples: **sempre armazene UTC**, converta
para o fuso do usuário apenas na camada de apresentação.

## Conceitos fundamentais

| Conceito                    | O que é                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| **UTC**                     | Universal Time Coordinated — fuso padrão para armazenamento e processamento   |
| **ISO 8601**                | Formato de data/hora: `"2026-04-26T14:30:00Z"` ou `"2026-04-26"`              |
| `Time.now.utc`              | Instância de `Time` no fuso UTC                                                |
| `ActiveSupport::TimeZone`   | Wrapper Rails sobre TZInfo; converte entre fusos de forma segura               |
| `in_time_zone`              | Converte `Time` para `ActiveSupport::TimeWithZone` no fuso informado           |

## UTC por padrão

<details>
<summary>❌ Bad — hora local sem fuso explícito</summary>
<br>

```ruby
# frozen_string_literal: true

def record_submission
  Order.update!(submitted_at: Time.now)
end
```

</details>

<br>

<details>
<summary>✅ Good — UTC explícito no armazenamento</summary>
<br>

```ruby
# frozen_string_literal: true

def record_submission(order)
  order.update!(submitted_at: Time.now.utc)
end
```

</details>

## Parsing de string para Time

Use `Time.parse` ou `Time.iso8601` para converter strings. Prefira `Time.iso8601` —
valida o formato e lança `ArgumentError` para entradas inválidas.

<details>
<summary>❌ Bad — parse de string sem validação de formato</summary>
<br>

```ruby
# frozen_string_literal: true

def schedule_delivery(params)
  delivery_at = Time.parse(params[:delivery_at])

  Delivery.create!(scheduled_at: delivery_at)
end
```

</details>

<br>

<details>
<summary>✅ Good — iso8601 valida formato + UTC explícito</summary>
<br>

```ruby
# frozen_string_literal: true

def schedule_delivery(params)
  delivery_at = Time.iso8601(params[:delivery_at]).utc

  Delivery.create!(scheduled_at: delivery_at)
rescue ArgumentError
  raise ValidationError, "delivery_at must be ISO 8601 (e.g. 2026-04-26T14:00:00Z)"
end
```

</details>

## ActiveSupport::TimeZone (Rails)

Use `Time.zone.now` no lugar de `Time.now` em projetos Rails — respeita `config.time_zone`.
Converta para o fuso do usuário apenas na apresentação.

<details>
<summary>❌ Bad — Time.now ignora config.time_zone</summary>
<br>

```ruby
# frozen_string_literal: true

def display_created_at(order)
  order.created_at.strftime("%d/%m/%Y %H:%M")
end
```

</details>

<br>

<details>
<summary>✅ Good — conversão para fuso do usuário na apresentação</summary>
<br>

```ruby
# frozen_string_literal: true

def display_created_at(order, time_zone:)
  local_time = order.created_at.in_time_zone(time_zone)

  local_time.strftime("%d/%m/%Y %H:%M")
end
```

</details>

## Aritmética de datas

Use os helpers de duração do ActiveSupport (`1.day`, `2.weeks`, `3.months`) para
aritmética legível. Para Ruby puro, use `Time` com segundos explícitos.

<details>
<summary>❌ Bad — aritmética em segundos mágicos</summary>
<br>

```ruby
# frozen_string_literal: true

def token_expires_at
  Time.now.utc + 86_400
end
```

</details>

<br>

<details>
<summary>✅ Good — duração nomeada com ActiveSupport</summary>
<br>

```ruby
# frozen_string_literal: true

TOKEN_VALIDITY = 24.hours

def token_expires_at
  expires_at = Time.now.utc + TOKEN_VALIDITY

  expires_at
end
```

</details>

## Comparação de datas

Use os operadores `<`, `>`, `between?` diretamente em objetos `Time`. Nunca compare strings
de data.

<details>
<summary>❌ Bad — comparação de strings de data</summary>
<br>

```ruby
# frozen_string_literal: true

def expired?(token)
  token.expires_at.to_s < Time.now.utc.to_s
end
```

</details>

<br>

<details>
<summary>✅ Good — comparação de objetos Time</summary>
<br>

```ruby
# frozen_string_literal: true

def expired?(token)
  token.expires_at < Time.now.utc
end
```

</details>
