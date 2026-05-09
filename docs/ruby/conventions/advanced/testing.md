# Testing

> Escopo: Ruby 4.0. Padrões transversais de testes em [shared/standards/testing.md](../../../../shared/standards/testing.md).

RSpec (Ruby Specification Framework, framework de especificação) é o padrão para projetos
Ruby e Rails. Testes seguem o padrão **AAA** (Arrange, Act, Assert — Preparar, Agir,
Verificar), com fases explícitas e assertions (verificações) sem expressões inline.

## Conceitos fundamentais

| Conceito         | O que é                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| **RSpec**        | Framework de testes orientado a comportamento; DSL fluente com `describe/it`    |
| `describe`       | Agrupa testes por classe ou método                                               |
| `context`        | Sub-agrupamento por cenário ou estado                                            |
| `it`             | Um caso de teste; deve ter 1 assertion semântica                                 |
| `let`            | Define variável lazy (avaliada sob demanda), memo-izada por exemplo              |
| `subject`        | O objeto principal do teste; inferido ou declarado                               |
| **FactoryBot**   | Fábrica de objetos de teste; substitui fixtures com dados expressivos            |

## AAA — Arrange, Act, Assert

Fases explícitas em cada `it`. Um `expect` por exemplo; sem lógica inline no assert.

<details>
<summary>❌ Bad — fases misturadas, assert com lógica inline</summary>
<br>

```ruby
# frozen_string_literal: true

it "applies discount" do
  expect(OrderService.new.calculate_total(
    Order.new(items: [Item.new(price: 100)]),
    user_id: 2
  )).to eq(90.0)
end
```

</details>

<br>

<details>
<summary>✅ Good — AAA explícito, resultado nomeado</summary>
<br>

```ruby
# frozen_string_literal: true

it "applies 10% discount for eligible users" do
  order = build(:order, items: [build(:item, price: 100)])
  service = OrderService.new

  total = service.calculate_total(order, user_id: 2)

  expect(total).to eq(90.0)
end
```

</details>

## describe / context / it

`describe` agrupa por classe ou método. `context` descreve o estado ou cenário. `it`
declara a expectativa em linguagem de negócio.

<details>
<summary>❌ Bad — nomes sem contexto, fases coladas</summary>
<br>

```ruby
# frozen_string_literal: true

describe "order" do
  it "test1" do
    o = Order.new(status: :active)
    expect(o.active?).to be true
  end
  it "test2" do
    o = Order.new(status: :cancelled)
    expect(o.active?).to be false
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — hierarquia semântica, 1 expectativa por exemplo</summary>
<br>

```ruby
# frozen_string_literal: true

describe Order do
  describe "#active?" do
    context "when status is :active" do
      it "returns true" do
        order = build(:order, status: :active)

        expect(order.active?).to be(true)
      end
    end

    context "when status is :cancelled" do
      it "returns false" do
        order = build(:order, status: :cancelled)

        expect(order.active?).to be(false)
      end
    end
  end
end
```

</details>

## Factories com FactoryBot

Factories criam objetos expressivos sem acoplar o teste ao schema. Defina o estado mínimo
válido na factory base; use `trait` para variações.

<details>
<summary>❌ Bad — criação manual sem contexto</summary>
<br>

```ruby
# frozen_string_literal: true

let(:order) { Order.new(id: 1, user_id: 5, total: 200, status: "active", created_at: Time.now) }
```

</details>

<br>

<details>
<summary>✅ Good — factory com estado mínimo e traits semânticos</summary>
<br>

```ruby
# frozen_string_literal: true

# spec/factories/orders.rb
FactoryBot.define do
  factory :order do
    association :user
    total { 100.0 }
    status { :pending }

    trait :active   do status { :active } end
    trait :paid     do status { :paid } end
    trait :large    do total { 500.0 } end
  end
end

# spec: estado declarado no contexto
let(:active_order) { create(:order, :active) }
let(:large_order)  { create(:order, :large) }
```

</details>

## Mocks e doubles

Mock dependências externas (API, banco de dados de terceiros, email). Dentro do domínio,
prefira objetos reais ou fakes nomeados — não inline stubs.

<details>
<summary>❌ Bad — stub inline sem nome</summary>
<br>

```ruby
# frozen_string_literal: true

it "sends confirmation" do
  allow_any_instance_of(OrderMailer).to receive(:deliver_later)

  OrderService.new.submit(build(:order))

  expect_any_instance_of(OrderMailer).to have_received(:deliver_later)
end
```

</details>

<br>

<details>
<summary>✅ Good — double nomeado, interface explícita</summary>
<br>

```ruby
# frozen_string_literal: true

it "notifies customer after submission" do
  mailer = instance_double(OrderMailer, deliver_later: true)
  allow(OrderMailer).to receive(:confirmation).and_return(mailer)

  order = create(:order)
  OrderService.new.submit(order)

  expect(mailer).to have_received(:deliver_later)
end
```

</details>

## Shared examples

Use `shared_examples` para comportamento comum entre múltiplas classes — evita duplicação
sem sacrificar clareza.

```ruby
# frozen_string_literal: true

RSpec.shared_examples "an auditable record" do
  it "has a created_at timestamp" do
    expect(subject.created_at).not_to be_nil
  end

  it "has an updated_at timestamp" do
    expect(subject.updated_at).not_to be_nil
  end
end

describe Order do
  subject { create(:order) }
  it_behaves_like "an auditable record"
end

describe Product do
  subject { create(:product) }
  it_behaves_like "an auditable record"
end
```
