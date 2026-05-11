# Performance

> Escopo: Ruby 4.0. Padrões transversais de performance em [shared/architecture/performance.md](../../../../shared/architecture/performance.md).

Performance em Ruby começa com o básico: `frozen_string_literal` reduz alocação de strings,
lazy enumerators (enumeradores tardios) evitam processar coleções inteiras, e
`each_with_object` substitui `inject` quando o acumulador é mutado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **object allocation** (alocação de objeto) | Criação de instância na heap; cada literal de string sem freeze gera uma |
| **GC** (coletor de lixo) | Garbage collector que recupera memória de objetos sem referência; mais alocação significa mais pausas |
| **memoization** (cache de resultado) | Guardar resultado de cálculo caro em variável de instância (`@user ||= ...`) |
| **lazy enumerator** (enumerador tardio) | `Enumerator::Lazy` que processa elementos sob demanda; evita materializar arrays intermediários |
| **frozen string literal** (literal de string congelada) | Diretiva `# frozen_string_literal: true` que reusa o mesmo objeto para strings idênticas |
| **each_with_object** (iteração com acumulador) | Itera passando um acumulador mutável; substitui `inject` quando o acumulador não é reatribuído |

## frozen_string_literal

Cada literal de string sem `frozen_string_literal: true` cria um novo objeto na heap
(memória dinâmica). Com a diretiva, strings idênticas compartilham o mesmo objeto.

<details>
<summary>❌ Ruim — string alocada a cada iteração</summary>

```ruby
def build_greetings(users)
  users.map { |user| "Hello, " + user.name }
end
```

</details>

<details>
<summary>✅ Bom — frozen_string_literal + interpolação</summary>

```ruby
# frozen_string_literal: true

def build_greetings(users)
  users.map { |user| "Hello, #{user.name}" }
end
```

</details>

## Lazy enumerators

Use `.lazy` quando a coleção é grande e você precisa apenas dos primeiros N elementos.
Evita processar o array inteiro.

<details>
<summary>❌ Ruim — processa toda a coleção mesmo precisando de poucos</summary>

```ruby
# frozen_string_literal: true

def first_expensive_orders(orders)
  orders
    .select { |o| o.total > 1_000 }
    .map { |o| o.summary }
    .first(10)
end
```

</details>

<details>
<summary>✅ Bom — lazy avalia só até encontrar 10 elementos</summary>

```ruby
# frozen_string_literal: true

def first_expensive_orders(orders)
  summaries = orders
    .lazy
    .select { |o| o.total > 1_000 }
    .map { |o| o.summary }
    .first(10)

  summaries
end
```

</details>

## each_with_object vs inject

Use `each_with_object` quando o acumulador é mutado a cada iteração. Use `inject`/`reduce`
quando constrói um novo valor (soma, produto, string concatenada).

<details>
<summary>❌ Ruim — inject com mutação do acumulador</summary>

```ruby
# frozen_string_literal: true

def group_by_status(orders)
  orders.inject({}) do |groups, order|
    groups[order.status] ||= []
    groups[order.status] << order
    groups
  end
end
```

</details>

<details>
<summary>✅ Bom — each_with_object para acumulador mutável</summary>

```ruby
# frozen_string_literal: true

def group_by_status(orders)
  grouped = orders.each_with_object(Hash.new { |h, k| h[k] = [] }) do |order, groups|
    groups[order.status] << order
  end

  grouped
end
```

</details>

## map + compact vs filter_map

`filter_map` substitui `map` + `compact` (remoção de nils) em uma passagem.

<details>
<summary>❌ Ruim — dois passes na coleção</summary>

```ruby
# frozen_string_literal: true

def active_order_ids(orders)
  orders
    .map { |o| o.id if o.active? }
    .compact
end
```

</details>

<details>
<summary>✅ Bom — filter_map em uma passagem</summary>

```ruby
# frozen_string_literal: true

def active_order_ids(orders)
  active_ids = orders.filter_map { |o| o.id if o.active? }
  active_ids
end
```

</details>

## N+1 em ActiveRecord

Use `includes` para pré-carregar associações (eager loading, carregamento antecipado) e
evitar N+1 queries (N+1 consultas ao banco).

<details>
<summary>❌ Ruim — N+1: 1 query por ordem para buscar o usuário</summary>

```ruby
# frozen_string_literal: true

def order_summaries
  Order.all.map { |order| "#{order.user.name}: #{order.total}" }
end
```

</details>

<details>
<summary>✅ Bom — includes pré-carrega em 2 queries</summary>

```ruby
# frozen_string_literal: true

def order_summaries
  summaries = Order.includes(:user).map { |order| "#{order.user.name}: #{order.total}" }
  summaries
end
```

</details>

## Benchmark antes de otimizar

Meça antes de alterar. Use `Benchmark.measure` ou `benchmark-ips` (iterations per second,
iterações por segundo) para comparar alternativas.

```ruby
# frozen_string_literal: true

require "benchmark/ips"

Benchmark.ips do |benchmark|
  benchmark.report("map + compact") do
    orders.map { |o| o.id if o.active? }.compact
  end

  benchmark.report("filter_map") do
    orders.filter_map { |o| o.id if o.active? }
  end

  benchmark.compare!
end
```
