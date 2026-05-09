# Types

> Escopo: Ruby 4.0.

Ruby é dinamicamente tipado e orientado a objetos. Tudo é um objeto, incluindo `nil`,
`true` e `false`. Módulos proveem mixins (composição de comportamento); `Data.define`
cria value objects (objetos de valor) imutáveis. Pattern matching `case/in` inspeciona a
forma de objetos.

## Conceitos fundamentais

| Conceito                    | O que é                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Duck typing**             | Um objeto responde a uma mensagem se implementa o método — não exige herança     |
| **Mixin**                   | Módulo incluído em uma classe para adicionar comportamento sem herança           |
| `Data.define`               | Cria classe imutável com campos nomeados (Ruby 3.2+)                             |
| **nil**                     | Ausência de valor — único objeto da classe `NilClass`; diferente de `false`     |
| `respond_to?`               | Verifica se um objeto implementa um método antes de chamá-lo                    |
| **Pattern matching**        | `case/in` que desestrutura a forma do objeto para ramificação segura            |

## Classes

Use `initialize` com keyword arguments para deixar a construção auto-documentada.
Prefira `attr_reader` sobre exposição de variáveis de instância diretamente.

<details>
<summary>❌ Bad — positional args, atributo exposto como accessor</summary>
<br>

```ruby
# frozen_string_literal: true

class Order
  attr_accessor :id, :total, :status

  def initialize(id, total, status)
    @id = id
    @total = total
    @status = status
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — keyword args, reader apenas para campos imutáveis</summary>
<br>

```ruby
# frozen_string_literal: true

class Order
  attr_reader :id, :total, :status

  def initialize(id:, total:, status: :pending)
    @id = id
    @total = total
    @status = status
  end

  def active? = status == :active
  def paid?   = status == :paid
end
```

</details>

## Data.define — value objects

Use `Data.define` para estruturas imutáveis que representam conceitos de domínio sem
comportamento. Mais leve que uma classe completa.

<details>
<summary>❌ Bad — Struct mutável para dados que não deveriam mudar</summary>
<br>

```ruby
# frozen_string_literal: true

Address = Struct.new(:street, :city, :country)

address = Address.new("Rua das Flores", "São Paulo", "BR")
address.city = "Rio de Janeiro"
```

</details>

<br>

<details>
<summary>✅ Good — Data.define cria value object imutável</summary>
<br>

```ruby
# frozen_string_literal: true

Address = Data.define(:street, :city, :country)

address = Address.new(street: "Rua das Flores", city: "São Paulo", country: "BR")

updated_address = address.with(city: "Rio de Janeiro")
```

</details>

## Módulos como mixins

Use módulos para compartilhar comportamento entre classes sem herança. `include` para
comportamento de instância; `extend` para comportamento de classe.

<details>
<summary>❌ Bad — herança apenas para reutilizar comportamento</summary>
<br>

```ruby
# frozen_string_literal: true

class Auditable
  def created_at = @created_at
  def updated_at = @updated_at
end

class Order < Auditable; end
class Product < Auditable; end
```

</details>

<br>

<details>
<summary>✅ Good — mixin para comportamento transversal</summary>
<br>

```ruby
# frozen_string_literal: true

module Auditable
  def created_at = @created_at
  def updated_at = @updated_at

  def touch
    @updated_at = Time.now.utc
  end
end

class Order
  include Auditable
end

class Product
  include Auditable
end
```

</details>

## nil safety

Verifique `nil` antes de encadear chamadas. Use `&.` (safe navigation operator, operador
de navegação segura) para cadeia que pode retornar `nil`.

<details>
<summary>❌ Bad — NoMethodError em potencial</summary>
<br>

```ruby
# frozen_string_literal: true

def shipping_city(order)
  order.address.city.upcase
end
```

</details>

<br>

<details>
<summary>✅ Good — safe navigation + guard clause</summary>
<br>

```ruby
# frozen_string_literal: true

def shipping_city(order)
  return nil unless order.address

  city = order.address.city&.upcase

  city
end
```

</details>

## Duck typing

Prefira verificar comportamento (`respond_to?`) no lugar de tipo (`is_a?`), exceto em
fronteiras de domínio onde o tipo é parte do contrato.

<details>
<summary>❌ Bad — verificação de tipo rígida bloqueia polimorfismo</summary>
<br>

```ruby
# frozen_string_literal: true

def serialize(object)
  raise TypeError unless object.is_a?(Hash) || object.is_a?(Array)

  JSON.generate(object)
end
```

</details>

<br>

<details>
<summary>✅ Good — verificação de comportamento</summary>
<br>

```ruby
# frozen_string_literal: true

def serialize(object)
  raise TypeError, "object must respond to #to_json" unless object.respond_to?(:to_json)

  object.to_json
end
```

</details>
