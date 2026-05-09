# Security

> Escopo: Ruby 4.0. Princípios de segurança transversais em [shared/platform/security.md](../../../shared/platform/security.md).

Secrets (segredos) nunca entram no repositório. Ruby on Rails usa `credentials.yml.enc`
para secrets criptografados; projetos Ruby puro usam variáveis de ambiente via `dotenv`.

## Variáveis de ambiente

<details>
<summary>❌ Bad — secret hardcoded no código</summary>
<br>

```ruby
# frozen_string_literal: true

class PaymentClient
  API_KEY = "sk_live_abc123xyz"

  def charge(amount)
    client = Stripe::Client.new(API_KEY)
    client.charge(amount)
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — lido do ambiente na inicialização</summary>
<br>

```ruby
# frozen_string_literal: true

class PaymentClient
  def initialize
    @api_key = fetch_api_key
  end

  def charge(amount)
    client = Stripe::Client.new(@api_key)
    client.charge(amount)
  end

  private

  def fetch_api_key
    ENV.fetch("STRIPE_API_KEY") { raise "STRIPE_API_KEY is not set" }
  end
end
```

</details>

## dotenv (projetos Ruby puro)

```ruby
# Gemfile
gem "dotenv", groups: %i[development test]
```

```bash
# .env.example — commitado
STRIPE_API_KEY=
DATABASE_URL=
REDIS_URL=
```

```bash
# .env — nunca commitado (.gitignore)
STRIPE_API_KEY=sk_test_...
DATABASE_URL=postgres://localhost/myapp_dev
```

```ruby
# config/application.rb ou bin/setup
require "dotenv/load"
```

## Rails credentials

Rails 8 gerencia secrets com `credentials.yml.enc` (criptografado) + `master.key` (nunca commitado):

```bash
# Editar credentials
EDITOR="code --wait" bin/rails credentials:edit

# Por ambiente
EDITOR="code --wait" bin/rails credentials:edit --environment production
```

```yaml
# config/credentials.yml.enc (após editar)
stripe:
  api_key: sk_live_...
  webhook_secret: whsec_...
```

```ruby
# frozen_string_literal: true

# Leitura tipada com fail-fast
module Config
  STRIPE_API_KEY = Rails.application.credentials.dig(:stripe, :api_key).tap do |key|
    raise "stripe.api_key is not configured" if key.blank?
  end
end
```

## Validação na fronteira

<details>
<summary>❌ Bad — parâmetro de usuário usado diretamente</summary>
<br>

```ruby
# frozen_string_literal: true

def find_order(params)
  Order.where("id = #{params[:order_id]}")
end
```

</details>

<br>

<details>
<summary>✅ Good — tipagem e sanitização antes de usar</summary>
<br>

```ruby
# frozen_string_literal: true

def find_order(params)
  order_id = Integer(params[:order_id])

  Order.find(order_id)
end
```

</details>

Use `Integer()` e `Float()` (maiúsculos) no lugar de `.to_i` e `.to_f` — eles lançam `ArgumentError`
quando o valor é inválido; `.to_i` retorna `0` silenciosamente.
