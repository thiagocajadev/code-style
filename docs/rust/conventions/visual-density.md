# Visual density: Rust

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco — cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Rust idiomático (`?` operator, `match`, `let else`).

## Conceitos fundamentais

| Conceito                                     | O que é                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **visual density** (densidade visual)        | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo                         |
| **semantic group** (grupo semântico)         | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir)            |
| **blank line** (linha em branco)             | Separador entre grupos semânticos; substitui comentário de seção                                            |
| **tight pair** (par tight)                   | Duas linhas com relação direta (declaração + uso, `let` + return) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico)               | Três declarações simples consecutivas e homogêneas (`let`); mantidas juntas sem blank — preferir ao 2+1 que cria órfão                    |
| **semantic pair** (par semântico encadeado)  | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta                    |
| **single-line orphan** (órfão de 1)          | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2    |
| **explaining return** (retorno explicativo)  | Caso particular de `tight pair`: `let x = …` single-line + `x` (última expressão sem `;`) ou `return x;` sem blank entre eles                |
| **multi-line block** (bloco multi-linha)     | Struct literal expandido, `vec!` multi-linha ou statement quebrado em várias linhas; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta — blank antes da montagem |
| **boundary** (limite)                        | Linha que separa camadas (handler ↔ service, service ↔ repository); merece linha em branco antes            |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão — frágil a rename, gera diff ruidoso       |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim — denso demais: todos os passos colados</summary>

```rust
async fn register_user(input: RegisterUserInput) -> anyhow::Result<User> {
    let RegisterUserInput { name, email, password } = input;
    let exists = user_repository::find_by_email(&email).await?;
    if exists.is_some() { return Err(anyhow::anyhow!("email taken")); }
    let hash = hash_password(&password).await?;
    let user = user_repository::create(&name, &email, &hash).await?;
    let token = generate_token(user.id);
    send_welcome_email(&email, &token).await?;
    Ok(user)
}
```

</details>

<details>
<summary>✅ Bom — fases visíveis, no máximo 2 linhas por grupo</summary>

```rust
async fn register_user(input: RegisterUserInput) -> anyhow::Result<User> {
    let RegisterUserInput { name, email, password } = input;
    let exists = user_repository::find_by_email(&email).await?;
    if exists.is_some() { return Err(anyhow::anyhow!("email taken")); }

    let hash = hash_password(&password).await?;
    let user = user_repository::create(&name, &email, &hash).await?;

    let token = generate_token(user.id);
    send_welcome_email(&email, &token).await?;

    Ok(user)
}
```

</details>

## Explaining Return: par tight

Em Rust, a última expressão sem `;` é o valor de retorno. Um `let` nomeado
acima dessa expressão explica o valor retornado. Sempre que a linha
imediatamente acima for esse `let` (single-line) e a última expressão for
exatamente essa variável, os dois formam par de 2 linhas sem blank — não
importa quantos passos haja acima. A linha em branco separa o par do que vem
antes, não fragmenta o par.

<details>
<summary>❌ Ruim — blank fragmenta o par</summary>

```rust
fn map_error_to_status(error: &AppError) -> u16 {
    let status = error_status_by_code(error.code()).unwrap_or(500);

    status
}
```

</details>

<details>
<summary>✅ Bom — par tight</summary>

```rust
fn map_error_to_status(error: &AppError) -> u16 {
    let status = error_status_by_code(error.code()).unwrap_or(500);
    status
}
```

</details>

## Return tight vs return separado

A regra é simples: a última expressão (ou `return`) é **tight** com a linha
imediatamente acima **somente quando essa linha é o `let` que nomeia o valor
retornado** (Explaining Return) — e esse `let` está em uma única linha.

Em todos os outros casos, vai blank antes do retorno:

- linha acima é **multi-linha** (struct literal expandido, `vec!` quebrado);
- linha acima é **side effect** (`await` em função sem retorno, `?` em call void)
  que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim — retorno fragmentado quando a linha acima é single-line</summary>

```rust
fn format_order_date(iso_string: &str) -> anyhow::Result<String> {
    let parsed_date = chrono::DateTime::parse_from_rfc3339(iso_string)?;
    let formatter = chrono::format::strftime::StrftimeItems::new_with_locale(
        "%d/%m/%Y",
        chrono::Locale::pt_BR,
    );
    let formatted_date = parsed_date.format_with_items(formatter).to_string();

    Ok(formatted_date)
}
```

`formatter` multi-linha exige blank depois de si, mas o blank foi posto antes
do retorno. `formatted_date` e `Ok(formatted_date)` formam Explaining Return
tight — não devem ser separados.

</details>

<details>
<summary>✅ Bom — multi-linha isolada, Explaining Return tight</summary>

```rust
fn format_order_date(iso_string: &str) -> anyhow::Result<String> {
    let parsed_date = chrono::DateTime::parse_from_rfc3339(iso_string)?;
    let formatter = chrono::format::strftime::StrftimeItems::new_with_locale(
        "%d/%m/%Y",
        chrono::Locale::pt_BR,
    );

    let formatted_date = parsed_date.format_with_items(formatter).to_string();
    Ok(formatted_date)
}
```

O blank fica **depois** do `formatter` multi-linha. O par `formatted_date` +
`Ok(formatted_date)` permanece tight.

</details>

<details>
<summary>✅ Bom — return com blank quando construído a partir de struct multi-linha</summary>

```rust
fn build_order_response(order: &Order, request_id: &str) -> OrderResponse {
    let data = OrderData {
        id: order.id,
        total: order.total,
        items: order.items.clone(),
    };

    OrderResponse { data, request_id: request_id.to_string() }
}
```

`data` é struct literal multi-linha; o blank antes do retorno isola o bloco
grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. A última expressão é o único
conteúdo.

```rust
fn find_pending_orders(user_id: u64) -> Vec<Order> {
    order_repository::find_by_status(user_id, OrderStatus::Pending)
}
```

## Declaração + guarda = 1 grupo

Uma variável seguida do seu `if` ou `let-else` de guarda formam par semântico
**quando o guarda cabe em uma única linha** — `if x.is_none() { return; }`,
`let Some(x) = opt else { return; };`. Nesse caso a linha em branco vem
**depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco multi-linha** (qualquer quantidade de
linhas físicas, mesmo com uma única instrução dentro), o `if` ou `let-else`
vira fase própria — o bloco já ocupa peso visual próprio. Aplica-se a regra de
**multi-linha pede respiro**: linha em branco **antes** do bloco. O critério é
visual, não semântico.

<details>
<summary>❌ Ruim — variável solta do seu guarda inline</summary>

```rust
let order = fetch_order(order_id).await?;

if order.is_none() { return Ok(()); }
let invoice = build_invoice(&order.unwrap());
```

</details>

<details>
<summary>✅ Bom — guarda inline (uma linha), par tight com a declaração</summary>

```rust
let order = fetch_order(order_id).await?;
let Some(order) = order else { return Ok(()); };

let invoice = build_invoice(&order);
```

</details>

<details>
<summary>✅ Bom — guarda em bloco, fase própria com blank antes</summary>

```rust
let handler = event_handlers.get(&event_type);

let Some(handler) = handler else {
    log_unhandled_event_type(&event_type);
    return Ok(());
};

let event_payload = event.data;
```

</details>

<details>
<summary>✅ Bom — guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```rust
let response = request_fn().await?;

if response.status() != 429 {
    return Ok(response);
}

let delay_ms = 2u64.pow(attempt) * 1000;
```

O bloco ocupa três linhas físicas — peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (`let`, `const`) formam grupo coeso.
Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as três
juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim — órfão entre blanks</summary>

```rust
const MINIMUM_DRIVING_AGE: u32 = 18;
const ORDER_STATUS_APPROVED: u8 = 2;

const ONE_DAY_MS: u64 = 86_400_000;
```

</details>

<details>
<summary>✅ Bom — trio tight</summary>

```rust
const MINIMUM_DRIVING_AGE: u32 = 18;
const ORDER_STATUS_APPROVED: u8 = 2;
const ONE_DAY_MS: u64 = 86_400_000;
```

</details>

<details>
<summary>✅ Bom — 4 atomics viram 2+2</summary>

```rust
const MINIMUM_DRIVING_AGE: u32 = 18;
const ORDER_STATUS_APPROVED: u8 = 2;

const ONE_DAY_MS: u64 = 86_400_000;
const MAX_RETRY_ATTEMPTS: u32 = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim — dependência direta partida</summary>

```rust
fn build_shipping_label(order: &Order) -> String {
    let full_name = format!("{} {}", order.customer.first_name, order.customer.last_name);
    let address_line = format!("{}, {}", order.address.street, order.address.number);

    let city_line = format!("{} - {}, {}", order.address.city, order.address.state, order.address.zip_code);

    let label = format!("{full_name}\n{address_line}\n{city_line}\nOrder #{}", order.id);
    label
}
```

</details>

<details>
<summary>✅ Bom — par semântico tight</summary>

```rust
fn build_shipping_label(order: &Order) -> String {
    let full_name = format!("{} {}", order.customer.first_name, order.customer.last_name);
    let address_line = format!("{}, {}", order.address.street, order.address.number);

    let city_line = format!("{} - {}, {}", order.address.city, order.address.state, order.address.zip_code);
    let label = format!("{full_name}\n{address_line}\n{city_line}\nOrder #{}", order.id);
    label
}
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

```rust
fn build_delivery_message(user: &User, order: &Order) -> String {
    let full_name = format!("{} {}", user.first_name, user.last_name);
    let address = format!("{}, {} - {}", order.address.street, order.address.city, order.address.state);
    let delivery_message = format!("Olá {full_name}, seu pedido #{} foi confirmado e será entregue em {address} em até {} dias úteis.", order.id, order.delivery_days);
    delivery_message
}
```

`delivery_message` consome `full_name` *e* `address` *e* `order.id` *e*
`order.delivery_days`. Não é par direto com `address` — é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom — fragmentos como par, montagem isolada, Explaining Return tight</summary>

```rust
fn build_delivery_message(user: &User, order: &Order) -> String {
    let full_name = format!("{} {}", user.first_name, user.last_name);
    let address = format!("{}, {} - {}", order.address.street, order.address.city, order.address.state);

    let delivery_message = format!("Olá {full_name}, seu pedido #{} foi confirmado e será entregue em {address} em até {} dias úteis.", order.id, order.delivery_days);
    delivery_message
}
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom — contraste: par semântico encadeado (última depende só da penúltima)</summary>

```rust
fn build_order_slug(order: &Order) -> String {
    let normalized_title = order.title.to_lowercase().replace(' ', "-");
    let slug = format!("{}-{normalized_title}", order.id);
    slug
}
```

`slug` depende **diretamente** de `normalized_title` (penúltima). Par
semântico encadeado: as duas ficam tight, e a última expressão ainda tight com
o último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim — 3 linhas heterogêneas coladas</summary>

```rust
while attempt < MAX_ATTEMPTS {
    let connection = connect_to_database();
    if connection.is_ready() { break; }
    attempt += 1;
}
```

</details>

<details>
<summary>✅ Bom — declaração + guarda em par, incremento separado</summary>

```rust
while attempt < MAX_ATTEMPTS {
    let connection = connect_to_database();
    if connection.is_ready() { break; }

    attempt += 1;
}
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim — todas as fases coladas, sem separação visual</summary>

```rust
async fn create_user_handler(
    axum::Json(body): axum::Json<CreateUserRequest>,
) -> Result<axum::Json<CreateUserResponse>, AppError> {
    let sanitized = sanitize_create_user(body);
    let input = sanitized.validate()?;
    create_user(&input).await?;
    let response = CreateUserResponse { id: input.id };
    Ok(axum::Json(response))
}
```

</details>

<details>
<summary>✅ Bom — fases explícitas</summary>

```rust
async fn create_user_handler(
    axum::Json(body): axum::Json<CreateUserRequest>,
) -> Result<axum::Json<CreateUserResponse>, AppError> {
    let sanitized = sanitize_create_user(body);
    let input = sanitized.validate()?;

    create_user(&input).await?;

    let response = CreateUserResponse { id: input.id };
    Ok(axum::Json(response))
}
```

</details>

## Testes: assert como fase própria

O `assert_eq!` é fase distinta. A linha em branco antes dele separa o que está
sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim — assert colado ao setup, fases invisíveis</summary>

```rust
#[test]
fn applies_percentage_discount_to_order_price() {
    let order = Order { price: 100.0, discount_pct: 10.0 };
    let actual_order = apply_discount(order);
    let expected_price = 90.0;
    assert_eq!(actual_order.price, expected_price);
}
```

</details>

<details>
<summary>✅ Bom — assert separado, assertion como fase própria</summary>

```rust
#[test]
fn applies_percentage_discount_to_order_price() {
    let order = Order { price: 100.0, discount_pct: 10.0 };
    let actual_order = apply_discount(order);
    let expected_price = 90.0;

    assert_eq!(actual_order.price, expected_price);
}
```

</details>

## Multi-linha: respiro depois do bloco

Quando uma struct literal, `vec!` ou statement quebra em várias linhas, o
bloco já ocupa espaço visual próprio. Cole uma linha em branco **depois** dele
para isolar o bloco grande do próximo passo. Sem respiro, o leitor não vê onde
o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim — struct multi-linha colada ao próximo statement</summary>

```rust
async fn create_session(user: &User) -> anyhow::Result<String> {
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        roles: user.roles.clone(),
        issued_at: chrono::Utc::now().timestamp(),
    };
    let token = sign_jwt(&claims).await?;
    Ok(token)
}
```

</details>

<details>
<summary>✅ Bom — blank depois da struct isola o bloco</summary>

```rust
async fn create_session(user: &User) -> anyhow::Result<String> {
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        roles: user.roles.clone(),
        issued_at: chrono::Utc::now().timestamp(),
    };

    let token = sign_jwt(&claims).await?;
    Ok(token)
}
```

</details>

## Ifs consecutivos: blocos com chaves precisam de respiro

Dois `if` consecutivos com **bloco multi-linha** colados formam muralha: o olho
não distingue onde um bloco termina e o outro começa. Sempre insira blank
entre eles. O mesmo vale para `let-else` consecutivos com bloco multi-linha.

**Exceção:** guardas de uma linha (early returns curtos com `?` ou
`return Err(...)`) formam trio homogêneo e ficam tight — a regra do trio
atômico se aplica.

<details>
<summary>❌ Ruim — dois blocos {} colados</summary>

```rust
fn process_order(order: &mut Order) {
    if order.status == OrderStatus::Pending {
        notify_customer(order);
        schedule_review(order);
    }
    if order.total > 1_000.0 {
        flag_for_audit(order);
        notify_manager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom — blank entre os blocos</summary>

```rust
fn process_order(order: &mut Order) {
    if order.status == OrderStatus::Pending {
        notify_customer(order);
        schedule_review(order);
    }

    if order.total > 1_000.0 {
        flag_for_audit(order);
        notify_manager(order);
    }
}
```

</details>

<details>
<summary>✅ Bom — guardas inline em sequência ficam tight (trio atômico)</summary>

```rust
fn validate_input(input: &CreateUserInput) -> anyhow::Result<()> {
    anyhow::ensure!(!input.name.is_empty(), "name required");
    anyhow::ensure!(input.email.contains('@'), "valid email required");
    anyhow::ensure!(input.password.len() >= 8, "password too short");

    Ok(())
}
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**. Alinhamento artificial quebra com qualquer rename, gera
diff ruidoso e treina o olho a procurar colunas que somem na primeira refator.

<details>
<summary>❌ Ruim — espaços extras para alinhar colunas</summary>

```rust
let user_name     = "alice";
let user_email    = "alice@example.com";
let user_role     = "admin";
let last_login_at = chrono::Utc::now();
```

</details>

<details>
<summary>✅ Bom — espaço único, sem padding</summary>

```rust
let user_name = "alice";
let user_email = "alice@example.com";
let user_role = "admin";
let last_login_at = chrono::Utc::now();
```

</details>

## Strings longas

Uma string longa colada num `format!` final esconde as partes que a compõem.
Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim — string imensa inline, sem semântica nas partes</summary>

```rust
fn build_delivery_message(user: &User, order: &Order) -> String {
    format!(
        "Olá {} {}, seu pedido #{} foi confirmado e será entregue no endereço {}, {} - {} em até {} dias úteis.",
        user.first_name, user.last_name, order.id,
        order.address.street, order.address.city, order.address.state,
        order.delivery_days,
    )
}
```

</details>

<details>
<summary>✅ Bom — fragmentos nomeados, template final limpo</summary>

```rust
fn build_delivery_message(user: &User, order: &Order) -> String {
    let full_name = format!("{} {}", user.first_name, user.last_name);
    let address = format!("{}, {} - {}", order.address.street, order.address.city, order.address.state);

    let delivery_message = format!("Olá {full_name}, seu pedido #{} foi confirmado e será entregue em {address} em até {} dias úteis.", order.id, order.delivery_days);
    delivery_message
}
```

</details>
