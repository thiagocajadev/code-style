# Naming

> Escopo: Ruby 4.0.

Nomes bons tornam comentários desnecessários. Ruby usa capitalização e sufixos (`?`, `!`)
como parte da semântica da linguagem — convenções que o RuboCop enforça automaticamente.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```ruby
# frozen_string_literal: true

def apply(x, p, c)
  return if p[:inadimplente]

  c.call
end
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```ruby
# frozen_string_literal: true

def apply_discount(order, calculate:)
  return unless order.customer.defaulted?

  calculate.call(order)
end
```

</details>

## Convenções de case

Ruby usa capitalização como sinal semântico. O RuboCop avisa sobre violações automaticamente.

| Contexto                               | Convenção              | Exemplos                                    |
| -------------------------------------- | ---------------------- | ------------------------------------------- |
| Métodos e variáveis locais             | `snake_case`           | `find_user`, `calculate_total`              |
| Classes e módulos                      | `PascalCase`           | `UserService`, `OrderRepository`            |
| Constantes                             | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT`            |
| Variável de instância                  | `@snake_case`          | `@user_id`, `@order_total`                  |
| Variável de classe                     | `@@snake_case`         | `@@instance_count`                          |
| Símbolos                               | `:snake_case`          | `:status`, `:created_at`                    |
| Método predicado (retorna true/false)  | `snake_case?`          | `active?`, `valid?`, `empty?`               |
| Método destrutivo / que lança exceção  | `snake_case!`          | `save!`, `destroy!`, `validate!`            |

<details>
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```ruby
# frozen_string_literal: true

MaxRetries = 3
def CalculateTotal; end
class order_service; end
def isActive?; end
```

</details>

<br>

<details>
<summary>✅ Good — convenções Ruby respeitadas</summary>
<br>

```ruby
# frozen_string_literal: true

MAX_RETRIES = 3

def calculate_total; end

class OrderService; end

def active?
  status == :active
end
```

</details>

## Ordem semântica

Em inglês, o nome segue a ordem natural da fala: **verbo + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```ruby
# frozen_string_literal: true

def get_profile_user(user_id) = nil
def update_status_order(order_id) = nil
def calculate_total_invoice(invoice_id) = nil
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```ruby
# frozen_string_literal: true

def get_user_profile(user_id) = nil
def update_order_status(order_id) = nil
def calculate_invoice_total(invoice_id) = nil
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage não dizem nada</summary>
<br>

```ruby
# frozen_string_literal: true

def handle(data) = nil
def process(input) = nil
def manage(items) = nil
def do_stuff(x) = nil
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```ruby
# frozen_string_literal: true

def validate_payment(payment) = nil
def calculate_order_total(items) = nil
def notify_customer_default(order) = nil
def apply_seasonal_discount(order) = nil
```

</details>

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de onde a operação acontece.

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```ruby
# frozen_string_literal: true

def call_stripe(amount) = nil
def get_user_from_db(user_id) = nil
def post_to_slack(message) = nil
def save_to_s3(file) = nil
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```ruby
# frozen_string_literal: true

def charge_customer(amount) = nil
def find_user(user_id) = nil
def notify_team(message) = nil
def archive_document(file) = nil
```

</details>

## Boolean naming

Variáveis booleanas usam prefixo semântico. Métodos predicados usam sufixo `?` (idioma Ruby).

<details>
<summary>❌ Bad — booleanos sem sinal semântico</summary>
<br>

```ruby
# frozen_string_literal: true

loading = true
active = user.status == :active
valid = email.include?("@")
```

</details>

<br>

<details>
<summary>✅ Good — variáveis com prefixo; métodos com sufixo ?</summary>
<br>

```ruby
# frozen_string_literal: true

is_active = user.active?
has_permission = user.roles.include?(:admin)

can_delete = is_active && has_permission
should_retry = attempt < MAX_RETRIES

# Métodos predicados: sufixo ? sem prefixo
def active? = status == :active
def has_open_orders? = orders.any?(&:pending?)
```

</details>

## Sufixo `!` — bang methods

Métodos com `!` sinalizam comportamento destrutivo ou que lança exceção em vez de retornar `nil`/`false`.

<details>
<summary>❌ Bad — bang em método que não tem par sem bang</summary>
<br>

```ruby
# frozen_string_literal: true

def send_email!(user)
  # não existe send_email equivalente — bang sem propósito
  Mailer.deliver(user)
end
```

</details>

<br>

<details>
<summary>✅ Good — par save / save! com comportamentos distintos</summary>
<br>

```ruby
# frozen_string_literal: true

# Retorna false em falha de validação
def save
  return false unless valid?

  persist
end

# Lança ActiveRecord::RecordInvalid em falha de validação
def save!
  raise RecordInvalid, self unless valid?

  persist
end
```

</details>

## Acrônimos e siglas

Trate acrônimos como palavras normais em `PascalCase`. Evite maiúsculas em sequência.

<details>
<summary>❌ Bad — acrônimo inteiro em maiúsculas</summary>
<br>

```ruby
# frozen_string_literal: true

class HTTPClient; end
class APIError < StandardError; end
def parseJSON(raw) = nil
```

</details>

<br>

<details>
<summary>✅ Good — acrônimo como palavra normal</summary>
<br>

```ruby
# frozen_string_literal: true

class HttpClient; end
class ApiError < StandardError; end
def parse_json(raw) = nil
```

</details>
