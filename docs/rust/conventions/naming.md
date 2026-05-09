# Naming

> Escopo: Rust 1.95.

Nomes bons tornam comentários desnecessários. O compilador Rust usa capitalização para
determinar visibilidade e categoria do símbolo, tornando as convenções parte da semântica da linguagem.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```rust
fn apply(x: &dyn std::any::Any, p: std::collections::HashMap<String, bool>, c: fn() -> ()) {
    if *p.get("inadimplente").unwrap_or(&false) {
        return;
    }
    c();
}
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```rust
fn apply_discount(order: &Order, calculate: impl Fn(&Order) -> Order) -> Option<Order> {
    if order.customer.is_defaulted {
        return None;
    }

    let discounted = calculate(order);

    Some(discounted)
}
```

</details>

## Convenções de case

Rust usa capitalização como sinal semântico. Clippy avisa sobre violações automaticamente.

| Contexto                               | Convenção              | Exemplos                                   |
| -------------------------------------- | ---------------------- | ------------------------------------------ |
| Funções e métodos                      | `snake_case`           | `find_user`, `calculate_total`             |
| Variáveis e parâmetros                 | `snake_case`           | `user_id`, `order_total`                   |
| Tipos (struct, enum, trait, type alias)| `PascalCase`           | `UserService`, `OrderStatus`, `Repository` |
| Constantes e statics                   | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT`           |
| Módulos e crates                       | `snake_case`           | `order`, `auth`, `http_client`             |
| Lifetimes                              | `'` + minúscula curta  | `'a`, `'static`, `'req`                   |
| Variantes de enum                      | `PascalCase`           | `Active`, `Pending`, `NotFound`            |

<details>
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```rust
const maxRetries: u32 = 3;          // deve ser SCREAMING_SNAKE_CASE
fn Calculate_Total() -> f64 { 0.0 } // underscore em função
struct order_service {}              // tipo deve ser PascalCase

enum Status {
    active,   // variante deve ser PascalCase
    INACTIVE, // SCREAMING_SNAKE_CASE não é padrão para variantes
}
```

</details>

<br>

<details>
<summary>✅ Good — convenções Rust respeitadas</summary>
<br>

```rust
const MAX_RETRIES: u32 = 3;

fn calculate_total() -> f64 { 0.0 }

struct OrderService {}

enum Status {
    Active,
    Inactive,
    Pending,
}
```

</details>

## Ordem semântica

Em inglês, o nome segue a ordem natural da fala: **verbo + objeto + contexto**.

<details>
<summary>❌ Bad — ordem invertida</summary>
<br>

```rust
fn get_profile_user(user_id: u64) {}
fn update_status_order(order_id: u64) {}
fn calculate_total_invoice(invoice_id: u64) {}
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```rust
fn get_user_profile(user_id: u64) {}
fn update_order_status(order_id: u64) {}
fn calculate_invoice_total(invoice_id: u64) {}
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage não dizem nada</summary>
<br>

```rust
fn handle(data: &[u8]) {}
fn process(input: serde_json::Value) {}
fn manage(items: Vec<Item>) {}
fn do_stuff(x: &str) {}
```

</details>

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

```rust
fn validate_payment(payment: &Payment) -> Result<(), PaymentError> {}
fn calculate_order_total(items: &[Item]) -> f64 {}
fn notify_customer_default(order: &Order) -> anyhow::Result<()> {}
fn apply_seasonal_discount(order: Order) -> Order {}
```

</details>

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de onde a operação acontece.

<details>
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

```rust
fn call_stripe(amount: f64) -> anyhow::Result<()> {}
fn get_user_from_db(user_id: u64) -> anyhow::Result<User> {}
fn post_to_slack(message: &str) -> anyhow::Result<()> {}
fn save_to_s3(file: &[u8]) -> anyhow::Result<()> {}
```

</details>

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

```rust
fn charge_customer(amount: f64) -> anyhow::Result<()> {}
fn find_user(user_id: u64) -> anyhow::Result<User> {}
fn notify_team(message: &str) -> anyhow::Result<()> {}
fn archive_document(file: &[u8]) -> anyhow::Result<()> {}
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```rust
let loading = true;
let active = user.status == Status::Active;
let valid = email.contains('@');
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is_, has_, can_, should_</summary>
<br>

```rust
let is_active = user.status == Status::Active;
let has_permission = user.roles.contains(&Role::Admin);

let can_delete = is_active && has_permission;
let should_retry = attempt < MAX_RETRIES;
```

</details>

## Acrônimos e siglas

Trate acrônimos como palavras normais em `PascalCase`. Evite maiúsculas em sequência.

<details>
<summary>❌ Bad — acrônimo inteiro em maiúsculas</summary>
<br>

```rust
struct HTTPClient {}
struct APIError {}
fn parseJSON(raw: &str) {}
```

</details>

<br>

<details>
<summary>✅ Good — acrônimo como palavra normal</summary>
<br>

```rust
struct HttpClient {}
struct ApiError {}
fn parse_json(raw: &str) {}
```

</details>
