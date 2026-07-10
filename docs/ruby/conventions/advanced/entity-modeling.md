# Modelagem de entidades

> Escopo: Ruby 3.3+. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `Data.define` para **value objects**, herança de `Entity` para entidades, símbolos para **status**, `dup` para proteção de coleções internas.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Ruby e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem Ruby 3.3+ com `# frozen_string_literal: true` em todo arquivo.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItems` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo `initialize` e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada do método, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `String` ou UUID cru, para impedir trocas acidentais entre IDs |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | Campo que aceita `nil` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (ActiveRecord, Sequel, ROM) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deleted_at` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| **Data** (classe de valor imutável) | `Data.define(:field)` cria uma classe Ruby 3.2+ com igualdade estrutural, campos somente leitura e sem herança de estado |
| **Struct** (estrutura mutável) | `Struct.new(:field, keyword_init: true)` cria uma classe mutável; evitar para value objects de domínio |
| **attr_reader** (leitor de atributo) | Gera método de leitura para variável de instância; preferir sobre `attr_accessor` em domínio |
| **attr_accessor** (acessor de atributo) | Gera leitura e escrita para variável de instância; usar apenas quando a escrita é intencional |
| **frozen** (congelado, valor que não muda após criação) | Objeto marcado com `freeze` que levanta `FrozenError` em qualquer tentativa de alteração |
| **dup** (cópia superficial) | `Array#dup` retorna nova instância com os mesmos elementos; protege a coleção interna de alterações externas |
| **safe navigation** (`&.`, navegação segura) | Operador que interrompe a cadeia e retorna `nil` quando o receptor é `nil`, evitando `NoMethodError` |
| **RBS** (Ruby Signature · assinatura de tipo Ruby) | Arquivo `.rbs` que declara tipos estáticos para classes Ruby; utilizado por Steep e Sorbet |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo, e ninguém deveria comprometer-se com um. O sinal que funciona é a coesão: as propriedades mudam juntas, são consultadas juntas, fazem sentido juntas. Quando um subconjunto começa a mudar em outro ritmo, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 10 propriedades**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre é sinal de duas entidades coladas na mesma classe. Quebrar.

Quando o nome da entidade não descreve mais o que ela faz e vira lista (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```ruby
# frozen_string_literal: true

class Customer
  attr_reader :id, :first_name, :last_name, :email, :phone, :birth_date,
              :street, :number, :complement, :city, :state, :zip_code, :country,
              :newsletter_opt_in, :sms_opt_in, :preferred_language,
              :tax_id, :tax_regime, :invoice_email

  def initialize(
    id:, first_name:, last_name:, email:, phone:, birth_date:,
    street:, number:, complement: nil, city:, state:, zip_code:, country:,
    newsletter_opt_in: false, sms_opt_in: false, preferred_language: "pt-BR",
    tax_id: nil, tax_regime: nil, invoice_email: nil
  )
    @id = id
    @first_name = first_name
    @last_name = last_name
    @email = email
    @phone = phone
    @birth_date = birth_date
    @street = street
    @number = number
    @complement = complement
    @city = city
    @state = state
    @zip_code = zip_code
    @country = country
    @newsletter_opt_in = newsletter_opt_in
    @sms_opt_in = sms_opt_in
    @preferred_language = preferred_language
    @tax_id = tax_id
    @tax_regime = tax_regime
    @invoice_email = invoice_email
  end
end
```

20 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `nil` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```ruby
# frozen_string_literal: true

Address = Data.define(:street, :number, :complement, :city, :state, :zip_code, :country)

CustomerPreferences = Data.define(:newsletter_opt_in, :sms_opt_in, :preferred_language)

TaxInfo = Data.define(:tax_id, :tax_regime, :invoice_email)

class Customer
  attr_reader :id, :name, :email, :address, :preferences, :tax_info

  def initialize(id:, name:, email:, address:, preferences:, tax_info: nil)
    @id = id
    @name = name
    @email = email
    @address = address       # Address (value object)
    @preferences = preferences # CustomerPreferences (value object)
    @tax_info = tax_info     # TaxInfo (value object), nil para PF
  end
end
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é `nil` inteiro: quando presente, vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`nil` em 8 de 20).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Ruby, `Data.define` é a escolha certa: imutável por natureza, igualdade estrutural gratuita, `with(field:)` para derivar uma cópia alterada.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `nil`; quando presente, traz o conceito completo com validação no `initialize`.

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customer_id`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```ruby
# frozen_string_literal: true

class Customer
  attr_reader :id, :name, :email, :tax_id, :tax_regime, :invoice_email

  def initialize(id:, name:, email:, tax_id: nil, tax_regime: nil, invoice_email: nil)
    @id = id
    @name = name
    @email = email
    @tax_id = tax_id
    @tax_regime = tax_regime
    @invoice_email = invoice_email
  end

  def tax_info?
    !tax_id.nil? && !tax_regime.nil?
  end
end
```

A regra "se um campo de imposto existe, todos existem" mora em `tax_info?`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. É possível criar um `Customer` com `tax_id` preenchido e `tax_regime` `nil`: estado inválido aceito silenciosamente.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional com validação no initialize</summary>

```ruby
# frozen_string_literal: true

class TaxInfo
  attr_reader :tax_id, :tax_regime, :invoice_email

  def initialize(tax_id:, tax_regime:, invoice_email:)
    raise ArgumentError, "TaxInfo requires tax_id" if tax_id.nil? || tax_id.empty?
    raise ArgumentError, "TaxInfo requires tax_regime" if tax_regime.nil? || tax_regime.empty?

    @tax_id = tax_id
    @tax_regime = tax_regime
    @invoice_email = invoice_email
  end
end

class Customer
  attr_reader :id, :name, :email, :tax_info

  def initialize(id:, name:, email:, tax_info: nil)
    @id = id
    @name = name
    @email = email
    @tax_info = tax_info
  end

  def tax_info?
    !@tax_info.nil?
  end
end
```

A invariante "se imposto existe, é completo" mora no `initialize` de `TaxInfo`. Quem cria um cliente sem imposto passa `nil`. Não tem como construir um `TaxInfo` parcial: o construtor falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `order_id` onde o método esperava `customer_id`, ou inverte a ordem dos argumentos sem perceber. Como todos são `String` ou `Integer`, nada acusa a troca, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

Ruby não tem tipagem estática nativa, mas a defesa é barata: embrulhar cada ID em um tipo próprio usando `Data.define`. A classe `Data` (Ruby 3.2+) gera igualdade estrutural automática (`==` por valor), é imutável por padrão, e custa três linhas por ID. O factory `self.from(raw)` é o único ponto que produz o tipo, com validação centralizada.

Duck typing é uma limitação real aqui: o Ruby aceita qualquer objeto onde `String` seria esperado. A mitigação no **limite** é `is_a?(CustomerId)` antes de usar o valor. Quando tipagem estática faz sentido (projeto grande, equipe maior), Sorbet com `T::Struct` ou RBS com `.rbs` complementam a guarda em runtime.

<details>
<summary>❌ Ruim: IDs como string crua, fáceis de trocar de lugar</summary>

```ruby
# frozen_string_literal: true

def transfer_ownership(customer_id, order_id)
  # assinatura: customer_id primeiro, order_id depois
  # se o caller inverter, o bug passa silencioso
  OrderRepository.update(order_id, customer_id:)
end

target_order = order.id
new_owner = customer.id

transfer_ownership(target_order, new_owner) # inverte; nada acusa
```

</details>

<details>
<summary>✅ Bom: ID embrulhado em Data.define com factory e validação</summary>

```ruby
# frozen_string_literal: true

CustomerId = Data.define(:value) do
  def self.from(raw)
    raise ArgumentError, "CustomerId requires a value" if raw.nil? || raw.to_s.empty?

    new(value: raw.to_s)
  end

  def to_s
    value
  end
end

OrderId = Data.define(:value) do
  def self.from(raw)
    raise ArgumentError, "OrderId requires a value" if raw.nil? || raw.to_s.empty?

    new(value: raw.to_s)
  end

  def to_s
    value
  end
end

def transfer_ownership(customer_id, order_id)
  raise TypeError, "customer_id must be CustomerId" unless customer_id.is_a?(CustomerId)
  raise TypeError, "order_id must be OrderId" unless order_id.is_a?(OrderId)

  OrderRepository.update(order_id, customer_id:)
end

new_owner = CustomerId.from(customer.id_value)
target_order = OrderId.from(order.id_value)

transfer_ownership(new_owner, target_order)
```

`Data.define` entrega igualdade estrutural: dois `CustomerId.new(value: "123")` são iguais por `==`. O factory `self.from` valida na entrada. A guarda `is_a?` falha cedo no limite, antes da lógica rodar.

</details>

`Data.define` tem uma vantagem sobre uma classe manual: `==` e `hash` já estão implementados corretamente para uso em `Set` e como chave de `Hash`. Para projetos com muitos IDs, o padrão se generaliza extraindo o bloco de validação para um módulo.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenant_id?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`created_at`, `updated_at`, `created_by`, `updated_by`). Vão por composição (campo `audit`) ou por mixin (`module Auditable`) incluído somente nas entidades que precisam.
- **Caso à parte**: `tenant_id`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

**CUIDADO:** não use `Data.define` para criar entidades. `Data` implementa `==` estruturalmente (todos os campos iguais). Entidades têm identidade: dois objetos com o mesmo ID são iguais mesmo com campos diferentes. Herança normal de `Entity` preserva esse contrato.

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```ruby
# frozen_string_literal: true

class BaseEntity
  attr_reader :id, :created_at, :updated_at, :deleted_at,
              :version, :tenant_id, :created_by, :updated_by

  def initialize(id:, created_at:, updated_at:, deleted_at: nil,
                 version: 1, tenant_id:, created_by: nil, updated_by: nil)
    @id = id
    @created_at = created_at
    @updated_at = updated_at
    @deleted_at = deleted_at
    @version = version
    @tenant_id = tenant_id
    @created_by = created_by
    @updated_by = updated_by
  end
end

class OrderItem < BaseEntity
  attr_reader :product_id, :quantity

  def initialize(id:, product_id:, quantity:, **audit_fields)
    super(id:, **audit_fields)
    @product_id = product_id
    @quantity = quantity
  end
end
```

`OrderItem` carrega `tenant_id`, `created_by`, `version` que não usa nem precisa. O construtor da base aceita oito campos para devolver um item de pedido com dois. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima + mixin para comportamentos extras</summary>

```ruby
# frozen_string_literal: true

class Entity
  attr_reader :id

  def initialize(id:)
    raise ArgumentError, "Entity requires id" if id.nil?

    @id = id
  end

  def ==(other)
    other.instance_of?(self.class) && other.id == id
  end

  alias eql? ==

  def hash
    [self.class, id].hash
  end
end

module Auditable
  attr_reader :created_at, :updated_at, :created_by, :updated_by

  def assign_audit(created_at:, updated_at:, created_by: nil, updated_by: nil)
    @created_at = created_at
    @updated_at = updated_at
    @created_by = created_by
    @updated_by = updated_by
  end
end

class Customer < Entity
  include Auditable

  attr_reader :name, :email

  def initialize(id:, name:, email:, created_at:, updated_at:, created_by: nil, updated_by: nil)
    super(id:)
    @name = name
    @email = email
    assign_audit(created_at:, updated_at:, created_by:, updated_by:)
  end
end

class OrderItem < Entity
  attr_reader :product_id, :quantity

  def initialize(id:, product_id:, quantity:)
    super(id:)
    @product_id = product_id
    @quantity = quantity
    # sem auditoria: faz parte do agregado Order, não vive sozinho
  end
end
```

`Entity` carrega só o que toda entidade precisa, com `==`/`eql?`/`hash` corretos por ID. Quem quer auditoria inclui `Auditable`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para código:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `Customer#name`, `Order#total` |
| Zero ou um | Campo com `nil` | `Customer#tax_info` (só PJ tem) |
| Zero ou mais | Lista (`[]`, nunca `nil`) | `Order#items`, `Customer#phones` |
| Exatamente N (N fixo) | N campos nomeados | `Address` com `street, city, country` |

Em Ruby, listas internas ficam em `@phones = []` e são expostas via getter com `dup` para impedir que callers alterem o array diretamente. A mutação passa pelos métodos de domínio (`add_phone`, `remove_phone`).

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```ruby
# frozen_string_literal: true

class Customer
  attr_reader :id, :name, :phone1, :phone2, :phone3

  def initialize(id:, name:, phone1: nil, phone2: nil, phone3: nil)
    @id = id
    @name = name
    @phone1 = phone1
    @phone2 = phone2
    @phone3 = phone3
  end

  def add_phone(value)
    if @phone1.nil?
      @phone1 = value
      return
    end
    if @phone2.nil?
      @phone2 = value
      return
    end
    if @phone3.nil?
      @phone3 = value
      return
    end

    raise "Customer can have at most 3 phones"
  end
end
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: lista interna com dup na exposição e invariante no método</summary>

```ruby
# frozen_string_literal: true

Phone = Data.define(:number, :type) # type: :mobile | :home | :work

class Customer
  attr_reader :id, :name

  def initialize(id:, name:)
    @id = id
    @name = name
    @phones = []
  end

  def phones
    @phones.dup
  end

  def add_phone(phone)
    raise "Customer can have at most 3 phones" if @phones.length >= 3

    @phones << phone
  end

  def remove_phone(number)
    @phones.reject! { |phone| phone.number == number }
  end
end
```

A regra "no máximo 3" mora em `add_phone`, onde dá para mudar sem mexer no schema. `phones` retorna `dup`: callers iteram à vontade, mas `push` direto não afeta o estado interno. Lista vazia (`[]`) é o estado neutro: itera sem `&.`.

</details>

Listas seguem a regra de [`null-safety`](../../../shared/standards/null-safety.md): nunca `nil`, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em Ruby, `private_class_method :new` na entidade filha garante que só o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza limite de agregado, então vai por ID (`customer_id`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, círculo bidirecional sem dono</summary>

```ruby
# frozen_string_literal: true

class Order
  attr_reader :id
  attr_accessor :items

  def initialize(id:)
    @id = id
    @items = []
  end
end

class OrderItem
  attr_reader :id, :order, :product_id, :quantity

  def initialize(id:, order:, product_id:, quantity:)
    @id = id
    @order = order # referência completa ao Order
    @product_id = product_id
    @quantity = quantity
  end
end

order = Order.new(id: order_id)
item = OrderItem.new(id: item_id, order:, product_id:, quantity: 2)
order.items << item

# quem valida que items.length não passa do limite? quem garante que remove_item
# limpa item.order? a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```ruby
# frozen_string_literal: true

class OrderItem
  private_class_method :new

  attr_reader :id, :product_id, :quantity, :unit_price

  def self.create(id:, product_id:, quantity:, unit_price:)
    raise ArgumentError, "quantity must be positive" unless quantity.positive?

    new(id:, product_id:, quantity:, unit_price:)
  end

  def subtotal
    unit_price * quantity
  end

  private

  def initialize(id:, product_id:, quantity:, unit_price:)
    @id = id
    @product_id = product_id
    @quantity = quantity
    @unit_price = unit_price
  end
end

class Order < Entity
  attr_reader :customer_id

  def self.place(id:, customer_id:)
    new(id:, customer_id:)
  end

  def line_items
    @items.dup
  end

  def add_item(product_id:, quantity:, unit_price:)
    raise "Order can have at most 50 items" if @items.length >= 50

    item = OrderItem.create(
      id: SecureRandom.uuid,
      product_id:,
      quantity:,
      unit_price:
    )
    @items << item
  end

  def remove_item(item_id)
    @items.reject! { |item| item.id == item_id }
  end

  def total
    @items.sum(&:subtotal)
  end

  private

  def initialize(id:, customer_id:)
    super(id:)
    @customer_id = customer_id
    @items = []
  end
end
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em arrays paralelos</summary>

```ruby
# frozen_string_literal: true

class Student
  attr_reader :id, :name, :course_ids, :enrollment_dates

  def initialize(id:, name:, course_ids: [], enrollment_dates: [])
    @id = id
    @name = name
    @course_ids = course_ids
    @enrollment_dates = enrollment_dates # paralelo a course_ids, por índice
  end

  def enrollment_date_of(course_id)
    position = course_ids.index(course_id)
    return nil if position.nil?

    enrollment_dates[position]
  end
end

# se um array sair de ordem ou perder um elemento, dados ficam inconsistentes
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```ruby
# frozen_string_literal: true

module EnrollmentStatus
  ACTIVE = :active
  COMPLETED = :completed
  WITHDRAWN = :withdrawn

  ALL = [ACTIVE, COMPLETED, WITHDRAWN].freeze
end

class Enrollment < Entity
  attr_reader :student_id, :course_id, :enrolled_at, :status, :final_grade

  def self.open(id:, student_id:, course_id:, enrolled_at:)
    new(id:, student_id:, course_id:, enrolled_at:, status: EnrollmentStatus::ACTIVE, final_grade: nil)
  end

  def complete(grade)
    raise "Only active enrollments can be completed" unless status == EnrollmentStatus::ACTIVE
    raise ArgumentError, "Grade must be between 0 and 10" unless (0..10).cover?(grade)

    @status = EnrollmentStatus::COMPLETED
    @final_grade = grade
  end

  private

  def initialize(id:, student_id:, course_id:, enrolled_at:, status:, final_grade:)
    super(id:)
    @student_id = student_id
    @course_id = course_id
    @enrolled_at = enrolled_at
    @status = status
    @final_grade = final_grade
  end
end

class Student < Entity
  attr_reader :name

  def initialize(id:, name:)
    super(id:)
    @name = name
  end
end

class Course < Entity
  attr_reader :title

  def initialize(id:, title:)
    super(id:)
    @title = title
  end
end
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de array.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor uma lista de IDs em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order#line_items` é uma lista de `OrderItem`, não uma lista de IDs. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customer_id`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

Em Ruby, símbolos (`:pending`, `:settled`, `:shipped`, `:cancelled`) são a escolha idiomática para **status** simples. Quando status carrega dados além do nome (data de pagamento, código de rastreio), mover para um módulo de constantes (`OrderStatus::SETTLED`) ou objeto de estado dedicado comunica melhor a intenção.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```ruby
# frozen_string_literal: true

class Order < Entity
  attr_reader :customer

  def initialize(id:, customer:)
    super(id:)
    @customer = customer # Customer completo
  end
end

# para criar Order, preciso buscar Customer inteiro do banco
customer = CustomerRepository.find_by_id(customer_id)

order = Order.new(id: order_id, customer:)

# para serializar Order para o frontend, vou junto enviar Customer completo
# alterações em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```ruby
# frozen_string_literal: true

module OrderStatus
  PENDING = :pending
  SETTLED = :settled
  SHIPPED = :shipped
  CANCELLED = :cancelled

  ALL = [PENDING, SETTLED, SHIPPED, CANCELLED].freeze
end

class Order < Entity
  attr_reader :customer_id, :status

  def initialize(id:, customer_id:, status: OrderStatus::PENDING)
    super(id:)
    @customer_id = customer_id
    @status = status
    @items = []
  end

  def mark_as_settled
    raise "Only pending orders can be settled" unless status == OrderStatus::PENDING

    @status = OrderStatus::SETTLED
  end

  def cancel
    raise "Shipped orders cannot be cancelled" if status == OrderStatus::SHIPPED

    @status = OrderStatus::CANCELLED
  end
end

order = Order.new(id: order_id, customer_id:)

# quem precisa do Customer resolve o ID no momento certo
customer = CustomerRepository.find_by_id(order.customer_id)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Os métodos de domínio (`mark_as_settled`, `cancel`) validam as invariantes de status diretamente na entidade.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenant_id`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order#tenant_id`, `Customer#tenant_id`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenant_id`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenant_id duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```ruby
# frozen_string_literal: true

class Order < Entity
  attr_reader :tenant_id, :customer_id

  def initialize(id:, tenant_id:, customer_id:)
    super(id:)
    @tenant_id = tenant_id
    @customer_id = customer_id
    @items = []
  end
end

class OrderItem < Entity
  attr_reader :tenant_id, :product_id, :quantity

  def initialize(id:, tenant_id:, product_id:, quantity:)
    super(id:)
    @tenant_id = tenant_id # duplica o tenant_id do Order
    @product_id = product_id
    @quantity = quantity
  end
end

def calculate_order_total(order, current_tenant_id)
  raise "Forbidden" unless order.tenant_id == current_tenant_id

  order.line_items.each do |item|
    raise "Forbidden" unless item.tenant_id == current_tenant_id
  end

  order.total
end
```

</details>

<details>
<summary>✅ Bom: tenant_id só no aggregate root, enforcement no repositório</summary>

```ruby
# frozen_string_literal: true

class Order < Entity
  attr_reader :tenant_id, :customer_id

  def initialize(id:, tenant_id:, customer_id:)
    super(id:)
    @tenant_id = tenant_id # único campo de tenant no agregado
    @customer_id = customer_id
    @items = []
  end
end

class OrderItem < Entity
  attr_reader :product_id, :quantity

  def initialize(id:, product_id:, quantity:)
    super(id:)
    @product_id = product_id
    @quantity = quantity
  end
end

class OrderRepository
  def initialize(connection, tenant_context)
    @connection = connection
    @tenant_context = tenant_context
  end

  def find_by_id(order_id)
    active_tenant = @tenant_context.current

    row = @connection.query_one(
      "SELECT * FROM orders WHERE id = $1 AND tenant_id = $2",
      [order_id.to_s, active_tenant.to_s]
    )
    return nil unless row

    OrderMapper.to_domain(row)
  end
end
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Ruby real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects com `Data.define` ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenant_id` que nunca usa. Tratamento: deixar só `id` na base; demais campos viram módulos `include Auditable` ou composição.

**Data.define para entidade**. Usar `Data.define` onde herança de `Entity` era o certo. Sintoma: `==` compara todos os campos em vez do ID; dois objetos com o mesmo ID mas estados diferentes são considerados diferentes. Tratamento: herança de `Entity` com `==`/`eql?`/`hash` sobrescritos por ID.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `nil`. Sintoma: caller precisa `&.` em cada acesso. Tratamento: extrair os opcionais em value object opcional, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: lista de verdade com `dup` na exposição.

**Mapa mascarado como lista**. Lista de pares `{ key:, value: }` quando o domínio diz "acesso por chave". Sintoma: `find` em loop linear toda vez que se quer um valor específico. Tratamento: `Hash` indexado pelo identificador.

**Referência direta cruzando agregado**. `order.customer` em vez de `order.customer_id`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order#items` e `OrderItem#order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): limite transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`shared/standards/null-safety.md`](../../../shared/standards/null-safety.md): null-safety idiomático

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
