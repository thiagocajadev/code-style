# Variables

> Escopo: Ruby 4.0.

Ruby trata tudo como objeto. Variáveis locais, de instância e constantes têm escopos
distintos sinalizados pela sintaxe. Por padrão, strings são mutáveis — `# frozen_string_literal: true`
inverte esse default em todo o arquivo.

## Conceitos fundamentais

| Conceito                       | O que é                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `frozen_string_literal`        | Diretiva que congela todas as strings literais do arquivo, reduzindo alocação |
| **Symbol** (símbolo)           | String leve e imutável usada como chave ou identificador (`:status`)        |
| **freeze**                     | Método que torna qualquer objeto imutável em tempo de execução               |
| `@variável`                    | Variável de instância — pertence ao objeto, visível dentro da classe        |
| `CONSTANTE`                    | Valor fixo em nível de módulo ou classe; `SCREAMING_SNAKE_CASE`             |

## frozen_string_literal

Adicione `# frozen_string_literal: true` no topo de cada arquivo Ruby.

<details>
<summary>❌ Bad — string mutable alocada em loop</summary>
<br>

```ruby
def build_labels(orders)
  orders.map do |order|
    "Order #" + order.id.to_s
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — frozen_string_literal + interpolação</summary>
<br>

```ruby
# frozen_string_literal: true

def build_labels(orders)
  orders.map { |order| "Order ##{order.id}" }
end
```

</details>

## Mutabilidade

Prefira valores fixos. Mutação explícita deve ser justificada pelo fluxo.

<details>
<summary>❌ Bad — variável reatribuída sem necessidade</summary>
<br>

```ruby
# frozen_string_literal: true

def calculate_total(items)
  total = 0
  items.each { |item| total = total + item.price }
  total
end
```

</details>

<br>

<details>
<summary>✅ Good — sem mutação; resultado derivado diretamente</summary>
<br>

```ruby
# frozen_string_literal: true

def calculate_total(items)
  items.sum(&:price)
end
```

</details>

## Constantes nomeadas

Substitua literais inline por constantes nomeadas. Constantes em nível de módulo ficam
encapsuladas; não use constantes globais soltas.

<details>
<summary>❌ Bad — valores mágicos espalhados</summary>
<br>

```ruby
# frozen_string_literal: true

def retry_request
  3.times do
    response = api.call
    break if response.success?
    sleep 2
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas e encapsuladas</summary>
<br>

```ruby
# frozen_string_literal: true

module RetryPolicy
  MAX_ATTEMPTS = 3
  BACKOFF_SECONDS = 2
end

def retry_request
  RetryPolicy::MAX_ATTEMPTS.times do
    response = api.call
    break if response.success?
    sleep RetryPolicy::BACKOFF_SECONDS
  end
end
```

</details>

## Símbolos

Use símbolos (`:symbol`) para chaves de hash, identificadores de estado e opções de método.
Use strings para texto visível ao usuário ou dados externos.

<details>
<summary>❌ Bad — string como chave de hash interno</summary>
<br>

```ruby
# frozen_string_literal: true

def find_user(params)
  User.find_by(id: params["user_id"], status: "active")
end
```

</details>

<br>

<details>
<summary>✅ Good — símbolo para chave e estado interno</summary>
<br>

```ruby
# frozen_string_literal: true

def find_active_user(params)
  user_id = Integer(params[:user_id])

  User.find_by(id: user_id, status: :active)
end
```

</details>

## Variáveis de instância

Encapsule o acesso via `attr_reader` / `attr_accessor`. Não exponha `@variáveis` diretamente
fora da classe.

<details>
<summary>❌ Bad — acesso direto a @variável de fora</summary>
<br>

```ruby
# frozen_string_literal: true

class Order
  def initialize(id, total)
    @id = id
    @total = total
  end
end

order = Order.new(1, 100)
puts order.instance_variable_get(:@total)
```

</details>

<br>

<details>
<summary>✅ Good — interface explícita com attr_reader</summary>
<br>

```ruby
# frozen_string_literal: true

class Order
  attr_reader :id, :total

  def initialize(id:, total:)
    @id = id
    @total = total
  end
end

order = Order.new(id: 1, total: 100)
puts order.total
```

</details>
