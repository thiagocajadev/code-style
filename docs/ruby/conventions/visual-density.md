# Visual density: Ruby

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco — cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Ruby idiomático (retorno implícito, postfix `if`/`unless`, blocks).

## Conceitos fundamentais

| Conceito                                         | O que é                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **visual density** (densidade visual)            | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo                                                    |
| **semantic group** (grupo semântico)             | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (validar, calcular, persistir)                                           |
| **blank line** (linha em branco)                 | Separador entre grupos semânticos; substitui comentário de seção                                                                       |
| **tight pair** (par tight)                       | Duas linhas com relação direta (declaração + uso, atribuição + retorno) sem blank entre elas; o respiro vem antes ou depois do par     |
| **atomic trio** (trio atômico)                   | Três atribuições simples consecutivas e homogêneas; mantidas juntas sem blank — preferir ao 2+1 que cria órfão                         |
| **semantic pair** (par semântico encadeado)      | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta                 |
| **single-line orphan** (órfão de 1)              | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2                               |
| **explaining return** (retorno explicativo)      | Caso particular de `tight pair`: `x = …` single-line + `x` (última expressão, retorno implícito) sem blank entre eles                  |
| **multi-line block** (bloco multi-linha)         | Hash literal, array literal, `do |x| … end` ou statement quebrado em várias linhas; pede blank depois para isolar o bloco              |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem                           |
| **boundary** (limite)                            | Linha que separa camadas (controller ↔ service, service ↔ repository); merece linha em branco antes                                    |
| **column alignment** (alinhamento de coluna)     | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a rename, gera diff ruidoso                                  |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>

```ruby
# frozen_string_literal: true

def register_user(input)
  email = input[:email]
  exists = User.find_by(email: email)
  raise ConflictError, "Email taken" if exists
  hash = hash_password(input[:password])
  user = User.create!(name: input[:name], email: email, password_hash: hash)
  token = generate_token(user.id)
  WelcomeMailer.confirmation(email, token).deliver_later
  user
end
```

</details>

<details>
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>

```ruby
# frozen_string_literal: true

def register_user(input)
  email = input[:email]
  exists = User.find_by(email: email)
  raise ConflictError, "Email taken" if exists

  hash = hash_password(input[:password])
  user = User.create!(name: input[:name], email: email, password_hash: hash)

  token = generate_token(user.id)
  WelcomeMailer.confirmation(email, token).deliver_later

  user
end
```

</details>

## Explaining Return: par tight

Uma atribuição nomeada acima do retorno implícito explica o valor retornado.
Sempre que a linha imediatamente acima for essa atribuição (single-line) e a
última expressão for exatamente essa variável, as duas formam par de 2 linhas
sem blank — não importa quantos passos haja acima. A linha em branco separa o
par do que vem antes, não fragmenta o par.

Em Ruby o idiomático é a última expressão sem `return`. O par é
`variable = ...` + `variable`.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>

```ruby
# frozen_string_literal: true

def map_error_to_status(error)
  status = ERROR_STATUS_BY_CODE.fetch(error.code, 500)

  status
end
```

</details>

<details>
<summary>✅ Bom — par tight</summary>

```ruby
# frozen_string_literal: true

def map_error_to_status(error)
  status = ERROR_STATUS_BY_CODE.fetch(error.code, 500)
  status
end
```

</details>

## Return tight vs return separado

A regra é simples: a última expressão é **tight** com a linha imediatamente
acima **somente quando essa linha é a atribuição que nomeia o valor retornado**
(Explaining Return) — e essa atribuição está em uma única linha.

Em todos os outros casos, vai blank antes da última expressão:

- linha acima é **multi-linha** (hash/array/block quebrado em várias linhas);
- linha acima é **side effect** (`deliver_later`, método sem retorno) que não
  nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — return fragmentado quando a linha acima é single-line</summary>

```ruby
# frozen_string_literal: true

def format_order_date(iso_string, time_zone: "America/Sao_Paulo")
  parsed_date = Time.iso8601(iso_string)
  formatter = {
    day: "%d",
    month: "%m",
    year: "%Y",
    time_zone: time_zone,
  }
  formatted_date = parsed_date.in_time_zone(formatter[:time_zone]).strftime("#{formatter[:day]}/#{formatter[:month]}/#{formatter[:year]}")

  formatted_date
end
```

`formatter` multi-linha exige blank depois de si, mas o blank foi posto antes
da última expressão. `formatted_date` (atribuição) e `formatted_date` (retorno
implícito) formam Explaining Return tight — não devem ser separados.

</details>

<details>
<summary>✅ Bom — multi-linha isolada, Explaining Return tight</summary>

```ruby
# frozen_string_literal: true

def format_order_date(iso_string, time_zone: "America/Sao_Paulo")
  parsed_date = Time.iso8601(iso_string)
  formatter = {
    day: "%d",
    month: "%m",
    year: "%Y",
    time_zone: time_zone,
  }

  formatted_date = parsed_date.in_time_zone(formatter[:time_zone]).strftime("#{formatter[:day]}/#{formatter[:month]}/#{formatter[:year]}")
  formatted_date
end
```

O blank fica **depois** do `formatter` multi-linha. O par
`formatted_date` (atribuição) + `formatted_date` (retorno) permanece tight.

</details>

<details>
<summary>✅ Bom — return com blank quando construído a partir de hash multi-linha</summary>

```ruby
# frozen_string_literal: true

def build_order_response(order, request_id)
  data = {
    id: order.id,
    total: order.total,
    items: order.items,
  }

  { data: data, request_id: request_id }
end
```

`data` é hash multi-linha; o blank antes da última expressão isola o bloco
grande do envelope final.

</details>

**Exceção:** métodos de uma linha ficam compactos. A última expressão é o único
conteúdo.

```ruby
# frozen_string_literal: true

def find_pending_orders(user_id)
  OrderRepository.find_by_status(user_id, :pending)
end
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if`/`unless` de guarda formam par semântico
**quando o guarda cabe em uma única linha** — `return if x.nil?`,
`raise "..." if x.nil?`. Nesse caso a linha em branco vem **depois** do par,
nunca entre eles.

Quando o guarda é escrito em **bloco multi-linha** (`if x.nil?\n  ...\nend`,
qualquer quantidade de linhas físicas, mesmo com uma única instrução dentro), o
`if` vira fase própria — o bloco já ocupa peso visual próprio. Aplica-se a
regra de **multi-linha pede respiro**: linha em branco **antes** do bloco. O
critério é visual, não semântico.

<details>
<summary>❌ Ruim — variável solta do seu guarda inline</summary>

```ruby
# frozen_string_literal: true

def build_invoice(order_id)
  order = fetch_order(order_id)

  return if order.nil?
  invoice = Invoice.new(order)
  invoice
end
```

</details>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```ruby
# frozen_string_literal: true

def build_invoice(order_id)
  order = fetch_order(order_id)
  return if order.nil?

  invoice = Invoice.new(order)
  invoice
end
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>

```ruby
# frozen_string_literal: true

def dispatch_event(event_type, event)
  handler = EVENT_HANDLERS[event_type]

  if handler.nil?
    log_unhandled_event_type(event_type)
    return
  end

  event_payload = event.data
  handler.call(event_payload)
end
```

</details>

<details>
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```ruby
# frozen_string_literal: true

def retry_request(attempt, request_fn)
  response = request_fn.call

  if response.status != 429
    return response
  end

  delay_ms = (2**attempt) * 1_000
  sleep(delay_ms / 1_000.0)
end
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria tight,
mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três atribuições simples consecutivas formam grupo coeso. Partir em 2+1 deixa a
última linha solitária entre blanks. Mantenha as três juntas. Só divida em 2+2
a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>

```ruby
# frozen_string_literal: true

MINIMUM_DRIVING_AGE = 18
ORDER_STATUS_APPROVED = 2

ONE_DAY_SECONDS = 86_400
```

</details>

<details>
<summary>✅ Bom — trio tight</summary>

```ruby
# frozen_string_literal: true

MINIMUM_DRIVING_AGE = 18
ORDER_STATUS_APPROVED = 2
ONE_DAY_SECONDS = 86_400
```

</details>

<details>
<summary>✅ Bom — 4 atomics viram 2+2</summary>

```ruby
# frozen_string_literal: true

MINIMUM_DRIVING_AGE = 18
ORDER_STATUS_APPROVED = 2

ONE_DAY_SECONDS = 86_400
MAX_RETRY_ATTEMPTS = 3
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

```ruby
# frozen_string_literal: true

def build_shipping_label(order)
  full_name = "#{order.customer.first_name} #{order.customer.last_name}"
  address_line = "#{order.address.street}, #{order.address.number}"

  city_line = "#{order.address.city} - #{order.address.state}, #{order.address.zip_code}"

  label = "#{full_name}\n#{address_line}\n#{city_line}\nOrder ##{order.id}"
  label
end
```

</details>

<details>
<summary>✅ Bom — par semântico tight</summary>

```ruby
# frozen_string_literal: true

def build_shipping_label(order)
  full_name = "#{order.customer.first_name} #{order.customer.last_name}"
  address_line = "#{order.address.street}, #{order.address.number}"

  city_line = "#{order.address.city} - #{order.address.state}, #{order.address.zip_code}"
  label = "#{full_name}\n#{address_line}\n#{city_line}\nOrder ##{order.id}"
  label
end
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta — blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim — fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```ruby
# frozen_string_literal: true

def build_delivery_message(user, order)
  full_name = "#{user.first_name} #{user.last_name}"
  address = "#{order.address.street}, #{order.address.city} - #{order.address.state}"
  delivery_message = "Olá #{full_name}, seu pedido ##{order.id} foi confirmado e será entregue em #{address} em até #{order.delivery_days} dias úteis."
  delivery_message
end
```

`delivery_message` consome `full_name` *e* `address` *e* `order.id` *e*
`order.delivery_days`. Não é par direto com `address` — é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>

```ruby
# frozen_string_literal: true

def build_delivery_message(user, order)
  full_name = "#{user.first_name} #{user.last_name}"
  address = "#{order.address.street}, #{order.address.city} - #{order.address.state}"

  delivery_message = "Olá #{full_name}, seu pedido ##{order.id} foi confirmado e será entregue em #{address} em até #{order.delivery_days} dias úteis."
  delivery_message
end
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>

```ruby
# frozen_string_literal: true

def build_order_slug(order)
  normalized_title = order.title.downcase.gsub(/\s+/, "-")
  slug = "#{order.id}-#{normalized_title}"
  slug
end
```

`slug` depende **diretamente** de `normalized_title` (penúltima). Par semântico
encadeado: as duas ficam tight, e a última expressão ainda tight com a
penúltima.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim — 3 linhas heterogêneas coladas</summary>

```ruby
# frozen_string_literal: true

while attempt < MAX_ATTEMPTS
  connection = connect_to_database
  break if connection.ready?
  attempt += 1
end
```

</details>

<details>
<summary>✅ Bom — declaração + guarda em par, incremento separado</summary>

```ruby
# frozen_string_literal: true

while attempt < MAX_ATTEMPTS
  connection = connect_to_database
  break if connection.ready?

  attempt += 1
end
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>

```ruby
# frozen_string_literal: true

def create_user_handler(request)
  sanitized = sanitize_create_user(request.body)
  input = CreateUserContract.new.call(sanitized)
  create_user(input)
  body = { id: input[:id] }
  render json: body, status: :created
end
```

</details>

<details>
<summary>✅ Bom — fases explícitas</summary>

```ruby
# frozen_string_literal: true

def create_user_handler(request)
  sanitized = sanitize_create_user(request.body)
  input = CreateUserContract.new.call(sanitized)

  create_user(input)

  body = { id: input[:id] }
  render json: body, status: :created
end
```

</details>

## Testes: expect como fase própria

O `expect` é fase distinta. A linha em branco antes dele separa o que está
sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — expect colado ao setup, fases invisíveis</summary>

```ruby
# frozen_string_literal: true

it "applies percentage discount to order price" do
  order = build(:order, price: 100, discount_pct: 10)
  actual_order = apply_discount(order)
  expected_price = 90
  expect(actual_order.price).to eq(expected_price)
end
```

</details>

<details>
<summary>✅ Bom — expect separado, assertion como fase própria</summary>

```ruby
# frozen_string_literal: true

it "applies percentage discount to order price" do
  order = build(:order, price: 100, discount_pct: 10)
  actual_order = apply_discount(order)
  expected_price = 90

  expect(actual_order.price).to eq(expected_price)
end
```

</details>

## Multi-linha: respiro depois do bloco

Quando um hash literal, array literal, `do |x| ... end` ou statement quebra em
várias linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em
branco **depois** dele para isolar o bloco grande do próximo passo. Sem
respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — hash multi-linha colado ao próximo statement</summary>

```ruby
# frozen_string_literal: true

def create_session(user)
  claims = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issued_at: Time.now.utc.to_i,
  }
  token = JwtEncoder.sign(claims)
  token
end
```

</details>

<details>
<summary>✅ Bom — blank depois do hash isola o bloco</summary>

```ruby
# frozen_string_literal: true

def create_session(user)
  claims = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    issued_at: Time.now.utc.to_i,
  }

  token = JwtEncoder.sign(claims)
  token
end
```

</details>

<details>
<summary>✅ Bom — block multi-linha pede blank depois</summary>

```ruby
# frozen_string_literal: true

def notify_admins(admins)
  admins.each do |admin|
    AdminMailer.daily_report(admin.id).deliver_later
    AuditLog.record(:report_sent, admin.id)
  end

  AuditLog.record(:notify_admins_completed, admins.size)
end
```

</details>

## Ifs consecutivos: blocos multi-linha precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** colados formam muralha: o olho
não distingue onde um bloco termina e o outro começa. Sempre insira blank
entre eles.

**Exceção:** guardas de uma linha (early returns curtos com postfix `if`/`unless`)
formam trio homogêneo e ficam tight — a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos multi-linha colados</summary>

```ruby
# frozen_string_literal: true

def process_order(order)
  if order.status == :pending
    notify_customer(order)
    schedule_review(order)
  end
  if order.total > 1_000
    flag_for_audit(order)
    notify_manager(order)
  end
end
```

</details>

<details>
<summary>✅ Bom — blank entre os blocos</summary>

```ruby
# frozen_string_literal: true

def process_order(order)
  if order.status == :pending
    notify_customer(order)
    schedule_review(order)
  end

  if order.total > 1_000
    flag_for_audit(order)
    notify_manager(order)
  end
end
```

</details>

<details>
<summary>✅ Bom — guardas de uma linha ficam tight (trio atômico)</summary>

```ruby
# frozen_string_literal: true

def validate_input(input)
  raise ValidationError, "Input required" if input.nil?
  raise ValidationError, "Email required" if input[:email].blank?
  raise ValidationError, "Password required" if input[:password].blank?

  input
end
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```ruby
# frozen_string_literal: true

user_name      = "alice"
user_email     = "alice@example.com"
user_role      = "admin"
last_login_at  = Time.now.utc
```

</details>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>

```ruby
# frozen_string_literal: true

user_name = "alice"
user_email = "alice@example.com"
user_role = "admin"
last_login_at = Time.now.utc
```

</details>

## Strings longas

Uma string longa colada em um retorno esconde as partes que a compõem. Extraia
fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — string imensa inline, sem semântica nas partes</summary>

```ruby
# frozen_string_literal: true

def build_delivery_message(user, order)
  "Olá #{user.first_name} #{user.last_name}, seu pedido ##{order.id} foi confirmado e será entregue no endereço #{order.address.street}, #{order.address.city} - #{order.address.state} em até #{order.delivery_days} dias úteis."
end
```

</details>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>

```ruby
# frozen_string_literal: true

def build_delivery_message(user, order)
  full_name = "#{user.first_name} #{user.last_name}"
  address = "#{order.address.street}, #{order.address.city} - #{order.address.state}"

  delivery_message = "Olá #{full_name}, seu pedido ##{order.id} foi confirmado e será entregue em #{address} em até #{order.delivery_days} dias úteis."
  delivery_message
end
```

</details>

## Density dentro de classes

Separe métodos públicos entre si com uma linha em branco. Separe a seção
`private` com uma linha em branco acima e abaixo.

<details>
<summary>❌ Ruim — métodos colados, private sem separação</summary>

```ruby
# frozen_string_literal: true

class OrderService
  def submit(order)
    validate(order)
    save(order)
  end
  def cancel(order)
    order.update!(status: :cancelled)
  end
  private
  def validate(order)
    raise OrderError unless order.valid?
  end
  def save(order)
    order.save!
  end
end
```

</details>

<details>
<summary>✅ Bom — métodos separados, private com espaçamento correto</summary>

```ruby
# frozen_string_literal: true

class OrderService
  def submit(order)
    validate(order)
    save(order)
  end

  def cancel(order)
    order.update!(status: :cancelled)
  end

  private

  def validate(order)
    raise OrderError, "order is invalid" unless order.valid?
  end

  def save(order)
    order.save!
  end
end
```

</details>

## Grupo de atributos

Agrupe `attr_reader`, `attr_writer`, `attr_accessor` em blocos por acesso,
separados do `initialize` por uma linha em branco.

<details>
<summary>❌ Ruim — atributos misturados sem padrão</summary>

```ruby
# frozen_string_literal: true

class User
  attr_accessor :name
  def initialize(name:, email:)
    @name = name
    @email = email
  end
  attr_reader :email
end
```

</details>

<details>
<summary>✅ Bom — atributos agrupados acima do initialize</summary>

```ruby
# frozen_string_literal: true

class User
  attr_reader :email
  attr_accessor :name

  def initialize(name:, email:)
    @name = name
    @email = email
  end
end
```

</details>
